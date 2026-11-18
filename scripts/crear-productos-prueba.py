#!/usr/bin/env python3
"""Crea los productos de prueba de catalogo/productos-prueba.json.

    python3 scripts/crear-productos-prueba.py            # plan
    python3 scripts/crear-productos-prueba.py --ejecutar

Cada producto necesita CINCO cosas para ser visible: producto, SKU, imagen,
precio e inventario. Sin imagen el SKU no se puede activar, y sin SKU activo
con stock el producto no aparece en la busqueda aunque exista.

Las especificaciones se mandan DESPUES de crear el producto y de a una: la
API acepta un lote y responde 200, pero solo aplica la primera.

Idempotente por RefId: si el producto ya existe, lo reutiliza.
"""
import argparse, json, os, re, subprocess, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(ROOT, 'catalogo', 'productos-prueba.json')
REGISTRO = os.path.join(ROOT, 'catalogo', 'categorias-vtex.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'
IMAGEN = ('https://onewstore.vtexassets.com/assets/vtex.file-manager-graphql/images/'
          '772c8205-47cf-4795-ae5d-40aced62274f___c4c0ef3890ef12b8e0cf9f1d6a3a6a9f.png')
ALMACEN = '1_1'


def slugify(s):
    s = unicodedata.normalize('NFD', str(s).replace('ñ', 'n'))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


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
    sys.exit('ERROR: no hay sesion de VTEX. Corre: vtex login onewstore')


def call(tk, method, path, body=None, base=None):
    url = (base or BASE) + path
    if method == 'GET':
        url += ('&' if '?' in url else '?') + '_=%d' % int(time.time() * 1000)
    req = urllib.request.Request(
        url, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'VtexIdclientAutCookie': tk, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def marca_id(tk, nombre):
    st, marcas = call(tk, 'GET', '/api/catalog_system/pvt/brand/list')
    if st != 200:
        sys.exit('ERROR leyendo marcas: %s' % marcas)
    for b in marcas:
        if slugify(b['name']) == slugify(nombre):
            return b['id']
    return None


def specs_de_categoria(tk, cid, cache):
    """{nombre: (fieldId, {valores admitidos})} de la categoria, con herencia."""
    if cid in cache:
        return cache[cid]
    out = {}
    st, campos = call(tk, 'GET',
                      '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % cid)
    for f in (campos or []):
        st2, d = call(tk, 'GET', '/api/catalog/pvt/specification/%d' % f['FieldId'])
        if st2 != 200 or not d.get('IsActive'):
            continue
        st3, vals = call(tk, 'GET',
                         '/api/catalog_system/pub/specification/fieldvalue/%d' % f['FieldId'])
        out[d['Name']] = (f['FieldId'], {v['Value'] for v in (vals or [])})
    cache[cid] = out
    return out


def depurar(declaradas, admitidas, ref):
    """Deja solo lo que la categoria acepta y DICE que descarto.

    Un valor que no existe en la especificacion no da error: VTEX lo ignora y
    el producto queda invisible en ese filtro. Preferimos verlo aqui.
    """
    limpio, avisos = {}, []
    for nombre, valores in declaradas.items():
        if nombre not in admitidas:
            avisos.append('%s: la categoria no tiene %r' % (ref, nombre))
            continue
        permitidos = admitidas[nombre][1]
        if not permitidos:                      # campo de texto libre
            limpio[nombre] = valores
            continue
        buenos = [v for v in valores if v in permitidos]
        malos = [v for v in valores if v not in permitidos]
        if malos:
            avisos.append('%s: %r no admite %s' % (ref, nombre, malos[:4]))
        if buenos:
            limpio[nombre] = buenos
    return limpio, avisos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ejecutar', action='store_true')
    args = ap.parse_args()

    fuente = json.load(open(FUENTE, encoding='utf-8'))['productos']
    categorias = json.load(open(REGISTRO, encoding='utf-8'))['categorias']
    tk = token()

    creados = reusados = 0
    cache_specs, avisos_todos = {}, []
    for p in fuente:
        cat = categorias.get(p['ruta'])
        if not cat:
            print('   SALTADO %-14s %s (la categoria no existe)' % (p['ref'], p['ruta']))
            continue
        bid = marca_id(tk, p['marca'])
        if not bid:
            print('   SALTADO %-14s marca %r no existe' % (p['ref'], p['marca']))
            continue

        st, existe = call(tk, 'GET', '/api/catalog_system/pvt/products/GetProductAndSkuIds'
                          '?categoryId=%d&_from=0&_to=49' % cat['id'])
        pid = None
        for prod_id in (existe or {}).get('data', {}):
            st2, d = call(tk, 'GET', '/api/catalog/pvt/product/%s' % prod_id)
            if st2 == 200 and d.get('RefId') == p['ref']:
                pid = int(prod_id)
                break
        if pid:
            reusados += 1
            print('   existe  %-14s %s' % (p['ref'], p['nombre'][:52]))
            continue
        if not args.ejecutar:
            todas = dict(p.get('specs') or {})
            todas.update(p.get('compat') or {})
            _, avisos = depurar(todas, specs_de_categoria(tk, cat['id'], cache_specs), p['ref'])
            avisos_todos.extend(avisos)
            creados += 1
            print('   [plan]  %-14s %-52s %s' % (p['ref'], p['nombre'][:52], p['caso'][:26]))
            continue

        st, prod = call(tk, 'POST', '/api/catalog/pvt/product', {
            'Name': p['nombre'], 'CategoryId': cat['id'], 'BrandId': bid,
            'LinkId': slugify(p['nombre']), 'RefId': p['ref'],
            'IsVisible': True, 'IsActive': True, 'Description': p['nombre'],
            'Title': p['nombre'], 'ShowWithoutStock': True})
        if st != 200 or not isinstance(prod, dict):
            sys.exit('ERROR creando %s: %s %s' % (p['ref'], st, prod))
        pid = prod['Id']

        st, sku = call(tk, 'POST', '/api/catalog/pvt/stockkeepingunit', {
            'ProductId': pid, 'IsActive': False, 'Name': p['nombre'][:60],
            'RefId': p['ref'], 'PackagedHeight': 10, 'PackagedLength': 20,
            'PackagedWidth': 15, 'PackagedWeightKg': 1, 'CubicWeight': 1,
            'MeasurementUnit': 'un', 'UnitMultiplier': 1})
        if st != 200 or not isinstance(sku, dict):
            sys.exit('ERROR creando el SKU de %s: %s %s' % (p['ref'], st, sku))
        sid = sku['Id']

        # La imagen va ANTES de activar: VTEX no deja activar un SKU sin ella.
        call(tk, 'POST', '/api/catalog/pvt/stockkeepingunit/%d/file' % sid,
             {'IsMain': True, 'Label': 'principal', 'Name': p['ref'], 'Text': p['nombre'],
              'Url': IMAGEN})
        sku['IsActive'] = True
        call(tk, 'PUT', '/api/catalog/pvt/stockkeepingunit/%d' % sid, sku)

        call(tk, 'PUT', '/api/pricing/prices/%d' % sid,
             {'costPrice': int(p['precio'] * 0.7), 'markup': 42},
             base='https://api.vtex.com/onewstore')
        call(tk, 'PUT', '/api/logistics/pvt/inventory/skus/%d/warehouses/%s' % (sid, ALMACEN),
             {'quantity': p['stock'], 'unlimitedQuantity': False})

        # De a una: la API acepta un lote y responde 200, pero solo aplica la primera.
        todas = dict(p.get('specs') or {})
        todas.update(p.get('compat') or {})
        todas, avisos = depurar(todas, specs_de_categoria(tk, cat['id'], cache_specs), p['ref'])
        avisos_todos.extend(avisos)
        for nombre, valores in todas.items():
            call(tk, 'POST', '/api/catalog_system/pvt/products/%d/specification' % pid,
                 [{'Value': valores, 'Name': nombre}])
            time.sleep(0.15)

        creados += 1
        print('   creado  %-14s id=%-4s %-46s %d specs'
              % (p['ref'], pid, p['nombre'][:46], len(todas)))

    print('\n  %s: %d productos, %d ya existian'
          % ('EJECUTADO' if args.ejecutar else 'PLAN (no se creo nada)', creados, reusados))
    if avisos_todos:
        print('\n  ESPECIFICACIONES DESCARTADAS (el producto quedaria invisible en ese filtro):')
        for a in avisos_todos:
            print('   ', a)


if __name__ == '__main__':
    main()
