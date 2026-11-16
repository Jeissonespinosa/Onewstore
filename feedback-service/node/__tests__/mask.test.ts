import { maskEmail } from '../lib/mask'

describe('maskEmail', () => {
  it('deja la primera letra y el dominio', () => {
    expect(maskEmail('diego@gmail.com')).toBe('d***@gmail.com')
  })
  it('funciona con una sola letra antes de la arroba', () => {
    expect(maskEmail('d@x.co')).toBe('d***@x.co')
  })
  it('devuelve vacío si no es un correo', () => {
    expect(maskEmail('')).toBe('')
    expect(maskEmail('sin-arroba')).toBe('')
    expect(maskEmail('@x.co')).toBe('')
  })
  it('nunca contiene el resto del nombre', () => {
    expect(maskEmail('persona.secreta@x.co')).not.toContain('secreta')
  })
})
