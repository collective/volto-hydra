import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test configuration for Volto Hydra tests.
 *
 * Tests the admin UI editing functionality with a mocked Plone backend.
 */
export default defineConfig({
  testDir: './tests-playwright',

  /* Global setup/teardown - starts mock API server before all tests */
  globalSetup: require.resolve('./tests-playwright/global-setup.ts'),
  globalTeardown: require.resolve('./tests-playwright/global-teardown.ts'),

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

  /* Run your local dev server before starting the tests */
  webServer: {
    // Volto admin UI on port 3001 with volto-hydra plugin
    // Frontend is served from the same server as the API (port 8888)
    // NOTE: Skips build:deps to avoid parcel segfault in non-interactive shell
    // Dependencies must be built manually once with: pnpm build:deps
    command: 'PORT=3001 RAZZLE_API_PATH=http://localhost:8888 RAZZLE_DEFAULT_IFRAME_URL=http://localhost:8888 VOLTOCONFIG=$(pwd)/volto.config.js pnpm --filter @plone/volto start',
    timeout: 300 * 1000, // 5 minutes for Volto's initial webpack compilation
    reuseExistingServer: true, // Always reuse - expect it to be running manually
    // Health check endpoint that returns 503 during compilation, 200 when ready
    // This polls until compilation completes before starting tests
    url: 'http://localhost:3001/health',
    env: {
      PORT: '3001',
      RAZZLE_API_PATH: 'http://localhost:8888',
      RAZZLE_DEFAULT_IFRAME_URL: 'http://localhost:8888',
      VOLTOCONFIG: process.cwd() + '/volto.config.js',
      // Prevent parcel from trying to access TTY (fixes segfault in background process)
      CI: 'true',
      NO_COLOR: '1',
    },
  },
});
