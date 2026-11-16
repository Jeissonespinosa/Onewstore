/*
 * Calificacion de la compra (spec 002, RF-1 a RF-6) para la pagina de confirmacion del pedido.
 *
 * - 5 estrellas (grupo de radios: flechas, Inicio/Fin, Tab) + comentario opcional (max 1000).
 * - Con 1-3 estrellas pide un motivo opcional (RF-6).
 * - Envia a /_v/feedback/purchase (servicio onewstore.feedback-service); el navegador nunca
 *   escribe en Master Data. El correo lo resuelve el servidor (RF-3).
 * - El numero de pedido sale del parametro `og` de la URL de confirmacion (comprobado en el
 *   spike 1.1). Sin el, el bloque no se muestra.
 * - Campo trampa `website` oculto: un humano no lo ve ni lo rellena.
 */
import React, { useMemo, useRef, useState } from 'react'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = [
  'purchaseRating',
  'purchaseRatingTitle',
  'purchaseRatingStars',
  'purchaseRatingStar',
  'purchaseRatingField',
  'purchaseRatingButton',
  'purchaseRatingMessage',
]

const ENDPOINT = '/_v/feedback/purchase'
const MAX_COMMENT = 1000
const RED = '#FF371E'
const INK = '#010101'

export const REASONS = [
  { value: 'envio', label: 'Envío' },
  { value: 'producto', label: 'Producto' },
  { value: 'precio', label: 'Precio' },
  { value: 'uso del sitio', label: 'Uso del sitio' },
  { value: 'pago', label: 'Pago' },
  { value: 'otro', label: 'Otro' },
]

const ERRORS = {
  'already-rated': 'Ya recibimos tu calificación de este pedido. ¡Gracias!',
  'rate-limited': 'Has enviado demasiados mensajes seguidos. Inténtalo de nuevo en unos minutos.',
}
const GENERIC_ERROR = 'No pudimos enviar tu calificación. Inténtalo de nuevo en un momento.'

const styles = {
  root: {
    maxWidth: 560,
    margin: '0 auto 32px',
    padding: 24,
    border: '1px solid #E3E4E6',
    borderRadius: 8,
    fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    color: INK,
  },
  title: { margin: '0 0 12px', fontSize: 18, fontWeight: 600 },
  stars: { display: 'flex', gap: 4, margin: '0 0 16px' },
  field: { display: 'block', width: '100%', boxSizing: 'border-box', margin: '0 0 12px', padding: 8, font: 'inherit' },
  label: { display: 'block', margin: '0 0 4px', fontSize: 14 },
  button: {
    padding: '10px 24px',
    border: 0,
    borderRadius: 4,
    background: RED,
    color: '#fff',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
  hidden: { position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' },
  message: { margin: '12px 0 0', fontSize: 14 },
}

function readOrderId() {
  if (typeof window === 'undefined') return ''
  const og = new URLSearchParams(window.location.search).get('og') || ''
  return /^[A-Za-z0-9-]{8,40}$/.test(og) ? og : ''
}

function Star({ filled, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.7L12 17.4l-5.9 3.4 1.3-6.7L2.5 9.5l6.6-.8z"
        fill={filled ? RED : 'none'}
        stroke={filled ? RED : '#8D8F94'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PurchaseRating() {
  const handles = useCssHandles(CSS_HANDLES)
  const orderId = useMemo(readOrderId, [])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reason, setReason] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [errorText, setErrorText] = useState('')
  const refs = useRef([])

  if (!orderId) return null

  if (status === 'done') {
    return (
      <section className={handles.purchaseRating} style={styles.root}>
        <p className={handles.purchaseRatingMessage} style={{ ...styles.message, margin: 0 }} role="status">
          ¡Gracias por calificar tu compra!
        </p>
      </section>
    )
  }

  const choose = n => {
    setRating(n)
    if (n > 3) setReason('')
    if (refs.current[n - 1]) refs.current[n - 1].focus()
  }

  const onKeyDown = (e, n) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
    if (keys[e.key]) {
      e.preventDefault()
      choose(Math.min(5, Math.max(1, n + keys[e.key])))
    } else if (e.key === 'Home') {
      e.preventDefault()
      choose(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      choose(5)
    }
  }

  const submit = async e => {
    e.preventDefault()
    if (rating < 1 || status === 'sending') return
    setStatus('sending')
    setErrorText('')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId, rating, comment: comment.trim(), reason, website }),
      })
      let body = {}
      try {
        body = await res.json()
      } catch (_) {
        body = {}
      }
      if (res.ok && body.ok) {
        setStatus('done')
        return
      }
      if (body.code === 'already-rated') {
        setStatus('done')
        return
      }
      setErrorText(ERRORS[body.code] || GENERIC_ERROR)
      setStatus('error')
    } catch (_) {
      setErrorText(GENERIC_ERROR)
      setStatus('error')
    }
  }

  const tabbable = rating || 1

  return (
    <section className={handles.purchaseRating} style={styles.root}>
      <form onSubmit={submit} noValidate>
        <h2 id="purchase-rating-title" className={handles.purchaseRatingTitle} style={styles.title}>
          ¿Cómo fue tu compra?
        </h2>

        <div
          role="radiogroup"
          aria-labelledby="purchase-rating-title"
          className={handles.purchaseRatingStars}
          style={styles.stars}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} de 5 estrellas`}
              tabIndex={n === tabbable ? 0 : -1}
              ref={el => {
                refs.current[n - 1] = el
              }}
              onClick={() => choose(n)}
              onKeyDown={ev => onKeyDown(ev, n)}
              className={handles.purchaseRatingStar}
              style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer' }}
            >
              <Star filled={n <= rating} />
            </button>
          ))}
        </div>

        {rating > 0 && rating <= 3 && (
          <div>
            <label htmlFor="purchase-rating-reason" style={styles.label}>
              ¿Qué falló? (opcional)
            </label>
            <select
              id="purchase-rating-reason"
              value={reason}
              onChange={ev => setReason(ev.target.value)}
              className={handles.purchaseRatingField}
              style={styles.field}
            >
              <option value="">Prefiero no decirlo</option>
              {REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <label htmlFor="purchase-rating-comment" style={styles.label}>
          Cuéntanos más (opcional)
        </label>
        <textarea
          id="purchase-rating-comment"
          value={comment}
          maxLength={MAX_COMMENT}
          rows={3}
          onChange={ev => setComment(ev.target.value)}
          className={handles.purchaseRatingField}
          style={styles.field}
        />
        <p style={{ margin: '0 0 12px', fontSize: 12 }} aria-live="off">
          {comment.length}/{MAX_COMMENT}
        </p>

        {/* Campo trampa: fuera de pantalla y fuera del orden de tabulación. */}
        <div style={styles.hidden} aria-hidden="true">
          <label>
            No lo rellenes
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={ev => setWebsite(ev.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={rating < 1 || status === 'sending'}
          className={handles.purchaseRatingButton}
          style={{ ...styles.button, ...(rating < 1 || status === 'sending' ? styles.disabled : {}) }}
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar'}
        </button>

        {status === 'error' && (
          <p className={handles.purchaseRatingMessage} style={{ ...styles.message, color: '#B00020' }} role="alert">
            {errorText}
          </p>
        )}
      </form>
    </section>
  )
}
