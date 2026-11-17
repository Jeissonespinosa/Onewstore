import { IOClients } from '@vtex/api'

// Solo los clientes de IOClients (masterdata, session, vbase). El correo ya no se lee de pedidos.
export class Clients extends IOClients {}
