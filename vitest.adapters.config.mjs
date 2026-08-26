// Vitest project for the adapter conformance suite.
//
// The contract suite drives adapters directly — no DOM, no Volto, no browser —
// so a failing assertion names the intent that broke rather than "something in
// the stack". Kept separate from vitest.config.mjs because that one loads
// Volto's jsdom setup files and the whole config registry, which is pure
// overhead here.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests-adapters/contract/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Targets bind fixed ports, so files must not race each other for them.
    fileParallelism: false,
  },
});
