#!/usr/bin/env python3
"""Crea en VTEX la compatibilidad de vehiculo del departamento Motos.

Marca vehiculo / Modelo / Año, multi-valor y filtrables, sobre el departamento
(id 59). Se heredan hacia todo el arbol de motos, asi que basta definirlas una
vez. Los valores salen de la base de vehiculos de Colombia del repo.

    python3 scripts/crear-compatibilidad-motos.py            # plan
    python3 scripts/crear-compatibilidad-motos.py --ejecutar

Son las tres que alimentan el selector en cascada de la tienda (marca ->
modelo -> año): cada campo se habilita al llenar el anterior, y el modelo se
cruza contra la base para ofrecer solo los de esa marca.

Tipo de campo MULTI-VALOR a proposito y es inmutable: un repuesto sirve para
varias motos a la vez.
"""
import argparse, json, os, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_VEH = os.path.join(ROOT, 'react', 'data', 'vehiculos-colombia.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'
MOTOS = 59
ANIOS = [str(y) for y in range(1985, 2027)]


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

    if not os.path.exists(BASE_VEH):
        sys.exit('ERROR: falta %s (vive en la rama feat/selector-vehiculo)'
                 % os.path.relpath(BASE_VEH, ROOT))
    motos = json.load(open(BASE_VEH, encoding='utf-8'))['motos']
    valores = {'Marca vehículo': sorted(motos),
               'Modelo': sorted({m for v in motos.values() for m in v}),
               'Año': ANIOS}

    tk = token()
    st, ex = call(tk, 'GET',
                  '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % MOTOS)
    ya = {f['Name']: f['FieldId'] for f in (ex or [])} if st == 200 else {}

    if not args.ejecutar:
        for nombre, vals in valores.items():
            estado = 'existe id=%s' % ya[nombre] if nombre in ya else 'se crearia'
            print('   [plan]  %-16s %-14s %4d valores' % (nombre, estado, len(vals)))
        print('\n  PLAN (no se creo nada)')
        return

    grupo = None
    for pos, (nombre, vals) in enumerate(valores.items(), 1):
        if nombre in ya:
            fid = ya[nombre]
            print('   existe  %-16s id=%s' % (nombre, fid))
        else:
            if grupo is None:
                st, g = call(tk, 'POST', '/api/catalog/pvt/specificationgroup',
                             {'CategoryId': MOTOS, 'Name': 'Compatibilidad', 'Position': 1})
                if st != 200 or not isinstance(g, dict):
                    sys.exit('ERROR creando el grupo: %s' % g)
                grupo = g['Id']
            st, r = call(tk, 'POST', '/api/catalog/pvt/specification', {
                'FieldTypeId': 7, 'CategoryId': MOTOS, 'FieldGroupId': grupo,
                'Name': nombre, 'Description': nombre, 'Position': pos,
                'IsFilter': True, 'IsRequired': False, 'IsOnProductDetails': True,
                'IsStockKeepingUnit': False, 'IsWizard': False, 'IsActive': True,
                'IsTopMenuLinkActive': False, 'IsSideMenuLinkActive': True})
            if st != 200 or not isinstance(r, dict):
                sys.exit('ERROR creando %s: %s' % (nombre, r))
            fid = r['Id']
            print('   creada  %-16s id=%s (multi-valor)' % (nombre, fid))
        st, vs = call(tk, 'GET', '/api/catalog_system/pub/specification/fieldvalue/%d' % fid)
        tiene = {v['Value'] for v in (vs or [])} if st == 200 else set()
        faltan = [v for v in vals if v not in tiene]

        def crear(iv):
            i, v = iv
            return v, call(tk, 'POST', '/api/catalog/pvt/specificationvalue',
                           {'FieldId': fid, 'Name': v, 'Text': v,
                            'Position': i, 'IsActive': True})[0]
        res = list(ThreadPoolExecutor(6).map(crear, enumerate(faltan, 1)))
        err = [x for x in res if x[1] != 200]
        print('      ya=%d creados=%d errores=%d'
              % (len(tiene), sum(1 for _, s in res if s == 200), len(err)))
        for e in err[:5]:
            print('      ERROR', e)


if __name__ == '__main__':
    main()
