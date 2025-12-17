import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

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
  reporter: [['html', { open: 'never' }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3001',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording - disabled by default to save CPU. Enable with VIDEO=1 */
    video: process.env.VIDEO ? 'retain-on-failure' : 'off',
  },

  /* Configure projects for different frontends */
  projects: [
    // Mock frontend (default) - tests run against mock HTML frontend on port 8888
    {
      name: 'mock',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/, // Skip nuxt-specific tests
      ],
    },
    // Nuxt frontend - tests run against Nuxt frontend on port 3003
    {
      name: 'nuxt',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        // Pre-set iframe_url cookie to use Nuxt frontend
        storageState: 'tests-playwright/fixtures/storage-nuxt.json',
      },
      testIgnore: [
        /nuxt-.*\.spec\.ts/, // Skip nuxt-specific tests (they set their own cookie)
        /container-.*\.spec\.ts/, // Skip container tests (not yet supported in Nuxt)
        /multifield.*\.spec\.ts/, // Skip multifield tests (hero block not in Nuxt)
        /unit\/.*\.spec\.ts/, // Unit tests don't need to run per-frontend
      ],
    },
    // Nuxt-specific tests (nuxt-*.spec.ts) - set their own iframe_url cookie
    {
      name: 'nuxt-specific',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      testMatch: /nuxt-.*\.spec\.ts/, // Only run nuxt-specific tests
    },

    // Uncomment to test on Firefox and WebKit
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Start mock API server and Volto dev server before running tests */
  /* In CI, servers are started in advance by the workflow - Playwright just reuses them */
  webServer: [
    {
      // Mock Plone API server - must start BEFORE Volto
      name: 'Mock API + Frontend',
      command: `node ${path.join(__dirname, 'tests-playwright/fixtures/mock-api-server.js')}`,
      url: 'http://localhost:8888/health',
      timeout: 50 * 1000,
      reuseExistingServer: true, // Always reuse if running - CI starts in advance, local dev starts manually
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '8888',
      },
    },
    // Use prebuilt production server in CI, dev server locally
    process.env.USE_PREBUILT
      ? {
          // Production server (prebuilt in CI) - starts immediately, no webpack compilation
          name: 'Volto Admin UI (Production)',
          command:
            'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 VOLTOCONFIG=$(pwd)/volto.config.js pnpm --filter @plone/volto start:prod',
          url: 'http://localhost:3001', // Health check on SSR server directly
          timeout: 30 * 1000, // 30 seconds should be plenty for starting prebuilt server
          reuseExistingServer: true, // CI starts server in advance
          cwd: process.cwd(),
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            NODE_ENV: 'production',
            PORT: '3001',
            RAZZLE_API_PATH: 'http://localhost:8888',
            // Both mock frontend (8888) and Nuxt frontend (3003) available for switching
            RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888,http://localhost:3003',
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
          // NOTE: Skips build:deps to avoid parcel segfault in non-interactive shell
          // Dependencies must be built manually once with: pnpm build:deps
          name: 'Volto Admin UI (Dev)',
          command:
            'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 VOLTOCONFIG=$(pwd)/volto.config.js pnpm --filter @plone/volto start',
          url: 'http://localhost:3002/health', // Health check on webpack-dev-server (returns 200 when ready)
          timeout: 300 * 1000, // 5 minutes for initial webpack compilation
          reuseExistingServer: true, // Always reuse - local dev starts manually
          cwd: process.cwd(),
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            PORT: '3001',
            RAZZLE_API_PATH: 'http://localhost:8888',
            // Both mock frontend (8888) and Nuxt frontend (3003) available for switching
            RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888,http://localhost:3003',
            VOLTOCONFIG: process.cwd() + '/volto.config.js',
            // Prevent parcel from trying to access TTY (fixes segfault in background process)
            CI: process.env.CI || 'true',
          },
        },
    // Nuxt frontend for testing Nuxt-specific scenarios
    {
      name: 'Nuxt Frontend (Test)',
      command: 'npm run dev:test',
      url: 'http://localhost:3003',
      timeout: 120 * 1000, // 2 minutes for Nuxt compilation
      reuseExistingServer: true, // CI starts server in advance, local dev starts manually
      cwd: path.join(process.cwd(), 'examples/nuxt-blog-starter'),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
