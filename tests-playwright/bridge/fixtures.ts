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

/**
 * Map project names to frontend URLs.
 * The default (mock) uses the test frontend embedded on port 8888.
 */
const FRONTEND_URLS: Record<string, string> = {
  nuxt: 'http://localhost:3003',
  react: 'http://localhost:3004',
  svelte: 'http://localhost:3005',
  vue: 'http://localhost:3006',
  nextjs: 'http://localhost:3007',
  f7: 'http://localhost:3008',
};

export function getFrontendUrl(projectName: string): string | undefined {
  return FRONTEND_URLS[projectName];
}

const test = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    const url = getFrontendUrl(testInfo.project.name);
    const frontend = url ? `?frontend=${encodeURIComponent(url)}` : '';
    await page.goto(`http://localhost:8889/mock-parent.html${frontend}`);
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
    // Wait for render to fully settle — content must stop changing
    const iframe = helper.getIframe();
    let prevHtml: string | null = null;
    await expect(async () => {
      const html = await iframe.locator('#content, main').first().innerHTML();
      const settled = prevHtml !== null && html === prevHtml && html.length > 0;
      prevHtml = html;
      expect(settled).toBe(true);
    }).toPass({ timeout: 5000, intervals: [100, 200, 300] });
    await use(helper);
  },
});

export { test, expect };
