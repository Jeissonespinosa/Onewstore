import { json } from 'co-body'

// Orígenes permitidos: la tienda y sus workspaces. El dominio de producción se añadirá cuando exista
// (spec 000: hoy no hay tienda en producción con dominio propio).
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

// Las respuestas dependen de la sesión: no pueden guardarse en el CDN ni en el navegador
// (spike 1.5: el CDN reutilizó una respuesta durante minutos).
export function noStore(ctx: any) {
  ctx.set('Cache-Control', 'no-store, no-cache, private')
}

export function respond(ctx: any, status: number, body: Record<string, unknown>) {
  ctx.status = status
  ctx.body = body
}

// Lee el cuerpo JSON con un tope de tamaño. Devuelve undefined si no es JSON válido.
export async function readJson(ctx: any): Promise<unknown | undefined> {
  try {
    return await json(ctx.req, { limit: '10kb' })
  } catch {
    return undefined
  }
}

export function clientKey(ctx: any): { ip: string; session: string } {
  const forwarded = String(ctx.get('x-forwarded-for') || '').split(',')[0].trim()
  return { ip: forwarded || ctx.ip || '', session: ctx.cookies.get('vtex_session') || '' }
}
