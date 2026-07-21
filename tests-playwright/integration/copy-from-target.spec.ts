/**
 * Copy-from-target: per-field LINKED ⇄ CUSTOM toggle.
 *
 * The `button` block declares fieldMappings['@target']: { Title: 'title' }; its
 * href carries the target snapshot. A mapped field is LINKED by default (tracks
 * the target, pulled on select) unless listed in the block's `_customFields`.
 *
 * Fixtures: btn-linked (no _customFields → title tracks target 'Target Title');
 * btn-custom (_customFields: ['title'] → keeps 'My own label').
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const linkedToggle = '.copy-from-target-linked';
const titleInput = '#sidebar-properties .field-wrapper-title input';

test.describe('Copy-from-target — linked/custom toggle', () => {
  test('a linked field pulls the target value on select, toggle checked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();

    // Linked → pulled from the target ('Stale label' → 'Target Title').
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');
    await expect(page.locator(linkedToggle)).toBeChecked();
  });

  test('a custom field keeps its own value, toggle unchecked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-custom');
    await helper.waitForSidebarOpen();

    // Custom → NOT pulled; keeps the editor's value.
    expect(await helper.getSidebarFieldValue('title')).toBe('My own label');
    await expect(page.locator(linkedToggle)).not.toBeChecked();
  });

  test('editing a linked field flips it to custom (toggle unchecks)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');
    await expect(page.locator(linkedToggle)).toBeChecked();

    // Type into the (linked) field → it becomes custom.
    await page.locator(titleInput).fill('Hand typed');
    await expect(page.locator(linkedToggle)).not.toBeChecked();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Hand typed');
  });

  test('an external link offers no toggle and cannot pull (plain editable field)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-external');
    await helper.waitForSidebarOpen();

    // External URL → no catalog target to pull from → no toggle, value untouched.
    await expect(page.locator('.copy-from-target-toggle')).toHaveCount(0);
    expect(await helper.getSidebarFieldValue('title')).toBe('External label');

    // Still a normal editable field.
    await page.locator(titleInput).fill('Edited external');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Edited external');
  });

  test('unticking a linked field keeps the current value as custom', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');

    // Untick → custom; value is retained, no longer pulled.
    await page.locator(linkedToggle).uncheck();
    await expect(page.locator(linkedToggle)).not.toBeChecked();
    expect(await helper.getSidebarFieldValue('title')).toBe('Target Title');
  });
});
