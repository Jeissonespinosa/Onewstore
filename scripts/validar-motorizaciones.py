#!/usr/bin/env python3
"""Revisa que las motorizaciones calcen con la base de vehiculos.

Tres formas de que esto quede mal en silencio, y las tres se revisan:

  1. Un modelo con motores que NO existe en la base, o escrito distinto.
     El dato queda muerto: el selector nunca lo encuentra.
  2. Un modelo rankeado SIN motores. Ese es el que "se escapa": el cliente
     con un Picanto no puede decir si es 1.0 o 1.25 y recibe la pieza
     equivocada.
  3. Un motor con años fuera del rango del modelo. Ofreceriamos un motor
     que ese año no existio.
  4. Dos motores que ese año se ven IGUAL en pantalla. Si el Picanto 2011
     muestra dos opciones con el mismo rotulo, el cliente escoge a la suerte
     y la pieza llega mala igual que si no hubieramos preguntado.

Sale con codigo 1 si algo esta mal, para que el CI lo atrape.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

motor = json.load(open(os.path.join(ROOT, 'react', 'data', 'motorizaciones.json'), encoding='utf-8'))
base = json.load(open(os.path.join(ROOT, 'react', 'data', 'vehiculos-colombia.json'), encoding='utf-8'))
fuente = open(os.path.join(ROOT, 'react', 'vehiculo.js'), encoding='utf-8').read()

# modelos rankeados de carro (las motos no llevan motor: va en el nombre)
bloque = re.search(r'RANK_MODELOS = \{(.*?)\n\}', fuente, re.S).group(1)
rank = {}
for marca, lista in re.findall(r"  ([A-Za-zÀ-ÿ-]+): \[(.*?)\],\n", bloque):
    rank[marca] = [x.strip().strip("'") for x in lista.split(',')]
rank_carros = {k: v for k, v in rank.items() if k in base['carros']}

fallas = []

# 1. cada modelo con motores existe en la base, igual escrito
for marca, modelos in motor['carros'].items():
    if marca not in base['carros']:
        fallas.append('marca "%s" no esta en la base de vehiculos' % marca)
        continue
    for modelo in modelos:
        if modelo not in base['carros'][marca]:
            cerca = [x for x in base['carros'][marca] if x.lower().startswith(modelo.lower()[:4])]
            fallas.append('%s "%s" no esta en la base%s'
                          % (marca, modelo, (' (¿sera "%s"?)' % cerca[0]) if cerca else ''))

# 2. ningun modelo rankeado se queda sin motores
sin = []
for marca, modelos in rank_carros.items():
    for modelo in modelos:
        if modelo not in motor['carros'].get(marca, {}):
            sin.append('%s %s' % (marca, modelo))

# 3. los años del motor caben en los del modelo
for marca, modelos in motor['carros'].items():
    for modelo, info in modelos.items():
        rango = base['carros'].get(marca, {}).get(modelo)
        if not rango:
            continue
        for mo in info['motores']:
            d, h = mo.get('desde'), mo.get('hasta')
            if d and d < rango[0]:
                fallas.append('%s %s · motor %s arranca en %d pero el modelo en %d'
                              % (marca, modelo, mo['id'], d, rango[0]))
            if h and h > rango[1]:
                fallas.append('%s %s · motor %s llega a %d pero el modelo hasta %d'
                              % (marca, modelo, mo['id'], h, rango[1]))
        ids = [mo['id'] for mo in info['motores']]
        if len(ids) != len(set(ids)):
            fallas.append('%s %s tiene ids de motor repetidos' % (marca, modelo))

# 4. año por año, lo que se ve en pantalla distingue un motor de otro
def visible(mo):
    return (mo['nombre'] + ' · ' + mo.get('nota', '')).strip()

for marca, modelos in motor['carros'].items():
    for modelo, info in modelos.items():
        rango = base['carros'].get(marca, {}).get(modelo) or [1990, 2027]
        for ano in range(rango[0], rango[1] + 1):
            ofrece = [mo for mo in info['motores']
                      if not (mo.get('desde') and ano < mo['desde'])
                      and not (mo.get('hasta') and ano > mo['hasta'])]
            rotulos = [visible(mo) for mo in ofrece]
            repes = {r for r in rotulos if rotulos.count(r) > 1}
            if repes:
                fallas.append('%s %s %d ofrece dos motores con el mismo rotulo: %s'
                              % (marca, modelo, ano, ', '.join(sorted(repes))))
                break

n_mod = sum(len(v) for v in motor['carros'].values())
n_mot = sum(len(i['motores']) for v in motor['carros'].values() for i in v.values())
por_confirmar = [(ma, mo) for ma, v in motor['carros'].items()
                 for mo, i in v.items() if i['fuente'] != 'verificado']
un_motor = [(ma, mo) for ma, v in motor['carros'].items()
            for mo, i in v.items() if len(i['motores']) == 1]

print('%d modelos · %d motorizaciones' % (n_mod, n_mot))
print('  %d no preguntan nada (un solo motor)' % len(un_motor))
print('  %d por confirmar contra catalogo de distribuidor' % len(por_confirmar))

# Aviso, no error: modelos que abarcan varias generaciones y cuyos motores
# no tienen ventana de año. Ahi es donde mas facil se cuela la pieza mala.
anchos = []
for marca, modelos in motor['carros'].items():
    for modelo, info in modelos.items():
        rango = base['carros'].get(marca, {}).get(modelo)
        if not rango:
            continue
        con_ano = [mo for mo in info['motores'] if mo.get('desde') or mo.get('hasta')]
        if rango[1] - rango[0] >= 8 and not con_ano:
            anchos.append('%s %s (%d-%d, %d motor%s sin año)'
                          % (marca, modelo, rango[0], rango[1], len(info['motores']),
                             'es' if len(info['motores']) != 1 else ''))
if anchos:
    print('  %d sin ventana de año abarcando 8 años o mas' % len(anchos))

if sin:
    print('\nMODELOS RANKEADOS SIN MOTORIZACION (%d) — se escapan:' % len(sin))
    for s in sin:
        print('   ', s)
if fallas:
    print('\nERRORES (%d):' % len(fallas))
    for f in fallas:
        print('   ', f)

if sin or fallas:
    sys.exit(1)
print('\nTodo calza.')
