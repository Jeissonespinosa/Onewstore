// Validación estricta de lo que llega del navegador (spec 002: RF-1..RF-9, RF-14).
// Funciones puras: no tocan la red ni el contexto, para poder probarlas una a una.

export const MAX_TEXT = 1000
export const MAX_EMAIL = 254
export const MAX_PATH = 500

export const REASONS = ['envio', 'producto', 'precio', 'uso del sitio', 'pago', 'otro'] as const
export const SITE_TYPES = ['problema', 'sugerencia', 'otro'] as const
export const VIEWPORTS = ['movil', 'escritorio'] as const

export type Reason = (typeof REASONS)[number]
export type SiteType = (typeof SITE_TYPES)[number]
export type Viewport = (typeof VIEWPORTS)[number]

export type Result<T> = { ok: true; value: T } | { ok: false; code: string }

export interface PurchaseInput {
  orderId: string
  rating: number
  comment: string
  reason: Reason | ''
  email: string
}

export interface SiteInput {
  type: SiteType
  message: string
  email: string
  orderId: string
  pageUrl: string
  viewport: Viewport
}

const ORDER_ID = /^[A-Za-z0-9-]{8,40}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Quita caracteres de control (salvo salto de línea y tabulador). No se codifica HTML: el texto se
// guarda tal cual y se muestra siempre como texto plano (AC-10).
export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
}

// Campo trampa: un humano nunca lo rellena.
export function isHoneypotFilled(body: unknown): boolean {
  return isObject(body) && typeof body.website === 'string' && body.website.trim() !== ''
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL && EMAIL.test(email)
}

export function isValidOrderId(orderId: unknown): orderId is string {
  return typeof orderId === 'string' && ORDER_ID.test(orderId)
}

// Solo se guarda la ruta de la página (sin dominio, consulta ni fragmento): lo mínimo necesario.
export function normalizePath(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  try {
    return new URL(value, 'https://tienda.invalid').pathname.slice(0, MAX_PATH)
  } catch {
    return ''
  }
}

export function validatePurchase(body: unknown): Result<PurchaseInput> {
  if (!isObject(body)) return { ok: false, code: 'bad-body' }
  if (!isValidOrderId(body.orderId)) return { ok: false, code: 'bad-order' }
  const rating = body.rating
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, code: 'bad-rating' }
  }
  const comment = cleanText(body.comment)
  if (comment.length > MAX_TEXT) return { ok: false, code: 'comment-too-long' }

  // El correo es opcional y lo escribe la persona (RF-3); si viene, debe ser válido.
  const email = cleanText(body.email)
  if (email && !isValidEmail(email)) return { ok: false, code: 'bad-email' }

  // El motivo solo aplica de 1 a 3 estrellas (RF-6); con más, se ignora.
  let reason: Reason | '' = ''
  if (rating <= 3 && body.reason !== undefined && body.reason !== '') {
    if (!REASONS.includes(body.reason as Reason)) return { ok: false, code: 'bad-reason' }
    reason = body.reason as Reason
  }
  return { ok: true, value: { orderId: body.orderId, rating, comment, reason, email } }
}

export function validateSite(body: unknown): Result<SiteInput> {
  if (!isObject(body)) return { ok: false, code: 'bad-body' }
  if (!SITE_TYPES.includes(body.type as SiteType)) return { ok: false, code: 'bad-type' }
  const message = cleanText(body.message)
  if (!message) return { ok: false, code: 'message-required' }
  if (message.length > MAX_TEXT) return { ok: false, code: 'message-too-long' }
  if (!VIEWPORTS.includes(body.viewport as Viewport)) return { ok: false, code: 'bad-viewport' }

  // El correo es opcional (RF-8b); si viene, debe ser válido.
  const email = cleanText(body.email)
  if (email && !isValidEmail(email)) return { ok: false, code: 'bad-email' }

  let orderId = ''
  if (body.orderId !== undefined && body.orderId !== '') {
    if (!isValidOrderId(body.orderId)) return { ok: false, code: 'bad-order' }
    orderId = body.orderId
  }
  return {
    ok: true,
    value: {
      type: body.type as SiteType,
      message,
      email,
      orderId,
      pageUrl: normalizePath(body.pageUrl),
      viewport: body.viewport as Viewport,
    },
  }
}
