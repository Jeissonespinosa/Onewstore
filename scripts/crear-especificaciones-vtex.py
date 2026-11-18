#!/usr/bin/env python3
"""Crea en VTEX las especificaciones filtrables de cada tipo de producto.

Lee _filtros de catalogo/estructura-categorias-v2.json y, para cada hoja que
YA exista como categoria en VTEX, crea el grupo, las especificaciones y sus
valores.

    python3 scripts/crear-especificaciones-vtex.py            # plan
    python3 scripts/crear-especificaciones-vtex.py --ejecutar # crea

Notas que costaron caro:
  - El tipo de campo en VTEX es INMUTABLE. 'unico' -> radio (5),
    'multi' -> multi-valor (7). Cambiarlo despues obliga a crear otra
    especificacion y re-etiquetar todos los productos.
  - Las lecturas del catalogo estan cacheadas en el CDN: sin romper la cache
    una segunda corrida no ve lo que creo la primera y DUPLICA todo. Y en
    VTEX nada de esto se puede borrar.
"""
import argparse, json, os, re, subprocess, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARBOL = os.path.join(ROOT, 'catalogo', 'estructura-categorias-v2.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'
CAMPO = {'unico': 5, 'multi': 7}          # 5 = radio, 7 = multi-valor


def norm(s):
    s = unicodedata.normalize('NFD', str(s).replace('ñ', 'n'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', s.lower())).strip()


def token():
    try:
        out = subprocess.run(['vtex', 'local', 'token'], capture_output=True, text=True,
                             stdin=subprocess.DEVNULL, timeout=25)
    except subprocess.TimeoutExpired:
        sys.exit('ERROR: la sesion de VTEX vencio. Corre: vtex login onewstore')
    for l in reversed((out.stdout or '').strip().splitlines()):
        l = l.strip()
        if len(l) > 100 and ' ' not in l and l.isascii():
            return l
    sys.exit('ERROR: no hay sesion de VTEX activa. Corre: vtex login onewstore')


def call(tk, method, path, body=None):
    sep = '&' if '?' in path else '?'
    if method == 'GET':
        path = '%s%s_=%d' % (path, sep, int(time.time() * 1000))   # romper cache
    req = urllib.request.Request(
        BASE + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'VtexIdclientAutCookie': tk, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def slugify(s):
    s = unicodedata.normalize('NFD', str(s).replace('ñ', 'n'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def categorias(tk):
    """{ruta: id} del arbol de VTEX, por RUTA y no por nombre.

    Por nombre era ambiguo: "Filtros de aceite" existe en carros y en motos, y
    resolver "la primera" habria creado las especificaciones solo en una de
    las dos, en silencio y sin vuelta atras.
    """
    st, tree = call(tk, 'GET', '/api/catalog_system/pub/category/tree/50')
    if st != 200:
        sys.exit('ERROR leyendo el arbol: %s' % tree)
    por_ruta = {}

    def walk(nodos, prefijo):
        for n in nodos:
            # VTEX arma la URL desde el NOMBRE e ignora el LinkId que se le
            # mande al crear la categoria, asi que el slug del arbol tiene que
            # coincidir con el nombre o las rutas no cuadran.
            ruta = '%s/%s' % (prefijo, slugify(n['name']))
            por_ruta[ruta] = n['id']
            walk(n.get('children') or [], ruta)
    walk(tree, '')
    return por_ruta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ejecutar', action='store_true')
    args = ap.parse_args()

    filtros = json.load(open(ARBOL, encoding='utf-8')).get('_filtros') or {}
    tk = token()
    cats = categorias(tk)

    nuevas = valores_nuevos = reusadas = 0
    sin_categoria = []
    for ruta, specs in filtros.items():
        cid = cats.get(ruta)
        if cid is None:
            sin_categoria.append(ruta)
            continue
        hoja = ruta.rsplit('/', 1)[-1]
        st, existentes = call(tk, 'GET',
                              '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % cid)
        ya = {norm(f['Name']): f['FieldId'] for f in (existentes or [])} if st == 200 else {}
        grupo = None
        for pos, spec in enumerate(specs, 1):
            nombre, tipo, valores = spec['nombre'], spec['tipo'], spec.get('valores') or []
            if norm(nombre) in ya:
                fid = ya[norm(nombre)]
                reusadas += 1
                print('   existe  %-28s %-26s id=%s' % (hoja[:27], nombre[:25], fid))
            elif not args.ejecutar:
                nuevas += 1
                valores_nuevos += len(valores)
                print('   [plan]  %-28s %-26s %s, %d valores'
                      % (hoja[:27], nombre[:25], tipo, len(valores)))
                continue
            else:
                if grupo is None:
                    st, g = call(tk, 'POST', '/api/catalog/pvt/specificationgroup',
                                 {'CategoryId': cid, 'Name': 'Características', 'Position': 1})
                    if st != 200 or not isinstance(g, dict):
                        sys.exit('ERROR creando el grupo en la categoria %d: %s' % (cid, g))
                    grupo = g['Id']
                st, r = call(tk, 'POST', '/api/catalog/pvt/specification', {
                    'FieldTypeId': CAMPO[tipo], 'CategoryId': cid, 'FieldGroupId': grupo,
                    'Name': nombre, 'Description': nombre, 'Position': pos,
                    'IsFilter': True, 'IsRequired': False, 'IsOnProductDetails': True,
                    'IsStockKeepingUnit': False, 'IsWizard': False, 'IsActive': True,
                    'IsTopMenuLinkActive': False, 'IsSideMenuLinkActive': True})
                if st != 200 or not isinstance(r, dict):
                    print('   ERROR   %-28s %-26s %s %s' % (hoja[:27], nombre[:25], st, r))
                    sys.exit('Se detuvo para no dejarlo a medias.')
                fid = r['Id']
                nuevas += 1
                print('   creada  %-28s %-26s id=%s (%s)' % (hoja[:27], nombre[:25], fid, tipo))
            if not args.ejecutar:
                continue
            st, vs = call(tk, 'GET', '/api/catalog_system/pub/specification/fieldvalue/%d' % fid)
            tiene = {norm(v['Value']) for v in (vs or [])} if st == 200 else set()
            for i, valor in enumerate(valores, 1):
                if norm(valor) in tiene:
                    continue
                st2, _ = call(tk, 'POST', '/api/catalog/pvt/specificationvalue',
                              {'FieldId': fid, 'Name': valor, 'Text': valor,
                               'Position': i, 'IsActive': True})
                if st2 != 200:
                    print('      ERROR valor %r -> %s' % (valor, st2))
                else:
                    valores_nuevos += 1
                time.sleep(0.1)

    print('\n  %s: %d especificaciones, %d valores, %d ya existian'
          % ('EJECUTADO' if args.ejecutar else 'PLAN (no se creo nada)',
             nuevas, valores_nuevos, reusadas))
    if sin_categoria:
        print('\n  SIN CATEGORIA en VTEX todavia (se omiten): %d' % len(sin_categoria))
        for h in sin_categoria:
            print('     -', h)


if __name__ == '__main__':
    main()
