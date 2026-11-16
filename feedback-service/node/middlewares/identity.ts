import { noStore, originAllowed, readJson, respond } from '../src/http'
import { publicIdentity, resolveIdentity } from '../src/identity'
import { isValidOrderId } from '../src/validate'

// POST /_v/feedback/identity — dice al formulario a qué correo se responderá, siempre enmascarado.
export async function identity(ctx: any, next: () => Promise<any>) {
  noStore(ctx)
  if (!originAllowed(ctx)) {
    respond(ctx, 403, { ok: false, code: 'origin' })
    return
  }
  const body: any = await readJson(ctx)
  if (body === undefined) {
    respond(ctx, 400, { ok: false, code: 'bad-json' })
    return
  }
  const orderId = isValidOrderId(body?.orderId) ? body.orderId : ''
  const resolved = await resolveIdentity(ctx, orderId)
  respond(ctx, 200, { ok: true, ...publicIdentity(resolved) })
  await next()
}
