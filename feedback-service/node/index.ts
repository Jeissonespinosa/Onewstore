import { Service, method } from '@vtex/api'
import { Clients } from './clients'
import { identity } from './middlewares/identity'
import { purchase } from './middlewares/purchase'
import { site } from './middlewares/site'

export default new Service({
  clients: {
    implementation: Clients,
    // El proxy corta a los 10 s (504, que el navegador no puede interpretar): se responde antes con un
    // error controlado. El contador de envíos es secundario: si VBase tarda, se sigue sin él.
    options: {
      default: { retries: 1, timeout: 6000 },
      vbase: { retries: 0, timeout: 2000 },
    },
  },
  routes: {
    feedbackPurchase: method({ POST: [purchase] }),
    feedbackSite: method({ POST: [site] }),
    feedbackIdentity: method({ POST: [identity] }),
  },
})
