import { noStore, originAllowed, readJson, respond } from '../src/http'
import { accountIdentity } from '../src/identity'

// POST /_v/feedback/identity — correo de la cuenta de la sesión, para precargar el formulario.
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
  const account = await accountIdentity(ctx)
  respond(ctx, 200, { ok: true, authenticated: account.authenticated, email: account.email || null })
  await next()
}
