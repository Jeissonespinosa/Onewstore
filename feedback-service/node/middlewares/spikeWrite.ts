import { json } from 'co-body'
import { originAllowed } from './common'

// El builder masterdata falla en builder-hub ("Schema creation ... failed. undefined"), así que la
// entidad se crea a mano con la API de Master Data (ver README de feedback-service). Spike: usa el
// esquema que se creó con ese PUT.
const ENTITY = 'onewstore_feedback_service_spiketest'
const SCHEMA = '0.0.1-devdiego'

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
      schema: SCHEMA,
    })
    ctx.status = 200
    ctx.body = { ok: true, id: res.DocumentId }
  } catch (e: any) {
    ctx.status = 502
    ctx.body = { error: 'masterdata', status: e?.response?.status, data: e?.response?.data }
  }
  await next()
}
