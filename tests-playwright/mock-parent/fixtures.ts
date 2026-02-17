/**
 * Shared fixtures for mock parent tests.
 *
 * Provides a `helper` fixture that navigates to mock-parent.html with the
 * correct frontend (mock or Nuxt) based on the project, waits for the iframe,
 * and selects the first block.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *   test('my test', async ({ helper, page }) => { ... });
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const test = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    const frontend = testInfo.project.name === 'nuxt' ? '?frontend=http://localhost:3003' : '';
    await page.goto(`http://localhost:8888/mock-parent.html${frontend}`);
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
    await use(helper);
  },
});

export { test, expect };
