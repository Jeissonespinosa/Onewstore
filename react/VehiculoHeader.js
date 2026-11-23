/*
 * La puerta de los vehiculos, en el header.
 *
 * Una sola puerta: se agregan ahi, se consultan ahi, se cambia cual manda y
 * se quitan ahi. Cris busca repuestos y nada mas, asi no hay dos sitios que
 * hagan lo mismo.
 *
 *   variante "circulo"  movil: circulo de 30 px con un + chiquito en la
 *                       esquina mientras no hay vehiculo.
 *   variante "pildora"  escritorio y tablet: pildora con el carro y el +
 *                       al lado, sin circulo; con vehiculo muestra el nombre.
 *
 * HASTA 3 VEHICULOS. El activo es el que filtra la tienda: va en rojo con el
 * chulo al final. Los demas quedan en blanco con el borde gris, a un clic de
 * tomar el relevo. Tres alcanzan para el carro propio, el de la casa y el
 * del trabajo; mas convierten la lista en algo que hay que leer en vez de
 * reconocer de un vistazo.
 *
 * Al guardar, el cuadro se encoge hacia el icono y el icono rebota. El
 * movimiento es la explicacion de donde quedo guardado el carro: sin el, un
 * circulo que se llena no le dice nada a nadie.
 *
 * La X y el clic por fuera cierran sin tocar nada. Borrar esta en un solo
 * lugar, el boton "Quitar", y siempre actua sobre el activo.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import vehiculos from './data/vehiculos-colombia.json'
import {
  seccionDe, rutaDe, leerEstado, escribirEstado, suscribirEstado,
  nombreDe, nombreConMotor, posMarca, posModelo, alPedirAbrir, MAX_VEHICULOS,
  motoresDe, pideMotor,
} from './vehiculo'

const CSS_HANDLES = ['vehiculoHeader', 'vehiculoBoton', 'vehiculoPanel']
const RED = '#FF371E'
const INK = '#010101'

/* Lo que tarda el cuadro en viajar al icono. Si se cambia aqui hay que
   cambiarlo en la animacion rxVehGuardar, o el cuadro desaparece antes de
   llegar (o se queda colgado despues). */
const VIAJE = 400
const REBOTE = 1050

export default function VehiculoHeader({
  variante = 'pildora',
  etiquetaVacia = 'Agregar vehículo',
}) {
  const handles = useCssHandles(CSS_HANDLES)
  const { route } = useRuntime()
  const seccion = seccionDe(rutaDe(route))

  const [estado, setEstado] = useState({ lista: [], activo: 0 })
  const [vista, setVista] = useState(null)    // null|'lista'|'marca'|'modelo'|'ano'
  const [modo, setModo] = useState('agregar') // 'agregar' suma; 'cambiar' reemplaza el activo
  const [guardando, setGuardando] = useState(false)
  const [pop, setPop] = useState(false)
  const [marca, setMarca] = useState(null)
  const [modelo, setModelo] = useState(null)
  const [ano, setAno] = useState(null)
  const relojes = useRef([])
  const boton = useRef(null)

  useEffect(() => {
    setEstado(leerEstado(seccion))
    return suscribirEstado(seccion, setEstado)
  }, [seccion])

  useEffect(() => () => relojes.current.forEach(clearTimeout), [])

  /* El "Cambiar" de la linea "Para tu ..." de la pagina abre este panel. */
  useEffect(() => alPedirAbrir(seccion, () => setVista('lista')), [seccion])

  /* Esc cierra, como cualquier dialogo. Sin esto quien navega con teclado
     queda atrapado detras de la capa oscura. */
  useEffect(() => {
    if (vista === null) return undefined
    const alTecla = e => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setVista(null)
        if (boton.current) boton.current.focus()
      }
    }
    window.addEventListener('keydown', alTecla)
    return () => window.removeEventListener('keydown', alTecla)
  }, [vista])

  const base = useMemo(
    () => vehiculos[seccion === 'motos' ? 'motos' : 'carros'] || {},
    [seccion]
  )
  const marcas = useMemo(
    () => Object.keys(base).sort((a, b) => posMarca(seccion, a) - posMarca(seccion, b)),
    [base, seccion]
  )
  const modelosDe = m =>
    Object.keys(base[m] || {}).sort((a, b) => posModelo(m, a) - posModelo(m, b))

  const luego = (fn, ms) => relojes.current.push(setTimeout(fn, ms))

  const lista = estado.lista || []
  const activo = lista[estado.activo] || null
  const hay = !!activo
  const nombre = nombreConMotor(activo)
  const lleno = lista.length >= MAX_VEHICULOS

  /* Queda guardado: el cuadro viaja al icono y el icono acusa recibo. */
  const guardar = v => {
    const cambia = modo === 'cambiar' && lista.length > 0
    const nueva = cambia ? lista.map((x, i) => (i === estado.activo ? v : x)) : lista.concat([v])
    const i = cambia ? estado.activo : nueva.length - 1
    setGuardando(true)
    escribirEstado(seccion, { lista: nueva, activo: i })
    luego(() => {
      setGuardando(false)
      setVista(null)
      setPop(true)
    }, VIAJE)
    luego(() => setPop(false), REBOTE)
  }

  /* Tocar otro de la lista lo pone a filtrar la tienda. */
  const activar = i => escribirEstado(seccion, { lista, activo: i })

  const quitar = () => {
    const nueva = lista.filter((_, i) => i !== estado.activo)
    escribirEstado(seccion, { lista: nueva, activo: 0 })
  }

  const empezar = comoModo => {
    setModo(comoModo)
    setMarca(null)
    setModelo(null)
    setAno(null)
    setVista('marca')
  }

  /* El año no siempre es el ultimo paso: si ese modelo y ese año tienen mas
     de un motor, falta uno. Dos Corolla 2021 llevan filtro distinto segun
     sean 1.8 hibrido o 2.0. */
  const trasElAno = y => {
    setAno(y)
    if (pideMotor(seccion, marca, modelo, y)) {
      setVista('motor')
      return
    }
    guardar({ marca, modelo, ano: y })
  }

  const cerrar = () => setVista(null)
  const esPaso = vista === 'marca' || vista === 'modelo' || vista === 'ano' || vista === 'motor'

  let titulo = 'Mis vehículos'
  let opciones = []
  if (vista === 'marca') {
    titulo = '¿De qué marca es?'
    opciones = marcas.map(m => ({
      clave: m,
      texto: m,
      elegir: () => { setMarca(m); setModelo(null); setVista('modelo') },
    }))
  } else if (vista === 'modelo') {
    titulo = `¿Qué ${marca} tienes?`
    opciones = modelosDe(marca).map(m => ({
      clave: m,
      texto: m,
      elegir: () => { setModelo(m); setVista('ano') },
    }))
  } else if (vista === 'ano') {
    titulo = '¿De qué año es?'
    const rango = (base[marca] || {})[modelo] || [1990, 2026]
    const anos = []
    for (let y = rango[1]; y >= rango[0]; y -= 1) anos.push(String(y))
    opciones = anos.map(y => ({
      clave: y,
      texto: y,
      elegir: () => trasElAno(y),
    }))
  } else if (vista === 'motor') {
    titulo = '¿Qué motor tiene?'
    opciones = motoresDe(seccion, marca, modelo, ano).map(mo => ({
      clave: mo.id,
      texto: mo.nombre,
      elegir: () => guardar({ marca, modelo, ano, motor: mo.id }),
    }))
  }

  /* En /motos el icono es una moto. Mismo viewBox y mismo trazo redondo que
     el carro, asi que todos los tamaños de abajo calzan sin tocar nada. */
  const esMoto = seccion === 'motos'
  const iconoCarro = (color, ancho, alto) => (
    <svg width={ancho} height={alto} viewBox="0 0 30 22" fill="none" stroke={color}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0 }}>
      {esMoto ? (
        /* Lateral con tanque y sillin. La version "bicicleta" (solo ruedas y
           cuadro) se descarto: a 24 px no se distinguia de una bici. */
        <>
          <circle cx="6.5" cy="16" r="3.8" />
          <circle cx="23.5" cy="16" r="3.8" />
          <path d="M6.5 16 L10.5 16 L13 11 L18 11 L20 16 L23.5 16" />
          <path d="M13 11 Q15.5 8 18.5 8.5" />
          <path d="M18.5 8.5 L21 5 L24 5" />
          <path d="M10.5 11 L9 8.5 L13 8.5" />
        </>
      ) : (
        <>
          <path d="M4 12 L6.5 5.5 Q7 4 8.5 4 L21.5 4 Q23 4 23.5 5.5 L26 12" />
          <path d="M2.5 12 L27.5 12 L27.5 17 L2.5 17 Z" />
          <path d="M6 17 L6 19.5 M24 17 L24 19.5" />
        </>
      )}
    </svg>
  )

  const equis = (color, tam) => (
    <svg width={tam} height={tam} viewBox="0 0 10 10" fill="none" stroke={color}
      strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1l8 8M9 1l-8 8" />
    </svg>
  )

  const css = `
    .rx-veh { position: relative; display: flex; align-items: center }
    .rx-veh__btn { border: 0; background: transparent; cursor: pointer; padding: 0;
      display: flex; align-items: center; justify-content: center; font: inherit }

    /* Movil: circulo de 30 px. El + va chiquito y en la esquina para no
       taparle el carro, que es lo que tiene que reconocerse primero. */
    .rx-veh__circulo { width: 30px; height: 30px; border-radius: 999px; box-sizing: border-box;
      border: 1.5px solid ${RED}; display: flex; align-items: center; justify-content: center;
      position: relative }
    .rx-veh__circulo--lleno { background: ${RED} }
    .rx-veh__mas { position: absolute; top: -3px; right: -3px; width: 12px; height: 12px;
      border-radius: 999px; background: ${RED}; border: 1.5px solid #fff;
      display: flex; align-items: center; justify-content: center }
    /* Cuantos hay guardados. Solo aparece con mas de uno: con uno solo seria
       un "1" que no informa nada. */
    .rx-veh__cuantos { position: absolute; top: -5px; right: -6px; min-width: 15px; height: 15px;
      box-sizing: border-box; padding: 0 3px; border-radius: 999px; background: ${INK};
      border: 1.5px solid #fff; color: #fff; font-size: 9px; font-weight: 800;
      line-height: 12px; text-align: center }

    /* Escritorio: pildora. Punteada mientras esta vacia (es un hueco por
       llenar) y continua cuando ya hay carro. */
    .rx-veh__pildora { display: flex; align-items: center; gap: 8px; height: 44px;
      padding: 0 16px; border-radius: 999px; max-width: 250px; box-sizing: border-box;
      border: 1.5px dashed rgba(255,55,30,.55); background: transparent }
    .rx-veh__pildora--lleno { border-style: solid; border-color: rgba(255,55,30,.45);
      background: rgba(255,55,30,.09) }
    .rx-veh__texto { font-size: 13.5px; font-weight: 700; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; color: ${RED} }
    .rx-veh__pildora--lleno .rx-veh__texto { color: ${INK} }
    .rx-veh__contador { font-size: 10.5px; font-weight: 800; color: #fff; background: ${INK};
      border-radius: 999px; padding: 1px 6px; flex-shrink: 0 }

    .rx-veh__capa { position: fixed; inset: 0; background: rgba(1,1,1,.26); border: 0;
      padding: 0; margin: 0; cursor: default; z-index: 60 }

    .rx-veh__panel { position: absolute; top: calc(100% + 10px); right: 0; width: 290px;
      z-index: 61; background: #fff; border-radius: 18px; border: 1px solid rgba(1,1,1,.06);
      box-shadow: 0 22px 50px -14px rgba(1,1,1,.36); overflow: hidden;
      transform-origin: 100% 0 }
    .rx-veh__cab { display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 14px 12px 10px 16px }
    .rx-veh__cab b { font-size: 13.5px; font-weight: 800 }
    .rx-veh__cerrar { width: 30px; height: 30px; flex-shrink: 0; border: 0; border-radius: 999px;
      background: rgba(1,1,1,.05); display: flex; align-items: center; justify-content: center;
      cursor: pointer; padding: 0 }
    .rx-veh__cuerpo { padding: 0 16px 14px }

    /* La lista. El activo en rojo con el chulo; los demas en blanco con el
       borde gris, que se lee como "disponible" sin competir con el que manda. */
    .rx-veh__lista { display: flex; flex-direction: column; gap: 7px }
    .rx-veh__ficha { display: flex; align-items: center; gap: 10px; width: 100%;
      border-radius: 14px; padding: 11px; text-align: left; font: inherit; cursor: pointer;
      background: #fff; border: 1px solid rgba(1,1,1,.12) }
    .rx-veh__ficha--activo { background: rgba(255,55,30,.07); border-color: rgba(255,55,30,.22);
      cursor: default }
    .rx-veh__ficha:not(.rx-veh__ficha--activo):hover { border-color: rgba(255,55,30,.45) }
    .rx-veh__disco { width: 34px; height: 34px; flex-shrink: 0; border-radius: 999px;
      display: flex; align-items: center; justify-content: center; box-sizing: border-box;
      border: 1.5px solid rgba(255,55,30,.5); background: #fff }
    .rx-veh__ficha--activo .rx-veh__disco { background: ${RED}; border-color: ${RED} }
    .rx-veh__nom { display: block; font-size: 13.5px; font-weight: 800; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; color: ${INK} }
    .rx-veh__sub { display: block; font-size: 11.5px; color: #6b6b70; font-weight: 600;
      margin-top: 1px }

    .rx-veh__acciones { display: flex; gap: 8px; margin-top: 12px }
    .rx-veh__accion { flex: 1 1 0; min-height: 44px; border-radius: 999px; font-size: 13px;
      font-weight: 700; cursor: pointer; font-family: inherit }
    .rx-veh__accion--quitar { border: 1.5px solid rgba(1,1,1,.14); background: #fff; color: ${INK} }
    .rx-veh__accion--cambiar { border: 0; background: ${RED}; color: #fff }

    .rx-veh__opciones { display: flex; flex-wrap: wrap; gap: 6px; max-height: 300px;
      overflow-y: auto }
    .rx-veh__chip { border: 1.5px solid rgba(1,1,1,.12); background: #f7f7f8; color: ${INK};
      border-radius: 999px; padding: 9px 13px; font-size: 13px; font-weight: 600;
      cursor: pointer; min-height: 40px; font-family: inherit }
    .rx-veh__chip:hover { border-color: ${RED}; color: ${RED} }

    .rx-veh__sumar { width: 100%; margin-top: 12px; padding: 12px 0 0;
      border: 0; border-top: 1px solid rgba(1,1,1,.08); background: none; cursor: pointer;
      display: flex; align-items: center; gap: 8px; font: inherit; font-size: 12.5px;
      font-weight: 700; color: ${RED}; min-height: 44px }
    .rx-veh__sumar[disabled] { color: #9a9aa2; cursor: default }
    .rx-veh__tope { font-size: 10px; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; background: #f2f2f4; color: #9a9aa2; border-radius: 999px;
      padding: 3px 7px; margin-left: auto }
    .rx-veh__nota { margin: 0 0 12px; font-size: 12.5px; color: #55555c; line-height: 1.5 }
    .rx-veh__agregar { width: 100%; min-height: 44px; border: 0; background: ${RED}; color: #fff;
      border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 7px; font-family: inherit }

    @keyframes rxVehGuardar {
      0%   { opacity: 1; transform: translate(0,0) scale(1) }
      55%  { opacity: .5 }
      100% { opacity: 0; transform: translate(0,-24px) scale(.18) }
    }
    @keyframes rxVehEntra {
      0%   { opacity: 0; transform: translateY(-7px) scale(.97) }
      100% { opacity: 1; transform: none }
    }
    @keyframes rxVehPop {
      0%,100% { transform: scale(1) }
      30%     { transform: scale(1.3) }
      62%     { transform: scale(.92) }
      82%     { transform: scale(1.07) }
    }
    @keyframes rxVehOnda {
      0%   { box-shadow: 0 0 0 0 rgba(255,55,30,.55) }
      100% { box-shadow: 0 0 0 14px rgba(255,55,30,0) }
    }
    .rx-veh__panel--entra { animation: rxVehEntra .16s ease-out }
    .rx-veh__panel--guardando { animation: rxVehGuardar ${VIAJE}ms cubic-bezier(.45,0,.55,1) forwards;
      pointer-events: none }
    .rx-veh__pop { animation: rxVehPop .54s cubic-bezier(.3,1.4,.5,1) .02s,
      rxVehOnda .62s ease-out .02s }

    @media (prefers-reduced-motion: reduce) {
      .rx-veh__panel--entra, .rx-veh__pop { animation: none }
      .rx-veh__panel--guardando { animation: none; opacity: 0 }
    }
  `

  const panelVisible = vista !== null || guardando
  const etiquetaBoton = hay
    ? `Mis vehículos, ${lista.length} guardado${lista.length > 1 ? 's' : ''}. Filtrando por ${nombre}`
    : 'Agregar mi vehículo'

  return (
    <div className={`rx-veh ${handles.vehiculoHeader || ''}`}>
      <style>{css}</style>

      <button
        ref={boton}
        type="button"
        className={`rx-veh__btn ${handles.vehiculoBoton || ''}`}
        aria-expanded={vista !== null}
        aria-label={etiquetaBoton}
        onClick={() => setVista(vista === null ? 'lista' : null)}
      >
        {variante === 'circulo' ? (
          <span className={`rx-veh__circulo ${hay ? 'rx-veh__circulo--lleno' : ''} ${pop ? 'rx-veh__pop' : ''}`}>
            {iconoCarro(hay ? '#FFFFFF' : RED, 19, 14)}
            {!hay ? (
              <span className="rx-veh__mas" aria-hidden="true">
                <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="#fff"
                  strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 1.5v7M1.5 5h7" />
                </svg>
              </span>
            ) : null}
            {lista.length > 1 ? (
              <span className="rx-veh__cuantos" aria-hidden="true">{lista.length}</span>
            ) : null}
          </span>
        ) : (
          <span className={`rx-veh__pildora ${hay ? 'rx-veh__pildora--lleno' : ''} ${pop ? 'rx-veh__pop' : ''}`}>
            {iconoCarro(RED, 24, 17)}
            {!hay ? (
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke={RED}
                strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M5 1v8M1 5h8" />
              </svg>
            ) : null}
            <span className="rx-veh__texto">{hay ? nombre : etiquetaVacia}</span>
            {lista.length > 1 ? (
              <span className="rx-veh__contador" aria-hidden="true">{lista.length}</span>
            ) : null}
            {hay ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={RED}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ flexShrink: 0 }}>
                <path d="M2 4.5 6 8.5 10 4.5" />
              </svg>
            ) : null}
          </span>
        )}
      </button>

      {/* Clic por fuera: cierra sin tocar nada. */}
      {vista !== null ? (
        <button type="button" className="rx-veh__capa" aria-label="Cerrar sin hacer cambios"
          onClick={cerrar} />
      ) : null}

      {panelVisible ? (
        <div
          role="dialog"
          aria-label="Mis vehículos"
          className={`rx-veh__panel ${guardando ? 'rx-veh__panel--guardando' : 'rx-veh__panel--entra'} ${handles.vehiculoPanel || ''}`}
        >
          <div className="rx-veh__cab">
            <b>{titulo}</b>
            <button type="button" className="rx-veh__cerrar" aria-label="Cerrar" onClick={cerrar}>
              {equis('#6B6B70', 10)}
            </button>
          </div>

          {esPaso ? (
            <div className="rx-veh__cuerpo">
              <div className="rx-veh__opciones">
                {opciones.map(o => (
                  <button key={o.clave} type="button" className="rx-veh__chip" onClick={o.elegir}>
                    {o.texto}
                  </button>
                ))}
              </div>
              {vista === 'ano' || vista === 'motor' ? (
                <button
                  type="button"
                  style={{ marginTop: '12px', border: 0, background: 'transparent', color: RED,
                    fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', padding: '6px 0',
                    fontFamily: 'inherit' }}
                  onClick={() => (vista === 'motor'
                    ? guardar({ marca, modelo, ano, motor: null })
                    : trasElAno(null))}
                >
                  {vista === 'motor' ? 'No sé cuál es' : 'No sé el año'}
                </button>
              ) : null}
            </div>
          ) : null}

          {!esPaso && hay ? (
            <div className="rx-veh__cuerpo">
              <div className="rx-veh__lista">
                {lista.map((v, i) => {
                  const esActivo = i === estado.activo
                  return (
                    <button
                      key={`${v.marca}-${v.modelo}-${v.ano || 's'}-${i}`}
                      type="button"
                      className={`rx-veh__ficha ${esActivo ? 'rx-veh__ficha--activo' : ''}`}
                      aria-pressed={esActivo}
                      aria-label={esActivo
                        ? `${nombreConMotor(v)}, filtrando la tienda`
                        : `Filtrar la tienda por ${nombreConMotor(v)}`}
                      onClick={esActivo ? undefined : () => activar(i)}
                    >
                      <span className="rx-veh__disco">
                        {iconoCarro(esActivo ? '#FFFFFF' : RED, 21, 15)}
                      </span>
                      <span style={{ flexGrow: 1, minWidth: 0 }}>
                        <span className="rx-veh__nom">{nombreConMotor(v)}</span>
                        <span className="rx-veh__sub">
                          {v.ano ? `Modelo ${v.ano}` : 'Año sin definir'}
                        </span>
                      </span>
                      {esActivo ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={RED}
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true" style={{ flexShrink: 0 }}>
                          <path d="M2.5 8.5 6 12l7.5-8" />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className="rx-veh__acciones">
                <button type="button" className="rx-veh__accion rx-veh__accion--quitar"
                  onClick={quitar}>
                  Quitar
                </button>
                <button type="button" className="rx-veh__accion rx-veh__accion--cambiar"
                  onClick={() => empezar('cambiar')}>
                  Cambiar
                </button>
              </div>

              <button type="button" className="rx-veh__sumar" disabled={lleno}
                onClick={lleno ? undefined : () => empezar('agregar')}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M8 3.5v9M3.5 8h9" />
                </svg>
                <span>Agregar otro {esMoto ? 'vehículo' : 'vehículo'}</span>
                {lleno ? <span className="rx-veh__tope">Máximo {MAX_VEHICULOS}</span> : null}
              </button>
            </div>
          ) : null}

          {!esPaso && !hay ? (
            <div className="rx-veh__cuerpo">
              <p className="rx-veh__nota">
                Todavía no has agregado ninguno. Cuando agregues tu {esMoto ? 'moto' : 'carro'},
                la tienda te muestra solo lo que le sirve.
              </p>
              <button type="button" className="rx-veh__agregar" onClick={() => empezar('agregar')}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff"
                  strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Agregar mi {esMoto ? 'moto' : 'carro'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

VehiculoHeader.schema = {
  title: 'Vehículo (header)',
  type: 'object',
  properties: {
    variante: {
      title: 'Forma',
      type: 'string',
      enum: ['circulo', 'pildora'],
      default: 'pildora',
    },
    etiquetaVacia: { title: 'Texto sin vehículo', type: 'string', default: 'Agregar vehículo' },
  },
}
