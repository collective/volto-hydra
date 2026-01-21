/**
 * Playwright test fixtures with optional code coverage support.
 *
 * All test files should import `test` and `expect` from this file instead of
 * directly from @playwright/test.
 *
 * Coverage is only enabled when COVERAGE=1 (set in CI). Locally, tests run
 * without coverage collection overhead (~90MB per test).
 *
 * Usage in test files:
 *   import { test, expect } from '../fixtures';
 *   // or
 *   import { test, expect } from '../../fixtures';
 */

import { test as playwrightTest, expect } from '@playwright/test';

// Only use coverage test fixture when COVERAGE is enabled (CI)
// This prevents ~90MB of V8 coverage data per test locally
const baseTest = process.env.COVERAGE
  ? require('@bgotink/playwright-coverage').test
  : playwrightTest;

// Extend test to capture console logs from page and iframe
const test = baseTest.extend({
  page: async ({ page }, use) => {
    // Capture main page console logs
    page.on('console', (msg) => {
      console.log(`[log] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      console.log(`[BROWSER PAGE ERROR] ${error.message}`);
    });

    await use(page);
  },
});

export { test, expect };
