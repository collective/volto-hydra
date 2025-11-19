import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Ctrl+B Bold Formatting', () => {
  test('Ctrl+B applies bold to subsequently typed text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and clear it
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });

    // Type "Hello "
    await editor.pressSequentially('Hello ', { delay: 10 });

    // Press Ctrl+B to enable bold
    await page.keyboard.press('Control+b');

    // Type "world"
    await editor.pressSequentially('world', { delay: 10 });

    // Press Ctrl+B again to disable bold
    await page.keyboard.press('Control+b');

    // Type " testing"
    await editor.pressSequentially(' testing', { delay: 10 });

    // Wait a bit for rendering
    await page.waitForTimeout(200);

    // Check the HTML structure
    const html = await editor.innerHTML();
    console.log('[TEST] Editor HTML:', html);

    // Verify structure: should have "Hello " + bold "world" + " testing"
    // The renderer uses non-standard markup to prove architectural decoupling
    expect(html).toContain('Hello');
    expect(html).toContain('world');
    expect(html).toContain('testing');

    // More specific: verify "world" is inside bold span (non-standard markup)
    expect(html).toMatch(/<span style="font-weight: bold">world<\/span>/);
  });
});
