import { PURCHASE_ENTITY, SCHEMA } from '../lib/entities'
import { guard } from '../lib/guard'
import { respond } from '../lib/http'
import { resolveIdentity } from '../lib/identity'
import { validatePurchase } from '../lib/validate'

// POST /_v/feedback/purchase — rating de la compra (RF-1..RF-6). Una calificación por pedido (RF-4).
export async function purchase(ctx: any, next: () => Promise<any>) {
  const body = await guard(ctx, 'purchase')
  if (body === undefined) return

  const parsed = validatePurchase(body)
  if (!parsed.ok) {
    respond(ctx, 400, { ok: false, code: parsed.code })
    return
  }
  const { orderId, rating, comment, reason } = parsed.value

  try {
    // orderId ya está validado con una lista de caracteres segura: no hay inyección en el filtro.
    const existing = await ctx.clients.masterdata.searchDocuments({
      dataEntity: PURCHASE_ENTITY,
      schema: SCHEMA,
      fields: ['id'],
      where: `orderId=${orderId}`,
      pagination: { page: 1, pageSize: 1 },
    })
    if (existing.length > 0) {
      respond(ctx, 409, { ok: false, code: 'already-rated' })
      return
    }
    // El correo del pedido se toma en el servidor (RF-3). Si no se puede leer, se guarda sin él.
    const identity = await resolveIdentity(ctx, orderId)
    await ctx.clients.masterdata.createDocument({
      dataEntity: PURCHASE_ENTITY,
      schema: SCHEMA,
      fields: { orderId, rating, comment, reason, email: identity.email },
    })
    respond(ctx, 200, { ok: true })
  } catch {
    respond(ctx, 502, { ok: false, code: 'unavailable' })
  }
  await next()
}
