/**
 * Copy-from-target: per-field "reset to linked content" sync in the sidebar.
 *
 * The `button` block declares `fieldMappings['@target']: { Title: 'title' }`
 * and its `href` (object_browser link) carries the target snapshot. The
 * copy-from-target enhancer swaps the mapped `title` (Label) field to the
 * wrapper widget, which shows a sync affordance ONLY when the field diverges
 * from the target.
 *
 * Fixture btn-1: title 'Custom Label', href[0].Title 'Target Title' → diverged.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Copy-from-target — per-field sync', () => {
  test('sync link appears when a mapped field diverges, and resets it to the target', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-1');
    await helper.waitForSidebarOpen();

    // The Label (title) field holds the customised value.
    expect(await helper.getSidebarFieldValue('title')).toBe('Custom Label');

    // It diverges from the linked target ('Target Title'), so the per-field
    // sync affordance is shown.
    const sync = page.locator('.copy-from-target-sync');
    await expect(sync).toBeVisible({ timeout: 5000 });

    // Clicking it resets the field to the target's value.
    await sync.click();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');

    // Now that the field matches the target, the sync affordance is gone.
    await expect(sync).toHaveCount(0);
  });

  test('the mapped field still renders its normal widget (wrapper is a passthrough)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-1');
    await helper.waitForSidebarOpen();

    // The Label field is a normal editable text input despite the wrapper.
    const input = page.locator('#sidebar-properties .field-wrapper-title input');
    await expect(input).toBeVisible();
    await input.fill('Typed by hand');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Typed by hand');
  });
});
