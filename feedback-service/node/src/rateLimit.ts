import { createHash } from 'crypto'

// Límite de envíos por sesión/IP (AC-13). Ventana fija con un contador guardado en VBase.
// No es atómico: dos envíos simultáneos podrían pasar. Se acepta (plan, decisión 8): es una
// mitigación contra el abuso, no una garantía.

export const RATE_LIMIT = 5
export const RATE_WINDOW_MS = 10 * 60 * 1000

export interface Counter {
  count: number
  start: number
}

export interface CounterStore {
  get(key: string): Promise<Counter | null>
  set(key: string, value: Counter): Promise<void>
}

// Clave opaca: no se guarda la IP ni la sesión en claro.
export function rateKey(kind: string, ip: string, session: string): string {
  return createHash('sha256').update(`${kind}|${ip}|${session}`).digest('hex').slice(0, 32)
}

// Devuelve true si el envío se permite (y lo cuenta) y false si superó el límite.
export async function allow(
  store: CounterStore,
  key: string,
  now: number,
  limit: number = RATE_LIMIT,
  windowMs: number = RATE_WINDOW_MS
): Promise<boolean> {
  const current = await store.get(key)
  if (!current || now - current.start >= windowMs) {
    await store.set(key, { count: 1, start: now })
    return true
  }
  if (current.count >= limit) return false
  await store.set(key, { count: current.count + 1, start: current.start })
  return true
}
