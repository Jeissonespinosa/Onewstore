export interface AccountIdentity {
  authenticated: boolean
  email: string
}

// Correo de la cuenta de quien tiene sesión iniciada. Solo sirve para PRECARGAR el campo de correo del
// formulario: lo que se guarda es siempre lo que la persona deja escrito. Se devuelve únicamente a
// la propia sesión (cookie de la tienda), con `Cache-Control: no-store`.
export async function accountIdentity(ctx: any): Promise<AccountIdentity> {
  const sessionToken = ctx.cookies.get('vtex_session')
  if (!sessionToken) return { authenticated: false, email: '' }
  try {
    const { sessionData } = await ctx.clients.session.getSession(sessionToken, [
      'profile.isAuthenticated',
      'profile.email',
    ])
    const profile = sessionData?.namespaces?.profile
    const authenticated = profile?.isAuthenticated?.value === 'true'
    const email = profile?.email?.value
    return { authenticated, email: authenticated && typeof email === 'string' ? email : '' }
  } catch {
    // Sin sesión legible se sigue como anónimo.
    return { authenticated: false, email: '' }
  }
}
