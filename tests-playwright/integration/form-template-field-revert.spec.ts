import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * End-to-end regression guard for the "field disappears" bug. In a forced-template footer, in
 * template edit mode: add a column, add a form (itself a container) inside it, then convert the
 * seeded empty field to a real field type. The converted field must survive — not revert or
 * disappear. This is the freshly-added deep nesting (footer → columns → new column → form → field)
 * that pre-seeded fixtures couldn't exercise; the fix is the seed-time template-membership stamping
 * in initializeContainerBlock (seeded children of a template-member container inherit its membership).
 */
test.describe('forced footer — add column → add form → convert field', () => {
  test('a field converted inside a freshly-added form/column survives', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/another-page');
    await helper.waitForIframeReady();

    const footer = iframe.locator('#footer-content');
    const branding = footer.locator('[data-block-uid]').filter({ hasText: 'Footer Branding' }).last();
    await expect(branding).toBeVisible({ timeout: 10000 });
    const brandingId = await branding.getAttribute('data-block-uid');
    const cellId = await footer.locator('[data-block-uid]').filter({ hasText: 'Footer Column Cell' }).last().getAttribute('data-block-uid');

    // Enter template edit mode.
    await helper.clickBlockInIframe(brandingId!);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    const editToggle = page.locator('.edit-template-toggle');
    await editToggle.click();
    await expect(editToggle).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });

    // Navigate to the columns container + add a NEW column.
    await helper.clickBlockInIframe(cellId!);
    await helper.waitForBlockSelectedInAdmin(cellId!);
    await helper.escapeToParent(); // -> column
    await helper.escapeToParent(); // -> columns
    const columns = footer.locator('.columns-row > [data-block-uid]');
    await expect(columns).toHaveCount(1);
    await helper.addBlockViaSidebar('Columns');
    await expect(columns).toHaveCount(2);

    // Select the NEW column (cell → escape to column) and add a FORM into its Content field.
    const newCellId = await columns.nth(1).locator('[data-block-uid]').first().getAttribute('data-block-uid');
    await helper.clickBlockInIframe(newCellId!);
    await helper.waitForBlockSelectedInAdmin(newCellId!);
    await helper.escapeToParent(); // -> new column
    await helper.waitForSidebarOpen();
    const contentSection = page.locator('.container-field-section', { has: page.locator('.widget-title', { hasText: 'Content' }) });
    await contentSection.first().getByRole('button', { name: 'Add block' }).click();
    // `form` is offered in the chooser's collapsed `common` accordion group. selectBlockType
    // targets `button.form` directly (attached even while that group is collapsed) — a
    // visible-text/getByRole match would miss it (it's not in the a11y tree while collapsed).
    await helper.selectBlockType('form');
    await expect(footer.locator('.form-block')).toBeVisible({ timeout: 10000 });

    // Convert the seeded empty field to E-mail.
    const fieldId = await footer.locator('.form-block [data-block-uid]').first().getAttribute('data-block-uid');
    await helper.clickBlockInIframe(fieldId!);
    await page.locator('.volto-hydra-add-button').click();
    await expect(page.locator('.blocks-chooser')).toBeVisible({ timeout: 5000 });
    await helper.selectBlockType('from');

    // The field must render as an email input — must NOT disappear.
    await expect(footer.locator('.form-block input[type="email"]')).toBeVisible({ timeout: 5000 });
  });
});
