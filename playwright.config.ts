import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Check which extra servers we need based on --project arg
const projectArgIndex = process.argv.indexOf('--project');
const projectArg = process.argv.find(arg => arg.startsWith('--project='))?.split('=')[1]
  || (projectArgIndex !== -1 ? process.argv[projectArgIndex + 1] : undefined);
const needsNuxt = !projectArg || projectArg.includes('nuxt');
const needsReact = !projectArg || projectArg.includes('react');
const needsSvelte = !projectArg || projectArg.includes('svelte');
const needsVue = !projectArg || projectArg.includes('vue');
// Example frontends — opt-in only (not started unless explicitly requested)
const needsNextjs = projectArg?.includes('nextjs');
const needsF7 = projectArg?.includes('f7');

// Only import coverage reporter when COVERAGE is enabled (CI)
// This prevents V8 coverage collection overhead locally
const coverageReporter = process.env.COVERAGE
  ? (() => {
      const { defineCoverageReporterConfig } = require('@bgotink/playwright-coverage');
      return [
        [
          '@bgotink/playwright-coverage',
          defineCoverageReporterConfig({
            sourceRoot: __dirname,
            exclude: [
              '**/node_modules/**',
              '**/tests-playwright/**',
              '**/core/**',
              '**/*.spec.ts',
              '**/examples/**',
            ],
            resultDir: path.join(__dirname, 'coverage'),
            reports: [
              ['html'],
              ['lcovonly', { file: 'lcov.info' }],
              ['text-summary', { file: null }],
            ],
          }),
        ] as const,
      ];
    })()
  : [];

/**
 * Playwright Test configuration for Volto Hydra tests.
 *
 * Tests the admin UI editing functionality with a mocked Plone backend.
 */
export default defineConfig({
  testDir: './tests-playwright',

  /* Global setup - verifies servers are healthy before running tests */
  globalSetup: require.resolve('./tests-playwright/global-setup.ts'),

  /* Maximum time one test can run for */
  timeout: 60 * 1000, // 60s - allow time for slower tests, server waits for compilation anyway

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? undefined : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    // Code coverage reporter - only enabled when COVERAGE=1 (CI)
    ...coverageReporter,
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3001',

    /* Trace recording - disabled by default to save space. Enable with TRACE=1 */
    trace: process.env.TRACE ? 'on-first-retry' : 'off',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording - disabled by default to save CPU. Enable with VIDEO=1 */
    video: process.env.VIDEO ? 'retain-on-failure' : 'off',
  },

  /* Configure projects for different test categories and frontends.
   *
   * Three test directories:
   *   unit/        — Pure unit tests, run once (no frontend needed)
   *   bridge/      — Mock-parent tests using hydra.js bridge protocol,
   *                  run on ALL frontends (mock, nuxt, react, svelte, vue)
   *   integration/ — Full Volto admin UI tests, run on mock + nuxt only
   */
  projects: [
    // --- Unit tests (run once) ---
    {
      name: 'unit',
      testDir: 'tests-playwright/unit',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },

    // --- Bridge tests — run on all frontends ---
    // Mock frontend (default, port 8888)
    {
      name: 'mock',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    // Nuxt frontend (port 3003)
    {
      name: 'nuxt',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-nuxt.json',
      },
    },
    // React Vite frontend (port 3004)
    {
      name: 'react',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-react.json',
      },
    },
    // Svelte Vite frontend (port 3005)
    {
      name: 'svelte',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-svelte.json',
      },
    },
    // Vue Vite frontend (port 3006)
    {
      name: 'vue',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-vue.json',
      },
    },

    // Example frontends for bridge tests — opt-in only
    {
      name: 'nextjs',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'f7',
      testDir: 'tests-playwright/bridge',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },

    // --- Admin integration tests — fully implemented frontends only ---
    // Mock frontend
    {
      name: 'admin-mock',
      testDir: 'tests-playwright/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/, // Skip nuxt-specific tests
      ],
    },
    // Nuxt frontend
    {
      name: 'admin-nuxt',
      testDir: 'tests-playwright/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-nuxt.json',
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/, // Skip nuxt-specific tests (they set their own cookie)
        /multifield.*\.spec\.ts/, // Skip multifield tests (hero block not in Nuxt)
      ],
    },
    // Nuxt-specific tests (nuxt-*.spec.ts) - set their own iframe_url cookie
    {
      name: 'nuxt-specific',
      testDir: 'tests-playwright/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testMatch: /nuxt-.*\.spec\.ts/,
    },

    // --- Example frontends — opt-in only (run with --project=admin-nextjs or --project=admin-f7) ---
    // Always defined so workers can find them; webServer entries below are conditional
    {
      name: 'admin-nextjs',
      testDir: 'tests-playwright/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-nextjs.json',
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/,
      ],
    },
    {
      name: 'admin-f7',
      testDir: 'tests-playwright/integration',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        storageState: 'tests-playwright/fixtures/storage-f7.json',
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/,
      ],
    },
  ],

  /* Start mock API server and Volto dev server before running tests */
  /* In CI, servers are started in advance by the workflow - Playwright just reuses them */
  webServer: [
    {
      // Mock Plone API server - must start BEFORE Volto
      // Uses --watch for auto-reload on code changes during development
      name: 'Mock API + Frontend',
      command: `node --watch --watch-path=tests-playwright/fixtures --watch-path=packages/hydra-js ${path.join(__dirname, 'tests-playwright/fixtures/mock-api-server.js')}`,
      url: 'http://localhost:8888/health',
      timeout: 50 * 1000,
      reuseExistingServer: true, // Always reuse if running - CI starts in advance, local dev starts manually
      cwd: process.cwd(),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
      env: {
        PORT: '8888',
        CONTENT_MOUNTS: '/:docs/content/content/content,/_test_data:tests-playwright/fixtures/content',
      },
    },
    // Use prebuilt production server in CI, dev server locally
    process.env.USE_PREBUILT
      ? {
          // Production server (prebuilt in CI) - starts immediately, no webpack compilation
          name: 'Volto Admin UI (Production)',
          command:
            'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 pnpm start:prod',
          url: 'http://localhost:3001', // Health check on SSR server directly
          timeout: 30 * 1000, // 30 seconds should be plenty for starting prebuilt server
          reuseExistingServer: true, // CI starts server in advance
          cwd: process.cwd(),
          stdout: 'pipe' as const,
          stderr: 'pipe' as const,
          env: {
            NODE_ENV: 'production',
            PORT: '3001',
            RAZZLE_API_PATH: 'http://localhost:8888',
            // Both mock frontend (8888) and Nuxt frontend (3003) available for switching
            RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006,http://localhost:3007,http://localhost:3008',
            VOLTOCONFIG: process.cwd() + '/volto.config.js',
          },
        }
      : {
          // Dev server with HMR - used locally for fast iteration
          // Volto creates TWO servers:
          // - PORT 3001: Razzle SSR server (set by PORT env var) - serves content, tests navigate here
          // - PORT 3002: webpack-dev-server (auto-incremented from PORT) - compiles assets, health check here
          // Tests navigate to port 3001 (SSR server for content)
          // Health check on port 3002 (webpack-dev-server) waits for compilation to complete
          name: 'Volto Admin UI (Dev)',
          command:
            'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 VOLTOCONFIG=$(pwd)/volto.config.js razzle start',
          url: 'http://localhost:3002/health', // Health check on webpack-dev-server (returns 200 when ready)
          timeout: 300 * 1000, // 5 minutes for initial webpack compilation
          reuseExistingServer: true, // Always reuse - local dev starts manually
          cwd: process.cwd(),
          stdout: 'pipe' as const,
          stderr: 'pipe' as const,
          env: {
            PORT: '3001',
            RAZZLE_API_PATH: 'http://localhost:8888',
            // Both mock frontend (8888) and Nuxt frontend (3003) available for switching
            RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006,http://localhost:3007,http://localhost:3008',
            VOLTOCONFIG: process.cwd() + '/volto.config.js',
            // Prevent parcel from trying to access TTY (fixes segfault in background process)
            CI: process.env.CI || 'true',
          },
        },
    // Nuxt frontend for testing Nuxt-specific scenarios (only started when running nuxt tests)
    ...(needsNuxt ? [{
      name: 'Nuxt Frontend (Test)',
      command: 'pnpm run dev:test',
      url: 'http://localhost:3003',
      timeout: 120 * 1000, // 2 minutes for Nuxt compilation
      reuseExistingServer: true, // CI starts server in advance, local dev starts manually
      cwd: path.join(process.cwd(), 'examples/nuxt-blog-starter'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
    }] : []),
    // React Vite frontend for doc example tests
    ...(needsReact ? [{
      name: 'React Frontend (Test)',
      command: 'npx vite --port 3004 --strictPort',
      url: 'http://localhost:3004',
      timeout: 30 * 1000,
      reuseExistingServer: true,
      cwd: path.join(process.cwd(), 'docs/blocks/test-react'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
    }] : []),
    // Svelte Vite frontend for doc example tests
    ...(needsSvelte ? [{
      name: 'Svelte Frontend (Test)',
      command: 'npx vite --port 3005 --strictPort',
      url: 'http://localhost:3005',
      timeout: 30 * 1000,
      reuseExistingServer: true,
      cwd: path.join(process.cwd(), 'docs/blocks/test-svelte'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
    }] : []),
    // Vue Vite frontend for doc example tests
    ...(needsVue ? [{
      name: 'Vue Frontend (Test)',
      command: 'npx vite --port 3006 --strictPort',
      url: 'http://localhost:3006',
      timeout: 30 * 1000,
      reuseExistingServer: true,
      cwd: path.join(process.cwd(), 'docs/blocks/test-vue'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
    }] : []),
    // Example frontends — opt-in only
    ...(needsNextjs ? [{
      name: 'Next.js Frontend (Test)',
      command: 'pnpm run dev:test',
      url: 'http://localhost:3007',
      timeout: 120 * 1000,
      reuseExistingServer: true,
      cwd: path.join(process.cwd(), 'examples/hydra-nextjs'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
      env: {
        NEXT_PUBLIC_BACKEND_BASE_URL: 'http://localhost:8888',
      },
    }] : []),
    ...(needsF7 ? [{
      name: 'Framework7 Frontend (Test)',
      command: 'cp ../../packages/hydra-js/hydra.js ./src/js/hydra.js && npx vite --port 3008 --strictPort --config vite.config.test.js',
      url: 'http://localhost:3008',
      timeout: 120 * 1000,
      reuseExistingServer: true,
      cwd: path.join(process.cwd(), 'examples/hydra-vue-f7'),
      stdout: 'pipe' as const,
      stderr: 'pipe' as const,
      env: {
        ...process.env,
        VITE_API_BASE_URL: 'http://localhost:8888',
      },
    }] : []),
  ],
});
