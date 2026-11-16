import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'

// Lectura del correo de un pedido en OMS. SIN VERIFICAR (tarea 1.2 del spike (f)): hace falta un
// pedido real para confirmar la ruta, el identificador (`<orderGroup>-01`) y la política de acceso.
// Mientras no se verifique, cualquier fallo devuelve null y el servicio sigue funcionando.
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
    } catch {
      return null
    }
  }
}
