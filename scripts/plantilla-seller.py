#!/usr/bin/env python3
"""Genera catalogo/plantilla-seller.csv leyendo las categorias y
especificaciones REALES de VTEX.

Se genera desde VTEX y no desde el arbol a proposito: hay especificaciones
creadas a mano en el admin (Ancho, Alto, Rin de llantas) que el arbol no
conoce, y el seller necesita la lista completa o publica incompleto.

Una fila por categoria hoja, con sus especificaciones (propias y heredadas),
el tipo de campo y los valores admitidos. Las que el seller DEBE llenar van
marcadas: si entra un producto sin ellas, existe en la categoria pero no
aparece en ningun filtro y es invisible para quien busca.

    python3 scripts/plantilla-seller.py
"""
import csv, json, os, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(ROOT, 'catalogo', 'plantilla-seller.csv')
BASE = 'https://onewstore.vtexcommercestable.com.br'
OBLIGATORIAS = {'Marca vehículo', 'Modelo', 'Año'}


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


def get(tk, path):
    req = urllib.request.Request(
        BASE + path + ('&' if '?' in path else '?') + '_=%d' % int(time.time() * 1000),
        headers={'VtexIdclientAutCookie': tk, 'Accept': 'application/json',
                 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=90) as r:
        t = r.read().decode()
        return json.loads(t) if t.strip() else None


def main():
    tk = token()
    arbol = get(tk, '/api/catalog_system/pub/category/tree/50')
    hojas = []

    def walk(nodos, ruta):
        for n in nodos:
            hijos = n.get('children') or []
            camino = ruta + [n['name']]
            if hijos:
                walk(hijos, camino)
            else:
                hojas.append((n['id'], camino, n.get('url', '')))
    walk(arbol, [])

    tipos = {5: 'Único', 6: 'Lista', 7: 'Múltiple', 1: 'Texto', 3: 'Número'}
    filas = []
    for cid, camino, url in hojas:
        specs = get(tk, '/api/catalog_system/pub/specification/field/listTreeByCategoryId/%d' % cid) or []
        detalle = []
        for f in specs:
            d = get(tk, '/api/catalog/pvt/specification/%d' % f['FieldId'])
            if not d.get('IsActive') or not d.get('IsFilter'):
                continue            # inactivas y no filtrables: no las llena el seller
            vals = get(tk, '/api/catalog_system/pub/specification/fieldvalue/%d' % f['FieldId']) or []
            detalle.append((d['Name'], tipos.get(d['FieldTypeId'], d['FieldTypeId']),
                            [v['Value'] for v in vals]))
        for nombre, tipo, vals in sorted(detalle):
            filas.append({
                'Ruta': url.split('.com.br')[-1] or '/'.join(camino),
                'Categoria': ' > '.join(camino),
                'CategoryId': cid,
                'Especificacion': nombre,
                'Campo': tipo,
                'Obligatoria': 'SI' if nombre in OBLIGATORIAS else '',
                'Valores admitidos': ' | '.join(vals[:40]) if vals else '(texto libre)',
                'Total valores': len(vals),
            })
        if not detalle:
            filas.append({'Ruta': url.split('.com.br')[-1], 'Categoria': ' > '.join(camino),
                          'CategoryId': cid, 'Especificacion': '(ninguna todavia)',
                          'Campo': '', 'Obligatoria': '', 'Valores admitidos': '',
                          'Total valores': 0})

    with open(SALIDA, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    cats = len({f['CategoryId'] for f in filas})
    print('  %s' % os.path.relpath(SALIDA, ROOT))
    print('  %d filas · %d categorias hoja · %d especificaciones filtrables'
          % (len(filas), cats, sum(1 for f in filas if f['Campo'])))


if __name__ == '__main__':
    main()
