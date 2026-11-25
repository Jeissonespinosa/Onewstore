/*
 * Los vehiculos guardados, en un solo lugar.
 *
 * Lo leen y lo escriben cuatro componentes: la pildora del header, el logo,
 * Cris y la linea "Para tu ..." de la pagina. Antes cada uno leia
 * localStorage por su cuenta al montarse, asi que si el header cambiaba el
 * carro, Cris seguia mostrando el anterior hasta recargar.
 *
 * Se guarda POR SECCION: el carro de alguien no es su moto, y en
 * /herramientas no hay vehiculo que valga.
 *
 * El estado es una LISTA con uno activo, hasta MAX:
 *
 *   { v: 2, lista: [{marca, modelo, ano}, ...], activo: 0 }
 *
 * El activo es el que filtra la tienda; los demas quedan a un clic. Quien
 * solo necesita ese (Cris, la linea de la pagina) usa leer(), que devuelve
 * el activo y nada mas.
 *
 * COMPATIBILIDAD: antes se guardaba un vehiculo suelto, sin lista. Esos
 * registros siguen en el navegador de cualquiera que ya haya usado la
 * tienda, asi que leerEstado() los reconoce y los trata como lista de uno.
 * Sin eso, a quien ya tenia carro guardado le aparecia la tienda sin
 * vehiculo despues de publicar.
 */
const CLAVE = 'rx-cris-vehiculo'
const EVENTO = 'rx-vehiculo'

/* Tres son suficientes para el carro propio, el de la casa y el del trabajo;
   mas vuelven la lista algo que hay que leer en vez de reconocer. */
export const MAX_VEHICULOS = 3

export const claveDe = seccion => CLAVE + '-' + seccion

/* La seccion sale de la ruta. Vive aqui para que todos la calculen igual. */
export function seccionDe(path) {
  const p = (path || '').toString().toLowerCase()
  if (p.indexOf('/motos') === 0) return 'motos'
  if (p.indexOf('/herramientas') === 0) return 'herramientas'
  return 'carros'
}

const vacio = () => ({ lista: [], activo: 0 })

const valido = v => !!(v && v.marca && v.modelo)

/* Dos vehiculos son el mismo si coinciden marca, modelo y año. El motor solo
   los separa cuando los dos lo tienen: un Picanto 2015 1.0 y uno 1.25 son
   carros distintos, pero uno sin motor declarado todavia puede ser cualquiera
   de los dos, asi que cuenta como el mismo y al guardarlo se completa. */
const mismoMotor = (a, b) => !a.motor || !b.motor || a.motor === b.motor

export const mismoVehiculo = (a, b) =>
  !!a && !!b && a.marca === b.marca && a.modelo === b.modelo &&
  (a.ano || null) === (b.ano || null) && mismoMotor(a, b)

export function leerEstado(seccion) {
  let crudo = null
  try {
    crudo = window.localStorage.getItem(claveDe(seccion))
  } catch (e) {
    /* Navegador sin almacenamiento, o en modo privado. */
    return vacio()
  }
  if (!crudo) return vacio()
  let d = null
  try {
    d = JSON.parse(crudo)
  } catch (e) {
    return vacio()
  }
  /* Formato viejo: un vehiculo suelto. */
  if (valido(d)) return { lista: [d], activo: 0 }
  const lista = (Array.isArray(d && d.lista) ? d.lista : [])
    .filter(valido)
    .slice(0, MAX_VEHICULOS)
  if (!lista.length) return vacio()
  const n = Number(d && d.activo)
  return { lista, activo: n >= 0 && n < lista.length ? n : 0 }
}

export function escribirEstado(seccion, estado) {
  const lista = (estado && estado.lista ? estado.lista : []).filter(valido).slice(0, MAX_VEHICULOS)
  const n = Number(estado && estado.activo)
  const e = { v: 2, lista, activo: lista.length && n >= 0 && n < lista.length ? n : 0 }
  try {
    if (lista.length) window.localStorage.setItem(claveDe(seccion), JSON.stringify(e))
    else window.localStorage.removeItem(claveDe(seccion))
  } catch (err) {
    /* sin almacenamiento: vale para esta pagina */
  }
  avisar(seccion, e)
  return e
}

/* El vehiculo que esta filtrando la tienda. */
export function leer(seccion) {
  const e = leerEstado(seccion)
  return e.lista[e.activo] || null
}

/* Guardar UN vehiculo desde fuera del panel (Cris). Si ya esta en la lista lo
   activa; si no, lo agrega; si la lista esta llena, reemplaza al activo en vez
   de fallar en silencio. Con null se quita el activo. */
export function escribir(seccion, v) {
  const e = leerEstado(seccion)
  if (!valido(v)) {
    const lista = e.lista.filter((_, i) => i !== e.activo)
    return escribirEstado(seccion, { lista, activo: 0 })
  }
  const ya = e.lista.findIndex(x => mismoVehiculo(x, v))
  if (ya >= 0) {
    /* Lo reemplaza, no solo lo activa: asi el motor que acaba de escoger se
       guarda sobre el que estaba sin declarar, y gana siempre la ultima
       pasada por el embudo. */
    const lista = e.lista.slice()
    lista[ya] = v
    return escribirEstado(seccion, { lista, activo: ya })
  }
  if (e.lista.length < MAX_VEHICULOS) {
    return escribirEstado(seccion, { lista: e.lista.concat([v]), activo: e.lista.length })
  }
  const lista = e.lista.slice()
  lista[e.activo] = v
  return escribirEstado(seccion, { lista, activo: e.activo })
}

/* El evento es lo que mantiene a todos en el mismo carro dentro de la misma
   pestaña; "storage" solo avisa a las OTRAS pestañas, nunca a la propia. */
function avisar(seccion, estado) {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { seccion, estado } }))
  } catch (e) {
    /* CustomEvent no soportado: cada componente se queda con lo suyo */
  }
}

/* Avisa con el estado completo: lo usa el panel, que pinta la lista. */
export function suscribirEstado(seccion, fn) {
  const propio = e => {
    if (e && e.detail && e.detail.seccion === seccion) fn(e.detail.estado)
  }
  const otraPestana = e => {
    if (e && e.key === claveDe(seccion)) fn(leerEstado(seccion))
  }
  try {
    window.addEventListener(EVENTO, propio)
    window.addEventListener('storage', otraPestana)
  } catch (e) {
    return () => {}
  }
  return () => {
    window.removeEventListener(EVENTO, propio)
    window.removeEventListener('storage', otraPestana)
  }
}

/* Avisa solo con el activo: lo usan Cris y la linea de la pagina. */
export function suscribir(seccion, fn) {
  return suscribirEstado(seccion, estado => fn((estado.lista || [])[estado.activo] || null))
}

/* Nombre para mostrar. El año es opcional: se puede guardar un carro sin el.

   Hay 14 modelos cuyo nombre YA empieza por la marca (Mazda 3, Renault 12,
   MG 5...). Pegarle la marca delante daba "Mazda Mazda 3". */
export const nombreDe = v => {
  if (!v || !v.marca) return ''
  const modelo = (v.modelo || '').trim()
  if (modelo.toLowerCase().indexOf(v.marca.toLowerCase() + ' ') === 0) return modelo
  return (v.marca + ' ' + modelo).trim()
}
export const completoDe = v => (v && v.ano ? nombreDe(v) + ' · ' + v.ano : nombreDe(v))

/* El motor va pegado al nombre: "Toyota Corolla 1.8 Híbrido". Dos Corolla
   del mismo año llevan piezas distintas, asi que el nombre tiene que
   distinguirlos o la lista de vehiculos muestra dos renglones iguales. */
export const nombreConMotor = v => {
  const n = nombreDe(v)
  /* "EV" no se escribe al lado del nombre: un Spark EUV no tiene otra
     version, y "Spark EUV EV" no le dice nada a nadie. */
  return v && v.motor && v.motor !== 'EV' ? n + ' ' + v.motor : n
}

/* Un carro 100% electrico no tiene cilindraje, y media tienda no le sirve:
   filtro de aceite, bujias, correa de reparticion, exosto. Saberlo es lo que
   evita que le vendamos algo que su carro no tiene. Los hibridos NO entran
   aqui: siguen llevando motor de gasolina y todos sus repuestos.

   LA BANDERA VA EN EL MOTOR, NO EN EL MODELO. El Kwid se vende a gasolina y
   electrico con el mismo nombre, igual que el 500, el MINI Cooper o el XC40.
   Decir "el Kwid es electrico" le esconderia el filtro de aceite al dueño
   del de gasolina, que es el mismo error al reves.

   Sin motor escogido solo cuenta como electrico el modelo que NO tiene otra
   cosa: un Leaf siempre lo es; un Kwid, hasta que no diga cual tiene, no. */
export function esElectrico(seccion, marca, modelo, motor) {
  if (seccion !== 'carros' || !marca || !modelo) return false
  const ficha = ((motorizaciones.carros || {})[marca] || {})[modelo]
  if (!ficha || !ficha.motores || !ficha.motores.length) return false
  if (motor) {
    const mo = ficha.motores.find(x => x.id === motor)
    return !!(mo && mo.electrico)
  }
  return ficha.motores.every(x => x.electrico)
}

/* Orden de venta en Colombia (estimado, editable). Sirve para dos cosas:
   que las marcas que Cris ofrece de entrada sean las que la gente de verdad
   tiene, y que al escribir "to" salga Toyota antes que Tata. Lo que no esta
   en la lista conserva el orden alfabetico de la base. */
/* ---------------------------------------------------------------------------
   COMO LLAMA EL CLIENTE A SU CARRO

   Dos cosas distintas que la gente escribe y que la base no conoce:

   APODOS son nombres de generacion o de carroceria que SI identifican un
   modelo: el que dice "Morning" tiene un Picanto, el que dice "Spice" tiene
   un Rio. Buscarlos lleva al modelo.

   VERSIONES son acabados: Zenith, Vibrant, Summa, LTZ. Van en media marca a
   la vez, asi que no sirven para escoger el carro. Pero el cliente los lee en
   la LINEA de su tarjeta de propiedad y los escribe. A ese hay que decirle
   que eso es la version, no el modelo, en vez de dejarle la lista vacia.
   --------------------------------------------------------------------------- */
export const APODOS = {
  carros: {
    Kia: {
      Picanto: ['Morning', 'Ion', 'X-Line', 'XTreme'],
      Rio: ['Spice', 'Xcite', 'Stylus'],
      'K2700 K3000': ['Camioncito', 'Furgon Kia'],
    },
    Chevrolet: {
      Aveo: ['Aveo Family'],
      'Spark GT': ['Spark'],
      'Spark EUV': ['Spark eléctrico', 'Spark SUV', 'Spark nuevo'],
      Joy: ['Beat'],
      'Luv D-Max': ['Dmax viejo'],
      Sprint: ['Swift Sprint'],
      N300: ['Van N300', 'Mover'],
      Trailblazer: ['Trail Blazer'],
    },
    Renault: {
      Stepway: ['Sandero Stepway'],
      Kwid: ['Kwid Outsider', 'Kwid E-Tech'],
      'Renault 4': ['R4', 'Cuatro latas', 'Amigo fiel'],
      'Renault 6': ['R6'],
      'Renault 9': ['R9'],
      'Renault 12': ['R12'],
      'Renault 18': ['R18'],
      'Renault 19': ['R19'],
      'Renault 21': ['R21'],
      Twingo: ['Tuingo'],
      'Duster Oroch': ['Oroch'],
    },
    Hyundai: {
      'Grand i10': ['i10 Grand'],
      Accent: ['Accent Vision', 'Verna'],
      'Tucson ix35': ['ix35'],
      'H100 Porter': ['Porter'],
    },
    Toyota: {
      'Yaris Cross': ['Yaris Cross HEV'],
      Hilux: ['Hilux SRV', 'Hilux Revo', 'Hilux Vigo'],
      'Land Cruiser FJ40 FJ43 Campero': ['Campero Toyota', 'FJ40', 'FJ43'],
      'Land Cruiser 70 Macho': ['Macho'],
      'Land Cruiser Burbuja': ['Burbuja'],
      Prado: ['Land Cruiser Prado', 'Prado Sumo', 'Prado TX'],
    },
    Mazda: {
      'MX-5': ['Miata'],
      'Mazda 3': ['M3', 'Mazda tres'],
      'Mazda 2': ['M2', 'Mazda dos'],
      Allegro: ['323 Allegro'],
      'B-2200 B-2600': ['B2200', 'B2600', 'Mazda estacas'],
    },
    Nissan: {
      'Frontier NP300': ['NP300'],
      'D21 D22 Frontier': ['D21', 'D22', 'Frontier vieja'],
      'Sentra B13': ['B13'],
      Urvan: ['Van Urvan'],
    },
    Suzuki: {
      'Grand Vitara clásico': ['Grand Vitara vieja', 'Grand Nomade'],
      'Vitara clásico': ['Vitara vieja'],
      'Super Carry': ['Carry', 'Supercarry'],
      'SJ410 SJ413': ['SJ410', 'SJ413', 'Samurai viejo'],
    },
    Volkswagen: {
      Escarabajo: ['Beetle', 'Cucarrón', 'Volky'],
      'Combi Kombi': ['Combi', 'Kombi'],
      Crossfox: ['Fox Cross'],
      Gol: ['Gol Power', 'Gol Trend'],
    },
    Ford: {
      'F-150': ['F150', 'Efe 150'],
      'F-250 F-350': ['F250', 'F350'],
      'Ranger clásica': ['Ranger vieja'],
      'Fiesta Sedán': ['Fiesta sedan', 'Ikon'],
    },
    Mitsubishi: {
      'Montero Pajero': ['Pajero'],
      'Montero clásico': ['Montero viejo'],
      'L200 Sportero': ['Sportero', 'L200'],
      Nativa: ['Montero Nativa'],
    },
    Honda: {
      'CR-V': ['CRV'],
      'HR-V': ['HRV'],
      'BR-V': ['BRV'],
      'WR-V': ['WRV'],
    },
    Fiat: {
      'Uno clásico': ['Uno viejo'],
      Mobi: ['Fiat Mobi'],
    },
    Jeep: {
      'Willys CJ': ['Willys', 'Yipao', 'CJ'],
      'Cherokee clásico XJ': ['XJ', 'Cherokee viejo'],
    },
  },
  motos: {
    Bajaj: {
      'Boxer CT 100': ['CT100', 'Boxer 100'],
      'Boxer BM 150': ['BM150'],
      'Pulsar 160 NS': ['NS160', 'NS 160'],
      'Pulsar 200 NS': ['NS200', 'NS 200'],
      'Pulsar 200 RS': ['RS200'],
      'Pulsar N160': ['N160'],
      'Pulsar N250': ['N250'],
      'Discover 100 125': ['Discover'],
      'Platina 100 125': ['Platina'],
      'RE mototaxi': ['Mototaxi', 'Tuk tuk'],
      'Qute motocarro': ['Motocarro'],
    },
    Yamaha: {
      'FZ 2.0 FZ-S': ['FZS', 'FZ 2.0', 'FZ S'],
      'FZ-S 3.0 FI': ['FZS 3.0'],
      'Crypton 115 FI': ['Crypton'],
      'BWS 125 FI': ['BWS'],
      'YB 125 YBR 125': ['YBR', 'YB125'],
      'Libero 110 125': ['Libero'],
      'N-Max Connected': ['NMax Connected'],
      'Ténéré 250': ['Tenere 250'],
      'Ténéré 700': ['Tenere 700'],
    },
    Honda: {
      'CG 125 Titan': ['Titan'],
      'Splendor Hero Honda': ['Splendor'],
      'Eco Deluxe 100': ['Eco 100'],
      'NXR 160 Bros': ['Bros'],
      'NX 4 Falcon': ['Falcon'],
      'C90 Econo Power': ['Econo Power', 'C90'],
    },
    AKT: {
      'AK 125 CR4': ['CR4'],
      'AK 110 Special': ['AK110'],
      'NKD 125': ['NKD'],
      'Carguero AK 3W': ['Carguero', 'Motocarro AKT'],
    },
    Suzuki: {
      'AX 100': ['AX100'],
      'EN 125': ['EN125'],
      'Viva 115': ['Viva'],
      "Let's AN 125": ['Lets', 'AN125'],
    },
    TVS: {
      'Apache RTR 160': ['Apache 160'],
      'Apache RTR 180': ['Apache 180'],
      'Apache RTR 200 4V': ['Apache 200'],
      'King motocarro': ['Motocarro TVS', 'King'],
    },
    Hero: {
      'Eco Deluxe 100': ['Eco 100'],
      'Splendor iSmart': ['Splendor i Smart'],
    },
  },
}

export const VERSIONES = {
  Kia: ['Zenith', 'Vibrant', 'Desire', 'Emotion', 'Summa', 'GT Line'],
  Chevrolet: ['LS', 'LT', 'LTZ', 'Premier', 'Activ', 'RS'],
  Renault: ['Life', 'Zen', 'Intens', 'Iconic', 'Dynamique', 'Expression'],
  Toyota: ['XS', 'XLS', 'XEI', 'SRV', 'SR', 'Limited', 'Seg'],
  Mazda: ['Prime', 'Touring', 'Grand Touring', 'Carbon'],
  Nissan: ['Sense', 'Advance', 'Exclusive', 'Platinum'],
  Suzuki: ['GL', 'GLX', 'Delta'],
  Hyundai: ['GL', 'GLS', 'Premium', 'Limited'],
}

/* Sin tildes y en minuscula: nadie escribe "Mégane" con tilde en el celular. */
export const plano = t => String(t || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/* Sin guiones ni espacios: "cx5" encuentra el CX-5, "np300" la Frontier
   NP300 y "cb125f" la CB 125F. La gente no escribe el guion. */
export const compacto = t => plano(t).replace(/[^a-z0-9]/g, '')

const apodosDe = (seccion, marca, modelo) =>
  (((APODOS[seccion] || {})[marca] || {})[modelo] || [])

/* Un modelo responde a lo que escribieron si lo dice su nombre o uno de sus
   apodos. "yar" trae Yaris, Yaris Cross y Yaris Hatchback; "morning" trae
   Picanto aunque esa palabra no este en la base. */
export function modeloCoincide(seccion, marca, modelo, texto) {
  const q = compacto(texto)
  if (!q) return true
  if (compacto(modelo).includes(q)) return true
  return apodosDe(seccion, marca, modelo).some(a => compacto(a).includes(q))
}

/* Si lo que escribieron es un acabado, devuelve como se escribe de verdad,
   para poder explicarselo. Null si no lo es. */
export function esVersion(marca, texto) {
  const q = plano(texto)
  if (q.length < 2) return null
  const lista = VERSIONES[marca] || []
  return lista.find(v => plano(v) === q || plano(v).startsWith(q)) || null
}

export const RANK_MARCAS = {
  carros: [
    'Chevrolet', 'Renault', 'Mazda', 'Kia', 'Toyota', 'Nissan', 'Suzuki',
    'Hyundai', 'Volkswagen', 'Ford', 'BMW', 'Mercedes-Benz', 'Audi',
    'Mitsubishi', 'Honda', 'Jeep', 'Peugeot', 'Fiat', 'BYD', 'Chery',
    'Citroën', 'Subaru', 'Volvo', 'JAC', 'Great Wall', 'SsangYong',
    'Land Rover', 'MG', 'Changan', 'Dodge', 'RAM',
  ],
  motos: [
    'Bajaj', 'AKT', 'Yamaha', 'Honda', 'Suzuki', 'TVS', 'Hero', 'KTM',
    'Kawasaki', 'Royal Enfield', 'Benelli', 'Kymco', 'SYM', 'CFMoto',
    'Ducati', 'Harley-Davidson',
  ],
}

/* Modelos mas vendidos por marca: ordenan el paso "¿Que Toyota tienes?" para
   que Corolla y Hilux salgan antes que Coaster. Solo las marcas de mayor
   volumen; el resto va alfabetico.

   EL NOMBRE TIENE QUE SER EXACTO al de vehiculos-colombia.json. Seis estaban
   escritos de otra forma ("Land Cruiser" por "Land Cruiser 200", "FZ 2.0" por
   "FZ 2.0 FZ-S") y simplemente no rankeaban: la busqueda no fallaba, solo
   ordenaba mal y nadie lo notaba. scripts/validar-motorizaciones.py lo revisa. */
export const RANK_MODELOS = {
  Chevrolet: ['Onix', 'Spark GT', 'Sail', 'Tracker', 'Aveo', 'Captiva', 'Optra', 'Beat', 'Cruze', 'Corsa', 'Joy', 'Groove', 'D-Max'],
  Renault: ['Sandero', 'Logan', 'Kwid', 'Duster', 'Stepway', 'Twingo', 'Symbol', 'Captur', 'Mégane', 'Koleos'],
  Mazda: ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5', 'CX-3', 'BT-50', 'Mazda 6', 'Allegro'],
  Kia: ['Picanto', 'Rio', 'Sportage', 'Cerato', 'Seltos', 'Sonet', 'Carnival', 'Sorento', 'Soul'],
  Toyota: ['Corolla', 'Hilux', 'Fortuner', 'Prado', 'Yaris', 'RAV4', 'Corolla Cross', 'Land Cruiser 200'],
  Nissan: ['Versa', 'Kicks', 'March', 'Sentra', 'Frontier NP300', 'X-Trail', 'Qashqai', 'Tiida'],
  Suzuki: ['Swift', 'Vitara', 'Jimny', 'Grand Vitara', 'S-Presso', 'Baleno', 'Alto'],
  Hyundai: ['Tucson', 'Accent', 'i10', 'Grand i10', 'Creta', 'Kona', 'Santa Fe', 'Elantra'],
  Volkswagen: ['Gol', 'Jetta', 'T-Cross', 'Polo', 'Tiguan', 'Amarok', 'Golf', 'Fox'],
  Ford: ['EcoSport', 'Ranger', 'Fiesta', 'Escape', 'Explorer', 'Focus', 'F-150'],
  BMW: ['Serie 3', 'X1', 'Serie 1', 'X3', 'Serie 2', 'X5', 'Serie 5'],
  'Mercedes-Benz': ['Clase C', 'GLC', 'Clase A', 'GLA', 'CLA', 'Clase E', 'GLB', 'GLE ML'],
  Bajaj: ['Boxer CT 100', 'Pulsar 160 NS', 'Pulsar N160', 'Pulsar 180', 'Pulsar 150', 'Discover 100 125', 'Dominar 400', 'Platina 100 125'],
  AKT: ['NKD 125', 'AK 125 CR4', 'TTR 200', 'TTR 180', 'Flex 125', 'AK 110 Special'],
  Yamaha: ['NMax', 'FZ 2.0 FZ-S', 'XTZ 150', 'FZ 25', 'Crypton 115 FI', 'BWS 125 FI', 'MT-15', 'XTZ 125'],
  Honda: ['CB 125F', 'Wave 110', 'XR 150L', 'CB 160F', 'Dio', 'Navi', 'CB 190R', 'CB 110'],
}

/* Categorias que Cris ofrece cuando ya hay vehiculo guardado y la caja esta
   vacia: lo mas vendido, para no dejar el panel en blanco. */
export const POPULARES = {
  carros: ['Pastillas de freno', 'Filtros de aceite', 'Amortiguadores', 'Baterías para carro', 'Llantas'],
  motos: ['Pastillas de freno', 'Kits de arrastre', 'Filtros de aceite', 'Baterías para moto', 'Llantas'],
  herramientas: [],
}

/* Posicion de una marca o modelo en el ranking; lo no listado va al final
   pero conserva su orden relativo. */
export const posMarca = (seccion, marca) => {
  const i = (RANK_MARCAS[seccion] || []).indexOf(marca)
  return i < 0 ? 900 : i
}
export const posModelo = (marca, modelo) => {
  const i = (RANK_MODELOS[marca] || []).indexOf(modelo)
  return i < 0 ? 900 : i
}

/* ------------------------------------------------------------------
   Abrir el panel desde fuera.

   La linea "Para tu Chevrolet Onix" vive en la pagina y su boton Cambiar
   tiene que abrir el panel, que vive en el header. Son dos componentes sin
   padre comun, asi que se hablan por evento en vez de levantar un contexto
   global para un solo boton.
   ------------------------------------------------------------------ */
const ABRIR = 'rx-vehiculo-abrir'

export function pedirAbrir(seccion) {
  try {
    window.dispatchEvent(new CustomEvent(ABRIR, { detail: { seccion } }))
  } catch (e) {
    /* sin CustomEvent el boton no abre nada; el header sigue estando ahi */
  }
}

export function alPedirAbrir(seccion, fn) {
  const oir = e => {
    if (e && e.detail && e.detail.seccion === seccion) fn()
  }
  try {
    window.addEventListener(ABRIR, oir)
  } catch (e) {
    return () => {}
  }
  return () => window.removeEventListener(ABRIR, oir)
}

/* ------------------------------------------------------------------
   La ruta publica, la misma en el servidor y en el navegador.

   route.path NO sirve: en una pagina nativa de categoria VTEX entrega
   su ruta interna de enrutamiento

     /_v/segment/routing/vtex.store@2.x/subcategory/515/motos/frenos/...

   que no empieza por /motos, asi que el servidor creia estar en carros
   y el navegador en motos. React hidrataba por posicion y mezclaba los
   dos dibujos: el icono salia con las ruedas de la moto y la carroceria
   del carro. No era un parpadeo, era un icono roto.

   canonicalPath si trae /motos/frenos/... y existe en los dos lados.
   ------------------------------------------------------------------ */
export function rutaDe(route) {
  const r = route || {}
  if (r.canonicalPath) return r.canonicalPath.split('?')[0]
  const dpto = r.params && r.params.department
  if (dpto) return '/' + dpto
  if (typeof window !== 'undefined' && window.location) return window.location.pathname
  return (r.path || '').split('?')[0]
}

/* ------------------------------------------------------------------
   Motorizaciones.

   Solo se le pregunta el motor a quien de verdad lo necesita:

     - la seccion es carros (en motos el cilindraje ya va en el nombre
       del modelo: Pulsar 160, XTZ 150)
     - el modelo esta en la tabla y marcado "verificado"
     - a ese modelo y ESE AÑO le corresponde mas de un motor

   Lo demas se salta el paso. Un modelo con un solo motor no gana nada
   preguntando, y uno sin verificar podria ofrecer un motor que no
   existio: preferimos no preguntar a preguntar mal.
   ------------------------------------------------------------------ */
import motorizaciones from './data/motorizaciones.json'

/* QUE SE LE MUESTRA AL CLIENTE. Tres niveles de respaldo, y los dos
   primeros se muestran:

     verificado    lo confirmo una persona contra el catalogo
     investigado   lo investigue contra fuentes publicas colombianas y pasa
                   las validaciones automaticas
     por-confirmar nadie lo ha mirado: no se muestra

   La diferencia entre los dos primeros no es academica. Las fuentes
   publicas se contradicen —el 1.4 16V del Symbol existia en una y no en
   otra, y lo resolvio una confirmacion, no la investigacion—, asi que
   "investigado" se muestra pero queda distinguible para revisarlo por
   muestreo. Borrar esa diferencia seria perder el unico rastro de que
   dato esta respaldado y cual no. */
const MUESTRA = ['verificado', 'investigado']

export function motoresDe(seccion, marca, modelo, ano) {
  if (seccion !== 'carros' || !marca || !modelo) return []
  const ficha = ((motorizaciones.carros || {})[marca] || {})[modelo]
  if (!ficha) return []
  if (MUESTRA.indexOf(ficha.fuente) < 0) return []
  const y = Number(ano)
  return (ficha.motores || []).filter(m => {
    if (!y) return true
    if (m.desde && y < m.desde) return false
    if (m.hasta && y > m.hasta) return false
    return true
  })
}

/* ¿Hay que mostrar el paso? Solo si hay mas de uno donde elegir. */
export const pideMotor = (seccion, marca, modelo, ano) =>
  motoresDe(seccion, marca, modelo, ano).length > 1

export const nombreMotor = (seccion, marca, modelo, id) => {
  if (!id) return ''
  const m = motoresDe(seccion, marca, modelo, null).find(x => x.id === id)
  return m ? m.nombre : id
}

/* ---------------------------------------------------------------------------
   EL VEHICULO QUE VIENE EN LA URL

   Cris navega poniendo el vehiculo como filtro en la ruta:

     /carros/frenos/2021/corolla/toyota?map=c,c,ano,modelo,marca-vehiculo

   Las dos listas van pareadas por posicion: el segmento i de la ruta es del
   tipo i del map. Asi la pagina puede saber por que carro esta filtrando sin
   depender de lo que haya en el almacenamiento, que es lo que permite darse
   cuenta de que el cliente esta viendo un carro distinto al suyo.
   --------------------------------------------------------------------------- */
const LLAVES_VEH = { 'marca-vehiculo': 'marca', modelo: 'modelo', ano: 'ano' }

const pares = (ruta, busca) => {
  const map = String(busca || '').replace(/^\?/, '').split('&')
    .map(p => p.split('='))
    .filter(p => p[0] === 'map')
    .map(p => decodeURIComponent(p[1] || ''))[0]
  const tipos = (map || '').split(',').filter(Boolean)
  const segmentos = String(ruta || '').split('/').filter(Boolean).map(decodeURIComponent)
  if (!tipos.length || tipos.length !== segmentos.length) return null
  return segmentos.map((s, i) => [tipos[i], s])
}

/* El nombre de verdad a partir del segmento: la ruta trae "toyota" y la base
   "Toyota", "mazda-3" y "Mazda 3". */
const nombreReal = (lista, segmento) =>
  lista.find(n => compacto(n) === compacto(segmento)) || null

export function vehiculoDeRuta(ruta, busca, base) {
  const ps = pares(ruta, busca)
  if (!ps) return null
  const crudo = {}
  ps.forEach(([tipo, seg]) => {
    const campo = LLAVES_VEH[tipo]
    if (campo) crudo[campo] = seg
  })
  if (!crudo.marca) return null
  const marcas = Object.keys(base || {})
  const marca = nombreReal(marcas, crudo.marca)
  if (!marca) return null
  const modelo = crudo.modelo ? nombreReal(Object.keys(base[marca] || {}), crudo.modelo) : null
  return { marca, modelo, ano: crudo.ano || null }
}

/* La misma pagina con otro vehiculo, o sin ninguno. Conserva la categoria y
   cualquier otro filtro (medida de llanta, posicion, marca del repuesto). */
export function rutaConVehiculo(ruta, busca, veh) {
  const ps = pares(ruta, busca)
  if (!ps) return null
  const otros = ps.filter(([tipo]) => !LLAVES_VEH[tipo])
  const slug = t => compacto(t) && plano(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (veh && veh.marca) {
    /* Las dos insignias cuando el carro es gemelo: VTEX suma los valores
       repetidos del mismo filtro (verificado: 12 + 6 = 18), asi que la
       pieza aparece este etiquetada como Chevrolet o como Suzuki. */
    marcasDelCarro('carros', veh.marca, veh.modelo, veh.ano)
      .forEach(ma => otros.push(['marca-vehiculo', slug(ma)]))
    if (veh.modelo) otros.push(['modelo', slug(veh.modelo)])
    if (veh.ano) otros.push(['ano', String(veh.ano)])
  }
  if (!otros.length) return null
  return '/' + otros.map(p => p[1]).join('/') + '?map=' + otros.map(p => p[0]).join(',')
}

/* ---------------------------------------------------------------------------
   EL MISMO CARRO CON DOS INSIGNIAS

   En Colombia media gama de Suzuki, Isuzu y Opel se vendio como Chevrolet. El
   Swift, el Vitara, la Luv, el Corsa: mismo carro, misma pieza, otro emblema
   en la parrilla. Si el repuesto quedo etiquetado bajo una marca y el cliente
   escoge la otra, la pagina le dice que no tenemos algo que si tenemos.

   LO QUE LO DECIDE ES EL AÑO, no el nombre. Tres casos del mismo listado NO
   son gemelos porque sus años no se tocan — son nombres reciclados en carros
   distintos, y confundirlos seria peor que el problema original:

     Vitara        Chevrolet 1993-2006  vs  Suzuki 2016-2027
     Grand Vitara  Chevrolet 1999-2015  vs  Suzuki 2023-2027
     Jimny         Chevrolet 1998-2007  vs  Suzuki 2019-2027

   Tampoco es este caso el de dos marcas que repiten nombre sin compartir
   nada: la Frontier de Kia y la de Nissan son dos camionetas distintas, y
   ahi preguntar cual es lo correcto.
   --------------------------------------------------------------------------- */
export const GEMELOS = [
  { modelo: 'Alto', marcas: ['Chevrolet', 'Suzuki'], desde: 1999, hasta: 2010 },
  { modelo: 'Astra', marcas: ['Chevrolet', 'Opel'], desde: 1999, hasta: 2006 },
  { modelo: 'Corsa', marcas: ['Chevrolet', 'Opel'], desde: 1996, hasta: 2007 },
  { modelo: 'Luv', marcas: ['Chevrolet', 'Isuzu'], desde: 1980, hasta: 2005 },
  { modelo: 'Rodeo', marcas: ['Chevrolet', 'Isuzu'], desde: 1998, hasta: 2004 },
  { modelo: 'Samurai', marcas: ['Chevrolet', 'Suzuki'], desde: 1990, hasta: 2000 },
  { modelo: 'Super Carry', marcas: ['Chevrolet', 'Suzuki'], desde: 1993, hasta: 2007 },
  { modelo: 'Swift', marcas: ['Chevrolet', 'Suzuki'], desde: 1991, hasta: 2004 },
  { modelo: 'Trooper', marcas: ['Chevrolet', 'Isuzu'], desde: 1986, hasta: 2002 },
  { modelo: 'Vectra', marcas: ['Chevrolet', 'Opel'], desde: 1997, hasta: 2003 },
  { modelo: 'Zafira', marcas: ['Chevrolet', 'Opel'], desde: 2001, hasta: 2005 },
]

/* Las marcas por las que hay que filtrar para este carro: una, o las dos del
   gemelo cuando el año cae en la ventana compartida. Sin año no se arriesga
   —un Swift puede ser el viejo o el moderno— y devuelve solo la suya. */
export function marcasDelCarro(seccion, marca, modelo, ano) {
  if (seccion !== 'carros' || !marca || !modelo) return marca ? [marca] : []
  const y = Number(ano)
  const g = GEMELOS.find(x =>
    plano(x.modelo) === plano(modelo) && x.marcas.indexOf(marca) >= 0 &&
    y && y >= x.desde && y <= x.hasta)
  return g ? g.marcas.slice() : [marca]
}
