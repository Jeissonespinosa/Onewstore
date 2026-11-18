#!/usr/bin/env python3
"""
Comprueba las paginas legales del theme antes de publicar (spec 001: AC-7, RF-4, RF-8).

Que revisa, sobre store/blocks/legal/*.json|jsonc y store/routes.json:
  1. Placeholders pendientes: [RAZON SOCIAL], [NIT], [DOMICILIO], [CANAL DE ATENCION],
     [PASARELA DE PAGO], [COMISION], [QUIEN ENVIA], [TRANSPORTADORA],
     [A CONFIRMAR POR ABOGADO] (con tilde, como en el plan) y cualquier otro
     marcador [EN MAYUSCULAS]. Se informa el conteo por documento.
  2. Menciones de "Onewstore" (sin distinguir mayusculas): la marca es Repuestox.
  3. Documentos sin linea de version y fecha (RF-4):
         Version AAAA.MM.DD · Actualizado: AAAA-MM-DD
  4. Rutas legales sin bloque y bloques legales sin ruta. Una pagina legal es un
     bloque `store.custom#legal-<nombre>` con su ruta en store/routes.json.

Uso:
    python scripts/check-legal.py            # informa; sale con 0 aunque haya hallazgos
    python scripts/check-legal.py --prod     # sale con 1 si hay algun hallazgo
    python scripts/check-legal.py --root RUTA  # raiz del repo (para pruebas)

En desarrollo los placeholders son ESPERADOS (aun no hay razon social ni NIT): por eso
el modo por defecto no falla. Antes de cualquier `vtex publish`, correr con --prod.
"""
import argparse
import json
import os
import re
import sys
import unicodedata

sys.dont_write_bytecode = True

ROOT_DEFAULT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGAL_PREFIX = 'store.custom#legal-'

# Placeholders conocidos (plan 001, decision 6). Solo sirven para nombrarlos en el
# informe: la deteccion usa PLACEHOLDER_RE, que tambien atrapa los mal escritos.
KNOWN_PLACEHOLDERS = (
    '[RAZÓN SOCIAL]', '[NIT]', '[DOMICILIO]', '[CANAL DE ATENCIÓN]', '[PASARELA DE PAGO]',
    '[COMISIÓN]', '[QUIÉN ENVÍA]', '[TRANSPORTADORA]', '[A CONFIRMAR POR ABOGADO]',
    '[BORRADOR EN REDACCIÓN]', '[PLAZO DE ENTREGA]',
)
PLACEHOLDER_RE = re.compile(r'\[[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9 ()/.,-]{1,60}\]')
BANNED_RE = re.compile(r'onewstore', re.IGNORECASE)
VERSION_RE = re.compile(r'Versi[oó]n\s+\d{4}\.\d{2}\.\d{2}\s*[·\-]\s*Actualizado:\s*\d{4}-\d{2}-\d{2}')


def strip_jsonc(text):
    """Quita comentarios // y /* */ de un JSONC sin tocar el interior de los strings."""
    out, i, n, in_str = [], 0, len(text), False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == '\\' and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
        elif text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def _load_jsonc(path):
    with open(path, encoding='utf-8') as fh:
        return json.loads(strip_jsonc(fh.read()))


def _texts(node):
    """Todos los strings de un valor JSON (los textos legales viven en props.text)."""
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from _texts(v)
    elif isinstance(node, list):
        for v in node:
            yield from _texts(v)


def scan(root):
    """Devuelve un dict con los hallazgos. No imprime ni sale: es lo que prueban los tests."""
    legal_dir = os.path.join(root, 'store', 'blocks', 'legal')
    routes_path = os.path.join(root, 'store', 'routes.json')

    routes = {}
    if os.path.exists(routes_path):
        with open(routes_path, encoding='utf-8') as fh:
            routes = json.load(fh)
    route_keys = {k for k in routes if k.startswith(LEGAL_PREFIX)}

    docs, block_keys = [], set()
    if os.path.isdir(legal_dir):
        for name in sorted(os.listdir(legal_dir)):
            if not name.endswith(('.json', '.jsonc')):
                continue
            data = _load_jsonc(os.path.join(legal_dir, name))
            keys = {k for k in data if k.startswith(LEGAL_PREFIX)}
            block_keys |= keys
            text = unicodedata.normalize('NFC', '\n'.join(_texts(data)))
            docs.append({
                'file': name,
                'pages': sorted(keys),
                'placeholders': _count(PLACEHOLDER_RE.findall(text)),
                'onewstore': len(BANNED_RE.findall(text)),
                'has_version': bool(VERSION_RE.search(text)),
            })

    return {
        'docs': docs,
        # Solo los documentos que definen una pagina legal necesitan version.
        'missing_version': [d['file'] for d in docs if d['pages'] and not d['has_version']],
        'routes_without_block': sorted(route_keys - block_keys),
        'blocks_without_route': sorted(block_keys - route_keys),
    }


def _count(items):
    counts = {}
    for it in items:
        counts[it] = counts.get(it, 0) + 1
    return counts


def findings(result):
    """Lista de textos con cada hallazgo que bloquearia una publicacion."""
    out = []
    for d in result['docs']:
        for ph, n in sorted(d['placeholders'].items()):
            out.append('%s: placeholder %s x%d' % (d['file'], ph, n))
        if d['onewstore']:
            out.append('%s: menciona "Onewstore" x%d' % (d['file'], d['onewstore']))
    for f in result['missing_version']:
        out.append('%s: sin linea "Version AAAA.MM.DD · Actualizado: AAAA-MM-DD"' % f)
    for k in result['routes_without_block']:
        out.append('ruta %s sin bloque en store/blocks/legal/' % k)
    for k in result['blocks_without_route']:
        out.append('bloque %s sin ruta en store/routes.json' % k)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description='Comprueba las paginas legales (spec 001).')
    ap.add_argument('--prod', action='store_true', help='sale con 1 si hay algun hallazgo')
    ap.add_argument('--root', default=ROOT_DEFAULT, help='raiz del repositorio')
    args = ap.parse_args(argv)

    # Consolas de Windows con codepage no UTF-8: nunca fallar por imprimir una tilde.
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')

    result = scan(args.root)
    found = findings(result)

    if not result['docs']:
        print('check-legal: no hay documentos en store/blocks/legal/ (nada que comprobar).')
    else:
        print('check-legal: %d documento(s)' % len(result['docs']))
        for d in result['docs']:
            total = sum(d['placeholders'].values())
            print('  %-40s placeholders: %-3d Onewstore: %-3d version: %s' % (
                d['file'], total, d['onewstore'], 'si' if d['has_version'] else 'NO'))
    if found:
        print('\nHallazgos (%d):' % len(found))
        for line in found:
            print('  - ' + line)
    else:
        print('Sin hallazgos.')

    if args.prod and found:
        print('\nPUBLICACION BLOQUEADA (--prod): resuelve los hallazgos de arriba.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
