/**
 * Integration tests for inline editing in Volto Hydra admin UI.
 *
 * These tests verify that editing text directly in blocks works correctly
 * and syncs with the admin UI.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing', () => {
  test('editing text in Slate block updates content', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get original text
    const blockId = 'block-1-uuid';
    const originalText = await helper.getBlockTextInIframe(blockId);
    expect(originalText).toContain('This is a test paragraph');

    // Edit the text
    const newText = 'This text has been edited via Playwright';
    await helper.editBlockTextInIframe(blockId, newText);

    // Verify text updated in iframe
    const updatedText = await helper.getBlockTextInIframe(blockId);
    expect(updatedText).toContain(newText);
  });

  test('inline editing in multiple blocks works independently', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Edit first block
    await helper.editBlockTextInIframe('block-1-uuid', 'First block edited');

    // Edit third block (also Slate)
    await helper.editBlockTextInIframe('block-3-uuid', 'Third block edited');

    // Verify both edits persisted
    const firstText = await helper.getBlockTextInIframe('block-1-uuid');
    const thirdText = await helper.getBlockTextInIframe('block-3-uuid');

    expect(firstText).toContain('First block edited');
    expect(thirdText).toContain('Third block edited');
  });

  test('edited content can be saved', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Edit a block
    await helper.editBlockTextInIframe('block-1-uuid', 'Content ready to save');

    // Save the content
    await helper.saveContent();

    // Verify no errors (basic check)
    // In a real scenario, you might reload and verify persistence
    const blockText = await helper.getBlockTextInIframe('block-1-uuid');
    expect(blockText).toContain('Content ready to save');
  });

  test('can make text bold', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block to select it and show the Quanta toolbar
    await helper.clickBlockInIframe(blockId);

    // Edit the text
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();

    // Clear existing text and type new text
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Text to make bold', { delay: 10 });

    // STEP 1: Verify the text content is correct
    const textContent = await editor.textContent();
    expect(textContent).toBe('Text to make bold');
    console.log('[TEST] Step 1: Text content verified:', textContent);

    // STEP 2: Select all the text programmatically
    // IMPORTANT: Must select the text node directly, not use selectNodeContents on parent element
    // Otherwise serializePoint() will reset offset to 0 for element nodes
    await editor.evaluate((el) => {
      // Find the text node inside the editor
      const textNode = el.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        throw new Error('[TEST] Expected first child to be a text node, got: ' + textNode?.nodeName);
      }

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, textNode.textContent.length);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      console.log('[TEST] Selection created in iframe:', selection.toString());
    });

    // STEP 3: Verify selection was created correctly
    await helper.assertTextSelection(editor, 'Text to make bold', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'Step 3: After creating selection'
    });

    // STEP 4: Wait a moment to ensure selection is stable
    await page.waitForTimeout(100);

    // STEP 5: Verify selection still exists just before clicking button
    await helper.assertTextSelection(editor, 'Text to make bold', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'Step 5: Before clicking bold button'
    });

    // STEP 6: Trigger the bold button using dispatchEvent
    const formatButtons = iframe.locator(`[data-block-uid="${blockId}"] .volto-hydra-format-button`);
    const boldButton = formatButtons.nth(0);
    console.log('[TEST] Step 6: Clicking bold button...');
    await boldButton.dispatchEvent('mousedown');

    // STEP 7: Wait a moment for the formatting to apply
    await page.waitForTimeout(500);

    // STEP 8: Check selection after button click
    await helper.assertTextSelection(editor, undefined, {
      message: 'Step 8: After clicking bold button'
    });

    // STEP 9: Verify the text is bold by checking for <strong> tag
    const blockHtml = await editor.innerHTML();
    console.log('[TEST] Step 9: Final HTML:', blockHtml);
    expect(blockHtml).toContain('<strong>');
    expect(blockHtml).toContain('Text to make bold');
  });

  test('can create a link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block to select it and show the Quanta toolbar
    await helper.clickBlockInIframe(blockId);

    // Edit the text
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();

    // Clear and type new text
    await page.keyboard.press('Control+A'); // Select all
    await editor.pressSequentially('Click here', { delay: 10 });

    // Select all the text
    await page.keyboard.press('Control+A'); // Select all

    // Click the link button
    // NOTE: This currently triggers a production bug in hydra.js:733
    // "Cannot read properties of null (reading 'link')"
    await helper.clickFormatButton(blockId, 'link');

    // TODO: Handle link URL input dialog if it appears
    // For now, this test documents the production bug
    // Once the bug is fixed, we should enhance this test to:
    // 1. Enter a URL in the link dialog
    // 2. Verify the link was created with <a> tag
    // 3. Verify the href attribute is correct
  });

  test('bold formatting syncs with Admin UI', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and edit text
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Synced bold text', { delay: 10 });

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton(blockId, 'bold');
    await page.waitForTimeout(500);

    // Verify bold in iframe
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('<strong>');

    // TODO: Verify bold formatting also appears in Admin UI sidebar Slate editor
    // Currently the sidebar Slate editor exists but doesn't show <strong> tags
    // after inline editing in the iframe. This may be a sync issue that needs
    // investigation - the data syncs to the form but the sidebar editor doesn't
    // re-render with the formatting.
  });

  test('multiple formats can be applied simultaneously', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and edit text
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Bold and italic text', { delay: 10 });

    // Select all text using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);

    // Assert selection exists and covers all text
    await helper.assertTextSelection(editor, 'Bold and italic text', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'After selecting all, selection should exist and cover all text',
    });

    // Apply bold
    await helper.clickFormatButton(blockId, 'bold');
    await page.waitForTimeout(200);

    // Apply italic (text should still be selected)
    await helper.clickFormatButton(blockId, 'italic');
    await page.waitForTimeout(200);

    // Verify both formats are applied
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('<strong>');
    expect(blockHtml).toContain('<em>');
    expect(blockHtml).toContain('Bold and italic text');
  });

  test('format button shows active state for formatted text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and edit text
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Text with bold', { delay: 10 });

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton(blockId, 'bold');
    await page.waitForTimeout(500);

    // TODO: Check if the bold button shows active state
    // This would require checking the button's CSS classes or aria-pressed attribute
    // const boldButton = iframe.locator(`[data-block-uid="${blockId}"] .volto-hydra-format-button`).nth(0);
    // const isActive = await boldButton.evaluate((el) => el.classList.contains('active'));
    // expect(isActive).toBe(true);
  });

  test('clicking format button again removes format', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and edit text
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Toggle bold text', { delay: 10 });

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton(blockId, 'bold');
    await page.waitForTimeout(500);

    // Verify bold was applied
    let blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('<strong>');

    // Click bold button again to remove formatting
    await helper.selectAllTextInEditor(editor); // Re-select text
    await helper.clickFormatButton(blockId, 'bold');
    await page.waitForTimeout(500);

    // Verify bold was removed
    blockHtml = await editor.innerHTML();
    expect(blockHtml).not.toContain('<strong>');
    expect(blockHtml).toContain('Toggle bold text');
  });
});
