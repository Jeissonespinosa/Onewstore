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
  orderEmail?: string | null
  existing?: unknown[]
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
    searchDocuments: jest.fn(async (_args: any) => {
      if (opts.mdFails) throw new Error('md down')
      return opts.existing ?? []
    }),
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
      orders: { getEmail: jest.fn(async () => opts.orderEmail ?? null) },
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
  it('guarda la calificación con el correo del pedido, sin devolverlo', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { orderId: ORDER, rating: 2, comment: 'Tardó', reason: 'envio' },
      orderEmail: SECRET_EMAIL,
    })
    await run(purchase, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
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

  it('AC-4: un segundo envío para el mismo pedido da 409 y no guarda', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { orderId: ORDER, rating: 5 },
      existing: [{ id: 'ya-existe' }],
    })
    await run(purchase, ctx)
    expect(ctx.status).toBe(409)
    expect(ctx.body.code).toBe('already-rated')
    expect(masterdata.createDocument).not.toHaveBeenCalled()
  })

  it('si no se puede leer el correo del pedido, guarda igual sin correo', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 4 }, orderEmail: null })
    await run(purchase, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument.mock.calls[0][0].fields.email).toBe('')
  })

  it('un cuerpo inválido da 400 con un código y no toca Master Data', async () => {
    const { ctx, masterdata } = makeCtx({ body: { orderId: ORDER, rating: 9 } })
    await run(purchase, ctx)
    expect(ctx.status).toBe(400)
    expect(ctx.body.code).toBe('bad-rating')
    expect(masterdata.searchDocuments).not.toHaveBeenCalled()
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

  it('RF-8b caso 1: con sesión usa el correo de la cuenta aunque el navegador mande otro', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { ...body, email: 'otro@example.com' },
      sessionEmail: SECRET_EMAIL,
    })
    await run(site, ctx)
    expect(ctx.status).toBe(200)
    expect(masterdata.createDocument.mock.calls[0][0].fields).toEqual({
      type: 'sugerencia',
      message: 'Más filtros',
      email: SECRET_EMAIL,
      pageUrl: '/carros',
      viewport: 'escritorio',
    })
    expect(json(ctx)).not.toContain('secreta')
  })

  it('RF-8b caso 2: sin sesión y con pedido usa el correo del pedido', async () => {
    const { ctx, masterdata } = makeCtx({
      body: { ...body, orderId: ORDER },
      orderEmail: SECRET_EMAIL,
    })
    await run(site, ctx)
    expect(masterdata.createDocument.mock.calls[0][0].fields.email).toBe(SECRET_EMAIL)
  })

  it('RF-8b caso 3: anónimo escribe su correo (o lo deja vacío) y el envío funciona', async () => {
    const withEmail = makeCtx({ body: { ...body, email: 'yo@example.com' } })
    await run(site, withEmail.ctx)
    expect(withEmail.masterdata.createDocument.mock.calls[0][0].fields.email).toBe('yo@example.com')

    const without = makeCtx({ body })
    await run(site, without.ctx)
    expect(without.ctx.status).toBe(200)
    expect(without.masterdata.createDocument.mock.calls[0][0].fields.email).toBe('')
  })

  it('AC-10: un mensaje con HTML se guarda tal cual, como texto', async () => {
    const { ctx, masterdata } = makeCtx({ body: { ...body, message: '<script>alert(1)</script>' } })
    await run(site, ctx)
    expect(masterdata.createDocument.mock.calls[0][0].fields.message).toBe('<script>alert(1)</script>')
  })
})

describe('POST identity', () => {
  it('con sesión devuelve solo el correo enmascarado', async () => {
    const { ctx } = makeCtx({ body: {}, sessionEmail: SECRET_EMAIL })
    await run(identity, ctx)
    expect(ctx.body).toEqual({
      ok: true,
      authenticated: true,
      source: 'account',
      maskedEmail: 'p***@example.com',
    })
    expect(json(ctx)).not.toContain('secreta')
  })

  it('con pedido y sin sesión devuelve el correo del pedido enmascarado', async () => {
    const { ctx } = makeCtx({ body: { orderId: ORDER }, orderEmail: SECRET_EMAIL })
    await run(identity, ctx)
    expect(ctx.body.source).toBe('order')
    expect(ctx.body.maskedEmail).toBe('p***@example.com')
  })

  it('anónimo sin pedido: sin correo', async () => {
    const { ctx } = makeCtx({ body: {} })
    await run(identity, ctx)
    expect(ctx.body).toEqual({ ok: true, authenticated: false, source: null, maskedEmail: null })
  })

  it('ignora un número de pedido con formato inválido', async () => {
    const { ctx } = makeCtx({ body: { orderId: "x' OR 1=1" }, orderEmail: SECRET_EMAIL })
    await run(identity, ctx)
    expect(ctx.body.source).toBe(null)
  })
})
