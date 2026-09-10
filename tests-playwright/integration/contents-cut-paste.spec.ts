import { test, expect, type Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Cut and paste in the contents view.
 *
 * This is how an editor reorganises a site, and it is the operation most
 * likely to break stored links: a move changes a document's path by
 * definition. tests-adapters/contract/move.spec.ts pins that the document id
 * survives a move; this pins that the UI actually performs one.
 *
 * Navigation between cut and paste MUST stay inside the SPA. Volto persists
 * only `blocksClipboard` across reloads (config/index.js persistentReducers),
 * so the content clipboard lives in Redux alone and a full page load silently
 * empties it — the Paste button just renders disabled. A folderish row's
 * title link points at that folder's contents view, so one click does it.
 */

const SOURCE = '/_test_data/accordion-test-page';
const TARGET_FOLDER = '/_test_data/context-navigation-forced-folder';
const MOVED = `${TARGET_FOLDER}/accordion-test-page`;

function row(page: Page, path: string) {
  return page.getByRole('row', { name: path, exact: true });
}

async function waitForRows(page: Page) {
  await expect
    .poll(() => page.locator('tbody tr').count(), { timeout: 30000 })
    .toBeGreaterThan(0);
}

async function openContents(page: Page, helper: AdminUIHelper, path: string) {
  await page.goto(`${helper.adminUrl}${path}/contents`);
  await waitForRows(page);
}

/** Selection is a button in the row's second cell; the first is the drag handle. */
async function selectRow(page: Page, path: string) {
  await row(page, path).locator('td').nth(1).locator('button').click();
}

async function cutAndPasteIntoFolder(page: Page, helper: AdminUIHelper) {
  await openContents(page, helper, '/_test_data');
  await expect(row(page, SOURCE)).toBeVisible();

  await selectRow(page, SOURCE);
  const cut = page.getByRole('button', { name: 'Cut', exact: true });
  await expect(cut).toBeEnabled();
  await cut.click();

  // SPA navigation — see the note above about the clipboard.
  await row(page, TARGET_FOLDER).getByRole('link').first().click();
  await expect(page).toHaveURL(new RegExp(`${TARGET_FOLDER}/contents$`));
  await waitForRows(page);

  const paste = page.getByRole('button', { name: 'Paste', exact: true });
  await expect(paste).toBeEnabled();
  await paste.click();
}

test.describe('Contents view — cut and paste', () => {
  test('cut a page and paste it into another folder', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    await cutAndPasteIntoFolder(page, helper);

    // The moved page appears under its new parent...
    await expect(row(page, MOVED)).toBeVisible({ timeout: 20000 });

    // ...and is gone from the old one. Asserting only the first half would
    // pass just as happily for a copy, which is a different operation.
    //
    // Navigate back through the breadcrumb rather than reloading. The mock
    // scopes every mutation to the caller's auth token, and a full page load
    // is served by Volto's SSR under a different token — so a reload lands in
    // a session that never saw the move and still lists the page at its old
    // path. Real Plone has no such split; this is a property of the harness.
    await page
      .getByRole('link', { name: 'Test Data', exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/_test_data\/contents$/);
    await waitForRows(page);
    await expect(row(page, SOURCE)).toHaveCount(0);
  });

  test('the moved page is reachable at its new path', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    await cutAndPasteIntoFolder(page, helper);
    await expect(row(page, MOVED)).toBeVisible({ timeout: 20000 });

    // A move that leaves the document unreachable at its new path has moved
    // nothing useful. Click through rather than reloading, for the same
    // session reason as above.
    await row(page, MOVED).getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`${MOVED}$`));

    // The document renders in the iframe, not in the admin's <main> — Hydra
    // delegates rendering to the frontend, so asserting on admin markup would
    // pass or fail for reasons unrelated to whether the page actually moved.
    await helper.waitForIframeReady();
    await expect(helper.getIframe().locator('body')).toContainText(
      'Accordion Test Page',
      { timeout: 20000 },
    );
  });
});
