/*
 * El logo del header, que sabe donde esta parado.
 *
 * El bloque logo de VTEX lleva un href fijo, asi que desde /carros el logo
 * mandaba al home — al selector de carro/moto — y el cliente tenia que volver
 * a elegir lo que ya habia elegido. Aqui el destino sale de la seccion:
 *
 *   /carros/...         -> /carros
 *   /motos/...          -> /motos
 *   /herramientas/...   -> /herramientas
 *   el resto            -> /
 *
 *   variante "logotipo"  la marca completa (escritorio y tablet)
 *   variante "isotipo"   solo la marca alada (movil)
 *
 * DE DONDE SALEN LOS DOS. Del manual de marca
 * (referencias/manual de marca/), ya recortados. Antes aqui habia dos
 * LAMINAS enteras del manual, de 2551x3301, que se pintaban como fondo y se
 * corrian con background-position hasta dejar la marca dentro de la caja.
 * Funcionaba, pero el header se bajaba 134 KB —61 KB de una lamina y 73 KB
 * de la otra— para pintar un logo de 30 px, y cualquier retoque del encuadre
 * era recalcular cuatro numeros a mano.
 *
 *   isotipo      SVG, 1,4 KB. Se reconstruyo desde los trazos vectoriales
 *                del PDF del manual (pagina 13), asi que es el dibujo
 *                original, no un trazado. Al ir en vector se ve nitido a
 *                cualquier tamaño y toma el color del CSS con currentColor:
 *                el mismo archivo sirve en rojo sobre claro y en blanco
 *                sobre oscuro.
 *   logotipo     PNG, 9,6 KB, a 420x90 (x3 del alto que usa el header). La
 *                palabra no esta en vector en el PDF que tenemos —la version
 *                larga del manual no vino— asi que se usa el PNG oficial
 *                recortado al contenido. No se reconstruyo el lockup a mano:
 *                la separacion entre simbolo y palabra la fija el manual y
 *                calcularla a ojo se nota.
 *
 * VAN DENTRO DEL ARCHIVO, no en el file manager. Se probo a dejarlos como
 * archivos del theme y el builder de react NO los sirve: compila el import a
 * una ruta que responde 404. Entre eso y volver a depender de que alguien
 * suba dos imagenes a mano, pesan menos aqui: 14 KB en total contra los 134
 * de antes, y viajan con el codigo.
 *
 * Si algun dia se suben al file manager, las props urlLogotipo y urlIsotipo
 * aceptan una URL y el componente la usa en vez de lo de aqui.
 *
 * Los cuatro recortes (rojo y blanco de cada uno) estan en docs/logos/.
 */
import React from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import { seccionDe, rutaDe } from './vehiculo'

const CSS_HANDLES = ['logoRx', 'logoRxImagen']

/* El isotipo, en vector. currentColor: lo tiñe el CSS de quien lo use. */
const ISOTIPO_VB = '0 0 132.87 104.44'
const ISOTIPO_D = 'M77.15 54.65L24.68 54.65C23.95 54.65 23.58 55.52 24.08 56.04C33.14 65.46 45.65 70.79 58.72 70.79L75.74 70.79C76.16 70.79 76.51 70.47 76.56 70.05L77.97 55.55C78.01 55.06 77.63 54.65 77.15 54.65Z M74.17 78.05L46.64 78.05C45.92 78.05 45.55 78.92 46.05 79.44L51.55 85.16C57.09 90.93 64.75 94.2 72.75 94.2C73.18 94.2 73.53 93.87 73.57 93.45L74.98 78.95C75.03 78.47 74.65 78.05 74.17 78.05Z M126.72 69.77L106.38 54.28C106.69 50.29 107.01 46.29 107.33 42.29C108.12 32.72 109.96 22.56 105.39 13.61C100.4 3.83 88.72 0.0 78.44 1.94C66.66 4.16 58.14 15.41 55.94 26.68C55.65 28.13 55.67 29.64 55.97 31.09L1.1 31.09C0.37 31.09 0.0 31.96 0.5 32.48C9.56 41.91 22.07 47.23 35.14 47.23L78.33 47.23C78.75 47.23 79.1 46.91 79.15 46.49L80.56 31.99C80.6 31.51 80.23 31.09 79.74 31.09L74.03 31.09C74.26 30.07 74.55 29.07 74.82 28.05C75.31 26.14 76.55 24.34 77.91 22.92C79.12 21.67 80.63 20.67 82.32 20.25C84.26 19.77 86.78 20.07 88.12 21.68C90.59 24.64 89.98 28.63 89.65 32.15L88.47 44.71C87.69 53.0 87.18 61.33 86.54 69.62C85.88 78.01 85.21 86.4 84.49 94.78C84.48 94.82 83.53 104.19 83.52 104.23C83.52 104.23 89.07 104.44 93.8 104.23C99.21 103.98 102.66 100.12 103.12 94.9C103.66 88.68 104.16 82.46 104.65 76.24L117.31 85.87C121.32 88.92 127.74 86.5 130.06 82.53C132.87 77.74 130.74 72.83 126.72 69.77Z'

/* El isologotipo, 420x90. */
const LOGOTIPO_PNG = 'data:image/png;base64,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'

/* Proporciones del contenido, para calcular el ancho a partir del alto. */
const RAZON = { logotipo: 420 / 90, isotipo: 132.87 / 104.44 }

export default function LogoRx({
  variante = 'logotipo',
  urlLogotipo = '',
  urlIsotipo = '',
  alto = 30,
}) {
  const handles = useCssHandles(CSS_HANDLES)
  const { route } = useRuntime()
  const ruta = rutaDe(route)
  const seccion = seccionDe(ruta)

  /* seccionDe() devuelve "carros" tanto en /carros como en cualquier ruta que
     no sea moto ni herramienta, asi que el home tiene que mirarse aparte: ahi
     el logo se queda en el home. */
  const enSeccion = /^\/(carros|motos|herramientas)(\/|$)/.test(ruta)
  const destino = enSeccion ? '/' + seccion : '/'

  const titulo = enSeccion
    ? `Repuestox, ir a ${seccion}`
    : 'Repuestox, ir al inicio'

  const esIso = variante === 'isotipo'
  const ancho = Math.round(alto * RAZON[esIso ? 'isotipo' : 'logotipo'])
  const url = esIso ? urlIsotipo : urlLogotipo

  const css = `
    .rx-logo{display:inline-flex;align-items:center;text-decoration:none;flex-shrink:0;
      color:#FF371E}
    .rx-logo__marca{display:block;width:${ancho}px;height:${alto}px;flex-shrink:0}
  `

  /* Con URL puesta manda la URL; si no, lo que viene en este archivo. El
     isotipo es SVG y hereda el color, el logotipo es una imagen. */
  const marca = url ? (
    <img className={`rx-logo__marca ${handles.logoRxImagen || ''}`} src={url}
      alt="Repuestox" width={ancho} height={alto} />
  ) : esIso ? (
    <svg className={`rx-logo__marca ${handles.logoRxImagen || ''}`}
      viewBox={ISOTIPO_VB} width={ancho} height={alto} role="img" aria-label="Repuestox"
      xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" fillRule="evenodd" d={ISOTIPO_D} />
    </svg>
  ) : (
    <img className={`rx-logo__marca ${handles.logoRxImagen || ''}`} src={LOGOTIPO_PNG}
      alt="Repuestox" width={ancho} height={alto} />
  )

  return (
    <a
      href={destino}
      aria-label={titulo}
      title={titulo}
      className={`rx-logo ${handles.logoRx || ''}`}
    >
      <style>{css}</style>
      {marca}
    </a>
  )
}

LogoRx.schema = {
  title: 'Logo Repuestox',
  type: 'object',
  properties: {
    variante: {
      title: 'Forma',
      description: 'logotipo: marca completa (escritorio y tablet). isotipo: solo el símbolo (móvil).',
      type: 'string',
      enum: ['logotipo', 'isotipo'],
      default: 'logotipo',
    },
    alto: { title: 'Alto en px', type: 'number', default: 30 },
    urlLogotipo: {
      title: 'URL del logotipo',
      description: 'Opcional. Si se pone, se usa en vez del que trae el componente.',
      type: 'string',
    },
    urlIsotipo: {
      title: 'URL del isotipo',
      description: 'Opcional. Si se pone, se usa en vez del que trae el componente.',
      type: 'string',
    },
  },
}
