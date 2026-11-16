import { maskEmail } from './mask'

export type EmailSource = 'account' | 'order' | null

export interface Identity {
  authenticated: boolean
  email: string
  source: EmailSource
}

// Resuelve en el servidor el correo de la persona: primero el del pedido y, si no hay pedido o no se
// puede leer, el de la cuenta (sesión de la tienda). El correo completo no sale de aquí: a la
// respuesta solo va la versión enmascarada.
export async function resolveIdentity(ctx: any, orderId: string): Promise<Identity> {
  const sessionToken = ctx.cookies.get('vtex_session')
  let authenticated = false
  let accountEmail = ''
  if (sessionToken) {
    try {
      const { sessionData } = await ctx.clients.session.getSession(sessionToken, [
        'profile.isAuthenticated',
        'profile.email',
      ])
      const profile = sessionData?.namespaces?.profile
      authenticated = profile?.isAuthenticated?.value === 'true'
      const email = profile?.email?.value
      if (authenticated && typeof email === 'string') accountEmail = email
    } catch {
      // Sin sesión legible se sigue como anónimo.
    }
  }
  if (orderId) {
    const email = await ctx.clients.orders.getEmail(orderId)
    if (email) return { authenticated, email, source: 'order' }
  }
  if (accountEmail) return { authenticated, email: accountEmail, source: 'account' }
  return { authenticated, email: '', source: null }
}

export function publicIdentity(identity: Identity) {
  return {
    authenticated: identity.authenticated,
    source: identity.source,
    maskedEmail: identity.email ? maskEmail(identity.email) : null,
  }
}
