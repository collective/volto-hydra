/**
 * Tests that partial bold formatting appears within 500ms and selection is
 * restored within 100ms after that. Uses a heavy page (150 blocks) to
 * reproduce real-world conditions.
 *
 * Only runs on admin-nuxt — the mock test frontend does a full innerHTML
 * replace on every FORM_DATA (~230ms). Real frameworks (Nuxt/Vue) patch
 * only the changed component and should be well under 500ms.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const pages: Record<string, string> = {
  '/test-page': 'block-1-uuid',
  '/heavy-slate-page': 'block-simple-para',
};

for (const [pagePath, blockId] of Object.entries(pages)) {
  test(`partial bold selection restored within 500ms on ${pagePath}`, async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('nuxt'), 'nuxt-only timing test');

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

    // Apply bold via Ctrl+B and measure round-trip time
    const t0 = Date.now();
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold to appear (generous timeout so we always get a measurement)
    await helper.waitForFormattedText(editor, /partially/, 'bold', { timeout: 5000 });
    const tBold = Date.now();

    // Wait for selection to be restored
    const iframe = helper.getIframe();
    await expect(async () => {
      const sel = await iframe.locator('[contenteditable="true"]:focus').evaluate(
        (el: any) => el.ownerDocument.defaultView.getSelection()?.toString() || '');
      expect(sel).toBe('partially');
    }).toPass({ timeout: 5000 });
    const tSel = Date.now();

    const boldMs = tBold - t0;
    const selMs = tSel - tBold;
    console.log(`[TIMING ${pagePath}] Bold: ${boldMs}ms, Selection: +${selMs}ms`);
    expect(boldMs, `Bold took ${boldMs}ms (max 500ms)`).toBeLessThan(500);
    expect(selMs, `Selection restore took ${selMs}ms after bold (max 100ms)`).toBeLessThan(100);
  });
}
