import { json } from 'co-body'
import { originAllowed } from './common'

// Entidad creada por el builder masterdata: {vendor}_{appName}_{entidad}, con los guiones del
// nombre de la app convertidos en guiones bajos (confirmado en el log de `vtex link`, 2026-11-15).
const ENTITY = 'onewstore_feedback_service_spiketest'

export async function spikeWrite(ctx: any, next: () => Promise<any>) {
  if (!originAllowed(ctx)) {
    ctx.status = 403
    ctx.body = { error: 'origin' }
    return
  }
  const body = await json(ctx.req)
  const note = String(body?.note ?? '').slice(0, 200)
  if (!note) {
    ctx.status = 400
    ctx.body = { error: 'note' }
    return
  }
  try {
    const res = await ctx.clients.masterdata.createDocument({
      dataEntity: ENTITY,
      fields: { note, kind: 'a' },
    })
    ctx.status = 200
    ctx.body = { ok: true, id: res.DocumentId }
  } catch (e: any) {
    ctx.status = 502
    ctx.body = { error: 'masterdata', status: e?.response?.status, data: e?.response?.data }
  }
  await next()
}
