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
     'global.medidaLlanta=medidaLlanta; global.vehiculoAplica=vehiculoAplica;' +
     'global.modelosQueCalzan=modelosQueCalzan;')

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
prueba('moto 90/90-18', (x => [x.ancho, x.perfil, x.rin])(medidaLlanta('90/90-18')), ['90', '90', '18'])
prueba('moto 110/90 17', (x => [x.ancho, x.perfil, x.rin])(medidaLlanta('110/90 17')), ['110', '90', '17'])
prueba('camion 1100-20 R22.5', medidaLlanta('225/75 R22.5').rin, '22.5')
prueba('medida completa para el facet de moto', medidaLlanta('90/90-18').completa, '90/90-18')
prueba('una fecha no es medida (10/05/20)', medidaLlanta('10/05/20'), null)
prueba('rin imposible no es medida (205/55 R40)', medidaLlanta('205/55 R40'), null)

console.log('\n=== cuando el vehiculo se aplica como filtro ===')
// La regla que causaba que "llantas toyota corolla" trajera la llanta del Hilux.
prueba('estricta, vehiculo guardado  -> si', vehiculoAplica('estricta', false, false), true)
prueba('estricta, vehiculo escrito   -> si', vehiculoAplica('estricta', true, false), true)
prueba('ajuste, vehiculo guardado    -> no', vehiculoAplica('ajuste', false, false), false)
prueba('ajuste, vehiculo escrito     -> si', vehiculoAplica('ajuste', true, false), true)
prueba('universal, aunque lo escriba -> no', vehiculoAplica('universal', true, false), false)
prueba('con medida de llanta         -> no', vehiculoAplica('estricta', true, true), false)

console.log('\n=== el modelo pertenece a la marca ===')
prueba('Toyota tiene Hilux', 'Hilux' in vehiculos.carros.Toyota, true)
prueba('Toyota NO tiene D-Max', 'D-Max' in vehiculos.carros.Toyota, false)
prueba('motos: Bajaj tiene Boxer', Object.keys(vehiculos.motos.Bajaj).some(x => /Boxer/.test(x)), true)

console.log('\n=== el indice cubre el catalogo ===')
prueba('nodos indexados', indice.nodos.length > 500, true)
prueba('entradas de carros', idxCarros.length > 1000, true)

console.log('\n=== cuanto manda el vehiculo en cada categoria ===')
const nivelDe = ruta => (indice.nodos.find(n => n.path === ruta) || {}).compatibilidad
prueba('pastillas de freno -> estricta', nivelDe('/carros/frenos/pastillas-de-freno'), 'estricta')
prueba('aceite de motor    -> ajuste', nivelDe('/carros/lubricantes-y-mantenimiento/aceite-de-motor'), 'ajuste')
prueba('aceite 4T de moto  -> ajuste', nivelDe('/motos/lubricantes-y-mantenimiento/aceite-de-motor-4t'), 'ajuste')
prueba('liquido de frenos  -> ajuste', nivelDe('/carros/lubricantes-y-mantenimiento/liquido-de-frenos'), 'ajuste')
prueba('parlantes          -> ajuste', nivelDe('/carros/accesorios/audio/parlantes'), 'ajuste')
prueba('kits de instalacion-> estricta', nivelDe('/carros/accesorios/audio/kits-de-instalacion'), 'estricta')
prueba('portaequipajes     -> ajuste', nivelDe('/carros/accesorios/accesorios-exteriores/portaequipajes'), 'ajuste')
prueba('estribos           -> estricta', nivelDe('/carros/accesorios/accesorios-exteriores/estribos'), 'estricta')
prueba('cascos             -> universal', nivelDe('/motos/cascos/cascos-integrales'), 'universal')
prueba('herramientas       -> universal', nivelDe('/herramientas/herramientas-manuales/llaves-y-copas'), 'universal')
prueba('TPMS               -> estricta', nivelDe('/carros/tecnologia-y-seguridad/tecnologia-y-conectividad/sensores-de-presion-de-llantas-tpms'), 'estricta')
prueba('alarmas            -> universal', nivelDe('/carros/tecnologia-y-seguridad/seguridad/alarmas'), 'universal')

console.log('\n=== buscar con un vehiculo no es guardarlo ===')
// Escribir "llantas para toyota corolla" filtra por ese carro en esa busqueda,
// pero NO cambia el vehiculo guardado: puede ser el carro de un cliente.
// Guardar es deliberado y pasa por marca -> modelo -> año.
const cuerpo = (nombre) => {
  const i = src.indexOf('const ' + nombre + ' =')
  if (i < 0) return null
  // hasta la siguiente declaracion del mismo nivel de indentacion
  const resto = src.slice(i)
  const fin = resto.slice(1).search(/\n  const [a-zA-Z]/)
  return fin < 0 ? resto : resto.slice(0, fin + 1)
}
const enviar = cuerpo('enviar')
prueba('se encontro enviar()', enviar !== null, true)
prueba('enviar() no guarda el vehiculo', /\bguardar\(/.test(enviar || 'guardar('), false)
const elegirPaso = cuerpo('elegirPaso')
prueba('elegirPaso() si guarda (es deliberado)', /\bguardar\(/.test(elegirPaso || ''), true)

console.log('\n=== el modelo sin la marca ===')
/* "frenos corolla", no "frenos toyota corolla": asi escribe la gente.
   modeloCoincide vive en vehiculo.js y es el mismo comparador que usa el
   panel del header, por eso entiende apodos y nombres sin guion. */
const vehSrc = fs.readFileSync('react/vehiculo.js', 'utf8')
eval(vehSrc.split('\n').filter(l => !l.startsWith('import')).join('\n')
  .replace(/^export (const|function|default) /gm, '$1 ')
  .replace(/^export /gm, '') + '\nglobal.modeloCoincide = modeloCoincide;')

const vocabDe = sec => {
  const v = new Set()
  construirIndice(sec === 'motos' ? 'motos' : 'carros').forEach(e =>
    e.palabras.forEach(w => v.add(w)))
  return v
}
const vocab = { carros: vocabDe('carros'), motos: vocabDe('motos') }
const calza = (sec, frase) => modelosQueCalzan(
  vehiculos[sec], toks(frase), vocab[sec],
  (m, mo, pal) => modeloCoincide(sec, m, mo, pal)
)
const marcasDe = (sec, frase) => calza(sec, frase).map(c => c.marca + ' ' + c.modelo)

prueba('"frenos corolla" lee el Corolla primero',
  marcasDe('carros', 'frenos corolla')[0], 'Toyota Corolla')
prueba('y ofrece tambien el Corolla Cross, que es otro carro',
  marcasDe('carros', 'frenos corolla').indexOf('Toyota Corolla Cross') > 0, true)
prueba('"pastillas morning" lee el Picanto por el apodo',
  marcasDe('carros', 'pastillas morning'), ['Kia Picanto'])
prueba('"amortiguadores cx5" encuentra el CX-5 sin guion',
  marcasDe('carros', 'amortiguadores cx5')[0], 'Mazda CX-5')

/* Lo importante: cuando el nombre es de varias marcas NO se adivina. */
prueba('"frenos swift" ofrece Chevrolet y Suzuki',
  Array.from(new Set(calza('carros', 'frenos swift').map(c => c.marca))).sort(),
  ['Chevrolet', 'Suzuki'])
/* Este es el que estaba mal con la regla vieja: la Nissan se llama
   "Frontier NP300" y pedia esas dos palabras, asi que "frontier" solo
   encontraba la Kia y el cliente de la Nissan ni se enteraba. */
prueba('"frenos frontier" ofrece la Nissan tambien',
  calza('carros', 'frenos frontier').some(c => c.marca === 'Nissan'), true)

prueba('"pastillas ns160" lee la Pulsar 160 NS',
  marcasDe('motos', 'pastillas ns160'), ['Bajaj Pulsar 160 NS'])
prueba('una categoria sola no lee ningun carro', calza('carros', 'frenos'), [])
prueba('una frase vacia tampoco', calza('carros', ''), [])

console.log('\n=== lo que un electrico NO lleva ===')
const nodo = ruta => indice.nodos.find(n => n.path === ruta)
const soloComb = ruta => { const n = nodo(ruta); return n ? !!n.soloCombustion : 'NO EXISTE' }
/* Lo que no existe en un 100% electrico */
;[
  '/carros/filtros/filtros-de-aceite',
  '/carros/filtros/filtros-de-combustible',
  '/carros/lubricantes-y-mantenimiento/aceite-de-motor',
  '/carros/electrico-y-electronico/encendido/bujias-de-encendido',
  '/carros/electrico-y-electronico/arranque-y-carga/alternadores',
  '/carros/motor-y-transmision/reparticion-distribucion/correas-de-reparticion',
  '/carros/motor-y-transmision/combustible-e-inyeccion/inyectores',
  '/carros/motor-y-transmision/admision-y-escape/mofles-silenciadores',
  '/carros/motor-y-transmision/clutch-embrague',
].forEach(r => prueba('no aplica: ' + r.split('/').pop(), soloComb(r), true))

/* Lo que SI lleva: equivocarse hacia este lado le esconde al cliente algo
   que su carro si necesita, que es el error caro. */
;[
  '/carros/filtros/filtros-de-cabina',
  '/carros/baterias',
  '/carros/frenos',
  '/carros/llantas-y-rines',
  '/carros/suspension-y-direccion',
  '/carros/motor-y-transmision/refrigeracion/mangueras-de-refrigeracion',
  '/carros/iluminacion',
].forEach(r => prueba('si aplica: ' + r.split('/').pop(), soloComb(r), false))

prueba('la marca hereda hacia abajo',
  soloComb('/carros/motor-y-transmision/combustible-e-inyeccion/bombas-de-gasolina'), true)
/* En motos tambien: una electrica no lleva filtro de aceite, bujia,
   carburador ni clutch. Lo que SI lleva —frenos, llantas, bateria,
   suspension— se dejo fuera a proposito. */
prueba('en motos tambien hay categorias de solo combustion',
  indice.nodos.filter(n => n.seccion === 'Motos' && n.soloCombustion).length > 20, true)
;[
  '/motos/filtros/filtros-de-aceite',
  '/motos/motor-y-transmision/combustible/carburadores',
  '/motos/electrico-y-electronico/bujias',
  '/motos/electrico-y-electronico/cdi-modulos-de-encendido',
].forEach(r => prueba('moto, no aplica: ' + r.split('/').pop(), soloComb(r), true))
;[
  '/motos/frenos', '/motos/llantas-y-rines', '/motos/baterias',
  '/motos/lubricantes-y-mantenimiento/aceite-de-suspension',
].forEach(r => prueba('moto, si aplica: ' + r.split('/').pop(), soloComb(r), false))

console.log('\n=== el aviso de la pagina de categoria ===')
/* nodoDe() es lo que decide si la pagina avisa. Vive en VehiculoEnPagina.js
   y se evalua aqui contra el indice real, que es el mismo que usa la tienda. */
const vpSrc = fs.readFileSync('react/VehiculoEnPagina.js', 'utf8')
eval(vpSrc.slice(vpSrc.indexOf('const nodoDe'), vpSrc.indexOf('export default')) +
     '\nglobal.nodoDe = nodoDe;')

const avisa = ruta => { const n = nodoDe(ruta); return !!(n && n.soloCombustion) }
prueba('en filtros de aceite avisa', avisa('/carros/filtros/filtros-de-aceite'), true)
prueba('en bujias avisa',
  avisa('/carros/electrico-y-electronico/encendido/bujias-de-encendido'), true)
prueba('en pastillas no avisa', avisa('/carros/frenos/pastillas-de-freno'), false)
prueba('en llantas no avisa', avisa('/carros/llantas-y-rines'), false)
prueba('con barra al final igual lo encuentra',
  avisa('/carros/filtros/filtros-de-aceite/'), true)
prueba('una busqueda libre no es categoria: no avisa',
  nodoDe('/carros/pastillas?_q=pastillas&map=ft'), null)
prueba('sin ruta no revienta', nodoDe(''), null)
prueba('una ruta que no existe tampoco', nodoDe('/carros/nada/de/nada'), null)

console.log('\n=== todo nodo tiene nivel ===')
prueba('sin nodos sin clasificar', indice.nodos.filter(n => !n.compatibilidad).length, 0)

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
