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

export { test, expect } from '@bgotink/playwright-coverage';
