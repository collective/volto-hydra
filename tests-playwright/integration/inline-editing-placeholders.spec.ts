/**
 * Tests for schema placeholder support on inline-editable fields.
 *
 * When an editable field is empty and has a placeholder defined in its schema,
 * the placeholder text should be visible (via CSS ::before). It should hide
 * when the field is focused and reappear when the field is blurred while empty.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Placeholders', () => {
  test('empty field with schema placeholder shows data-placeholder attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    // The heading field has schema placeholder 'Enter hero heading…'
    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Field has content, so should not have data-empty
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // But should have data-placeholder from schema
    await expect(headingField).toHaveAttribute('data-placeholder', 'Enter hero heading…');
  });

  test('clearing field text makes placeholder visible via data-empty', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Click the heading to focus it
    await headingField.click();

    // Select all and delete to clear the field
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');

    // Verify text is actually cleared in the DOM
    await expect(headingField).toHaveText('', { timeout: 3000 });

    // Field is focused, so data-empty should NOT be set (placeholder hidden during editing)
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // Click a different block to blur and let the cleared value sync via FORM_DATA
    await helper.clickBlockInIframe('block-1-uuid');

    // After FORM_DATA re-render, applyPlaceholders should set data-empty on the
    // now-empty heading field (even though the hero block is not selected)
    await expect(headingField).toHaveAttribute('data-empty', '', { timeout: 5000 });
  });

  test('typing text removes data-empty attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Click the heading to focus
    await headingField.click();

    // Select all and delete to clear
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');

    // Type new text
    await page.keyboard.type('New heading');

    // data-empty should not be present since we typed text
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // Text should be in the field
    await expect(headingField).toContainText('New heading');
  });

  test('field without schema placeholder has no data-placeholder attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    // Hero buttonText field has no placeholder in schema
    const buttonField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="buttonText"]`);
    await expect(buttonField).toBeVisible();
    const hasPlaceholder = await buttonField.evaluate(el => el.hasAttribute('data-placeholder'));
    expect(hasPlaceholder).toBe(false);
  });

  test('slate block shows Type text placeholder from schema', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-1-uuid'; // Slate block with text

    await helper.clickBlockInIframe(blockId);

    const editField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="value"]`);
    await expect(editField).toBeVisible();
    await expect(editField).toHaveAttribute('data-placeholder', 'Type text…');
  });

  test('page title field shows placeholder from content type schema', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Page title is rendered with data-edit-text="/title" (or "title")
    const titleField = iframe.locator('[data-edit-text="/title"], [data-edit-text="title"]').first();
    await expect(titleField).toBeVisible({ timeout: 10000 });
    await expect(titleField).toHaveAttribute('data-placeholder', 'Type the title…');
  });
});
