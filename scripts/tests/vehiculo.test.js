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
  global.modeloCoincide = modeloCoincide; global.esVersion = esVersion;
  global.esElectrico = esElectrico;
  global.plano = plano; global.VERSIONES = VERSIONES; global.APODOS = APODOS;
`)

const base = JSON.parse(fs.readFileSync('react/data/vehiculos-colombia.json', 'utf8'))

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
/* El Sandero tiene 8V y 16V, pero no sabemos desde que año va cada uno, y
   sin el año el motor no se puede ofrecer: diria que un Sandero 2024 puede
   ser 8V sin que nadie lo haya comprobado. Se queda por confirmar. */
prueba('el Sandero no se ofrece mientras le falte el año',
  motoresDe('carros','Renault','Sandero','2018'), [])

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

console.log('\n=== encontrar el modelo escribiendo ===')
const cal = (marca, modelo, q) => modeloCoincide('carros', marca, modelo, q)
prueba('"yar" encuentra la Yaris Cross', cal('Toyota', 'Yaris Cross', 'yar'), true)
prueba('la Yaris Cross existe en la base',
  !!base.carros.Toyota['Yaris Cross'], true)
prueba('"morning" lleva al Picanto', cal('Kia', 'Picanto', 'morning'), true)
prueba('"ion" tambien', cal('Kia', 'Picanto', 'ion'), true)
prueba('"spice" lleva al Rio', cal('Kia', 'Rio', 'spice'), true)
prueba('"megane" sin tilde encuentra el Mégane', cal('Renault', 'Mégane', 'megane'), true)
prueba('no confunde: "morning" no trae el Rio', cal('Kia', 'Rio', 'morning'), false)
prueba('sin texto pasan todos', cal('Kia', 'Rio', ''), true)

/* El guion: nadie lo escribe. */
prueba('"cx5" encuentra el CX-5', cal('Mazda', 'CX-5', 'cx5'), true)
prueba('"crv" encuentra la CR-V', cal('Honda', 'CR-V', 'crv'), true)
prueba('"np300" encuentra la Frontier NP300',
  cal('Nissan', 'Frontier NP300', 'np300'), true)
prueba('"f150" encuentra la F-150', cal('Ford', 'F-150', 'f150'), true)
/* Apodos de la calle. */
prueba('"r4" es el Renault 4', cal('Renault', 'Renault 4', 'r4'), true)
prueba('"cuatro latas" tambien', cal('Renault', 'Renault 4', 'cuatro latas'), true)
prueba('"miata" es el MX-5', cal('Mazda', 'MX-5', 'miata'), true)
prueba('"pajero" es el Montero', cal('Mitsubishi', 'Montero Pajero', 'pajero'), true)
prueba('"yipao" es el Willys', cal('Jeep', 'Willys CJ', 'yipao'), true)
prueba('"escarabajo" sigue siendo el escarabajo',
  cal('Volkswagen', 'Escarabajo', 'beetle'), true)
/* En motos. */
const calM = (marca, modelo, q) => modeloCoincide('motos', marca, modelo, q)
prueba('"ns160" es la Pulsar 160 NS', calM('Bajaj', 'Pulsar 160 NS', 'ns160'), true)
prueba('"titan" es la CG 125', calM('Honda', 'CG 125 Titan', 'titan'), true)
prueba('"ybr" es la YB 125', calM('Yamaha', 'YB 125 YBR 125', 'ybr'), true)
prueba('"tenere" sin tilde', calM('Yamaha', 'Ténéré 250', 'tenere'), true)

console.log('\n=== versiones, que no son modelos ===')
prueba('zenith es version de Kia', esVersion('Kia', 'zenith'), 'Zenith')
prueba('ltz es version de Chevrolet', esVersion('Chevrolet', 'ltz'), 'LTZ')
prueba('picanto NO es version', esVersion('Kia', 'picanto'), null)
prueba('una letra sola no dispara el aviso', esVersion('Kia', 'z'), null)
/* Si una palabra de VERSIONES fuera tambien un modelo de verdad, le
   estariamos diciendo "eso es una version" a alguien que escribio bien. */
const choques = []
Object.keys(VERSIONES).forEach(marca => {
  const modelos = Object.keys(base.carros[marca] || {}).map(plano)
  VERSIONES[marca].forEach(v => {
    if (modelos.includes(plano(v))) choques.push(marca + ' ' + v)
  })
})
prueba('ninguna version choca con un modelo real', choques, [])
/* Lo mismo al reves: un apodo tiene que apuntar a un modelo que exista. */
const huerfanos = []
Object.keys(APODOS.carros).forEach(marca => {
  Object.keys(APODOS.carros[marca]).forEach(modelo => {
    if (!(base.carros[marca] || {})[modelo]) huerfanos.push(marca + ' ' + modelo)
  })
})
prueba('ningun apodo apunta a un modelo que no existe', huerfanos, [])

console.log('\n=== los modelos 2027 ===')
prueba('el Onix llega a 2027', base.carros.Chevrolet.Onix[1], 2027)
prueba('la Yaris Cross arranca en 2022', base.carros.Toyota['Yaris Cross'][0], 2022)
prueba('lo descontinuado no se movio', base.carros.Chevrolet.Sail[1], 2020)

console.log('\n=== el Picanto año por año ===')
const ids = (ano) => motoresDe('carros', 'Kia', 'Picanto', ano).map(m => m.id)
prueba('2008 es Morning: solo el 1.1', ids('2008'), ['1.1'])
prueba('2010 igual', ids('2010'), ['1.1'])
prueba('2011 es el año del cambio: conviven los tres', ids('2011').sort(),
  ['1.0', '1.1', '1.25'])
prueba('2012 ya es Ion: se fue el 1.1', ids('2012').sort(), ['1.0', '1.25'])
prueba('2020 sigue siendo 1.0 y 1.25', ids('2020').sort(), ['1.0', '1.25'])
prueba('en 2011 cada opcion dice de que generacion es',
  motoresDe('carros', 'Kia', 'Picanto', '2011').every(m => !!m.nota), true)
prueba('y esas notas no se repiten',
  new Set(motoresDe('carros', 'Kia', 'Picanto', '2011').map(m => m.nota)).size, 3)

console.log('\n=== no mezclar generaciones ===')
/* Estos todavia son por-confirmar, asi que motoresDe() no los muestra: se
   revisan contra el dato crudo. Lo que se prueba es que las ventanas de año
   partan bien las generaciones, que es lo que evita ofrecerle a una Ranger
   2018 un motor que salio en 2023. */
const crudoEnAno = (ma, mo, y) => {
  const f = motorizaciones.carros[ma][mo]
  return f.motores
    .filter(x => !(x.desde && y < x.desde) && !(x.hasta && y > x.hasta))
    .map(x => x.id)
    .sort()
}
prueba('la Ranger vieja no ve el motor de la nueva',
  crudoEnAno('Ford', 'Ranger', 2018), ['2.2D', '2.5', '3.2D'])
prueba('y la nueva no ve los de la vieja',
  crudoEnAno('Ford', 'Ranger', 2025), ['2.0BT', '3.0V6D'])
prueba('la Hilux de 2012 no ve el 2.8 diésel, que salio en 2016',
  crudoEnAno('Toyota', 'Hilux', 2012), ['2.7', '4.0'])
prueba('la Hilux de 2020 no ve el V6',
  crudoEnAno('Toyota', 'Hilux', 2020), ['2.4D', '2.7', '2.8D'])
prueba('el Mazda 3 de 2010 no ve SkyActiv',
  crudoEnAno('Mazda', 'Mazda 3', 2010), ['1.6', '2.0'])
prueba('el Fortuner recupero el 2.4 diésel',
  crudoEnAno('Toyota', 'Fortuner', 2020), ['2.4D', '2.7', '2.8D'])
prueba('el Symbol dejo de tener un solo motor',
  motorizaciones.carros.Renault.Symbol.motores.length >= 3, true)
prueba('el Twingo distingue 8V de 16V',
  motorizaciones.carros.Renault.Twingo.motores.map(x => x.id).sort(),
  ['1.2-16V', '1.2-8V'])
/* "Anteriores a 2005" no es un motor y no puede salir como opcion. */
prueba('lo que falta se anota en la ficha, no entre los motores',
  motorizaciones.carros.Toyota.Hilux.motores.every(x => /\d/.test(x.id)), true)
prueba('y la ficha lo dice', !!motorizaciones.carros.Toyota.Hilux.falta, true)

console.log('\n=== los cinco que faltaba completar ===')
prueba('el Jetta de 2015 no ve el TSI, que llego en 2019',
  crudoEnAno('Volkswagen', 'Jetta', 2015), ['2.0', '2.5'])
prueba('y el de 2022 no ve los aspirados',
  crudoEnAno('Volkswagen', 'Jetta', 2022), ['1.4T', '2.0T'])
/* El 2.0 viejo y el 2.0 del GLI son el mismo cilindraje y otro motor: tienen
   que verse distinto o el cliente escoge a la suerte. */
prueba('el 2.0 viejo y el 2.0 TSI no se llaman igual',
  motorizaciones.carros.Volkswagen.Jetta.motores
    .filter(x => x.id.indexOf('2.0') === 0).map(x => x.nombre),
  ['2.0 Aspirado · 1984 cc', '2.0 TSI · 1984 cc'])

prueba('el Serie 3 de 2003 es todo aspirado',
  crudoEnAno('BMW', 'Serie 3', 2003), ['1.8', '2.0-asp', '2.2-6c', '2.5-6c', '3.0-asp'])
prueba('el de 2024 son dos', crudoEnAno('BMW', 'Serie 3', 2024), ['2.0T', '3.0T'])

prueba('el Yaris viejo y el nuevo son motores distintos',
  crudoEnAno('Toyota', 'Yaris', 2010).concat(crudoEnAno('Toyota', 'Yaris', 2022)),
  ['1.5', '1.5-NR'])
prueba('el Symbol de 2005 lleva el 1.4 8V',
  crudoEnAno('Renault', 'Symbol', 2005).indexOf('1.4-8V') >= 0, true)
prueba('y el de 2011 ya es 1.6',
  crudoEnAno('Renault', 'Symbol', 2011).filter(x => x.indexOf('1.6') === 0).sort(),
  ['1.6-16V', '1.6-8V'])
prueba('el Koleos quedo con su rango completo',
  crudoEnAno('Renault', 'Koleos', 2015).indexOf('2.5') >= 0, true)

console.log('\n=== cuando el numero es el motor (BMW, Mercedes) ===')
const motoresId = (ma, mo, a) => motoresDe('carros', ma, mo, a).map(x => x.id).sort()
/* BMW Serie 1, confirmado generacion por generacion. */
prueba('un Serie 1 de 2008 es aspirado', motoresId('BMW', 'Serie 1', '2008'),
  ['1.6', '2.0', '3.0'])
prueba('uno de 2016 ya es turbo', motoresId('BMW', 'Serie 1', '2016'),
  ['1.5T', '1.6T', '3.0T'])
prueba('uno de 2025 son dos', motoresId('BMW', 'Serie 1', '2025'), ['1.5T', '2.0T'])
prueba('y se le pregunta, porque son dos',
  pideMotor('carros', 'BMW', 'Serie 1', '2025'), true)
prueba('2011 es el año del cambio y los muestra todos',
  motoresDe('carros', 'BMW', 'Serie 1', '2011').length, 6)
/* Cada opcion tiene que decir cual numero es, o el dueño de un 118i no sabe
   cual escoger. */
prueba('cada motor del Serie 1 dice que version es',
  motoresDe('carros', 'BMW', 'Serie 1', '2016').every(x => !!x.nota), true)

console.log('\n=== el año va en todos ===')
/* Regla nueva: un motor verificado SIN ventana de año no existe. "De 2010 a
   2023" es un dato confirmado; "sin año" es un dato que falta. */
const verificados = []
Object.keys(motorizaciones.carros).forEach(ma => {
  Object.keys(motorizaciones.carros[ma]).forEach(mo => {
    const f = motorizaciones.carros[ma][mo]
    if (f.fuente === 'verificado') verificados.push([ma, mo, f])
  })
})
const sinAno = verificados
  .filter(([, , f]) => f.motores.some(x => !x.desde && !x.hasta))
  .map(([ma, mo]) => ma + ' ' + mo)
prueba('ningun verificado tiene motores sin año', sinAno, [])
prueba('y hay verificados de verdad', verificados.length > 10, true)
prueba('el Spark GT quedo con su rango completo',
  motoresDe('carros', 'Chevrolet', 'Spark GT', '2015').map(m => m.id), ['1.2'])
prueba('y fuera de su rango no ofrece nada',
  motoresDe('carros', 'Chevrolet', 'Spark GT', '2026'), [])

console.log('\n=== el carro electrico ===')
prueba('el Spark EUV es electrico', esElectrico('carros', 'Chevrolet', 'Spark EUV'), true)
prueba('el Spark GT no', esElectrico('carros', 'Chevrolet', 'Spark GT'), false)
prueba('el Leaf si', esElectrico('carros', 'Nissan', 'Leaf'), true)
/* Un hibrido lleva motor de gasolina: aceite, bujias y correa igual. */
prueba('el Corolla hibrido NO cuenta como electrico',
  esElectrico('carros', 'Toyota', 'Corolla'), false)
prueba('un modelo sin ficha no revienta', esElectrico('carros', 'Nada', 'Nada'), false)
prueba('al electrico no se le pregunta motor',
  pideMotor('carros', 'Chevrolet', 'Spark EUV', '2026'), false)
prueba('el Spark EUV existe en la base', !!base.carros.Chevrolet['Spark EUV'], true)
prueba('"EV" no se escribe al lado del nombre',
  nombreConMotor({ marca: 'Chevrolet', modelo: 'Spark EUV', ano: '2026', motor: 'EV' }),
  'Chevrolet Spark EUV')

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
