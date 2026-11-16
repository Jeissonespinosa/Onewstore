import { PURCHASE_ENTITY, SCHEMA } from '../src/entities'
import { guard } from '../src/guard'
import { respond } from '../src/http'
import { resolveIdentity } from '../src/identity'
import { validatePurchase } from '../src/validate'

// POST /_v/feedback/purchase — rating de la compra (RF-1..RF-6). Una calificación por pedido (RF-4):
// el id del documento es el número de pedido.
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
    // El número de pedido es el id del documento. Leer por id es inmediato; buscar por campo no lo
    // es (Master Data indexa con retraso y un doble clic pasaba, comprobado en devdiego).
    // orderId ya está validado con una lista de caracteres segura.
    try {
      await ctx.clients.masterdata.getDocument({
        dataEntity: PURCHASE_ENTITY,
        id: orderId,
        fields: ['id'],
      })
      respond(ctx, 409, { ok: false, code: 'already-rated' })
      return
    } catch (e: any) {
      if (e?.response?.status !== 404) throw e
    }
    // El correo del pedido se toma en el servidor (RF-3). Si no se puede leer, se guarda sin él.
    const identity = await resolveIdentity(ctx, orderId)
    await ctx.clients.masterdata.createOrUpdateEntireDocument({
      dataEntity: PURCHASE_ENTITY,
      schema: SCHEMA,
      id: orderId,
      fields: { orderId, rating, comment, reason, email: identity.email },
    })
    respond(ctx, 200, { ok: true })
  } catch {
    respond(ctx, 502, { ok: false, code: 'unavailable' })
  }
  await next()
}
