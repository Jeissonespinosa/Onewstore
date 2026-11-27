/*
 * Quienes somos.
 *
 * Reemplaza a /about-us, que era la pagina de ejemplo de VTEX tal cual venia:
 * en ingles, con una foto de telefono servida desde el VTEX de otra tienda y
 * un video de YouTube cualquiera, y vendiendo la plataforma de VTEX
 * ("Optimized store framework", "Free your front-end with our React + Node
 * store framework"). Un cliente que entraba a saber quienes somos leia el
 * folleto de VTEX.
 *
 * QUE DICE ESTA PAGINA Y QUE NO.
 *
 * Solo dice cosas que la tienda cumple y que cualquiera puede comprobar en
 * dos clics: que se guarda el vehiculo, que cada pieza declara para que
 * sirve, que lo universal va marcado como universal, que si buscas una moto
 * estando en carros te lo decimos. Todo eso esta implementado.
 *
 * NO dice años en el mercado, ni numero de clientes, ni sedes, ni "somos
 * lideres". Esos datos no los tengo y no se inventan — la pagina anterior
 * de /linea-productos decia "+65 años en el mercado nacional", que era la
 * historia de Coexito. Los campos para eso existen abajo (historia, nit,
 * direccion) y estan vacios a proposito: cuando el negocio los escriba en el
 * Site Editor, aparecen; mientras esten vacios, la seccion no se pinta.
 *
 * Los textos son props con schema, asi que se editan en
 * Admin > Storefront > Site Editor sin tocar codigo.
 */
import React from 'react'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['quienesSomos']
const RED = '#FF371E'
const INK = '#010101'
const TINTA_SUAVE = '#55555C'

/* Los tokens --rx-* viven en vtex.login.css, que no carga en todas las
   paginas; por eso aqui el rojo va literal, como en los demas componentes. */

const Pieza = ({ n, titulo, texto }) => (
  <div className="rx-qs__pieza">
    <span className="rx-qs__num">{n}</span>
    <h3 className="rx-qs__ph">{titulo}</h3>
    <p className="rx-qs__pp">{texto}</p>
  </div>
)

export default function QuienesSomos({
  titulo = 'Repuestos que sí le sirven a tu vehículo',
  entrada = 'Repuestox vende repuestos para carro y para moto, y herramienta de taller. ' +
    'Toda la tienda está armada alrededor de una sola idea: que no te llegue una pieza ' +
    'que no es la de tu vehículo.',
  comoTitulo = 'Cómo lo hacemos',
  paso1Titulo = 'Nos dices tu vehículo una vez',
  paso1Texto = 'Marca, línea, año y motor. De ahí en adelante la tienda deja de mostrarte ' +
    'lo que no le sirve. Puedes guardar hasta tres: el tuyo, el de la casa y el del trabajo.',
  paso2Titulo = 'Cada pieza dice para qué sirve',
  paso2Texto = 'Si una pieza es para un vehículo en concreto, lo dice en la tarjeta. Y lo ' +
    'que le sirve a cualquiera —el aceite por norma, la herramienta, los líquidos— va ' +
    'marcado como tal, sin rótulo de vehículo que confunda.',
  paso3Titulo = 'Te avisamos antes de que te equivoques',
  paso3Texto = 'Si buscas una moto estando en la sección de carros, te lo decimos y te ' +
    'ofrecemos el cambio. "Boxer" es una Bajaj, pero también es una Peugeot: ahí es ' +
    'donde se compra la pieza equivocada.',
  honestidadTitulo = 'Lo que no sabemos, lo decimos',
  honestidadTexto = 'No todas las compatibilidades están confirmadas, y las que no lo ' +
    'están no se muestran como si lo estuvieran. Preferimos preguntarte el año y el motor ' +
    'una vez más, o decirte que no estamos seguros, antes que venderte algo que vas a ' +
    'tener que devolver.',
  /* Vacios a proposito: son datos del negocio, no mios. Ver la cabecera. */
  historiaTitulo = 'Quiénes estamos detrás',
  historiaTexto = '',
  datosTitulo = 'Datos de la empresa',
  datosTexto = '',
  ctaTitulo = '¿Buscas algo en concreto?',
  ctaCarros = 'Repuestos para carro',
  ctaMotos = 'Repuestos para moto',
  ctaHerramientas = 'Herramienta de taller',
  ctaContacto = 'Escríbenos',
  imagen = '',
  imagenAlt = 'Repuestox',
}) {
  const handles = useCssHandles(CSS_HANDLES)

  /* El mismo marcador de imagen pendiente que usa el resto del sitio: se ve
     que falta, dice que archivo falta y de que medida. Se cambia por la foto
     real desde el Site Editor, en "imagen". */
  const marcador =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'>" +
    "<rect width='1200' height='700' fill='%23010101'/>" +
    "<path d='M0 700 L1200 0 L1200 150 L250 700 Z' fill='%23FF371E' opacity='.16'/>" +
    "<text x='600' y='330' text-anchor='middle' font-family='Montserrat,Helvetica,sans-serif' " +
    "font-size='44' font-weight='800' fill='%23ffffff'>REEMPLAZAR</text>" +
    "<text x='600' y='388' text-anchor='middle' font-family='Montserrat,Helvetica,sans-serif' " +
    "font-size='26' fill='%23ffffff' opacity='.65'>quienes-somos / 1200x700</text></svg>"

  const css = `
    .rx-qs{max-width:72rem;margin:0 auto;padding:2rem 1rem 3.5rem;color:${INK};
      font-family:inherit}
    .rx-qs__hero{display:grid;gap:1.5rem;align-items:center}
    .rx-qs__h1{font-size:2rem;line-height:1.1;letter-spacing:-.02em;font-weight:800;margin:0}
    .rx-qs__entrada{font-size:1.0625rem;line-height:1.55;color:${TINTA_SUAVE};margin:.9rem 0 0}
    .rx-qs__foto{width:100%;border-radius:1rem;display:block;aspect-ratio:12/7;object-fit:cover;
      background:#F7F7F8}

    .rx-qs__sec{margin-top:3rem}
    .rx-qs__h2{font-size:1.375rem;font-weight:800;letter-spacing:-.01em;margin:0 0 1.25rem;
      padding-bottom:.6rem;border-bottom:2px solid ${RED};display:inline-block}

    .rx-qs__piezas{display:grid;gap:1rem;grid-template-columns:1fr}
    .rx-qs__pieza{border:1px solid rgba(1,1,1,.1);border-radius:1rem;padding:1.25rem;
      background:#fff}
    .rx-qs__num{display:inline-flex;align-items:center;justify-content:center;
      width:1.75rem;height:1.75rem;border-radius:999px;background:${RED};color:#fff;
      font-size:.8125rem;font-weight:800}
    .rx-qs__ph{font-size:1rem;font-weight:800;margin:.75rem 0 .35rem;line-height:1.3}
    .rx-qs__pp{font-size:.875rem;line-height:1.5;color:${TINTA_SUAVE};margin:0}

    /* La franja de honestidad es la unica en negro: es la promesa, no una
       caracteristica mas. */
    .rx-qs__franja{margin-top:3rem;background:${INK};color:#fff;border-radius:1.25rem;
      padding:1.75rem 1.5rem}
    .rx-qs__franja h2{font-size:1.25rem;font-weight:800;margin:0 0 .6rem;line-height:1.25}
    .rx-qs__franja p{font-size:.9375rem;line-height:1.6;margin:0;color:rgba(255,255,255,.82)}

    .rx-qs__texto{font-size:.9375rem;line-height:1.6;color:${TINTA_SUAVE};margin:0;
      white-space:pre-line}

    .rx-qs__ctas{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.1rem}
    .rx-qs__cta{display:inline-block;border:1.5px solid rgba(1,1,1,.12);border-radius:999px;
      padding:.65rem 1.15rem;font-size:.875rem;font-weight:700;color:${INK};
      text-decoration:none;background:#fff}
    .rx-qs__cta:hover{border-color:${RED};color:${RED}}
    .rx-qs__cta--fuerte{background:${RED};border-color:${RED};color:#fff}
    .rx-qs__cta--fuerte:hover{color:#fff;filter:brightness(.93)}

    @media screen and (min-width:48rem){
      .rx-qs{padding:3rem 1.5rem 4.5rem}
      .rx-qs__hero{grid-template-columns:1.05fr .95fr;gap:2.5rem}
      .rx-qs__h1{font-size:2.75rem}
      .rx-qs__piezas{grid-template-columns:repeat(3,1fr);gap:1.25rem}
      .rx-qs__franja{padding:2.25rem 2rem}
      .rx-qs__franja h2{font-size:1.5rem}
    }
  `

  return (
    <section className={`rx-qs ${handles.quienesSomos || ''}`}>
      <style>{css}</style>

      <div className="rx-qs__hero">
        <div>
          <h1 className="rx-qs__h1">{titulo}</h1>
          <p className="rx-qs__entrada">{entrada}</p>
        </div>
        <img className="rx-qs__foto" src={imagen || marcador} alt={imagenAlt} />
      </div>

      <div className="rx-qs__sec">
        <h2 className="rx-qs__h2">{comoTitulo}</h2>
        <div className="rx-qs__piezas">
          <Pieza n="1" titulo={paso1Titulo} texto={paso1Texto} />
          <Pieza n="2" titulo={paso2Titulo} texto={paso2Texto} />
          <Pieza n="3" titulo={paso3Titulo} texto={paso3Texto} />
        </div>
      </div>

      <div className="rx-qs__franja">
        <h2>{honestidadTitulo}</h2>
        <p>{honestidadTexto}</p>
      </div>

      {/* Estas dos secciones solo existen cuando el negocio escribe el texto.
          Una seccion "Quienes estamos detras" vacia, o con relleno, dice
          menos que no tenerla. */}
      {historiaTexto ? (
        <div className="rx-qs__sec">
          <h2 className="rx-qs__h2">{historiaTitulo}</h2>
          <p className="rx-qs__texto">{historiaTexto}</p>
        </div>
      ) : null}

      {datosTexto ? (
        <div className="rx-qs__sec">
          <h2 className="rx-qs__h2">{datosTitulo}</h2>
          <p className="rx-qs__texto">{datosTexto}</p>
        </div>
      ) : null}

      <div className="rx-qs__sec">
        <h2 className="rx-qs__h2">{ctaTitulo}</h2>
        <div className="rx-qs__ctas">
          <a className="rx-qs__cta" href="/carros">{ctaCarros}</a>
          <a className="rx-qs__cta" href="/motos">{ctaMotos}</a>
          <a className="rx-qs__cta" href="/herramientas">{ctaHerramientas}</a>
          {/* La spec 005 (RF-4) pide que esta pagina enlace a contacto. */}
          <a className="rx-qs__cta rx-qs__cta--fuerte" href="/contacto">{ctaContacto}</a>
        </div>
      </div>
    </section>
  )
}

const texto = (title, description) => ({ title, description, type: 'string' })
const parrafo = (title, description) => ({
  title, description, type: 'string', widget: { 'ui:widget': 'textarea' },
})

QuienesSomos.schema = {
  title: 'Quiénes somos',
  description: 'Los textos se editan aquí. Lo que quede vacío no se pinta.',
  type: 'object',
  properties: {
    titulo: texto('Título'),
    entrada: parrafo('Entrada'),
    imagen: texto('Imagen (URL)', 'Mientras esté vacía se ve el marcador REEMPLAZAR. 1200x700.'),
    imagenAlt: texto('Texto alternativo de la imagen'),
    comoTitulo: texto('Título de "Cómo lo hacemos"'),
    paso1Titulo: texto('Paso 1 — título'),
    paso1Texto: parrafo('Paso 1 — texto'),
    paso2Titulo: texto('Paso 2 — título'),
    paso2Texto: parrafo('Paso 2 — texto'),
    paso3Titulo: texto('Paso 3 — título'),
    paso3Texto: parrafo('Paso 3 — texto'),
    honestidadTitulo: texto('Franja negra — título'),
    honestidadTexto: parrafo('Franja negra — texto'),
    historiaTitulo: texto('Historia — título'),
    historiaTexto: parrafo('Historia — texto',
      'Quiénes son, desde cuándo y dónde. Vacío a propósito: si no se escribe, la sección no aparece.'),
    datosTitulo: texto('Datos de la empresa — título'),
    datosTexto: parrafo('Datos de la empresa — texto',
      'Razón social, NIT, dirección. Vacío a propósito: si no se escribe, la sección no aparece.'),
    ctaTitulo: texto('Cierre — título'),
    ctaCarros: texto('Cierre — botón de carros'),
    ctaMotos: texto('Cierre — botón de motos'),
    ctaHerramientas: texto('Cierre — botón de herramientas'),
    ctaContacto: texto('Cierre — botón de contacto'),
  },
}
