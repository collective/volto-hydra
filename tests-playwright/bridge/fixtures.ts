/**
 * Shared fixtures for bridge tests.
 *
 * Provides a `helper` fixture that navigates to mock-parent.html with the
 * correct frontend based on the project name, waits for the iframe,
 * and selects the first block.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *   test('my test', async ({ helper, page }) => { ... });
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { URL } from '../ports';

/**
 * Map project names to frontend URLs.
 * The default (mock) uses the test frontend embedded on port 8888.
 */
const FRONTEND_URLS: Record<string, string> = {
  nuxt: URL.nuxt,
  react: URL.reactDoc,
  svelte: URL.svelteDoc,
  vue: URL.vueDoc,
  nextjs: URL.nextjs,
  f7: URL.f7,
};

export function getFrontendUrl(projectName: string): string | undefined {
  return FRONTEND_URLS[projectName];
}

const test = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    const url = getFrontendUrl(testInfo.project.name);
    const frontend = url ? `?frontend=${encodeURIComponent(url)}` : '';
    await page.goto(`${URL.testFrontend}/mock-parent.html${frontend}`);
    await helper.waitForIframeReady();
    await helper.waitForIframeBlockHandle('mock-block-1');
    await use(helper);
  },
});

export { test, expect };
