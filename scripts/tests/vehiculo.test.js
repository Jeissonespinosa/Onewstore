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
  global.modeloCoincideEntero = modeloCoincideEntero;
  global.esElectrico = esElectrico;
  global.vehiculoDeRuta = vehiculoDeRuta; global.rutaConVehiculo = rutaConVehiculo;
  global.marcasDelCarro = marcasDelCarro; global.GEMELOS = GEMELOS;
  global.MUESTRA = MUESTRA;
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
/* El Sandero quedo confirmado: el 8V en las dos generaciones y el 16V H4M
   desde 2015, que es el corte que no sabiamos. */
prueba('el Sandero de 2018 ofrece el 8V, el H4M y el R.S.',
  motoresDe('carros','Renault','Sandero','2018').map(x => x.id).sort(),
  ['1.6-16V-H4M','1.6-8V','2.0'])
prueba('y en 2012 todavia no hay H4M',
  motoresDe('carros','Renault','Sandero','2012').map(x => x.id).sort(),
  ['1.6-16V-K4M','1.6-8V'])

// Lo que NO debe preguntar
/* En moto el cilindraje va en el nombre, asi que casi ninguna pregunta.
   Las que si: las que la base agrupo en un solo nombre. */
prueba('una moto con el cilindraje en el nombre no pregunta',
  pideMotor('motos','Bajaj','Pulsar 160 NS','2021'), false)
prueba('pero la Discover 100 125 si, porque son dos motos',
  pideMotor('motos','Bajaj','Discover 100 125','2015'), true)
prueba('y ofrece los dos cilindrajes',
  motoresDe('motos','Bajaj','Discover 100 125','2015').map(x => x.id), ['100','125'])
prueba('la Chetak es electrica', esElectrico('motos','Bajaj','Chetak eléctrica'), true)
prueba('herramientas tampoco', pideMotor('herramientas','Toyota','Corolla','2021'), false)
/* Lo que nadie ha mirado no se muestra: no se puede ofrecer un motor que
   no ha pasado ni por investigacion ni por catalogo. */
/* La puerta: lo que nadie ha mirado no se muestra. Ya no queda ningun
   modelo en ese estado, asi que la regla se prueba sobre la puerta misma
   y no sobre un ejemplo que manaña cambia de nivel. */
prueba('la puerta deja pasar dos niveles y no mas',
  MUESTRA.slice().sort(), ['investigado', 'verificado'])
prueba('"por-confirmar" no pasa', MUESTRA.indexOf('por-confirmar'), -1)
const sinMirar = []
Object.keys(motorizaciones.carros).forEach(ma => {
  Object.keys(motorizaciones.carros[ma]).forEach(mo => {
    if (motorizaciones.carros[ma][mo].fuente === 'por-confirmar') sinMirar.push(ma + ' ' + mo)
  })
})
prueba('y hoy no queda ninguno sin mirar', sinMirar, [])
prueba('un investigado si pregunta', pideMotor('carros', 'Ford', 'Ranger', '2020'), true)
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

console.log('\n=== MINI es marca, no un modelo de BMW ===')
/* En la tarjeta de propiedad la MARCA dice MINI y la LINEA dice COOPER S.
   Estaba metido dos veces: como "Mini Cooper" bajo BMW y como "Cooper"
   bajo Mini. Quien busca su MINI bajo BMW no lo encuentra, y lo que se
   hubiera etiquetado en la copia quedaba invisible. */
prueba('BMW ya no tiene modelos Mini',
  Object.keys(base.carros.BMW).filter(x => /^Mini/.test(x)), [])
prueba('y Mini los tiene todos',
  Object.keys(base.carros.Mini).sort(), ['Clubman', 'Cooper', 'Countryman'])
prueba('el Cooper viejo y el nuevo son motores distintos',
  motoresDe('carros', 'Mini', 'Cooper', '2010').map(x => x.id).sort(), ['1.6', '1.6T'])
prueba('y el de 2020 ya es el 1.5 de tres cilindros',
  motoresDe('carros', 'Mini', 'Cooper', '2020').map(x => x.id).sort(), ['1.5T', '2.0T'])
prueba('quien escriba "mini cooper" igual lo encuentra',
  modeloCoincide('carros', 'Mini', 'Cooper', 'mini cooper'), true)
prueba('y quien escriba "cooper s" tambien',
  modeloCoincide('carros', 'Mini', 'Cooper', 'cooper s'), true)

console.log('\n=== el mismo carro con dos insignias ===')
/* Medio Suzuki e Isuzu se vendio como Chevrolet. Si la pieza quedo
   etiquetada con una marca y el cliente escoge la otra, le decimos que no
   tenemos algo que si tenemos. */
prueba('un Swift del 98 filtra por las dos marcas',
  marcasDelCarro('carros', 'Chevrolet', 'Swift', '1998'), ['Chevrolet', 'Suzuki'])
prueba('y da igual por cual de las dos entre',
  marcasDelCarro('carros', 'Suzuki', 'Swift', '1998'), ['Chevrolet', 'Suzuki'])
/* El año es lo que decide: el Swift moderno Chevrolet nunca lo vendio. */
prueba('el Swift moderno es solo Suzuki',
  marcasDelCarro('carros', 'Suzuki', 'Swift', '2015'), ['Suzuki'])
prueba('sin año no se arriesga',
  marcasDelCarro('carros', 'Chevrolet', 'Swift', null), ['Chevrolet'])
/* Los tres que NO son gemelos: mismo nombre, carros distintos. Meterlos
   juntos seria peor que el problema que estamos arreglando. */
prueba('el Vitara nuevo no arrastra al viejo',
  marcasDelCarro('carros', 'Suzuki', 'Vitara', '2020'), ['Suzuki'])
prueba('ni el viejo al nuevo',
  marcasDelCarro('carros', 'Chevrolet', 'Vitara', '2000'), ['Chevrolet'])
prueba('el Jimny tampoco', marcasDelCarro('carros', 'Suzuki', 'Jimny', '2022'), ['Suzuki'])
prueba('un carro normal filtra por su marca y ya',
  marcasDelCarro('carros', 'Toyota', 'Corolla', '2021'), ['Toyota'])

/* Un gemelo tiene que llevar los MISMOS motores en los años compartidos: es
   el mismo carro, no puede tener un motor distinto segun el emblema. */
const motoresEn = (ma, mo, y) => {
  const f = (motorizaciones.carros[ma] || {})[mo]
  if (!f) return []
  return f.motores
    .filter(x => !(x.desde && y < x.desde) && !(x.hasta && y > x.hasta))
    .map(x => x.nombre).sort()
}
const desalineados = []
GEMELOS.forEach(g => {
  for (let y = g.desde; y <= g.hasta; y += 1) {
    const a = motoresEn(g.marcas[0], g.modelo, y).join('|')
    const b = motoresEn(g.marcas[1], g.modelo, y).join('|')
    if (a !== b) { desalineados.push(g.modelo + ' ' + y); break }
  }
})
prueba('los gemelos llevan los mismos motores en los años que comparten',
  desalineados, [])

prueba('la URL de un gemelo pide las dos marcas',
  rutaConVehiculo('/carros/frenos', '?map=c,c',
    { marca: 'Chevrolet', modelo: 'Swift', ano: '1998' }),
  '/carros/frenos/chevrolet/suzuki/swift/1998?map=c,c,marca-vehiculo,marca-vehiculo,modelo,ano')

console.log('\n=== el carro que viene en la URL ===')
/* Es lo que permite darse cuenta de que la pagina esta filtrando por un
   carro distinto al guardado. Sale de la ruta, no del almacenamiento. */
const U = '/carros/frenos/2021/corolla/toyota'
const Q = '?map=c,c,ano,modelo,marca-vehiculo'
prueba('lee marca, modelo y año de la ruta',
  vehiculoDeRuta(U, Q, base.carros), { marca: 'Toyota', modelo: 'Corolla', ano: '2021' })
prueba('devuelve el nombre de la base, no el slug',
  vehiculoDeRuta('/carros/frenos/mazda-3/mazda', '?map=c,c,modelo,marca-vehiculo',
    base.carros).modelo, 'Mazda 3')
prueba('una categoria sin filtro no trae carro',
  vehiculoDeRuta('/carros/frenos/pastillas-de-freno', '', base.carros), null)
prueba('si el map y la ruta no calzan, no inventa',
  vehiculoDeRuta(U, '?map=c,c', base.carros), null)
prueba('una marca que no existe en la base no cuenta',
  vehiculoDeRuta('/carros/frenos/nada', '?map=c,c,marca-vehiculo', base.carros), null)

console.log('\n=== cambiar de carro sin perder la categoria ===')
prueba('cambia el vehiculo y conserva la categoria',
  rutaConVehiculo(U, Q, { marca: 'Chevrolet', modelo: 'Aveo', ano: '2015' }),
  '/carros/frenos/chevrolet/aveo/2015?map=c,c,marca-vehiculo,modelo,ano')
prueba('quitar el vehiculo deja la categoria sola',
  rutaConVehiculo(U, Q, null), '/carros/frenos?map=c,c')
prueba('sin map no hay a donde ir',
  rutaConVehiculo('/carros/frenos', '', null), null)
/* La medida de llanta no se puede perder al cambiar de carro: es el filtro
   que el cliente mas trabajo le costo poner. */
const UL = '/carros/llantas/185/65/15/toyota'
const QL = '?map=c,c,ancho,alto--perfil-,rin,marca-vehiculo'
prueba('conserva la medida de llanta al quitar el vehiculo',
  rutaConVehiculo(UL, QL, null), '/carros/llantas/185/65/15?map=c,c,ancho,alto--perfil-,rin')

console.log('\n=== un solo motor: solo el año, sin preguntar ===')
/* La regla que pidio el usuario, revisada sobre TODA la base: si el modelo
   no cambia de motorizacion, el embudo termina en el año. */
const todosLosModelos = []
Object.keys(motorizaciones.carros).forEach(ma => {
  Object.keys(motorizaciones.carros[ma]).forEach(mo => {
    todosLosModelos.push([ma, mo, motorizaciones.carros[ma][mo]])
  })
})
const unSoloMotor = todosLosModelos.filter(([, , f]) => f.motores.length === 1)
const preguntaDeMas = unSoloMotor.filter(([ma, mo, f]) => {
  const y = String(f.motores[0].desde || 2015)
  return pideMotor('carros', ma, mo, y)
}).map(([ma, mo]) => ma + ' ' + mo)
prueba('ninguno de un solo motor pregunta', preguntaDeMas, [])
prueba('y son muchos', unSoloMotor.length > 200, true)

/* Y el que SI cambia tiene que preguntar, o volvemos al problema de origen. */
const multi = todosLosModelos.filter(([, , f]) => f.motores.length > 1)
prueba('los que cambian son los que preguntan', multi.length > 100, true)
prueba('un modelo sin ficha tampoco pregunta',
  pideMotor('carros', 'Chevrolet', 'NHR', '2015'), false)

/* Un solo motor tiene que cubrir todos los años del modelo, o habria años
   del carro sin motor. */
const cortos = unSoloMotor.filter(([ma, mo, f]) => {
  const r = (base.carros[ma] || {})[mo]
  const x = f.motores[0]
  return r && x.desde && (x.desde > r[0] || (x.hasta || r[1]) < r[1])
}).map(([ma, mo]) => ma + ' ' + mo)
/* El Fiesta salio de esta lista al ganar el ST: ya no es de un solo motor.
   Su hueco de 1996-2009 sigue anotado en la ficha. */
prueba('ninguno de un solo motor deja años del carro sin motor', cortos, [])

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
/* Confirmado: la septima lleva los D-4D de 2.5 y 3.0, y el V6 solo aparece
   en la octava, en las GR-Sport. */
prueba('la Hilux de 2012 lleva los D-4D de la septima',
  crudoEnAno('Toyota', 'Hilux', 2012), ['2.5D', '2.7', '3.0D'])
prueba('y no ve los GD, que salieron en 2016',
  crudoEnAno('Toyota', 'Hilux', 2012).indexOf('2.8D'), -1)
prueba('la Hilux de 2020 lleva los GD y el V6 de la GR-Sport',
  crudoEnAno('Toyota', 'Hilux', 2020), ['2.4D', '2.7', '2.8D', '4.0-V6'])
prueba('y ya no ve el 3.0 de la septima',
  crudoEnAno('Toyota', 'Hilux', 2020).indexOf('3.0D'), -1)
prueba('el Mazda 3 de 2010 no ve SkyActiv',
  crudoEnAno('Mazda', 'Mazda 3', 2010), ['1.6', '2.0'])
prueba('el Fortuner recupero el 2.4 diésel',
  crudoEnAno('Toyota', 'Fortuner', 2020), ['2.4D', '2.7', '2.8D'])
/* La confirmacion zanjo la duda: el Symbol llevo 1.4 K7J y 1.6 16V K4M. El
   "1.4 16V" que listaba una de las fuentes no existio. */
prueba('el Symbol son dos motores, no cuatro',
  motorizaciones.carros.Renault.Symbol.motores.map(x => x.id).sort(),
  ['1.4','1.6-16V'])
prueba('el Twingo quedo con sus tres motores confirmados',
  motorizaciones.carros.Renault.Twingo.motores.map(x => x.id).sort(),
  ['1.1', '1.2-16V', '1.3'])
/* "Anteriores a 2005" no es un motor y no puede salir como opcion. */
prueba('lo que falta se anota en la ficha, no entre los motores',
  motorizaciones.carros.Toyota.Hilux.motores.every(x => /\d/.test(x.id)), true)
/* Lo que falta ahora es anterior: de 1990 a 1997. */
prueba('y la ficha dice lo que todavia falta',
  /1990/.test(motorizaciones.carros.Toyota.Hilux.falta || ''), true)

console.log('\n=== los cinco que faltaba completar ===')
prueba('el Jetta de 2015 no ve el 1.4 TSI, que llego en 2019',
  crudoEnAno('Volkswagen', 'Jetta', 2015), ['1.8TSI', '2.0'])
prueba('y el de 2022 no ve los aspirados',
  crudoEnAno('Volkswagen', 'Jetta', 2022), ['1.4T', '2.0T'])
/* El 2.0 viejo y el 2.0 del GLI son el mismo cilindraje y otro motor: tienen
   que verse distinto o el cliente escoge a la suerte. */
/* Dos 1.8 turbo que no son el mismo motor: el 20V del Clasico/GLI y el
   TSI que reemplazo al 2.5 en 2014. */
prueba('el Jetta de 2003 ya tiene el 1.8 turbo del Clásico',
  crudoEnAno('Volkswagen', 'Jetta', 2003), ['1.8T', '2.0'])
prueba('en 2014 conviven el 2.5 y el TSI que lo reemplaza',
  crudoEnAno('Volkswagen', 'Jetta', 2014), ['1.8TSI', '2.0', '2.5'])
prueba('los dos 1.8 turbo se ven distinto',
  motorizaciones.carros.Volkswagen.Jetta.motores
    .filter(x => x.id.indexOf('1.8') === 0).map(x => x.nombre),
  ['1.8 Turbo 20V · 1781 cc', '1.8 TSI · 1798 cc'])
prueba('y nunca se ofrecen el mismo año',
  crudoEnAno('Volkswagen', 'Jetta', 2013).indexOf('1.8TSI'), -1)

prueba('el 2.0 viejo y el 2.0 TSI no se llaman igual',
  motorizaciones.carros.Volkswagen.Jetta.motores
    .filter(x => x.id.indexOf('2.0') === 0).map(x => x.nombre),
  ['2.0 Aspirado · 1984 cc', '2.0 TSI · 1984 cc'])

/* Confirmado: el E46 convivia con cuatro y con seis cilindros, y el 2.0
   de cuatro no es el mismo que el 2.0 de seis. */
prueba('el Serie 3 de 2003 es todo aspirado',
  crudoEnAno('BMW', 'Serie 3', 2003),
  ['1.8', '2.0-4c', '2.0-6c', '2.5-6c', '2.8-6c', '3.0-6c', '3.2-6c'])
prueba('y los dos 2.0 del E46 se ven distinto',
  motorizaciones.carros.BMW['Serie 3'].motores
    .filter(x => x.id.indexOf('2.0-') === 0).map(x => x.nombre),
  ['2.0 Aspirado · 1995 cc · 4 cilindros', '2.0 Aspirado · 1991 cc · 6 cilindros'])
prueba('el de 2024 trae el hibrido enchufable',
  crudoEnAno('BMW', 'Serie 3', 2024).sort(), ['2.0T', '3.0T', '330e'])

prueba('el Yaris viejo y el nuevo son motores distintos',
  crudoEnAno('Toyota', 'Yaris', 2010).concat(crudoEnAno('Toyota', 'Yaris', 2022)),
  ['1.5', '1.5-NR'])
prueba('el Symbol de 2005 lleva el 1.4 y el 1.6',
  crudoEnAno('Renault', 'Symbol', 2005), ['1.4','1.6-16V'])
prueba('y el de 2011 solo el 1.6, que es lo que siguio',
  crudoEnAno('Renault', 'Symbol', 2011), ['1.6-16V'])
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

console.log('\n=== la X1, confirmada ===')
const x1 = a => motoresDe('carros', 'BMW', 'X1', a).map(x => x.id).sort()
prueba('en 2011 el 28i todavía es el 3.0 de seis cilindros',
  x1('2011'), ['2.0-asp', '2.0D', '3.0-6c'])
prueba('en 2013 ya lo reemplazó el 2.0 turbo', x1('2013'),
  ['2.0-asp', '2.0D', '2.0T'])
prueba('en 2017 quedan el turbo y el diésel', x1('2017'), ['2.0D', '2.0T'])
prueba('en 2021 entra el 1.5 de tres cilindros y ya no hay diésel',
  x1('2021'), ['1.5T', '2.0T'])
prueba('en 2025 están el híbrido enchufable y el M35i',
  x1('2025'), ['1.5T', '2.0D-U11', '25e', 'M35i'])
/* El diésel vuelve en 2024 pero es otro motor: no puede aparecer como el
   mismo que el de 2015. */
prueba('el diésel viejo y el nuevo no se confunden',
  motoresDe('carros', 'BMW', 'X1', '2025').filter(x => x.id === '2.0D').length, 0)
prueba('la X1 sí pregunta', pideMotor('carros', 'BMW', 'X1', '2025'), true)

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
/* La bandera va en el MOTOR, no en el modelo: hay carros que se venden a
   gasolina y electricos con el mismo nombre. Decir "el Kwid es electrico"
   le esconderia el filtro de aceite al dueño del de gasolina. */
prueba('al Kwid se le pregunta cual de los dos tiene',
  pideMotor('carros', 'Renault', 'Kwid', '2025'), true)
prueba('el Kwid con el motor de gasolina NO es electrico',
  esElectrico('carros', 'Renault', 'Kwid', '1.0'), false)
prueba('con el E-Tech si', esElectrico('carros', 'Renault', 'Kwid', 'EV'), true)
prueba('y sin saber cual tiene, no se asume',
  esElectrico('carros', 'Renault', 'Kwid'), false)
/* El que no tiene otra cosa si cuenta sin preguntar. */
prueba('el Leaf es electrico aunque no se escoja motor',
  esElectrico('carros', 'Nissan', 'Leaf'), true)
prueba('y el Kwid del 2020 todavia no tenia el electrico',
  motoresDe('carros', 'Renault', 'Kwid', '2020').map(x => x.id), ['1.0'])

console.log('\n=== lo que el usuario encontro revisando ===')
prueba('el Fiesta ST es otro motor, no un acabado',
  motoresDe('carros', 'Ford', 'Fiesta', '2017').map(x => x.id).sort(), ['1.6', '1.6T'])
prueba('y en 2012 todavia no estaba',
  motoresDe('carros', 'Ford', 'Fiesta', '2012').map(x => x.id), ['1.6'])
prueba('el Serie 4 separa el 420i del 440i',
  motoresDe('carros', 'BMW', 'Serie 4', '2022').map(x => x.id).sort(), ['2.0T', '3.0T'])

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

console.log('\n=== modeloCoincideEntero: la frase escrita, no el cuadro de busqueda ===')
/* La floja busca el pedazo donde sea, que es lo que hace falta mientras se
   teclea en el panel. La estricta es para una frase ya escrita, donde
   encontrar la palabra en la mitad de otra es un error con consecuencias. */
prueba('"hero" NO es un Cherokee',
  modeloCoincideEntero('carros', 'Jeep', 'Cherokee', 'hero'), false)
prueba('pero la floja si lo daba por bueno',
  modeloCoincide('carros', 'Jeep', 'Cherokee', 'hero'), true)
prueba('"ram" NO es una Scrambler',
  modeloCoincideEntero('motos', 'Ducati', 'Scrambler', 'ram'), false)
prueba('"scram" si: empieza el nombre',
  modeloCoincideEntero('motos', 'Ducati', 'Scrambler', 'scram'), true)

/* Lo que tiene que seguir funcionando. */
prueba('"yar" trae el Yaris: empieza el nombre',
  modeloCoincideEntero('carros', 'Toyota', 'Yaris', 'yar'), true)
prueba('"boxer" es palabra entera de "Boxer CT 100"',
  modeloCoincideEntero('motos', 'Bajaj', 'Boxer CT 100', 'boxer'), true)
prueba('"np300" es palabra entera de "Frontier NP300"',
  modeloCoincideEntero('carros', 'Nissan', 'Frontier NP300', 'np300'), true)
prueba('"cx5" encuentra el CX-5 sin guion',
  modeloCoincideEntero('carros', 'Mazda', 'CX-5', 'cx5'), true)
prueba('"morning" sigue siendo el Picanto, por el apodo',
  modeloCoincideEntero('carros', 'Kia', 'Picanto', 'morning'), true)
prueba('vacio calza con todo, como la floja',
  modeloCoincideEntero('carros', 'Kia', 'Picanto', ''), true)

console.log(fallos ? `\n${fallos} PRUEBAS FALLIDAS` : '\nTodas las pruebas pasaron')
process.exit(fallos ? 1 : 0)
