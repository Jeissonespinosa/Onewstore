/*
 * Los vehiculos guardados: lista, activo y migracion.
 *
 * Corre sin jest ni navegador: evalua react/vehiculo.js con un localStorage
 * y un window de mentira.
 *
 *   node scripts/tests/vehiculo.test.js
 */
const fs = require('fs')

const src = fs.readFileSync('react/vehiculo.js', 'utf8')
/* vehiculo.js importa la tabla de motorizaciones; el eval de abajo quita los
   imports, asi que se le entrega a mano. */
const motorizaciones = JSON.parse(fs.readFileSync('react/data/motorizaciones.json', 'utf8'))

/* localStorage de mentira, y un window que solo sirve para no reventar. */
const almacen = {}
global.window = {
  localStorage: {
    getItem: k => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v) },
    removeItem: k => { delete almacen[k] },
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
}
global.CustomEvent = function CustomEvent(tipo, init) { return { type: tipo, ...(init || {}) } }

const codigo = src
  .split('\n')
  .filter(l => !l.startsWith('import'))
  .join('\n')
  .replace(/^export (const|function|default) /gm, '$1 ')
  .replace(/^export /gm, '')

eval(codigo + `
  global.leerEstado = leerEstado; global.escribirEstado = escribirEstado;
  global.leer = leer; global.escribir = escribir; global.seccionDe = seccionDe;
  global.rutaDe = rutaDe; global.claveDe = claveDe; global.MAX = MAX_VEHICULOS;
  global.mismoVehiculo = mismoVehiculo; global.nombreDe = nombreDe;
  global.motoresDe = motoresDe; global.pideMotor = pideMotor;
  global.nombreConMotor = nombreConMotor;
`)

let fallos = 0
function prueba(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${nombre}`)
  if (!ok) console.log(`        esperado: ${JSON.stringify(esperado)}\n        real:     ${JSON.stringify(real)}`)
}
const limpiar = () => Object.keys(almacen).forEach(k => delete almacen[k])
const poner = (sec, valor) => { almacen[claveDe(sec)] = JSON.stringify(valor) }

const onix = { marca: 'Chevrolet', modelo: 'Onix', ano: '2020' }
const corolla = { marca: 'Toyota', modelo: 'Corolla', ano: '2019' }
const hilux = { marca: 'Toyota', modelo: 'Hilux', ano: '2018' }
const rav4 = { marca: 'Toyota', modelo: 'RAV4', ano: '2022' }

console.log('=== la ruta publica, no la interna de VTEX ===')
prueba('canonicalPath manda', rutaDe({
  path: '/_v/segment/routing/vtex.store@2.x/subcategory/515/motos/frenos?map=c',
  canonicalPath: '/motos/frenos/pastillas-de-freno',
}), '/motos/frenos/pastillas-de-freno')
prueba('sin canonical, sirve el departamento', rutaDe({ params: { department: 'motos' } }), '/motos')
prueba('la interna NO se usa para la seccion',
  seccionDe(rutaDe({ path: '/_v/segment/routing/x/motos/frenos', canonicalPath: '/motos/frenos' })),
  'motos')

console.log('\n=== formato viejo: un vehiculo suelto ===')
// Quien ya uso la tienda tiene esto guardado. Si no se reconoce, al publicar
// le aparece la tienda sin vehiculo.
limpiar(); poner('carros', onix)
prueba('se lee como lista de uno', leerEstado('carros'), { lista: [onix], activo: 0 })
prueba('leer() devuelve ese', leer('carros'), onix)

console.log('\n=== lista con activo ===')
limpiar(); poner('carros', { v: 2, lista: [onix, corolla], activo: 1 })
prueba('leer() devuelve el activo', leer('carros'), corolla)
prueba('activo fuera de rango cae en 0',
  (poner('carros', { v: 2, lista: [onix], activo: 7 }), leer('carros')), onix)
prueba('lista vacia -> sin vehiculo',
  (poner('carros', { v: 2, lista: [], activo: 0 }), leer('carros')), null)

console.log('\n=== escribir() desde Cris ===')
limpiar()
escribir('carros', onix)
prueba('el primero entra y queda activo', leerEstado('carros'), { lista: [onix], activo: 0 })
escribir('carros', corolla)
prueba('el segundo se suma y toma el relevo', leerEstado('carros'), { lista: [onix, corolla], activo: 1 })
escribir('carros', onix)
prueba('uno que ya esta NO se duplica, se activa', leerEstado('carros'), { lista: [onix, corolla], activo: 0 })

console.log('\n=== el tope ===')
limpiar()
;[onix, corolla, hilux].forEach(v => escribir('carros', v))
prueba('caben MAX', leerEstado('carros').lista.length, MAX)
escribir('carros', rav4)
prueba('el cuarto reemplaza al activo, no se pierde el resto',
  leerEstado('carros').lista.map(v => v.modelo), ['Onix', 'Corolla', 'RAV4'])
prueba('y queda activo el nuevo', leer('carros').modelo, 'RAV4')

console.log('\n=== quitar ===')
limpiar(); escribirEstado('carros', { lista: [onix, corolla], activo: 1 })
escribir('carros', null)
prueba('quita el activo y deja el otro', leerEstado('carros'), { lista: [onix], activo: 0 })
escribir('carros', null)
prueba('al quitar el ultimo no queda nada', leer('carros'), null)
prueba('y la clave se borra del almacen', almacen[claveDe('carros')], undefined)

console.log('\n=== cada seccion es su propio garaje ===')
limpiar()
escribir('carros', onix)
escribir('motos', { marca: 'Bajaj', modelo: 'Pulsar 160 NS', ano: '2021' })
prueba('el carro no se ve en motos', leer('motos').marca, 'Bajaj')
prueba('la moto no se ve en carros', leer('carros').marca, 'Chevrolet')

console.log('\n=== basura guardada no rompe la tienda ===')
limpiar()
almacen[claveDe('carros')] = '{roto'
prueba('json invalido -> sin vehiculo', leer('carros'), null)
poner('carros', { v: 2, lista: [{ marca: 'Solo marca' }, onix], activo: 0 })
prueba('entradas incompletas se descartan', leerEstado('carros'), { lista: [onix], activo: 0 })

console.log('\n=== el nombre no repite la marca ===')
// 14 modelos de la base ya empiezan por su marca: Mazda 3, Renault 12, MG 5.
prueba('Mazda + Mazda 3 -> Mazda 3',
  nombreDe({ marca: 'Mazda', modelo: 'Mazda 3' }), 'Mazda 3')
prueba('Renault + Renault 12 -> Renault 12',
  nombreDe({ marca: 'Renault', modelo: 'Renault 12' }), 'Renault 12')
prueba('Chevrolet + Onix si se junta',
  nombreDe({ marca: 'Chevrolet', modelo: 'Onix' }), 'Chevrolet Onix')
prueba('Mazda + CX-5 si se junta',
  nombreDe({ marca: 'Mazda', modelo: 'CX-5' }), 'Mazda CX-5')
prueba('sin vehiculo, cadena vacia', nombreDe(null), '')

console.log('\n=== a quien se le pregunta el motor ===')
// Solo a los verificados, y solo cuando ese año tiene mas de uno.
prueba('Corolla 2021 tiene hibrido y gasolina',
  motoresDe('carros','Toyota','Corolla','2021').map(m => m.id).sort(), ['1.8HV','2.0'])
prueba('y por eso se le pregunta', pideMotor('carros','Toyota','Corolla','2021'), true)
prueba('Corolla 2015 son los viejos',
  motoresDe('carros','Toyota','Corolla','2015').map(m => m.id).sort(), ['1.6','1.8'])
prueba('Picanto 2019: 1.0 y 1.25',
  motoresDe('carros','Kia','Picanto','2019').map(m => m.id).sort(), ['1.0','1.25'])
prueba('Picanto 2008 era el 1.1',
  motoresDe('carros','Kia','Picanto','2008').map(m => m.id), ['1.1'])
prueba('y con uno solo NO se pregunta', pideMotor('carros','Kia','Picanto','2008'), false)

// El 1.6 de Renault no es uno: 8V y 16V llevan correa y bujias distintas.
prueba('Sandero distingue 8V de 16V',
  motoresDe('carros','Renault','Sandero','2018').map(m => m.id).sort(), ['1.6-16V','1.6-8V'])

// Lo que NO debe preguntar
prueba('una moto nunca', pideMotor('motos','Bajaj','Pulsar 160 NS','2021'), false)
prueba('herramientas tampoco', pideMotor('herramientas','Toyota','Corolla','2021'), false)
prueba('un modelo sin verificar todavia no', pideMotor('carros','Ford','Ranger','2020'), false)
prueba('un modelo que no existe no revienta', motoresDe('carros','Nada','Nada','2020'), [])

console.log('\n=== el nombre distingue los dos Corolla ===')
prueba('con motor', nombreConMotor({marca:'Toyota',modelo:'Corolla',ano:'2021',motor:'1.8HV'}),
  'Toyota Corolla 1.8HV')
prueba('sin motor queda igual que antes',
  nombreConMotor({marca:'Chevrolet',modelo:'Onix',ano:'2022'}), 'Chevrolet Onix')

console.log('\n=== mismoVehiculo ===')
prueba('igual con el mismo año', mismoVehiculo(onix, { ...onix }), true)
prueba('distinto si cambia el año', mismoVehiculo(onix, { ...onix, ano: '2021' }), false)

/* El caso que el usuario puso de ejemplo: dos Picanto del mismo año. */
const pic10 = { marca: 'Kia', modelo: 'Picanto', ano: '2015', motor: '1.0' }
const pic125 = { marca: 'Kia', modelo: 'Picanto', ano: '2015', motor: '1.25' }
const picSin = { marca: 'Kia', modelo: 'Picanto', ano: '2015' }
prueba('1.0 y 1.25 del mismo año son carros distintos', mismoVehiculo(pic10, pic125), false)
prueba('sin motor todavia puede ser cualquiera de los dos', mismoVehiculo(picSin, pic125), true)
prueba('y al reves tambien', mismoVehiculo(pic10, picSin), true)
prueba('motor null cuenta como sin declarar',
  mismoVehiculo({ ...picSin, motor: null }, pic10), true)

console.log('\n=== guardar con motor ===')
limpiar()
escribir('carros', pic10)
escribir('carros', pic125)
prueba('los dos Picanto caben a la vez',
  leerEstado('carros'), { lista: [pic10, pic125], activo: 1 })
limpiar()
escribir('carros', picSin)
escribir('carros', pic125)
prueba('escoger el motor completa el que estaba sin declarar, no lo duplica',
  leerEstado('carros'), { lista: [pic125], activo: 0 })
escribir('carros', picSin)
prueba('decir "no se cual es" despues lo deja otra vez sin motor',
  leerEstado('carros'), { lista: [picSin], activo: 0 })

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
