/**
 * Form block tests: rendering, validation, submission, and adding new fields.
 *
 * Tests the form block at /form-test-page which has:
 * - Full Name (text, required)
 * - Email Address (from, required)
 * - Subject (select, required, options: General Inquiry/Bug Report/Feature Request)
 * - Message (textarea, optional)
 * - Priority (single_choice, optional, options: Low/Medium/High)
 * - I agree to the terms (checkbox, required)
 *
 * Validation and submission tests run after saving (view mode) so the hydra bridge
 * doesn't intercept form button clicks.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Nuxt-specific: uses Nuxt iframe which has full form block implementation
test.use({
  storageState: 'tests-playwright/fixtures/storage-nuxt.json',
});

test.describe('Form Block', () => {

  test('renders form fields and validates required fields on submit', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/form-test-page');
    await helper.waitForIframeReady();

    // Wait for the form to render in edit mode
    const formBlock = iframe.locator('[data-block-uid="form-block-1"] form');
    await expect(formBlock).toBeVisible({ timeout: 10000 });

    // Save to switch to view mode — form interactions work without bridge interference
    await helper.saveContent();

    // Re-locate form in view mode iframe
    await expect(iframe.locator('form')).toBeVisible({ timeout: 10000 });

    // Verify fields rendered
    await expect(iframe.locator('input[name="field-name"]')).toBeVisible();
    await expect(iframe.locator('input[name="field-email"]')).toBeVisible();
    await expect(iframe.locator('select[name="field-subject"]')).toBeVisible();
    await expect(iframe.locator('textarea[name="field-message"]')).toBeVisible();
    await expect(iframe.locator('input[type="checkbox"][name="field-agree"]')).toBeVisible();

    // Verify required indicators (*)
    const nameLabel = iframe.locator('.form-field:has(input[name="field-name"]) label');
    await expect(nameLabel).toContainText('*');

    // Submit empty form — should show validation errors on required fields
    const submitButton = iframe.locator('.form-submit');
    await submitButton.click();

    // Errors should appear for all required fields
    const nameError = iframe.locator('.form-field:has(input[name="field-name"]) .form-error');
    await expect(nameError).toBeVisible({ timeout: 5000 });
    await expect(nameError).toContainText('required');

    const emailError = iframe.locator('.form-field:has(input[name="field-email"]) .form-error');
    await expect(emailError).toBeVisible();

    const subjectError = iframe.locator('.form-field:has(select[name="field-subject"]) .form-error');
    await expect(subjectError).toBeVisible();

    const agreeError = iframe.locator('.form-field:has(input[name="field-agree"]) .form-error');
    await expect(agreeError).toBeVisible();

    // No success message
    await expect(iframe.locator('.form-success')).toHaveCount(0);

    // Fill required fields and submit
    await iframe.locator('input[name="field-name"]').fill('Test User');
    await iframe.locator('input[name="field-email"]').fill('test@example.com');
    await iframe.locator('select[name="field-subject"]').selectOption('Bug Report');
    await iframe.locator('input[name="field-agree"]').check();
    await submitButton.click();

    // Should show success message
    await expect(iframe.locator('.form-success')).toBeVisible({ timeout: 5000 });
  });

  test('validates email format on from field', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/form-test-page');
    await helper.waitForIframeReady();

    const formBlock = iframe.locator('[data-block-uid="form-block-1"] form');
    await expect(formBlock).toBeVisible({ timeout: 10000 });

    // Save to switch to view mode
    await helper.saveContent();
    await expect(iframe.locator('form')).toBeVisible({ timeout: 10000 });

    // Fill all required fields but use invalid email
    await iframe.locator('input[name="field-name"]').fill('Test User');
    await iframe.locator('input[name="field-email"]').fill('not-an-email');
    await iframe.locator('select[name="field-subject"]').selectOption('General Inquiry');
    await iframe.locator('input[name="field-agree"]').check();

    await iframe.locator('.form-submit').click();

    // Email error should appear
    const emailError = iframe.locator('.form-field:has(input[name="field-email"]) .form-error');
    await expect(emailError).toBeVisible({ timeout: 5000 });
    await expect(emailError).toContainText('valid email');

    // Fix the email and resubmit
    await iframe.locator('input[name="field-email"]').fill('test@example.com');
    await iframe.locator('.form-submit').click();

    await expect(iframe.locator('.form-success')).toBeVisible({ timeout: 5000 });
  });

  test('can add a new field to the form via block chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/form-test-page');
    await helper.waitForIframeReady();

    // Wait for form fields to render
    const formFields = iframe.locator('.form-field[data-block-uid]');
    await expect(formFields.first()).toBeVisible({ timeout: 10000 });
    const initialCount = await formFields.count();
    expect(initialCount).toBe(6);

    await helper.getStableBlockCount();

    // Select the form block via sidebar — press Escape to get to page level
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');

    // Drill down to the form block in the sidebar
    const pageChildBlocks = page.locator('#sidebar-order .child-blocks-widget');
    await expect(pageChildBlocks).toBeVisible({ timeout: 5000 });
    const formItem = pageChildBlocks.locator('.child-block-item', { hasText: 'Form' });
    await expect(formItem).toBeVisible({ timeout: 5000 });
    await formItem.click();

    // Click the first field (Full Name) to select it
    const nameItem = page.locator('.child-block-item', { hasText: 'Full Name' });
    await expect(nameItem).toBeVisible({ timeout: 5000 });
    await nameItem.click();

    // Wait for the field to be selected
    await helper.waitForBlockSelected('field-name', 5000);
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click the add button
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Block chooser opens with form field types
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Select the Date field type
    const commonSection = blockChooser.locator('text=Common');
    if (await commonSection.isVisible()) {
      await commonSection.click();
    }
    await blockChooser.getByRole('button', { name: /Date/i }).click();
    await blockChooser.waitFor({ state: 'hidden', timeout: 5000 });

    // Wait for the new field to appear (count goes from 6 to 7)
    await expect(formFields).toHaveCount(initialCount + 1, { timeout: 10000 });
  });
});
