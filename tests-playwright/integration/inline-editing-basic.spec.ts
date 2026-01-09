/**
 * Basic cursor, typing, selection, and sync tests for inline editing in Volto Hydra admin UI.
 *
 * TODO - additional tests:
 * - click at end of block puts cursor at end of line
 * - paste formatting from one field to another
 * - multiple slate fields in one block
 * - double click on an unselected block and you should have the word selected
 * - double click to select block and word
 * - triple click to select paragraph
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Basic', () => {
  test('selection is always inside element with data-node-id after block click', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    const iframe = helper.getIframe();

    // Click on block to select it
    await helper.clickBlockInIframe(blockId);

    // Verify cursor is in a valid position (inside an element with data-node-id)
    const cursorInfo = await iframe.locator(`[data-block-uid="${blockId}"]`).evaluate((block) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        return { hasSelection: false, inValidNode: false };
      }
      const anchorNode = selection.anchorNode;
      if (!anchorNode) {
        return { hasSelection: true, inValidNode: false };
      }

      // Walk up to find data-node-id
      let current: Node | null = anchorNode;
      while (current && current !== block) {
        if (current.nodeType === Node.ELEMENT_NODE) {
          const el = current as Element;
          if (el.hasAttribute('data-node-id')) {
            return { hasSelection: true, inValidNode: true, nodeId: el.getAttribute('data-node-id') };
          }
        }
        current = current.parentNode;
      }
      return { hasSelection: true, inValidNode: false, anchorContent: anchorNode.textContent?.substring(0, 30) };
    });

    expect(cursorInfo.inValidNode, `Cursor should be inside element with data-node-id. Got: ${JSON.stringify(cursorInfo)}`).toBe(true);
  });

  // This test uses #render-counter which only exists in mock test frontend
  test('cursor position remains stable while typing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'nuxt', 'Uses #render-counter which only exists in mock frontend');
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    const iframe = helper.getIframe();

    // Enter edit mode and get the editor
    const editor = await helper.enterEditMode(blockId);

    // Get initial render count after block is selected and ready
    const initialRenderCount = await iframe.locator('#render-counter').textContent();

    // Clear existing text
    await helper.selectAllTextInEditor(editor);

    // Type text at the end
    await editor.pressSequentially('Hello World', { delay: 20 });

    // Wait for debounce (300ms) + buffer
    await page.waitForTimeout(500);

    // Simple text edits should NOT trigger re-render
    const afterTypingCount = await iframe.locator('#render-counter').textContent();
    expect(afterTypingCount).toBe(initialRenderCount);

    // Check cursor is at end after typing (position 11 = length of "Hello World")
    const cursorAfterTyping = await helper.getCursorInfo(editor);
    expect(cursorAfterTyping.cursorOffset, `Cursor should be at end after typing. Got: ${JSON.stringify(cursorAfterTyping)}`).toBe(11);

    // Move cursor to start - NO re-render should happen
    // Note: Home key and Meta+ArrowLeft don't work cross-platform with hydra.js.
    // Using helper that sets selection via JavaScript.
    await helper.moveCursorToStart(editor);
    const renderAfterHome = await iframe.locator('#render-counter').textContent();
    expect(renderAfterHome, `Render count should not change on cursor navigation`).toBe(initialRenderCount);
    const cursorAfterHome = await helper.getCursorInfo(editor);
    expect(cursorAfterHome.cursorOffset, `Cursor should be at 0 after moveCursorToStart. Got: ${JSON.stringify(cursorAfterHome)}`).toBe(0);

    // Move cursor right 6 positions (after "Hello ") - NO re-render should happen
    for (let i = 0; i < 6; i++) {
      await editor.press('ArrowRight');
    }
    const renderAfterArrows = await iframe.locator('#render-counter').textContent();
    expect(renderAfterArrows, `Render count should not change on ArrowRight keys`).toBe(initialRenderCount);
    const cursorAfterArrows = await helper.getCursorInfo(editor);
    expect(cursorAfterArrows.cursorOffset, `Cursor should be at 6 after 6x ArrowRight. Got: ${JSON.stringify(cursorAfterArrows)}`).toBe(6);

    // Type at cursor position
    await page.keyboard.type('Beautiful ');

    // Assert cursor is now at position 16 (6 + 10 chars of "Beautiful ")
    await helper.assertCursorAtPosition(editor, 16, blockId);

    // Wait for debounce again
    await page.waitForTimeout(500);

    // Still no re-render
    const finalRenderCount = await iframe.locator('#render-counter').textContent();
    expect(finalRenderCount).toBe(initialRenderCount);

    // Verify text was inserted at cursor position
    const finalText = await helper.getCleanTextContent(editor);
    expect(finalText).toBe('Hello Beautiful World');
  });

  // This test verifies DOM element identity which may differ in Vue due to reactivity
  test('typing does not cause DOM element to be replaced (no re-render)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'nuxt', 'Vue reactivity may replace DOM elements differently');
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
    const editorAfterType = await helper.getEditorLocator(blockId);
    const stillSameElement = await editorAfterType.evaluate((el, id) => {
      return el.getAttribute('data-test-element-id') === id;
    }, elementId);

    expect(stillSameElement).toBe(true);

    // Type more text
    await page.keyboard.type(' more text');

    // Wait again
    await page.waitForTimeout(300);

    // Verify element is STILL the same instance
    const editorAfterMore = await helper.getEditorLocator(blockId);
    const stillSameAfterMoreTyping = await editorAfterMore.evaluate((el, id) => {
      return el.getAttribute('data-test-element-id') === id;
    }, elementId);

    expect(stillSameAfterMoreTyping).toBe(true);
  });

  test('can type at cursor position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type initial text (select all to replace existing content)
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Hello World', { delay: 10 });

    // Move cursor to the middle of the text (between 'Hello' and 'World')
    await helper.moveCursorToPosition(editor, 6); // Position after "Hello "

    // Type at cursor position
    await page.keyboard.type('Beautiful ');

    // Verify text was inserted at cursor position
    const finalText = await helper.getCleanTextContent(editor);
    expect(finalText).toBe('Hello Beautiful World');
  });

  // BUG: Typing BEFORE an inline format element (bold) fails to sync on second keystroke
  // Block structure: "This text appears..." + <strong>bold text</strong> + " to test..."
  // When typing in children[0] (before bold), sidebar loses sync after first keystroke
  //
  // ROOT CAUSE: Slate's `editor.children = value` direct mutation doesn't trigger DOM
  // re-renders for text nodes before inline formatting. The React data flow is correct
  // (ParentBlocksWidget receives "12appears") but Slate's DOM doesn't update.
  // This is a volto-slate internal issue, not a Hydra state management bug.
  // See docs/typing-sync-bug-investigation.md for full analysis
  test.skip('typing before bold: second keystroke fails to sync to sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    // text-after block has mixed content: text + bold + text
    const blockId = 'text-after';

    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();

    const editor = await helper.enterEditMode(blockId);

    // Position cursor BEFORE the bold element - at offset 10 in "This text appears..."
    await helper.moveCursorToPosition(editor, 10);

    const sidebarEditor = helper.getSidebarSlateEditor('value');

    // Type first character - this syncs correctly
    await page.keyboard.type('1');
    await page.waitForTimeout(500);
    let iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).toBe('This text 1appears after the slider. Click on bold text to test getNodePath.');
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });

    // Type second character after waiting - THIS FAILS TO SYNC
    await page.keyboard.type('2');
    await page.waitForTimeout(500);
    iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).toBe('This text 12appears after the slider. Click on bold text to test getNodePath.');
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });

    // Type third character
    await page.keyboard.type('3');
    await page.waitForTimeout(500);
    iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).toBe('This text 123appears after the slider. Click on bold text to test getNodePath.');
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });
  });

  // Typing AFTER an inline format element (bold) works correctly
  // This test passes - contrast with "typing before bold" which fails
  test('typing after bold: all keystrokes sync to sidebar correctly', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    // text-after block has: "This text appears..." + <bold>bold text</bold> + " to test getNodePath."
    const blockId = 'text-after';

    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();

    const editor = await helper.enterEditMode(blockId);

    // Position cursor AFTER the bold element - at start of " to test getNodePath."
    // "This text appears after the slider. Click on " (46 chars) + "bold text" (9 chars) = offset 55
    await helper.moveCursorToPosition(editor, 55);

    const sidebarEditor = helper.getSidebarSlateEditor('value');

    // Type first character
    await page.keyboard.type('1');
    await page.waitForTimeout(500);
    let iframeText = await helper.getCleanTextContent(editor);
    // Use regex to be flexible with whitespace around the inserted "1"
    expect(iframeText).toMatch(/bold text\s*1\s*to test/);
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });

    // Type second character after waiting - this works!
    await page.keyboard.type('2');
    await page.waitForTimeout(500);
    iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).toMatch(/bold text\s*12\s*to test/);
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });

    // Type third character
    await page.keyboard.type('3');
    await page.waitForTimeout(500);
    iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).toMatch(/bold text\s*123\s*to test/);
    await expect(sidebarEditor).toHaveText(iframeText, { timeout: 5000 });
  });

  test('deleting formatted text syncs to sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const blockId = 'text-after';

    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();

    const editor = await helper.enterEditMode(blockId);
    const sidebarEditor = helper.getSidebarSlateEditor('value');

    // Verify initial content has "bold text"
    await expect(sidebarEditor).toContainText('bold text', { timeout: 5000 });

    // Select "bold text" using character offsets
    // Text is: "This text appears after the slider. Click on bold text to test getNodePath."
    // "This text appears after the slider. Click on " = 45 chars
    // "bold text" = 9 chars (45-54)
    await helper.selectTextRange(editor, 45, 54);

    // Verify what was selected
    const selectionInfo = await helper.assertTextSelection(editor, 'bold text');
    expect(selectionInfo.selectedText).toBe('bold text');

    // Delete
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Verify iframe no longer has bold text
    const iframeText = await helper.getCleanTextContent(editor);
    expect(iframeText).not.toContain('bold text');

    // Verify sidebar synced
    await expect(sidebarEditor).not.toContainText('bold text', { timeout: 5000 });
  });

  test.skip('can undo and redo', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and edit text (select all to replace existing content)
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('First', { delay: 10 });

    // Wait for text batch to be sent (300ms debounce + buffer)
    await page.waitForTimeout(400);

    // Type more text - this will be a separate undo snapshot
    await editor.pressSequentially(' Second', { delay: 10 });
    let text = await helper.getCleanTextContent(editor);
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
    text = await helper.getCleanTextContent(editor);
    expect(text).toBe('First');

    // Redo - should restore "Second"
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(200);
    text = await helper.getCleanTextContent(editor);
    expect(text).toBe('First Second');
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

    // Click the first block and type text (select all to replace existing content)
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('First line', { delay: 10 });

    // Click past the end of text to position cursor on whitespace (simulates real user click)
    // This tests the whitespace correction code path
    const editorBox = await editor.boundingBox();
    if (editorBox) {
      // Click at the right edge of the editor, past the text content
      await iframe.locator(`[data-block-uid="${blockId}"]`).click({
        position: { x: editorBox.width - 5, y: editorBox.height / 2 },
      });
    }

    // Press Enter - in standard Volto this would create a new block
    // Must press Enter in the iframe context, not the page context
    await editor.press('Enter');

    // Wait for the correct number of blocks to be created
    await expect(iframe.locator('[data-block-uid]')).toHaveCount(initialBlocks + 1, { timeout: 3000 });

    // Check that no error toast appeared (Missing data-node-id)
    const errorToast = iframe.locator('#hydra-dev-warning');
    await expect(errorToast).not.toBeVisible({ timeout: 1000 });

    // Get the new block (should be right after the old block)
    const blockOrder = await helper.getBlockOrder();
    const originalBlockIndex = blockOrder.indexOf(blockId);
    expect(originalBlockIndex).toBeGreaterThanOrEqual(0);
    const newBlockUid = blockOrder[originalBlockIndex + 1];
    expect(newBlockUid).toBeTruthy();
    const newBlock = iframe.locator(`[data-block-uid="${newBlockUid}"]`);

    // Wait for the new block to be selected (visible with toolbar)
    await helper.waitForBlockSelected(newBlockUid!);

    // Verify the new block is contenteditable
    const newEditor = await helper.getEditorLocator(newBlockUid!);
    const isContentEditable = await newEditor.getAttribute('contenteditable');
    expect(isContentEditable).toBe('true');

    // Type in the new block - need to use newEditor.pressSequentially for iframe content
    await newEditor.click();
    await newEditor.pressSequentially('Second line', { delay: 10 });
    await page.waitForTimeout(200);

    // Verify the new block contains 'Second line'
    const newBlockText = await newBlock.textContent();
    expect(newBlockText).toContain('Second line');
  });

  test('editing text in Admin UI updates iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click block in iframe to select it and show sidebar
    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();

    // Edit text in the sidebar Slate editor (field name is 'value' for slate blocks)
    const newText = 'Make this bold';
    await helper.setSidebarFieldValue('value', newText);

    // Verify the iframe updated with the new text (wait for sync)
    await expect(async () => {
      const iframeText = await helper.getBlockTextInIframe(blockId);
      expect(iframeText).toContain(newText);
    }).toPass({ timeout: 5000 });

    // Select all text in the sidebar editor and apply bold formatting
    const sidebarEditor = helper.getSidebarSlateEditor('value');

    // Wait for sidebar editor to have the correct content (sync might cause re-render)
    await expect(sidebarEditor).toHaveText(newText, { timeout: 5000 });

    await sidebarEditor.click();
    await sidebarEditor.press('ControlOrMeta+a'); // Select all

    // Verify text is selected
    await expect(async () => {
      const selectedText = await sidebarEditor.evaluate(() => window.getSelection()?.toString());
      expect(selectedText).toBe(newText);
    }).toPass({ timeout: 5000 });

    // Wait for the sidebar's floating toolbar to appear and click bold
    const sidebarToolbar = await helper.waitForSidebarSlateToolbar();
    const sidebarBoldButton = await helper.getSidebarToolbarButton(sidebarToolbar, 'bold');
    await sidebarBoldButton.click();

    // Verify the iframe shows bold formatting (all text should be bold)
    const editor = await helper.enterEditMode(blockId);
    await helper.waitForFormattedText(editor, newText, 'bold', { timeout: 10000 });

    // Click on the block in the iframe to verify selection still works after editing
    await helper.clickBlockInIframe(blockId);
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
    const valueField = helper.getSidebarSlateEditor('value');
    await valueField.click();
    await valueField.fill('Edited from sidebar');

    // Wait for changes to sync to iframe
    await page.waitForTimeout(500);

    // Verify the text updated in the iframe
    const updatedText = await iframeBlock.textContent();
    expect(updatedText).toContain('Edited from sidebar');
    expect(updatedText).not.toBe(originalText);
  });

  // BUG: Selecting in iframe, then applying format from sidebar causes path error
  // when clicking back to iframe
  test('applying format from sidebar after iframe selection works', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Step 1: Enter edit mode in iframe and type some text (select all to replace)
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Make this bold', { delay: 10 });
    await helper.waitForEditorText(editor, /Make this bold/);
    console.log('[TEST] Typed text in iframe');

    // Step 2: Select all text in the iframe
    await helper.selectAllTextInEditor(editor);

    // Verify selection
    const selectedText = await editor.evaluate(() => window.getSelection()?.toString());
    console.log('[TEST] Selected text in iframe:', selectedText);
    expect(selectedText).toBe('Make this bold');

    // Step 3: Click on sidebar to make a selection there and apply bold
    // The sidebar editor should have synced the content
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    const sidebarEditor = helper.getSidebarSlateEditor('value');

    // Wait for sidebar to sync content from iframe before applying formatting
    await expect(sidebarEditor).toHaveText('Make this bold', { timeout: 5000 });

    await sidebarEditor.click();
    await sidebarEditor.press('ControlOrMeta+a'); // Select all in sidebar
    console.log('[TEST] Applying bold via Ctrl+B in sidebar');
    await sidebarEditor.press('ControlOrMeta+b'); // Apply bold via keyboard shortcut

    // Wait for bold formatting to appear in iframe
    await helper.waitForFormattedText(editor, /Make this bold/, 'bold');
    console.log('[TEST] Bold applied successfully');

    // Step 4: Now remove bold from sidebar - select all again and toggle bold off
    await sidebarEditor.click();
    await sidebarEditor.press('ControlOrMeta+a'); // Select all in sidebar
    console.log('[TEST] Removing bold via Ctrl+B in sidebar');
    await sidebarEditor.press('ControlOrMeta+b'); // Remove bold via keyboard shortcut

    // Wait for bold formatting to be removed from iframe
    await helper.waitForFormattingRemoved(editor, 'bold');
    console.log('[TEST] Bold removed successfully');

    // Step 5: Click back on the iframe editor - this is where the path error may occur
    console.log('[TEST] Clicking back to iframe editor');
    await editor.click();

    // If we get here without error, the bug is fixed
    // Verify text is still there
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('Make this bold');

    console.log('[TEST] Format toggle from sidebar and click back to iframe successful');
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

  test('click and drag selects text range', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and set up text
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Hello beautiful world', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello beautiful world/);

    // Get the bounding box to calculate drag positions
    const box = await editor.boundingBox();
    if (!box) throw new Error('Could not get editor bounding box');

    // Click at the start of the editor and drag to select "Hello"
    // Start from left edge + small offset, drag to approximately after "Hello"
    const startX = box.x + 5;
    const startY = box.y + box.height / 2;
    // "Hello" is 5 characters, estimate ~8px per character
    const endX = box.x + 45;
    const endY = startY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    // Wait for selection to stabilize
    await page.waitForTimeout(100);

    // Verify some text is selected (exact text depends on font metrics)
    const selectionInfo = await helper.getSelectionInfo(editor);
    expect(selectionInfo.isCollapsed).toBe(false);

    // The selected text should start with "Hello" or be a subset
    const selectedText = await editor.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });
    expect(selectedText.length).toBeGreaterThan(0);
    console.log('[TEST] Click and drag selected:', selectedText);
  });

  test('double click selects a word', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and set up text
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Hello beautiful world', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello beautiful world/);

    // Double click on "beautiful" to select it
    const box = await editor.boundingBox();
    if (!box) throw new Error('Could not get editor bounding box');

    // "Hello " is 6 chars, "beautiful" starts at char 6
    // Estimate ~8px per character, click in the middle of "beautiful" (around char 10)
    const clickX = box.x + 10 * 8;
    const clickY = box.y + box.height / 2;

    await page.mouse.dblclick(clickX, clickY);

    // Wait for selection to stabilize
    await page.waitForTimeout(100);

    // Verify "beautiful" is selected
    const selectionInfo = await helper.getSelectionInfo(editor);
    expect(selectionInfo.isCollapsed).toBe(false);

    // Get the selected text
    const selectedText = await editor.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });
    expect(selectedText).toBe('beautiful');
  });

  test('triple click selects entire paragraph', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and set up text
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Hello beautiful world', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello beautiful world/);

    // Triple click to select entire paragraph
    await editor.click({ clickCount: 3 });

    // Wait for selection to stabilize
    await page.waitForTimeout(100);

    // Verify entire text is selected
    const selectionInfo = await helper.getSelectionInfo(editor);
    expect(selectionInfo.isCollapsed).toBe(false);

    // Get the selected text
    const selectedText = await editor.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });
    expect(selectedText).toBe('Hello beautiful world');
  });

  // SKIPPED: Home key doesn't work with hydra.js but works in plain iframes.
  // ArrowLeft, ArrowRight, End all work. Only Home fails.
  // Cmd+Left (Meta+ArrowLeft) works as alternative on macOS.
  // Root cause unknown - key is received, not prevented, but cursor doesn't move.
  // This is expected macOS behavior - use Cmd+Left (Meta+ArrowLeft) for start of line.
  // See: https://en.wikipedia.org/wiki/Home_key
  // but it doesn't explain why without hydra home did appear to work in our testing on a basic conteneditible
  test.skip('keyboard navigation with Home key', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    const editor = await helper.enterEditMode(blockId);

    // Clear and type text
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Hello World', { delay: 10 });

    // Verify cursor at end
    const cursorAfterTyping = await helper.getCursorInfo(editor);
    expect(cursorAfterTyping.cursorOffset).toBe(11);

    // ArrowLeft works
    await editor.press('ArrowLeft');
    const cursorAfterArrowLeft = await helper.getCursorInfo(editor);
    expect(cursorAfterArrowLeft.cursorOffset).toBe(10);

    // End works
    await editor.press('End');
    const cursorAfterEnd = await helper.getCursorInfo(editor);
    expect(cursorAfterEnd.cursorOffset).toBe(11);

    // Home does NOT work with hydra.js (cursor stays at 11)
    // But it DOES work in plain iframe contenteditables without hydra.js
    await editor.press('Home');
    const cursorAfterHome = await helper.getCursorInfo(editor);
    expect(cursorAfterHome.cursorOffset).toBe(0); // This fails - cursor stays at 11
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

    // Wait for text to appear
    await helper.waitForEditorText(editor, /This is a test/);

    // Select the word "test" (last 4 characters)
    // Use helper instead of page.keyboard.press('End') to avoid scrolling the window
    await helper.moveCursorToEnd(editor);
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

    // Wait for bold markup to appear
    await helper.waitForFormattedText(editor, 'test', 'bold');

    // Verify "test" is still selected after applying bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after applying bold');

    // Verify bold markup exists
    const boldSelector = helper.getFormatSelector('bold');
    await expect(editor.locator(boldSelector)).toBeVisible();
    expect(await editor.textContent()).toContain('test');

    // Click Bold button again to remove bold formatting
    await helper.clickFormatButton('bold');

    // Wait for bold markup to be removed
    await helper.waitForFormattingRemoved(editor, 'bold');

    // Verify "test" is still selected after removing bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after removing bold');

    // Verify bold markup is gone
    await expect(editor.locator(boldSelector)).not.toBeVisible();
    expect(await editor.textContent()).toContain('test');
  });

  test('empty editable field is visible and clickable', async ({ page }) => {
    // Empty editable fields should have minimum height so they're visible and clickable.
    // This tests the CSS rule that hydra.js injects for [data-editable-field]:empty
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    const iframe = helper.getIframe();

    // Enter edit mode and clear all content to make the block empty
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.press('Backspace');

    // Wait for the content to be cleared
    await page.waitForTimeout(200);

    // Click on a different block to deselect the empty block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForBlockSelected('block-2-uuid');

    // Get the editable field locator - handles both Nuxt (attr on root) and mock (attr on child)
    const editableField = iframe.locator(`[data-block-uid="${blockId}"] [data-editable-field="value"]`).or(
      iframe.locator(`[data-block-uid="${blockId}"][data-editable-field="value"]`)
    );

    // The empty field should still be visible (have height > 0) even when not selected
    await expect(editableField).toBeVisible();

    // Verify it has meaningful height (at least 1em ~ 16px typically)
    const height = await editableField.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height;
    });
    expect(height).toBeGreaterThan(10); // Should have at least 10px height when empty

    // Click on the empty block to select it - this should work because it has height
    await helper.clickBlockInIframe(blockId);

    // Verify the empty block is now selected
    await helper.waitForBlockSelected(blockId);
  });

  test('deleting across node boundaries (bold to normal text)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    // text-after block has: "This text appears..." + <bold>bold text</bold> + " to test getNodePath."
    const blockId = 'text-after';
    await helper.clickBlockInIframe(blockId);

    const editor = await helper.getEditorLocator(blockId);

    // Select across the boundary: from "ld" in "bold" to "to" in " to test"
    // "This text appears after the slider. Click on " (46 chars) + "bold" = starts at 46
    // We want to select "ld text to" which spans bold -> normal text
    // Adjust positions based on actual text offsets
    await helper.selectTextRange(editor, 47, 57);

    // Verify the selection spans the boundary
    const selectionInfo = await helper.assertTextSelection(editor, 'ld text to');
    console.log('[TEST] Cross-boundary selection:', selectionInfo.selectedText);

    // Press Delete to remove the selected text
    await page.keyboard.press('Delete');

    // Wait for deletion to complete
    await expect.poll(async () => {
      const text = await helper.getCleanTextContent(editor);
      return !text.includes('ld text to');
    }, { timeout: 5000 }).toBe(true);

    // Verify the result - should have "bo" + " test getNodePath."
    const finalText = await helper.getCleanTextContent(editor);
    console.log('[TEST] Text after delete:', finalText);
    expect(finalText).toContain('bo');
    expect(finalText).toContain('test getNodePath');
    expect(finalText).not.toContain('ld text to');

    // Verify cursor is collapsed at deletion point
    const cursorInfo = await helper.getCursorInfo(editor);
    expect(cursorInfo.isFocused).toBe(true);
    expect(cursorInfo.selectionCollapsed).toBe(true);
  });
});
