import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Deep-link fragments: the frontend marks anchor elements with a real `id` +
 * `data-linkable-id="Name"`. Hydra harvests them per-block into
 * `_linkableAnchors` (persisted with the registered `blocks` field), and the
 * object browser offers them as `path#fragment` deep-link targets.
 */
test.describe('deep-link fragments', () => {
  test('frontend renders id + data-linkable-id on anchor headings', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/deep-link-page');
    const iframe = helper.getIframe();

    // The renderer emits a real id (the #fragment) + data-linkable-id (label).
    await expect(
      iframe.locator('#intro[data-linkable-id="Intro"]'),
    ).toBeVisible();
    await expect(
      iframe.locator('#details[data-linkable-id="Details"]'),
    ).toBeVisible();
  });

  test('anchors persist per-block and are offered as deep-link targets', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    // 1. Open for edit → hydra harvests the anchors into the admin formData.
    await helper.navigateToEdit('/deep-link-page');

    // 2. Save → PATCH persists blocks (with _linkableAnchors) to the session.
    await helper.saveContent();

    // 3. Re-enter edit. formData now loads from the persisted session content,
    //    so the object browser's getContent will see the anchors.
    await helper.navigateToEdit('/deep-link-page');
    const iframe = helper.getIframe();

    // 4. Open the button's link editor → object browser.
    await iframe.locator('[data-block-uid="btn"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    const browse = await helper.getLinkEditorBrowseButton();
    await browse.click();
    const ob = await helper.waitForObjectBrowser();

    // 5. OB opens at root (/) showing folders; deep-link-page lives under
    //    Test Data. Navigate in, then expand the Deep Link Page row's anchors
    //    (.object-listing li is the item structure the shadowed OB uses).
    await helper.objectBrowserNavigateToFolder(ob, /Test Data/);
    const row = page
      .locator('.object-listing li')
      .filter({ hasText: 'Deep Link Page' })
      .first();
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.locator('.ob-anchors-toggle').click();

    // 6. Anchors listed in DOCUMENT order (s1 before s2): Intro, then Details.
    const anchorItems = row.locator('.ob-anchor-item');
    await expect(anchorItems).toHaveText(['Intro', 'Details']);

    // 7. Pick "Details" → the link becomes path#details.
    await anchorItems.filter({ hasText: 'Details' }).click();

    // 8. Re-open the link editor; the stored URL carries the #details fragment.
    await iframe.locator('[data-block-uid="btn"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    await expect(page.locator('input[name="link"]')).toHaveValue(/#details$/);
  });

  test('add a heading on one page, save, and link to it from another page', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    // Page A: add a heading block via the ## markdown shortcut, then a render
    // (block re-select) so the frontend recomputes its slug id and the harvest
    // captures it. Save → the anchor persists.
    await helper.navigateToEdit('/deep-link-page');
    await addHeadingBlock(helper, page, 's1', '## Chapter One');
    await helper.saveContent();

    // Page B: link its button to page A's "Chapter One" anchor.
    await helper.navigateToEdit('/deep-link-page-b');
    const iframeB = helper.getIframe();
    await openPageAnchors(helper, page, iframeB, 'btnb', /^Deep Link Page$/);
    const row = anchorRow(page, /^Deep Link Page$/);
    await expect(
      row.locator('.ob-anchor-item').filter({ hasText: 'Chapter One' }),
    ).toBeVisible();
    await row.locator('.ob-anchor-item').filter({ hasText: 'Chapter One' }).click();

    await iframeB.locator('[data-block-uid="btnb"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    await expect(page.locator('input[name="link"]')).toHaveValue(/#chapter-one$/);
  });

  test('add a heading on the current page and link to it live (no save)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    // Add a heading on the page being edited — do NOT save.
    await helper.navigateToEdit('/deep-link-page');
    const iframe = helper.getIframe();
    await addHeadingBlock(helper, page, 's1', '## Section Two');

    // Link the same page's button to the just-added, UNSAVED heading. The object
    // browser reads live anchors from the current edit form (state.form.global).
    await openPageAnchors(helper, page, iframe, 'btn', /^Deep Link Page$/);
    const row = anchorRow(page, /^Deep Link Page$/);
    await expect(
      row.locator('.ob-anchor-item').filter({ hasText: 'Section Two' }),
    ).toBeVisible();
    await row.locator('.ob-anchor-item').filter({ hasText: 'Section Two' }).click();

    await iframe.locator('[data-block-uid="btn"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    await expect(page.locator('input[name="link"]')).toHaveValue(/#section-two$/);
  });
});

// Add a slate block after `afterBlockId`, type `markdown` (e.g. '## Chapter One'),
// then re-select the anchor block to force a render so the frontend recomputes
// the heading's slug id and the bridge harvests it.
async function addHeadingBlock(helper, page, afterBlockId, markdown) {
  const before = await helper.getBlockOrder();
  await helper.clickBlockInIframe(afterBlockId);
  await helper.clickAddBlockButton();
  await helper.selectBlockType('slate');
  await helper.waitForBlockCountToBe(before.length + 1);
  const after = await helper.getBlockOrder();
  const newUid = after.find((id) => !before.includes(id));
  expect(newUid).toBeTruthy();
  await helper.clickBlockInIframe(newUid);
  const editor = await helper.getEditorLocator(newUid);
  await expect(editor).toHaveAttribute('contenteditable', 'true', {
    timeout: 5000,
  });
  await editor.pressSequentially(markdown, { delay: 20 });
  // Re-select another block to trigger a re-render (and thus a harvest).
  await helper.clickBlockInIframe(afterBlockId);
  return newUid;
}

// The .object-listing row for a content item, matched by exact title.
function anchorRow(page, titleRe) {
  return page
    .locator('.object-listing li')
    .filter({ has: page.getByText(titleRe, { exact: true }) })
    .first();
}

// Open the object browser for a button's link field, navigate to Test Data, and
// expand the anchors for the page whose title matches `titleRe`.
async function openPageAnchors(helper, page, iframe, buttonUid, titleRe) {
  await iframe.locator(`[data-block-uid="${buttonUid}"] [data-edit-link="href"]`).click();
  await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
  const browse = await helper.getLinkEditorBrowseButton();
  await browse.click();
  const ob = await helper.waitForObjectBrowser();
  await helper.objectBrowserNavigateToFolder(ob, /Test Data/);
  await anchorRow(page, titleRe).locator('.ob-anchors-toggle').click();
}
