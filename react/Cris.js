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
 * El vehiculo queda fijado arriba de la caja y guardado en el navegador, asi
 * que las busquedas siguientes lo usan sin volver a escribirlo. Se cambia o
 * se quita con un clic.
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

const CSS_HANDLES = ['cris', 'crisInput', 'crisVehicle', 'crisSuggestions', 'crisStep']
const RED = '#FF371E'
const INK = '#010101'
const CLAVE = 'rx-cris-vehiculo'

/* Orden de venta en Colombia (estimado, editable). Sirve para dos cosas:
   que las marcas que Cris ofrece de entrada sean las que la gente de verdad
   tiene, y que al escribir "to" salga Toyota antes que Tata. Lo que no esta
   en la lista conserva el orden alfabetico de la base. */
const RANK_MARCAS = {
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
   volumen; el resto va alfabetico. */
const RANK_MODELOS = {
  Chevrolet: ['Onix', 'Spark GT', 'Sail', 'Tracker', 'Aveo', 'Captiva', 'Optra', 'Beat', 'Cruze', 'Corsa', 'Joy', 'Groove', 'D-Max'],
  Renault: ['Sandero', 'Logan', 'Kwid', 'Duster', 'Stepway', 'Twingo', 'Symbol', 'Captur', 'Mégane', 'Koleos'],
  Mazda: ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5', 'CX-3', 'BT-50', 'Mazda 6', 'Allegro'],
  Kia: ['Picanto', 'Rio', 'Sportage', 'Cerato', 'Seltos', 'Sonet', 'Carnival', 'Sorento', 'Soul'],
  Toyota: ['Corolla', 'Hilux', 'Fortuner', 'Prado', 'Yaris', 'RAV4', 'Corolla Cross', 'Land Cruiser'],
  Nissan: ['Versa', 'Kicks', 'March', 'Sentra', 'Frontier NP300', 'X-Trail', 'Qashqai', 'Tiida'],
  Suzuki: ['Swift', 'Vitara', 'Jimny', 'Grand Vitara', 'S-Presso', 'Baleno', 'Alto'],
  Hyundai: ['Tucson', 'Accent', 'i10', 'Grand i10', 'Creta', 'Kona', 'Santa Fe', 'Elantra'],
  Volkswagen: ['Gol', 'Jetta', 'T-Cross', 'Polo', 'Tiguan', 'Amarok', 'Golf', 'Fox'],
  Ford: ['EcoSport', 'Ranger', 'Fiesta', 'Escape', 'Explorer', 'Focus', 'F-150'],
  BMW: ['Serie 3', 'X1', 'Serie 1', 'X3', 'Serie 2', 'X5', 'Serie 5'],
  Bajaj: ['Boxer CT 100', 'Pulsar 160 NS', 'Pulsar N160', 'Pulsar 180', 'Pulsar 150', 'Discover 125', 'Dominar 400', 'Platina 100'],
  AKT: ['NKD 125', 'AK 125 CR4', 'TTR 200', 'TTR 180', 'Flex 125', 'AK 110 Special'],
  Yamaha: ['NMax', 'FZ 2.0', 'XTZ 150', 'FZ 25', 'Crypton 115', 'BWS 125', 'MT-15', 'XTZ 125'],
  Honda: ['CB 125F', 'Wave 110', 'XR 150L', 'CB 160F', 'Dio', 'Navi', 'CB 190R', 'CB 110'],
}

/* Categorias que Cris ofrece cuando ya hay vehiculo guardado y la caja esta
   vacia: lo mas vendido, para no dejar el panel en blanco. */
const POPULARES = {
  carros: ['Pastillas de freno', 'Filtros de aceite', 'Amortiguadores', 'Baterías para carro', 'Llantas'],
  motos: ['Pastillas de freno', 'Kits de arrastre', 'Filtros de aceite', 'Baterías para moto', 'Llantas'],
  herramientas: [],
}

/* Posicion de una marca o modelo en el ranking; lo no listado va al final
   pero conserva su orden relativo. */
const posMarca = (seccion, marca) => {
  const i = (RANK_MARCAS[seccion] || []).indexOf(marca)
  return i < 0 ? 900 : i
}
const posModelo = (marca, modelo) => {
  const i = (RANK_MODELOS[marca] || []).indexOf(modelo)
  return i < 0 ? 900 : i
}

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

export default function Cris({
  placeholder = '¿Qué necesitas? Escribe el repuesto y tu vehículo',
  placeholderHerramientas = '¿Qué herramienta estás buscando?',
  boton = 'Buscar',
}) {
  const handles = useCssHandles(CSS_HANDLES)
  const { navigate, route } = useRuntime()
  const winPath =
    typeof window !== 'undefined' && window.location ? window.location.pathname : ''
  const ruta = (winPath || (route && route.path) || '').split('?')[0]
  const seccion = seccionDe(ruta)
  const pideVehiculo = seccion !== 'herramientas'

  const [texto, setTexto] = useState('')
  const [vehiculo, setVehiculo] = useState(null)
  const [paso, setPaso] = useState(null)      // {tipo:'modelo'|'ano', marca, modelo, opciones}
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)

  /* El vehiculo se guarda por seccion: el carro de alguien no es su moto. */
  useEffect(() => {
    if (!pideVehiculo) return
    try {
      const guardado = window.localStorage.getItem(CLAVE + '-' + seccion)
      if (guardado) setVehiculo(JSON.parse(guardado))
    } catch (e) {
      /* navegador sin almacenamiento: Cris funciona igual, solo no recuerda */
    }
  }, [seccion, pideVehiculo])

  const guardar = v => {
    setVehiculo(v)
    try {
      if (v) window.localStorage.setItem(CLAVE + '-' + seccion, JSON.stringify(v))
      else window.localStorage.removeItem(CLAVE + '-' + seccion)
    } catch (e) {
      /* sin almacenamiento: el vehiculo vale para esta sesion */
    }
  }

  const entradas = useMemo(() => construirIndice(seccion), [seccion])
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

    let marca = null
    let modelo = null
    if (pideVehiculo) {
      Object.keys(base).forEach(m => {
        const mt = toks(m)
        if (mt.length && mt.every(t => palabras.indexOf(t) >= 0)) marca = m
      })
      const modelos = marca ? Object.keys(base[marca] || {}) : []
      modelos.forEach(mo => {
        const mt = toks(mo)
        if (mt.length && mt.every(t => palabras.indexOf(t) >= 0)) modelo = mo
      })
    }
    /* Las palabras del vehiculo no deben leerse como categoria: "audi" no es
       "audio", y "Corolla" no es una categoria. */
    const usadasVehiculo = new Set(
      [].concat(marca ? toks(marca) : [], modelo ? toks(modelo) : [])
    )
    const paraCategoria = palabras.filter(w => !usadasVehiculo.has(w))
    const categoria = paraCategoria.length ? buscarCategoria(entradas, paraCategoria) : null
    return {
      categoria,
      marca,
      modelo,
      ano: anoM ? anoM[0] : null,
      llanta,
      palabras: paraCategoria,
    }
  }, [texto, entradas, base, pideVehiculo])

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
    const meter = s => {
      const k =
        s.tipo +
        ':' +
        (s.nodo ? s.nodo.path : s.marca + '/' + (s.modelo || '')) +
        (s.tipo === 'ir' ? (s.conVehiculo ? ':con' : ':sin') : '')
      if (!vistos.has(k) && out.length < 8) {
        vistos.add(k)
        out.push(s)
      }
    }

    if (!crudo) {
      if (!pideVehiculo) return []
      if (!vehiculo || !vehiculo.marca) {
        marcas.slice(0, 8).forEach(m => meter({ tipo: 'marca', marca: m }))
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
      const veh = lectura.marca
        ? { marca: lectura.marca, modelo: lectura.modelo, ano: lectura.ano }
        : vehiculo
      const nodo = lectura.categoria.nodo
      const compat = nodo.compatibilidad || 'estricta'
      if (veh && veh.marca && !lectura.llanta && compat !== 'universal') {
        meter({ tipo: 'ir', nodo, veh, conVehiculo: true })
        meter({ tipo: 'ir', nodo, veh: null, conVehiculo: false })
      }
    }

    /* Marca por prefijo de lo ultimo que escribio: "to" -> Toyota. */
    if (pideVehiculo && ultima.length >= 2) {
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
    if (pideVehiculo && ultima.length >= 3 && out.length < 6) {
      marcas.forEach(m => {
        modelosDe(m).forEach(mo => {
          if (toks(mo).some(t => t.indexOf(ultima) === 0)) {
            meter({ tipo: 'modelo', marca: m, modelo: mo })
          }
        })
      })
    }

    return out
  }, [texto, entradas, marcas, seccion, pideVehiculo, vehiculo, base, lectura])

  const limpiarAux = () => {
    setPaso(null)
    setAbierto(false)
  }

  /* Navega a la categoria con el vehiculo aplicado como filtro, o a la
     busqueda libre si no hay categoria. */
  const irA = (nodo, veh, llanta, explicito, sinVehiculo) => {
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
      if (seccion === 'motos') {
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
    limpiarAux()
    if (!segmentos.length) return
    navigate({ to: '/' + segmentos.join('/'), query: 'map=' + llaves.join(',') })
  }

  const buscarTexto = q => {
    limpiarAux()
    navigate({ to: '/' + encodeURIComponent(q.trim()) + '/s', query: 'map=ft' })
  }

  const enviar = e => {
    if (e) e.preventDefault()
    const l = lectura
    if (!l) {
      if (vehiculo) irA(null, vehiculo, null)
      return
    }
    /* Vehiculo incompleto: Cris pide lo que falta en vez de buscar mal. */
    if (pideVehiculo && l.marca && !l.modelo) {
      const modelos = Object.keys(base[l.marca] || {})
      if (modelos.length) {
        setPaso({ tipo: 'modelo', marca: l.marca, opciones: modelos.slice(0, 40) })
        setAbierto(false)
        return
      }
    }
    if (pideVehiculo && l.marca && l.modelo && !l.ano) {
      const rango = (base[l.marca] || {})[l.modelo]
      if (rango && rango[0] && rango[1]) {
        const anos = []
        for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
        setPaso({ tipo: 'ano', marca: l.marca, modelo: l.modelo, opciones: anos })
        setAbierto(false)
        return
      }
    }
    const veh = l.marca ? { marca: l.marca, modelo: l.modelo, ano: l.ano } : vehiculo
    if (l.marca) guardar(veh)
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

  /* Clic en una sugerencia. La categoria navega; la marca y el modelo NO
     navegan: abren el siguiente paso del embudo (marca -> modelo -> año),
     que es como funcionaba la prueba. Antes solo habia categorias, asi que
     el cliente no tenia forma de armar su vehiculo con clics. */
  const elegirSugerencia = s => {
    /* Las dos salidas de una categoria con vehiculo. "con" manda el vehiculo
       como explicito, que es lo que hace que en "ajuste" si se filtre. */
    if (s.tipo === 'ir') {
      if (s.conVehiculo) guardar(s.veh)
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
      setPaso({ tipo: 'modelo', marca: s.marca, opciones: modelosDe(s.marca).slice(0, 40) })
      return
    }
    /* Modelo: ya se sabe la marca, se salta directo al año. */
    const rango = (base[s.marca] || {})[s.modelo]
    const veh = { marca: s.marca, modelo: s.modelo, ano: null }
    guardar(veh)
    setTexto('')
    setAbierto(false)
    if (rango && rango[0] && rango[1]) {
      const anos = []
      for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
      setPaso({ tipo: 'ano', marca: s.marca, modelo: s.modelo, opciones: anos })
      return
    }
    setPaso(null)
  }

  const elegirPaso = valor => {
    if (paso.tipo === 'modelo') {
      const rango = (base[paso.marca] || {})[valor]
      const veh = { marca: paso.marca, modelo: valor, ano: null }
      if (rango && rango[0] && rango[1]) {
        const anos = []
        for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
        guardar(veh)
        setPaso({ tipo: 'ano', marca: paso.marca, modelo: valor, opciones: anos })
        return
      }
      guardar(veh)
      setPaso(null)
      return
    }
    const veh = { marca: paso.marca, modelo: paso.modelo, ano: valor }
    guardar(veh)
    setPaso(null)
    const l = lectura
    if (l && l.categoria) irA(l.categoria.nodo, veh, l.llanta, true)
  }

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
    <div className={`rx-cris ${handles.cris || ''}`}>
      <style>{css}</style>

      {pideVehiculo && vehiculo && vehiculo.marca ? (
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
        <button type="submit" className="rx-cris__go">{boton}</button>

        {abierto && sugerencias.length ? (
          <div className={`rx-cris__panel ${handles.crisSuggestions || ''}`}>
            {!texto.trim() && (!vehiculo || !vehiculo.marca) && pideVehiculo ? (
              <div className="rx-cris__titulo">
                ¿De qué marca es tu {seccion === 'motos' ? 'moto' : 'carro'}?
              </div>
            ) : null}
            {sugerencias.map(s => (
              <button
                type="button"
                key={
                  s.tipo +
                  ':' +
                  (s.nodo ? s.nodo.path : s.marca + '/' + (s.modelo || '')) +
                  (s.tipo === 'ir' ? (s.conVehiculo ? ':con' : ':sin') : '')
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
                  {s.tipo === 'ir'
                    ? (s.conVehiculo ? 'solo lo que le sirve' : 'sin filtro de vehículo')
                    : null}
                  {s.tipo === 'categoria' ? s.nodo.seccion : null}
                  {s.tipo === 'marca' ? 'marca' : null}
                  {s.tipo === 'modelo' ? 'modelo' : null}
                </small>
              </button>
            ))}
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
              onClick={() => { guardar({ marca: paso.marca, modelo: paso.modelo, ano: null }); setPaso(null) }}>
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
