import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'

// Lectura del correo de un pedido en OMS (tarea 1.2 f). Necesita la política OMSViewer y salida a
// `<cuenta>.vtexcommercestable.com.br`. Cualquier fallo devuelve null y el servicio sigue
// funcionando, pero deja en el log el código HTTP (nunca el correo ni el número de pedido).
export class Orders extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://${context.account}.vtexcommercestable.com.br`, context, {
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        VtexIdclientAutCookie: context.authToken,
      },
    })
  }

  public async getEmail(orderId: string): Promise<string | null> {
    const id = /-\d+$/.test(orderId) ? orderId : `${orderId}-01`
    try {
      const order = await this.http.get(`/api/oms/pvt/orders/${encodeURIComponent(id)}`, {
        metric: 'orders-get-email',
      })
      const email = order?.clientProfileData?.email
      return typeof email === 'string' && email ? email : null
    } catch (e: any) {
      console.error('feedback: no se pudo leer el pedido en OMS', e?.response?.status ?? e?.code ?? e?.message)
      return null
    }
  }
}
