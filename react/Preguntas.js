/*
 * Preguntas frecuentes.
 *
 * Reemplaza a /faq, que era la pagina de ejemplo de VTEX: en ingles, con un
 * telefono de Nueva York ("Call us at the number (212) 1234-1234") y cuatro
 * preguntas que en realidad eran dos repetidas.
 *
 * QUE SE RESPONDE AQUI Y QUE NO.
 *
 * Se responde lo que la tienda hace y cualquiera puede comprobar: como se
 * guarda el vehiculo, donde dice el año y el motor en la licencia, por que
 * se pregunta el motor, que significa "sirve para cualquier vehiculo", y por
 * que a veces una moto aparece buscando en carros. Son, ademas, las
 * preguntas que de verdad evitan una devolucion.
 *
 * NO se responde envios, pagos, devoluciones ni garantia. No es prudencia:
 * en las specs del equipo esas decisiones estan ABIERTAS —Q3 (pasarela de
 * pago), Q4 (quien envia y que transportadoras) y la 001 (TyC, que espera
 * revision de un abogado colombiano)—. Una respuesta inventada sobre un
 * plazo de entrega o una devolucion es una promesa que la tienda tendria que
 * cumplir.
 *
 * Esas cuatro preguntas existen abajo, vacias. Cada una se pinta SOLO cuando
 * alguien escribe la respuesta en Admin > Storefront > Site Editor. Mientras
 * esten vacias no aparecen, porque una pregunta sin respuesta es peor que no
 * tener la pregunta.
 */
import React, { useState } from 'react'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['preguntas']
const RED = '#FF371E'
const INK = '#010101'
const TINTA_SUAVE = '#55555C'

export default function Preguntas({
  titulo = 'Preguntas frecuentes',
  entrada = 'Lo que más nos preguntan es cómo saber si una pieza le sirve al vehículo. ' +
    'Eso es lo que resuelve esta tienda, y aquí está explicado.',

  grupo1 = 'Que la pieza sí le sirva',

  p1 = '¿Cómo sé que el repuesto le sirve a mi vehículo?',
  r1 = 'Guarda tu vehículo en el botón de arriba: marca, línea, año y, si hace falta, ' +
    'motor. Desde ahí la tienda deja de mostrarte lo que no le sirve. Y cada producto ' +
    'dice para qué vehículo está declarado, así que puedes comprobarlo tú mismo antes ' +
    'de comprar.',

  p2 = '¿Dónde veo el año y el motor de mi vehículo?',
  r2 = 'En la licencia de tránsito. El año es el campo MODELO: es el que más se confunde, ' +
    'porque no es el año en que lo compraste y tampoco es la LÍNEA. El motor es el ' +
    'CILINDRAJE, en centímetros cúbicos. Si no los encuentras, en el selector hay un ' +
    '"No sé el año" y un "No sé cuál es" que te muestran dibujada la licencia con el ' +
    'campo señalado.',

  p3 = '¿Por qué me preguntan el motor si ya di el año?',
  r3 = 'Porque dos vehículos de la misma línea y el mismo año pueden llevar piezas ' +
    'distintas según el motor: un Corolla 2021 1.8 híbrido y uno 2.0 no usan el mismo ' +
    'filtro. Solo se pregunta donde de verdad cambia la pieza; donde no cambia, no se ' +
    'pregunta.',

  p4 = '¿Qué quiere decir "sirve para cualquier vehículo"?',
  r4 = 'Que esa pieza no depende del vehículo: el aceite que cumple una norma, la ' +
    'herramienta, los líquidos, buena parte de los accesorios. Esos productos no llevan ' +
    'rótulo de vehículo, y van marcados aparte justamente para que no los confundas con ' +
    'una pieza que sí es de un modelo concreto.',

  p5 = 'Busqué mi moto y me aparecieron carros (o al revés)',
  r5 = 'La tienda tiene tres secciones: carros, motos y herramienta. Hay nombres que se ' +
    'repiten entre ellas: "Boxer" es una Bajaj, pero también es una Peugeot. Cuando pasa, ' +
    'el buscador te lo avisa y te ofrece cambiar de sección en un toque.',

  p6 = '¿Puedo guardar más de un vehículo?',
  r6 = 'Sí, hasta tres: el tuyo, el de la casa y el del trabajo. El que esté activo es el ' +
    'que filtra la tienda, y cambias de uno a otro con un toque en el botón de arriba.',

  p7 = 'No encuentro mi vehículo, o no está el repuesto que busco',
  r7 = 'Escríbenos por el formulario de contacto y dinos qué necesitas y para qué ' +
    'vehículo (marca, línea, año y motor). El catálogo está creciendo y así sabemos qué ' +
    'hace falta.',

  grupo2 = 'Compra y entrega',
  /* Vacias a proposito. Ver la cabecera del archivo. */
  p8 = '¿Cuánto demora el envío y a dónde llegan?',
  r8 = '',
  p9 = '¿Cómo puedo pagar?',
  r9 = '',
  p10 = '¿Puedo devolver un repuesto?',
  r10 = '',
  p11 = '¿Los repuestos tienen garantía?',
  r11 = '',

  cierreTexto = '¿No resolvimos tu duda?',
  cierreEnlace = 'Escríbenos',
}) {
  const handles = useCssHandles(CSS_HANDLES)
  const [abierta, setAbierta] = useState(null)

  const grupos = [
    { nombre: grupo1, items: [[p1, r1], [p2, r2], [p3, r3], [p4, r4], [p5, r5], [p6, r6], [p7, r7]] },
    { nombre: grupo2, items: [[p8, r8], [p9, r9], [p10, r10], [p11, r11]] },
  ]
    /* Una pregunta sin respuesta no se pinta, y un grupo sin preguntas tampoco. */
    .map(g => ({ ...g, items: g.items.filter(([p, r]) => String(p || '').trim() && String(r || '').trim()) }))
    .filter(g => g.items.length)

  const css = `
    .rx-pf{max-width:52rem;margin:0 auto;padding:2rem 1rem 3.5rem;color:${INK};font-family:inherit}
    .rx-pf__h1{font-size:1.875rem;line-height:1.15;letter-spacing:-.02em;font-weight:800;margin:0}
    .rx-pf__entrada{font-size:1rem;line-height:1.55;color:${TINTA_SUAVE};margin:.75rem 0 0}
    .rx-pf__grupo{margin-top:2.5rem}
    .rx-pf__gh{font-size:1.125rem;font-weight:800;letter-spacing:-.01em;margin:0 0 1rem;
      padding-bottom:.55rem;border-bottom:2px solid ${RED};display:inline-block}
    .rx-pf__item{border:1px solid rgba(1,1,1,.1);border-radius:.875rem;background:#fff;
      margin-bottom:.625rem;overflow:hidden}
    .rx-pf__item--abierta{border-color:rgba(255,55,30,.35)}
    .rx-pf__boton{display:flex;align-items:center;justify-content:space-between;gap:1rem;
      width:100%;text-align:left;background:none;border:0;cursor:pointer;font:inherit;
      padding:1rem 1.125rem;font-size:.9375rem;font-weight:700;color:${INK};line-height:1.35}
    .rx-pf__boton:hover{color:${RED}}
    .rx-pf__mas{flex-shrink:0;transition:transform .18s ease}
    .rx-pf__item--abierta .rx-pf__mas{transform:rotate(45deg)}
    .rx-pf__resp{padding:0 1.125rem 1.125rem;margin:0;font-size:.875rem;line-height:1.6;
      color:${TINTA_SUAVE}}
    .rx-pf__cierre{margin-top:2.5rem;padding:1.25rem;border-radius:.875rem;background:#F7F7F8;
      display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;justify-content:space-between}
    .rx-pf__cierre span{font-size:.9375rem;font-weight:700}
    .rx-pf__cierre a{display:inline-block;background:${RED};color:#fff;font-weight:800;
      font-size:.875rem;padding:.6rem 1.15rem;border-radius:999px;text-decoration:none}
    .rx-pf__cierre a:hover{filter:brightness(.93)}
    @media screen and (min-width:48rem){
      .rx-pf{padding:3rem 1.5rem 4.5rem}
      .rx-pf__h1{font-size:2.5rem}
    }
  `

  return (
    <section className={`rx-pf ${handles.preguntas || ''}`}>
      <style>{css}</style>
      <h1 className="rx-pf__h1">{titulo}</h1>
      <p className="rx-pf__entrada">{entrada}</p>

      {grupos.map(g => (
        <div className="rx-pf__grupo" key={g.nombre}>
          <h2 className="rx-pf__gh">{g.nombre}</h2>
          {g.items.map(([p, r]) => {
            const esta = abierta === p
            return (
              <div className={`rx-pf__item${esta ? ' rx-pf__item--abierta' : ''}`} key={p}>
                <button type="button" className="rx-pf__boton" aria-expanded={esta}
                  onClick={() => setAbierta(esta ? null : p)}>
                  <span>{p}</span>
                  <svg className="rx-pf__mas" width="14" height="14" viewBox="0 0 14 14"
                    fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round"
                    aria-hidden="true">
                    <path d="M7 1v12M1 7h12" />
                  </svg>
                </button>
                {esta ? <p className="rx-pf__resp">{r}</p> : null}
              </div>
            )
          })}
        </div>
      ))}

      <div className="rx-pf__cierre">
        <span>{cierreTexto}</span>
        <a href="/contacto">{cierreEnlace}</a>
      </div>
    </section>
  )
}

const texto = (title, description) => ({ title, description, type: 'string' })
const parrafo = (title, description) => ({
  title, description, type: 'string', widget: { 'ui:widget': 'textarea' },
})
const VACIA = 'Vacía a propósito: mientras no tenga respuesta, la pregunta no aparece.'

const props = {
  titulo: texto('Título'),
  entrada: parrafo('Entrada'),
  grupo1: texto('Grupo 1 — título'),
  grupo2: texto('Grupo 2 — título'),
  cierreTexto: texto('Cierre — texto'),
  cierreEnlace: texto('Cierre — botón'),
}
for (let i = 1; i <= 11; i++) {
  props['p' + i] = texto('Pregunta ' + i)
  props['r' + i] = parrafo('Respuesta ' + i, i >= 8 ? VACIA : undefined)
}

Preguntas.schema = {
  title: 'Preguntas frecuentes',
  description: 'Una pregunta sin respuesta no se pinta, y un grupo sin preguntas tampoco.',
  type: 'object',
  properties: props,
}
