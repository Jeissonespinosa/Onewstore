import { allow, Counter, CounterStore, rateKey } from '../src/rateLimit'

function memoryStore(): CounterStore {
  const data = new Map<string, Counter>()
  return {
    async get(k) {
      return data.get(k) ?? null
    },
    async set(k, v) {
      data.set(k, v)
    },
  }
}

describe('allow (AC-13)', () => {
  it('permite hasta el límite y rechaza el siguiente', async () => {
    const store = memoryStore()
    const results = []
    for (let i = 0; i < 7; i++) results.push(await allow(store, 'k', 1000 + i, 5, 600000))
    expect(results).toEqual([true, true, true, true, true, false, false])
  })

  it('al terminar la ventana el contador empieza de nuevo', async () => {
    const store = memoryStore()
    for (let i = 0; i < 5; i++) await allow(store, 'k', 1000, 5, 600000)
    expect(await allow(store, 'k', 1000, 5, 600000)).toBe(false)
    expect(await allow(store, 'k', 1000 + 600000, 5, 600000)).toBe(true)
  })

  it('cada clave tiene su propio contador', async () => {
    const store = memoryStore()
    for (let i = 0; i < 5; i++) await allow(store, 'a', 1000, 5, 600000)
    expect(await allow(store, 'a', 1000, 5, 600000)).toBe(false)
    expect(await allow(store, 'b', 1000, 5, 600000)).toBe(true)
  })
})

describe('rateKey', () => {
  it('es estable, opaca y distingue la ruta', () => {
    const a = rateKey('site', '1.2.3.4', 'sess')
    expect(a).toBe(rateKey('site', '1.2.3.4', 'sess'))
    expect(a).not.toBe(rateKey('purchase', '1.2.3.4', 'sess'))
    expect(a).not.toContain('1.2.3.4')
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })
})
