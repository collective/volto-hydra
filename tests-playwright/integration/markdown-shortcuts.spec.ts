/**
 * Tests for markdown shortcut support in inline editing.
 *
 * Volto's Slate editor supports markdown-like autoformat shortcuts:
 * - Block-level: "## " → H2, "### " → H3, "* " → UL, "1. " → OL, "> " → blockquote
 * - Inline: "**text** " → bold, "*text* " → italic, "~~text~~ " → strikethrough
 *
 * In Hydra, hydra.js detects these patterns on Space keystroke and sends
 * a SLATE_TRANSFORM_REQUEST with transformType: 'markdown' to the admin.
 * The admin's SyncedSlateToolbar triggers editor.insertText(' ') which
 * fires Volto's withAutoformat plugin.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Markdown Shortcuts', () => {
  test.describe('Block-level shortcuts', () => {
    test('## space converts to H2 heading', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      // Clear existing text and type markdown prefix
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('##', { delay: 10 });

      // Press space to trigger the markdown transform
      await editor.press(' ');

      // Wait for H2 element to appear (transform roundtrip)
      const h2 = helper.getIframe().locator(`[data-block-uid="${blockId}"] h2`);
      await expect(h2).toBeVisible({ timeout: 5000 });

      // Now type the content text after the transform is complete
      await editor.pressSequentially('Hello Heading', { delay: 10 });

      await expect(h2).toContainText('Hello Heading', { timeout: 5000 });
    });

    test('### space converts to H3 heading', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('###', { delay: 10 });
      await editor.press(' ');

      const h3 = helper.getIframe().locator(`[data-block-uid="${blockId}"] h3`);
      await expect(h3).toBeVisible({ timeout: 5000 });

      await editor.pressSequentially('Hello H3', { delay: 10 });
      await expect(h3).toContainText('Hello H3', { timeout: 5000 });
    });

    test('* space converts to unordered list', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('*', { delay: 10 });
      await editor.press(' ');

      const li = helper.getIframe().locator(`[data-block-uid="${blockId}"] ul li`);
      await expect(li).toBeVisible({ timeout: 5000 });

      await editor.pressSequentially('List item', { delay: 10 });
      await expect(li).toContainText('List item', { timeout: 5000 });
    });

    test('- space converts to unordered list', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('-', { delay: 10 });
      await editor.press(' ');

      const li = helper.getIframe().locator(`[data-block-uid="${blockId}"] ul li`);
      await expect(li).toBeVisible({ timeout: 5000 });

      await editor.pressSequentially('Dash list', { delay: 10 });
      await expect(li).toContainText('Dash list', { timeout: 5000 });
    });

    test('1. space converts to ordered list', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('1.', { delay: 10 });
      await editor.press(' ');

      const li = helper.getIframe().locator(`[data-block-uid="${blockId}"] ol li`);
      await expect(li).toBeVisible({ timeout: 5000 });

      await editor.pressSequentially('Ordered item', { delay: 10 });
      await expect(li).toContainText('Ordered item', { timeout: 5000 });
    });

    test('> space converts to blockquote', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('>', { delay: 10 });
      await editor.press(' ');

      const bq = helper.getIframe().locator(`[data-block-uid="${blockId}"] blockquote`);
      await expect(bq).toBeVisible({ timeout: 5000 });

      await editor.pressSequentially('Quote text', { delay: 10 });
      await expect(bq).toContainText('Quote text', { timeout: 5000 });
    });
  });

  test.describe('Inline shortcuts', () => {
    test('inline markdown patterns apply formatting with trailing space', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const iframe = helper.getIframe();
      const block = iframe.locator(`[data-block-uid="${blockId}"]`);
      const editor = await helper.enterEditMode(blockId);
      const boldSelector = helper.getFormatSelector('bold');
      const italicSelector = helper.getFormatSelector('italic');
      const strikeSelector = 'del, s, span[style*="text-decoration: line-through"]';

      // **bold** — with preceding text like real usage
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('some text **bold**', { delay: 10 });
      await editor.press(' ');
      await expect(block.locator(boldSelector)).toContainText('bold', { timeout: 5000 });
      expect(await editor.textContent()).toMatch(/some text bold\s/);

      // __bold__
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('some text __under__', { delay: 10 });
      await editor.press(' ');
      await expect(block.locator(boldSelector)).toContainText('under', { timeout: 5000 });
      expect(await editor.textContent()).toMatch(/some text under\s/);

      // ~~strikethrough~~
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('some text ~~strike~~', { delay: 10 });
      await editor.press(' ');
      await expect(block.locator(strikeSelector)).toContainText('strike', { timeout: 5000 });
      expect(await editor.textContent()).toMatch(/some text strike\s/);

      // *italic*
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('some text *italic*', { delay: 10 });
      await editor.press(' ');
      await expect(block.locator(italicSelector)).toContainText('italic', { timeout: 5000 });
      expect(await editor.textContent()).toMatch(/some text italic\s/);

      // _italic_
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('some text _emphasis_', { delay: 10 });
      await editor.press(' ');
      await expect(block.locator(italicSelector)).toContainText('emphasis', { timeout: 5000 });
      expect(await editor.textContent()).toMatch(/some text emphasis\s/);
    });
  });

  test.describe('New block shortcuts', () => {
    test('- space converts to bullet list in a newly created block', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const iframe = helper.getIframe();

      // Enter edit mode, move to end, and press Enter to create a new block
      const editor = await helper.enterEditMode(blockId);
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('Some text', { delay: 10 });
      await helper.waitForEditorText(editor, /Some text/);

      const initialBlocks = await helper.getStableBlockCount();
      await editor.press('Enter');
      await helper.waitForBlockCountToBe(initialBlocks + 1, 5000);

      // Find the new block (already selected/focused after Enter)
      const blockOrder = await helper.getBlockOrder();
      const originalBlockIndex = blockOrder.indexOf(blockId);
      const newBlockUid = blockOrder[originalBlockIndex + 1];
      expect(newBlockUid).toBeTruthy();

      // The new block is already focused — type directly into it
      const newBlock = iframe.locator(`[data-block-uid="${newBlockUid}"] [data-editable-field]`);
      await expect(newBlock).toBeVisible({ timeout: 5000 });
      await newBlock.pressSequentially('-', { delay: 10 });
      await newBlock.press(' ');

      // Should convert to unordered list
      const li = iframe.locator(`[data-block-uid="${newBlockUid}"] ul li`);
      await expect(li).toBeVisible({ timeout: 5000 });

      await newBlock.pressSequentially('New block list', { delay: 10 });
      await expect(li).toContainText('New block list', { timeout: 5000 });
    });
  });

  test.describe('Unwrap on Backspace', () => {
    test('Backspace through heading text then unwrap leaves empty paragraph', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const iframe = helper.getIframe();
      const editor = await helper.enterEditMode(blockId);

      // Create H2 via markdown shortcut
      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('##', { delay: 10 });
      await editor.press(' ');

      const h2 = iframe.locator(`[data-block-uid="${blockId}"] h2`);
      await expect(h2).toBeVisible({ timeout: 5000 });

      // Type text into the heading
      await editor.pressSequentially('abc', { delay: 10 });
      await expect(h2).toContainText('abc', { timeout: 5000 });

      // Backspace 3 times to delete all chars, then once more to unwrap
      for (let i = 0; i < 3; i++) {
        await editor.press('Backspace');
      }
      await editor.press('Backspace');

      // Should be an empty paragraph — no leftover characters
      await expect(iframe.locator(`[data-block-uid="${blockId}"] h2`)).not.toBeVisible({ timeout: 5000 });
      const paragraph = iframe.locator(`[data-block-uid="${blockId}"] p`);
      await expect(paragraph).toBeVisible({ timeout: 5000 });
      await helper.waitForEditorText(paragraph, /^$/);
    });
  });

  test.describe('Non-matching patterns', () => {
    test('regular space does not trigger markdown', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      await helper.login();
      await helper.navigateToEdit('/test-page');

      const blockId = 'block-1-uuid';
      const editor = await helper.enterEditMode(blockId);

      await helper.selectAllTextInEditor(editor);
      await editor.pressSequentially('hello world', { delay: 10 });

      // Should still be a paragraph, not any special block
      const blockEl = helper.getIframe().locator(`[data-block-uid="${blockId}"]`);
      await expect(blockEl.locator('h2')).not.toBeVisible();
      await expect(blockEl.locator('h3')).not.toBeVisible();
      await expect(blockEl.locator('ul')).not.toBeVisible();
      await expect(blockEl.locator('ol')).not.toBeVisible();
      await expect(blockEl.locator('blockquote')).not.toBeVisible();
    });
  });
});
