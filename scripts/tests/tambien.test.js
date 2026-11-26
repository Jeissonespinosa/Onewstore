/*
 * "Tambien te puede interesar": a quien se nombra y de donde salen los
 * universales.
 *
 *   node scripts/tests/tambien.test.js
 *
 * Lo que se prueba aqui no es estetica: es lo que separa una recomendacion
 * de una devolucion. Nombrar el carro equivocado en la nota, o repetir en
 * "te puede interesar" lo que el cliente ya tiene arriba, son los dos
 * errores que esta pagina cometio en vivo.
 */
const fs = require('fs')
const indice = JSON.parse(fs.readFileSync('react/cris-index.json', 'utf8'))

/* vehiculo.js es ESM y trae imports de JSON: no se puede require. Se evalua
   igual que en vehiculo.test.js, solo para tener nombreDe. */
const motorizaciones = JSON.parse(fs.readFileSync('react/data/motorizaciones.json', 'utf8'))
global.window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
global.CustomEvent = function (t, i) { return { type: t, ...(i || {}) } }
eval(fs.readFileSync('react/vehiculo.js', 'utf8')
  .split('\n').filter(l => !l.startsWith('import')).join('\n')
  .replace(/^export (const|function|default) /gm, '$1 ')
  .replace(/^export /gm, '') + '\nglobal.nombreDe = nombreDe;')

const src = fs.readFileSync('react/TambienTeInteresa.js', 'utf8')
/* Se evalua todo lo que hay ANTES del componente: el componente lleva JSX y
   no compila aqui. Cortar por el nombre de un ayudante era peor — al agregar
   uno nuevo arriba, la prueba reventaba con "no esta definido". */
const trozo = src
  .slice(0, src.indexOf('export default function'))
  .split('\n').filter(l => !l.startsWith('import')).join('\n')
eval(trozo.replace(/^export (const|function) /gm, '$1 ') +
  '\nglobal.universalesDe = universalesDe; global.macroDe = macroDe;' +
  'global.aQuienNombrar = aQuienNombrar;')

let fallos = 0
const prueba = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${nombre}`)
  if (!ok) console.log(`        esperado: ${JSON.stringify(esperado)}\n        real:     ${JSON.stringify(real)}`)
}

const aveo = { marca: 'Chevrolet', modelo: 'Aveo', ano: 2010 }
const corolla = { marca: 'Toyota', modelo: 'Corolla', ano: 2021 }

console.log('=== se nombra el carro que la pagina esta mostrando ===')
// El error que se vio en vivo: la pagina filtraba Corolla y la nota decia
// "no estan declarados para tu Chevrolet Aveo" (el guardado en el navegador).
prueba('filtrando Corolla con Aveo guardado -> Corolla',
  aQuienNombrar(corolla, aveo).nombre, nombreDe(corolla))
prueba('y la pagina se declara filtrando',
  aQuienNombrar(corolla, aveo).filtrando, true)
prueba('sin filtro se nombra el guardado',
  aQuienNombrar(null, aveo).nombre, nombreDe(aveo))
prueba('sin filtro NO esta filtrando',
  aQuienNombrar(null, aveo).filtrando, false)
prueba('sin carro por ningun lado no se nombra a nadie',
  aQuienNombrar(null, null).nombre, null)
// Un vehiculo a medias (solo seccion, sin marca) no alcanza para nombrarlo.
prueba('un vehiculo sin marca no cuenta como filtro',
  aQuienNombrar({ ano: 2021 }, null), { filtrando: false, nombre: null })

console.log('=== una macro universal no se recomienda a si misma ===')
const todas = universalesDe('carros', null)
prueba('carros trae accesorios y tecnologia', 
  ['/carros/accesorios', '/carros/tecnologia-y-seguridad'].every(p => todas.includes(p)), true)
prueba('y tambien herramientas',
  todas.some(p => p.startsWith('/herramientas/')), true)
prueba('en accesorios se saca accesorios',
  universalesDe('carros', '/carros/accesorios').includes('/carros/accesorios'), false)
prueba('pero quedan las demas',
  universalesDe('carros', '/carros/accesorios').length, todas.length - 1)
prueba('motos no recomienda macros de carros',
  universalesDe('motos', null).some(p => p.startsWith('/carros/')), false)
prueba('carros no recomienda macros de motos',
  todas.some(p => p.startsWith('/motos/')), false)

console.log('=== herramientas alcanza a entrar en las cuatro que se piden ===')
// loDeAbajo solo pide las primeras cuatro. Pegando una lista detras de la
// otra, en motos se las comian cascos/accesorios/ropa/tecnologia y el
// motociclista no veia nunca una copa ni un gato.
const CUATRO = 4
prueba('motos: hay herramientas en las primeras cuatro',
  universalesDe('motos', null).slice(0, CUATRO).some(p => p.startsWith('/herramientas/')), true)
prueba('motos: y tambien propias de moto',
  universalesDe('motos', null).slice(0, CUATRO).some(p => p.startsWith('/motos/')), true)
prueba('carros: hay herramientas en las primeras cuatro',
  universalesDe('carros', null).slice(0, CUATRO).some(p => p.startsWith('/herramientas/')), true)
prueba('carros: y tambien propias de carro',
  universalesDe('carros', null).slice(0, CUATRO).some(p => p.startsWith('/carros/')), true)
prueba('no se repite ninguna',
  new Set(universalesDe('carros', null)).size, universalesDe('carros', null).length)

console.log('=== la macro de una ruta ===')
prueba('hoja', macroDe('/carros/accesorios/tapetes'), '/carros/accesorios')
prueba('macro', macroDe('/carros/accesorios'), '/carros/accesorios')
prueba('seccion sola', macroDe('/carros'), null)
prueba('con query', macroDe('/carros/accesorios/tapetes?map=c,c,c'), '/carros/accesorios')
prueba('con slash final', macroDe('/carros/accesorios/'), '/carros/accesorios')
prueba('vacia', macroDe(''), null)

console.log('=== las rutas que se recomiendan existen en el arbol ===')
// Si una se renombra en el arbol y aqui queda la vieja, el bloque pide
// una categoria que no existe y vuelve vacio sin decir por que.
const paths = new Set(indice.nodos.map(n => n.path))
prueba('todas las de carros', todas.filter(p => !paths.has(p)), [])
prueba('todas las de motos', universalesDe('motos', null).filter(p => !paths.has(p)), [])

console.log(fallos ? `\n${fallos} prueba(s) FALLARON` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
