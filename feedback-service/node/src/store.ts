import { CounterStore, Counter } from './rateLimit'

const BUCKET = 'rate-limit'

// Contador en VBase. Los registros de abuso caducan solos al empezar una ventana nueva.
export function vbaseCounterStore(vbase: any): CounterStore {
  return {
    async get(key: string): Promise<Counter | null> {
      try {
        return (await vbase.getJSON(BUCKET, key, true)) ?? null
      } catch {
        return null
      }
    },
    async set(key: string, value: Counter): Promise<void> {
      await vbase.saveJSON(BUCKET, key, value)
    },
  }
}
