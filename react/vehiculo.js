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

/* Dos vehiculos son el mismo si coinciden marca, modelo y año. */
export const mismoVehiculo = (a, b) =>
  !!a && !!b && a.marca === b.marca && a.modelo === b.modelo &&
  (a.ano || null) === (b.ano || null)

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
  if (ya >= 0) return escribirEstado(seccion, { lista: e.lista, activo: ya })
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

/* Orden de venta en Colombia (estimado, editable). Sirve para dos cosas:
   que las marcas que Cris ofrece de entrada sean las que la gente de verdad
   tiene, y que al escribir "to" salga Toyota antes que Tata. Lo que no esta
   en la lista conserva el orden alfabetico de la base. */
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
