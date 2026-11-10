/*
 * Config de jest para react/VehicleSelector.js.
 *
 * Vive en react/__tests__/ (y no en react/) a proposito: .vtexignore excluye
 * react/__tests__/** y el builder react 3.x trata cualquier .js en la raiz
 * de react/ como entrypoint.
 *
 * Correr (desde la raiz del repo):
 *   1) con deps instaladas en react/ (jest, jest-environment-jsdom, babel-jest,
 *      @babel/core, @babel/preset-env, @babel/preset-react,
 *      @testing-library/react@12, react-dom@16.14):
 *        npx --prefix react jest -c react/__tests__/jest.config.js
 *   2) sin tocar react/node_modules: instalar esas deps en cualquier carpeta X y
 *        JEST_EXTRA_MODULES=X/node_modules X/node_modules/.bin/jest -c react/__tests__/jest.config.js
 */
const path = require('path')

const EXTRA = process.env.JEST_EXTRA_MODULES
const resolveFrom = name => (EXTRA ? path.join(EXTRA, name) : name)

const mapper = {
  '^vtex\\.render-runtime$': '<rootDir>/__tests__/__mocks__/vtex.render-runtime.js',
  '^vtex\\.css-handles$': '<rootDir>/__tests__/__mocks__/vtex.css-handles.js',
  '^react-apollo$': '<rootDir>/__tests__/__mocks__/react-apollo.js',
  '\\.gql$': '<rootDir>/__tests__/__mocks__/gql.js',
}
if (EXTRA) {
  // Una sola copia de React: el componente y react-dom deben usar la misma.
  mapper['^react$'] = path.join(EXTRA, 'react')
  mapper['^react-dom$'] = path.join(EXTRA, 'react-dom')
  mapper['^react-dom/(.*)$'] = path.join(EXTRA, 'react-dom/$1')
  mapper['^react/(.*)$'] = path.join(EXTRA, 'react/$1')
}

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  testEnvironment: resolveFrom('jest-environment-jsdom'),
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  moduleNameMapper: mapper,
  moduleDirectories: ['node_modules'].concat(EXTRA ? [EXTRA] : []),
  transform: {
    '^.+\\.jsx?$': [
      resolveFrom('babel-jest'),
      {
        presets: [
          [resolveFrom('@babel/preset-env'), { targets: { node: 'current' } }],
          [resolveFrom('@babel/preset-react'), { runtime: 'classic' }],
        ],
      },
    ],
  },
  resetMocks: false,
}
