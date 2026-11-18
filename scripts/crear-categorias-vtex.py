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
REGISTRO = os.path.join(ROOT, 'catalogo', 'categorias-vtex.json')
BASE = 'https://onewstore.vtexcommercestable.com.br'

TANDAS = {
    1: [('Carros', 'Llantas y rines'), ('Carros', 'Lubricantes y mantenimiento'),
        ('Carros', 'Filtros'), ('Carros', 'Baterías'),
        ('Carros', 'Eléctrico y electrónico'),
        ('Motos', 'Llantas y rines'), ('Motos', 'Lubricantes y mantenimiento'),
        ('Motos', 'Filtros'), ('Motos', 'Baterías')],
    # Tanda 2: el resto del arbol. Se sube despues de validar el flujo del
    # seller sobre la tanda 1, que es chica y ya tiene producto real.
    2: [
        ('Carros', 'Frenos'),
        ('Carros', 'Suspensión y dirección'),
        ('Carros', 'Iluminación'),
        ('Carros', 'Motor y transmisión'),
        ('Carros', 'Accesorios'),
        ('Carros', 'Carrocería y climatización'),
        ('Carros', 'Tecnología y seguridad'),
        ('Motos', 'Motor y transmisión'),
        ('Motos', 'Frenos'),
        ('Motos', 'Cascos'),
        ('Motos', 'Eléctrico y electrónico'),
        ('Motos', 'Iluminación'),
        ('Motos', 'Accesorios'),
        ('Motos', 'Ropa'),
        ('Motos', 'Chasis y carrocería'),
        ('Motos', 'Suspensión y dirección'),
        ('Motos', 'Tecnología y seguridad'),
        ('Herramientas', 'Herramientas manuales'),
        ('Herramientas', 'Herramientas eléctricas y neumáticas'),
        ('Herramientas', 'Equipos de taller'),
        ('Herramientas', 'Diagnóstico y medición'),
        ('Herramientas', 'Cuidado y limpieza'),
        ('Herramientas', 'Consumibles de taller'),
        ('Herramientas', 'Equipos de lavado y pulido')],
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


def leer_registro():
    """Lo que YA creamos, segun el registro local.

    No se usa el arbol de VTEX para esto: tarda minutos en reflejar lo recien
    creado, y una corrida que lea de ahi vuelve a crear todo. Nos costo 88
    categorias duplicadas que no se pueden borrar. El registro se escribe
    despues de CADA categoria, asi que sobrevive a una interrupcion.
    """
    if not os.path.exists(REGISTRO):
        return {}
    return json.load(open(REGISTRO, encoding='utf-8')).get('categorias') or {}


def guardar_registro(reg):
    nota = ('Registro local de lo YA creado en VTEX. El arbol de categorias tarda '
            'minutos en reflejar lo recien creado, y una segunda corrida que lea de '
            'ahi DUPLICA todo (nos paso: 88 categorias muertas). Este archivo es la '
            'fuente para la idempotencia; VTEX solo se usa para verificar.')
    tmp = REGISTRO + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump({'_nota': nota, 'categorias': dict(sorted(reg.items()))}, fh,
                  ensure_ascii=False, indent=2)
    os.replace(tmp, REGISTRO)


def arbol_vtex(tk):
    """{ruta de slugs: id} de lo que hay en VTEX.

    Sirve para VERIFICAR y para adoptar lo que ya existiera, nunca para
    decidir que algo falta: el arbol tarda minutos en reflejar lo recien
    creado y romper la cache no alcanza. Esa decision la toma el registro
    local, que se escribe despues de cada categoria.
    """
    st, tree = call(tk, 'GET', '/api/catalog_system/pub/category/tree/50')
    if st != 200:
        sys.exit('ERROR leyendo el arbol de VTEX: %s' % tree)
    por_ruta = {}

    def walk(nodos, prefijo):
        for n in nodos:
            ruta = '%s/%s' % (prefijo, slugify(n['name']))
            por_ruta[ruta] = n['id']
            walk(n.get('children') or [], ruta)
    walk(tree, '')
    return por_ruta


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
    ap.add_argument('--tanda', type=int, default=1,
                    help='1 = macros ya resueltas, 2 = el resto del arbol')
    ap.add_argument('--ejecutar', action='store_true', help='sin esto solo muestra el plan')
    ap.add_argument('--verificar', action='store_true',
                    help='compara el registro local contra VTEX y busca duplicados')
    args = ap.parse_args()

    tree = json.load(open(ARBOL, encoding='utf-8'))
    registro = leer_registro()

    if args.verificar:
        tk = token()
        en_vtex = arbol_vtex(tk)                      # {ruta: id}
        faltan = {r: v for r, v in registro.items() if r not in en_vtex}
        sobran = {r: i for r, i in en_vtex.items() if r not in registro}
        repes = {}
        for ruta, info in registro.items():
            iguales = [r for r, i in en_vtex.items() if i == info['id']]
            if len(iguales) > 1:
                repes[info['id']] = iguales
        print('  registro local %d · en VTEX %d' % (len(registro), len(en_vtex)))
        print('  en el registro y NO en VTEX: %d %s' % (len(faltan), list(faltan)[:5]))
        print('  en VTEX y NO en el registro: %d %s' % (len(sobran), list(sobran)[:5]))
        print('  ids repetidos: %d' % len(repes))
        return 0 if not (faltan or sobran or repes) else 1

    tk = token(obligatorio=args.ejecutar)
    # El arbol de VTEX solo complementa al registro: puede venir atrasado, asi
    # que nunca decide por si solo que algo "no existe".
    en_vtex = arbol_vtex(tk) if tk else {}
    rutas = {}          # ruta de nombres -> ruta de slugs
    nuevas = reusadas = 0

    for nivel, nombre, keywords, padre_nombres in plan(tree, args.tanda):
        padre_ruta = rutas.get(tuple(padre_nombres), '') if padre_nombres else ''
        if padre_nombres and not padre_ruta:
            print('   SALTADA %-14s %-40s (falta el padre)' % (nivel, nombre))
            continue
        ruta = '%s/%s' % (padre_ruta, slugify(nombre))
        rutas[tuple(padre_nombres + [nombre])] = ruta

        if ruta in registro:
            reusadas += 1
            print('   existe  %-14s %-40s id=%s' % (nivel, nombre, registro[ruta]['id']))
            continue
        if ruta in en_vtex:          # existe pero no estaba registrado: se adopta
            registro[ruta] = {'id': en_vtex[ruta], 'nombre': nombre}
            guardar_registro(registro)
            reusadas += 1
            print('   adoptada %-13s %-40s id=%s' % (nivel, nombre, en_vtex[ruta]))
            continue
        if not args.ejecutar:
            nuevas += 1
            print('   [plan]  %-14s %-40s %s' % (nivel, nombre, ruta))
            continue

        padre_id = registro[padre_ruta]['id'] if padre_ruta else None
        # VTEX limita Keywords a 200 caracteres: se recorta por termino completo.
        kw, largo = [], 0
        for t in keywords:
            if largo + len(t) + 2 > 200:
                break
            kw.append(t)
            largo += len(t) + 2
        st, r = call(tk, 'POST', '/api/catalog/pvt/category',
                     {'Name': nombre, 'FatherCategoryId': padre_id, 'Title': nombre,
                      'Description': nombre, 'Keywords': ', '.join(kw),
                      'IsActive': True, 'ShowInStoreFront': True, 'ShowBrandFilter': True,
                      'ActiveStoreFrontLink': True, 'GlobalCategoryId': 711,
                      'StockKeepingUnitSelectionMode': 'SPECIFICATION', 'Score': None})
        if st != 200 or not isinstance(r, dict):
            guardar_registro(registro)
            print('   ERROR   %-14s %-40s %s %s' % (nivel, nombre, st, r))
            sys.exit('Se detuvo para no dejar el arbol a medias. El registro quedo al dia: '
                     'corrige y vuelve a correr, no duplica.')
        registro[ruta] = {'id': r['Id'], 'nombre': nombre}
        guardar_registro(registro)       # despues de CADA una, no al final
        nuevas += 1
        print('   creada  %-14s %-40s id=%s' % (nivel, nombre, r['Id']))

    print('\n  %s: %d a crear, %d ya existian'
          % ('EJECUTADO' if args.ejecutar else 'PLAN (no se creo nada)', nuevas, reusadas))
    return 0


if __name__ == '__main__':
    sys.exit(main())
