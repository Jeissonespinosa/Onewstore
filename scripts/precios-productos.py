#!/usr/bin/env python3
"""Pone precio e inventario a los productos de catalogo/productos-prueba.json.

Existe porque crear-productos-prueba.py mandaba el precio a api.vtex.com, que
no acepta la cookie de sesion, y no miraba el resultado: los 45 productos
quedaron creados y sin precio. Sin precio VTEX no ofrece el SKU, asi que el
buscador los mostraba en $0 y agotados aunque el inventario si estuviera.

El precio no es irreversible: se puede volver a escribir cuando se quiera. Aun
asi corre en seco por defecto y solo toca lo que esta mal.

    python3 scripts/precios-productos.py              # que haria
    python3 scripts/precios-productos.py --ejecutar   # lo hace
"""
import argparse, json, os, subprocess, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://onewstore.vtexcommercestable.com.br'
ALMACEN = '1_1'
MARKUP = 42


def token():
    out = subprocess.run(['vtex', 'local', 'token'], capture_output=True, text=True).stdout
    for l in out.split('\n'):
        l = l.strip()
        if len(l) > 100 and ' ' not in l and l.isascii():
            return l
    sys.exit('ERROR: no hay sesion de VTEX. Corre: vtex login onewstore')


def call(tk, method, path, body=None):
    url = BASE + path
    if method == 'GET':
        url += ('&' if '?' in url else '?') + '_=%d' % time.time_ns()
    req = urllib.request.Request(
        url, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'VtexIdclientAutCookie': tk, 'Content-Type': 'application/json',
                 'Accept': 'application/json', 'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]
    except Exception as e:
        return 0, str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ejecutar', action='store_true')
    args = ap.parse_args()
    tk = token()

    ps = json.load(open(os.path.join(ROOT, 'catalogo', 'productos-prueba.json'), encoding='utf-8'))
    ps = ps if isinstance(ps, list) else ps.get('productos', ps)

    faltan_precio, faltan_stock, sin_sku, ya = [], [], [], 0
    for p in ps:
        st, sku = call(tk, 'GET', '/api/catalog/pvt/stockkeepingunit?refId=%s' % p['ref'])
        if st != 200 or not isinstance(sku, dict) or not sku.get('Id'):
            sin_sku.append(p['ref'])
            continue
        sid = sku['Id']

        st, pr = call(tk, 'GET', '/api/pricing/prices/%d' % sid)
        base = (pr or {}).get('basePrice') if st == 200 and isinstance(pr, dict) else None
        # Una diferencia de centavos no es un precio mal puesto.
        if not base or abs(base - p['precio']) > 1:
            faltan_precio.append((p, sid, base))

        st, inv = call(tk, 'GET', '/api/logistics/pvt/inventory/skus/%d' % sid)
        cant = 0
        for b in (inv or {}).get('balance', []) if isinstance(inv, dict) else []:
            if b.get('warehouseId') == ALMACEN:
                cant = b.get('totalQuantity', 0)
        if cant != p['stock']:
            faltan_stock.append((p, sid, cant))
        if (base and abs(base - p['precio']) <= 1) and cant == p['stock']:
            ya += 1

    print('revisados %d · ya correctos %d' % (len(ps), ya))
    print('\nPRECIO por poner: %d' % len(faltan_precio))
    for p, sid, base in faltan_precio:
        print('   %-12s sku %-4s %-40s %s -> %s' % (p['ref'], sid, p['nombre'][:40], base or 'sin precio', p['precio']))
    print('\nINVENTARIO por poner: %d' % len(faltan_stock))
    for p, sid, cant in faltan_stock:
        print('   %-12s sku %-4s %-40s %s -> %s' % (p['ref'], sid, p['nombre'][:40], cant, p['stock']))
    if sin_sku:
        print('\nSIN SKU EN VTEX: %s' % ', '.join(sin_sku))

    if not args.ejecutar:
        print('\n--ejecutar para aplicarlo. Nada se escribio.')
        return

    errores = 0
    for p, sid, _ in faltan_precio:
        st, r = call(tk, 'PUT', '/api/pricing/prices/%d' % sid,
                     {'costPrice': round(p['precio'] / (1 + MARKUP / 100)), 'markup': MARKUP})
        if st not in (200, 204):
            print('   ERROR precio %s: %s %s' % (p['ref'], st, r)); errores += 1
        time.sleep(0.12)
    for p, sid, _ in faltan_stock:
        st, r = call(tk, 'PUT', '/api/logistics/pvt/inventory/skus/%d/warehouses/%s' % (sid, ALMACEN),
                     {'quantity': p['stock'], 'unlimitedQuantity': False})
        if st not in (200, 204):
            print('   ERROR inventario %s: %s %s' % (p['ref'], st, r)); errores += 1
        time.sleep(0.12)

    print('\nEJECUTADO: %d precios, %d inventarios, %d errores'
          % (len(faltan_precio), len(faltan_stock), errores))
    print('El precio tarda unos segundos en verse en el buscador: la primera')
    print('lectura despues de escribir suele venir del cache.')


if __name__ == '__main__':
    main()
