import { test } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Temporary: dumps the contents view so selectors are written from evidence.
test('dump contents view', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await page.goto(`${helper.adminUrl}/_test_data/contents`);
  await page.waitForSelector('table, .contents', { timeout: 20000 });
  console.log('=== SNAPSHOT ===');
  console.log(await page.locator('#main, main').first().ariaSnapshot());
  console.log('=== ROW MARKUP ===');
  const row = page.locator('tbody tr').first();
  console.log((await row.innerHTML()).slice(0, 1200));
});
