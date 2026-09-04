/**
 * End-to-end for the per-region slate style allow-list (#295).
 *
 * Fixture: /restricted-styles-page. Its `items` region declares
 * `disallowedStyles: ['blockquote', 'b']` and the frontend passes
 * `styleAliases: { b: 'strong' }` via voltoConfig — so this page is restricted
 * while every other admin-mock fixture stays unrestricted, which is also what
 * makes the last test a real guard: the feature has to stay opt-in.
 *
 * The keyboard surfaces (markdown shortcut, format hotkey) are covered
 * deterministically in tests-playwright/unit/slateStyleGating.spec.ts — they
 * turn on a bridge predicate, not on admin rendering.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/** Titles offered by the block-format dropdown for the given block. */
async function formatOptions(page, helper: AdminUIHelper, blockId: string) {
  await helper.clickBlockInIframe(blockId);
  const trigger = page.locator('.quanta-toolbar .format-dropdown-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.locator('.format-dropdown-menu');
  await expect(menu).toBeVisible();
  return await menu
    .locator('.format-dropdown-item')
    .evaluateAll((items) => items.map((i) => i.getAttribute('title')));
}

test.describe('slate style allow-list', () => {
  test('the format dropdown drops a disallowed style and keeps the rest', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const titles = await formatOptions(page, helper, 'target');
    expect(titles.some((t) => t?.toLowerCase().includes('quote'))).toBe(false);
    // The dropdown still works — this is a filter, not an empty menu.
    expect(titles).toContain('Title');
  });

  test('an unrestricted page still offers everything (the feature is opt-in)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForIframeReady();

    const titles = await formatOptions(page, helper, 'block-1-uuid');
    expect(titles.some((t) => t?.toLowerCase().includes('quote'))).toBe(true);
  });

  test('a stored node the region disallows is normalized when the page loads', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    // The fixture stores `b`; the alias map renames it to `strong`, which this
    // frontend renders as a font-weight span.
    const legacy = helper.getIframe().locator('[data-block-uid="legacy"]');
    await expect(legacy.locator('span[style*="font-weight: bold"]')).toHaveText('bold');
    await expect(legacy).toContainText('was bold');
  });

  test('pasting a disallowed element lands as a paragraph, text intact', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const editor = await helper.enterEditMode('target');
    await helper.selectAllTextInEditor(editor);

    await editor.evaluate((el: HTMLElement) => {
      const dt = new DataTransfer();
      dt.setData('text/html', '<blockquote>quoted</blockquote><p>after</p>');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });

    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid]')).toContainText(['quoted']);
    // Nothing was dropped, and nothing arrived as a blockquote.
    await expect(iframe.locator('blockquote')).toHaveCount(0);
    await expect(iframe.locator('body')).toContainText('after');
  });
});
