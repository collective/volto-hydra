/**
 * Central source of truth for test infrastructure ports.
 *
 * Every test, helper, and playwright config should import from here
 * instead of hard-coding `localhost:NNNN`. Each port has a sensible
 * default (matching the historical hard-coded values) and an env-var
 * override so parallel test runs, different CI shards, or local dev
 * environments with port conflicts can rebind without code changes.
 *
 * Override pattern: set HYDRA_<NAME>_PORT in the environment.
 *   HYDRA_MOCK_API_PORT=18888 pnpm test:e2e
 *
 * Keep the keys here aligned with package.json's start:* scripts and
 * the build job's "Start servers" step in .github/workflows/test.yaml.
 *
 * Not in scope: URLs embedded as DATA inside fixture JSON
 * (tests-playwright/fixtures/content/*\/data.json) — those are
 * historical site URLs in saved content, not infrastructure config.
 */

const port = (envName: string, def: number): number => {
  const v = process.env[envName];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${envName}: ${v} (must be a positive integer)`);
  }
  return n;
};

export const PORTS = {
  /** Mock Plone REST API (started by `pnpm start:mock-api`). */
  mockApi: port('HYDRA_MOCK_API_PORT', 8888),
  /** Test frontend: HTML + bridge fixture served by Vite (`pnpm start:test-frontend`). */
  testFrontend: port('HYDRA_TEST_FRONTEND_PORT', 8889),
  /** Mock-parent test surface for bridge isolation tests. */
  mockParent: port('HYDRA_MOCK_PARENT_PORT', 8891),
  /** Volto admin SSR server (`pnpm start:test`, PORT). */
  voltoSsr: port('HYDRA_VOLTO_SSR_PORT', 3001),
  /** Razzle webpack-dev-server (auto-incremented from voltoSsr). */
  voltoWebpack: port('HYDRA_VOLTO_WEBPACK_PORT', 3002),
  /** Nuxt example frontend (`pnpm start:nuxt:test`). */
  nuxt: port('HYDRA_NUXT_PORT', 3003),
  /** Doc-example: React (`pnpm start:react:test`). */
  reactDoc: port('HYDRA_REACT_DOC_PORT', 3004),
  /** Doc-example: Svelte (`pnpm start:svelte:test`). */
  svelteDoc: port('HYDRA_SVELTE_DOC_PORT', 3005),
  /** Doc-example: Vue (no dedicated start script; see docs/examples/test-vue). */
  vueDoc: port('HYDRA_VUE_DOC_PORT', 3006),
  /** Next.js example frontend. */
  nextjs: port('HYDRA_NEXTJS_PORT', 3007),
  /** Vue F7 example frontend (hash-routed). */
  f7: port('HYDRA_F7_PORT', 3008),
  /** Doc-example: Astro (SSR, Node adapter). */
  astroDoc: port('HYDRA_ASTRO_DOC_PORT', 3009),
} as const;

/**
 * Pre-built `http://localhost:N` strings for the common ports. Use these
 * instead of building URLs ad-hoc to keep the call sites short.
 *
 * Named `URLS` (plural) so it doesn't shadow the global `URL` constructor
 * in any file that does `import { URLS } from '../ports'` and also calls
 * `new URL(...)` (e.g. navigation.spec.ts parsing iframe `src` origins).
 */
export const URLS = {
  mockApi: `http://localhost:${PORTS.mockApi}`,
  testFrontend: `http://localhost:${PORTS.testFrontend}`,
  mockParent: `http://localhost:${PORTS.mockParent}`,
  voltoSsr: `http://localhost:${PORTS.voltoSsr}`,
  voltoWebpack: `http://localhost:${PORTS.voltoWebpack}`,
  nuxt: `http://localhost:${PORTS.nuxt}`,
  reactDoc: `http://localhost:${PORTS.reactDoc}`,
  svelteDoc: `http://localhost:${PORTS.svelteDoc}`,
  vueDoc: `http://localhost:${PORTS.vueDoc}`,
  nextjs: `http://localhost:${PORTS.nextjs}`,
  f7: `http://localhost:${PORTS.f7}`,
  astroDoc: `http://localhost:${PORTS.astroDoc}`,
} as const;
