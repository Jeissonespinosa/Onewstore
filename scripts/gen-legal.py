#!/usr/bin/env python3
"""
Genera los bloques de las paginas legales desde los borradores en Markdown.

Fuente: specs/001-tyc-marketplace/borradores/D<n>-<slug>.md   (lo que revisa el abogado)
Salida: store/blocks/legal/<slug>.jsonc                      (lo que se publica; NO se edita a mano)

Cada borrador tiene este formato:

    # Titulo del documento
    Version AAAA.MM.DD · Actualizado: AAAA-MM-DD       (con tilde en "Version")

    texto de introduccion...

    ## 1. Primera seccion
    ...

Cada seccion (la introduccion y cada "## ") es un `rich-text` propio, para poder editarlas
por separado en el Site Editor (plan 001, spike 1.2). La pagina es `store.custom#legal-<slug>`;
su ruta (`/<slug>`) vive a mano en store/routes.json. Sin estilos inline: el ancho y los
titulos salen de styles/css/vtex.rich-text.css (blockClass `legal`).

Uso:
    python scripts/gen-legal.py            # escribe los bloques
    python scripts/gen-legal.py --check    # sale con 1 si lo versionado no coincide con los borradores
    python scripts/gen-legal.py --root RUTA
Despues de crear o borrar archivos, reiniciar `vtex link`.
"""
import argparse
import json
import os
import re
import sys

sys.dont_write_bytecode = True

ROOT_DEFAULT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRAFTS_REL = os.path.join('specs', '001-tyc-marketplace', 'borradores')
OUT_REL = os.path.join('store', 'blocks', 'legal')
DRAFT_RE = re.compile(r'^D\d+-(?P<slug>[a-z0-9-]+)\.md$')
HEADER = (
    '// GENERADO por scripts/gen-legal.py desde specs/001-tyc-marketplace/borradores/%s.\n'
    '// No se edita a mano: cambia el borrador y vuelve a correr el script.\n'
)


def drafts(root):
    """[(slug, ruta)] de los borradores Dn-<slug>.md, ordenados."""
    base = os.path.join(root, DRAFTS_REL)
    out = []
    if os.path.isdir(base):
        for name in sorted(os.listdir(base)):
            m = DRAFT_RE.match(name)
            if m:
                out.append((m.group('slug'), os.path.join(base, name)))
    return out


def split_sections(markdown):
    """Divide el borrador: introduccion (con el titulo) y una entrada por cada '## '."""
    sections, current = [], []
    for line in markdown.replace('\r\n', '\n').split('\n'):
        if line.startswith('## ') and current:
            sections.append('\n'.join(current).strip())
            current = []
        current.append(line)
    sections.append('\n'.join(current).strip())
    return [s for s in sections if s]


def build(slug, markdown):
    """Devuelve el dict de bloques de una pagina legal."""
    if not markdown.lstrip().startswith('# '):
        raise ValueError('%s: el borrador debe empezar con un titulo "# ..."' % slug)
    sections = split_sections(markdown)
    page = 'store.custom#legal-%s' % slug
    ids = ['rich-text#legal-%s-%d' % (slug, i) for i in range(len(sections))]
    blocks = {page: {'children': ids}}
    for bid, text in zip(ids, sections):
        blocks[bid] = {'props': {'text': text, 'blockClass': 'legal'}}
    return blocks


def render(slug, blocks, draft_name):
    return HEADER % draft_name + json.dumps(blocks, ensure_ascii=False, indent=2) + '\n'


def expected(root):
    """{ruta de salida: contenido} de todo lo que debe existir."""
    out = {}
    for slug, path in drafts(root):
        with open(path, encoding='utf-8') as fh:
            text = fh.read()
        target = os.path.join(root, OUT_REL, slug + '.jsonc')
        out[target] = render(slug, build(slug, text), os.path.basename(path))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description='Genera los bloques de las paginas legales.')
    ap.add_argument('--check', action='store_true', help='no escribe; sale con 1 si hay diferencias')
    ap.add_argument('--root', default=ROOT_DEFAULT)
    args = ap.parse_args(argv)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')

    want = expected(args.root)
    out_dir = os.path.join(args.root, OUT_REL)
    stale = []
    for target, content in want.items():
        current = None
        if os.path.exists(target):
            with open(target, encoding='utf-8', newline='') as fh:
                current = fh.read().replace('\r\n', '\n')
        if current != content:
            stale.append(target)
    # Un bloque legal sin borrador esta huerfano: el borrador es la fuente.
    orphans = []
    if os.path.isdir(out_dir):
        orphans = [os.path.join(out_dir, n) for n in sorted(os.listdir(out_dir))
                   if n.endswith('.jsonc') and os.path.join(out_dir, n) not in want]

    if args.check:
        for t in stale:
            print('desactualizado: ' + os.path.relpath(t, args.root))
        for t in orphans:
            print('sin borrador: ' + os.path.relpath(t, args.root))
        if not stale and not orphans:
            print('gen-legal: %d pagina(s) al dia.' % len(want))
        return 1 if (stale or orphans) else 0

    os.makedirs(out_dir, exist_ok=True)
    for target in stale:
        tmp = target + '.tmp'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(want[target])
        os.replace(tmp, target)
        print('escrito: ' + os.path.relpath(target, args.root))
    for t in orphans:
        print('AVISO: %s no tiene borrador; no se toca.' % os.path.relpath(t, args.root))
    print('gen-legal: %d pagina(s), %d escrita(s).' % (len(want), len(stale)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
