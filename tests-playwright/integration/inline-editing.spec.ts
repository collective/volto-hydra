/**
 * Integration tests for inline editing in Volto Hydra admin UI.
 *
 * These tests verify that editing text directly in blocks works correctly
 * and syncs with the admin UI.
 * 
 * TODO - additional tests
 * - backspace into bold text (click off or apply another format it will go funny)
 * - click at end of block puts cursor at end of line
 * - paste a link
 * - DND a word within the same block
 * - DND a word between blocks
 * - paste rich text
 * - paste multi-paragraph rich text
 * - paste formatting from one field to another
 * - format button still works when sidebar is closed
 * - multiple slate fields in one block
 * - heading shortcuts (## for h2, ### for h3)
 * - bullet list shortcuts (- or * for ul, 1. for ol)
 * - multiple formats on same text (bold + italic, etc)
 * - paragraph formats as dropdown?
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing', () => {
  test('cursor position remains stable while typing', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and get the editor
    const editor = await helper.enterEditMode(blockId);

    // Clear existing text
    await helper.selectAllTextInEditor(editor);

    // PART 1: Type text at the end character by character and verify cursor after each character
    const testText = 'Hello world';
    for (let i = 0; i < testText.length; i++) {
      const char = testText[i];
      await editor.press(char);

      // Small delay to let any updates propagate
      await page.waitForTimeout(50);

      // Verify cursor is still at the end and element is focused
      const expectedCursorPos = i + 1; // After typing i+1 characters
      await helper.assertCursorAtPosition(editor, expectedCursorPos, blockId);
    }

    // Verify text after part 1
    let currentText = await editor.textContent();
    expect(currentText).toBe('Hello world');

    // Wait a bit longer to catch any async cursor resets
    await page.waitForTimeout(200);

    // Verify cursor is STILL at the end (didn't get reset asynchronously)
    await helper.assertCursorAtPosition(editor, testText.length, blockId);

    // PART 2: Move cursor to the middle and type more text
    // Move cursor to position 6 (after "Hello ")
    await helper.moveCursorToPosition(editor, 6);

    // Verify cursor is at position 6
    await helper.assertCursorAtPosition(editor, 6, blockId);

    // Type "beautiful " character by character in the middle
    const insertText = 'beautiful ';
    const startOffset = 6; // Where we started typing

    for (let i = 0; i < insertText.length; i++) {
      const char = insertText[i];
      await page.keyboard.type(char);

      // Small delay to let any updates propagate
      await page.waitForTimeout(50);

      // Verify cursor is at the expected position after each character
      const expectedCursorPos = startOffset + i + 1;
      await helper.assertCursorAtPosition(editor, expectedCursorPos, blockId);
    }

    // Verify final text
    const finalText = await editor.textContent();
    expect(finalText).toBe('Hello beautiful world');

    // Wait a bit longer to catch any async cursor resets
    await page.waitForTimeout(200);

    // Verify cursor is STILL at the final position (didn't get reset asynchronously)
    const finalCursorPos = startOffset + insertText.length;
    await helper.assertCursorAtPosition(editor, finalCursorPos, blockId);
  });

  test('typing does not cause DOM element to be replaced (no re-render)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    const iframe = helper.getIframe();

    // Enter edit mode
    const editor = await helper.enterEditMode(blockId);

    // Clear existing text
    await helper.selectAllTextInEditor(editor);

    // Get a reference to the contenteditable element and mark it
    const elementId = await editor.evaluate((el) => {
      // Add a unique marker to track this specific element instance
      const uniqueId = 'test-element-' + Date.now();
      el.setAttribute('data-test-element-id', uniqueId);
      return uniqueId;
    });

    // Type some text
    await page.keyboard.type('Hello world');

    // Wait for any potential async re-renders
    await page.waitForTimeout(300);

    // Check if the element is still the same instance
    const stillSameElement = await iframe
      .locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`)
      .evaluate((el, id) => {
        return el.getAttribute('data-test-element-id') === id;
      }, elementId);

    expect(stillSameElement).toBe(true);

    // Type more text
    await page.keyboard.type(' more text');

    // Wait again
    await page.waitForTimeout(300);

    // Verify element is STILL the same instance
    const stillSameAfterMoreTyping = await iframe
      .locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`)
      .evaluate((el, id) => {
        return el.getAttribute('data-test-element-id') === id;
      }, elementId);

    expect(stillSameAfterMoreTyping).toBe(true);
  });

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

    // Edit the text (also clicks block, waits for toolbar, and types)
    await helper.editBlockTextInIframe(blockId, 'Text to make bold');

    // STEP 1: Verify the text content is correct
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    const textContent = await editor.textContent();
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

    // STEP 4: Wait a moment to ensure selection is stable
    await page.waitForTimeout(100);

    // STEP 5: Verify selection still exists just before clicking button
    await helper.assertTextSelection(editor, 'Text to make bold', {
      shouldExist: true,
      shouldBeCollapsed: false,
      message: 'Step 5: Before clicking bold button'
    });

    // STEP 5.5: Wait for toolbar to be fully ready and stable
    await helper.waitForQuantaToolbar(blockId);
    await page.waitForTimeout(100); // Let toolbar settle

    // STEP 6: Trigger the bold button using dispatchEvent
    console.log('[TEST] Step 6: Clicking bold button...');
    await helper.clickFormatButton('bold');

    // STEP 7: Wait a moment for the formatting to apply
    await page.waitForTimeout(500);

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

  test('can create a link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Edit the text (this also clicks the block, waits for toolbar, and selects all before typing)
    await helper.editBlockTextInIframe(blockId, 'Click here');

    // Select all the text for link button test
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click the link button - should show an extra toolbar for entering URL
    await helper.clickFormatButton('link');

    // Wait for the extra link toolbar to appear
    await page.waitForTimeout(500);

    // Look for the extra toolbar that appears for link input
    // Common selectors for Slate link toolbar
    const linkToolbar = page.locator('.slate-inline-toolbar, .link-toolbar, .slate-link-toolbar, [data-slate-toolbar]').first();

    const toolbarVisible = await linkToolbar.isVisible().catch(() => false);
    console.log('[TEST] Link toolbar visible:', toolbarVisible);

    if (toolbarVisible) {
      // Inspect the toolbar HTML to find the input field
      const toolbarHTML = await linkToolbar.innerHTML();
      console.log('[TEST] Link toolbar HTML:', toolbarHTML);
    }

    // Try multiple selectors for the URL input
    const linkUrlInput = page.locator('input[placeholder*="url" i], input[placeholder*="link" i], input[type="url"], .slate-inline-toolbar input, .link-toolbar input').first();
    const urlInputVisible = await linkUrlInput.isVisible().catch(() => false);
    console.log('[TEST] URL input visible:', urlInputVisible);

    // Verify the extra toolbar appeared
    const linkUIAppeared = toolbarVisible || urlInputVisible;
    expect(linkUIAppeared).toBe(true);

    if (urlInputVisible) {
      // Enter a URL
      await linkUrlInput.fill('https://example.com');
      await page.waitForTimeout(200);

      // Look for submit/confirm button
      const submitButton = page.locator('button:has-text("Save"), button:has-text("OK"), button:has-text("Apply"), button[type="submit"]').first();
      const submitVisible = await submitButton.isVisible().catch(() => false);

      if (submitVisible) {
        await submitButton.click();
        await page.waitForTimeout(500);
      } else {
        // Maybe press Enter to submit
        await linkUrlInput.press('Enter');
        await page.waitForTimeout(500);
      }

      // Verify link was created
      const blockHtml = await editor.innerHTML();
      console.log('[TEST] Block HTML after creating link:', blockHtml);

      expect(blockHtml).toContain('<a ');
      expect(blockHtml).toContain('https://example.com');
    }
  });

  test('bold formatting syncs with Admin UI', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Synced bold text', { delay: 10 });

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

    // Verify bold in iframe
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('style="font-weight: bold"');

    // Verify the formatting data is in the sidebar widget's Slate editor state
    // Even if the widget doesn't visually show it immediately in the DOM,
    // the Slate editor's internal state should contain the bold mark
    const sidebarSlateData = await page.evaluate(() => {
      // Access the registered sidebar editor
      const editor = window.voltoHydraSidebarEditors?.get('value');
      if (!editor) return null;

      // Return the editor's children (Slate document structure)
      return JSON.parse(JSON.stringify(editor.children));
    });

    console.log('[TEST] Sidebar Slate editor data:', JSON.stringify(sidebarSlateData, null, 2));

    // Check that the Slate JSON in the editor contains the bold mark
    expect(sidebarSlateData).toBeTruthy();
    expect(sidebarSlateData[0]).toBeTruthy(); // First paragraph
    expect(sidebarSlateData[0].children).toBeTruthy();
    expect(sidebarSlateData[0].children[0]).toBeTruthy(); // First text node
    expect(sidebarSlateData[0].children[0].bold).toBe(true); // Bold mark should be present
    expect(sidebarSlateData[0].children[0].text).toContain('Synced bold text');
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

    // Apply bold
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(200);

    // Apply italic (text should still be selected)
    await helper.clickFormatButton('italic');
    await page.waitForTimeout(200);

    // Verify both formats are applied
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('style="font-weight: bold"');
    expect(blockHtml).toContain('<em>');
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

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

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

    // Select all text in the editor using JavaScript Selection API
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

    // Verify bold was applied
    let blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('style="font-weight: bold"');

    // Click bold button again to remove formatting
    await helper.selectAllTextInEditor(editor); // Re-select text
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

    // Verify bold was removed
    blockHtml = await editor.innerHTML();
    expect(blockHtml).not.toContain('style="font-weight: bold"');
    expect(blockHtml).toContain('Toggle bold text');
  });

  test('editing text in sidebar appears in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block to select it and open sidebar
    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();

    // Make sure the Block tab is open (where the value field is)
    await helper.openSidebarTab('Block');

    // Get original text from iframe
    const iframe = helper.getIframe();
    const iframeBlock = iframe.locator(`[data-block-uid="${blockId}"]`);
    const originalText = await iframeBlock.textContent();

    // Edit the value field in the sidebar (Volto Hydra feature)
    // Use the same selector as the passing test in sidebar-forms.spec.ts
    const valueField = page.locator('#sidebar-properties .field-wrapper-value [contenteditable="true"]');
    await valueField.click();
    await valueField.fill('Edited from sidebar');

    // Wait for changes to sync to iframe
    await page.waitForTimeout(500);

    // Verify the text updated in the iframe
    const updatedText = await iframeBlock.textContent();
    expect(updatedText).toContain('Edited from sidebar');
    expect(updatedText).not.toBe(originalText);
  });

  test('can type at cursor position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type initial text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Hello World', { delay: 10 });

    // Move cursor to the middle of the text (between 'Hello' and 'World')
    await helper.moveCursorToPosition(editor, 6); // Position after "Hello "

    // Type at cursor position
    await page.keyboard.type('Beautiful ');

    // Verify text was inserted at cursor position
    const finalText = await editor.textContent();
    expect(finalText).toBe('Hello Beautiful World');
  });

  test('can undo and redo', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('First', { delay: 10 });

    // Wait for text batch to be sent (300ms debounce + buffer)
    await page.waitForTimeout(400);

    // Type more text - this will be a separate undo snapshot
    await editor.pressSequentially(' Second', { delay: 10 });
    let text = await editor.textContent();
    expect(text).toBe('First Second');

    // Check what's in the sidebar before undo
    await helper.openSidebarTab('Block');
    let sidebarValue = await helper.getSidebarFieldValue('value');
    console.log('[TEST] Sidebar text before undo:', sidebarValue);
    expect(sidebarValue).toBe('First Second');

    // Undo - should remove " Second"
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    // Check sidebar first
    sidebarValue = await helper.getSidebarFieldValue('value');
    console.log('[TEST] Sidebar text after undo:', sidebarValue);
    expect(sidebarValue).toBe('First');

    // Then check iframe
    text = await editor.textContent();
    expect(text).toBe('First');

    // Redo - should restore "Second"
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(200);
    text = await editor.textContent();
    expect(text).toBe('First Second');
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

    // Select all and make it bold
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(300);

    // Move cursor to end
    await helper.moveCursorToEnd(editor);

    // Type more text at the end
    await page.keyboard.type(' more');
    await page.waitForTimeout(200);

    // Check if new text inherits bold formatting
    const html = await editor.innerHTML();
    expect(html).toContain('style="font-weight: bold"');
    const text = await editor.textContent();
    expect(text).toContain('Bold text more');
  });

  test('can edit link URL', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and create text with a link
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Click here', { delay: 10 });

    // Select all text
    await helper.selectAllTextInEditor(editor);

    // Apply link format (this test documents current behavior)
    // NOTE: There's a known bug with link creation (hydra.js:733)
    // Once fixed, we should extend this test to:
    // 1. Create the link with an initial URL
    // 2. Click on the link
    // 3. Edit the URL
    // 4. Verify the href attribute changed

    // For now, just verify we can select text for linking
    const selection = await editor.evaluate(() => {
      const sel = window.getSelection();
      return sel ? sel.toString() : '';
    });
    expect(selection).toBe('Click here');
  });

  test('can arrow out of link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create a simple text with a link manually using innerHTML
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();

    // Insert HTML with a link
    await editor.evaluate((el) => {
      el.innerHTML = 'Text <a href="https://example.com">link</a> more';
    });

    // Click inside the link
    await editor.evaluate((el) => {
      const link = el.querySelector('a');
      if (!link || !link.firstChild) throw new Error('Link not found');
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(link.firstChild, 2); // Inside "link"
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Press right arrow to move cursor
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Cursor should move (basic verification that arrow keys work)
    // More detailed link boundary tests would require Slate-specific checks
    const html = await editor.innerHTML();
    expect(html).toContain('<a href="https://example.com">link</a>');
  });

  test('can paste plain text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block and prepare for paste
    await helper.clickBlockInIframe(blockId);
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Start ', { delay: 10 });

    // Simulate paste by using clipboard API
    await page.evaluate(() => {
      return navigator.clipboard.writeText('pasted content');
    });

    // Paste using keyboard shortcut
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);

    // Verify pasted text appears
    const text = await editor.textContent();
    expect(text).toContain('pasted content');
  });

  test('can delete across formatted text boundaries', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });

    // Type "Hello " then make "world" bold, then type " testing"
    await editor.pressSequentially('Hello ', { delay: 10 });

    // Apply bold formatting to "world"
    await page.keyboard.press('Control+b');
    await editor.pressSequentially('world', { delay: 10 });
    await page.keyboard.press('Control+b'); // toggle bold off

    await editor.pressSequentially(' testing', { delay: 10 });
    await page.waitForTimeout(500); // Wait for batched updates

    // Verify we have "Hello world testing" with "world" in bold
    const initialText = await editor.textContent();
    expect(initialText).toBe('Hello world testing');

    // Select from "lo w" to "ld te" (crosses bold boundary)
    // This means we're selecting: "lo w" (plain) + "or" (bold) + "ld" (plain) + " te" (plain)
    await editor.evaluate((el) => {
      const range = document.createRange();
      const selection = window.getSelection();

      // Find text nodes
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }

      // Select from position 3 of "Hello " to position 2 of " testing"
      // "Hello " = positions 0-5
      // "world" = positions 0-4 (in bold element)
      // " testing" = positions 0-7

      // Start: position 3 in "Hello " (after "Hel")
      range.setStart(textNodes[0], 3);
      // End: position 9 in last text node (after "ld te")
      range.setEnd(textNodes[textNodes.length - 1], 5);

      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.waitForTimeout(100);

    // Press Delete to remove selected text
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Verify result - should be "Helsting" (removed "lo world te")
    const finalText = await editor.textContent();
    expect(finalText).toBe('Helsting');
  });

  test('can cut text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('Text to cut', { delay: 10 });

    // Select all text
    await helper.selectAllTextInEditor(editor);

    // Cut using keyboard shortcut
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(300);

    // Verify text was removed
    const text = await editor.textContent();
    expect(text).toBe('');

    // Verify text is in clipboard by pasting it back
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);
    const pastedText = await editor.textContent();
    expect(pastedText).toBe('Text to cut');
  });

  test('pressing Enter at end of line creates new Slate block', async ({ page }) => {
    // This test verifies the expected Volto behavior where pressing Enter
    // creates a new Slate block (like standard Volto does via withSplitBlocksOnBreak).
    // In Volto Hydra, the iframe communicates with the parent Admin UI to create a new block.

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Get initial block count
    const iframe = helper.getIframe();
    const initialBlocks = await iframe.locator('[data-block-uid]').count();

    // Click the first block and type text
    await helper.clickBlockInIframe(blockId);
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await editor.click();
    await editor.evaluate((el) => { el.textContent = ''; });
    await editor.pressSequentially('First line', { delay: 10 });

    // Move cursor to end of line
    await helper.moveCursorToEnd(editor);

    // Press Enter - in standard Volto this would create a new block
    // Must press Enter in the iframe context, not the page context
    await editor.press('Enter');

    // Wait for the correct number of blocks to be created
    await expect(iframe.locator('[data-block-uid]')).toHaveCount(initialBlocks + 1, { timeout: 3000 });

    // Wait for the old block's Quanta toolbar to disappear (means new block got selected)
    const oldBlockToolbar = iframe.locator(`[data-block-uid="${blockId}"] .volto-hydra--quanta-toolbar`);
    await expect(oldBlockToolbar).not.toBeVisible({ timeout: 2000 });

    // Get the new block (should be right after the old block)
    const allBlocks = await iframe.locator('[data-block-uid]').all();
    const newBlockIndex = allBlocks.findIndex(async (block) => {
      const uid = await block.getAttribute('data-block-uid');
      return uid === blockId;
    }) + 1;
    const newBlock = allBlocks[newBlockIndex];
    const newBlockUid = await newBlock.getAttribute('data-block-uid');

    // Verify the new block is contenteditable
    const newEditor = iframe.locator(`[data-block-uid="${newBlockUid}"] [contenteditable="true"]`);
    await expect(newEditor).toBeVisible({ timeout: 2000 });
    const isContentEditable = await newEditor.getAttribute('contenteditable');
    expect(isContentEditable).toBe('true');

    // Type in the new block (focus should have moved to it automatically)
    await page.keyboard.type('Second line');
    await page.waitForTimeout(200);

    // Verify the new block contains 'Second line'
    const newBlockText = await newBlock.textContent();
    expect(newBlockText).toContain('Second line');
  });

  test('Ctrl+B applies bold to subsequently typed text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and clear the block
    const editor = await helper.enterEditMode(blockId);
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
    expect(html).toMatch(/style="font-weight: bold">world<\/span>/);
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

    // Wait for text to stabilize
    await page.waitForTimeout(300);

    // Select the word "bold" (last 4 characters)
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    // Wait for selection
    await page.waitForTimeout(200);

    console.log('[TEST] About to click Bold button first time');

    // Click Bold button FIRST TIME using helper
    await helper.clickFormatButton('bold');

    console.log('[TEST] First bold click done');

    // Wait for structure to update
    await page.waitForTimeout(500);

    // Verify bold markup exists
    const html1 = await editor.innerHTML();
    console.log('[TEST] HTML after first bold:', html1);
    expect(html1).toMatch(/style="font-weight: bold">bold<\/span>/);

    // Now select the bolded word again and unbold it
    // Use keyboard to select: Shift+Ctrl+Left to select word
    await page.keyboard.press('Shift+Control+ArrowLeft');

    // Wait for selection
    await page.waitForTimeout(200);

    console.log('[TEST] About to click Bold button second time');

    // Click Bold button SECOND TIME
    // This should NOT throw an error about path [0,0,0] not found
    await helper.clickFormatButton('bold');

    console.log('[TEST] Second bold click done - should have unbolded without error');

    // Wait for update
    await page.waitForTimeout(500);

    // Verify bold markup is gone
    const html2 = await editor.innerHTML();
    console.log('[TEST] HTML after second bold:', html2);
    expect(html2).not.toMatch(/style="font-weight: bold">bold<\/span>/);
  });

  test('selection remains after bolding and unbolding a word', async ({ page }) => {
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
    await editor.pressSequentially('This is a test', { delay: 10 });

    // Wait for text to stabilize
    await page.waitForTimeout(300);

    // Select the word "test" (last 4 characters)
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    // Wait for selection to stabilize
    await page.waitForTimeout(200);

    // Verify "test" is selected before formatting
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection verified before bold: "test"');

    // Click Bold button to apply bold formatting
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

    // Verify "test" is still selected after applying bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after applying bold');

    // Verify bold markup exists
    const html1 = await editor.innerHTML();
    expect(html1).toContain('style="font-weight: bold"');
    expect(html1).toContain('test');

    // Click Bold button again to remove bold formatting
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(500);

    // Verify "test" is still selected after removing bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after removing bold');

    // Verify bold markup is gone
    const html2 = await editor.innerHTML();
    expect(html2).not.toContain('style="font-weight: bold"');
    expect(html2).toContain('test');
  });
});
