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
});
