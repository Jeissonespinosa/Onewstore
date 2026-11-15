/*
 * Mock de los CSS Modules (react/*.css): cada clase se devuelve con su propio nombre.
 * `__esModule` queda en false para que `import styles from './x.css'` reciba el proxy.
 */
module.exports = new Proxy(
  {},
  { get: (_, key) => (key === '__esModule' ? false : String(key)) }
)
