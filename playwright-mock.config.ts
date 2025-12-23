import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for mock parent tests (no Volto needed)
 * These tests only use the mock API server and test frontend
 */
export default defineConfig({
  testDir: './tests-playwright',
  testMatch: ['**/mock-parent/**/*.spec.ts', '**/unit/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? undefined : undefined,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Explicit viewport for consistent behavior between local and CI
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Only start the mock API server (no Volto)
  webServer: {
    command: 'node tests-playwright/fixtures/mock-api-server.js',
    url: 'http://localhost:8888/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
