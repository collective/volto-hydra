/**
 * Tests that partial bold formatting appears within 500ms and selection is
 * restored within 100ms after that. Uses a heavy page (150 blocks) to
 * reproduce real-world conditions.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const pages: Record<string, string> = {
  '/test-page': 'block-1-uuid',
  '/heavy-slate-page': 'block-simple-para',
};

for (const [pagePath, blockId] of Object.entries(pages)) {
  test(`partial bold + selection restore timing on ${pagePath}`, async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(pagePath);

    const editor = await helper.enterEditMode(blockId);

    // Type text and select a word
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Some text to partially bold', { delay: 10 });
    await helper.waitForEditorText(editor, /Some text to partially bold/);

    // Select "partially" (offset 13-22)
    await helper.selectTextRange(editor, 13, 22);

    // Wait for everything to settle before timing the bold operation
    await helper.getStableBlockCount();
    await helper.waitForPointerUnblocked();
    await page.waitForTimeout(500); // Let all renders, structural observer, etc. finish

    // Apply bold via Ctrl+B
    const t0 = Date.now();
    await page.keyboard.press('ControlOrMeta+b');

    // Bold must appear within 500ms
    await helper.waitForFormattedText(editor, /partially/, 'bold', { timeout: 500 });
    const tBold = Date.now();

    // Selection must be restored within 100ms of bold appearing
    const iframe = helper.getIframe();
    await expect(async () => {
      const sel = await iframe.locator('[contenteditable="true"]:focus').evaluate(
        (el: any) => el.ownerDocument.defaultView.getSelection()?.toString() || '');
      expect(sel).toBe('partially');
    }).toPass({ timeout: 100 });
    const tSel = Date.now();

    console.log(`[TIMING ${pagePath}] Bold: ${tBold - t0}ms, Selection: +${tSel - tBold}ms`);
    expect(tBold - t0, `Bold took ${tBold - t0}ms (max 500ms)`).toBeLessThan(500);
    expect(tSel - tBold, `Selection restore took ${tSel - tBold}ms after bold (max 100ms)`).toBeLessThan(100);
  });
}
