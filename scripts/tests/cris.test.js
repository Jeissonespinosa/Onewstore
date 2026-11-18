/*
 * Cris — interpretacion de la frase.
 *
 * Corre sin jest ni navegador: extrae las funciones puras de react/Cris.js y
 * las evalua contra el indice y la base reales.
 *
 *   node scripts/tests/cris.test.js
 */
const fs = require('fs')
const src = fs.readFileSync('react/Cris.js', 'utf8')
const indice = JSON.parse(fs.readFileSync('react/cris-index.json', 'utf8'))
const vehiculos = JSON.parse(fs.readFileSync('react/data/vehiculos-colombia.json', 'utf8'))

const corte = src.slice(src.indexOf('const norm ='), src.indexOf('export default'))
const codigo = corte.split('\n').filter(l => !l.startsWith('import')).join('\n')
eval(codigo + '\nglobal.norm=norm; global.toks=toks; global.seccionDe=seccionDe;' +
     'global.construirIndice=construirIndice; global.buscarCategoria=buscarCategoria;' +
     'global.medidaLlanta=medidaLlanta;')

let fallos = 0
function prueba(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${nombre}`)
  if (!ok) console.log(`        esperado: ${JSON.stringify(esperado)}\n        real:     ${JSON.stringify(real)}`)
}

const idxCarros = construirIndice('carros')
const idxMotos = construirIndice('motos')
const idxHerr = construirIndice('herramientas')
const cat = (idx, frase) => {
  const r = buscarCategoria(idx, toks(frase))
  return r ? r.nodo.nombre : null
}

console.log('=== seccion segun la ruta ===')
prueba('/carros/frenos         -> carros', seccionDe('/carros/frenos'), 'carros')
prueba('/motos/llantas-y-rines -> motos', seccionDe('/motos/llantas-y-rines'), 'motos')
prueba('/herramientas          -> herramientas', seccionDe('/herramientas'), 'herramientas')

console.log('\n=== una sola palabra encuentra la categoria ===')
prueba('pastillas  -> Pastillas de freno', cat(idxCarros, 'pastillas'), 'Pastillas de freno')
prueba('bujias     -> Bujias de encendido', cat(idxCarros, 'bujias'), 'Bujías de encendido')

console.log('\n=== herramientas: SOLO herramientas ===')
const seccionesHerr = new Set(idxHerr.map(e => e.nodo.seccion))
prueba('el indice no trae carros ni motos', [...seccionesHerr], ['Herramientas'])
prueba('"hidrolavadora" no cae en Xenon (HID)', cat(idxHerr, 'hidrolavadora'), 'Hidrolavadoras')

console.log('\n=== carros y motos traen herramientas ===')
prueba('carros incluye Herramientas', new Set(idxCarros.map(e => e.nodo.seccion)).has('Herramientas'), true)
prueba('carros NO incluye Motos', new Set(idxCarros.map(e => e.nodo.seccion)).has('Motos'), false)
prueba('motos NO incluye Carros', new Set(idxMotos.map(e => e.nodo.seccion)).has('Carros'), false)

console.log('\n=== medida de llanta ===')
const m = medidaLlanta('205/55 R16')
prueba('205/55 R16', [m.ancho, m.perfil, m.rin], ['205', '55', '16'])
prueba('185/65R15 sin espacios', (x => [x.ancho, x.perfil, x.rin])(medidaLlanta('185/65R15')), ['185', '65', '15'])
prueba('"bujias" no es una medida', medidaLlanta('bujias'), null)

console.log('\n=== el modelo pertenece a la marca ===')
prueba('Toyota tiene Hilux', 'Hilux' in vehiculos.carros.Toyota, true)
prueba('Toyota NO tiene D-Max', 'D-Max' in vehiculos.carros.Toyota, false)
prueba('motos: Bajaj tiene Boxer', Object.keys(vehiculos.motos.Bajaj).some(x => /Boxer/.test(x)), true)

console.log('\n=== el indice cubre el catalogo ===')
prueba('nodos indexados', indice.nodos.length > 500, true)
prueba('entradas de carros', idxCarros.length > 1000, true)

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
