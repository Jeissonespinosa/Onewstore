/*
 * El favicon: el isotipo, el que se ve en la pestaña del navegador.
 *
 * La tienda no tenia ninguno. /favicon.ico respondia 403 y en el HTML no
 * habia un solo <link rel="icon">, asi que cada pestaña salia con el icono
 * en blanco del navegador y un marcador guardado no se reconocia.
 *
 * POR QUE VA AQUI Y NO EN LOS AJUSTES DE LA CUENTA. VTEX lo tiene en
 * Apps > VTEX Store > Settings, campo faviconLinks, pero esa pantalla
 * responde "Error rendering extension point" en esta cuenta. Helmet hace lo
 * mismo desde el theme, viaja con el codigo y no depende de que nadie entre
 * al admin. Si algun dia se llenan los ajustes, esos ganan y este bloque se
 * puede quitar.
 *
 * Los tres van en data URI, sin archivo que subir:
 *
 *   svg        1,4 KB. El vector del isotipo. Lo usan los navegadores al dia
 *              y se ve nitido en cualquier densidad de pantalla.
 *   png 32     0,9 KB. Para los que no entienden favicon en SVG.
 *   apple 180  3,9 KB. Para "añadir a pantalla de inicio" en iOS, con fondo
 *              blanco porque iOS no respeta la transparencia: la deja negra.
 *
 * El dibujo se centra en un lienzo cuadrado con aire: el isotipo es mas
 * ancho que alto y pegado al borde se ve apretado en 16 px.
 *
 * Los archivos sueltos estan en docs/logos/.
 */
import React from 'react'
import { Helmet } from 'vtex.render-runtime'

const SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 154.50 154.50'%3E%3Cpath fill='%23FF371E' fill-rule='evenodd' transform='translate(10.81 25.03)' d='M77.15 54.65L24.68 54.65C23.95 54.65 23.58 55.52 24.08 56.04C33.14 65.46 45.65 70.79 58.72 70.79L75.74 70.79C76.16 70.79 76.51 70.47 76.56 70.05L77.97 55.55C78.01 55.06 77.63 54.65 77.15 54.65Z M74.17 78.05L46.64 78.05C45.92 78.05 45.55 78.92 46.05 79.44L51.55 85.16C57.09 90.93 64.75 94.2 72.75 94.2C73.18 94.2 73.53 93.87 73.57 93.45L74.98 78.95C75.03 78.47 74.65 78.05 74.17 78.05Z M126.72 69.77L106.38 54.28C106.69 50.29 107.01 46.29 107.33 42.29C108.12 32.72 109.96 22.56 105.39 13.61C100.4 3.83 88.72 0.0 78.44 1.94C66.66 4.16 58.14 15.41 55.94 26.68C55.65 28.13 55.67 29.64 55.97 31.09L1.1 31.09C0.37 31.09 0.0 31.96 0.5 32.48C9.56 41.91 22.07 47.23 35.14 47.23L78.33 47.23C78.75 47.23 79.1 46.91 79.15 46.49L80.56 31.99C80.6 31.51 80.23 31.09 79.74 31.09L74.03 31.09C74.26 30.07 74.55 29.07 74.82 28.05C75.31 26.14 76.55 24.34 77.91 22.92C79.12 21.67 80.63 20.67 82.32 20.25C84.26 19.77 86.78 20.07 88.12 21.68C90.59 24.64 89.98 28.63 89.65 32.15L88.47 44.71C87.69 53.0 87.18 61.33 86.54 69.62C85.88 78.01 85.21 86.4 84.49 94.78C84.48 94.82 83.53 104.19 83.52 104.23C83.52 104.23 89.07 104.44 93.8 104.23C99.21 103.98 102.66 100.12 103.12 94.9C103.66 88.68 104.16 82.46 104.65 76.24L117.31 85.87C121.32 88.92 127.74 86.5 130.06 82.53C132.87 77.74 130.74 72.83 126.72 69.77Z'/%3E%3C/svg%3E"
const PNG32 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADP0lEQVR42u1WS0sbURQ+80omiZqYpEq0CY2PKJYWfJAuRfANLtwpVBDd+RPElagrdSMSshKzU3HnRnQhqOADXyWiwSqCaBKjMY5jZjLPLkpkpFGTVGkXfjAw5xy497tnvvudAXjHO/4xkNdYxKrCrC0GTYtFhVmCvBhcuGUXfKzge3P2KAA6bDMM804rL3+zyfFHclqlqSLTVCaGZL5pBzyFJk+HWdfxVH0+wsw3+kKNLxwiPbSbtO3PbQ4A0GDQNNTpybo3IdCXp+9Txut0bL3j51XHMsUuK/PNerL5uXXwdDbPI7C8Mi1RFo/9nOivP7ysp0SZ8jK8d+eLZSdeyyGwnKQIVGeqqx0k7khK9WrcqozPOOGsTk/WzYaZWRlATuUwDwQCvBjwFJo8NjVuS7Ujzgy1c/CjYXA2zMyacdSsrDGSzCSlAR8r+Cq8gYqJED0hybKUKolzTjwHAMglsNxE+aQ0cC1I110n4a7+89v+7ybd91o9WesgCQeJIuRLBI5jwnEiAn5e9KcswtOYeDpwQQ0MXFADqXbCQmAWZRwRpUjat6DTrOss1RClyWw8eUVPHjDCQQ6BPlK9XY3b0yawSsdWe/OzeotJovglAit3sZUDRjgw49gjEQ5ZDUMOEnf0nN70JBLks0Z0xApHVd5A1aifGmUk6Vk1x791BoZk/NHJDxmdG59zN0pIvCTtWWDEUWNrtqa1JousKVDjBSoUUSnrTYeXTSFBCh1+tRyWaIiSRGvQokR3n4S7p8PR6Vcdx49uUmX+tRHHjE/VRVkWnd6AczvKb6dsxQYMMbjsRhcGCKbM70W5vcELahAAQIui2gdvYXjfWPBubMSWPaJGETUAAIYgWLlOVZ4WgYgoR5ao2JLrU7YLQZCH7pEokAAAWRiSpfSMG0G6GQ/S42s0tzZTZJ6xk7j9hBVO5iLMXNrDyH1JuyOCFHHbjW49jup/27gUSGRCIUEMAQBs3XNbpT8uSss0RNk+w+/zMvB/NQ2nwtGpRYpdbDNp2yp1qsrFW3YxEYEgLwXj75wM3G6U332VcRy37fEgPa7M5eCPTWj7nttOehq+BlhZZuPd2LyPbbovaff7f/87/nv8Au9cW0M682EVAAAAAElFTkSuQmCC'
const APPLE = 'data:image/png;base64,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'

export default function IconoRx({ svg = SVG, png = PNG32, apple = APPLE }) {
  return (
    <Helmet>
      <link rel="icon" type="image/svg+xml" href={svg} />
      <link rel="icon" type="image/png" sizes="32x32" href={png} />
      <link rel="apple-touch-icon" sizes="180x180" href={apple} />
    </Helmet>
  )
}

IconoRx.schema = {
  title: 'Favicon Repuestox',
  description: 'El icono de la pestaña. Vacío usa el isotipo que trae el theme.',
  type: 'object',
  properties: {
    svg: { title: 'SVG (URL o data URI)', type: 'string' },
    png: { title: 'PNG 32x32', type: 'string' },
    apple: { title: 'Apple touch icon 180x180', type: 'string' },
  },
}
