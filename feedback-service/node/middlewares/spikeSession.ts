import { maskEmail, noStore, originAllowed } from './common'

// Spike 1.5(e): el servidor lee la sesión de la tienda (cookie vtex_session) y solo devuelve el
// correo enmascarado. El correo completo nunca sale del servidor.
export async function spikeSession(ctx: any, next: () => Promise<any>) {
  noStore(ctx)
  if (!originAllowed(ctx)) {
    ctx.status = 403
    ctx.body = { error: 'origin' }
    return
  }
  const sessionToken = ctx.cookies.get('vtex_session')
  if (!sessionToken) {
    ctx.status = 200
    ctx.body = { authenticated: false, reason: 'no-session-cookie' }
    return
  }
  try {
    const { sessionData } = await ctx.clients.session.getSession(sessionToken, [
      'profile.isAuthenticated',
      'profile.email',
    ])
    const profile = sessionData?.namespaces?.profile
    const authenticated = profile?.isAuthenticated?.value === 'true'
    const email = profile?.email?.value
    ctx.status = 200
    ctx.body = {
      authenticated,
      maskedEmail: authenticated && email ? maskEmail(email) : null,
    }
  } catch (e: any) {
    ctx.status = 502
    ctx.body = { error: 'session', detail: e?.message }
  }
  await next()
}
