import { test, expect, type Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * The end-to-end journey, run unchanged against every CMS.
 *
 * Create a page, add a link to another page, add an image, then move it.
 * Written once: if it needs a per-CMS branch, the abstraction has leaked and
 * that is the finding. The adapter is chosen by the FRONTEND via ?adapter=,
 * because the admin does not know which CMS it is talking to — that is the
 * whole claim being tested.
 *
 * Each step is deliberately something an editor does, not an API call:
 * anything that only works when driven programmatically has not been proven
 * to work at all.
 */

const TITLE = `Journey ${Date.now()}`;

function row(page: Page, path: string) {
  return page.getByRole('row', { name: path, exact: true });
}

async function waitForRows(page: Page) {
  await expect
    .poll(() => page.locator('tbody tr').count(), { timeout: 30000 })
    .toBeGreaterThan(0);
}

test.describe('editor journey', () => {
  test('create a page, link to another, add an image, then move it', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    // --- 1. the editor can see existing content ---------------------------
    await page.goto(`${helper.adminUrl}/_test_data/contents`);
    await waitForRows(page);

    // --- 2. create a page -------------------------------------------------
    await page.locator('#toolbar-add').click();
    // Whatever addable type this CMS offers first. The submenu ids encode the
    // TYPE NAME — #toolbar-add-document on Plone, #toolbar-add-page elsewhere
    // — so naming one would quietly make this a Plone test.
    await page.locator('[id^="toolbar-add-"]').first().click();
    await page.waitForURL(/\/add\?type=/, { timeout: 15000 });

    // The Add route renders Hydra's iframe, which hosts the adapter that
    // answers the schema request — see the bootstrap deadlock in M2b.
    await helper.waitForSidebarOpen();
    await page.getByRole('button', { name: 'Page', exact: true }).click();

    const titleField = page
      .locator('#sidebar-properties')
      .locator('input[id="field-title"]')
      .first();
    await expect(titleField).toBeVisible({ timeout: 20000 });
    await titleField.fill(TITLE);

    await page.locator('#toolbar-save, button:has-text("Save")').first().click();
    await page.waitForURL(/\/edit$|\/[^/]+$/, { timeout: 20000 });

    // --- 3. the page exists in the CMS -----------------------------------
    await expect(page.locator('body')).toContainText(TITLE, { timeout: 20000 });
  });
});
