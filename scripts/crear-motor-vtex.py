#!/usr/bin/env python3
"""Crea en VTEX la especificacion "Motor" del departamento Carros.

Es la cuarta de la compatibilidad, al lado de Marca vehiculo / Modelo / Año,
y vive en el departamento (id 1) para que se herede a todo el arbol.

    python3 scripts/crear-motor-vtex.py            # plan, no toca nada
    python3 scripts/crear-motor-vtex.py --ejecutar

POR QUE UN VALOR CANONICO Y NO EL ROTULO DE LA TIENDA. En react/data/
motorizaciones.json el motor se llama como lo llama el fabricante — "1.4 TSI",
"2.0 SkyActiv", "1.5 TwinPower Turbo", "2.0 dCi" — porque eso es lo que el
dueño reconoce de su carro. Como valores de un filtro unico eso son 156
valores con el mismo motor repartido en cinco nombres. El filtro usa el valor
canonico (cilindraje + aspiracion + combustible) y el rotulo bonito se queda
en el selector.

EN VTEX ESTO NO SE BORRA. Una especificacion solo se desactiva, y el tipo de
campo es inmutable. Va multi-valor (7) a proposito: un repuesto sirve para
varios motores a la vez.
"""
import argparse, json, os, re, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOTOR = os.path.join(ROOT, 'react', 'data', 'motorizaciones.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'
CARROS = 1
NOMBRE = 'Motor'


def canonico(nombre):
    """Rotulo de la tienda -> valor del filtro. None si no hay cilindraje."""
    t = nombre.lower()
    if 'eléctrico' in t and 'híbrido' not in t:
        return 'Eléctrico'
    d = re.search(r'(\d\.\d{1,2})', t)
    if not d:
        return None
    disp = d.group(1)
    if 'enchufable' in t or 'phev' in t:
        return '%s Híbrido enchufable' % disp
    if 'híbrido' in t or 'hev' in t or 'mhev' in t:
        return '%s Híbrido' % disp
    if any(k in t for k in ('diésel', 'diesel', 'tdi', 'cdi', 'crdi', 'dci', 'd-4d')):
        return '%s Diésel' % disp
    turbo = any(k in t for k in ('turbo', 'tsi', 'tfsi', 'ecoboost', 'kompressor',
                                 'biturbo', 't-gdi'))
    return '%s %s' % (disp, 'Turbo gasolina' if turbo else 'Gasolina')


def valores():
    datos = json.load(open(MOTOR, encoding='utf-8'))['carros']
    vistos, sin = set(), []
    for marca, modelos in datos.items():
        for modelo, ficha in modelos.items():
            for mo in ficha['motores']:
                c = canonico(mo['nombre'])
                if c:
                    vistos.add(c)
                else:
                    sin.append('%s %s · %s' % (marca, modelo, mo['nombre']))
    def clave(v):
        d = re.match(r'(\d\.\d+)', v)
        return (0 if d else 1, float(d.group(1)) if d else 0, v)
    return sorted(vistos, key=clave), sin


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

    vals, sin = valores()
    print('  %d valores canonicos, de %s' % (len(vals), os.path.relpath(MOTOR, ROOT)))
    if sin:
        print('  %d motorizaciones sin cilindraje en el rotulo, quedan fuera:' % len(sin))
        for s in sin[:10]:
            print('     ', s)

    tk = token()
    st, ex = call(tk, 'GET',
                  '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % CARROS)
    if st != 200:
        sys.exit('ERROR leyendo las especificaciones de Carros: %s %s' % (st, ex))
    ya = {f['Name']: f['FieldId'] for f in (ex or [])}
    print('  en el departamento Carros ya hay: %s' % ', '.join(sorted(ya)) or '(ninguna)')

    if not args.ejecutar:
        estado = 'YA EXISTE id=%s' % ya[NOMBRE] if NOMBRE in ya else 'se crearia'
        print('\n   [plan]  %-8s %s · multi-valor · filtrable · %d valores'
              % (NOMBRE, estado, len(vals)))
        print('\n  PLAN (no se creo nada). Corre con --ejecutar para crearla.')
        print('  OJO: en VTEX una especificacion no se borra, solo se desactiva.')
        return

    if NOMBRE in ya:
        fid = ya[NOMBRE]
        print('   existe  %s id=%s' % (NOMBRE, fid))
    else:
        grupo = None
        for f in (ex or []):
            if f.get('FieldGroupName') == 'Compatibilidad':
                grupo = f.get('FieldGroupId')
                break
        if grupo is None:
            st, g = call(tk, 'POST', '/api/catalog/pvt/specificationgroup',
                         {'CategoryId': CARROS, 'Name': 'Compatibilidad', 'Position': 1})
            if st != 200 or not isinstance(g, dict):
                sys.exit('ERROR creando el grupo: %s' % g)
            grupo = g['Id']
            print('   grupo   Compatibilidad id=%s (creado)' % grupo)
        else:
            print('   grupo   Compatibilidad id=%s (ya estaba)' % grupo)
        st, r = call(tk, 'POST', '/api/catalog/pvt/specification', {
            'FieldTypeId': 7, 'CategoryId': CARROS, 'FieldGroupId': grupo,
            'Name': NOMBRE, 'Description': 'Motorizacion del vehiculo', 'Position': 4,
            'IsFilter': True, 'IsRequired': False, 'IsOnProductDetails': True,
            'IsStockKeepingUnit': False, 'IsWizard': False, 'IsActive': True,
            'IsTopMenuLinkActive': False, 'IsSideMenuLinkActive': True})
        if st != 200 or not isinstance(r, dict):
            sys.exit('ERROR creando %s: %s' % (NOMBRE, r))
        fid = r['Id']
        print('   creada  %s id=%s (multi-valor, filtrable)' % (NOMBRE, fid))

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
