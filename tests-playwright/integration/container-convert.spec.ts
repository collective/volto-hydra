import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container UX: Convert (container-to-container)', () => {
  test('Convert a gridBlock to section preserves teaser children', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Select grid-1 via hydra's selectBlock (clicking a teaser child enters
    // text mode on its title; escape-to-parent is racey for this fixture).
    await iframe.locator('[data-block-uid="grid-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('grid-1');

    // Sanity: teaser children exist before conversion
    await expect(iframe.locator('[data-block-uid="grid-cell-1"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="grid-cell-2"]')).toBeVisible();

    // Open 3-dot menu, hover Convert to, pick section
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();

    const convertMenu = page.locator('.convert-to-menu');
    await expect(convertMenu).toBeVisible({ timeout: 3000 });
    await convertMenu.hover();

    const sectionOption = page.locator('.volto-hydra-submenu [data-convert-type="section"]');
    await expect(sectionOption).toBeVisible({ timeout: 3000 });
    await sectionOption.click();

    // After conversion: grid-1 block still exists (same UID, converted to section).
    // Its teaser children are preserved — same UIDs, same parent.
    await expect(iframe.locator('[data-block-uid="grid-cell-1"]').first()).toBeVisible({ timeout: 3000 });
    await expect(iframe.locator('[data-block-uid="grid-cell-2"]').first()).toBeVisible();

    // Parent of each teaser is still grid-1 (now rendered as section).
    const parentUid = await iframe.locator('[data-block-uid="grid-cell-1"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(parentUid).toBe('grid-1');
  });
});
