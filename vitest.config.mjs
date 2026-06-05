// Vitest config for the volto-hydra addon's unit tests.
//
// Why vitest, not jest? Volto 19 itself migrated to vitest for its own
// tests; the legacy razzle-jest path is unmaintained (razzle's
// createJestConfig was written for Jest 26 and breaks under Jest 30 with
// a chain of version-mismatched deep deps: jest-environment-jsdom@26
// vs @jest/transform@30, babel-jest@26 vs @jest/transform@30, etc.).
// Aligning all of them via pnpm.overrides would be brittle. Vitest is the
// supported direction; using it here lets us share Volto's catalog
// version pin and skip the legacy ecosystem entirely.
//
// hydra-js stays on its own jest setup (it has ESM-specific needs);
// this config only covers volto-hydra's addon tests.
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve @plone/* imports to their workspace source directories. Razzle's
// webpack does this implicitly via the customization-paths machinery, but
// vite needs explicit aliases for subpath imports like
// `@plone/volto-slate/utils` because the workspace packages don't declare
// an `exports` map.
const ploneAliases = {
  '@plone/volto-slate': path.resolve(__dirname, 'core/packages/volto-slate/src'),
  '@plone/volto': path.resolve(__dirname, 'core/packages/volto/src'),
  '@plone/components': path.resolve(__dirname, 'core/packages/components/src'),
  '@plone/registry': path.resolve(__dirname, 'core/packages/registry/src'),
};

export default defineConfig({
  resolve: {
    alias: ploneAliases,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['packages/volto-hydra/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // hydra-js has its own jest harness; covered by `cd packages/hydra-js && pnpm test` in CI.
    exclude: ['**/node_modules/**', 'packages/hydra-js/**'],
    // Reuse Volto's setup files via the workspace. These initialise the
    // shared config registry (settings.slate.extensions etc.) and DOM
    // shims (matchMedia, IntersectionObserver) so tests don't have to
    // bootstrap Volto themselves.
    setupFiles: [
      path.resolve(__dirname, 'core/packages/volto/test-setup-globals.js'),
      path.resolve(__dirname, 'core/packages/volto/test-setup-config.jsx'),
      // Hydra-specific: invoke volto-slate's applyConfig so the slate
      // plugin chain (Markdown etc.) populates settings.slate.extensions.
      // Volto's setup files initialise the bare config registry but don't
      // invoke addon applyConfig chains.
      path.resolve(__dirname, 'vitest-setup-hydra.js'),
    ],
  },
});
