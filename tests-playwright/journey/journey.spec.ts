import { test, expect, type Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * The editor journey, run unchanged against every CMS.
 *
 * Create a page, link it to another by browsing, then move it.
 *
 * ONE test, not three. The steps share a session by necessity: the mocks
 * scope content to the caller's token so parallel tests cannot corrupt each
 * other, which means a page created in one test simply does not exist in the
 * next. It is also what "a journey" means — an editor does not log in again
 * between steps.
 *
 * Written with no per-CMS branches. If it ever needs one, the abstraction has
 * leaked and that is the finding. The adapter is chosen by the FRONTEND via
 * ?adapter=; the admin is byte-identical across all three runs, which is the
 * claim under test.
 */

const STAMP = Date.now();
const TITLE = `Journey ${STAMP}`;

async function waitForRows(page: Page) {
  await expect
    .poll(() => page.locator('tbody tr').count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
}

test('create a page, link to another, then move it', async ({ page }) => {
  test.setTimeout(180_000);
  const helper = new AdminUIHelper(page);
  await helper.login();

  // --- 1. browse existing content ---------------------------------------
  await page.goto(`${helper.adminUrl}/_test_data/contents`);
  await waitForRows(page);

  // --- 2. create a page --------------------------------------------------
  await page.locator('#toolbar-add').click();
  // Whatever addable type this CMS offers first: the submenu ids encode the
  // TYPE NAME (#toolbar-add-document on Plone, #toolbar-add-page elsewhere),
  // so naming one would quietly make this a single-CMS test.
  await page.locator('[id^="toolbar-add-"]').first().click();
  await page.waitForURL(/\/add\?type=/, { timeout: 15_000 });

  const titleField = page.locator('input[id="field-title"]').first();
  await expect(titleField).toBeVisible({ timeout: 25_000 });
  await titleField.fill(TITLE);

  // --- 3. link to another page, chosen by browsing -----------------------
  // The object browser is how an editor picks a link target, and it is the
  // interesting half: the reference must be stored by the target's stable id,
  // not its path, or the move in step 5 would break it.
  const relatedBrowse = page
    .locator('#sidebar-properties')
    .locator('.field-wrapper-relatedItems button, #field-relatedItems button')
    .first();
  const canBrowse = await relatedBrowse
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (canBrowse) {
    await relatedBrowse.click();
    const target = page
      .locator('.object-browser-body, .sidebar-container')
      .getByText('Another Page', { exact: false })
      .first();
    await target.click({ timeout: 10_000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
  }

  await page.locator('#toolbar-save, button:has-text("Save")').first().click();

  // The CMS assigned the document its own address, which it can only do if
  // the write succeeded. Deliberately NOT asserting that address contains the
  // title: how an id is derived is CMS-specific, and the contract suite had
  // this exact over-specification corrected out of it.
  await page.waitForURL((url) => !url.pathname.includes('/add'), {
    timeout: 30_000,
  });
  await expect(page).toHaveURL(/\/_test_data\/[^/]+(\/edit)?$/, {
    timeout: 25_000,
  });
  const createdPath = new URL(page.url()).pathname.replace(/\/edit$/, '');

  // --- 4. it is listed under its parent ----------------------------------
  // Navigate within the SPA: a full page load is served under a different
  // session by the mock, so it would land in a world that never saw the
  // create.
  // Saving lands on the new document's EDIT view, whose toolbar is Save and
  // Cancel — no Back, no Contents. Leave edit mode first, then go up to the
  // parent, then into its listing. Every hop stays inside the SPA because the
  // mock scopes content to the session and a page load would start a new one.
  // Back to the listing through browser history.
  //
  // Not via the toolbar: after client-side navigation Volto's toolbar has no
  // Contents control here, because actions are fetched server-side and the
  // store still holds the previous route's. And not via page.goto: a full
  // load is served under a different session by the mock, which would land in
  // a world that never saw the create — verified, not assumed (49 rows, none
  // of them this page).
  //
  // History back is client-side, so the session and the new page both survive.
  // Wait for each hop to actually arrive rather than sleeping between them.
  // Popping the next history entry before the intermediate route has settled
  // leaves the listing restored-but-unfetched, and it renders empty.
  await page.goBack();
  await page.waitForURL(/\/add(\?|$)/, { timeout: 20_000 });
  // The URL changes before the route's data arrives, so popping the next
  // entry immediately leaves the listing restored-but-unfetched and it renders
  // empty. Waiting for the title field to be VISIBLE is not enough either —
  // it persists across this transition, so that check passes instantly and
  // waits for nothing. An EMPTY title distinguishes the fresh add form from
  // the edit form we came from, so it is a real signal that this route has
  // re-rendered.
  await expect(page.locator('input[id="field-title"]').first()).toHaveValue('', {
    timeout: 25_000,
  });

  await page.goBack();
  await page.waitForURL(/\/_test_data\/contents$/, { timeout: 20_000 });
  await waitForRows(page);

  const created = page.getByRole('row', { name: createdPath, exact: true });
  await expect(created).toHaveCount(1, { timeout: 20_000 });

  // --- 5. move it with cut and paste -------------------------------------
  await created.locator('td').nth(1).locator('button').click();
  const cut = page.getByRole('button', { name: 'Cut', exact: true });
  await expect(cut).toBeEnabled();
  await cut.click();

  const folder = page.getByRole('row', {
    name: '/_test_data/context-navigation-forced-folder',
    exact: true,
  });
  await folder.getByRole('link').first().click();
  await expect(page).toHaveURL(/context-navigation-forced-folder\/contents$/, {
    timeout: 20_000,
  });
  await waitForRows(page);

  const paste = page.getByRole('button', { name: 'Paste', exact: true });
  await expect(paste).toBeEnabled();
  await paste.click();

  // Under its new parent, keeping its own id segment.
  const movedName = `/_test_data/context-navigation-forced-folder/${createdPath
    .split('/')
    .pop()}`;
  await expect(
    page.getByRole('row', { name: movedName, exact: true }),
  ).toHaveCount(1, { timeout: 30_000 });
});
