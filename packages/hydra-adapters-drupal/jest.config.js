// Mirrors packages/hydra-js/jest.config.js: native ESM, node env, no babel.
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/*.test.js'],
  injectGlobals: true,
};
