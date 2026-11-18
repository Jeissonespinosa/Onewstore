#!/usr/bin/env python3
"""Crea en VTEX las categorias del arbol, por tandas.

En VTEX una categoria NO SE PUEDE BORRAR, solo desactivar: por eso el script
es idempotente (si ya existe una categoria con el mismo nombre bajo el mismo
padre, la reutiliza) y por eso --dry-run es el modo por defecto.

    python3 scripts/crear-categorias-vtex.py --tanda 1            # plan
    python3 scripts/crear-categorias-vtex.py --tanda 1 --ejecutar # crea

El token sale de `vtex local token`, asi que hay que estar logueado.
"""
import argparse, json, os, re, subprocess, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARBOL = os.path.join(ROOT, 'catalogo', 'estructura-categorias-v2.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'

TANDAS = {
    1: [('Carros', 'Llantas y rines'), ('Carros', 'Lubricantes y mantenimiento'),
        ('Carros', 'Filtros'), ('Carros', 'Baterías'),
        ('Carros', 'Eléctrico y electrónico'),
        ('Motos', 'Llantas y rines'), ('Motos', 'Lubricantes y mantenimiento'),
        ('Motos', 'Filtros'), ('Motos', 'Baterías')],
}


def slugify(s):
    s = unicodedata.normalize('NFD', s.replace('ñ', 'n'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def token(obligatorio=True):
    """El token de la sesion del toolbelt. Si la sesion vencio, `vtex local
    token` imprime un mensaje en vez del token: se valida la forma para no
    mandar basura en una cabecera HTTP."""
    # stdin cerrado y timeout: con la sesion vencida el CLI abre un prompt
    # interactivo y se queda esperando para siempre.
    try:
        out = subprocess.run(['vtex', 'local', 'token'], capture_output=True, text=True,
                             stdin=subprocess.DEVNULL, timeout=25)
    except subprocess.TimeoutExpired:
        out = None
    if out is None:
        if obligatorio:
            sys.exit('ERROR: la sesion de VTEX vencio. Corre: vtex login onewstore')
        return None
    for linea in reversed((out.stdout or '').strip().splitlines()):
        linea = linea.strip()
        if len(linea) > 100 and ' ' not in linea and linea.isascii():
            return linea
    if obligatorio:
        sys.exit('ERROR: no hay sesion de VTEX activa. Corre: vtex login onewstore')
    return None


def call(tk, method, path, body=None):
    cab = {'Content-Type': 'application/json', 'Accept': 'application/json',
           'Cache-Control': 'no-cache'}
    if tk:
        cab['VtexIdclientAutCookie'] = tk
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def arbol_vtex(tk):
    """{(padre_id, nombre_normalizado): id} de lo que ya existe.

    El endpoint del arbol esta cacheado en el CDN: sin romper la cache, una
    segunda corrida no ve lo que creo la primera y DUPLICA todo el arbol. Y en
    VTEX una categoria no se puede borrar. Por eso el parametro anticache no
    es cosmetico.
    """
    st, tree = call(tk, 'GET', '/api/catalog_system/pub/category/tree/50?_=%d'
                    % int(time.time() * 1000))
    if st != 200:
        sys.exit('ERROR leyendo el arbol de VTEX: %s' % tree)
    existe = {}

    def walk(nodos, padre):
        for n in nodos:
            existe[(padre, slugify(n['name']))] = n['id']
            walk(n.get('children') or [], n['id'])
    walk(tree, None)
    return existe


def plan(tree, tanda):
    """Lista ordenada de (nivel, nombre, keywords, ruta_padre) a crear."""
    syn = tree.get('_sinonimos') or {}
    items = []

    def claves(seccion, nombre):
        return (syn.get(seccion, {}).get(nombre) or syn.get('_comunes', {}).get(nombre) or [])

    for seccion, macro_nombre in TANDAS[tanda]:
        items.append(('departamento', seccion, claves(seccion, seccion), []))
        for macro in tree[seccion]:
            if macro['nombre'] != macro_nombre:
                continue
            items.append(('macro', macro['nombre'], claves(seccion, macro['nombre']), [seccion]))
            for sub in macro.get('subs', []):
                padre = [seccion, macro['nombre']]
                if sub.get('nombre'):
                    items.append(('subcategoria', sub['nombre'],
                                  claves(seccion, sub['nombre']), padre))
                    padre = padre + [sub['nombre']]
                if sub.get('vitrina') == 'filtros':
                    continue            # sus tipos son valores de filtro, no categorias
                for t in sub.get('tipos', []):
                    nombre = t.get('nombre') if isinstance(t, dict) else t
                    items.append(('tipo', nombre, claves(seccion, nombre), padre))
    vistos, limpio = set(), []
    for it in items:
        k = (tuple(it[3]), slugify(it[1]))
        if k in vistos:
            continue
        vistos.add(k)
        limpio.append(it)
    return limpio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tanda', type=int, default=1)
    ap.add_argument('--ejecutar', action='store_true', help='sin esto solo muestra el plan')
    args = ap.parse_args()

    tree = json.load(open(ARBOL, encoding='utf-8'))
    tk = token(obligatorio=args.ejecutar)   # el plan solo lee el arbol publico
    existe = arbol_vtex(tk)
    ids = {}            # ruta (tupla de nombres) -> id en VTEX
    nuevas = reusadas = 0

    for nivel, nombre, keywords, padre_ruta in plan(tree, args.tanda):
        padre_id = ids.get(tuple(padre_ruta)) if padre_ruta else None
        if padre_ruta and padre_id is None:
            print('   SALTADA %-14s %-40s (falta el padre)' % (nivel, nombre))
            continue
        clave = (padre_id, slugify(nombre))
        ruta = tuple(padre_ruta + [nombre])
        if clave in existe:
            ids[ruta] = existe[clave]
            reusadas += 1
            print('   existe  %-14s %-40s id=%s' % (nivel, nombre, existe[clave]))
            continue
        if not args.ejecutar:
            ids[ruta] = 'NUEVA-%d' % len(ids)
            nuevas += 1
            print('   [plan]  %-14s %-40s padre=%s' % (nivel, nombre, padre_id))
            continue
        # VTEX limita Keywords a 200 caracteres: se recorta por termino
        # completo, no a la mitad de una palabra.
        kw, largo = [], 0
        for t in keywords:
            if largo + len(t) + 2 > 200:
                break
            kw.append(t)
            largo += len(t) + 2
        cuerpo = {'Name': nombre, 'FatherCategoryId': padre_id, 'Title': nombre,
                  'Description': nombre, 'Keywords': ', '.join(kw),
                  'IsActive': True, 'ShowInStoreFront': True, 'ShowBrandFilter': True,
                  'ActiveStoreFrontLink': True, 'GlobalCategoryId': 711,
                  'StockKeepingUnitSelectionMode': 'SPECIFICATION',
                  'LinkId': slugify(nombre), 'Score': None}
        st, r = call(tk, 'POST', '/api/catalog/pvt/category', cuerpo)
        if st != 200 or not isinstance(r, dict):
            print('   ERROR   %-14s %-40s %s %s' % (nivel, nombre, st, r))
            sys.exit('Se detuvo para no dejar el arbol a medias.')
        ids[ruta] = r['Id']
        existe[clave] = r['Id']
        nuevas += 1
        print('   creada  %-14s %-40s id=%s' % (nivel, nombre, r['Id']))

    print('\n  %s: %d a crear, %d ya existian'
          % ('EJECUTADO' if args.ejecutar else 'PLAN (no se creo nada)', nuevas, reusadas))


if __name__ == '__main__':
    main()
