/*
 * Los canales de atencion, debajo del formulario de contacto.
 *
 * ESTAN VACIOS A PROPOSITO. La spec 000 §10 tiene la pregunta Q5 —"canal y
 * responsable de atencion al cliente"— como ABIERTA, y la 004 repite la
 * pregunta: "¿quien atiende y por que canal?". Publicar un telefono o un
 * horario que nadie ha confirmado es prometerle al cliente una respuesta que
 * no sabemos si llega, y eso se paga mas caro que no tener el dato.
 *
 * Cada canal se pinta SOLO si tiene valor. Se llenan en
 * Admin > Storefront > Site Editor, sin tocar codigo. Cuando Q5 se responda,
 * se escriben ahi y aparecen solos.
 *
 * WhatsApp no esta aqui como boton flotante ni como chat: eso es la spec 015
 * (chatbot de IA, pendiente de la respuesta de VTEX). Este campo es solo el
 * numero, si lo hay.
 */
import React from 'react'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['canalesContacto']
const RED = '#FF371E'
const INK = '#010101'
const TINTA_SUAVE = '#55555C'

/* Un canal: el icono dibujado, la etiqueta y el valor. El href lo arma cada
   uno porque un telefono no se enlaza como un correo. */
const ICONOS = {
  telefono: 'M4 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L14 12l5 2v4a2 2 0 0 1-2.2 2A16 16 0 0 1 2 5.2 2 2 0 0 1 4 3z',
  whatsapp: 'M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 2a7 7 0 1 1-3.6 13l-.3-.2-2.2.6.6-2.2-.2-.3A7 7 0 0 1 12 5z',
  correo: 'M3 6h18v12H3zM3 6l9 7 9-7',
  direccion: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  horario: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
}

const enlaceDe = (clase, valor) => {
  if (clase === 'correo') return 'mailto:' + valor
  const solo = String(valor).replace(/[^0-9+]/g, '')
  if (clase === 'telefono') return 'tel:' + solo
  /* wa.me no admite el +, ni espacios, ni guiones. */
  if (clase === 'whatsapp') return 'https://wa.me/' + solo.replace(/\+/g, '')
  return null
}

export default function CanalesContacto({
  titulo = 'Otras formas de escribirnos',
  telefono = '',
  whatsapp = '',
  correo = '',
  direccion = '',
  horario = '',
}) {
  const handles = useCssHandles(CSS_HANDLES)

  const canales = [
    { clase: 'telefono', etiqueta: 'Teléfono', valor: telefono },
    { clase: 'whatsapp', etiqueta: 'WhatsApp', valor: whatsapp },
    { clase: 'correo', etiqueta: 'Correo', valor: correo },
    { clase: 'direccion', etiqueta: 'Dirección', valor: direccion },
    { clase: 'horario', etiqueta: 'Horario', valor: horario },
  ].filter(c => String(c.valor || '').trim())

  /* Sin un solo canal confirmado no hay seccion: un titulo sobre el vacio
     se lee como una pagina rota. */
  if (!canales.length) return null

  const css = `
    .rx-cc{margin:2.5rem 0 0}
    .rx-cc__h{font-size:1.125rem;font-weight:800;letter-spacing:-.01em;color:${INK};
      margin:0 0 1rem;padding-bottom:.55rem;border-bottom:2px solid ${RED};
      display:inline-block}
    .rx-cc__lista{display:grid;gap:.75rem;grid-template-columns:1fr}
    .rx-cc__item{display:flex;align-items:flex-start;gap:.75rem;
      border:1px solid rgba(1,1,1,.1);border-radius:.875rem;padding:.9rem 1rem;background:#fff}
    .rx-cc__ico{flex-shrink:0;margin-top:.1rem}
    .rx-cc__et{display:block;font-size:.6875rem;font-weight:800;letter-spacing:.06em;
      text-transform:uppercase;color:#9A9AA2;margin-bottom:.15rem}
    .rx-cc__va{font-size:.9375rem;font-weight:700;color:${INK};text-decoration:none;
      line-height:1.35;word-break:break-word}
    a.rx-cc__va:hover{color:${RED}}
    @media screen and (min-width:48rem){
      .rx-cc__lista{grid-template-columns:repeat(2,1fr);gap:1rem}
    }
  `

  return (
    <section className={`rx-cc ${handles.canalesContacto || ''}`}>
      <style>{css}</style>
      <h2 className="rx-cc__h">{titulo}</h2>
      <div className="rx-cc__lista">
        {canales.map(c => {
          const href = enlaceDe(c.clase, c.valor)
          const cuerpo = (
            <>
              <svg className="rx-cc__ico" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={RED} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d={ICONOS[c.clase]} />
              </svg>
              <span>
                <span className="rx-cc__et">{c.etiqueta}</span>
                {href
                  ? <a className="rx-cc__va" href={href}>{c.valor}</a>
                  : <span className="rx-cc__va">{c.valor}</span>}
              </span>
            </>
          )
          return <div key={c.clase} className="rx-cc__item">{cuerpo}</div>
        })}
      </div>
    </section>
  )
}

const campo = (title, description) => ({ title, description, type: 'string' })

CanalesContacto.schema = {
  title: 'Canales de contacto',
  description: 'Lo que se deje vacío no aparece. Si no hay ninguno, no se pinta la sección.',
  type: 'object',
  properties: {
    titulo: campo('Título'),
    telefono: campo('Teléfono', 'Ej: +57 601 123 4567. Se vuelve un enlace para llamar.'),
    whatsapp: campo('WhatsApp', 'Solo el número con indicativo. Se vuelve un enlace a wa.me.'),
    correo: campo('Correo', 'Se vuelve un enlace mailto.'),
    direccion: campo('Dirección'),
    horario: campo('Horario de atención', 'Ej: lunes a viernes de 8:00 a 6:00, sábados hasta mediodía.'),
  },
}
