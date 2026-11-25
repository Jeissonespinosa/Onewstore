#!/usr/bin/env python3
"""Desactiva valores de una especificacion que quedaron huerfanos.

En VTEX un valor de especificacion NO se borra: solo se desactiva, y asi
deja de aparecer en los filtros y en el Admin al etiquetar. Esto es para los
que quedan sin uso cuando se corrige la base, como "Mini Cooper" y "Mini
Countryman" bajo Modelo: MINI es marca aparte y sus carros viven ahi.

    python3 scripts/desactivar-valores-vtex.py            # plan
    python3 scripts/desactivar-valores-vtex.py --ejecutar

Antes de desactivar revisa que NINGUN producto lo este usando: un valor
desactivado que todavia etiqueta algo deja ese producto fuera del filtro.
"""
import argparse, json, subprocess, sys, time, urllib.request

BASE = 'https://onewstore.vtexcommercestable.com.br'
CARROS = 1
CAMPO = 'Modelo'
HUERFANOS = ['Mini Cooper', 'Mini Countryman']


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
    tk = token()

    st, campos = call(tk, 'GET',
                      '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % CARROS)
    if st != 200:
        sys.exit('ERROR leyendo las especificaciones: %s %s' % (st, campos))
    fid = next((f['FieldId'] for f in campos if f['Name'] == CAMPO), None)
    if not fid:
        sys.exit('ERROR: no existe la especificacion "%s" en Carros' % CAMPO)

    st, vals = call(tk, 'GET', '/api/catalog_system/pub/specification/fieldvalue/%d' % fid)
    porNombre = {v['Value']: v for v in (vals or [])}
    print('  %s: %d valores en VTEX' % (CAMPO, len(porNombre)))

    objetivo = []
    for nombre in HUERFANOS:
        v = porNombre.get(nombre)
        if not v:
            print('   no esta  %-18s (ya no existe)' % nombre)
            continue
        objetivo.append(v)
        print('   %-8s %-18s id=%s' % ('se apaga' if args.ejecutar else '[plan]',
                                       nombre, v['FieldValueId']))

    if not args.ejecutar:
        print('\n  PLAN (no se cambio nada). Corre con --ejecutar para desactivarlos.')
        print('  Se puede volver a activar: desactivar NO borra.')
        return

    for v in objetivo:
        vid = v['FieldValueId']
        st, actual = call(tk, 'GET', '/api/catalog/pvt/specificationvalue/%d' % vid)
        if st != 200 or not isinstance(actual, dict):
            print('   ERROR leyendo %s: %s %s' % (v['Value'], st, actual))
            continue
        actual['IsActive'] = False
        st, r = call(tk, 'PUT', '/api/catalog/pvt/specificationvalue/%d' % vid, actual)
        print('   %-18s %s' % (v['Value'], 'desactivado' if st in (200, 204)
                               else 'ERROR %s %s' % (st, r)))


if __name__ == '__main__':
    main()
