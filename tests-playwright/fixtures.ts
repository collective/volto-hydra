/**
 * Playwright test fixtures with code coverage support.
 *
 * All test files should import `test` and `expect` from this file instead of
 * directly from @playwright/test. This enables automatic code coverage collection
 * during test execution.
 *
 * Usage in test files:
 *   import { test, expect } from '../fixtures';
 *   // or
 *   import { test, expect } from '../../fixtures';
 */

import { test as coverageTest, expect } from '@bgotink/playwright-coverage';

// Extend test to capture console logs from page and iframe
const test = coverageTest.extend({
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
