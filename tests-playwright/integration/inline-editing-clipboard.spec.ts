/**
 * Clipboard and text manipulation tests for inline editing in Volto Hydra admin UI.
 *
 * TODO - additional tests:
 * - DND a word within the same block
 * - DND a word between blocks
 * - paste rich text
 * - paste multi-paragraph rich text
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Clipboard', () => {
  test('can cut and paste plain text', async ({ page }) => {
    // Test cut and paste functionality using clipboard helpers
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type text
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Text to paste', { delay: 10 });
    await helper.waitForEditorText(editor, /Text to paste/);

    // Select all text and cut
    await helper.selectAllTextInEditor(editor);
    const cutText = await helper.cutSelectedText(editor);
    console.log('[TEST] Cut text:', JSON.stringify(cutText));

    // Wait for text to be cleared
    await helper.waitForEditorText(editor, /^$/);

    // Paste the text back and wait for it to appear
    await helper.pasteFromClipboard(editor);
    await helper.waitForEditorText(editor, /Text to paste/);

    // Verify paste worked
    const textAfterPaste = await helper.getCleanTextContent(editor);
    console.log('[TEST] Text after paste:', JSON.stringify(textAfterPaste));
    expect(textAfterPaste).toContain('Text to paste');
  });

  test('can delete across formatted text boundaries', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode (select all to replace existing content)
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);

    // Type "Hello " (replaces selection) then make "world" bold, then type " testing"
    await editor.pressSequentially('Hello ', { delay: 10 });

    // Apply bold formatting to "world"
    // Use ControlOrMeta+b (Cmd+B on macOS) for formatting
    await editor.press('ControlOrMeta+b');
    await page.waitForTimeout(100); // Wait for format operation to complete
    await editor.pressSequentially('world', { delay: 10 });
    await editor.press('ControlOrMeta+b'); // toggle bold off
    await page.waitForTimeout(100); // Wait for format operation to complete

    await editor.pressSequentially(' testing', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello world testing/);

    // Verify we have "Hello world testing" with "world" in bold
    const initialText = await helper.getCleanTextContent(editor);
    expect(initialText).toBe('Hello world testing');

    // Select from position 3 to 14 (crosses bold boundary)
    // "Hello world testing" = 19 chars
    // Position 3 = after "Hel", Position 14 = after "Hello world te"
    // This removes "lo world te", leaving "Hel" + "sting" = "Helsting"
    await helper.selectTextRange(editor, 3, 14);

    // Press Delete to remove selected text
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Verify result - deletion crossed the bold boundary successfully
    const finalText = await helper.getCleanTextContent(editor);
    expect(finalText).toBe('Helsting');
  });

  test('clipboard test on parent document', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to the admin UI
    const helper = new AdminUIHelper(page);
    await helper.login();

    // Create a test element on the parent page
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-clipboard';
      div.contentEditable = 'true';
      div.textContent = 'Test clipboard text';
      div.style.cssText = 'position: fixed; top: 10px; left: 10px; padding: 10px; background: white; z-index: 9999;';
      document.body.appendChild(div);
    });

    // Select and copy from parent document
    const testDiv = page.locator('#test-clipboard');
    await testDiv.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');

    // Wait for clipboard to contain the expected text (copy may not complete immediately in CI)
    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()), {
        timeout: 5000,
      })
      .toBe('Test clipboard text');
  });
});
