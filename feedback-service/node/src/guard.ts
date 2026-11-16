import { clientKey, noStore, originAllowed, readJson, respond } from './http'
import { allow, rateKey } from './rateLimit'
import { vbaseCounterStore } from './store'
import { isHoneypotFilled } from './validate'

// Comprobaciones comunes de las rutas que reciben feedback, en este orden:
// origen -> cuerpo JSON -> campo trampa -> límite de envíos.
// Devuelve el cuerpo si se puede seguir; si no, ya respondió y devuelve undefined.
export async function guard(ctx: any, kind: string, now: number = Date.now()) {
  noStore(ctx)
  if (!originAllowed(ctx)) {
    respond(ctx, 403, { ok: false, code: 'origin' })
    return undefined
  }
  const body = await readJson(ctx)
  if (body === undefined) {
    respond(ctx, 400, { ok: false, code: 'bad-json' })
    return undefined
  }
  // Un robot que rellena el campo trampa recibe un "ok" y no se guarda nada.
  if (isHoneypotFilled(body)) {
    respond(ctx, 200, { ok: true })
    return undefined
  }
  const { ip, session } = clientKey(ctx)
  let allowed = true
  try {
    allowed = await allow(vbaseCounterStore(ctx.clients.vbase), rateKey(kind, ip, session), now)
  } catch (e: any) {
    // Si el contador falla (p. ej. falta la política vbase-read-write) el envío no se pierde, pero
    // queda constancia en los logs. No se registra nada de la persona.
    console.error('feedback: límite de envíos no disponible', e?.message)
  }
  if (!allowed) {
    respond(ctx, 429, { ok: false, code: 'rate-limited' })
    return undefined
  }
  return body
}
