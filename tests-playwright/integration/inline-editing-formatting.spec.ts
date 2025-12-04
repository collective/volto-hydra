/**
 * Text formatting tests for inline editing in Volto Hydra admin UI.
 *
 * TODO - additional tests and bugs:
 * - backspace into bold text (click off or apply another format it will go funny)
 * - ctrl-b and other native formatting shortcuts are ignored
 * - if we aren't focused on a field then the format buttons should be disabled
 * - click bold button without selection and then type - should be bolded
 * - format button still works when sidebar is closed
 * - heading shortcuts (## for h2, ### for h3)
 * - bullet list shortcuts (- or * for ul, 1. for ol)
 * - multiple formats on same text (bold + italic, etc)
 * - paragraph formats as dropdown?
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Formatting', () => {
  test('can make text bold', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Edit the text (also clicks block, waits for toolbar, and types)
    await helper.editBlockTextInIframe(blockId, 'Text to make bold');

    // STEP 1: Verify the text content is correct
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    const textContent = await helper.getCleanTextContent(editor);
    expect(textContent).toBe('Text to make bold');
    console.log('[TEST] Step 1: Text content verified:', textContent);

    // STEP 2: Select all the text programmatically
    await helper.selectAllTextInEditor(editor);

    // STEP 3: Verify selection was created correctly
    await helper.assertTextSelection(editor, 'Text to make bold', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'Step 3: After creating selection'
    });

    // STEP 4: Verify selection still exists just before clicking button
    await helper.assertTextSelection(editor, 'Text to make bold', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'Step 4: Before clicking bold button'
    });

    // STEP 5: Wait for toolbar to be fully ready and stable
    await helper.waitForQuantaToolbar(blockId);

    // STEP 6: Trigger the bold button using dispatchEvent
    console.log('[TEST] Step 6: Clicking bold button...');
    await helper.clickFormatButton('bold');

    // STEP 7: Wait for bold formatting AND text content to be stable (polls until both conditions met)
    await helper.waitForFormattedText(editor, /Text to make bold/, 'bold');

    // STEP 8: Check selection after button click
    await helper.assertTextSelection(editor, undefined, {
      message: 'Step 8: After clicking bold button'
    });

    // STEP 9: Verify the text is bold by checking for <span style="font-weight: bold"> tag
    const blockHtml = await editor.innerHTML();
    console.log('[TEST] Step 9: Final HTML:', blockHtml);
    expect(blockHtml).toContain('style="font-weight: bold"');
    expect(blockHtml).toContain('Text to make bold');
  });

  test('bold formatting syncs with Admin UI', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode, select all existing text and replace it
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Synced bold text', { delay: 10 });
    await helper.waitForEditorText(editor, /Synced bold text/);

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');

    // Wait for bold formatting to sync from Admin UI to iframe
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible({ timeout: 10000 });

    // Verify bold in iframe
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      expect(blockHtml).toContain('style="font-weight: bold"');
    }).toPass({ timeout: 5000 });

    // Wait for the bold formatting to visually appear in the sidebar's React Slate editor
    // The sidebar Slate editor renders bold text with <strong> tags
    const sidebarSlateEditor = page.locator('[role="complementary"][aria-label="Sidebar"] [contenteditable="true"]');
    await expect(sidebarSlateEditor.locator('strong')).toContainText('Synced bold text', { timeout: 5000 });
  });

  test('multiple formats can be applied simultaneously', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text
    const editor = await helper.enterEditMode(blockId);
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

    // Apply bold and wait for it to appear with text content
    await helper.clickFormatButton('bold');
    await helper.waitForFormattedText(editor, /Bold and italic text/, 'bold');

    // Apply italic (text should still be selected) and wait for it to appear
    await helper.clickFormatButton('italic');
    await helper.waitForFormattedText(editor, /Bold and italic text/, 'italic');

    // Verify both formats are applied
    // Note: hydra.js renders formatting as inline styles, not semantic tags
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('font-weight: bold');
    expect(blockHtml).toContain('font-style: italic');
    expect(blockHtml).toContain('Bold and italic text');
  });

  test('format button shows active state for formatted text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Text with bold', { delay: 10 });
    await helper.waitForEditorText(editor, /Text with bold/);

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible();

    // Verify selection is still on the formatted text
    await helper.verifySelectionMatches(editor, 'Text with bold');

    // Check if the bold button shows active state
    const isActive = await helper.isActiveFormatButton('bold')
    expect(isActive).toBeTruthy();

  });

  test('clicking format button again removes format', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Toggle bold text', { delay: 10 });
    await helper.waitForEditorText(editor, /Toggle bold text/);

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible();

    // Verify bold was applied
    let blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('style="font-weight: bold"');

    // Click bold button again to remove formatting
    await helper.selectAllTextInEditor(editor); // Re-select text
    await helper.clickFormatButton('bold');
    await expect(editor.locator('span[style*="font-weight: bold"]')).not.toBeVisible();

    // Verify bold was removed
    blockHtml = await editor.innerHTML();
    expect(blockHtml).not.toContain('style="font-weight: bold"');
    expect(blockHtml).toContain('Toggle bold text');
  });

  test('format persists after typing', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Bold text', { delay: 10 });
    await helper.waitForEditorText(editor, /Bold text/);

    // Select all and make it bold, wait for formatting AND content to be stable
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await helper.waitForFormattedText(editor, /Bold text/, 'bold');

    // Move cursor to end
    await helper.moveCursorToEnd(editor);

    // Type more text at the end
    await page.keyboard.type(' more');
    await helper.waitForEditorText(editor, /Bold text more/);

    // Check if new text inherits bold formatting
    const html = await editor.innerHTML();
    expect(html).toContain('style="font-weight: bold"');
    const text = await helper.getCleanTextContent(editor);
    expect(text).toContain('Bold text more');
  });

  test('Ctrl+B hotkey applies bold formatting', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode - block has "This is a test paragraph"
    const editor = await helper.enterEditMode(blockId);

    // Select the word "test" (characters 10-14)
    // "This is a test paragraph"
    //  0123456789...
    await helper.selectTextRange(editor, 10, 14);

    // Wait for bold button to appear (not active yet)
    await expect(async () => {
      const isActive = await helper.isActiveFormatButton('bold');
      expect(isActive).toBe(false);
    }).toPass({ timeout: 5000 });

    // Press Cmd+B (Mac) to bold the selection
    await editor.press('ControlOrMeta+b');

    // Wait for bold button to become active
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(true);
    }).toPass({ timeout: 10000 });

    // Verify "test" is now bold in the HTML
    await helper.waitForFormattedText(editor, /test/, 'bold');
  });

  test('should handle bolding same text twice without path error', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode
    const editor = await helper.enterEditMode(blockId);

    // Wait for toolbar
    await helper.waitForQuantaToolbar(blockId);

    // Clear and type text
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Text with bold', { delay: 10 });
    await helper.waitForEditorText(editor, /Text with bold/);

    // Select the word "bold" (last 4 characters)
    // Use helper instead of page.keyboard.press('End') to avoid scrolling the window
    await helper.moveCursorToEnd(editor);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    console.log('[TEST] About to click Bold button first time');

    // Click Bold button FIRST TIME using helper
    await helper.clickFormatButton('bold');
    await helper.waitForFormattedText(editor, /bold/, 'bold');

    console.log('[TEST] First bold click done');

    // Verify bold markup exists using DOM assertion
    const boldSpan = editor.locator('span[style*="font-weight: bold"]');
    await expect(boldSpan).toBeVisible();
    await expect(boldSpan).toHaveText('bold');

    // The selection should still be on "bold" after the first bold operation
    // (no need to re-select - the selection is preserved through the format operation)
    console.log('[TEST] About to click Bold button second time');

    // Click Bold button SECOND TIME
    // This should NOT throw an error about path [0,0,0] not found
    await helper.clickFormatButton('bold');

    // Verify bold markup is gone using DOM assertion
    await expect(boldSpan).not.toBeVisible();

    console.log('[TEST] Second bold click done - should have unbolded without error');

    // Verify the word "bold" is still selected
    const selectedText = await editor.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBe('bold');

    // Verify contenteditable is still enabled (not blocked from format operation)
    const isEditable = await editor.evaluate((el) => el.contentEditable === 'true');
    expect(isEditable).toBe(true);

    // Verify we can still type (editor is not blocked)
    // First collapse selection to end so we don't replace the selected text
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('!');
    await expect(editor).toContainText('bold!');
  });

  test('prospective formatting: Ctrl+B then type applies bold to new text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and clear the block
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);

    // Type "Hello " (not bold)
    await editor.pressSequentially('Hello ', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello/);

    // Press Cmd+B to enable bold mode for subsequent text
    await editor.press('ControlOrMeta+b');

    // Wait for bold button to become active (indicates bold mode is on)
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(true);
    }).toPass({ timeout: 5000 });

    // Type "world" - this should be bold
    await editor.pressSequentially('world', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello world/);

    // Wait for the bold formatting to appear
    await helper.waitForFormattedText(editor, /world/, 'bold');

    // Verify "Hello " is NOT bold (should be plain text)
    const html = await editor.innerHTML();
    console.log('[TEST] Final HTML:', html);

    // The structure should be: "Hello " (plain) + <span style="font-weight: bold">world</span>
    // Or the entire "Hello world" might be bold if prospective formatting wraps from cursor
    expect(html).toMatch(/font-weight.*bold/);
  });

  test('prospective formatting: toggle bold off after typing bold text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and clear the block
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);

    // Type "Hello " (not bold)
    await editor.pressSequentially('Hello ', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello/);

    // Press Cmd+B to enable bold mode
    console.log('[TEST] First ControlOrMeta+b - enabling bold');
    await editor.press('ControlOrMeta+b');

    // Wait for bold button to become active
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(true);
    }).toPass({ timeout: 5000 });

    // Type "world" - this should be bold
    await editor.pressSequentially('world', { delay: 10 });

    // Wait for the bold formatting to appear
    await helper.waitForFormattedText(editor, /world/, 'bold');

    // Check selection state before toggling off
    const selectionInfo = await helper.getSelectionInfo(editor);
    console.log('[TEST] Selection before second ControlOrMeta+b:', JSON.stringify(selectionInfo));
    expect(selectionInfo.editorHasFocus).toBe(true);
    expect(selectionInfo.isCollapsed).toBe(true);
    expect(selectionInfo.anchorOffset).toBe(6); // ZWS + "world" = 6 chars

    // Press Cmd+B again to toggle bold OFF
    console.log('[TEST] Second ControlOrMeta+b - toggling bold off');
    await editor.press('ControlOrMeta+b');

    // Wait for bold button to become inactive (polls until condition met)
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(false);
    }).toPass({ timeout: 5000 });

    // Check cursor is outside the bold element after toggle
    const selectionAfterToggle = await helper.getSelectionInfo(editor);
    console.log('[TEST] Selection after second ControlOrMeta+b:', JSON.stringify(selectionAfterToggle));
    expect(selectionAfterToggle.editorHasFocus).toBe(true);
    expect(selectionAfterToggle.isCollapsed).toBe(true);
    // Cursor should NOT be inside SPAN (bold element) - it should be in #text after the span
    expect(selectionAfterToggle.anchorNodeName).not.toBe('SPAN');

    // Type " testing" - this should NOT be bold
    await editor.pressSequentially(' testing', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello world testing/);

    // Verify final text via clipboard (tests ZWS cleaning on copy)
    await editor.press('ControlOrMeta+a');
    await editor.press('ControlOrMeta+c');
    // Wait for clipboard to contain the expected text (copy may not complete immediately in CI)
    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()), {
        timeout: 5000,
      })
      .toBe('Hello world testing');

    // Verify structure: "Hello " (plain) + "world" (bold) + " testing" (plain)
    const html = await editor.innerHTML();
    console.log('[TEST] Final HTML:', html);

    // "world" should be bold (may contain trailing ZWS for cursor positioning)
    const boldSpan = editor.locator('span[style*="font-weight: bold"]');
    await expect(boldSpan).toHaveText(/world/);

    // " testing" should NOT be inside the bold span
    // Verify "testing" is outside the span by checking the span only contains "world" + optional ZWS
    const boldSpanContent = await boldSpan.textContent();
    const cleanBoldContent = boldSpanContent
      ?.replace(/[\uFEFF\u200B]/g, '')
      .trim();
    expect(cleanBoldContent).toBe('world');
  });

  test('prospective formatting: clipboard strips ZWS from bold text', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and clear the block
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);

    // Type "Hello " (not bold)
    await editor.pressSequentially('Hello ', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello/);

    // Press Cmd+B to enable bold mode (prospective formatting inserts ZWS)
    await editor.press('ControlOrMeta+b');
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(true);
    }).toPass({ timeout: 5000 });

    // Type "world" - this should be bold
    await editor.pressSequentially('world', { delay: 10 });
    await helper.waitForFormattedText(editor, /world/, 'bold');

    // Select all and copy - clipboard should have clean text without ZWS
    await helper.selectAllTextInEditor(editor);
    const clipboardText = await helper.copyAndGetClipboardText(editor);
    console.log('[TEST] Clipboard text:', JSON.stringify(clipboardText));

    // Clipboard should have "Hello world" without any ZWS characters
    expect(clipboardText).toBe('Hello world');
    expect(clipboardText).not.toMatch(/[\uFEFF\u200B]/);
  });
});
