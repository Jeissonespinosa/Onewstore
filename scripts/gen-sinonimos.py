#!/usr/bin/env python3
"""
Genera los CSV de sinonimos de VTEX Intelligent Search desde el catalogo.

Fuente de verdad: catalogo/estructura-categorias-v2.json (clave "_sinonimos"
mas los nombres del arbol). Salida: catalogo/sinonimos-intelligent-search-N.csv
y catalogo/sinonimos-conflictos.txt.

Formato VTEX (bidireccional):  {terminos separados por coma};{status}
    llantas,llanta,neumaticos;true
Limite duro de VTEX: 20 KB por archivo. Aqui se corta en 16 KB para dejar
margen; el corte va siempre entre grupos, nunca dentro de uno.
Doc: https://help.vtex.com/en/docs/tutorials/creating-synonyms

Reglas que aplica:
  1. La barra "/" se conserva: "compresor a/c" es un termino, no dos.
  2. La coma interna de un nombre pasa a espacio simple ("Sliders, defensas y
     cubrecarter" -> "sliders defensas y cubrecarter") y ademas cada fragmento
     se emite como termino propio ("sliders", "defensas", "cubrecarter"),
     porque el cliente busca el fragmento, no la frase completa.
  3. Un termino pertenece a UN SOLO grupo: con sinonimos bidireccionales, un
     termino compartido vuelve equivalentes a los dos grupos. Gana la hoja mas
     especifica; el nombre propio de un grupo nunca se descarta. Dos grupos con
     la misma clave (p. ej. "Resortes" de carro y de moto) se fusionan, porque
     los sinonimos de VTEX son de cuenta, no de categoria.
  4. Se descartan los terminos de 2 caracteres o menos y los numeros sueltos
     (basura de un split mal hecho), salvo los codigos tecnicos tipo h4, h7,
     h11, 9005, 9006, que son como el cliente busca los bombillos.

Uso:
    python3 scripts/gen-sinonimos.py
    python3 scripts/gen-sinonimos.py --dry-run     # no escribe nada
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'catalogo')
TREE = os.path.join(CAT, 'estructura-categorias-v2.json')
OUT = os.path.join(CAT, 'sinonimos-intelligent-search-%d.csv')
CONFLICTS = os.path.join(CAT, 'sinonimos-conflictos.txt')

SECTIONS = ('Carros', 'Motos', 'Herramientas')
KIND_RANK = {'hoja': 3, 'sub': 2, 'macro': 1}
MAX_BYTES = 16 * 1024          # techo de seguridad (VTEX admite 20 KB)
VTEX_LIMIT = 20 * 1024

# codigos tecnicos que si valen aunque sean cortos: h4, h7, h11, r16, 9005...
CODE_RE = re.compile(r'^[a-z]{1,2}\d{1,4}$')
STOP = {'y', 'de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'en', 'o'}

# terminos genericos y marcas: no se tocan, se reportan para que decida el negocio
GENERIC = {'caja', 'sensor', 'compresor', 'defensa', 'parrilla', 'baul', 'baúl', 'cojin',
           'cojín', 'rampa', 'tablero', 'escape', 'switch', 'rele', 'relé', 'fusible',
           'repuestos', 'tiempo', 'lavado', 'pulido'}
BRAND_RE = re.compile(r'\b(karcher|mac|willard|yuasa|motul|mobil|bosch|trw|brembo)\b')


# --------------------------------------------------------------------------- #
# terminos                                                                     #
# --------------------------------------------------------------------------- #

def normalize(text):
    """Minusculas, sin acentos, sin puntuacion: solo para comparar."""
    text = unicodedata.normalize('NFD', text or '')
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.replace('/', ' ')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', text.lower())).strip()


def clean_term(term):
    """Termino tal como va al CSV: minusculas, sin la coma (separador) y sin
    el punto y coma (fin de campo). La barra SE CONSERVA."""
    term = (term or '').strip().lower()
    term = term.replace(';', ' ').replace(',', ' ').replace('"', ' ')
    return re.sub(r'\s+', ' ', term).strip()


def is_valid(term):
    """Filtra la basura: un caracter suelto, un digito suelto, una preposicion."""
    if not term or term in STOP:
        return False
    if term.isdigit():
        return len(term) >= 4          # "4" no; "9005" (bombillo) si
    if len(term) <= 2:
        return bool(CODE_RE.match(term))   # "h4", "h7" si; "c" no
    return True


def fragments(text):
    """Partes con sentido propio de un nombre compuesto: 'Sliders, defensas y
    cubrecarter' -> sliders / defensas / cubrecarter."""
    out = []
    for piece in re.split(r',| y ', text):
        piece = clean_term(piece)
        piece = re.sub(r'^(?:%s)\s+' % '|'.join(STOP), '', piece)
        if len(piece) >= 4 and piece not in STOP:
            out.append(piece)
    return out


def terms_for(name, synonyms):
    """Terminos de un grupo, en orden: primero el nombre (la clave), luego lo
    que va entre parentesis y al final los sinonimos del catalogo."""
    out = []

    def push(term):
        term = clean_term(term)
        if is_valid(term) and term not in out:
            out.append(term)

    base = re.sub(r'\s*\(.*?\)', '', name).strip()
    push(base)
    if ',' in base:
        for frag in fragments(base):
            push(frag)
    for inside in re.findall(r'\((.*?)\)', name):
        push(inside)
        for frag in fragments(inside):
            push(frag)
    for syn in synonyms:
        push(syn)
        if ',' in syn:
            for frag in fragments(syn):
                push(frag)
    return out


# --------------------------------------------------------------------------- #
# arbol -> grupos                                                              #
# --------------------------------------------------------------------------- #

def synonyms_of(syn, section, name):
    """Sinonimos de (seccion, nombre): los propios mas los comunes.

    _sinonimos es {Carros:{...}, Motos:{...}, Herramientas:{...}, _comunes:{...}}
    desde v5; antes era {nombre: [...]} y las categorias homonimas de carro y
    moto compartian lista."""
    if section in syn and isinstance(syn.get(section), dict):
        terms = list(syn[section].get(name, []))
        for term in syn.get('_comunes', {}).get(name, []):
            if term not in terms:
                terms.append(term)
        return terms
    return list(syn.get(name, []))          # esquema viejo


def load_tree(path=TREE):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def iter_nodes(tree):
    """(seccion, nombre, tipo) de cada macro, subcategoria y hoja, en orden."""
    for section in SECTIONS:
        for macro in tree.get(section, []):
            yield section, macro['nombre'], 'macro'
            for sub in macro['subs']:
                if sub.get('nombre'):
                    yield section, sub['nombre'], 'sub'
                for leaf in sub['tipos']:
                    yield section, leaf, 'hoja'


def build_groups(tree):
    """Un grupo por nodo. Los nodos con la misma clave se fusionan (los
    sinonimos de VTEX son de cuenta: 'resortes' debe traer carro y moto)."""
    syn = tree.get('_sinonimos', {})
    groups = OrderedDict()          # clave normalizada -> grupo
    merged = []
    for section, name, kind in iter_nodes(tree):
        terms = terms_for(name, synonyms_of(syn, section, name))
        if not terms:
            continue
        key = normalize(terms[0])
        if key in groups:
            g = groups[key]
            merged.append((name, g['nombre'], section, g['section']))
            for t in terms:
                if t not in g['terms']:
                    g['terms'].append(t)
            g['names'].append((section, name, kind))
            if KIND_RANK[kind] > KIND_RANK[g['kind']]:
                g['kind'] = kind
            continue
        groups[key] = {'key': key, 'nombre': name, 'section': section, 'kind': kind,
                       'terms': list(terms), 'names': [(section, name, kind)]}
    return groups, merged


# --------------------------------------------------------------------------- #
# conflictos: un termino, un solo grupo                                        #
# --------------------------------------------------------------------------- #

def _score(group, term):
    """Que tan dueño es un grupo de un termino. Mas alto gana."""
    own_key = 1 if normalize(group['terms'][0]) == normalize(term) else 0
    shared = len(set(normalize(term).split()) & set(normalize(group['nombre']).split()))
    return (own_key, KIND_RANK[group['kind']], shared, -len(group['nombre']),
            -SECTIONS.index(group['section']))


def resolve_conflicts(groups):
    """Deja cada termino en un solo grupo. Devuelve (descartes, absorbidos).

    Si a un grupo le quitan todos sus sinonimos y se queda solo con su nombre,
    deja de servir como fila (VTEX necesita dos terminos), asi que se absorbe
    en el grupo que se llevo la mayoria: es el mismo concepto en la otra
    seccion ("Bendix" de moto y "Bendix y automaticos de arranque" de carro) y
    los sinonimos de VTEX son de cuenta, no de categoria."""
    owners = OrderedDict()
    for g in groups.values():
        for term in g['terms']:
            owners.setdefault(normalize(term), []).append(g)
    discarded, stolen_by = [], {}
    for norm_term, gs in owners.items():
        if len(gs) < 2:
            continue
        winner = max(gs, key=lambda g: _score(g, norm_term))
        for g in gs:
            if g is winner:
                continue
            for term in [t for t in g['terms'] if normalize(t) == norm_term]:
                if normalize(term) == normalize(g['terms'][0]):
                    continue        # el nombre propio de un grupo nunca se quita
                g['terms'].remove(term)
                discarded.append({'termino': term, 'de': g['nombre'], 'de_seccion': g['section'],
                                  'a': winner['nombre'], 'a_seccion': winner['section']})
                stolen_by.setdefault(g['key'], {}).setdefault(winner['key'], 0)
                stolen_by[g['key']][winner['key']] += 1

    absorbed = []
    for key in [k for k, g in groups.items() if len(g['terms']) < 2]:
        g = groups[key]
        targets = stolen_by.get(key)
        if not targets:
            continue
        target = groups[max(targets, key=lambda k: targets[k])]
        for term in g['terms']:
            if term not in target['terms']:
                target['terms'].append(term)
        target['names'].extend(g['names'])
        absorbed.append((g['nombre'], g['section'], target['nombre'], target['section']))
        del groups[key]
    return discarded, absorbed


# --------------------------------------------------------------------------- #
# archivos                                                                     #
# --------------------------------------------------------------------------- #

def rows_for(groups):
    """Filas listas para VTEX; solo los grupos con 2+ terminos sirven."""
    rows, thin = [], []
    for g in groups.values():
        if len(g['terms']) >= 2:
            rows.append((g, ','.join(g['terms']) + ';true'))
        else:
            thin.append(g)
    return rows, thin


def pack(rows, max_bytes=MAX_BYTES):
    """Reparte las filas en archivos parejos, cortando siempre entre grupos."""
    total = sum(len((r + '\n').encode('utf-8')) for _, r in rows)
    n_files = max(1, -(-total // max_bytes))
    target = -(-total // n_files)          # reparto parejo, no "llenar y saltar"
    files, current, size = [], [], 0
    for g, row in rows:
        b = len((row + '\n').encode('utf-8'))
        if current and (size + b > target) and len(files) < n_files - 1:
            files.append(current)
            current, size = [], 0
        current.append((g, row))
        size += b
    if current:
        files.append(current)
    return files


def review_notes(groups):
    """Lo que decide el negocio, no el script."""
    generic, brands = [], []
    for g in groups.values():
        for term in g['terms']:
            if term in GENERIC and term != g['terms'][0]:
                generic.append((term, g['nombre']))
            if BRAND_RE.search(term):
                brands.append((term, g['nombre']))
    return generic, brands


def write_outputs(files, discarded, merged, thin, groups):
    paths = []
    for i, chunk in enumerate(files, 1):
        path = OUT % i
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(row for _, row in chunk) + '\n')
        paths.append(path)
    i = len(files) + 1
    while os.path.exists(OUT % i):         # borra sobrantes de corridas previas
        os.remove(OUT % i)
        i += 1
    generic, brands = review_notes(groups)
    with open(CONFLICTS, 'w', encoding='utf-8') as fh:
        fh.write('SINONIMOS — conflictos resueltos y decisiones pendientes\n')
        fh.write('Generado por scripts/gen-sinonimos.py. Con sinonimos bidireccionales\n'
                 'un termino compartido vuelve equivalentes a los dos grupos, por eso\n'
                 'cada termino queda en uno solo.\n\n')
        fh.write('1. GRUPOS FUSIONADOS (misma clave, o absorbidos al quedarse sin sinonimos)\n')
        for name, into, sec, into_sec in merged:
            fh.write('   %s (%s) + %s (%s)\n' % (name, sec, into, into_sec))
        if not merged:
            fh.write('   ninguno\n')
        fh.write('\n2. TERMINOS DESCARTADOS (%d)\n' % len(discarded))
        for d in discarded:
            fh.write('   "%s": sale de %s [%s] y queda en %s [%s]\n'
                     % (d['termino'], d['de'], d['de_seccion'], d['a'], d['a_seccion']))
        fh.write('\n3. GRUPOS SIN SINONIMOS UTILES (quedaron con un solo termino)\n')
        for g in thin:
            fh.write('   %s [%s]\n' % (g['nombre'], g['section']))
        if not thin:
            fh.write('   ninguno\n')
        fh.write('\n4. DECIDE EL NEGOCIO — terminos genericos de una palabra\n'
                 '   (en bidireccional capturan busquedas muy amplias)\n')
        for term, name in sorted(set(generic)):
            fh.write('   "%s" -> %s\n' % (term, name))
        fh.write('\n5. DECIDE EL NEGOCIO — marcas comerciales como sinonimo\n'
                 '   (solo tienen sentido si se venden esas marcas)\n')
        for term, name in sorted(set(brands)):
            fh.write('   "%s" -> %s\n' % (term, name))
    paths.append(CONFLICTS)
    return paths


# --------------------------------------------------------------------------- #

def generate(tree):
    """Todo el pipeline, sin tocar disco. Devuelve (files, info)."""
    groups, merged = build_groups(tree)
    before = sum(len(g['terms']) for g in groups.values())
    discarded, absorbed = resolve_conflicts(groups)
    rows, thin = rows_for(groups)
    files = pack(rows)
    info = {'grupos': len(groups), 'terminos_antes': before,
            'terminos_despues': sum(len(g['terms']) for g in groups.values()),
            'descartados': discarded, 'fusionados': merged + [(a, c, b, d) for a, b, c, d in absorbed],
            'absorbidos': absorbed, 'delgados': thin, 'groups': groups, 'rows': rows}
    return files, info


def main(argv=None):
    ap = argparse.ArgumentParser(description='Genera los CSV de sinonimos para VTEX Intelligent Search.')
    ap.add_argument('--dry-run', action='store_true', help='no escribe archivos; solo informa')
    args = ap.parse_args(argv)

    tree = load_tree()
    files, info = generate(tree)
    hojas = sum(1 for _, _, k in iter_nodes(tree) if k == 'hoja')

    print('Sinonimos para Intelligent Search')
    print('  grupos            %d  (de %d nodos del catalogo, %d hojas)'
          % (info['grupos'], sum(1 for _ in iter_nodes(tree)), hojas))
    print('  terminos          %d -> %d  (%d descartados por conflicto)'
          % (info['terminos_antes'], info['terminos_despues'], len(info['descartados'])))
    print('  grupos fusionados %d' % len(info['fusionados']))
    for i, chunk in enumerate(files, 1):
        size = sum(len((r + '\n').encode('utf-8')) for _, r in chunk)
        print('  %-42s %3d grupos  %6d bytes%s'
              % (os.path.basename(OUT % i), len(chunk), size,
                 '  SOBRE EL LIMITE' if size > VTEX_LIMIT else ''))
    if args.dry_run:
        print('\n--dry-run: no se escribio nada.')
        return 0
    for path in write_outputs(files, info['descartados'], info['fusionados'],
                              info['delgados'], info['groups']):
        print('  escrito %s' % os.path.relpath(path, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
