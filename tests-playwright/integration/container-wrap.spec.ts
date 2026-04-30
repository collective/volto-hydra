import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container UX: Wrap', () => {
  test('Wrap two selected slates in a section container', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();

    // Multi-select slate-before and slate-after at page level via Ctrl+Click
    await helper.clickBlockInIframe('slate-before');
    await helper.waitForBlockSelected('slate-before');
    await helper.escapeFromEditing();

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await iframe.locator('[data-block-uid="slate-after"]').click({ modifiers: [modifier] });
    await helper.waitForMultiSelectOutlines(2);

    // Open the quanta toolbar 3-dot menu and click "Wrap in container…"
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();
    const wrapButton = page.locator('[data-testid="wrap-selected"]');
    await expect(wrapButton).toBeVisible({ timeout: 3000 });
    await wrapButton.click();

    // BlockChooser opens filtered to compatible container types — section is
    // compatible (accepts any); columns is not (only accepts `column`).
    await expect(page.locator('.blocks-chooser button.columns')).toHaveCount(0);
    await helper.selectBlockType('section');

    // slate-before and slate-after are now children of a new section block
    // (not page-level siblings). Verify via DOM hierarchy: the closest
    // [data-block-uid] ancestor of each slate should be the new section,
    // not the page container.
    await expect(iframe.locator('[data-block-uid="slate-before"]')).toBeVisible({ timeout: 3000 });

    // Read the new parent UID by walking up from slate-before.
    const newParentUid = await iframe.locator('[data-block-uid="slate-before"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
    );
    expect(newParentUid).toBeTruthy();
    expect(newParentUid).not.toBe('section-1'); // not the pre-existing section

    // slate-after has the same new parent (same wrap operation)
    const afterParentUid = await iframe.locator('[data-block-uid="slate-after"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
    );
    expect(afterParentUid).toBe(newParentUid);

    // The new section renders as a <section class> with the expected block type attribute
    // (we registered section renderer that wraps children in a .section-body div).
    await expect(
      iframe.locator(`[data-block-uid="${newParentUid}"] .section-body`),
    ).toBeVisible();
  });
});
