// Utilidades compartidas. Spike: el origen permitido es solo el de los workspaces de la cuenta.
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+--)?onewstore\.myvtex\.com$/

export function originAllowed(ctx: any): boolean {
  const origin = ctx.get('origin') || ''
  if (origin) return ALLOWED_ORIGIN.test(origin)
  const referer = ctx.get('referer') || ''
  try {
    return ALLOWED_ORIGIN.test(new URL(referer).origin)
  } catch {
    return false
  }
}

// d***@gmail.com — el correo completo nunca sale del servidor.
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return ''
  return `${local[0]}***@${domain}`
}

// Las respuestas del servicio dependen de la sesión y no deben guardarse en el CDN ni en el navegador
// (sin esto el CDN reutilizó una respuesta durante minutos; spike 1.5, 2026-11-15).
export function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store, no-cache, private')
}
