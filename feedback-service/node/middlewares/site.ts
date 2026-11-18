import { SCHEMA, SITE_ENTITY } from '../src/entities'
import { guard } from '../src/guard'
import { respond } from '../src/http'
import { validateSite } from '../src/validate'

// POST /_v/feedback/site — feedback del sitio desde el botón flotante (RF-7..RF-10).
export async function site(ctx: any, next: () => Promise<any>) {
  const body = await guard(ctx, 'site')
  if (body === undefined) return

  const parsed = validateSite(body)
  if (!parsed.ok) {
    respond(ctx, 400, { ok: false, code: parsed.code })
    return
  }
  const { type, message, email, pageUrl, viewport } = parsed.value

  try {
    // RF-8b: se guarda el correo que escribió la persona (opcional), tal cual.
    await ctx.clients.masterdata.createDocument({
      dataEntity: SITE_ENTITY,
      schema: SCHEMA,
      fields: { type, message, email, pageUrl, viewport },
    })
    respond(ctx, 200, { ok: true })
  } catch {
    respond(ctx, 502, { ok: false, code: 'unavailable' })
  }
  await next()
}
