import { IOClients } from '@vtex/api'
import { Orders } from './orders'

// Además de los clientes de IOClients (masterdata, session, vbase).
export class Clients extends IOClients {
  public get orders() {
    return this.getOrSet('orders', Orders)
  }
}
