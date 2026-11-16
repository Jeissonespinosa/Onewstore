import { Readable } from 'stream'
import { identity } from '../middlewares/identity'
import { purchase } from '../middlewares/purchase'
import { site } from '../middlewares/site'

const ORIGIN = 'https://devdiego--onewstore.myvtex.com'
const ORDER = '1234567890123-01'
const SECRET_EMAIL = 'persona.secreta@example.com'

interface Options {
  origin?: string | null
  body?: unknown
  rawBody?: string
  cookies?: Record<string, string>
  sessionEmail?: string
  existing?: unknown[]
  emptyDoc?: boolean
  mdFails?: boolean
  vbase?: Map<string, unknown>
}

function makeCtx(opts: Options = {}) {
  const raw = opts.rawBody ?? JSON.stringify(opts.body ?? {})
  const req: any = Readable.from([Buffer.from(raw)])
  req.headers = { 'content-type': 'application/json' }
  const store = opts.vbase ?? new Map<string, unknown>()
  const headers: Record<string, string> = {}
  const origin = opts.origin === undefined ? ORIGIN : opts.origin
  const cookies = opts.cookies ?? { vtex_session: 'abc' }

  const masterdata = {
    getDocument: jest.fn(async (_args: any) => {
      if (opts.mdFails) throw new Error('md down')
      if (opts.existing && opts.existing.length > 0) return opts.existing[0]
      // Master Data puede responder 404 o un objeto vacío para un id inexistente.
      if (opts.emptyDoc) return {}
      throw Object.assign(new Error('not found'), { response: { status: 404 } })
    }),
    createOrUpdateEntireDocument: jest.fn(async (_args: any) => ({ DocumentId: 'id-1' })),
    createDocument: jest.fn(async (_args: any) => {
      if (opts.mdFails) throw new Error('md down')
      return { DocumentId: 'id-1' }
    }),
  }
  const ctx: any = {
    req,
    status: 0,
    body: undefined,
    ip: '1.2.3.4',
    get: (name: string) => (name.toLowerCase() === 'origin' ? origin ?? '' : ''),
    set: (k: string, v: string) => {
      headers[k.toLowerCase()] = v
    },
    cookies: { get: (n: string) => cookies[n] },
    clients: {
      masterdata,
      vbase: {
        getJSON: jest.fn(async (_b: string, k: string) => store.get(k) ?? null),
        saveJSON: jest.fn(async (_b: string, k: string, v: unknown) => {
          store.set(k, v)
        }),
      },
      session: {
        getSession: jest.fn(async () => ({
          sessionData: {
            namespaces: {
              profile: opts.sessionEmail
                ? {
                    isAuthenticated: { value: 'true' },
                    email: { value: opts.sessionEmail },
                  }
                : { isAuthenticated: { value: 'false' } },
            },
          },
        })),
      },
    },
  }
  return { ctx, masterdata, headers, store }
}

const run = (fn: any, ctx: any) => fn(ctx, async () => undefined)
const json = (ctx: any) => JSON.stringify(ctx.body)

describe('seguridad común', () => {
  it.each([
    ['purchase', purchase, { orderId: ORDER, rating: 5 }],
    ['site', site, { type: 'problema', message: 'x', viewport: 'movil' }],
    ['identity', identity, {}],
  ])('%s: origen ajeno o ausente se rechaza con 403 y no guarda', async (_n, fn, body) => {
    for (const origin of ['https://evil.example', null]) {
      const { ctx, masterdata } = makeCtx({ origin, body })
      await run(fn, ctx)
      expect(ctx.status).toBe(403)
      expect(masterdata.createDocument).not.toHaveBeenCalled()
    }
  })

  it('todas las respuestas llevan Cache-Control no-store', async () => {
    const { ctx, headers } = makeCtx({ body: { orderId: ORDER, rating: 5 } })
    await run(purchase, ctx)
    expect(headers['cache-control']).toContain('no-store')
  })

  it('un cuerpo que no es JSON da 400', async () => {
    const { ctx } = makeCtx({ rawBody: 'esto no es json' })
    await run(site, ctx)
    expect(ctx.status).toBe(400)
    expect(ctx.body.code).toBe('bad-json')
  })

  it('AC-13: un envío con el campo trampa lleno se descarta sin guardar', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { type: 'problema', message: 'x', viewport: 'movil', website: 'http://spam' },
    })
    await run(site, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument).not.toHaveBeenCalled()
  })

  it('si el contador de envíos falla, el envío no se pierde y queda un aviso en los logs', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { ctx, masterdata } = makeCtx({
      body: { type: 'problema', message: 'x', viewport: 'movil' },
    })
    ctx.clients.vbase.saveJSON = jest.fn(async () => {
      throw new Error('403 sin politica')
    })
    await run(site, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('AC-13: tras 5 envíos desde la misma sesión/IP el sexto recibe 429', async () => {
    const vbase = new Map<string, unknown>()
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const { ctx } = makeCtx({
        vbase,
        body: { type: 'problema', message: `m${i}`, viewport: 'movil' },
      })
      await run(site, ctx)
      statuses.push(ctx.status)
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
  })
})

describe('POST purchase', () => {
  it('guarda la calificación con el correo que la persona escribió, sin devolverlo', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { orderId: ORDER, rating: 2, comment: 'Tardó', reason: 'envio', email: SECRET_EMAIL },
      sessionEmail: 'cuenta@example.com',
    })
    await run(purchase, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createOrUpdateEntireDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ORDER,
        fields: {
          orderId: ORDER,
          rating: 2,
          comment: 'Tardó',
          reason: 'envio',
          email: SECRET_EMAIL,
        },
      })
    )
    expect(json(ctx)).not.toContain('secreta')
  })

  it('un correo mal escrito da 400 y no guarda', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 4, email: 'x@y' } })
    await run(purchase, ctx)
    expect(ctx.status).toBe(400)
    expect(ctx.body.code).toBe('bad-email')
    expect(masterdata.createOrUpdateEntireDocument).not.toHaveBeenCalled()
  })


  it('AC-4: un segundo envío para el mismo pedido da 409 y no guarda', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { orderId: ORDER, rating: 5 },
      existing: [{ id: 'ya-existe' }],
    })
    await run(purchase, ctx)
    expect(ctx.status).toBe(409)
    expect(ctx.body.code).toBe('already-rated')
    expect(masterdata.createOrUpdateEntireDocument).not.toHaveBeenCalled()
  })

  it('un id inexistente que Master Data responde como objeto vacío NO cuenta como ya calificado', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 4 }, emptyDoc: true })
    await run(purchase, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createOrUpdateEntireDocument).toHaveBeenCalledTimes(1)
  })

  it('sin correo escrito guarda igual, con el correo vacío', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 4 } })
    await run(purchase, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createOrUpdateEntireDocument.mock.calls[0][0].fields.email).toBe('')
  })


  it('un cuerpo inválido da 400 con un código y no toca Master Data', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 9 } })
    await run(purchase, ctx)
    expect(ctx.status).toBe(400)
    expect(ctx.body.code).toBe('bad-rating')
    expect(masterdata.getDocument).not.toHaveBeenCalled()
  })

  it('si Master Data falla responde 502 con un código y sin detalles internos', async () => {
    const { ctx } = makeCtx({ body: { orderId: ORDER, rating: 4 }, mdFails: true })
    await run(purchase, ctx)
    expect(ctx.status).toBe(502)
    expect(ctx.body).toEqual({ ok: false, code: 'unavailable' })
  })
})

describe('POST site', () => {
  const body = { type: 'sugerencia', message: 'Más filtros', viewport: 'escritorio', pageUrl: '/carros' }

  it('RF-8b: se guarda el correo que la persona escribió, tal cual', async () => {
    const { ctx, masterdata } = makeCtx({ body: { ...body, email: 'quien@example.com' } })
    await run(site, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument.mock.calls[0][0].fields).toEqual({
      type: 'sugerencia',
      message: 'Más filtros',
      email: 'quien@example.com',
      pageUrl: '/carros',
      viewport: 'escritorio',
    })
  })

  it('RF-8b: con sesión NO se sustituye lo escrito por el correo de la cuenta', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { ...body, email: 'otro@example.com' },
      sessionEmail: 'cuenta@example.com',
    })
    await run(site, ctx)
    expect(masterdata.createDocument.mock.calls[0][0].fields.email).toBe('otro@example.com')
  })

  it('RF-8b: sin correo escrito se guarda vacío, aunque haya sesión', async () => {
    const { ctx, masterdata } = makeCtx({ body, sessionEmail: 'cuenta@example.com' })
    await run(site, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument.mock.calls[0][0].fields.email).toBe('')
  })

  it('AC-8: un correo mal escrito da 400 y no guarda', async () => {
    const { ctx, masterdata } = makeCtx({ body: { ...body, email: 'no-es-correo' } })
    await run(site, ctx)
    expect(ctx.status).toBe(400)
    expect(ctx.body.code).toBe('bad-email')
    expect(masterdata.createDocument).not.toHaveBeenCalled()
  })


  it('AC-10: un mensaje con HTML se guarda tal cual, como texto', async () => {
    const { ctx, masterdata } = makeCtx({ body: { ...body, message: '<script>alert(1)</script>' } })
    await run(site, ctx)
    expect(masterdata.createDocument.mock.calls[0][0].fields.message).toBe('<script>alert(1)</script>')
  })
})

describe('POST identity', () => {
  it('con sesión devuelve el correo de la cuenta (solo para precargar el formulario)', async () => {
    const { ctx } = makeCtx({ body: {}, sessionEmail: SECRET_EMAIL })
    await run(identity, ctx)
    expect(ctx.body).toEqual({ ok: true, authenticated: true, email: SECRET_EMAIL })
  })

  it('anónimo: sin correo', async () => {
    const { ctx } = makeCtx({ body: {} })
    await run(identity, ctx)
    expect(ctx.body).toEqual({ ok: true, authenticated: false, email: null })
  })

  it('sin cookie de sesión: anónimo y sin consultar a Session', async () => {
    const { ctx } = makeCtx({ body: {}, cookies: {}, sessionEmail: SECRET_EMAIL })
    await run(identity, ctx)
    expect(ctx.body.authenticated).toBe(false)
    expect(ctx.body.email).toBe(null)
  })

  it('origen ajeno: 403 y no devuelve el correo', async () => {
    const { ctx } = makeCtx({ body: {}, sessionEmail: SECRET_EMAIL, origin: 'https://evil.example' })
    await run(identity, ctx)
    expect(ctx.status).toBe(403)
    expect(JSON.stringify(ctx.body)).not.toContain('secreta')
  })
})
