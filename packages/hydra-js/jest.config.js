export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/*.test.js'],
  // Set up globals needed by jsdom
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Inject jest globals
  injectGlobals: true,
};
