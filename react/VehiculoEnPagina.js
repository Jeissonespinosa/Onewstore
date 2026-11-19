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

import { seccionDe, leer, suscribir, nombreDe, pedirAbrir } from './vehiculo'

const CSS_HANDLES = ['vehiculoEnPagina']
const RED = '#FF371E'

export default function VehiculoEnPagina({ prefijo = 'Para tu' }) {
  const handles = useCssHandles(CSS_HANDLES)
  const { route } = useRuntime()
  const winPath =
    typeof window !== 'undefined' && window.location ? window.location.pathname : ''
  const ruta = (winPath || (route && route.path) || '').split('?')[0]
  const seccion = seccionDe(ruta)

  const [vehiculo, setVehiculo] = useState(null)

  useEffect(() => {
    if (seccion === 'herramientas') return undefined
    setVehiculo(leer(seccion))
    return suscribir(seccion, setVehiculo)
  }, [seccion])

  if (!vehiculo || !vehiculo.marca) return null

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
  `

  return (
    <div className={`rx-vp ${handles.vehiculoEnPagina || ''}`}>
      <style>{css}</style>
      <svg width="16" height="12" viewBox="0 0 30 22" fill="none" stroke={RED}
        strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ flexShrink: 0 }}>
        <path d="M4 12 L6.5 5.5 Q7 4 8.5 4 L21.5 4 Q23 4 23.5 5.5 L26 12" />
        <path d="M2.5 12 L27.5 12 L27.5 17 L2.5 17 Z" />
      </svg>
      <span className="rx-vp__nombre">{prefijo} {nombreDe(vehiculo)}</span>
      {vehiculo.ano ? <span className="rx-vp__ano">· {vehiculo.ano}</span> : null}
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
