import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright Test configuration for Volto Hydra tests.
 *
 * Tests the admin UI editing functionality with a mocked Plone backend.
 */
export default defineConfig({
  testDir: './tests-playwright',

  /* Maximum time one test can run for */
  timeout: 30 * 1000, // 30s - with manual server management, tests should complete quickly

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3001',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
  webServer: [
    {
      // Mock Plone API server - must start BEFORE Volto
      name: 'Mock API + Frontend',
      command: `node ${path.join(__dirname, 'tests-playwright/fixtures/mock-api-server.js')}`,
      url: 'http://localhost:8888/health',
      timeout: 30 * 1000,
      reuseExistingServer: !process.env.CI,
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '8888',
      },
    },
    {
      // Volto creates TWO servers:
      // - PORT 3001: Razzle SSR server (set by PORT env var) - serves content, tests navigate here
      // - PORT 3002: webpack-dev-server (auto-incremented from PORT) - compiles assets, health check here
      // Tests navigate to port 3001 (SSR server for content)
      // Health check on port 3002 (webpack-dev-server) waits for compilation to complete
      // NOTE: Skips build:deps to avoid parcel segfault in non-interactive shell
      // Dependencies must be built manually once with: pnpm build:deps
      name: 'Volto Admin UI',
      command: 'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 VOLTOCONFIG=$(pwd)/volto.config.js pnpm --filter @plone/volto start',
      url: 'http://localhost:3002/health', // Health check on webpack-dev-server (returns 200 when ready)
      timeout: 300 * 1000, // 5 minutes for initial webpack compilation
      reuseExistingServer: !process.env.CI, // Reuse in local dev, start fresh in CI
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '3001',
        RAZZLE_API_PATH: 'http://localhost:8888',
        RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888',
        VOLTOCONFIG: process.cwd() + '/volto.config.js',
        // Prevent parcel from trying to access TTY (fixes segfault in background process)
        CI: process.env.CI || 'true',
      },
    },
  ],
});
