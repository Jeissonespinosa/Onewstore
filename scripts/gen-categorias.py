#!/usr/bin/env python3
"""
Genera las paginas de categoria del theme a partir de la estructura
del catalogo (catalogo/estructura-categorias-v2.json: la fuente).
El CSV (catalogo/estructura-categorias-v2.csv) se EXPORTA desde el
JSON con rutas y sinonimos, para el admin del catalogo.

Escribe:
  store/routes.json                          rutas /carros/..., /motos/... y
                                             /herramientas/... (conserva las demas)
  store/blocks/home/category-rail.jsonc      "Explora por categoria" (macros) en
                                             las landings + landing /herramientas
  store/blocks/home/category-pages-<sec>.jsonc  store.custom + banner de cada
                                             pagina (macro, subcategoria, hoja)
  store/blocks/home/category-grids-<sec>.jsonc  cuadricula de hijos de cada
                                             macro / subcategoria
  store/blocks/home/category-listing.jsonc   listado compartido + customQuery
                                             por pagina
  store/blocks/home/category-filters.jsonc   layout con filtros + selector de
                                             vehiculo (hojas)

Uso:
  python3 scripts/gen-categorias.py            # queries placeholder (listado vacio)
  python3 scripts/gen-categorias.py --real     # queryField = ruta de la categoria
                                               # (cuando ya exista en el catalogo)

Todas las tarjetas (macros, subcategorias y tipos) son iguales: espacio de
imagen con placeholder "REEMPLAZAR" y el nombre abajo. Los iconos SVG viejos
quedan en catalogo/iconos-categorias.json por si se quieren reutilizar.
"""
import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'catalogo')
BLOCKS = os.path.join(ROOT, 'store', 'blocks', 'home')
ROUTES = os.path.join(ROOT, 'store', 'routes.json')

SECTIONS = OrderedDict([('carros', 'Carros'), ('motos', 'Motos'), ('herramientas', 'Herramientas')])
# secciones con vehiculo (selector + filtros por marca/modelo/ano en las hojas)
VEHICLE_SECTIONS = ('carros', 'motos')

# Especificaciones del vehiculo: las maneja el selector (react/VehicleSelector.js)
# y por eso se ocultan del filtro nativo. Orden: marca, ano, modelo.
VEHICLE_FACETS = ('Marca vehículo', 'Año', 'Modelo')

# --- fuentes ---------------------------------------------------------------

# Se llenan en load_inputs(); importar el modulo no lee ni escribe nada.
tree = None
SYN = {}
REAL_QUERIES = False
DRY_RUN = False
FORCE = False


def _read_json(path, que):
    """Lee un JSON de entrada y muere con un mensaje claro ANTES de escribir."""
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh, object_pairs_hook=OrderedDict)
    except FileNotFoundError:
        raise SystemExit('ERROR: falta %s (%s)' % (os.path.relpath(path, ROOT), que))
    except ValueError as exc:
        raise SystemExit('ERROR: %s no es JSON valido (%s): %s'
                         % (os.path.relpath(path, ROOT), que, exc))


def load_inputs():
    """Carga y valida TODAS las entradas antes de tocar un solo archivo de
    salida: si algo esta roto, el theme queda como estaba."""
    global tree, ICONS, ALIAS, SYN
    tree = _read_json(os.path.join(CAT, 'estructura-categorias-v2.json'), 'arbol del catalogo')
    routes = _read_json(ROUTES, 'rutas del theme')

    faltan = [s for s in SECTIONS.values() if s not in tree]
    if faltan:
        raise SystemExit('ERROR: al arbol le faltan las secciones: %s' % ', '.join(faltan))
    for dept in SECTIONS.values():
        for macro in tree[dept]:
            if 'nombre' not in macro or 'subs' not in macro:
                raise SystemExit('ERROR: macro sin "nombre" o "subs" en %s: %r' % (dept, macro))
            for sub in macro['subs']:
                if 'tipos' not in sub:
                    raise SystemExit('ERROR: subcategoria sin "tipos" en %s > %s'
                                     % (dept, macro['nombre']))
    for key, value in routes.items():
        if not isinstance(value, dict) or 'path' not in value:
            raise SystemExit('ERROR: la ruta %r no tiene "path" en store/routes.json' % key)

    SYN = tree.get('_sinonimos', {})
    return tree, routes


# Letras que NFD no descompone: hay que decir a que equivalen.
TRANSLIT = {'ß': 'ss', 'Ø': 'o', 'ø': 'o', 'Æ': 'ae', 'æ': 'ae', 'Œ': 'oe', 'œ': 'oe',
            'Đ': 'd', 'đ': 'd', 'Ł': 'l', 'ł': 'l', 'Þ': 'th', 'þ': 'th', 'ð': 'd',
            '&': ' y ', '+': ' mas ', '%': ' por ciento '}


def translit(s):
    return ''.join(TRANSLIT.get(c, c) for c in (s or ''))


def norm(s):
    s = unicodedata.normalize('NFD', translit(s))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def slugify(s):
    """Slug de una categoria. Nunca puede salir vacio: un slug vacio produce
    una ruta '/carros/' que pisa la landing y sirve dos paginas distintas en
    la misma URL, y el chequeo de duplicados no lo ve porque la clave difiere."""
    slug = re.sub(r'[^a-z0-9]+', '-', norm(s)).strip('-')
    if not slug:
        raise ValueError('el nombre %r no produce slug (queda vacio): renombra la '
                         'categoria en catalogo/estructura-categorias-v2.json' % s)
    return slug


# --- arbol -----------------------------------------------------------------
# node = {nombre, slug, path, key, kind: macro|sub|hoja, children, ancestors}

def build_tree():
    nodes = []          # todas las paginas en orden
    rails = OrderedDict()
    for sec, dept in SECTIONS.items():
        rails[sec] = []
        for m in tree[dept]:
            m['slug'] = slugify(m['nombre'])
            mpath = '/%s/%s' % (sec, m['slug'])
            macro = dict(nombre=m['nombre'], slug=m['slug'], path=mpath, kind='macro',
                         children=[], ancestors=[dept], section=sec)
            nodes.append(macro)
            rails[sec].append(macro)
            for s in m['subs']:
                if s.get('nombre') is None:
                    # macro sin subcategorias: las hojas cuelgan directo
                    for t in s['tipos']:
                        url = '%s/%s' % (mpath, slugify(t))
                        leaf = dict(nombre=t, slug=slugify(t), path=url, kind='hoja',
                                    children=[], ancestors=[dept, m['nombre']], section=sec)
                        macro['children'].append(leaf)
                        nodes.append(leaf)
                    continue
                s['slug'] = slugify(s['nombre'])
                spath = '%s/%s' % (mpath, s['slug'])
                sub = dict(nombre=s['nombre'], slug=s['slug'], path=spath, kind='sub',
                           children=[], ancestors=[dept, m['nombre']], section=sec,
                           vitrina=s.get('vitrina'), filtro=s.get('filtro'), valores=[],
                           catalogo=bool(s.get('catalogo')))
                macro['children'].append(sub)
                nodes.append(sub)
                if s.get('vitrina') == 'filtros':
                    # Sus "tipos" no son categorias: son los valores de un filtro
                    # dentro de esta pagina (Tipo de vehiculo, Tipo de producto).
                    # No llevan pagina ni ruta propia.
                    sub['valores'] = list(s['tipos'])
                    continue
                for t in s['tipos']:
                    url = '%s/%s' % (spath, slugify(t))
                    leaf = dict(nombre=t, slug=slugify(t), path=url, kind='hoja',
                                children=[], ancestors=[dept, m['nombre'], s['nombre']], section=sec)
                    sub['children'].append(leaf)
                    nodes.append(leaf)
    for n in nodes:
        n['key'] = n['path'].strip('/').replace('/', '-')
    from collections import Counter
    dup = {k for k, c in Counter(n['key'] for n in nodes).items() if c > 1}
    if dup:
        sys.exit('claves duplicadas: %s' % sorted(dup))
    return nodes, rails


def csv_safe(value):
    """Neutraliza la celda para Excel/Sheets: una celda que empieza por = + - @
    se ejecuta como formula al abrir el CSV."""
    text = '' if value is None else str(value)
    return "'" + text if text[:1] in ('=', '+', '-', '@') else text


def syn_for(node):
    """Sinonimos de un nodo: los de SU seccion mas los comunes. Antes la clave
    era solo el nombre y las 69 categorias que se llaman igual en carros y
    motos recibian la lista de la otra ("alarma de moto" en la pagina de
    carros)."""
    dept = node['ancestors'][0]
    name = node['nombre']
    terms = list(SYN.get(dept, {}).get(name, []))
    for term in SYN.get('_comunes', {}).get(name, []):
        if term not in terms:
            terms.append(term)
    return terms


def export_csv(nodes):
    """CSV para el admin: una fila por categoria (macro, subcategoria y hoja),
    con su ruta y sus palabras clave. Asi no se pierde ningun sinonimo."""
    path = os.path.join(CAT, 'estructura-categorias-v2.csv')
    if DRY_RUN:
        print('  [dry-run] %-36s %5d filas' % (os.path.relpath(path, ROOT), len(nodes)))
        return
    import io
    buf = io.StringIO()
    if True:
        fh = buf
        w = csv.writer(fh)
        w.writerow(['Departamento', 'Nivel', 'Categoría (macro)', 'Subcategoría', 'Tipo de producto (hoja)', 'URL propuesta', 'Sinónimos (palabras clave)'])
        for n in nodes:
            for valor in n.get('valores', []):
                w.writerow([csv_safe(x) for x in
                            (n['ancestors'][0], 'Valor de filtro (%s)' % (n.get('filtro') or ''),
                             n['ancestors'][1] if len(n['ancestors']) > 1 else n['nombre'],
                             n['nombre'], valor, n['path'], '; '.join(SYN.get(n['ancestors'][0], {}).get(valor, [])))])
            a = n['ancestors']
            dept = a[0]
            macro = a[1] if len(a) > 1 else n['nombre']
            sub = a[2] if len(a) > 2 else (n['nombre'] if n['kind'] == 'sub' else '')
            leaf = n['nombre'] if n['kind'] == 'hoja' else ''
            nivel = {'macro': 'Categoría', 'sub': 'Subcategoría', 'hoja': 'Tipo de producto'}[n['kind']]
            w.writerow([csv_safe(x) for x in
                        (dept, nivel, macro, sub, leaf, n['path'], '; '.join(syn_for(n)))])
    stage(path, buf.getvalue())
    print('  %-46s exportado' % os.path.relpath(path, ROOT))


# --- helpers de bloques ----------------------------------------------------

def md_escape(s):
    return s.replace('[', '\\[').replace(']', '\\]')


def card_blocks(prefix, node, out):
    """Tarjeta de cuadricula, identica a la de las macros: espacio de
    imagen (placeholder "REEMPLAZAR") arriba y el nombre abajo."""
    cid = '%s-%s' % (prefix, node['slug'])
    link = node['path']
    out['flex-layout.col#%s' % cid] = {
        'props': {'blockClass': 'rxLineaCard', 'width': '100%'},
        'children': ['flex-layout.col#%s-media' % cid, 'flex-layout.row#%s-foot' % cid],
    }
    out['flex-layout.col#%s-media' % cid] = {
        'props': {'blockClass': 'rxLineaMedia', 'width': '100%'},
        'children': ['image#%s-img' % cid],
    }
    out['image#%s-img' % cid] = {
        'props': {
            'blockClass': 'rxLineaImage',
            'src': placeholder(node['nombre']),
            'alt': node['nombre'],
            'link': {'url': link, 'newTab': False, 'attributeNofollow': False},
        }
    }
    out['flex-layout.row#%s-foot' % cid] = {
        'props': {'blockClass': 'rxLineaFoot', 'preventHorizontalStretch': True},
        'children': ['rich-text#%s-txt' % cid, 'rich-text#%s-arrow' % cid],
    }
    out['rich-text#%s-txt' % cid] = {
        'props': {'text': '[%s](%s)' % (md_escape(node['nombre']), link), 'blockClass': 'rxLineaLabel'}
    }
    out['rich-text#%s-arrow' % cid] = {
        'props': {'text': '[→](%s)' % link, 'blockClass': 'rxLineaArrow'}
    }
    return 'flex-layout.col#%s' % cid


def grid_class(n):
    # 5 columnas cuando la cuenta cierra mejor en 5 que en 6 (5, 10, 15...)
    if n % 6 != 0 and n % 5 == 0:
        return ['rxLineasGrid', 'rxLineasGrid5']
    return 'rxLineasGrid'


def svg_text(label):
    """Texto seguro dentro de un SVG: un & o un < en el nombre rompe el XML y
    con el la imagen de las 588 tarjetas."""
    return (str(label).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;').replace("'", '&apos;'))


def placeholder(label):
    label = svg_text(label)
    return ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>"
            "<rect x='60' y='60' width='680' height='380' rx='24' fill='none' stroke='%23010101' "
            "stroke-opacity='.18' stroke-width='3' stroke-dasharray='14 12'/>"
            "<text x='400' y='240' text-anchor='middle' font-family='Montserrat,Helvetica,sans-serif' "
            "font-size='40' font-weight='800' fill='%23010101' fill-opacity='.35'>REEMPLAZAR</text>"
            "<text x='400' y='290' text-anchor='middle' font-family='Montserrat,Helvetica,sans-serif' "
            "font-size='24' fill='%23010101' fill-opacity='.45'>" + label + "</text></svg>")


def banner_placeholder(label):
    label = svg_text(label)
    """Fondo del banner: negro con la diagonal roja (igual al banner actual)
    y una etiqueta discreta a la derecha con la medida a reemplazar."""
    return ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 400'>"
            "<rect width='1600' height='400' fill='%23010101'/>"
            "<path d='M880 400 L1130 0 L1400 0 L1150 400 Z' fill='%23FF371E' opacity='.16'/>"
            "<text x='1540' y='330' text-anchor='end' font-family='Montserrat,Helvetica,sans-serif' "
            "font-size='30' font-weight='800' fill='%23ffffff' fill-opacity='.35'>REEMPLAZAR</text>"
            "<text x='1540' y='366' text-anchor='end' font-family='Montserrat,Helvetica,sans-serif' "
            "font-size='20' fill='%23ffffff' fill-opacity='.4'>" + label + " / 1600x400</text></svg>")


# Nada se escribe hasta que todo esta generado y validado: se acumula aqui y
# al final cada archivo va a un .tmp y se mueve con os.replace (atomico).
PENDING = OrderedDict()


def stage(path, text):
    PENDING[path] = text


def commit():
    written = []
    try:
        for path, text in PENDING.items():
            tmp = path + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as fh:
                fh.write(text)
            written.append((tmp, path))
        for tmp, path in written:
            os.replace(tmp, path)
    finally:
        for tmp, _ in written:
            if os.path.exists(tmp):
                os.remove(tmp)
    return len(written)


def dump(path, header, data):
    # El cuerpo del generador vive dentro de una funcion, asi que los textos
    # de cabecera llegan con 4 espacios de mas; el contenido interpolado no.
    header = '\n'.join(l[4:] if l.startswith('    ') else l for l in header.split('\n'))
    out = ['/* ' + '=' * 60]
    out += [('   ' + line).rstrip() for line in header.strip('\n').split('\n')]
    out.append('   ' + '=' * 60 + ' */')
    text = '\n'.join(out) + '\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if DRY_RUN:
        print('  [dry-run] %-36s %5d bloques' % (os.path.relpath(path, ROOT), len(data)))
        return
    stage(path, text)
    print('  %-46s %5d bloques' % (os.path.relpath(path, ROOT), len(data)))


GEN_NOTE = 'GENERADO por scripts/gen-categorias.py — no editar a mano;\ncambia catalogo/estructura-categorias-v2.* y vuelve a correrlo.'

# --- verificacion: enlaces internos de TODO el theme contra las rutas ---
# Rutas que sirve VTEX sin que existan en routes.json.
NATIVE_PATHS = {'/', '/login', '/account', '/cart', '/checkout', '/search', '/s',
                '/sitemap', '/logout', '/new', '/sale'}


CATALOG_PATHS = []          # nodos que sirve VTEX (marcados "catalogo": true)


def check_links(routes, pending=None):
    """Revisa TODOS los enlaces internos del theme (no solo los de las tres
    secciones) contra las rutas que van a quedar. Devuelve los rotos.

    Lee el contenido pendiente cuando lo hay: asi valida lo que se va a
    escribir, no lo que quedo de la corrida anterior."""
    import glob
    pending = pending or {}
    paths = ({v['path'].rstrip('/') or '/' for v in routes.values()} | NATIVE_PATHS
             | {n['path'] for n in CATALOG_PATHS})
    bad = []
    files = sorted(glob.glob(os.path.join(ROOT, 'store', 'blocks', '**', '*.json*'), recursive=True))
    for f in sorted(set(files) | set(pending)):
        txt = pending.get(f) or open(f, encoding='utf-8').read()
        links = set(re.findall(r'\]\((/[^)#]*)\)', txt)) | set(re.findall(r'"url":\s*"(/[^"]*)"', txt))
        for link in links:
            clean = link.split('?')[0].split('#')[0].rstrip('/') or '/'
            if clean.startswith('//'):
                continue                      # protocol-relative: es externo
            if clean not in paths:
                bad.append((os.path.relpath(f, ROOT), link))
    if bad:
        print('\n  ENLACES ROTOS (apuntan a rutas que no existen):')
        for f, l in sorted(set(bad)):
            print('   %-46s %s' % (f, l))
    else:
        print('  enlaces internos: todos validos')
    return sorted(set(bad))


def build_and_write(NODES, RAILS, routes):
    """Arma los bloques y las rutas y los escribe (o los enumera con --dry-run)."""
    # --- 1. rail de macros (landings) ------------------------------------------

    rail = OrderedDict()
    rail['rich-text#rx-lineas-heading'] = {'props': {'text': 'Explora por categoría', 'blockClass': 'rxLineasHeading'}}
    for sec, macros in RAILS.items():
        rail['flex-layout.row#rx-lineas-section-%s' % sec] = {
            'props': {'fullWidth': True, 'blockClass': 'rxLineasSection'},
            'children': ['flex-layout.col#rx-lineas-inner-%s' % sec],
        }
        rail['flex-layout.col#rx-lineas-inner-%s' % sec] = {
            'props': {'blockClass': 'rxLineasInner', 'width': '100%'},
            'children': ['rich-text#rx-lineas-heading', 'flex-layout.row#rx-lineas-%s' % sec],
        }
        cards = []
        for i, m in enumerate(macros, 1):
            cid = 'rx-%s-linea-%02d' % (sec, i)
            cards.append('flex-layout.col#%s' % cid)
            rail['flex-layout.col#%s' % cid] = {
                'props': {'blockClass': 'rxLineaCard', 'width': '100%'},
                'children': ['flex-layout.col#%s-media' % cid, 'flex-layout.row#%s-foot' % cid],
            }
            rail['flex-layout.col#%s-media' % cid] = {
                'props': {'blockClass': 'rxLineaMedia', 'width': '100%'},
                'children': ['image#%s-img' % cid],
            }
            rail['image#%s-img' % cid] = {
                'props': {
                    'blockClass': 'rxLineaImage',
                    'src': placeholder('%s %02d / %s' % (sec, i, m['nombre'])),
                    'alt': m['nombre'],
                    'link': {'url': m['path'], 'newTab': False, 'attributeNofollow': False},
                }
            }
            rail['flex-layout.row#%s-foot' % cid] = {
                'props': {'blockClass': 'rxLineaFoot', 'preventHorizontalStretch': True},
                'children': ['rich-text#%s-txt' % cid, 'rich-text#%s-arrow' % cid],
            }
            rail['rich-text#%s-txt' % cid] = {'props': {'text': '[%s](%s)' % (md_escape(m['nombre']), m['path']), 'blockClass': 'rxLineaLabel'}}
            rail['rich-text#%s-arrow' % cid] = {'props': {'text': '[→](%s)' % m['path'], 'blockClass': 'rxLineaArrow'}}
        rail['flex-layout.row#rx-lineas-%s' % sec] = {'props': {'blockClass': grid_class(len(macros))}, 'children': cards}

    # landing /herramientas: banner + buscador + rail (sin selector de vehiculo)
    rail['store.custom#landing-herramientas'] = {
        'blocks': ['flex-layout.row#rx-p-landing-herramientas-banner', 'flex-layout.row#rx-tools-search',
                   'flex-layout.row#rx-lineas-section-herramientas', 'flex-layout.row#carros-cta-banner'],
    }
    rail['flex-layout.row#rx-p-landing-herramientas-banner'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxLineaBanner'},
        'children': ['flex-layout.col#rx-p-landing-herramientas-banner-media', 'flex-layout.col#rx-p-landing-herramientas-banner-content'],
    }
    rail['flex-layout.col#rx-p-landing-herramientas-banner-media'] = {
        'props': {'blockClass': 'rxLineaBannerMedia', 'width': '100%'},
        'children': ['image#rx-p-landing-herramientas-banner-img'],
    }
    rail['image#rx-p-landing-herramientas-banner-img'] = {
        'props': {'blockClass': 'rxSlideImage', 'src': banner_placeholder('herramientas / landing'), 'alt': ''}
    }
    rail['flex-layout.col#rx-p-landing-herramientas-banner-content'] = {
        'props': {'blockClass': 'rxLineaBannerContent', 'width': '100%'},
        'children': ['rich-text#rx-p-landing-herramientas-eyebrow', 'rich-text#rx-p-landing-herramientas-title'],
    }
    rail['rich-text#rx-p-landing-herramientas-eyebrow'] = {'props': {'text': 'Para carros y motos', 'blockClass': 'rxEyebrow'}}
    rail['rich-text#rx-p-landing-herramientas-title'] = {'props': {'text': '# Herramientas, cuidado y taller', 'blockClass': 'rxTitle'}}

    rail_lines = []
    for sec, macros in RAILS.items():
        rail_lines.append('%s (%d): %s' % (sec, len(macros), ', '.join(m['nombre'] for m in macros)))

    print('Generando...')
    dump(os.path.join(BLOCKS, 'category-rail.jsonc'), """
    CATEGORIAS (macros) — cuadricula "Explora por categoria" en las
    landings /carros y /motos
    ------------------------------------------------------------
    %s

    Cada tarjeta lleva a /<seccion>/<macro>. Incluye la landing
    /herramientas (store.custom#landing-herramientas): banner,
    buscador y rail; sin selector de vehiculo.

    IMAGENES: los src son PLACEHOLDERS en SVG (dicen "REEMPLAZAR"
    y el nombre de la macro). Para poner la real solo se cambia
    "src" en image#rx-<seccion>-linea-NN-img. Recomendado: PNG con
    fondo blanco o transparente, producto centrado, ~800x500.
    10 macros -> 5 por fila en escritorio (rxLineasGrid5); 12 -> 6.

    %s
    """ % ('\n'.join(rail_lines), GEN_NOTE), rail)

    # --- 2. paginas (store.custom + banner) y 3. cuadriculas de hijos ----------

    for sec, dept in SECTIONS.items():
        pages = OrderedDict()
        grids = OrderedDict()
        grids['rich-text#rx-cats-heading-%s' % sec] = {'props': {'text': 'Categorías', 'blockClass': 'rxLineasHeading'}}
        for n in [x for x in NODES if x['section'] == sec and not x.get('catalogo')]:
            key = n['key']
            pid = 'rx-p-%s' % key
            blocks = ['flex-layout.row#%s-banner' % pid, 'flex-layout.row#%s-nav' % pid]
            if n['children']:
                gid = 'rx-g-%s' % key
                blocks.append('flex-layout.row#%s-section' % gid)
                grids['flex-layout.row#%s-section' % gid] = {
                    'props': {'fullWidth': True, 'blockClass': 'rxLineasSection'},
                    'children': ['flex-layout.col#%s-inner' % gid],
                }
                grids['flex-layout.col#%s-inner' % gid] = {
                    'props': {'blockClass': 'rxLineasInner', 'width': '100%'},
                    'children': ['rich-text#rx-cats-heading-%s' % sec, 'flex-layout.row#%s' % gid],
                }
                cards = [card_blocks(gid, c, grids) for c in n['children']]
                grids['flex-layout.row#%s' % gid] = {'props': {'blockClass': grid_class(len(cards))}, 'children': cards}
            # el listado de productos solo va en las paginas sin hijos (tipo de
            # producto): macros y subcategorias muestran solo su cuadricula
            if not n['children']:
                blocks.append('search-result-layout.customQuery#rx-%s' % key)
            pages['store.custom#%s' % key] = {'blocks': blocks}
            pages['flex-layout.row#%s-banner' % pid] = {
                'props': {'fullWidth': True, 'blockClass': 'rxLineaBanner'},
                'children': ['flex-layout.col#%s-banner-media' % pid, 'flex-layout.col#%s-banner-content' % pid],
            }
            # imagen de campana de fondo (1600x400): se cambia el src de image#...-banner-img
            pages['flex-layout.col#%s-banner-media' % pid] = {
                'props': {'blockClass': 'rxLineaBannerMedia', 'width': '100%'},
                'children': ['image#%s-banner-img' % pid],
            }
            pages['image#%s-banner-img' % pid] = {
                'props': {'blockClass': 'rxSlideImage', 'src': banner_placeholder('%s / %s' % (sec, n['nombre'])), 'alt': ''}
            }
            pages['flex-layout.col#%s-banner-content' % pid] = {
                'props': {'blockClass': 'rxLineaBannerContent', 'width': '100%'},
                'children': ['rich-text#%s-eyebrow' % pid, 'rich-text#%s-title' % pid],
            }
            # barra "Volver" entre el banner y la cuadricula: al padre (macro -> landing)
            parent_path = n['path'].rsplit('/', 1)[0]
            parent_name = dept if n['kind'] == 'macro' else n['ancestors'][-1]
            pages['flex-layout.row#%s-nav' % pid] = {
                'props': {'fullWidth': True, 'blockClass': 'rxBackBar', 'preventHorizontalStretch': True},
                'children': ['rich-text#%s-back' % pid],
            }
            pages['rich-text#%s-back' % pid] = {
                'props': {'text': '[← Volver a %s](%s)' % (md_escape(parent_name), parent_path), 'blockClass': 'rxBack'}
            }
            pages['rich-text#%s-eyebrow' % pid] = {'props': {'text': ' · '.join(n['ancestors']), 'blockClass': 'rxEyebrow'}}
            pages['rich-text#%s-title' % pid] = {'props': {'text': '# ' + n['nombre'], 'blockClass': 'rxTitle'}}
            if n.get('valores'):
                # Vitrina de filtros: en vez de una tarjeta por tipo, el banner
                # enumera lo que trae la pagina y el filtro hace el resto.
                pages['rich-text#%s-sub' % pid] = {
                    'props': {'text': '%s: %s' % (n.get('filtro') or 'Filtra por',
                                                  ' · '.join(n['valores'])), 'blockClass': 'rxBannerSub'}}
                pages['flex-layout.col#%s-banner-content' % pid]['children'].append('rich-text#%s-sub' % pid)

        counts = {k: sum(1 for x in NODES if x['section'] == sec and x['kind'] == k) for k in ('macro', 'sub', 'hoja')}
        dump(os.path.join(BLOCKS, 'category-pages-%s.jsonc' % sec), """
    PAGINAS DE CATEGORIA — %s (%d macros, %d subcategorias, %d hojas)
    ------------------------------------------------------------
    Una pagina por cada nivel del arbol: /%s/<macro>,
    /%s/<macro>/<sub> y /%s/<macro>/<sub>/<hoja> (en las macros sin
    subcategoria, las hojas cuelgan directo: /%s/<macro>/<hoja>).

    Cada pagina: banner con imagen de campana de fondo (eyebrow con
    la ruta y nombre como H1 encima), barra "Volver" al nivel anterior
    y, si tiene hijos, su cuadricula (category-grids-%s.jsonc). El listado de
    productos (category-listing.jsonc, con panel de filtros y selector
    de vehiculo) va SOLO en las paginas sin hijos, es decir, en el tipo
    de producto; macros y subcategorias no listan productos.

    IMAGEN DEL BANNER (campana): cambia "src" en
    image#rx-p-<pagina>-banner-img. Medida 1600x400 (JPG/PNG); el
    texto va sobre la mitad izquierda con un velo oscuro, asi que el
    motivo de la foto debe quedar a la derecha. Mientras no haya
    imagen, el placeholder es el fondo negro con la diagonal roja.

    Las rutas viven en store/routes.json.

    %s
    """ % (dept, counts['macro'], counts['sub'], counts['hoja'], sec, sec, sec, sec, sec, GEN_NOTE), pages)

        dump(os.path.join(BLOCKS, 'category-grids-%s.jsonc' % sec), """
    CUADRICULAS DE HIJOS — %s
    ------------------------------------------------------------
    Para cada macro y subcategoria, la cuadricula (rxLineasGrid) con
    una tarjeta por hijo IGUAL a la de las macros del rail: espacio de
    imagen arriba y el nombre abajo.

    IMAGENES: los src son PLACEHOLDERS en SVG ("REEMPLAZAR" + nombre).
    Para poner la real solo se cambia "src" en
    image#rx-g-<pagina>-<hijo>-img. Recomendado: PNG con fondo blanco
    o transparente, producto centrado, ~800x500.
    (Los iconos SVG anteriores siguen en catalogo/iconos-categorias.json
    por si se quieren usar como imagen de alguna tarjeta.)

    %s
    """ % (dept, GEN_NOTE), grids)

    # --- 4. listado compartido + customQuery por pagina -----------------------

    listing = OrderedDict()
    listing['search-result-layout.desktop#rx'] = {
        'props': {'pagination': 'show-more', 'preventRouteChange': True, 'defaultGalleryLayout': 'grid', 'blockClass': 'rx'},
        'children': ['flex-layout.row#rx-filterbar', 'flex-layout.row#rx-results'],
    }
    listing['search-result-layout.mobile#rx'] = {
        'props': {'pagination': 'show-more', 'preventRouteChange': True, 'defaultGalleryLayout': 'grid', 'blockClass': 'rx'},
        'children': ['flex-layout.row#rx-filterbar', 'flex-layout.row#rx-results'],
    }
    listing['flex-layout.row#rx-filterbar'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxFilterbar', 'preventHorizontalStretch': True, 'preserveLayoutOnMobile': True},
        'children': ['rich-text#rx-orderby-label', 'order-by.v2#rx'],
    }
    listing['rich-text#rx-orderby-label'] = {'props': {'text': 'Ordenar por:', 'blockClass': 'rxOrderByLabel'}}
    listing['order-by.v2#rx'] = {'props': {'blockClass': 'rx', 'hiddenOptions': []}}
    listing['flex-layout.row#rx-results'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxResults'},
        'children': ['search-content#rx'],
    }
    listing['search-content#rx'] = {'blocks': ['gallery#rx', 'not-found#rx']}
    listing['gallery#rx'] = {
        'props': {
            'layouts': [{'name': 'grid', 'component': 'GridSummary',
                         'itemsPerRow': {'(min-width:1300px)': 4, 'desktop': 4, 'tablet': 3, 'phone': 2}}],
            'GridSummary': 'product-summary.shelf#rx',
            'blockClass': 'rx',
        }
    }
    listing['not-found#rx'] = {'props': {'blockClass': 'rx'}}
    listing['search-not-found-layout#rx'] = {'children': ['flex-layout.row#rx-filterbar', 'flex-layout.row#rx-empty']}
    listing['flex-layout.row#rx-empty'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxEmpty'},
        'children': ['rich-text#rx-empty-text'],
    }
    listing['rich-text#rx-empty-text'] = {'props': {'text': 'Pronto tendremos productos en esta categoría.', 'blockClass': 'rxEmptyText'}}

    for n in [x for x in NODES if not x['children'] and not x.get('catalogo')]:
        if REAL_QUERIES:
            segs = n['path'].strip('/')
            qs = {'queryField': segs, 'mapField': ','.join(['c'] * len(segs.split('/')))}
        else:
            qs = {'queryField': '999999', 'mapField': 'productClusterIds'}
        qs.update({'orderByField': 'OrderByNameASC', 'hideUnavailableItems': True,
                   'skusFilter': 'FIRST_AVAILABLE', 'maxItemsPerPage': 24})
        # Sin hijos = pagina final: lleva selector de vehiculo, sea una hoja o
        # una subcategoria que todavia no tiene tipos.
        layout = 'rx-f' if not n['children'] and n['section'] in VEHICLE_SECTIONS else 'rx'
        listing['search-result-layout.customQuery#rx-%s' % n['key']] = {
            'props': {'querySchema': qs},
            'blocks': ['search-result-layout.desktop#%s' % layout, 'search-result-layout.mobile#%s' % layout,
                       'search-not-found-layout#rx'],
        }

    dump(os.path.join(BLOCKS, 'category-listing.jsonc'), """
    LISTADO — solo paginas de tipo de producto (sin hijos)
    ------------------------------------------------------------
    Debajo del banner va la barra "Ordenar por:" y el listado con la
    misma tarjeta del home, con el layout de filtros y selector de
    vehiculo (#rx-f, en category-filters.jsonc). Las macros y
    subcategorias no listan productos: solo muestran su cuadricula.
    El layout simple (#rx) queda disponible por si alguna pagina lo
    necesita.

    Es un search-result real: cuando haya productos aparecen solos.
    Mientras tanto el not-found nativo se muestra como panel gris
    ("Pronto tendremos productos en esta categoria").

    IMPORTANTE — la consulta de cada pagina es un PLACEHOLDER que
    apunta a una coleccion inexistente (id 999999) para que el
    listado salga vacio y no muestre productos de otras lineas.
    Los campos del querySchema son queryField / mapField (con
    query / map VTEX los ignora y lista todo el catalogo).
    Cuando las categorias existan en el catalogo, regenera con
      python3 scripts/gen-categorias.py --real
    y cada pagina consulta su ruta ("carros/frenos/pastillas-de-freno",
    mapField "c,c,c").

    Opciones de orden: las nativas de VTEX. Para ocultar alguna,
    agregala a hiddenOptions en order-by.v2#rx (p. ej.
    "OrderByScoreDESC").

    Modo actual: %s

    %s
    """ % ('--real (ruta de categoria)' if REAL_QUERIES else 'placeholder (999999)', GEN_NOTE), listing)

    # --- 5. layout con filtros (hojas) ----------------------------------------

    hidden = {'categories': True, 'brands': False, 'priceRange': False,
              'specificationFilters': {'hideAll': False,
                                       'hiddenFilters': [{'name': f} for f in VEHICLE_FACETS]}}
    filters = OrderedDict()
    filters['filter-navigator.v3#rx'] = {
        'props': {'blockClass': 'rx', 'layout': 'desktop', 'priceRangeLayout': 'inputAndSlider',
                  'showClearByFilter': True, 'showClearAllFiltersOnDesktop': True, 'openFiltersMode': 'many',
                  'truncateFilters': True, 'truncatedFacetsFetch': True, 'hiddenFacets': hidden}
    }
    filters['filter-navigator.v3#rx-m'] = {
        'props': {'blockClass': 'rxM', 'layout': 'phone', 'priceRangeLayout': 'inputAndSlider',
                  'showClearByFilter': True, 'hiddenFacets': hidden}
    }
    # sin query/map: el selector toma la categoria de la ruta actual
    # Los mismos nombres que se ocultan en filter-navigator se le pasan al
    # selector como props explicitas: una sola fuente, no pueden divergir.
    filters['vehicle-selector#rx-f'] = {'props': {
        'buttonLabel': 'Buscar repuestos',
        'brandFacet': VEHICLE_FACETS[0], 'yearFacet': VEHICLE_FACETS[1],
        'modelFacet': VEHICLE_FACETS[2]}}
    filters['search-result-layout.desktop#rx-f'] = {
        'props': {'pagination': 'show-more', 'preventRouteChange': True, 'defaultGalleryLayout': 'grid', 'blockClass': 'rxF'},
        'children': ['flex-layout.row#rx-f-body'],
    }
    filters['flex-layout.row#rx-f-body'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxFBody', 'preserveLayoutOnMobile': True},
        'children': ['flex-layout.col#rx-f-side', 'flex-layout.col#rx-f-main'],
    }
    filters['flex-layout.col#rx-f-side'] = {
        'props': {'blockClass': 'rxFSide', 'width': '24%'},
        'children': ['vehicle-selector#rx-f', 'filter-navigator.v3#rx'],
    }
    filters['flex-layout.col#rx-f-main'] = {
        'props': {'blockClass': 'rxFMain', 'width': 'grow'},
        'children': ['flex-layout.row#rx-filterbar-f', 'flex-layout.row#rx-results-f'],
    }
    filters['flex-layout.row#rx-filterbar-f'] = {
        'props': {'blockClass': 'rxFilterbarF', 'preventHorizontalStretch': True, 'preserveLayoutOnMobile': True},
        'children': ['rich-text#rx-orderby-label', 'order-by.v2#rx'],
    }
    filters['flex-layout.row#rx-results-f'] = {'props': {'blockClass': 'rxResultsF'}, 'children': ['search-content#rx']}
    filters['search-result-layout.mobile#rx-f'] = {
        'props': {'pagination': 'show-more', 'preventRouteChange': True, 'defaultGalleryLayout': 'grid', 'blockClass': 'rxF'},
        'children': ['flex-layout.row#rx-f-vehicle-m', 'flex-layout.row#rx-filterbar-m', 'flex-layout.row#rx-results-f'],
    }
    filters['flex-layout.row#rx-f-vehicle-m'] = {
        'props': {'fullWidth': True, 'blockClass': 'rxFVehicleM'},
        'children': ['vehicle-selector#rx-f'],
    }
    filters['flex-layout.row#rx-filterbar-m'] = {
        'props': {'blockClass': 'rxFilterbarM', 'preventHorizontalStretch': True, 'preserveLayoutOnMobile': True},
        'children': ['filter-navigator.v3#rx-m', 'order-by.v2#rx'],
    }

    dump(os.path.join(BLOCKS, 'category-filters.jsonc'), """
    FILTROS — paginas hoja (tipo de producto) de carros y motos
    ------------------------------------------------------------
    Escritorio y tablet: columna izquierda (24%%) con el panel de
    filtros y a la derecha "Ordenar por" + productos. Movil: el
    selector de vehiculo arriba a todo el ancho, luego una barra
    [Filtros | Ordenar por] (el boton abre los demas filtros en un
    panel deslizante) y los productos.

    Panel de filtros:
    - vehicle-selector: componente propio (react/VehicleSelector.js).
      Sin props query/map toma la categoria base de la RUTA ACTUAL,
      por eso un solo layout sirve para todas las hojas. Lee
      Marca vehiculo -> Modelo -> Ano de las especificaciones
      filtrables y al buscar navega a la categoria con los filtros.
    - filter-navigator.v3: filtros nativos (aparecen solos cuando los
      productos tengan especificaciones marcadas como filtro).
      Marca vehiculo / Ano / Modelo se ocultan porque ya los maneja
      el selector.

    %s
    """ % GEN_NOTE, filters)

    # --- 6. rutas ---------------------------------------------------------------

    kept = OrderedDict()
    dropped = OrderedDict()
    for k, v in routes.items():
        p = v.get('path', '')
        if re.match(r'^/(carros|motos|herramientas)(/|$)', p) and k not in ('store.custom#landing-carros', 'store.custom#landing-motos'):
            dropped[k] = p
            continue
        kept[k] = v
    kept['store.custom#landing-herramientas'] = {'path': '/herramientas'}
    for n in NODES:
        if n.get('catalogo'):
            continue          # la sirve VTEX como pagina nativa de categoria
        kept['store.custom#%s' % n['key']] = {'path': n['path']}
    # Una ruta generada tiene la clave derivada de su propia ruta
    # (/carros/frenos -> store.custom#carros-frenos). Si no coincide, la puso
    # alguien a mano (una promo, una landing) y borrarla en silencio se lleva
    # por delante una pagina que el arbol no va a devolver.
    def es_generada(key, path):
        return key == 'store.custom#%s' % path.strip('/').replace('/', '-')

    manual = OrderedDict((k, p) for k, p in dropped.items()
                         if k not in kept and not es_generada(k, p))
    if dropped:
        lines = ['Rutas de /carros, /motos y /herramientas que la ultima corrida de',
                 'scripts/gen-categorias.py reemplazo. Las marcadas MANUAL no las genera',
                 'el arbol del catalogo: si las quieres, vuelve a agregarlas a',
                 'store/routes.json (y al bloque store.custom#... correspondiente).', '']
        for k, p in dropped.items():
            lines.append('%-10s %-56s %s' % ('MANUAL' if k in manual else 'generada', k, p))
        if not DRY_RUN:
            # Reporte, no salida del theme: se escribe ya, para poder revisarlo
            # aunque la corrida se aborte por una ruta manual.
            with open(os.path.join(CAT, 'rutas-eliminadas.txt'), 'w', encoding='utf-8') as fh:
                fh.write('\n'.join(lines) + '\n')
    if manual:
        print('\n  RUTAS MANUALES QUE SE PERDERIAN (%d):' % len(manual))
        for k, p in manual.items():
            print('   %-56s %s' % (k, p))
        if not FORCE:
            raise SystemExit('ERROR: hay rutas hechas a mano bajo /carros, /motos o '
                             '/herramientas que el arbol no regenera. Revisa '
                             'catalogo/rutas-eliminadas.txt y vuelve a correr con --force '
                             'si de verdad quieres borrarlas.')
    if DRY_RUN:
        print('  [dry-run] %-36s %5d rutas' % ('store/routes.json', len(kept)))
    else:
        stage(ROUTES, json.dumps(kept, ensure_ascii=False, indent=2) + '\n')
        print('  %-46s %5d rutas' % ('store/routes.json', len(kept)))

    # --- resumen ---------------------------------------------------------------

    for sec in SECTIONS:
        print('  %-13s %3d paginas' % (sec, sum(1 for n in NODES if n['section'] == sec)))
    CATALOG_PATHS[:] = [n for n in NODES if n.get('catalogo')]
    bad_links = check_links(kept, PENDING)

    print('\nPaginas: %d (macros %d, subcategorias %d, hojas %d) · tarjetas: %d' % (
        len(NODES),
        sum(1 for n in NODES if n['kind'] == 'macro'),
        sum(1 for n in NODES if n['kind'] == 'sub'),
        sum(1 for n in NODES if n['kind'] == 'hoja'),
        sum(len(n['children']) for n in NODES) + sum(1 for n in NODES if n['kind'] == 'macro'),
    ))
    return bad_links


def main(argv=None):
    global REAL_QUERIES, DRY_RUN, FORCE
    ap = argparse.ArgumentParser(
        description='Genera las paginas de categoria del theme desde catalogo/estructura-categorias-v2.json.')
    ap.add_argument('--real', action='store_true',
                    help='queryField = ruta de la categoria (cuando ya exista en el catalogo)')
    ap.add_argument('--dry-run', action='store_true',
                    help='enumera lo que escribiria, sin tocar ningun archivo')
    ap.add_argument('--force', action='store_true',
                    help='escribe aunque haya enlaces rotos o rutas manuales que se pierden')
    args = ap.parse_args(argv)
    REAL_QUERIES, DRY_RUN, FORCE = args.real, args.dry_run, args.force
    PENDING.clear()

    _tree, routes = load_inputs()          # valida TODO antes de escribir
    try:
        nodes, rails = build_tree()
    except ValueError as exc:
        raise SystemExit('ERROR: %s' % exc)
    export_csv(nodes)
    bad_links = build_and_write(nodes, rails, routes)

    if DRY_RUN:
        print('\n--dry-run: no se escribio nada.')
        return 1 if (bad_links and not FORCE) else 0
    if bad_links and not FORCE:
        raise SystemExit('ERROR: %d enlace(s) del theme apuntan a rutas que no existen. '
                         'Corrigelos (o vuelve a correr con --force). No se escribio nada.'
                         % len(bad_links))
    print('  escritos %d archivos' % commit())
    return 0


if __name__ == '__main__':
    sys.exit(main())
