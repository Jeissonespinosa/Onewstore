/*
 * Tests de checkout-ui-custom/aceptacion-tyc.js (spec 001, tarea 7.1).
 * Correr: ver react/__tests__/jest.config.js.
 */
const fs = require('fs')
const path = require('path')

const A = require('../../checkout-ui-custom/aceptacion-tyc')

const BORRADORES = path.resolve(__dirname, '../../specs/001-tyc-marketplace/borradores')
const ARCHIVOS = {
  tyc: 'D2-terminos-y-condiciones.md',
  venta: 'D3-terminos-de-venta.md',
  privacidad: 'D5-politica-de-privacidad.md',
}

describe('estado del boton de pago', () => {
  it('sin marcar: bloqueado y con mensaje claro (AC-2)', () => {
    const e = A.estadoPago(false)
    expect(e.bloqueado).toBe(true)
    expect(e.mensaje).toMatch(/acepta/)
  })

  it('marcado: habilitado y sin mensaje', () => {
    expect(A.estadoPago(true)).toEqual({ bloqueado: false, mensaje: '' })
  })

  it('un valor no booleano (undefined, "true", 1) no cuenta como aceptado', () => {
    ;[undefined, null, 'true', 1, {}].forEach(v => {
      expect(A.estaAceptado(v)).toBe(false)
      expect(A.estadoPago(v).bloqueado).toBe(true)
    })
  })
})

describe('registro de la aceptacion', () => {
  const AHORA = new Date('2026-11-18T15:30:00.000Z')

  it('trae solo version y fecha (constitucion #6)', () => {
    const r = A.construirRegistro(AHORA)
    expect(r.appId).toBe('repuestox-tyc')
    expect(Object.keys(r.campos).sort()).toEqual(['aceptadoEn', 'version'])
    expect(r.campos.aceptadoEn).toBe('2026-11-18T15:30:00.000Z')
    expect(r.campos.version).toBe(A.versionVigente())
  })

  it('genera una peticion PUT por campo hacia la API publica del checkout', () => {
    const p = A.peticionesDeRegistro('abc123', AHORA)
    expect(p.map(x => x.ruta).sort()).toEqual([
      '/api/checkout/pub/orderForm/abc123/customData/repuestox-tyc/aceptadoEn',
      '/api/checkout/pub/orderForm/abc123/customData/repuestox-tyc/version',
    ])
    p.forEach(x => expect(Object.keys(x.cuerpo)).toEqual(['value']))
  })

  it('escapa el id del orderForm', () => {
    expect(A.rutaCustomData('a/b', 'version')).toMatch(/orderForm\/a%2Fb\/customData/)
  })
})

describe('version vigente', () => {
  it('una aceptacion con la version actual es vigente', () => {
    const cd = { customApps: [{ id: 'repuestox-tyc', fields: { version: A.versionVigente(), aceptadoEn: '2026-11-18T00:00:00.000Z' } }] }
    expect(A.registroVigente(cd)).toBe(true)
  })

  it('una version distinta obliga a aceptar de nuevo (AC-4)', () => {
    const cd = { customApps: [{ id: 'repuestox-tyc', fields: { version: 'tyc=2026.01.01', aceptadoEn: '2026-01-01T00:00:00.000Z' } }] }
    expect(A.registroVigente(cd)).toBe(false)
  })

  it('sin registro, sin fecha o sin customData no es vigente', () => {
    expect(A.registroVigente(null)).toBe(false)
    expect(A.registroVigente({})).toBe(false)
    expect(A.registroVigente({ customApps: [{ id: 'otra-app', fields: {} }] })).toBe(false)
    expect(A.registroVigente({ customApps: [{ id: 'repuestox-tyc', fields: { version: A.versionVigente() } }] })).toBe(false)
  })
})

describe('coherencia con los textos publicados (AC-4)', () => {
  A.DOCUMENTOS.forEach(doc => {
    it('la version de ' + doc.id + ' coincide con la de su borrador', () => {
      const md = fs.readFileSync(path.join(BORRADORES, ARCHIVOS[doc.id]), 'utf8')
      const m = md.match(/Versi[oó]n\s+(\d{4}\.\d{2}\.\d{2})\s*·/)
      expect(m).not.toBeNull()
      expect(m[1]).toBe(doc.version)
    })
  })

  it('los enlaces del checkbox apuntan a las rutas legales existentes', () => {
    const routes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../store/routes.json'), 'utf8'))
    const rutas = Object.keys(routes).map(k => routes[k].path)
    A.DOCUMENTOS.forEach(doc => expect(rutas).toContain(doc.ruta))
  })
})
