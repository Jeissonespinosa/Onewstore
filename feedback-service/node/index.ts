import { Service, method } from '@vtex/api'
import { Clients } from './clients'
import { spikeSession } from './middlewares/spikeSession'
import { spikeWrite } from './middlewares/spikeWrite'

export default new Service({
  clients: {
    implementation: Clients,
    options: { default: { retries: 1, timeout: 10000 } },
  },
  routes: {
    spikeWrite: method({ POST: [spikeWrite] }),
    spikeSession: method({ GET: [spikeSession] }),
  },
})
