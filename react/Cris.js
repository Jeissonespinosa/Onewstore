/*
 * Cris — buscador de Repuestox.
 *
 * Reemplaza al search-bar de VTEX. Interpreta la frase completa en vez de
 * mandarla cruda al buscador: separa la CATEGORIA del VEHICULO, entiende
 * medidas de llanta y referencias, y pide solo lo que falte.
 *
 *   "pastillas toyota hilux 2018"  -> categoria + vehiculo, lista
 *   "frenos toyota"                -> falta el modelo: lo propone
 *   "205/55 R16"                   -> medida de llanta
 *   "bujias"                       -> categoria sin vehiculo (busqueda valida)
 *
 * BUSCAR CON UN VEHICULO NO ES GUARDARLO. Son dos cosas:
 *
 *   escribirlo   "llantas para toyota corolla" filtra por ese carro en ESA
 *                busqueda y ya. Puede ser el carro de un cliente.
 *   elegirlo     tocar marca -> modelo -> año si guarda, y entonces queda
 *                fijado arriba de la caja y en el navegador, asi que las
 *                busquedas siguientes lo usan sin volver a escribirlo.
 *
 * Antes cualquier frase con marca pisaba el vehiculo guardado, y la tienda
 * quedaba filtrada por un carro que el cliente nunca dijo que fuera suyo.
 *
 * Secciones: en /carros consulta la base de carros y en /motos la de motos
 * (una Hilux no debe aparecer buscando en motos). En /herramientas no hay
 * vehiculo: una llave no le sirve "a un carro", asi que ahi Cris solo busca
 * producto y no pide marca ni modelo.
 *
 * El indice de categorias (cris-index.json) lo genera scripts/gen-categorias.py
 * desde el mismo arbol que crea las paginas, para que no se desincronice.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import indice from './cris-index.json'
import vehiculos from './data/vehiculos-colombia.json'
/* El ranking y el almacen del vehiculo son compartidos con la pildora del
   header: una sola fuente, o los dos componentes se desincronizan. */
import {
  POPULARES, posMarca, posModelo, rutaDe, esElectrico, modeloCoincide,
  leer as leerVehiculo, escribir as escribirVehiculo, suscribir,
  leerEstado, suscribirEstado, pedirAbrir, nombreDe, MAX_VEHICULOS,
} from './vehiculo'
import { buscarEnTienda, masBuscado } from './buscar'

const CSS_HANDLES = ['cris', 'crisInput', 'crisVehicle', 'crisSuggestions', 'crisStep']
const VACIO = { sugerencias: [], marcas: [], productos: [], patrocinados: [], banner: null }
const RED = '#FF371E'
const INK = '#010101'

const norm = s =>
  (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const toks = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 1)

/* La seccion sale de la ruta: decide que base de vehiculos se consulta y si
   se pide vehiculo del todo. */
function seccionDe(path) {
  const p = norm(path)
  if (p.indexOf('/motos') === 0) return 'motos'
  if (p.indexOf('/herramientas') === 0) return 'herramientas'
  return 'carros'
}

/* Indice de busqueda: cada nodo entra con su nombre y con cada sinonimo.
   Las herramientas entran siempre, porque sirven para carro y para moto. */
function construirIndice(seccion) {
  const entradas = []
  /* En herramientas se busca SOLO herramientas: una llave no se compra "para
     un carro". En carros y motos entran ademas las herramientas, que sirven
     para los dos. */
  const permitidas =
    seccion === 'herramientas'
      ? ['Herramientas']
      : [seccion === 'motos' ? 'Motos' : 'Carros', 'Herramientas']
  indice.nodos.forEach(n => {
    if (permitidas.indexOf(n.seccion) < 0) return
    const alias = [n.nombre].concat(n.sinonimos || [])
    alias.forEach(a => {
      const palabras = toks(a.replace(/\(.*?\)/g, ' '))
      if (!palabras.length) return
      entradas.push({ nodo: n, palabras, alias: a })
      /* La gente escribe una palabra, no el nombre completo: "pastillas" debe
         llevar a "Pastillas de freno". Se indexa tambien la primera palabra
         sola cuando es larga y el nodo es profundo, con menos puntaje para que
         nunca le gane a una coincidencia completa. */
      if (palabras.length > 1 && palabras[0].length >= 5 &&
          n.path.split('/').length >= 3) {
        entradas.push({ nodo: n, palabras: [palabras[0]], alias: a, parcial: true })
      }
    })
    const parentesis = n.nombre.match(/\((.*?)\)/)
    if (parentesis) {
      const palabras = toks(parentesis[1])
      if (palabras.length) entradas.push({ nodo: n, palabras, alias: parentesis[1] })
    }
  })
  return entradas
}

/* Gana la entrada que cubre mas palabras de la frase; a igualdad, la mas
   profunda (la hoja es mas util que la macro). */
function buscarCategoria(entradas, palabras) {
  let mejor = null
  let mejorPuntaje = 0
  entradas.forEach(e => {
    /* El prefijo exige que AMBAS palabras sean largas: sin esto
       "hidrolavadora" coincidia con la "HID" de "Xenon (HID)". */
    const aciertos = e.palabras.filter(w =>
      palabras.some(
        q =>
          q === w ||
          (q.length >= 4 && w.length >= 4 && (w.indexOf(q) === 0 || q.indexOf(w) === 0))
      )
    )
    if (aciertos.length !== e.palabras.length) return
    const profundidad = e.nodo.path.split('/').length
    const puntaje = e.parcial ? 4 : aciertos.length * 10 + profundidad
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      mejor = { ...e, usadas: aciertos }
    }
  })
  return mejor
}

/* Medida de llanta.
     carro  205/55R16, 205/55 R16, 205-55-16
     moto   90/90-18, 110/90 17   (ancho de dos digitos)

   El ancho de dos digitos es lo que faltaba: con \d{3} una medida de moto no
   se reconocia y la busqueda caia a texto libre.

   Las guardas evitan leer una fecha o un codigo como medida: no hay llanta de
   menos de 50 de ancho ni rin fuera de 8-26. */
function medidaLlanta(texto) {
  const m = texto.match(/\b(\d{2,3})\s*[/x-]\s*(\d{2})\s*(?:r|zr|-)?\s*(\d{2}(?:\.5)?)\b/i)
  if (!m) return null
  if (+m[1] < 50 || parseFloat(m[3]) < 8 || parseFloat(m[3]) > 26) return null
  return {
    ancho: m[1],
    perfil: m[2],
    rin: m[3],
    texto: m[0],
    /* Formato unico para el facet "Medida" de moto. Tiene que ser el mismo
       que la plantilla del seller ofrece, o el filtro no casa con nada. */
    completa: m[1] + '/' + m[2] + '-' + m[3],
  }
}

/* ¿Se aplica el vehiculo como filtro? Es la regla que decide si la pagina
   sale con los repuestos del cliente o con todo el catalogo, y la que estaba
   mal: devolvia false para "ajuste" siempre, asi que quien buscaba "llantas
   toyota corolla" veia tambien la llanta del Hilux.

     estricta   encaja o no encaja            -> siempre
     ajuste     manda un atributo             -> solo si el cliente nombro el
                                                 vehiculo en esta busqueda
     universal  le sirve a cualquiera         -> nunca

   Con medida de llanta nunca: 185/65R15 ya dice lo unico que importa y
   sumarle el vehiculo con AND solo puede vaciar la pagina. */
function vehiculoAplica(compat, explicito, hayLlanta) {
  if (hayLlanta) return false
  if (compat === 'estricta') return true
  if (compat === 'ajuste') return !!explicito
  return false
}

/* Modelos que calzan con lo escrito cuando NO nombraron la marca: "frenos
   corolla" en vez de "frenos toyota corolla".

   La regla es al reves de lo que uno escribiria primero: no es que el nombre
   del modelo quepa en la frase, es que las palabras de la frase esten en el
   nombre del modelo. Con la otra regla "frontier" solo encontraba la Kia
   Frontier —la Nissan se llama "Frontier NP300" y pedia esas dos palabras—
   y el cliente de una Nissan, que son la mayoria, recibia la pieza de otra
   camioneta sin enterarse.

   Devuelve TODOS los que calzan, sin escoger: si "Swift" es de Suzuki y de
   Chevrolet, los dos salen y decide el cliente. Adivinar la marca es como
   terminamos trayendo llantas de Hilux para un Corolla.

   Primero el que se llama exactamente asi ("Corolla" antes que "Corolla
   Cross"); despues manda el ranking de ventas. */
function modelosQueCalzan(base, palabras, vocabCategorias, comparar, orden) {
  /* Las palabras que nombran una categoria no son el carro: en "frenos
     corolla" el carro es "corolla". El vocabulario sale del mismo indice de
     categorias, asi que no hay una lista a mano que se desactualice. */
  const vocab = vocabCategorias || new Set()
  const calza = comparar || ((m, mo, p) => toks(mo).indexOf(p) >= 0)
  const utiles = palabras.filter(p => p.length >= 3 && !vocab.has(p))
  if (!utiles.length) return []
  const halla = []
  Object.keys(base || {}).forEach(m => {
    Object.keys(base[m] || {}).forEach(mo => {
      const mt = toks(mo)
      if (!mt.length) return
      /* Calza por nombre, por apodo o sin guiones: "cx5" es el CX-5,
         "morning" es el Picanto y "ns160" la Pulsar 160 NS. Lo decide el
         mismo comparador que usa el panel de vehiculos del header. */
      if (!utiles.every(p => calza(m, mo, p))) return
      const exacto = mt.length === utiles.length && utiles.every(p => mt.indexOf(p) >= 0)
      halla.push({ marca: m, modelo: mo, exacto })
    })
  })
  const pos = orden || (() => 0)
  halla.sort((a, b) => {
    if (a.exacto !== b.exacto) return a.exacto ? -1 : 1
    return pos(a) - pos(b)
  })
  return halla.map(c => ({ marca: c.marca, modelo: c.modelo }))
}

/* ------------------------------------------------------------------
   CRUCE DE SECCION: lo escrito no vive donde esta parado el cliente.

   Caso real que lo motivo: alguien busco "boxer ct" en Carros. En Carros
   "boxer" SI calza — es el Peugeot Boxer, una van que se vendio aca — asi
   que Cris lo daba por leido, le pedia el año del Peugeot y lo mandaba a
   pastillas filtradas por un carro que no es el suyo. Ahi no hay nada
   declarado, y debajo le aparecieron las pastillas del Chevrolet Aveo. El
   cliente vio una pastilla "para su Boxer" que es de otro vehiculo: eso es
   una devolucion, y de las caras.

   El nombre de un modelo no es unico entre las tres secciones. Cuando lo
   escrito tambien nombra un vehiculo de otra, Cris no escoge por el cliente:
   lo dice y le ofrece el cambio.
   ------------------------------------------------------------------ */
const OTRAS_SECCIONES = {
  carros: ['motos'],
  motos: ['carros'],
  /* En herramientas no hay vehiculo, pero quien escribe ahi el nombre de su
     moto esta buscando repuestos, no una llave. */
  herramientas: ['carros', 'motos'],
}

const NOMBRE_SECCION = { carros: 'Carros', motos: 'Motos', herramientas: 'Herramientas' }
const UN_VEHICULO = { carros: 'un carro', motos: 'una moto' }

/* Las palabras de la frase que pueden nombrar un vehiculo: el mismo criterio
   que usa modelosQueCalzan, para que lo que se advierte sea exactamente lo
   que se busca. */
function palabrasDeVehiculo(palabras, vocabCategorias) {
  const vocab = vocabCategorias || new Set()
  return (palabras || []).filter(p => p.length >= 3 && !vocab.has(p))
}

/* Marca y modelo que salen de una frase contra UNA base de vehiculos. Es la
   misma lectura para la seccion donde esta parado el cliente y para las
   otras: un solo sitio, o la advertencia dice una cosa y la busqueda hace
   otra. */
function leerVehiculoEn(base, palabras, vocabCategorias, calza, orden) {
  let marca = null
  let modelo = null
  Object.keys(base || {}).forEach(m => {
    const mt = toks(m)
    if (mt.length && mt.every(t => palabras.indexOf(t) >= 0)) marca = m
  })
  if (marca) {
    Object.keys(base[marca] || {}).forEach(mo => {
      const mt = toks(mo)
      if (mt.length && mt.every(t => palabras.indexOf(t) >= 0)) modelo = mo
    })
  }
  let candidatos = []
  if (!marca) {
    candidatos = modelosQueCalzan(base, palabras, vocabCategorias, calza, orden)
    if (candidatos.length === 1) {
      marca = candidatos[0].marca
      modelo = candidatos[0].modelo
    }
  }
  return { marca, modelo, candidatos }
}

/* ¿Hay que advertir que lo escrito es de otra seccion? Null cuando no.

   Dos guardas, las dos puestas por falsos positivos que estan en la base de
   hoy, no por precaucion:

     una palabra con letras  "aceite 100" cruzaba a motos, porque "100" esta
                             dentro de Discover 100 125, Platina 100 125 y
                             Boxer CT 100. Un numero solo no nombra una moto.
     alla hay un MODELO      que alla exista la marca no basta. Honda y Suzuki
                             venden carro y moto: con solo "suzuki" en Motos
                             se avisaria de un carro que nadie nombro.

   Y una tercera, sobre lo que pasa AQUI:

     aqui no hay varios       si en esta seccion lo escrito calza con varios,
                              Cris ya le va a preguntar cual es el suyo y va
                              a nombrarlos; el aviso seria ruido encima de
                              una pregunta. "kit de arrastre boxer" en Motos
                              son cuatro Bajaj: se le preguntan las cuatro,
                              no se le habla del Peugeot.

   Lo que el aviso evita es que Cris se COMPROMETA en silencio con un
   vehiculo: un solo candidato aqui y mas alla es exactamente "boxer ct" en
   Carros, donde se iba derecho al Peugeot sin preguntar nada.

   No hace falta una guarda para "ya dijo la marca". Quien escribe "peugeot
   boxer" no cruza por si solo: modelosQueCalzan exige que TODAS las palabras
   utiles esten en el nombre del modelo, y ningun modelo de moto se llama
   "peugeot". Lo que si cruza, y debe, es "honda cb 110" en Carros: ahi la
   marca existe en las dos secciones y el modelo solo en una. */
function cruceDeSeccion(seccion, aqui, alla, utiles) {
  if (aqui && (aqui.candidatos || []).length > 1) return null
  const conLetras = (utiles || []).filter(p => /[a-z]/.test(p))
  if (!conLetras.length) return null
  const lecturas = (alla || []).filter(l => l && (l.modelo || (l.candidatos || []).length))
  if (!lecturas.length) return null
  return { lecturas, palabra: conLetras[0] }
}

/* La misma categoria en otra seccion: /carros/frenos/pastillas-de-freno ->
   /motos/frenos/pastillas-de-freno. Las herramientas no se traducen, son las
   mismas para los dos. Null si alla no existe. */
function nodoEnSeccion(nodos, nodo, otra) {
  if (!nodo) return null
  const partes = nodo.path.split('/').filter(Boolean)
  if (!partes.length) return null
  if (partes[0] === 'herramientas') return nodo
  const destino = '/' + [otra].concat(partes.slice(1)).join('/')
  return (nodos || []).find(n => n.path === destino) || null
}

/* Como se compara un modelo y como se ordenan los que calzan, por seccion.
   Van aparte porque leerVehiculoEn se usa contra varias secciones a la vez y
   cada una tiene sus apodos y su ranking de ventas. */
const calzaEn = sec => (m, mo, pal) => modeloCoincide(sec, m, mo, pal)
const ordenEn = sec => c => posMarca(sec, c.marca) * 1000 + posModelo(c.marca, c.modelo)

export default function Cris({
  placeholder = '¿Qué necesitas? Escribe el repuesto y tu vehículo',
  placeholderHerramientas = '¿Qué herramienta estás buscando?',
  boton = 'Buscar',
  /* "completo"  Cris tambien arma el vehiculo paso a paso (panel de filtros)
     "producto"  solo busca; el vehiculo se agrega en la pildora del header,
                 para que no haya dos puertas para lo mismo. Sigue entendiendo
                 "llantas para toyota corolla": lo usa en ESA busqueda. */
  modo = 'completo',
}) {
  const handles = useCssHandles(CSS_HANDLES)
  const { navigate, route } = useRuntime()
  /* En el header Cris no arma vehiculos: eso es de la pildora. */
  const armaVehiculo = modo !== 'producto'
  /* rutaDe() usa canonicalPath, que el servidor tambien ve. Con route.path
     (la ruta interna de enrutamiento de VTEX) el servidor creia estar en
     carros dentro de /motos, y Cris cargaba la base equivocada hasta que
     hidrataba. */
  const seccion = seccionDe(rutaDe(route))
  const pideVehiculo = seccion !== 'herramientas'

  const [texto, setTexto] = useState('')
  const [vehiculo, setVehiculo] = useState(null)
  const [paso, setPaso] = useState(null)      // {tipo:'modelo'|'ano', marca, modelo, opciones}
  const [abierto, setAbierto] = useState(false)
  const [tienda, setTienda] = useState(VACIO)
  const [cargando, setCargando] = useState(false)
  const [masBuscadas, setMasBuscadas] = useState([])
  const [guardados, setGuardados] = useState([])
  const [cruceVisto, setCruceVisto] = useState(false)
  const [agregarVisto, setAgregarVisto] = useState(false)
  const caja = useRef(null)

  /* Lo que la tienda sabe de lo escrito: sugerencias, marcas, productos y
     pauta. Se consulta con 220 ms de retardo para no disparar una llamada por
     tecla, y cada consulta aborta la anterior: sin eso una respuesta lenta
     pisaba a una rapida y el panel mostraba resultados de lo que el cliente
     ya habia borrado. */
  useEffect(() => {
    const q = texto.trim()
    if (q.length < 2) {
      setTienda(VACIO)
      setCargando(false)
      return undefined
    }
    const control = typeof AbortController !== 'undefined' ? new AbortController() : null
    setCargando(true)
    const reloj = setTimeout(() => {
      buscarEnTienda(q, control ? control.signal : undefined)
        .then(r => { setTienda(r); setCargando(false) })
        .catch(() => setCargando(false))
    }, 220)
    return () => {
      clearTimeout(reloj)
      if (control) control.abort()
    }
  }, [texto])

  /* Lo mas buscado: una sola vez, para la caja vacia. */
  useEffect(() => {
    let vivo = true
    masBuscado().then(t => { if (vivo) setMasBuscadas(t) })
    return () => { vivo = false }
  }, [])

  /* El vehiculo se guarda por seccion: el carro de alguien no es su moto.
     Se escucha al almacen comun para que si la pildora del header lo cambia,
     Cris lo refleje sin recargar la pagina. */
  useEffect(() => {
    if (!pideVehiculo) return undefined
    setVehiculo(leerVehiculo(seccion))
    return suscribir(seccion, setVehiculo)
  }, [seccion, pideVehiculo])

  /* La lista completa (hasta 3), no solo el activo: ofrecerle agregar un
     vehiculo que ya tiene guardado es ruido, y si ya tiene el maximo lo que
     le falta no es un paso mas sino sacar uno. */
  useEffect(() => {
    if (!pideVehiculo) return undefined
    setGuardados(leerEstado(seccion).lista || [])
    return suscribirEstado(seccion, e => setGuardados((e && e.lista) || []))
  }, [seccion, pideVehiculo])

  /* Cada aviso se puede cerrar, y cambiar la frase vuelve a abrirlo: una
     frase nueva es una pregunta nueva. */
  useEffect(() => {
    setCruceVisto(false)
    setAgregarVisto(false)
  }, [texto])

  /* Llegar con la busqueda puesta. La pildora "Cambiar a motos" navega a la
     otra seccion con ?busca=..., porque cuando lo escrito calza con varias
     motos no hay nada que adivinar: alla Cris vuelve a leer la frase y le
     pregunta cual es la suya. */
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('busca')
      if (q) {
        setTexto(q)
        setAbierto(true)
      }
    } catch (e) {
      /* sin URLSearchParams simplemente no se precarga */
    }
  }, [])

  const guardar = v => {
    setVehiculo(v)
    escribirVehiculo(seccion, v)
  }

  const entradas = useMemo(() => construirIndice(seccion), [seccion])
  /* Todas las palabras con las que se nombra una categoria. */
  const vocabCategorias = useMemo(() => {
    const v = new Set()
    entradas.forEach(e => e.palabras.forEach(w => v.add(w)))
    return v
  }, [entradas])
  const base = useMemo(
    () => (pideVehiculo ? vehiculos[seccion === 'motos' ? 'motos' : 'carros'] || {} : {}),
    [seccion, pideVehiculo]
  )

  /* Lo que Cris entendio de la frase. */
  const lectura = useMemo(() => {
    const crudo = texto.trim()
    if (!crudo) return null
    const llanta = medidaLlanta(crudo)
    const anoM = crudo.match(/\b(19[89]\d|20[0-3]\d)\b/)
    let limpio = crudo
    if (llanta) limpio = limpio.replace(llanta.texto, ' ')
    if (anoM) limpio = limpio.replace(anoM[0], ' ')
    const palabras = toks(limpio)

    /* Modelos que calzan cuando NO escribieron la marca. La gente dice
       "frenos corolla", no "frenos toyota corolla". Si solo hay un carro con
       ese nombre se da por leido; si hay varios (Swift es Suzuki y Chevrolet,
       Frontier es Nissan y Kia) NO se adivina: se ofrecen los dos y escoge
       el cliente. Adivinar la marca es como terminamos trayendo llantas de
       Hilux para un Corolla. */
    const aqui = pideVehiculo
      ? leerVehiculoEn(base, palabras, vocabCategorias, calzaEn(seccion), ordenEn(seccion))
      : { marca: null, modelo: null, candidatos: [] }
    const marca = aqui.marca
    const modelo = aqui.modelo
    const candidatos = aqui.candidatos

    /* La misma lectura contra las OTRAS secciones. En herramientas se hace
       igual aunque ahi no haya vehiculo: quien escribe el nombre de su moto
       en herramientas no esta buscando una llave. */
    const utiles = palabrasDeVehiculo(palabras, vocabCategorias)
    const alla = (OTRAS_SECCIONES[seccion] || []).map(o => Object.assign(
      { seccion: o },
      leerVehiculoEn(vehiculos[o] || {}, palabras, vocabCategorias, calzaEn(o), ordenEn(o))
    ))
    const cruce = cruceDeSeccion(seccion, aqui, alla, utiles)
    /* Las palabras del vehiculo no deben leerse como categoria: "audi" no es
       "audio", y "Corolla" no es una categoria. */
    const usadasVehiculo = new Set(
      [].concat(
        marca ? toks(marca) : [],
        modelo ? toks(modelo) : [],
        candidatos.length ? toks(candidatos[0].modelo) : []
      )
    )
    const paraCategoria = palabras.filter(w => !usadasVehiculo.has(w))
    const categoria = paraCategoria.length ? buscarCategoria(entradas, paraCategoria) : null
    return {
      categoria,
      marca,
      modelo,
      candidatos,
      cruce,
      ano: anoM ? anoM[0] : null,
      llanta,
      palabras: paraCategoria,
    }
  }, [texto, entradas, vocabCategorias, base, pideVehiculo, seccion])

  /* Marcas de la seccion, ya ordenadas por venta. */
  const marcas = useMemo(
    () => Object.keys(base).sort((a, b) => posMarca(seccion, a) - posMarca(seccion, b)),
    [base, seccion]
  )

  /* Modelos de una marca, ordenados por venta. */
  const modelosDe = marca =>
    Object.keys(base[marca] || {}).sort(
      (a, b) => posModelo(marca, a) - posModelo(marca, b)
    )

  /* Sugerencias. Tres clases en una sola lista, en el orden en que le sirven
     al cliente:

       marca       "to" -> Toyota, para armar el vehiculo paso a paso
       modelo      cuando lo escrito no es marca pero si modelo ("corolla")
       categoria   el repuesto que busca

     Con la caja vacia no se devuelve nada solo si no hay nada que ofrecer:
     sin vehiculo se ofrecen las marcas (es el primer paso del flujo), y con
     vehiculo guardado lo mas vendido. Antes devolvia [] y el panel no abria,
     asi que al dar clic no pasaba nada. */
  const sugerencias = useMemo(() => {
    const crudo = texto.trim()
    const vistos = new Set()
    const out = []
    /* Un 100% electrico no tiene filtro de aceite, bujias ni correa de
       reparticion. Con la caja vacia no se le ofrecen: seria mandarlo a una
       pagina que no es para su carro. Si EL las escribe si se le muestran,
       marcadas, porque dejarlo sin resultados y sin explicacion es peor. */
    const electrico = esElectrico(seccion, (vehiculo || {}).marca, (vehiculo || {}).modelo,
      (vehiculo || {}).motor)

    const meter = s => {
      const sobra = electrico && s.nodo && s.nodo.soloCombustion
      if (sobra && !crudo) return
      const k =
        s.tipo +
        ':' +
        (s.nodo ? s.nodo.path : s.marca + '/' + (s.modelo || '')) +
        (s.tipo === 'ir'
          ? (s.conVehiculo ? ':con:' + s.veh.marca + '/' + (s.veh.modelo || '') : ':sin')
          : '')
      if (!vistos.has(k) && out.length < 8) {
        vistos.add(k)
        out.push(sobra ? { ...s, noAplica: true } : s)
      }
    }

    if (!crudo) {
      if (!pideVehiculo) return []
      if (!vehiculo || !vehiculo.marca) {
        if (armaVehiculo) marcas.slice(0, 8).forEach(m => meter({ tipo: 'marca', marca: m }))
      } else {
        (POPULARES[seccion] || []).forEach(nombre => {
          const e = entradas.find(x => !x.parcial && norm(x.alias) === norm(nombre))
          if (e) meter({ tipo: 'categoria', nodo: e.nodo, alias: e.alias })
        })
      }
      return out
    }

    if (crudo.length < 2) return []
    const palabras = toks(texto)
    const ultima = norm((texto.match(/(\S+)\s*$/) || [])[1] || '')

    /* Categoria + vehiculo: se ofrecen las DOS salidas, como en la prueba.
       Filtrar por vehiculo es lo correcto ("corolla" no debe traer la llanta
       del Hilux), pero puede dejar la pagina en cero mientras el catalogo
       este joven. Dandole las dos el cliente nunca queda sin camino, y no
       hace falta adivinar por el. */
    if (lectura && lectura.categoria) {
      const nodo = lectura.categoria.nodo
      const compat = nodo.compatibilidad || 'estricta'
      const varios = !lectura.marca && lectura.candidatos && lectura.candidatos.length > 1
      if (!lectura.llanta && compat !== 'universal') {
        if (varios) {
          /* "frenos swift": Suzuki y Chevrolet. Se ofrecen los dos en vez de
             escoger por el cliente. */
          lectura.candidatos.slice(0, 3).forEach(c => {
            meter({ tipo: 'ir', nodo, conVehiculo: true,
                    veh: { marca: c.marca, modelo: c.modelo, ano: lectura.ano } })
          })
          meter({ tipo: 'ir', nodo, veh: null, conVehiculo: false })
        } else {
          const veh = lectura.marca
            ? { marca: lectura.marca, modelo: lectura.modelo, ano: lectura.ano }
            : vehiculo
          if (veh && veh.marca) {
            meter({ tipo: 'ir', nodo, veh, conVehiculo: true })
            meter({ tipo: 'ir', nodo, veh: null, conVehiculo: false })
          }
        }
      }
    }

    /* Marca por prefijo de lo ultimo que escribio: "to" -> Toyota. */
    if (pideVehiculo && armaVehiculo && ultima.length >= 2) {
      marcas
        .filter(m => norm(m).indexOf(ultima) === 0)
        .forEach(m => meter({ tipo: 'marca', marca: m }))
    }

    /* Categorias. */
    entradas.forEach(e => {
      if (vistos.has('categoria:' + e.nodo.path)) return
      const coincide = palabras.every(q =>
        e.palabras.some(
          w => w.indexOf(q) === 0 || (q.length >= 4 && w.length >= 4 && q.indexOf(w) === 0)
        )
      )
      if (coincide) meter({ tipo: 'categoria', nodo: e.nodo, alias: e.alias })
    })

    /* Modelo sin marca: la gente escribe "corolla" o "pulsar 160" sin decir
       de quien es. Solo si todavia queda espacio, para no tapar la categoria. */
    if (pideVehiculo && armaVehiculo && ultima.length >= 3 && out.length < 6) {
      marcas.forEach(m => {
        modelosDe(m).forEach(mo => {
          if (toks(mo).some(t => t.indexOf(ultima) === 0)) {
            meter({ tipo: 'modelo', marca: m, modelo: mo })
          }
        })
      })
    }

    return out
  }, [texto, entradas, marcas, seccion, pideVehiculo, vehiculo, base, lectura, armaVehiculo])

  const limpiarAux = () => {
    setPaso(null)
    setAbierto(false)
  }

  /* Navega a la categoria con el vehiculo aplicado como filtro, o a la
     busqueda libre si no hay categoria. */
  /* Arma la URL del destino. Aparte de navegar, porque cambiar de SECCION no
     se puede hacer con navigate(): se comprobo en vivo y cambia la URL a
     /motos dejando montada la pagina de carros —la ruta de la seccion es
     store.custom y VTEX no la resuelve en cliente—, asi que Cris seguia
     creyendo estar en Carros y el aviso seguia ahi. */
  const urlDe = (nodo, veh, llanta, explicito, sinVehiculo, seccionDestino) => {
    /* El destino puede estar en otra seccion que la que se esta viendo: es
       el salto de "Cambiar a motos". Importa porque la medida de llanta se
       escribe distinto en cada una. */
    const sec = seccionDestino || seccion
    /* El nivel sale del indice, que lo trae de
       catalogo/compatibilidad-por-categoria.json. La regla de cuando aplica
       esta en vehiculoAplica(), arriba, con el porque.

       En "ajuste" se usa SOLO el vehiculo de esta busqueda (veh), nunca el
       guardado: arrastrar el guardado a Lubricantes o Herramientas dejaba la
       pagina vacia, porque VTEX filtra con AND y un producto que no declara
       compatibilidad no existe para ese vehiculo. */
    const compat = nodo ? nodo.compatibilidad || 'estricta' : 'estricta'
    /* sinVehiculo es la salida "ver todo" que Cris ofrece junto a la filtrada:
       tiene que ganarle incluso al vehiculo guardado, o el cliente que pide
       ver todo seguiria viendo solo lo de su carro. */
    const v =
      !sinVehiculo && vehiculoAplica(compat, explicito, !!llanta)
        ? (compat === 'ajuste' ? veh : veh || vehiculo)
        : null
    const segmentos = []
    const llaves = []
    if (nodo) {
      nodo.path.split('/').filter(Boolean).forEach(s => {
        segmentos.push(s)
        llaves.push('c')
      })
    }
    if (llanta) {
      /* Carros parte la medida en tres especificaciones (Ancho, Alto (perfil),
         Rin: fields 25/26/27, verificados contra el facet real). Motos usa una
         sola "Medida", porque asi se vende: 90/90-18 es un solo dato.

         La llave "alto--perfil-" lleva dos guiones a proposito: VTEX la deriva
         del nombre "Alto (perfil)" y NO colapsa los guiones consecutivos. Esta
         comprobado contra el facet en vivo, no es un slug escrito a mano. */
      if (sec === 'motos') {
        segmentos.push(llanta.completa)
        llaves.push('medida')
      } else {
        segmentos.push(llanta.ancho, llanta.perfil, llanta.rin)
        llaves.push('ancho', 'alto--perfil-', 'rin')
      }
    }
    if (v && v.marca) {
      segmentos.push(norm(v.marca).replace(/[^a-z0-9]+/g, '-'))
      llaves.push('marca-vehiculo')
      if (v.modelo) {
        segmentos.push(norm(v.modelo).replace(/[^a-z0-9]+/g, '-'))
        llaves.push('modelo')
      }
      if (v.ano) {
        segmentos.push(String(v.ano))
        llaves.push('ano')
      }
    }
    if (!segmentos.length) return null
    return { to: '/' + segmentos.join('/'), query: 'map=' + llaves.join(',') }
  }

  const irA = (nodo, veh, llanta, explicito, sinVehiculo) => {
    const d = urlDe(nodo, veh, llanta, explicito, sinVehiculo, seccion)
    limpiarAux()
    if (d) navigate(d)
  }

  /* Navega a una ruta que ya viene armada (una marca del facet, un producto).
     VTEX las entrega con su query, asi que se parte en to + query en vez de
     rearmarla. */
  const irAUrl = url => {
    if (!url) return
    limpiarAux()
    const [ruta, query] = String(url).split('?')
    navigate(query ? { to: ruta, query } : { to: ruta })
  }

  const buscarTexto = q => {
    limpiarAux()
    navigate({ to: '/' + encodeURIComponent(q.trim()) + '/s', query: 'map=ft' })
  }

  /* Cambiar de seccion es un cambio de pagina de verdad, no de facetas. Ver
     el porque en urlDe(). */
  const cargarPagina = (ruta, query) => {
    const url = query ? ruta + '?' + query : ruta
    try {
      window.location.assign(url)
    } catch (e) {
      navigate(query ? { to: ruta, query } : { to: ruta })
    }
  }

  /* "Cambiar a motos". Dos caminos, segun que tan claro este lo que escribio:

       un solo vehiculo alla   se va derecho a la categoria equivalente
                               filtrada por el: "pastillas corolla" en Motos
                               aterriza en las pastillas del Corolla.
       varios alla             "boxer" son cuatro motos y no se adivina: se
                               lleva la frase en ?busca= y alla Cris la vuelve
                               a leer y le pregunta cual es la suya. */
  const irAOtraSeccion = (otra, alla) => {
    const nodo = nodoEnSeccion(indice.nodos, destinoDeLaFrase(), otra)
    const unico = alla && alla.marca && alla.modelo
    let destino = null
    if (unico && nodo) {
      destino = urlDe(
        nodo,
        { marca: alla.marca, modelo: alla.modelo, ano: lectura && lectura.ano },
        lectura && lectura.llanta, true, false, otra
      )
    }
    /* Sin un vehiculo unico no se adivina: se lleva la frase y alla Cris la
       vuelve a leer con la base de esa seccion y le pregunta cual es el suyo. */
    if (!destino) {
      destino = {
        to: nodo ? nodo.path : '/' + otra,
        query: 'busca=' + encodeURIComponent(texto.trim()),
      }
    }
    limpiarAux()
    cargarPagina(destino.to, destino.query)
  }

  const enviar = e => {
    if (e) e.preventDefault()
    const l = lectura
    if (!l) {
      if (vehiculo) irA(null, vehiculo, null)
      return
    }
    /* Lo escrito es de otra seccion y todavia no ha dicho que hacer: NO se
       navega. Esto es el arreglo de "boxer ct": antes la frase se daba por
       leida como Peugeot Boxer y el cliente aterrizaba en una pagina de otro
       vehiculo. Una pregunta de mas vale menos que una devolucion. */
    if (l.cruce && !cruceVisto) {
      setAbierto(true)
      return
    }
    /* Vehiculo incompleto: Cris pide lo que falta en vez de buscar mal. */
    if (pideVehiculo && armaVehiculo && l.marca && !l.modelo) {
      const modelos = Object.keys(base[l.marca] || {})
      if (modelos.length) {
        setPaso({ tipo: 'modelo', marca: l.marca, opciones: modelos.slice(0, 40) })
        setAbierto(false)
        return
      }
    }
    if (pideVehiculo && armaVehiculo && l.marca && l.modelo && !l.ano) {
      const rango = (base[l.marca] || {})[l.modelo]
      if (rango && rango[0] && rango[1]) {
        const anos = []
        for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
        setPaso({ tipo: 'ano', marca: l.marca, modelo: l.modelo, opciones: anos })
        setAbierto(false)
        return
      }
    }
    /* El vehiculo que sale de la frase vale para ESTA busqueda y no se guarda.
       Quien escribe "llantas para toyota corolla" puede estar mirando algo
       para el carro de un cliente o de un familiar: cambiarle el vehiculo
       guardado por eso le deja la tienda filtrada por un carro que no es el
       suyo, sin que lo haya pedido.

       Guardar el vehiculo es un acto deliberado y tiene su propio camino:
       elegir marca -> modelo -> año. */
    const veh = l.marca ? { marca: l.marca, modelo: l.modelo, ano: l.ano } : vehiculo
    if (l.categoria) return irA(l.categoria.nodo, veh, l.llanta, !!l.marca)
    if (l.llanta) {
      const llantas = indice.nodos.find(
        n => n.path === (seccion === 'motos'
          ? '/motos/llantas-y-rines/llantas'
          : '/carros/llantas-y-rines/llantas')
      )
      if (llantas) return irA(llantas, veh, l.llanta, !!l.marca)
    }
    /* Sin categoria reconocida: busqueda de texto, que es lo que haria
       cualquier buscador. No se pierde nada. */
    return buscarTexto(texto)
  }

  /* Los años que ese modelo existio, del mas nuevo al mas viejo. */
  const listaDeAnos = (marca, modelo) => {
    const rango = (base[marca] || {})[modelo]
    if (!rango || !rango[0] || !rango[1]) return []
    const anos = []
    for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
    return anos
  }

  /* A donde lleva la frase que escribio, si es que nombro una categoria. */
  const destinoDeLaFrase = () =>
    (lectura && lectura.categoria && lectura.categoria.nodo) || null

  /* Clic en una sugerencia. La categoria navega; la marca y el modelo NO
     navegan: abren el siguiente paso del embudo (marca -> modelo -> año),
     que es como funcionaba la prueba. Antes solo habia categorias, asi que
     el cliente no tenia forma de armar su vehiculo con clics. */
  const elegirSugerencia = s => {
    /* Las dos salidas de una categoria con vehiculo. "con" manda el vehiculo
       como explicito, que es lo que hace que en "ajuste" si se filtre. */
    if (s.tipo === 'ir') {
      /* "frenos corolla" no dice de que año es, y un Corolla 2005 y uno 2021
         no llevan la misma pastilla. Antes se iba con marca y modelo y ya:
         la pagina mezclaba generaciones. Ahora se pide el año primero, que es
         un toque mas y una respuesta exacta. El que no lo sepa sigue teniendo
         "No sé el año", que va con marca y modelo como antes.

         Aqui NO se guarda: el vehiculo viene de la frase, y "ver pastillas
         para ese carro" no es lo mismo que "ese carro es el mio". */
      const anos = s.conVehiculo && s.veh && s.veh.modelo && !s.veh.ano
        ? listaDeAnos(s.veh.marca, s.veh.modelo)
        : null
      if (anos && anos.length) {
        setTexto('')
        setAbierto(false)
        setPaso({ tipo: 'ano', marca: s.veh.marca, modelo: s.veh.modelo,
                  opciones: anos, destino: s.nodo, guardarlo: false })
        return
      }
      irA(s.nodo, s.conVehiculo ? s.veh : null, null, s.conVehiculo, !s.conVehiculo)
      return
    }
    if (s.tipo === 'categoria') {
      irA(s.nodo, vehiculo, lectura && lectura.llanta, false)
      return
    }
    if (s.tipo === 'marca') {
      setTexto('')
      setAbierto(false)
      setPaso({ tipo: 'modelo', marca: s.marca, opciones: modelosDe(s.marca).slice(0, 40),
                destino: destinoDeLaFrase(), guardarlo: true })
      return
    }
    /* Modelo: ya se sabe la marca, se salta directo al año. */
    const anos = listaDeAnos(s.marca, s.modelo)
    const destino = destinoDeLaFrase()
    setTexto('')
    setAbierto(false)
    if (anos.length) {
      /* Ojo: aqui NO se guarda todavia. Guardar "Toyota Corolla" sin año y
         pedir el año despues dejaba dos cosas rotas si el cliente se iba a
         mitad de camino: la tienda filtrando por un carro incompleto, y un
         duplicado sin año en la lista de vehiculos guardados. */
      setPaso({ tipo: 'ano', marca: s.marca, modelo: s.modelo, opciones: anos,
                destino, guardarlo: true })
      return
    }
    /* Sin rango de años no hay nada mas que preguntar. */
    const veh = { marca: s.marca, modelo: s.modelo, ano: null }
    guardar(veh)
    setPaso(null)
    if (destino) irA(destino, veh, lectura && lectura.llanta, true)
  }

  const elegirPaso = valor => {
    if (paso.tipo === 'modelo') {
      const anos = listaDeAnos(paso.marca, valor)
      if (anos.length) {
        setPaso({ tipo: 'ano', marca: paso.marca, modelo: valor, opciones: anos,
                  destino: paso.destino, guardarlo: paso.guardarlo })
        return
      }
      const veh = { marca: paso.marca, modelo: valor, ano: null }
      if (paso.guardarlo !== false) guardar(veh)
      setPaso(null)
      if (paso.destino) irA(paso.destino, veh, lectura && lectura.llanta, true)
      return
    }
    cerrarElAno(valor)
  }

  /* Sale del paso del año, con año o sin el. Un solo sitio para las dos
     salidas, que antes hacian cosas distintas sin razon. */
  const cerrarElAno = valor => {
    const veh = { marca: paso.marca, modelo: paso.modelo, ano: valor || null }
    if (paso.guardarlo !== false) guardar(veh)
    setPaso(null)
    const destino = paso.destino || (lectura && lectura.categoria && lectura.categoria.nodo)
    if (destino) irA(destino, veh, lectura && lectura.llanta, true)
  }

  /* ------------------------------------------------------------------
     EL AVISO. Una sola linea arriba del panel, con una pildora que resuelve
     y una salida para seguir donde esta. Dos motivos, nunca los dos a la vez
     y en este orden:

       cruce de seccion   lo escrito es de otra seccion. Manda, porque un
                          vehiculo de otra seccion no se puede agregar aqui
                          y seguir buscandolo aqui no lleva a nada.
       agregar vehiculo   lo escrito es un vehiculo de ESTA seccion que no
                          tiene guardado. Escribirlo filtra esta busqueda;
                          guardarlo filtra la tienda entera, y para eso hace
                          falta el año y el motor. La pildora abre el selector
                          del header con el vehiculo ya nombrado, que es la
                          unica puerta de los vehiculos.
     ------------------------------------------------------------------ */
  const nombreDeLectura = l => {
    if (!l) return ''
    if (l.marca && l.modelo) return nombreDe({ marca: l.marca, modelo: l.modelo })
    const c = (l.candidatos || [])[0]
    return c ? nombreDe({ marca: c.marca, modelo: c.modelo }) : ''
  }

  const yaLoTengo = (m, mo) => guardados.some(v =>
    v && norm(v.marca) === norm(m) && norm(v.modelo || '') === norm(mo || ''))

  const aviso = (() => {
    const cruce = lectura && lectura.cruce
    if (cruce && !cruceVisto) {
      const uno = cruce.lecturas[0]
      const nom = nombreDeLectura(uno)
      const mas = Math.max(0, (uno.candidatos || []).length - 1)
      const queEs = cruce.lecturas.length > 1
        ? 'un carro o una moto'
        : UN_VEHICULO[uno.seccion]
      const nombreAqui = lectura.marca ? nombreDeLectura(lectura) : null
      let detalle
      if (seccion === 'herramientas') {
        detalle = 'Aquí solo hay herramienta, que sirve para cualquier vehículo. ' +
          'Los repuestos están en la sección del vehículo.'
      } else if (nombreAqui) {
        /* El caso de "boxer": aqui calza algo, pero puede no ser lo que
           busca. Se le dice QUE le estamos mostrando, que es el dato que le
           faltaba para darse cuenta. */
        detalle = `Aquí te estamos mostrando repuestos de ${nombreAqui}. ` +
          `Si lo tuyo es ${nom}, cambia de sección.`
      } else {
        detalle = `Coincide con ${nom}${mas ? ` y ${mas} más` : ''}. ` +
          `En ${NOMBRE_SECCION[seccion]} no vas a encontrar sus repuestos.`
      }
      return {
        titulo: nombreAqui
          ? `«${cruce.palabra}» también es ${queEs}.`
          : `Eso es ${queEs} y estás en ${NOMBRE_SECCION[seccion]}.`,
        detalle,
        pildoras: cruce.lecturas.map(l => ({
          clave: l.seccion,
          texto: `Cambiar a ${l.seccion}`,
          hacer: () => irAOtraSeccion(l.seccion, l),
        })),
        seguir: {
          texto: `Seguir en ${NOMBRE_SECCION[seccion].toLowerCase()}`,
          hacer: () => setCruceVisto(true),
        },
      }
    }

    if (!pideVehiculo || agregarVisto || !lectura) return null
    if (guardados.length >= MAX_VEHICULOS) return null
    const comoSeLlama = seccion === 'motos' ? 'moto' : 'carro'

    /* Un solo vehiculo: se ofrece guardarlo. */
    if (lectura.marca && lectura.modelo && !yaLoTengo(lectura.marca, lectura.modelo)) {
      const nom = nombreDeLectura(lectura)
      const moto = seccion === 'motos'
      return {
        titulo: moto ? `¿Es tuya la ${nom}?` : `¿Es tuyo el ${nom}?`,
        detalle: `Guárdal${moto ? 'a' : 'o'} con el año y ` +
          `${moto ? 'el cilindraje' : 'el motor'} y la tienda te muestra solo lo que le ` +
          'sirve, en toda la página. Escribirlo filtra nada más esta búsqueda.',
        pildoras: [{
          clave: 'agregar',
          texto: 'Agregar a mis vehículos',
          hacer: () => pedirAbrir(seccion, { marca: lectura.marca, modelo: lectura.modelo }),
        }],
        seguir: { texto: 'Solo esta búsqueda', hacer: () => setAgregarVisto(true) },
      }
    }

    /* Varios: no se adivina. "boxer" en Motos son cuatro, "swift" es Suzuki
       y Chevrolet. Se nombran y escoge el cliente; adivinar la marca es como
       terminamos trayendo llantas de Hilux para un Corolla. */
    const varios = (lectura.candidatos || []).filter(c => !yaLoTengo(c.marca, c.modelo))
    if (varios.length > 1) {
      /* En motos todo va en femenino: "calza con varias, elige la tuya". Un
         texto que no concuerda se lee como un texto de plantilla. */
      const moto = seccion === 'motos'
      return {
        titulo: `¿Cuál es tu ${comoSeLlama}?`,
        detalle: `Lo que escribiste calza con ${moto ? 'varias' : 'varios'}. ` +
          `Elige ${moto ? 'la tuya' : 'el tuyo'} y te pedimos el año y ` +
          `${moto ? 'el cilindraje' : 'el motor'} para mostrarte solo lo que le sirve.`,
        pildoras: varios.slice(0, 3).map(c => ({
          clave: c.marca + '/' + c.modelo,
          texto: nombreDe({ marca: c.marca, modelo: c.modelo }),
          hacer: () => pedirAbrir(seccion, { marca: c.marca, modelo: c.modelo }),
        })),
        seguir: { texto: 'Solo esta búsqueda', hacer: () => setAgregarVisto(true) },
      }
    }
    return null
  })()

  /* El panel se abre si hay ALGO que mostrar. Antes dependia solo de las
     sugerencias locales, asi que una busqueda que solo traia productos no
     abria nada. */
  const hayPanel =
    !!aviso ||
    sugerencias.length > 0 ||
    tienda.sugerencias.length > 0 ||
    tienda.marcas.length > 0 ||
    tienda.productos.length > 0 ||
    tienda.patrocinados.length > 0 ||
    (!texto.trim() && masBuscadas.length > 0)

  /* Con texto, la lista local son categorias; con la caja vacia son marcas de
     vehiculo y ya las encabeza su propia pregunta. */
  const tituloLocal = texto.trim() ? 'Categorías' : ''

  const iconoVehiculo = seccion === 'motos' ? (
    <svg width="20" height="16" viewBox="0 0 40 28" fill="none" aria-hidden="true">
      <circle cx="8" cy="20" r="6" stroke={RED} strokeWidth="2.4" />
      <circle cx="32" cy="20" r="6" stroke={RED} strokeWidth="2.4" />
      <path d="M8 20l7-9h9l4 9M20 11l3-5h5" stroke={RED} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="20" height="16" viewBox="0 0 40 28" fill="none" aria-hidden="true">
      <path d="M4 19h32M7 19l3-8h20l3 8M7 19v3M33 19v3" stroke={RED} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="22" r="3" stroke={RED} strokeWidth="2.4" />
      <circle cx="28" cy="22" r="3" stroke={RED} strokeWidth="2.4" />
    </svg>
  )

  const css = `
    .rx-cris{width:100%;max-width:46rem;margin:0 auto;position:relative;font-family:inherit}
    .rx-cris__veh{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:0 0 .6rem;
      padding:.5rem .85rem;background:#fff;border:1px solid rgba(1,1,1,.1);border-radius:12px;font-size:.875rem}
    .rx-cris__veh b{font-weight:700}
    .rx-cris__veh .rx-cris__mut{color:rgba(1,1,1,.5)}
    .rx-cris__link{background:none;border:0;color:${RED};font:inherit;font-weight:700;cursor:pointer;padding:0;margin-left:auto}
    .rx-cris__box{position:relative}
    .rx-cris__input{width:100%;height:3.4rem;border-radius:999px;border:1.5px solid rgba(255,55,30,.4);
      background:#fff;color:${INK};font:inherit;font-size:1rem;font-weight:500;padding:0 6rem 0 1.25rem;
      box-shadow:0 12px 30px -10px rgba(255,55,30,.45),0 0 0 6px rgba(255,55,30,.06)}
    .rx-cris__input:focus{outline:2px solid ${RED};outline-offset:2px}
    .rx-cris__go{position:absolute;right:.35rem;top:.35rem;height:2.7rem;padding:0 1.25rem;border-radius:999px;
      border:0;background:${RED};color:#fff;font:inherit;font-weight:700;cursor:pointer}
    .rx-cris__panel{position:absolute;z-index:30;left:0;right:0;top:calc(100% + .4rem);background:#fff;
      border:1px solid rgba(1,1,1,.1);border-radius:16px;box-shadow:0 14px 36px rgba(1,1,1,.12);
      padding:.4rem;max-height:22rem;overflow:auto}
    .rx-cris__op{display:flex;justify-content:space-between;gap:.6rem;width:100%;text-align:left;
      padding:.6rem .75rem;border:0;background:none;border-radius:10px;font:inherit;font-size:.9rem;cursor:pointer}
    .rx-cris__op:hover,.rx-cris__op:focus{background:#f5f5f7}
    .rx-cris__op small{color:rgba(1,1,1,.5)}

    /* ---- panel de dos columnas ----
       Izquierda lo que se busca (sugerencias, categorias, marcas), derecha lo
       que se compra. En movil la derecha pasa debajo: a 390 px dos columnas
       dejan ambas inservibles. */
    .rx-cris__cols{display:flex;flex-direction:column;gap:.25rem}
    .rx-cris__izq,.rx-cris__der{min-width:0}
    .rx-cris__grupo{padding-bottom:.25rem}
    .rx-cris__grupo+.rx-cris__grupo{border-top:1px solid rgba(1,1,1,.07);padding-top:.35rem}
    .rx-cris__der{border-top:1px solid rgba(1,1,1,.07);padding-top:.35rem}

    .rx-cris__prod{display:flex;align-items:center;gap:.6rem;width:100%;text-align:left;
      padding:.5rem .5rem;border:0;background:none;border-radius:10px;font:inherit;cursor:pointer}
    .rx-cris__prod:hover,.rx-cris__prod:focus{background:#f5f5f7}
    .rx-cris__foto{width:3rem;height:3rem;flex-shrink:0;border-radius:8px;background:#f2f2f4;
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .rx-cris__foto img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply}
    .rx-cris__info{min-width:0;flex-grow:1;display:flex;flex-direction:column;gap:.15rem}
    .rx-cris__nom{font-size:.8125rem;font-weight:600;color:${INK};line-height:1.3;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .rx-cris__precio{display:flex;align-items:center;gap:.4rem;font-size:.875rem;font-weight:800}
    .rx-cris__precio s{font-size:.75rem;font-weight:600;color:rgba(1,1,1,.4)}
    .rx-cris__sin{font-style:normal;font-size:.75rem;font-weight:700;color:#9a9aa2}
    /* La etiqueta de pauta va declarada, no disimulada: es publicidad. */
    .rx-cris__pauta{font-style:normal;font-size:.5625rem;font-weight:800;letter-spacing:.06em;
      text-transform:uppercase;color:#6b6b70;background:#f2f2f4;border-radius:999px;padding:.1rem .35rem}

    .rx-cris__todo{display:block;width:100%;margin-top:.35rem;padding:.7rem .5rem;
      border:0;border-top:1px solid rgba(1,1,1,.07);background:none;color:${RED};
      font:inherit;font-size:.8125rem;font-weight:700;cursor:pointer;text-align:left}
    .rx-cris__todo:hover{background:#f5f5f7}

    @media screen and (min-width:48rem){
      .rx-cris__panel{max-height:30rem}
      .rx-cris__cols{flex-direction:row;gap:.5rem}
      .rx-cris__izq{flex:0 0 42%}
      .rx-cris__der{flex:1 1 auto;border-top:0;border-left:1px solid rgba(1,1,1,.07);
        padding-top:0;padding-left:.5rem}
    }

    /* ---- Cris dentro del header ----
       La caja de arriba se diseno para vivir sola debajo de un banner:
       3.4rem de alto, 6rem de padding derecho para el boton "Buscar" y una
       sombra ancha. Metida en una fila de header con 11rem de ancho, el
       boton se comia la caja y no quedaba ni un pixel de texto: eso era lo
       que se veia en el celular, un boton rojo flotando.

       Aqui se encoge a la altura de los demas controles, el boton pasa a ser
       una lupa redonda y el texto arranca despues de la lupa de la
       izquierda. */
    .rx-cris--barra{max-width:none}
    .rx-cris--barra .rx-cris__lupa{position:absolute;left:.75rem;top:50%;
      transform:translateY(-50%);pointer-events:none}
    .rx-cris--barra .rx-cris__input{height:2.375rem;font-size:.8125rem;
      padding:0 2.75rem 0 2.25rem;box-shadow:none}
    .rx-cris--barra .rx-cris__go{right:.25rem;top:.25rem;height:1.875rem;width:1.875rem;
      padding:0;display:flex;align-items:center;justify-content:center}

    @media screen and (min-width:40rem){
      .rx-cris--barra .rx-cris__input{height:2.875rem;font-size:.875rem;
        padding:0 3rem 0 2.5rem}
      .rx-cris--barra .rx-cris__go{height:2.375rem;width:2.375rem;right:.25rem;top:.25rem}
      .rx-cris--barra .rx-cris__lupa{left:.875rem}
    }
    /* ---- el aviso ----
       Rojo claro, no rojo pleno: avisa sin parecer un error de la tienda.
       Vive dentro del panel para que sirva igual en la barra del header,
       donde no hay sitio debajo de la caja sin crecerle al header. */
    .rx-cris__aviso{margin:.25rem .25rem .5rem;padding:.75rem .85rem;border-radius:12px;
      background:#FFF6F4;border:1px solid rgba(255,55,30,.25)}
    .rx-cris__aviso b{display:block;font-size:.875rem;font-weight:800;color:${INK};
      line-height:1.3;margin-bottom:.2rem}
    .rx-cris__aviso p{margin:0;font-size:.75rem;line-height:1.45;color:#55555C}
    .rx-cris__acc{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-top:.65rem}
    .rx-cris__pil{border:0;background:${RED};color:#fff;font:inherit;font-weight:800;
      font-size:.8125rem;padding:.45rem .9rem;border-radius:999px;cursor:pointer}
    .rx-cris__pil:hover,.rx-cris__pil:focus{filter:brightness(.93)}
    .rx-cris__seguir{border:0;background:none;color:#55555C;font:inherit;font-weight:700;
      font-size:.75rem;text-decoration:underline;cursor:pointer;padding:.3rem 0}
    .rx-cris__seguir:hover{color:${INK}}
    .rx-cris__titulo{padding:.5rem .7rem .2rem;font-size:.8rem;font-weight:700;
      letter-spacing:.04em;text-transform:uppercase;color:rgba(1,1,1,.45)}
    .rx-cris__salto{background:none;border:0;color:${RED};font:inherit;font-weight:700;
      cursor:pointer;padding:0;margin-top:.6rem}
    .rx-cris__paso{margin-top:.5rem;background:#fff;border:1px solid rgba(1,1,1,.1);border-radius:16px;padding:.9rem}
    .rx-cris__paso h4{margin:0 0 .5rem;font-size:1rem;font-weight:800}
    .rx-cris__chips{display:flex;flex-wrap:wrap;gap:.4rem}
    .rx-cris__chip{border:1.5px solid rgba(1,1,1,.1);background:#fff;color:${INK};font:inherit;
      font-weight:600;font-size:.85rem;padding:.4rem .8rem;border-radius:999px;cursor:pointer}
    .rx-cris__chip:hover{border-color:${RED};color:${RED}}
    .rx-cris__lectura{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem;font-size:.8rem}
    .rx-cris__tag{background:#f5f5f7;border-radius:999px;padding:.2rem .6rem}
    .rx-cris__tag small{color:rgba(1,1,1,.5);margin-right:.3rem}
    @media (max-width:40em){
      .rx-cris__input{height:3rem;font-size:.95rem;padding-right:5rem}
      .rx-cris__go{height:2.4rem;padding:0 1rem;font-size:.85rem}
    }
  `

  return (
    <div className={`rx-cris ${armaVehiculo ? '' : 'rx-cris--barra'} ${handles.cris || ''}`}>
      <style>{css}</style>

      {armaVehiculo && pideVehiculo && vehiculo && vehiculo.marca ? (
        <div className={`rx-cris__veh ${handles.crisVehicle || ''}`}>
          {iconoVehiculo}
          <span>
            <b>{vehiculo.marca} {vehiculo.modelo || ''}</b>
            {vehiculo.ano ? <span className="rx-cris__mut"> · {vehiculo.ano}</span> : null}
          </span>
          <button type="button" className="rx-cris__link" onClick={() => guardar(null)}>
            Cambiar vehículo
          </button>
        </div>
      ) : null}

      <form className="rx-cris__box" onSubmit={enviar} role="search">
        {/* La lupa solo en la barra del header: en el panel ancho el boton
            "Buscar" ya dice de que se trata. */}
        {!armaVehiculo ? (
          <svg className="rx-cris__lupa" width="15" height="15" viewBox="0 0 16 16" fill="none"
            stroke={RED} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" />
          </svg>
        ) : null}
        <input
          ref={caja}
          className={`rx-cris__input ${handles.crisInput || ''}`}
          type="search"
          value={texto}
          placeholder={pideVehiculo ? placeholder : placeholderHerramientas}
          aria-label={pideVehiculo ? placeholder : placeholderHerramientas}
          autoComplete="off"
          onChange={e => { setTexto(e.target.value); setAbierto(true); setPaso(null) }}
          onFocus={() => setAbierto(true)}
        />
        {/* En la barra del header no cabe la palabra: el boton queda como
            lupa, con el texto en aria-label para que se siga anunciando. */}
        <button type="submit" className="rx-cris__go" aria-label={boton}>
          {armaVehiculo ? boton : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5 14 14" />
            </svg>
          )}
        </button>

        {abierto && hayPanel ? (
          <div className={`rx-cris__panel ${handles.crisSuggestions || ''}`}>
            {/* El aviso va arriba de todo: es lo que cambia a donde va a
                terminar el cliente, no una sugerencia mas. */}
            {aviso ? (
              <div className="rx-cris__aviso" role="status">
                <b>{aviso.titulo}</b>
                <p>{aviso.detalle}</p>
                <div className="rx-cris__acc">
                  {aviso.pildoras.map(pi => (
                    <button key={pi.clave} type="button" className="rx-cris__pil"
                      onMouseDown={e => { e.preventDefault(); pi.hacer() }}>
                      {pi.texto}
                    </button>
                  ))}
                  <button type="button" className="rx-cris__seguir"
                    onMouseDown={e => { e.preventDefault(); aviso.seguir.hacer() }}>
                    {aviso.seguir.texto}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="rx-cris__cols">

              <div className="rx-cris__izq">
                {/* Caja vacia: lo mas buscado y, si falta vehiculo, las marcas. */}
                {!texto.trim() && masBuscadas.length ? (
                  <div className="rx-cris__grupo">
                    <div className="rx-cris__titulo">Lo más buscado</div>
                    {masBuscadas.map(t => (
                      <button key={t} type="button" className="rx-cris__op"
                        onMouseDown={e => { e.preventDefault(); buscarTexto(t) }}>
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {!texto.trim() && (!vehiculo || !vehiculo.marca) && pideVehiculo && armaVehiculo ? (
                  <div className="rx-cris__titulo">
                    ¿De qué marca es tu {seccion === 'motos' ? 'moto' : 'carro'}?
                  </div>
                ) : null}

                {/* Lo que la gente ya busco. Viene de VTEX y en una tienda
                    nueva suele estar vacio: por eso no es la unica seccion. */}
                {tienda.sugerencias.length ? (
                  <div className="rx-cris__grupo">
                    <div className="rx-cris__titulo">Sugerencias</div>
                    {tienda.sugerencias.map(sg => (
                      <button key={sg.termino} type="button" className="rx-cris__op"
                        onMouseDown={e => { e.preventDefault(); buscarTexto(sg.termino) }}>
                        <span>{sg.termino}</span>
                        {sg.donde ? <small>en {sg.donde}</small> : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Las categorias del arbol: esto si funciona desde el dia uno. */}
                {sugerencias.length ? (
                  <div className="rx-cris__grupo">
                    {tituloLocal ? (
                      <div className="rx-cris__titulo">{tituloLocal}</div>
                    ) : null}
                    {sugerencias.map(s => (
                      <button
                        type="button"
                        key={
                          s.tipo + ':' +
                          (s.nodo ? s.nodo.path : s.marca + '/' + (s.modelo || '')) +
                          (s.tipo === 'ir'
                            ? (s.conVehiculo ? ':con:' + s.veh.marca + '/' + (s.veh.modelo || '') : ':sin')
                            : '')
                        }
                        className="rx-cris__op"
                        onMouseDown={e => { e.preventDefault(); elegirSugerencia(s) }}
                      >
                        <span>
                          {s.tipo === 'ir' && s.conVehiculo
                            ? `${s.nodo.nombre} para tu ${s.veh.marca} ${s.veh.modelo || ''}`
                            : null}
                          {s.tipo === 'ir' && !s.conVehiculo
                            ? `${s.nodo.nombre} — ver todo`
                            : null}
                          {s.tipo === 'categoria' ? s.nodo.nombre : null}
                          {s.tipo === 'marca' ? s.marca : null}
                          {s.tipo === 'modelo' ? `${s.marca} ${s.modelo}` : null}
                        </span>
                        <small>
                          {s.noAplica ? 'tu carro es eléctrico: no lleva' : null}
                          {!s.noAplica && s.tipo === 'ir'
                            ? (s.conVehiculo
                              ? (s.veh && !s.veh.ano ? 'dinos el año y es exacto' : 'solo lo que le sirve')
                              : 'sin filtro de vehículo')
                            : null}
                          {!s.noAplica && s.tipo === 'categoria' ? s.nodo.seccion : null}
                          {s.tipo === 'marca' ? 'marca' : null}
                          {s.tipo === 'modelo' ? 'modelo' : null}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : null}

                {tienda.marcas.length ? (
                  <div className="rx-cris__grupo">
                    <div className="rx-cris__titulo">Marcas</div>
                    {tienda.marcas.map(m => (
                      <button key={m.valor} type="button" className="rx-cris__op"
                        onMouseDown={e => { e.preventDefault(); irAUrl(m.url) }}>
                        <span>{m.nombre}</span>
                        <small>{m.cuantos}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Columna de producto: foto, nombre y precio, como en cualquier
                  tienda grande. Es ademas donde se para la pauta. */}
              {tienda.productos.length || tienda.patrocinados.length ? (
                <div className="rx-cris__der">
                  <div className="rx-cris__titulo">Productos</div>
                  {tienda.patrocinados.concat(tienda.productos).slice(0, 6).map((pr, i) => (
                    <button key={pr.id + '-' + i} type="button" className="rx-cris__prod"
                      onMouseDown={e => { e.preventDefault(); irAUrl(pr.url) }}>
                      <span className="rx-cris__foto">
                        {pr.imagen ? <img src={pr.imagen} alt="" loading="lazy" /> : null}
                      </span>
                      <span className="rx-cris__info">
                        <span className="rx-cris__nom">{pr.nombre}</span>
                        <span className="rx-cris__precio">
                          {pr.precioTexto
                            ? pr.precioTexto
                            : <em className="rx-cris__sin">{pr.agotado ? 'Agotado' : 'Consultar'}</em>}
                          {pr.antes ? <s>{pr.antes}</s> : null}
                          {i < tienda.patrocinados.length ? (
                            <em className="rx-cris__pauta">Patrocinado</em>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

            </div>

            {texto.trim().length >= 2 ? (
              <button type="button" className="rx-cris__todo"
                onMouseDown={e => { e.preventDefault(); buscarTexto(texto) }}>
                {cargando ? 'Buscando…' : `Ver todos los resultados para «${texto.trim()}»`}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>

      {paso ? (
        <div className={`rx-cris__paso ${handles.crisStep || ''}`}>
          <h4>
            {paso.tipo === 'modelo'
              ? `¿Qué ${paso.marca} tienes?`
              : `¿De qué año es tu ${paso.marca} ${paso.modelo}?`}
          </h4>
          <div className="rx-cris__chips">
            {paso.opciones.map(o => (
              <button type="button" key={o} className="rx-cris__chip"
                onClick={() => elegirPaso(o)}>{o}</button>
            ))}
          </div>
          {/* El año es para verificar el ajuste, no un requisito: quien no lo
              sabe no puede quedarse trancado en el paso. */}
          {paso.tipo === 'ano' ? (
            <button type="button" className="rx-cris__salto"
              onClick={() => cerrarElAno(null)}>
              No sé el año
            </button>
          ) : null}
        </div>
      ) : null}

      {lectura && (lectura.categoria || lectura.marca || lectura.llanta) ? (
        <div className="rx-cris__lectura">
          {lectura.categoria ? (
            <span className="rx-cris__tag"><small>busco</small>{lectura.categoria.nodo.nombre}</span>
          ) : null}
          {lectura.llanta ? (
            <span className="rx-cris__tag"><small>medida</small>{lectura.llanta.ancho}/{lectura.llanta.perfil} R{lectura.llanta.rin}</span>
          ) : null}
          {lectura.marca ? (
            <span className="rx-cris__tag"><small>vehículo</small>{lectura.marca} {lectura.modelo || ''} {lectura.ano || ''}</span>
          ) : null}
          {lectura.categoria && lectura.categoria.nodo.compatibilidad === 'ajuste' &&
           lectura.categoria.nodo.atributo ? (
            <span className="rx-cris__tag">
              <small>aquí manda</small>{lectura.categoria.nodo.atributo}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

Cris.schema = {
  title: 'Cris — buscador',
  type: 'object',
  properties: {
    placeholder: { title: 'Texto de ayuda', type: 'string' },
    placeholderHerramientas: { title: 'Texto de ayuda en herramientas', type: 'string' },
    boton: { title: 'Texto del botón', type: 'string' },
  },
}
