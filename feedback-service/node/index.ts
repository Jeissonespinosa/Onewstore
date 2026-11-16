import { Service, method } from '@vtex/api'
import { Clients } from './clients'
import { identity } from './middlewares/identity'
import { purchase } from './middlewares/purchase'
import { site } from './middlewares/site'

export default new Service({
  clients: {
    implementation: Clients,
    options: { default: { retries: 1, timeout: 10000 } },
  },
  routes: {
    feedbackPurchase: method({ POST: [purchase] }),
    feedbackSite: method({ POST: [site] }),
    feedbackIdentity: method({ POST: [identity] }),
  },
})
