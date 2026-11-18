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

/* Medida de llanta: 205/55R16, 205/55 R16, 205-55-16 */
function medidaLlanta(texto) {
  const m = texto.match(/\b(\d{3})\s*[/x-]\s*(\d{2})\s*(?:r|zr|-)?\s*(\d{2})\b/i)
  return m ? { ancho: m[1], perfil: m[2], rin: m[3], texto: m[0] } : null
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

  /* Sugerencias: categorias que empiezan por lo escrito, y vehiculos si la
     frase apunta a uno. */
  const sugerencias = useMemo(() => {
    if (!texto.trim() || texto.trim().length < 2) return []
    const palabras = toks(texto)
    const vistos = new Set()
    const out = []
    entradas.forEach(e => {
      if (out.length >= 8 || vistos.has(e.nodo.path)) return
      const coincide = palabras.every(q =>
        e.palabras.some(
          w => w.indexOf(q) === 0 || (q.length >= 4 && w.length >= 4 && q.indexOf(w) === 0)
        )
      )
      if (coincide) {
        vistos.add(e.nodo.path)
        out.push({ tipo: 'categoria', nodo: e.nodo, alias: e.alias })
      }
    })
    return out
  }, [texto, entradas])

  const limpiarAux = () => {
    setPaso(null)
    setAbierto(false)
  }

  /* Navega a la categoria con el vehiculo aplicado como filtro, o a la
     busqueda libre si no hay categoria. */
  const irA = (nodo, veh, llanta) => {
    /* El vehiculo solo se aplica como filtro donde de verdad discrimina. Lo
       dice el indice, que lo trae de catalogo/compatibilidad-por-categoria.json:

         estricta   el repuesto encaja o no encaja -> se filtra
         ajuste     sirve a muchos y manda un atributo -> NO se filtra
         universal  le sirve a cualquiera -> NO se filtra

       Sin esto, un cliente con su carro guardado entraba a Lubricantes o a
       Herramientas y la pagina salia vacia: VTEX filtra con AND y un producto
       que no declara compatibilidad simplemente no existe para ese vehiculo. */
    const compat = nodo ? nodo.compatibilidad || 'estricta' : 'estricta'
    const v = compat === 'estricta' ? veh || vehiculo : null
    const segmentos = []
    const llaves = []
    if (nodo) {
      nodo.path.split('/').filter(Boolean).forEach(s => {
        segmentos.push(s)
        llaves.push('c')
      })
    }
    if (llanta) {
      segmentos.push(llanta.ancho, llanta.perfil, llanta.rin)
      llaves.push('ancho', 'alto--perfil-', 'rin')
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
    if (l.categoria) return irA(l.categoria.nodo, veh, l.llanta)
    if (l.llanta) {
      const llantas = indice.nodos.find(
        n => n.path === (seccion === 'motos'
          ? '/motos/llantas-y-rines/llantas'
          : '/carros/llantas-y-rines/llantas')
      )
      if (llantas) return irA(llantas, veh, l.llanta)
    }
    /* Sin categoria reconocida: busqueda de texto, que es lo que haria
       cualquier buscador. No se pierde nada. */
    return buscarTexto(texto)
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
    if (l && l.categoria) irA(l.categoria.nodo, veh, l.llanta)
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
            {sugerencias.map(s => (
              <button
                type="button"
                key={s.nodo.path}
                className="rx-cris__op"
                onMouseDown={e => { e.preventDefault(); irA(s.nodo, vehiculo, lectura && lectura.llanta) }}
              >
                <span>{s.nodo.nombre}</span>
                <small>{s.nodo.seccion}</small>
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
