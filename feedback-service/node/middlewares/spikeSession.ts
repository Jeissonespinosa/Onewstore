import { maskEmail, originAllowed } from './common'

export async function spikeSession(ctx: any, next: () => Promise<any>) {
  if (!originAllowed(ctx)) {
    ctx.status = 403
    ctx.body = { error: 'origin' }
    return
  }
  const token = ctx.vtex.storeUserAuthToken || ctx.cookies.get('VtexIdclientAutCookie')
  if (!token) {
    ctx.status = 200
    ctx.body = { authenticated: false }
    return
  }
  try {
    const user = await ctx.clients.vtexId.getAuthenticatedUser(token)
    ctx.status = 200
    // Solo se devuelve la versión enmascarada.
    ctx.body = { authenticated: !!user, maskedEmail: user?.user ? maskEmail(user.user) : null }
  } catch (e: any) {
    ctx.status = 200
    ctx.body = { authenticated: false, detail: e?.message }
  }
  await next()
}
