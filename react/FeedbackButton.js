/*
 * Boton flotante de feedback del sitio + modal (spec 002, RF-7 a RF-12).
 *
 * - Una sola instancia en store/blocks/header/header.jsonc (escritorio y movil): el header se
 *   renderiza tambien en la confirmacion del pedido (RF-8c), asi que no hay que duplicarla.
 * - El boton y el modal viven en un portal sobre document.body: el header fijo usa
 *   backdrop-filter y un position:fixed dentro de ese ancestro se ancla a el, no a la pantalla.
 * - El portal NO se crea hasta que el componente esta montado en el navegador. Crearlo durante la
 *   hidratacion de React 16 descuadra el DOM que vino del servidor: la home perdio su contenido
 *   (2026-11-16) cuando el boton estaba en el header.
 * - Envia a /_v/feedback/site (servicio onewstore.feedback-service). El navegador nunca escribe
 *   en Master Data. La fecha la pone el servidor; aqui solo viajan la RUTA de la pagina (sin
 *   consulta ni fragmento) y el tamano de pantalla (movil/escritorio).
 * - Correo opcional (RF-8b): lo escribe la persona; con sesion arranca con el de la cuenta
 *   (/_v/feedback/identity, se pide al abrir el modal) y se puede editar o borrar.
 * - Si el envio falla, lo escrito se conserva (RF-10).
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCssHandles } from 'vtex.css-handles'

import styles from './FeedbackButton.css'

const CSS_HANDLES = [
  'feedbackRoot',
  'feedbackTrigger',
  'feedbackTriggerLabel',
  'feedbackOverlay',
  'feedbackDialog',
  'feedbackTitle',
  'feedbackClose',
  'feedbackFieldset',
  'feedbackOption',
  'feedbackLabel',
  'feedbackField',
  'feedbackCounter',
  'feedbackSubmit',
  'feedbackError',
  'feedbackToast',
  'feedbackHidden',
]

const ENDPOINT = '/_v/feedback/site'
const IDENTITY_ENDPOINT = '/_v/feedback/identity'
const MAX_MESSAGE = 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_MAX = 768
const TOAST_MS = 6000

export const TYPES = [
  { value: 'problema', label: 'Problema' },
  { value: 'sugerencia', label: 'Sugerencia de mejora' },
  { value: 'otro', label: 'Otro' },
]

const ERRORS = {
  'rate-limited': 'Has enviado demasiados mensajes seguidos. Inténtalo de nuevo en unos minutos.',
  'bad-email': 'Revisa el correo: no parece válido.',
  'message-required': 'Escribe un mensaje.',
  'message-too-long': 'El mensaje es demasiado largo (máximo 1000 caracteres).',
  origin: 'No pudimos enviar tu mensaje desde esta página.',
}
const GENERIC_ERROR = 'No pudimos enviar tu mensaje. Inténtalo de nuevo en un momento. Lo que escribiste sigue aquí.'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])'

const cx = (...c) => c.filter(Boolean).join(' ')

function useClasses() {
  // La app real devuelve { handles, withModifiers }; el mock de los tests, el mapa directo.
  const cssHandles = useCssHandles(CSS_HANDLES)
  const handles = cssHandles.handles || cssHandles
  const h = {}
  CSS_HANDLES.forEach(name => {
    h[name] = cx(handles[name], styles[name])
  })
  return h
}

function currentPath() {
  return typeof window === 'undefined' ? '' : window.location.pathname || ''
}

function currentViewport() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_MAX ? 'movil' : 'escritorio'
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4a2 2 0 01-2-2V6a2 2 0 012-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function FeedbackButton({ label = 'Tu opinión', position = 'right' }) {
  const h = useClasses()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending
  const [error, setError] = useState('')
  const [toast, setToast] = useState(false)
  const [mounted, setMounted] = useState(false)

  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const firstRef = useRef(null)
  const emailTouched = useRef(false)
  const identityLoaded = useRef(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    setMounted(true)
    return () => clearTimeout(toastTimer.current)
  }, [])

  // Formulario cargado al abrir (RF-8): la precarga del correo se pide una sola vez, al abrir.
  useEffect(() => {
    if (!open || identityLoaded.current) return undefined
    identityLoaded.current = true
    let cancelled = false
    fetch(IDENTITY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: '{}',
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d && typeof d.email === 'string' && d.email && !emailTouched.current) {
          setEmail(d.email)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  // Bloquea el scroll del fondo y lleva el foco al primer control mientras el modal esta abierto.
  useEffect(() => {
    if (!open) return undefined
    document.body.classList.add(styles.bodyLock || 'bodyLock')
    if (firstRef.current) firstRef.current.focus()
    return () => document.body.classList.remove(styles.bodyLock || 'bodyLock')
  }, [open])

  const close = () => {
    setOpen(false)
    setError('')
    // El foco vuelve al boton que abrio el modal.
    if (triggerRef.current) triggerRef.current.focus()
  }

  const onKeyDown = e => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const submit = async e => {
    e.preventDefault()
    if (status === 'sending') return
    const text = message.trim()
    if (!type) return setError('Elige el tipo de mensaje.')
    if (!text) return setError(ERRORS['message-required'])
    if (text.length > MAX_MESSAGE) return setError(ERRORS['message-too-long'])
    const mail = email.trim()
    if (mail && !EMAIL_RE.test(mail)) return setError(ERRORS['bad-email'])

    setStatus('sending')
    setError('')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type,
          message: text,
          email: mail,
          pageUrl: currentPath(),
          viewport: currentViewport(),
          website,
        }),
      })
      let body = {}
      try {
        body = await res.json()
      } catch (_) {
        body = {}
      }
      if (res.ok && body.ok) {
        // RF-10: confirmacion y el modal se cierra. Se limpia lo escrito, salvo el correo.
        setType('')
        setMessage('')
        setStatus('idle')
        setOpen(false)
        setToast(true)
        clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(false), TOAST_MS)
        if (triggerRef.current) triggerRef.current.focus()
        return
      }
      setError(ERRORS[body.code] || GENERIC_ERROR)
    } catch (_) {
      setError(GENERIC_ERROR)
    }
    // Falla: se conserva todo lo escrito (RF-10) y se puede reintentar.
    setStatus('idle')
  }

  // Servidor y primera pasada del navegador: nada. El portal aparece ya hidratado.
  if (!mounted || typeof document === 'undefined') return null

  const side = position === 'left' ? styles.feedbackLeft || 'feedbackLeft' : ''

  const ui = (
    <div className={cx(h.feedbackRoot, side)}>
      <button
        ref={triggerRef}
        type="button"
        className={h.feedbackTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ChatIcon />
        <span className={h.feedbackTriggerLabel}>{label}</span>
      </button>

      {toast && (
        <p className={h.feedbackToast} role="status">
          ¡Gracias! Recibimos tu mensaje.
        </p>
      )}

      {open && (
        <div className={h.feedbackOverlay} onMouseDown={e => e.target === e.currentTarget && close()}>
          <div
            ref={dialogRef}
            className={h.feedbackDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onKeyDown={onKeyDown}
          >
            <button type="button" className={h.feedbackClose} aria-label="Cerrar" onClick={close}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <h2 id="feedback-title" className={h.feedbackTitle}>
              Cuéntanos cómo mejorar
            </h2>

            <form onSubmit={submit} noValidate>
              <fieldset className={h.feedbackFieldset}>
                <legend className={h.feedbackLabel}>Tipo de mensaje</legend>
                {TYPES.map((t, i) => (
                  <label key={t.value} className={h.feedbackOption}>
                    <input
                      ref={i === 0 ? firstRef : null}
                      type="radio"
                      name="feedback-type"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => setType(t.value)}
                    />
                    {t.label}
                  </label>
                ))}
              </fieldset>

              <label htmlFor="feedback-message" className={h.feedbackLabel}>
                Mensaje
              </label>
              <textarea
                id="feedback-message"
                className={h.feedbackField}
                rows={4}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={ev => setMessage(ev.target.value)}
              />
              <p className={h.feedbackCounter}>
                {message.length}/{MAX_MESSAGE}
              </p>

              <label htmlFor="feedback-email" className={h.feedbackLabel}>
                Tu correo, si quieres que te respondamos (opcional)
              </label>
              <input
                id="feedback-email"
                type="email"
                autoComplete="email"
                className={h.feedbackField}
                maxLength={254}
                value={email}
                onChange={ev => {
                  emailTouched.current = true
                  setEmail(ev.target.value)
                }}
              />

              {/* Campo trampa: fuera de pantalla y fuera del orden de tabulación. */}
              <div className={h.feedbackHidden} aria-hidden="true">
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

              {error && (
                <p className={h.feedbackError} role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className={h.feedbackSubmit} disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(ui, document.body)
}
