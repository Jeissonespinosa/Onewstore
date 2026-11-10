/*
 * Mock de vtex.render-runtime para tests.
 * `__setRuntime({ route: { path }, navigate })` cambia lo que devuelve useRuntime().
 */
const state = { navigate: jest.fn(), route: { path: '/' } }

function useRuntime() {
  return { navigate: state.navigate, route: state.route }
}

function __setRuntime(next) {
  Object.assign(state, next)
}

function __reset() {
  state.navigate = jest.fn()
  state.route = { path: '/' }
}

module.exports = { useRuntime, __setRuntime, __reset }
