/*
 * "Para tu Chevrolet Onix", sobre los resultados.
 *
 * El header no muestra que carro quedo guardado: solo el icono lleno. Eso
 * deja el header limpio pero abre un hueco — alguien puede navegar filtrado
 * por el carro de otra persona sin notarlo, sobre todo si presta el celular.
 *
 * Esta linea cierra ese hueco donde corresponde: dentro de la pagina, junto a
 * los resultados que el vehiculo esta filtrando. "Cambiar" abre el panel del
 * header, que es el unico sitio donde el vehiculo se toca.
 *
 * Sin vehiculo no pinta nada.
 */
import React, { useEffect, useState } from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import indice from './cris-index.json'
import vehiculos from './data/vehiculos-colombia.json'
import {
  seccionDe, rutaDe, leer, suscribir, nombreConMotor, nombreDe, pedirAbrir,
  esElectrico, escribir as guardarVehiculo, mismoVehiculo,
  vehiculoDeRuta, rutaConVehiculo,
} from './vehiculo'

const CSS_HANDLES = ['vehiculoEnPagina']
const RED = '#FF371E'
const AMBAR = '#B4690E'

/* El nodo del catalogo al que corresponde esta pagina. En una busqueda libre
   no hay nodo (la ruta lleva ?_q=...) y no pasa nada: simplemente no avisa. */
const nodoDe = ruta => {
  const limpia = String(ruta || '').split('?')[0].replace(/\/+$/, '')
  if (!limpia) return null
  return indice.nodos.find(n => n.path === limpia) || null
}

export default function VehiculoEnPagina({ prefijo = 'Para tu' }) {
  const handles = useCssHandles(CSS_HANDLES)
  const { route, navigate } = useRuntime()
  const seccion = seccionDe(rutaDe(route))

  const [vehiculo, setVehiculo] = useState(null)
  /* El carro por el que esta filtrando la pagina, que sale de la URL y no
     del almacenamiento. Se lee en el efecto y no en el render porque en el
     servidor no hay window: pintarlo antes de hidratar mezclaria los dos. */
  const [enLaUrl, setEnLaUrl] = useState(null)

  useEffect(() => {
    if (seccion === 'herramientas') return undefined
    setVehiculo(leer(seccion))
    try {
      setEnLaUrl(vehiculoDeRuta(
        window.location.pathname, window.location.search,
        vehiculos[seccion === 'motos' ? 'motos' : 'carros'] || {}
      ))
    } catch (e) {
      setEnLaUrl(null)
    }
    return suscribir(seccion, setVehiculo)
  }, [seccion, route])

  /* Tres situaciones, no dos:
       - la pagina filtra por el carro guardado  -> "Para tu ..."
       - la pagina filtra por OTRO carro         -> conflicto
       - la pagina no filtra por ninguno         -> "Para tu ..." si hay
     El conflicto aparece cuando alguien busca "pastillas corolla" teniendo
     un Aveo guardado: ve resultados de un carro que no es el suyo y hoy
     nada se lo dice. */
  const hayConflicto = !!(enLaUrl && enLaUrl.marca && !mismoVehiculo(enLaUrl, vehiculo))
  /* Tener un carro guardado NO filtra la pagina: VTEX filtra por lo que
     esta en la URL y nada mas. Decir "Para tu Aveo" en una categoria que
     muestra todo es mentirle al cliente, asi que cuando la pagina no esta
     filtrando se le ofrece aplicar el filtro en vez de afirmarlo. */
  const filtrando = !!(enLaUrl && enLaUrl.marca)

  /* En una busqueda libre no hay categoria en la ruta, asi que no hay a
     donde ir con el filtro puesto: ahi no se ofrece. */
  const puedeFiltrar = (() => {
    try {
      return !!rutaConVehiculo(window.location.pathname, window.location.search, vehiculo)
    } catch (e) {
      return false
    }
  })()

  const irA = veh => {
    const destino = rutaConVehiculo(window.location.pathname, window.location.search, veh)
    if (!destino) return
    const [to, query] = destino.split('?')
    navigate({ to, query })
  }

  if (!hayConflicto && (!vehiculo || !vehiculo.marca)) return null

  /* Esta categoria no existe en un 100% electrico: filtro de aceite, bujias,
     correa de reparticion. Cris ya no se la ofrece, pero aqui se puede llegar
     por el menu o por un enlace, y callarse termina en una devolucion. */
  const enContexto = hayConflicto ? enLaUrl : vehiculo
  const nodo = nodoDe(rutaDe(route))
  const noLeSirve = !!(
    nodo && nodo.soloCombustion && enContexto &&
    esElectrico(seccion, enContexto.marca, enContexto.modelo, enContexto.motor)
  )
  const queEs = nodo ? nodo.nombre.toLowerCase() : 'esta categoría'

  const css = `
    .rx-vp { display: flex; align-items: center; gap: 6px; margin: 0 0 .75rem;
      flex-wrap: wrap }
    .rx-vp__nombre { font-size: .8125rem; font-weight: 700; color: #010101;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
    .rx-vp__ano { font-size: .8125rem; font-weight: 600; color: #9a9aa2 }
    /* "Cambiar" va pegado al nombre, no empujado al borde: en una pagina de
       1440 px el margin-left:auto lo mandaba al otro extremo de la pantalla y
       se leia como un boton suelto sin relacion con el texto. */
    .rx-vp__cambiar { border: 0; background: transparent; color: ${RED};
      font: inherit; font-size: .75rem; font-weight: 700; cursor: pointer;
      padding: .25rem .375rem; margin-left: .25rem }
    .rx-vp__cambiar:hover { text-decoration: underline }
    @media (min-width: 40rem) {
      .rx-vp__nombre, .rx-vp__ano { font-size: .9375rem }
      .rx-vp__cambiar { font-size: .8125rem }
    }

    /* El aviso no es un error del cliente: es un dato de su carro. Por eso
       va en ambar y no en rojo, y no esconde los productos — los explica. */
    .rx-vp--ojo { align-items: flex-start; gap: .5rem; padding: .625rem .75rem;
      border-radius: .5rem; background: rgba(180,105,14,.07);
      border-left: 3px solid ${AMBAR} }
    .rx-vp__texto { font-size: .8125rem; line-height: 1.45; color: #55555C }
    .rx-vp__texto b { color: #010101; font-weight: 700 }
    .rx-vp--ojo .rx-vp__cambiar { color: ${AMBAR}; margin-left: 0; padding-left: 0 }

    /* El conflicto: titulo, explicacion y las tres salidas. Las salidas van
       como botones y no como enlaces de texto porque son acciones, y la de
       guardar va marcada: es la que la mayoria quiere. */
    .rx-vp__fuerte { display: block; font-size: .875rem; font-weight: 800; color: #010101 }
    .rx-vp__sub { display: block; margin-top: .125rem }
    .rx-vp__salidas { display: flex; flex-wrap: wrap; gap: .375rem; margin-top: .5rem }
    .rx-vp__salida { border: 1px solid rgba(1,1,1,.14); background: #fff; color: #010101;
      border-radius: .5rem; padding: .375rem .625rem; font: inherit; font-size: .75rem;
      font-weight: 700; cursor: pointer }
    .rx-vp__salida:hover { border-color: ${AMBAR}; color: ${AMBAR} }
    .rx-vp__salida--si { background: ${AMBAR}; border-color: ${AMBAR}; color: #fff }
    .rx-vp__salida--si:hover { background: #9A5A0C; border-color: #9A5A0C; color: #fff }
    @media (min-width: 40rem) { .rx-vp__salida { font-size: .8125rem } }
    @media (min-width: 40rem) {
      .rx-vp__texto { font-size: .875rem }
    }
  `

  /* El conflicto: la pagina filtra por un carro que no es el guardado.
     Va en ambar, no en rojo: no es un error del cliente, es un dato de
     donde esta parado. Y no esconde nada — explica lo que ya esta viendo. */
  if (hayConflicto) {
    const nombreUrl = nombreDe(enLaUrl)
    const tuyo = vehiculo && vehiculo.marca ? nombreConMotor(vehiculo) : null
    return (
      <div className={`rx-vp rx-vp--ojo ${handles.vehiculoEnPagina || ''}`} role="status">
        <style>{css}</style>
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke={AMBAR}
          strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '.125rem' }}>
          <circle cx="11" cy="11" r="9" />
          <path d="M11 6.5v5.5M11 15.2v.1" />
        </svg>
        <div className="rx-vp__texto">
          <b className="rx-vp__fuerte">Viendo {nombreUrl}</b>
          <span className="rx-vp__sub">
            {tuyo
              ? `Lo escribiste en la búsqueda. Tu vehículo guardado sigue siendo ${tuyo}.`
              : 'Lo escribiste en la búsqueda. No tienes ningún vehículo guardado.'}
          </span>
          <span className="rx-vp__salidas">
            <button type="button" className="rx-vp__salida rx-vp__salida--si"
              onClick={() => guardarVehiculo(seccion, enLaUrl)}>
              Guardar {nombreUrl}
            </button>
            {tuyo ? (
              <button type="button" className="rx-vp__salida" onClick={() => irA(vehiculo)}>
                Volver a mi {nombreDe(vehiculo)}
              </button>
            ) : null}
            <button type="button" className="rx-vp__salida" onClick={() => irA(null)}>
              Ver sin filtrar por vehículo
            </button>
          </span>
        </div>
      </div>
    )
  }

  if (noLeSirve) {
    return (
      <div className={`rx-vp rx-vp--ojo ${handles.vehiculoEnPagina || ''}`} role="status">
        <style>{css}</style>
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke={AMBAR}
          strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '.125rem' }}>
          <circle cx="11" cy="11" r="9" />
          <path d="M11 6.5v5.5M11 15.2v.1" />
        </svg>
        <div className="rx-vp__texto">
          Tu <b>{nombreConMotor(enContexto)}</b> es eléctrico y no lleva {queEs}.
          Lo que ves aquí es para carros de gasolina o diésel.
          <button type="button" className="rx-vp__cambiar" onClick={() => pedirAbrir(seccion)}>
            Cambiar vehículo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rx-vp ${handles.vehiculoEnPagina || ''}`}>
      <style>{css}</style>
      {/* Carro o moto segun la seccion, misma estetica de trazo. */}
      <svg width="16" height="12" viewBox="0 0 30 22" fill="none" stroke={RED}
        strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ flexShrink: 0 }}>
        {seccion === 'motos' ? (
          <>
            <circle cx="6.5" cy="16" r="3.8" />
            <circle cx="23.5" cy="16" r="3.8" />
            <path d="M6.5 16 L10.5 16 L13 11 L18 11 L20 16 L23.5 16" />
            <path d="M18.5 8.5 L21 5 L24 5" />
          </>
        ) : (
          <>
            <path d="M4 12 L6.5 5.5 Q7 4 8.5 4 L21.5 4 Q23 4 23.5 5.5 L26 12" />
            <path d="M2.5 12 L27.5 12 L27.5 17 L2.5 17 Z" />
          </>
        )}
      </svg>
      <span className="rx-vp__nombre">
        {filtrando ? prefijo : 'Tu vehículo:'} {nombreConMotor(vehiculo)}
      </span>
      {vehiculo.ano ? <span className="rx-vp__ano">· {vehiculo.ano}</span> : null}
      {!filtrando && puedeFiltrar ? (
        <button type="button" className="rx-vp__cambiar" onClick={() => irA(vehiculo)}>
          Ver solo lo que le sirve
        </button>
      ) : null}
      <button type="button" className="rx-vp__cambiar" onClick={() => pedirAbrir(seccion)}>
        Cambiar
      </button>
    </div>
  )
}

VehiculoEnPagina.schema = {
  title: 'Vehículo en la página',
  type: 'object',
  properties: {
    prefijo: { title: 'Texto antes del nombre', type: 'string', default: 'Para tu' },
  },
}
