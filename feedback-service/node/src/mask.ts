// d***@gmail.com — el correo completo nunca sale del servidor (RF-8b, RF-15).
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return ''
  return `${email[0]}***${email.slice(at)}`
}
