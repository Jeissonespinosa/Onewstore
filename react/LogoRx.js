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
 *   variante "logotipo"  la marca completa (escritorio)
 *   variante "isotipo"   solo la marca alada (movil)
 *
 * LOS DOS ARCHIVOS SON LAMINAS DEL MANUAL DE MARCA, no logos recortados:
 * 2551x3301 cada uno, con la marca al centro y el resto transparente. Pedirle
 * una altura al <img> escala la lamina entera, asi que la marca sale diminuta
 * (el logotipo quedaba en 4 px de alto, un guion rojo) o deformada.
 *
 * Por eso los dos se pintan como fondo recortado. Las medidas salen del alfa
 * de cada archivo:
 *
 *   logotipo  2368x508  desde (92, 1396)
 *   isotipo   1265x994  desde (582, 1172)   (solo la marca, sin el disco)
 *
 * Cuando haya logos recortados en el file manager se cambian las URL y este
 * calculo se reemplaza por un <img> normal.
 */
import React from 'react'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'

import { seccionDe, rutaDe } from './vehiculo'

const CSS_HANDLES = ['logoRx', 'logoRxImagen']

const LOGOTIPO =
  'https://onewstore.vtexassets.com/assets/vtex.file-manager-graphql/images/772c8205-47cf-4795-ae5d-40aced62274f___c4c0ef3890ef1285c76b15521a8a13ab.png'
const ISOTIPO =
  'https://onewstore.vtexassets.com/assets/vtex.file-manager-graphql/images/49047458-cec0-4f58-9c58-2d008bd04f71___26e677192553caaf43fd069a83223dc2.png'

export default function LogoRx({
  variante = 'logotipo',
  urlLogotipo = LOGOTIPO,
  urlIsotipo = ISOTIPO,
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

  /* Recorte: se escala la lamina para que la marca mida "alto" de alto y se
     corre el fondo hasta dejarla dentro de la caja. */
  const RECORTE = {
    logotipo: { url: urlLogotipo, x: 92, y: 1396, w: 2368, h: 508, aire: 1 },
    isotipo: { url: urlIsotipo, x: 582, y: 1172, w: 1265, h: 994, aire: 0.94 },
  }
  const r = RECORTE[variante] || RECORTE.logotipo
  const escala = (alto / r.h) * r.aire
  const caja = { w: Math.round(r.w * (alto / r.h)), h: alto }
  const marca = { w: r.w * escala, h: r.h * escala }
  const fondo = {
    w: (2551 * escala).toFixed(1),
    h: (3301 * escala).toFixed(1),
    x: (-r.x * escala + (caja.w - marca.w) / 2).toFixed(1),
    y: (-r.y * escala + (caja.h - marca.h) / 2).toFixed(1),
  }

  const css = `
    .rx-logo { display: inline-flex; align-items: center; text-decoration: none;
      flex-shrink: 0 }
    .rx-logo__marca {
      display: block;
      width: ${caja.w}px;
      height: ${caja.h}px;
      flex-shrink: 0;
      background-image: url('${r.url}');
      background-repeat: no-repeat;
      background-size: ${fondo.w}px ${fondo.h}px;
      background-position: ${fondo.x}px ${fondo.y}px;
    }
  `

  return (
    <a
      href={destino}
      aria-label={titulo}
      title={titulo}
      className={`rx-logo ${handles.logoRx || ''}`}
    >
      <style>{css}</style>
      <span className={`rx-logo__marca ${handles.logoRxImagen || ''}`} role="img"
        aria-label="Repuestox" />
    </a>
  )
}

LogoRx.schema = {
  title: 'Logo Repuestox',
  type: 'object',
  properties: {
    variante: {
      title: 'Forma',
      type: 'string',
      enum: ['logotipo', 'isotipo'],
      default: 'logotipo',
    },
    alto: { title: 'Alto en px (logotipo)', type: 'number', default: 30 },
  },
}
