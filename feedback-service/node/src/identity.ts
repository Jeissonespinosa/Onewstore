import { maskEmail } from './mask'

export type EmailSource = 'account' | 'order' | null

export interface Identity {
  authenticated: boolean
  email: string
  source: EmailSource
}

// Resuelve en el servidor el correo de la persona: primero la cuenta (sesión de la tienda) y, si no,
// el pedido. El correo completo no sale de aquí: a la respuesta solo va la versión enmascarada.
export async function resolveIdentity(ctx: any, orderId: string): Promise<Identity> {
  const sessionToken = ctx.cookies.get('vtex_session')
  let authenticated = false
  if (sessionToken) {
    try {
      const { sessionData } = await ctx.clients.session.getSession(sessionToken, [
        'profile.isAuthenticated',
        'profile.email',
      ])
      const profile = sessionData?.namespaces?.profile
      authenticated = profile?.isAuthenticated?.value === 'true'
      const email = profile?.email?.value
      if (authenticated && typeof email === 'string' && email) {
        return { authenticated, email, source: 'account' }
      }
    } catch {
      // Sin sesión legible se sigue como anónimo.
    }
  }
  if (orderId) {
    const email = await ctx.clients.orders.getEmail(orderId)
    if (email) return { authenticated, email, source: 'order' }
  }
  return { authenticated, email: '', source: null }
}

export function publicIdentity(identity: Identity) {
  return {
    authenticated: identity.authenticated,
    source: identity.source,
    maskedEmail: identity.email ? maskEmail(identity.email) : null,
  }
}
