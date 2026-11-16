import {
  cleanText,
  isHoneypotFilled,
  isValidEmail,
  normalizePath,
  validatePurchase,
  validateSite,
} from '../lib/validate'

describe('validatePurchase', () => {
  const base = { orderId: '1234567890123-01', rating: 4, comment: 'Todo bien' }

  it('acepta una calificación válida (AC-2: sin comentario también)', () => {
    expect(validatePurchase(base)).toEqual({
      ok: true,
      value: { orderId: '1234567890123-01', rating: 4, comment: 'Todo bien', reason: '' },
    })
    expect(validatePurchase({ orderId: base.orderId, rating: 5 }).ok).toBe(true)
  })

  it.each([0, 6, 3.5, '4', null, undefined])('rechaza la calificación %p', (rating) => {
    expect(validatePurchase({ ...base, rating })).toEqual({ ok: false, code: 'bad-rating' })
  })

  it.each(['', 'abc', "1234567' OR 1=1", 'a'.repeat(41), 12345678])(
    'rechaza el número de pedido %p (evita inyección en el filtro)',
    (orderId) => {
      expect(validatePurchase({ ...base, orderId })).toEqual({ ok: false, code: 'bad-order' })
    }
  )

  it('rechaza un comentario de más de 1000 caracteres y acepta uno de 1000', () => {
    expect(validatePurchase({ ...base, comment: 'a'.repeat(1001) })).toEqual({
      ok: false,
      code: 'comment-too-long',
    })
    expect(validatePurchase({ ...base, comment: 'a'.repeat(1000) }).ok).toBe(true)
  })

  it('RF-6: el motivo solo cuenta con 1-3 estrellas y debe estar en la lista', () => {
    const low = validatePurchase({ ...base, rating: 2, reason: 'envio' })
    expect(low.ok && low.value.reason).toBe('envio')
    const high = validatePurchase({ ...base, rating: 5, reason: 'envio' })
    expect(high.ok && high.value.reason).toBe('')
    expect(validatePurchase({ ...base, rating: 2, reason: 'otra-cosa' })).toEqual({
      ok: false,
      code: 'bad-reason',
    })
  })

  it('rechaza un cuerpo que no es un objeto', () => {
    expect(validatePurchase(null)).toEqual({ ok: false, code: 'bad-body' })
    expect(validatePurchase([])).toEqual({ ok: false, code: 'bad-body' })
    expect(validatePurchase('x')).toEqual({ ok: false, code: 'bad-body' })
  })
})

describe('validateSite', () => {
  const base = { type: 'problema', message: 'No carga', viewport: 'movil', pageUrl: '/carros?x=1#a' }

  it('acepta el caso mínimo y guarda solo la ruta de la página (sin consulta ni fragmento)', () => {
    expect(validateSite(base)).toEqual({
      ok: true,
      value: {
        type: 'problema',
        message: 'No carga',
        email: '',
        orderId: '',
        pageUrl: '/carros',
        viewport: 'movil',
      },
    })
  })

  it('AC-8: mensaje vacío o solo espacios se rechaza', () => {
    expect(validateSite({ ...base, message: '   ' })).toEqual({ ok: false, code: 'message-required' })
    expect(validateSite({ ...base, message: undefined })).toEqual({
      ok: false,
      code: 'message-required',
    })
  })

  it('AC-8: el correo es opcional, pero un correo mal escrito se rechaza', () => {
    expect(validateSite({ ...base, email: '' }).ok).toBe(true)
    expect(validateSite({ ...base, email: 'a@b.co' }).ok).toBe(true)
    expect(validateSite({ ...base, email: 'no-es-correo' })).toEqual({ ok: false, code: 'bad-email' })
  })

  it('valida tipo y tamaño de pantalla contra listas cerradas', () => {
    expect(validateSite({ ...base, type: 'x' })).toEqual({ ok: false, code: 'bad-type' })
    expect(validateSite({ ...base, viewport: 'tablet' })).toEqual({ ok: false, code: 'bad-viewport' })
  })

  it('mensaje de más de 1000 caracteres se rechaza', () => {
    expect(validateSite({ ...base, message: 'a'.repeat(1001) })).toEqual({
      ok: false,
      code: 'message-too-long',
    })
  })

  it('el número de pedido es opcional pero debe ser válido si viene', () => {
    const ok = validateSite({ ...base, orderId: '1234567890123-01' })
    expect(ok.ok && ok.value.orderId).toBe('1234567890123-01')
    expect(validateSite({ ...base, orderId: "x' OR 1=1" })).toEqual({ ok: false, code: 'bad-order' })
  })
})

describe('utilidades', () => {
  it('AC-10: el texto con HTML se conserva como texto (no se interpreta ni se codifica)', () => {
    expect(cleanText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
  })

  it('quita caracteres de control pero conserva los saltos de línea', () => {
    expect(cleanText('a\u0000b\u0007c\nd')).toBe('abc\nd')
  })

  it('detecta el campo trampa', () => {
    expect(isHoneypotFilled({ website: 'http://spam' })).toBe(true)
    expect(isHoneypotFilled({ website: '  ' })).toBe(false)
    expect(isHoneypotFilled({})).toBe(false)
  })

  it('isValidEmail y normalizePath', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(false)
    expect(normalizePath('https://x.com/a/b?c=1#d')).toBe('/a/b')
    expect(normalizePath(undefined)).toBe('')
  })
})
