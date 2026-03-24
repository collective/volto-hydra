/**
 * Tests that partial bold formatting + selection restore completes within 500ms.
 * Uses heavier pages (container blocks, templates) to reproduce real-world timing.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

for (const pagePath of ['/test-page', '/container-test-page', '/template-test-page']) {
  test(`partial bold selection restored within 500ms on ${pagePath}`, async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(pagePath);

    // Find the first text block
    const blockId = 'block-1-uuid';
    const editor = await helper.enterEditMode(blockId);

    // Type text and select a word
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Some text to partially bold', { delay: 10 });
    await helper.waitForEditorText(editor, /Some text to partially bold/);

    // Select "partially" (offset 13-22)
    await helper.selectTextRange(editor, 13, 22);

    // Apply bold via Ctrl+B
    const t0 = Date.now();
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold to appear in DOM
    await helper.waitForFormattedText(editor, /partially/, 'bold', { timeout: 5000 });
    const tBold = Date.now();

    // Selection must be restored within 500ms of bold appearing
    const iframe = helper.getIframe();
    await expect(async () => {
      const sel = await iframe.locator('[contenteditable="true"]:focus').evaluate(
        (el: any) => el.ownerDocument.defaultView.getSelection()?.toString() || '');
      expect(sel).toBe('partially');
    }).toPass({ timeout: 500 });
    const tSel = Date.now();

    console.log(`[TIMING ${pagePath}] Bold appeared: ${tBold - t0}ms, Selection restored: ${tSel - t0}ms (${tSel - tBold}ms after bold)`);
  });
}
