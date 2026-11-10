/*
 * Mock de react-apollo.useQuery.
 * `__setFacets(fn)` recibe una funcion (variables) => facets[] o un array fijo.
 * `__calls()` devuelve las variables de cada llamada (para inspeccionar selectedFacets).
 */
let resolver = () => []
const calls = []

function useQuery(_doc, options) {
  calls.push(options.variables)
  const facets = typeof resolver === 'function' ? resolver(options.variables) : resolver
  if (facets === undefined) return { data: undefined, loading: true }
  if (facets instanceof Error) return { data: undefined, loading: false, error: facets }
  return { data: { facets: { facets } }, loading: false }
}

function __setFacets(next) {
  resolver = next
}
function __calls() {
  return calls
}
function __reset() {
  resolver = () => []
  calls.length = 0
}

module.exports = { useQuery, __setFacets, __calls, __reset }
