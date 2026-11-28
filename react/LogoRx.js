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
 * LOS DOS SON VECTOR, reconstruidos desde los trazos del PDF del manual, asi
 * que son el dibujo original y no un calco. Se ven nitidos a cualquier tamaño
 * y en cualquier pantalla, y toman el color del CSS con currentColor: el
 * mismo archivo sirve en rojo sobre claro y en blanco sobre oscuro.
 *
 *   isotipo      1,4 KB, de la pagina 13.
 *   logotipo     8,3 KB, de la pagina 12 (el lockup horizontal de abajo a la
 *                izquierda: la R alada y "epuestox" en la misma linea).
 *
 * EL LOGOTIPO ERA UN PNG Y SE VEIA PIXELADO. Estaba a 420x90 y el header lo
 * pinta a 140x30: el navegador lo reducia 3:1 y en una palabra de trazo fino
 * eso se nota. Encima lo habia cuantizado a 48 colores para bajar peso y eso
 * dejo el borde en 24 niveles de alfa en vez de 256, con lo que el
 * antialiasing quedo escalonado. En vector no hay ni reduccion ni
 * antialiasing que estropear.
 *
 * COMPROBADO CONTRA EL PNG OFICIAL, no a ojo: se rasterizo el vector al
 * tamaño del PNG y se superpusieron. Coinciden; lo unico que difiere es una
 * franja de medio pixel en el contorno, que es lo que se espera al comparar
 * un vector con un mapa de bits reducido.
 *
 * OJO CON fill-rule. Con "evenodd" se perdian trozos dentro de la e, la u y
 * la t: el 3,2% de la imagen no cuadraba. Con "nonzero" coincide. En el
 * isotipo da igual —sus contornos no se anidan— pero va igual para que las
 * dos piezas sigan la misma regla.
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

/* El isologotipo, en vector. currentColor igual que el isotipo. */
const LOGOTIPO_VB = '0 0 94.38 20.26'
const LOGOTIPO_D = 'M26.26 13.34C25.51 13.34 24.84 13.23 24.25 13.03C23.66 12.82 23.17 12.51 22.78 12.11C22.38 11.7 22.08 11.21 21.88 10.62C21.67 10.04 21.57 9.37 21.57 8.62L21.57 7.47C21.57 6.63 21.66 5.89 21.84 5.26C22.02 4.63 22.28 4.11 22.64 3.69C23.0 3.27 23.45 2.96 24.0 2.74C24.55 2.53 25.2 2.42 25.95 2.42C26.6 2.42 27.18 2.52 27.69 2.71C28.2 2.91 28.63 3.21 28.99 3.61C29.34 4.02 29.61 4.54 29.8 5.16C29.99 5.79 30.08 6.53 30.08 7.38L30.08 8.91L22.77 8.91L22.77 6.86L26.96 6.86L26.96 6.5C26.97 6.07 26.93 5.75 26.85 5.53C26.77 5.31 26.65 5.15 26.49 5.07C26.34 4.99 26.15 4.95 25.92 4.95C25.65 4.95 25.44 5.0 25.29 5.09C25.13 5.18 25.02 5.32 24.95 5.52C24.87 5.71 24.83 5.97 24.8 6.29C24.78 6.62 24.77 7.01 24.77 7.47L24.77 8.62C24.77 9.07 24.81 9.44 24.88 9.73C24.96 10.01 25.07 10.23 25.21 10.39C25.36 10.55 25.54 10.65 25.75 10.72C25.96 10.78 26.2 10.81 26.47 10.81C26.86 10.81 27.24 10.74 27.61 10.61C27.98 10.48 28.29 10.26 28.55 9.95L29.86 11.94C29.68 12.16 29.42 12.39 29.08 12.6C28.74 12.82 28.33 13.0 27.85 13.13C27.38 13.27 26.85 13.34 26.26 13.34Z M36.89 8.35L36.89 7.37C36.89 6.9 36.87 6.51 36.83 6.2C36.8 5.89 36.74 5.64 36.65 5.45C36.57 5.27 36.46 5.14 36.32 5.06C36.19 4.99 36.01 4.95 35.8 4.95C35.56 4.95 35.35 5.0 35.19 5.09C35.02 5.19 34.89 5.33 34.8 5.53C34.71 5.73 34.64 5.98 34.61 6.27C34.58 6.57 34.57 6.91 34.59 7.32L34.59 8.54C34.56 9.0 34.57 9.39 34.63 9.73C34.69 10.07 34.81 10.34 35.0 10.53C35.2 10.72 35.47 10.82 35.82 10.82C36.04 10.82 36.22 10.78 36.36 10.69C36.5 10.61 36.61 10.47 36.68 10.27C36.76 10.08 36.81 9.82 36.84 9.5C36.87 9.19 36.89 8.8 36.89 8.35M40.08 7.37L40.08 8.35C40.08 9.18 40.0 9.9 39.86 10.53C39.71 11.15 39.49 11.67 39.2 12.09C38.91 12.51 38.55 12.82 38.12 13.03C37.69 13.23 37.19 13.34 36.62 13.34C36.11 13.34 35.68 13.2 35.33 12.93C34.99 12.67 34.7 12.29 34.48 11.82C34.26 11.35 34.07 10.8 33.94 10.19C33.8 9.58 33.69 8.93 33.6 8.26L33.6 7.59C33.69 6.86 33.8 6.18 33.93 5.56C34.06 4.93 34.24 4.38 34.46 3.91C34.69 3.44 34.98 3.08 35.33 2.82C35.68 2.55 36.11 2.42 36.62 2.42C37.2 2.42 37.69 2.52 38.12 2.71C38.55 2.9 38.91 3.2 39.2 3.6C39.49 4.0 39.71 4.51 39.86 5.14C40.0 5.76 40.08 6.5 40.08 7.37M34.82 4.64L34.82 17.19L31.63 17.19L31.63 2.62L34.6 2.62L34.82 4.64Z M46.68 10.58L46.68 2.62L49.88 2.62L49.88 13.14L46.89 13.14L46.68 10.58M46.97 8.44L47.76 8.43C47.76 9.13 47.69 9.79 47.54 10.39C47.4 10.98 47.19 11.51 46.92 11.95C46.65 12.39 46.32 12.73 45.92 12.97C45.53 13.22 45.08 13.34 44.57 13.34C44.13 13.34 43.73 13.27 43.37 13.12C43.01 12.97 42.7 12.74 42.43 12.43C42.17 12.11 41.96 11.71 41.82 11.21C41.67 10.72 41.6 10.12 41.6 9.43L41.6 2.62L44.79 2.62L44.79 9.45C44.79 9.68 44.81 9.88 44.84 10.05C44.88 10.22 44.93 10.36 45.0 10.47C45.07 10.59 45.16 10.67 45.27 10.73C45.38 10.78 45.51 10.81 45.66 10.81C45.99 10.81 46.26 10.7 46.45 10.5C46.65 10.29 46.78 10.01 46.86 9.65C46.93 9.29 46.97 8.89 46.97 8.44Z M56.24 13.34C55.48 13.34 54.82 13.23 54.23 13.03C53.64 12.82 53.15 12.51 52.75 12.11C52.36 11.7 52.06 11.21 51.85 10.62C51.65 10.04 51.55 9.37 51.55 8.62L51.55 7.47C51.55 6.63 51.64 5.89 51.82 5.26C51.99 4.63 52.26 4.11 52.62 3.69C52.97 3.27 53.43 2.96 53.98 2.74C54.53 2.53 55.18 2.42 55.93 2.42C56.58 2.42 57.16 2.52 57.67 2.71C58.18 2.91 58.61 3.21 58.97 3.61C59.32 4.02 59.59 4.54 59.78 5.16C59.97 5.79 60.06 6.53 60.06 7.38L60.06 8.91L52.74 8.91L52.74 6.86L56.94 6.86L56.94 6.5C56.94 6.07 56.91 5.75 56.83 5.53C56.74 5.31 56.63 5.15 56.47 5.07C56.31 4.99 56.12 4.95 55.9 4.95C55.63 4.95 55.42 5.0 55.26 5.09C55.11 5.18 55.0 5.32 54.92 5.52C54.85 5.71 54.81 5.97 54.78 6.29C54.76 6.62 54.75 7.01 54.75 7.47L54.75 8.62C54.75 9.07 54.79 9.44 54.86 9.73C54.93 10.01 55.05 10.23 55.19 10.39C55.34 10.55 55.52 10.65 55.73 10.72C55.94 10.78 56.18 10.81 56.45 10.81C56.84 10.81 57.22 10.74 57.59 10.61C57.96 10.48 58.27 10.26 58.53 9.95L59.84 11.94C59.66 12.16 59.4 12.39 59.06 12.6C58.72 12.82 58.31 13.0 57.83 13.13C57.36 13.27 56.83 13.34 56.24 13.34Z M66.07 10.28C66.07 10.1 66.0 9.95 65.86 9.84C65.73 9.73 65.54 9.61 65.29 9.5C65.04 9.38 64.75 9.22 64.4 9.03C63.99 8.84 63.6 8.64 63.23 8.43C62.87 8.22 62.54 7.99 62.27 7.73C61.99 7.48 61.78 7.19 61.62 6.85C61.47 6.5 61.39 6.11 61.39 5.66C61.39 5.21 61.47 4.79 61.64 4.4C61.8 4.01 62.05 3.67 62.37 3.37C62.7 3.08 63.09 2.85 63.56 2.68C64.02 2.51 64.56 2.42 65.16 2.42C65.99 2.42 66.7 2.56 67.29 2.83C67.89 3.1 68.35 3.48 68.67 3.98C69.0 4.49 69.16 5.08 69.16 5.75L65.97 5.75C65.97 5.48 65.95 5.27 65.9 5.09C65.86 4.92 65.77 4.79 65.65 4.71C65.53 4.63 65.37 4.58 65.15 4.58C65.04 4.58 64.93 4.62 64.81 4.68C64.7 4.75 64.6 4.85 64.52 4.99C64.44 5.12 64.4 5.29 64.4 5.49C64.4 5.63 64.43 5.75 64.49 5.85C64.54 5.95 64.62 6.05 64.73 6.14C64.83 6.22 64.95 6.31 65.09 6.4C65.23 6.49 65.39 6.59 65.58 6.7C66.14 6.92 66.69 7.15 67.24 7.4C67.78 7.66 68.24 8.0 68.6 8.43C68.97 8.85 69.15 9.44 69.15 10.19C69.15 10.65 69.06 11.08 68.87 11.46C68.68 11.84 68.41 12.18 68.07 12.46C67.72 12.75 67.3 12.97 66.81 13.11C66.31 13.26 65.76 13.34 65.14 13.34C64.27 13.34 63.54 13.17 62.94 12.82C62.34 12.48 61.89 12.04 61.58 11.51C61.28 10.98 61.13 10.43 61.13 9.87L64.09 9.87C64.1 10.19 64.15 10.45 64.24 10.64C64.33 10.83 64.46 10.97 64.62 11.05C64.78 11.13 64.98 11.17 65.23 11.17C65.42 11.17 65.57 11.14 65.7 11.07C65.82 11.0 65.91 10.9 65.98 10.77C66.04 10.63 66.07 10.47 66.07 10.28Z M71.22 0.0L74.42 0.0L74.42 9.71C74.42 9.99 74.44 10.2 74.48 10.36C74.52 10.51 74.61 10.62 74.73 10.68C74.85 10.74 75.02 10.77 75.24 10.77C75.39 10.77 75.52 10.77 75.62 10.76C75.72 10.75 75.81 10.73 75.89 10.71L75.87 13.06C75.62 13.15 75.36 13.22 75.09 13.27C74.82 13.31 74.52 13.34 74.2 13.34C73.58 13.34 73.04 13.23 72.6 13.01C72.15 12.79 71.81 12.44 71.57 11.97C71.34 11.49 71.22 10.88 71.22 10.12L71.22 0.0M70.21 2.62H75.77V4.89H70.21ZZ M79.83 7.39L79.83 8.38C79.83 8.82 79.86 9.21 79.91 9.52C79.96 9.83 80.04 10.09 80.14 10.28C80.24 10.47 80.36 10.61 80.5 10.69C80.65 10.78 80.81 10.82 81.0 10.82C81.24 10.82 81.44 10.78 81.59 10.69C81.74 10.61 81.86 10.47 81.94 10.28C82.03 10.09 82.09 9.83 82.11 9.52C82.14 9.21 82.16 8.82 82.16 8.38L82.16 7.39C82.16 6.95 82.13 6.58 82.09 6.27C82.04 5.96 81.96 5.71 81.86 5.51C81.76 5.31 81.64 5.17 81.49 5.08C81.34 5.0 81.17 4.95 80.98 4.95C80.8 4.95 80.64 5.0 80.49 5.08C80.35 5.17 80.23 5.31 80.13 5.51C80.04 5.71 79.96 5.96 79.91 6.27C79.86 6.58 79.83 6.95 79.83 7.39M76.63 8.38L76.63 7.39C76.63 6.56 76.74 5.84 76.94 5.22C77.15 4.6 77.45 4.08 77.83 3.67C78.21 3.26 78.67 2.95 79.2 2.74C79.73 2.53 80.33 2.42 80.98 2.42C81.65 2.42 82.25 2.53 82.78 2.74C83.31 2.95 83.77 3.26 84.15 3.67C84.53 4.08 84.83 4.6 85.04 5.22C85.25 5.84 85.35 6.56 85.35 7.39L85.35 8.38C85.35 9.2 85.25 9.92 85.04 10.55C84.83 11.17 84.54 11.69 84.16 12.1C83.78 12.52 83.32 12.83 82.79 13.03C82.25 13.24 81.66 13.34 81.0 13.34C80.35 13.34 79.75 13.24 79.21 13.03C78.67 12.83 78.21 12.52 77.83 12.1C77.45 11.69 77.15 11.17 76.94 10.55C76.74 9.92 76.63 9.2 76.63 8.38Z M89.04 2.62L89.98 5.52L90.98 2.62L94.26 2.62L92.09 7.74L94.38 13.14L91.05 13.14L89.98 10.03L88.91 13.14L85.59 13.14L87.88 7.74L85.71 2.62L89.04 2.62Z M14.13 11.14L4.52 11.14C4.39 11.14 4.32 11.3 4.41 11.4C6.07 13.12 8.36 14.1 10.75 14.1L13.87 14.1C13.95 14.1 14.01 14.04 14.02 13.96L14.28 11.31C14.29 11.22 14.22 11.14 14.13 11.14Z M13.58 15.43L8.54 15.43C8.41 15.43 8.34 15.59 8.43 15.68L9.44 16.73C10.46 17.79 11.86 18.38 13.32 18.38C13.4 18.38 13.47 18.32 13.47 18.25L13.73 15.59C13.74 15.5 13.67 15.43 13.58 15.43Z M23.21 13.91C21.96 12.97 20.72 12.02 19.48 11.08C19.54 10.34 19.6 9.61 19.65 8.88C19.8 7.13 20.14 5.27 19.3 3.63C18.39 1.84 16.25 1.13 14.36 1.49C12.21 1.9 10.65 3.96 10.24 6.02C10.19 6.29 10.19 6.56 10.25 6.83L0.2 6.83C0.07 6.83 0.0 6.99 0.09 7.08C1.75 8.81 4.04 9.78 6.43 9.78L14.34 9.78C14.42 9.78 14.49 9.72 14.49 9.65L14.75 6.99C14.76 6.9 14.69 6.83 14.6 6.83L13.56 6.83C13.6 6.64 13.65 6.46 13.7 6.27C13.79 5.92 14.02 5.59 14.27 5.33C14.49 5.1 14.77 4.92 15.08 4.84C15.43 4.76 15.89 4.81 16.14 5.1C16.59 5.65 16.48 6.38 16.42 7.02C16.35 7.79 16.27 8.56 16.2 9.32C16.06 10.84 15.97 12.36 15.85 13.88C15.73 15.42 15.6 16.96 15.47 18.49C15.47 18.5 15.3 20.21 15.3 20.22C15.3 20.22 16.31 20.26 17.18 20.22C18.17 20.18 18.8 19.47 18.88 18.51C18.98 17.37 19.07 16.23 19.17 15.1C19.94 15.68 20.71 16.27 21.48 16.86C22.22 17.42 23.39 16.97 23.82 16.25C24.33 15.37 23.94 14.47 23.21 13.91Z'

/* Proporciones del contenido, para calcular el ancho a partir del alto. */
const RAZON = { logotipo: 94.38 / 20.26, isotipo: 132.87 / 104.44 }

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
  ) : (
    <svg className={`rx-logo__marca ${handles.logoRxImagen || ''}`}
      viewBox={esIso ? ISOTIPO_VB : LOGOTIPO_VB} width={ancho} height={alto}
      role="img" aria-label="Repuestox" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" fillRule="nonzero" d={esIso ? ISOTIPO_D : LOGOTIPO_D} />
    </svg>
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
