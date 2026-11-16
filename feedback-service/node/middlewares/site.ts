import { SCHEMA, SITE_ENTITY } from '../lib/entities'
import { guard } from '../lib/guard'
import { respond } from '../lib/http'
import { resolveIdentity } from '../lib/identity'
import { validateSite } from '../lib/validate'

// POST /_v/feedback/site — feedback del sitio desde el botón flotante (RF-7..RF-10).
export async function site(ctx: any, next: () => Promise<any>) {
  const body = await guard(ctx, 'site')
  if (body === undefined) return

  const parsed = validateSite(body)
  if (!parsed.ok) {
    respond(ctx, 400, { ok: false, code: parsed.code })
    return
  }
  const { type, message, email, orderId, pageUrl, viewport } = parsed.value

  try {
    // RF-8b: cuenta -> pedido -> el que escribió la persona (opcional).
    const identity = await resolveIdentity(ctx, orderId)
    await ctx.clients.masterdata.createDocument({
      dataEntity: SITE_ENTITY,
      schema: SCHEMA,
      fields: { type, message, email: identity.email || email, pageUrl, viewport },
    })
    respond(ctx, 200, { ok: true })
  } catch {
    respond(ctx, 502, { ok: false, code: 'unavailable' })
  }
  await next()
}
