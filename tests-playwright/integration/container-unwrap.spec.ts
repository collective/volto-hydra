import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container UX: Unwrap', () => {
  test('Unwrap a section promotes its children to the parent', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();

    // Select section-1 by first clicking its child then escaping up to parent.
    // A section's body is taken up by its children, so a direct click on the
    // container lands on the child instead.
    await helper.clickBlockInIframe('section-child-1');
    await helper.waitForBlockSelected('section-child-1');
    await helper.escapeFromEditing(); // exits text mode, still on section-child-1
    await page.keyboard.press('Escape'); // Escape → parent = section-1
    await helper.waitForBlockSelected('section-1');

    // Open the quanta toolbar 3-dot menu; Unwrap is a menu item.
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();

    const unwrapButton = page.locator('[data-testid="unwrap-container"]');
    await expect(unwrapButton).toBeVisible({ timeout: 3000 });
    await unwrapButton.click();

    // section-1 is gone; section-child-1 now sits at page level in section-1's
    // former position (between slate-before and slate-after).
    await expect(iframe.locator('[data-block-uid="section-1"]'))
      .toHaveCount(0, { timeout: 3000 });
    await expect(iframe.locator('[data-block-uid="section-child-1"]'))
      .toBeVisible();

    // section-child-1's new parent is the page (no [data-block-uid] ancestor).
    const parentUid = await iframe.locator('[data-block-uid="section-child-1"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(parentUid).toBeNull();
  });

  test('Unwrap button is disabled when parent does not accept the children types', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // col-1 is inside columns-1. columns-1's allowedBlocks is ['column'] only —
    // unwrapping col-1 would try to promote slates to columns-1, which is not allowed.
    // Select col-1 by clicking a text child and escaping up.
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();
    await page.keyboard.press('Escape'); // → col-1
    await helper.waitForBlockSelected('col-1');

    // Open the 3-dot menu; Unwrap should either be absent or disabled.
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();

    const unwrapButton = page.locator('[data-testid="unwrap-container"]');
    if (await unwrapButton.count() > 0) {
      await expect(unwrapButton).toBeDisabled();
    }
  });
});
