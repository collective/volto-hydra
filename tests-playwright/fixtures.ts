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
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Only use coverage test fixture when COVERAGE is enabled (CI)
// This prevents ~90MB of V8 coverage data per test locally
const baseTest = process.env.COVERAGE
  ? require('@bgotink/playwright-coverage').test
  : playwrightTest;

// Extend test to capture console logs from page and iframe
const test = baseTest.extend({
  page: async ({ page }, use, testInfo) => {
    // Session isolation is handled via auth tokens - each login generates a unique
    // token (based on timestamp) which the mock API uses as the session identifier.
    // Both admin (Volto) and Nuxt SSR include Authorization headers, so they share
    // the same session when using the same auth token.

    // Set run ID on admin page so parallel/repeated test logs can be filtered.
    // AdminUIHelper.navigateToEdit propagates this to the iframe.
    const runId = testInfo.workerIndex * 1000 + testInfo.repeatEachIndex;
    page.addInitScript((id) => {
      (window as any).__testRunId = id;
    }, runId);

    // Capture main page console logs
    page.on('console', (msg) => {
      console.log(`[log] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      console.log(`[BROWSER PAGE ERROR] ${error.message}`);
    });

    await use(page);

    // After the test, fail if hydra.js painted a diagnostic overlay inside
    // the preview iframe. Two overlays exist:
    //   #hydra-bridge-diagnostic — bridge never connected to the admin
    //   #hydra-dev-warning       — e.g. a Slate field with no data-node-id
    // Both mean the editor was broken during the test even if the test's
    // own assertions happened to pass. Only enforced when the test would
    // otherwise pass, so a real failure isn't masked by this check.
    if (testInfo.status === 'passed' && testInfo.expectedStatus === 'passed') {
      try {
        const iframeCount = await page.locator('#previewIframe').count();
        if (iframeCount > 0) {
          const overlays = await page
            .frameLocator('#previewIframe')
            .locator('#hydra-bridge-diagnostic, #hydra-dev-warning')
            .count();
          if (overlays > 0) {
            const text = await page
              .frameLocator('#previewIframe')
              .locator('#hydra-bridge-diagnostic, #hydra-dev-warning')
              .first()
              .innerText()
              .catch(() => '(overlay text unavailable)');
            throw new Error(
              `hydra.js diagnostic overlay appeared during this test — the ` +
                `editor was in a broken state. Overlay text:\n${text}`,
            );
          }
        }
      } catch (err) {
        // Re-throw our own assertion; swallow incidental teardown errors
        // (e.g. page already closed) so they don't mask a green test.
        if (err instanceof Error && err.message.includes('diagnostic overlay appeared')) {
          throw err;
        }
      }
    }
  },
});

export { test, expect };
