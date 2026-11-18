#!/usr/bin/env python3
"""Crea en VTEX las marcas de producto de catalogo/marcas-colombia.json.

    python3 scripts/crear-marcas-vtex.py            # plan
    python3 scripts/crear-marcas-vtex.py --ejecutar

Son las marcas del FABRICANTE del repuesto (Bosch, Mobil, Michelin), no las
del vehiculo: esas viven en la especificacion "Marca vehiculo".

Una marca sin productos no aparece en ningun filtro, asi que crearlas de mas
no molesta; lo que si molesta es que el seller no encuentre la suya al
publicar. Una marca tampoco se puede borrar en VTEX, solo desactivar, por eso
--dry-run es el modo por defecto y la lectura rompe cache (sin eso una
segunda corrida las duplica).
"""
import argparse, json, os, subprocess, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(ROOT, 'catalogo', 'marcas-colombia.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'


def norm(s):
    s = unicodedata.normalize('NFD', str(s))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().strip()


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


def call(tk, method, path, body=None):
    if method == 'GET':
        path += ('&' if '?' in path else '?') + '_=%d' % int(time.time() * 1000)
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
        return e.code, e.read().decode()[:250]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ejecutar', action='store_true')
    args = ap.parse_args()

    fuente = json.load(open(FUENTE, encoding='utf-8'))
    quiero = []
    for grupo, marcas in fuente.items():
        if grupo.startswith('_'):
            continue
        for m in marcas:
            if norm(m) not in {norm(x) for x in quiero}:
                quiero.append(m)

    tk = token()
    st, hay = call(tk, 'GET', '/api/catalog_system/pvt/brand/list')
    if st != 200:
        sys.exit('ERROR leyendo las marcas: %s' % hay)
    tengo = {norm(b['name']) for b in hay}
    faltan = [m for m in quiero if norm(m) not in tengo]

    print('  en el archivo %d · ya en VTEX %d · faltan %d' % (len(quiero), len(tengo), len(faltan)))
    if not args.ejecutar:
        for m in faltan:
            print('   [plan]  %s' % m)
        print('\n  PLAN (no se creo nada)')
        return

    creadas = 0
    for m in faltan:
        st, r = call(tk, 'POST', '/api/catalog/pvt/brand',
                     {'Name': m, 'Title': m, 'MetaTagDescription': m,
                      'Active': True, 'Visible': True, 'Score': None})
        if st != 200:
            print('   ERROR  %-22s %s %s' % (m, st, r))
            continue
        creadas += 1
        print('   creada  %s' % m)
        time.sleep(0.15)
    print('\n  EJECUTADO: %d marcas creadas' % creadas)


if __name__ == '__main__':
    main()
