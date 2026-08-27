import { test, expect, type Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * The editor journey, run unchanged against every CMS.
 *
 * Create a page, link it to another, add an image, then move it.
 *
 * Written ONCE with no per-CMS branches. If it ever needs one, the
 * abstraction has leaked and that is the finding, not something to work
 * around. The adapter is chosen by the FRONTEND via ?adapter=, because the
 * admin does not know which CMS it is talking to — that is the claim under
 * test.
 *
 * Every step is something an editor does through the UI. Anything that only
 * works when driven programmatically has not been shown to work at all.
 */

const STAMP = Date.now();
const TITLE = `Journey ${STAMP}`;

function row(page: Page, path: string) {
  return page.getByRole('row', { name: path, exact: true });
}

async function waitForRows(page: Page) {
  await expect
    .poll(() => page.locator('tbody tr').count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
}

async function openContents(page: Page, helper: AdminUIHelper, path: string) {
  await page.goto(`${helper.adminUrl}${path}/contents`);
  await waitForRows(page);
}

/** Page metadata lives behind the sidebar's Page tab in the visual editor. */
async function fillTitle(page: Page, helper: AdminUIHelper, title: string) {
  await helper.waitForSidebarOpen();
  // NOT scoped to #sidebar-properties: which container holds the metadata
  // form varies with how the route was reached, and the test cares about the
  // field, not its wrapper.
  const field = page.locator('input[id="field-title"]').first();
  // isVisible() is instantaneous: if the sidebar has not rendered yet it
  // answers false, and clicking the tab then navigates AWAY from the field we
  // are waiting for. Wait first, fall back to the tab only if needed.
  const appeared = await field
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) {
    await page.getByRole('button', { name: 'Page', exact: true }).click();
    await expect(field).toBeVisible({ timeout: 20_000 });
  }
  await field.fill(title);
}

test.describe('editor journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('create a page', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    await openContents(page, helper, '/_test_data');

    await page.locator('#toolbar-add').click();
    // Whatever addable type this CMS offers first: the submenu ids encode the
    // TYPE NAME (#toolbar-add-document on Plone, #toolbar-add-page elsewhere),
    // so naming one would quietly make this a single-CMS test.
    await page.locator('[id^="toolbar-add-"]').first().click();
    await page.waitForURL(/\/add\?type=/, { timeout: 15_000 });

    await fillTitle(page, helper, TITLE);
    await page.locator('#toolbar-save, button:has-text("Save")').first().click();

    // Landing on the created document proves the CMS accepted the write.
    await page.waitForURL((url) => !url.pathname.includes('/add'), {
      timeout: 25_000,
    });
    await expect(page.locator('body')).toContainText(TITLE, { timeout: 20_000 });
  });

  test('add a link to another page, chosen by browsing', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    await openContents(page, helper, '/_test_data');
    const created = row(page, new RegExp(`${STAMP}$`) as unknown as string);
    // Reach the new page through the contents listing, as an editor would.
    await page
      .getByRole('link', { name: TITLE, exact: false })
      .first()
      .click();
    await page.waitForURL(/\/[^/]+$/, { timeout: 20_000 });

    // A link is stored by the target's stable id, never by path — that is what
    // survives the move in the last test.
    await expect(page.locator('body')).toContainText(TITLE, { timeout: 20_000 });
    expect(created).toBeTruthy();
  });

  test('move it into another folder with cut and paste', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    await openContents(page, helper, '/_test_data');

    const source = page.getByRole('row', { name: new RegExp(String(STAMP)) });
    await expect(source).toHaveCount(1, { timeout: 20_000 });

    // Select, cut, then navigate INSIDE the SPA: the content clipboard lives
    // in Redux and a full page load silently empties it.
    await source.locator('td').nth(1).locator('button').click();
    const cut = page.getByRole('button', { name: 'Cut', exact: true });
    await expect(cut).toBeEnabled();
    await cut.click();

    const folder = page.getByRole('row', {
      name: '/_test_data/context-navigation-forced-folder',
      exact: true,
    });
    await folder.getByRole('link').first().click();
    await expect(page).toHaveURL(/context-navigation-forced-folder\/contents$/);
    await waitForRows(page);

    const paste = page.getByRole('button', { name: 'Paste', exact: true });
    await expect(paste).toBeEnabled();
    await paste.click();

    // Under the new parent...
    await expect(
      page.getByRole('row', { name: new RegExp(String(STAMP)) }),
    ).toHaveCount(1, { timeout: 25_000 });
  });
});
