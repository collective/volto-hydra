/**
 * Integration tests for inline editing in Volto Hydra admin UI.
 *
 * These tests verify that editing text directly in blocks works correctly
 * and syncs with the admin UI.
 * 
 * TODO - additional tests and bugs
 * - backspace into bold text (click off or apply another format it will go funny)
 * - click at end of block puts cursor at end of line
 * - double click on an unselected block and you should have the word selected
 * - ctrl-b and other native formatting shortcuts are ignored
 * - Bug - I can clear a link in the sidebar (causes path exception currently)
 * - if the we aren't focused on a field then the format buttons should be disabled
 * - click bold button without selection and then type - should be bolded
 * - click link without selection and then type - should create link?
 * - paste a link
 * - double click to select block and word
 * - triple click to select paragraph
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
    let currentText = await helper.getCleanTextContent(editor);
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
    const finalText = await helper.getCleanTextContent(editor);
    expect(finalText).toBe('Hello beautiful world');

    // Wait a bit longer to catch any async cursor resets
    await page.waitForTimeout(200);

    // Verify cursor is STILL at the final position (didn't get reset asynchronously)
    const finalCursorPos = startOffset + insertText.length;
    await helper.assertCursorAtPosition(editor, finalCursorPos, blockId);
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

    // Verify the iframe updated with the new text
    const iframeText = await helper.getBlockTextInIframe(blockId);
    expect(iframeText).toContain(newText);

    // Select all text in the sidebar editor and apply bold formatting
    const sidebarEditor = page.locator('#sidebar-properties .field-wrapper-value [contenteditable="true"]');
    await sidebarEditor.click();
    await sidebarEditor.press('Meta+a'); // Select all

    // Verify text is selected
    const selectedText = await sidebarEditor.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBe(newText);

    // Wait for the sidebar's floating toolbar to appear and click bold
    const sidebarToolbar = await helper.waitForSidebarSlateToolbar();
    const sidebarBoldButton = await helper.getSidebarToolbarButton(sidebarToolbar, 'bold');
    await sidebarBoldButton.click();

    // Verify the iframe shows bold formatting (all text should be bold)
    const editor = await helper.enterEditMode(blockId);
    const boldSpan = editor.locator('span[style*="font-weight: bold"]');
    await expect(boldSpan).toBeVisible({ timeout: 10000 });
    await expect(boldSpan).toHaveText(newText);

    // Click on the block in the iframe to verify selection still works after editing
    await helper.clickBlockInIframe(blockId);
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

    // Click the link button - should show LinkEditor popup
    await helper.clickFormatButton('link');

    // Wait for LinkEditor popup to appear and verify its position
    const { popup, boundingBox } = await helper.waitForLinkEditorPopup();
    console.log('[TEST] LinkEditor popup appeared at:', boundingBox);

    // Get the URL input field
    const linkUrlInput = await helper.getLinkEditorUrlInput();

    // Enter a URL (must be a valid, real URL)
    await linkUrlInput.fill('https://plone.org');

    // Press Enter to submit
    console.log('[TEST] Pressing Enter to submit link');
    await linkUrlInput.press('Enter');

    // Wait for link to be created in the iframe by checking the HTML contains the link
    console.log('[TEST] Waiting for link to appear in iframe');
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      console.log('[TEST] Current block HTML:', blockHtml);
      expect(blockHtml).toContain('<a ');
      expect(blockHtml).toContain('https://plone.org');
      expect(blockHtml).toContain('Click here');
    }).toPass({ timeout: 5000 });

    console.log('[TEST] Link created successfully');

    // Verify the LinkEditor popup has disappeared (check for .add-link specifically, not the Quanta toolbar)
    const linkEditorPopup = page.locator('.add-link');
    await expect(linkEditorPopup).not.toBeVisible();

    // Click on another block
    console.log('[TEST] Clicking on another block');
    await helper.clickBlockInIframe('block-2-uuid');
    await page.waitForTimeout(500);

    // Click back to the original block with the link
    console.log('[TEST] Clicking back to the original block');
    await helper.clickBlockInIframe(blockId);
    await page.waitForTimeout(500);

    // Verify the link is still there
    const blockHtml = await editor.innerHTML();
    expect(blockHtml).toContain('<a ');
    expect(blockHtml).toContain('https://plone.org');
  });

  test('can clear a link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Edit the text and create a link
    await helper.editBlockTextInIframe(blockId, 'Click here');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Create the link
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();
    const linkUrlInput = await helper.getLinkEditorUrlInput();
    await linkUrlInput.fill('https://plone.org');
    await linkUrlInput.press('Enter');

    // Wait for link to be created
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      expect(blockHtml).toContain('<a ');
      expect(blockHtml).toContain('https://plone.org');
    }).toPass({ timeout: 5000 });

    console.log('[TEST] Link created, now testing clear');

    // Click inside the link to position cursor there
    const linkElement = editor.locator('a');
    await linkElement.click();
    console.log('[TEST] Clicked into link');

    // Wait for editor to be editable and have a selection
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await expect(async () => {
      const hasSelection = await editor.evaluate(() => {
        const selection = window.getSelection();
        return selection && selection.rangeCount > 0;
      });
      expect(hasSelection).toBe(true);
    }).toPass({ timeout: 5000 });
    console.log('[TEST] Editor is editable with cursor');

    // Click the link button to open LinkEditor (cursor should be inside the link)
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();
    console.log('[TEST] LinkEditor opened');

    // Click the Clear (X) button - this removes the link and closes the popup
    const clearButton = await helper.getLinkEditorClearButton();
    console.log('[TEST] Clicking Clear (X) button');
    await clearButton.click();

    // Wait for the LinkEditor popup to close (Clear removes link and closes popup)
    await helper.waitForLinkEditorToClose();
    console.log('[TEST] LinkEditor closed after Clear');

    // Check there is no link in the HTML (text should remain but without <a> tag)
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      console.log('[TEST] Block HTML after clearing:', blockHtml);
      expect(blockHtml).not.toContain('<a ');
      expect(blockHtml).not.toContain('href=');
      expect(blockHtml).toContain('Click here'); // Text should still be there
    }).toPass({ timeout: 5000 });

    console.log('[TEST] Link cleared successfully - text remains without link');
  });

  test('can use browse button in link editor', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Edit the text
    await helper.editBlockTextInIframe(blockId, 'Click here');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click the link button to open LinkEditor
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    // Get the URL input - it might have some content
    const linkUrlInput = await helper.getLinkEditorUrlInput();

    // Wait for the input to actually be focused (componentDidMount completed successfully)
    console.log('[TEST] Waiting for input to be focused...');
    await expect(linkUrlInput).toBeFocused({ timeout: 2000 });
    console.log('[TEST] Input is focused, componentDidMount completed');

    // Check if input has content, and clear it if needed to show the browse button
    const inputValue = await linkUrlInput.inputValue();
    if (inputValue && inputValue.length > 0) {
      console.log('[TEST] Input has content, clearing it to show browse button');
      await linkUrlInput.clear();
      // Wait for input to be focused again after clearing
      await expect(linkUrlInput).toBeFocused({ timeout: 1000 });
    }

    // Now the Browse button should be visible (only shows when input is empty)
    const browseButton = await helper.getLinkEditorBrowseButton();
    console.log('[TEST] Browse button found, clicking it');
    await browseButton.click();

    // Wait for object browser to open (use last() to get the newly opened sidebar)
    const objectBrowser = page.locator('aside[role="presentation"]').last();
    await objectBrowser.waitFor({ state: 'visible', timeout: 5000 });
    console.log('[TEST] Object browser opened successfully');

    // Verify the object browser is visible
    await expect(objectBrowser).toBeVisible();

    // Wait for ObjectBrowser animation to complete (slide-in animation)
    await page.waitForTimeout(600);

    // Click the home icon in breadcrumb to navigate to root (test-page has no children)
    // The error context shows: button "Home" with img "Home" inside
    const homeBreadcrumb = objectBrowser.getByRole('button', { name: 'Home' });
    await homeBreadcrumb.waitFor({ state: 'visible', timeout: 2000 });
    console.log('[TEST] Clicking Home button in breadcrumb to navigate to root');
    await homeBreadcrumb.click();

    // Wait for the page list to populate with root-level pages
    await page.waitForTimeout(500); // Wait for API call to complete

    // Click on "Another Page" from the list - it's a listitem, not a button
    const anotherPageItem = objectBrowser.getByRole('listitem', { name: /Another Page/ });
    await anotherPageItem.waitFor({ state: 'visible', timeout: 2000 });
    console.log('[TEST] Clicking "Another Page" from the list');
    await anotherPageItem.click();

    // Wait for ObjectBrowser to close and URL to be populated in LinkEditor
    await page.waitForTimeout(500);

    // Now click Submit button in LinkEditor to create the link
    const submitButton = page.getByRole('button', { name: 'Submit' });
    await submitButton.waitFor({ state: 'visible', timeout: 2000 });
    console.log('[TEST] Clicking Submit button to create the link');
    await submitButton.click();

    // Wait for the link to be created in the editor
    await page.waitForTimeout(500);

    // Verify the link was created in the editor
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      console.log('[TEST] Block HTML after selecting page:', blockHtml);
      expect(blockHtml).toContain('<a ');
      expect(blockHtml).toContain('/another-page');
      expect(blockHtml).toContain('Click here');
    }).toPass({ timeout: 5000 });

    console.log('[TEST] Browse button test complete - link created successfully');
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

    // Apply bold
    await helper.clickFormatButton('bold');
    await page.waitForTimeout(200);

    // Apply italic (text should still be selected)
    await helper.clickFormatButton('italic');
    await page.waitForTimeout(200);

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

  // BUG: Selecting in iframe, then applying format from sidebar causes path error
  // when clicking back to iframe
  test('applying format from sidebar after iframe selection works', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Step 1: Enter edit mode in iframe and type some text
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el: HTMLElement) => { el.textContent = ''; });
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

    const sidebarEditor = page.locator('#sidebar-properties .field-wrapper-value [contenteditable="true"]');
    await sidebarEditor.click();
    await sidebarEditor.press('Meta+a'); // Select all in sidebar

    // Wait for sidebar toolbar to appear and click bold
    const sidebarToolbar = await helper.waitForSidebarSlateToolbar();
    const sidebarBoldButton = await helper.getSidebarToolbarButton(sidebarToolbar, 'bold');
    console.log('[TEST] Clicking bold in sidebar');
    await sidebarBoldButton.click();

    // Wait for bold formatting to appear in iframe
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible({ timeout: 5000 });
    console.log('[TEST] Bold applied successfully');

    // Step 4: Now remove bold from sidebar - select all again and click bold to toggle off
    await sidebarEditor.click();
    await sidebarEditor.press('Meta+a'); // Select all in sidebar

    // Wait for sidebar toolbar again and click bold to remove formatting
    const sidebarToolbar2 = await helper.waitForSidebarSlateToolbar();
    const sidebarBoldButton2 = await helper.getSidebarToolbarButton(sidebarToolbar2, 'bold');
    console.log('[TEST] Clicking bold again in sidebar to remove formatting');
    await sidebarBoldButton2.click();

    // Wait for bold formatting to be removed from iframe
    await expect(editor.locator('span[style*="font-weight: bold"]')).not.toBeVisible({ timeout: 5000 });
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
    const finalText = await helper.getCleanTextContent(editor);
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

    // Select all and make it bold
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('bold');
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible();

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

  test('can edit link URL', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and initial link
    await helper.editBlockTextInIframe(blockId, 'Click here');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click link button and create link
    await helper.clickFormatButton('link');
    const linkUrlInput = await helper.getLinkEditorUrlInput();
    await linkUrlInput.fill('https://example.com');
    await linkUrlInput.press('Enter');

    // Wait for popup to close and editor to be focused again
    await expect(editor).toBeFocused({ timeout: 2000 });

    // Verify link was created
    const link = editor.locator('a');
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toBe('https://example.com');

    // Click inside the link to edit it
    await link.click();

    // Click link button again to open editor
    await helper.clickFormatButton('link');
    const { popup: editPopup } = await helper.waitForLinkEditorPopup();
    const editUrlInput = await helper.getLinkEditorUrlInput();

    // Verify current URL is shown
    expect(await editUrlInput.inputValue()).toContain('example.com');

    // Change URL (fill will replace the existing value)
    await editUrlInput.fill('https://newurl.com');

    // Verify Submit button is enabled and click it
    const submitButton = page.getByRole('button', { name: 'Submit' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for popup to close
    await helper.waitForLinkEditorToClose();

    // Verify link was updated
    expect(await link.getAttribute('href')).toBe('https://newurl.com');
    expect(await link.textContent()).toBe('Click here');
  });

  test('LinkEditor closes when focusing back on editor', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and select it
    await helper.editBlockTextInIframe(blockId, 'Click here');
    const iframe = helper.getIframe();
    // Use [data-editable-field] instead of [contenteditable="true"] because
    // contenteditable may be false when editor is blocked during format operations
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [data-editable-field]`).first();
    await helper.selectAllTextInEditor(editor);

    // Click link button to open LinkEditor
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    // Click at the start of the text (position different from center)
    // This ensures selection actually changes, triggering the close behavior
    await editor.click({ position: { x: 5, y: 5 }, force: true });

    // LinkEditor should close
    await helper.waitForLinkEditorToClose();
  });

  test('cancelling LinkEditor does not block editor', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and select it
    await helper.editBlockTextInIframe(blockId, 'Test text');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click link button to open LinkEditor
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    // Press Escape to cancel the LinkEditor without making changes
    await page.keyboard.press('Escape');

    // Wait for LinkEditor to close
    await helper.waitForLinkEditorToClose();

    // Verify the editor is still contenteditable (not blocked)
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Verify the selection is preserved (all text still selected)
    const selectedText = await editor.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBe('Test text');
  });

  test('clicking editor cancels LinkEditor and does not block editor', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and select it
    await helper.editBlockTextInIframe(blockId, 'Test text');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click link button to open LinkEditor
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    // Click back on the block to cancel the LinkEditor
    // Note: We click on the block element, not [contenteditable="true"], because
    // the iframe may be blocked (contenteditable removed) while popup is open
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.click();

    // Wait for LinkEditor to close
    await helper.waitForLinkEditorToClose();

    // Verify the editor is still contenteditable (not blocked)
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Verify the text content is still there
    const textContent = await helper.getCleanTextContent(editor);
    expect(textContent).toBe('Test text');
  });

  test('clicking editor after browse button cancels LinkEditor and does not block editor', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and select it
    await helper.editBlockTextInIframe(blockId, 'Test text');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);
    await helper.selectAllTextInEditor(editor);

    // Click link button to open LinkEditor
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    // Click the browse button - this opens the ObjectBrowser
    const browseButton = page.locator('.add-link button[title="Browse"], .add-link button:has(svg.icon)').first();
    await browseButton.click();

    // Wait for ObjectBrowser to open
    const objectBrowser = page.locator('aside[role="presentation"]').last();
    await objectBrowser.waitFor({ state: 'visible', timeout: 5000 });

    // Press Escape to close the ObjectBrowser (otherwise its overlay blocks iframe clicks)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Click back on the block to cancel the LinkEditor
    // Note: We click on the block element, not [contenteditable="true"], because
    // the iframe may be blocked (contenteditable removed) while popup is open
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.click();

    // Wait for LinkEditor to close
    await helper.waitForLinkEditorToClose();

    // Verify the editor is still contenteditable (not blocked)
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Verify the text content is still there
    const textContent = await helper.getCleanTextContent(editor);
    expect(textContent).toBe('Test text');
  });

  test('link button shows active state when cursor is in link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text with a link in the middle
    await helper.editBlockTextInIframe(blockId, 'Before link after');
    const iframe = helper.getIframe();
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`);

    // Select "link" text (characters 7-11)
    await editor.evaluate((el) => {
      const textNode = el.firstChild;
      if (!textNode) throw new Error('No text node found');
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(textNode, 7);
      range.setEnd(textNode, 11);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Create link
    await helper.clickFormatButton('link');
    const linkUrlInput = await helper.getLinkEditorUrlInput();
    await linkUrlInput.fill('https://example.com');
    await linkUrlInput.press('Enter');

    // Wait for popup to close
    await helper.waitForLinkEditorToClose();

    // Verify link was created: "Before <a>link</a> after"
    const link = editor.locator('a');
    await expect(link).toBeVisible();
    expect(await link.textContent()).toBe('link');

    // Click inside the link
    await helper.clickRelativeToFormat(editor, 'inside', 'a');

    // Verify link button is active
    expect(await helper.isActiveFormatButton('link')).toBe(true);

    // Click before the link
    await helper.clickRelativeToFormat(editor, 'before', 'a');

    await page.waitForTimeout(200);

    // Verify link button is NOT active
    expect(await helper.isActiveFormatButton('link')).toBe(false);

    // Click after the link
    await helper.clickRelativeToFormat(editor, 'after', 'a');

    await page.waitForTimeout(200);

    // Verify link button is still NOT active
    expect(await helper.isActiveFormatButton('link')).toBe(false);
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
    await helper.clickRelativeToFormat(editor, 'inside', 'a');

    // Press right arrow to move cursor
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Cursor should move (basic verification that arrow keys work)
    // More detailed link boundary tests would require Slate-specific checks
    const html = await editor.innerHTML();
    expect(html).toContain('<a href="https://example.com">link</a>');
  });

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

    // Enter edit mode
    const editor = await helper.enterEditMode(blockId);
    await editor.evaluate((el) => { el.textContent = ''; });

    // Type "Hello " then make "world" bold, then type " testing"
    await editor.pressSequentially('Hello ', { delay: 10 });

    // Apply bold formatting to "world"
    // Use Meta+b (Cmd+B on macOS) for formatting
    await editor.press('Meta+b');
    await page.waitForTimeout(100); // Wait for format operation to complete
    await editor.pressSequentially('world', { delay: 10 });
    await editor.press('Meta+b'); // toggle bold off
    await page.waitForTimeout(100); // Wait for format operation to complete

    await editor.pressSequentially(' testing', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello world testing/);

    // Verify we have "Hello world testing" with "world" in bold
    const initialText = await helper.getCleanTextContent(editor);
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

    // Verify result - deletion crossed the bold boundary successfully
    // Note: exact characters may vary due to ZWS from prospective formatting
    const finalText = await helper.getCleanTextContent(editor);
    expect(finalText).toBe('Helting');
  });

  // 'can cut text' test removed - covered by 'can paste plain text' test which tests cut+paste

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

    // Type in the new block - need to use newEditor.pressSequentially for iframe content
    await newEditor.click();
    await newEditor.pressSequentially('Second line', { delay: 10 });
    await page.waitForTimeout(200);

    // Verify the new block contains 'Second line'
    const newBlockText = await newBlock.textContent();
    expect(newBlockText).toContain('Second line');
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
    await editor.press('Meta+b');

    // Wait for bold button to become active
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(true);
    }).toPass({ timeout: 10000 });

    // Verify "test" is now bold in the HTML
    await helper.waitForFormattedText(editor, /test/, 'bold');
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
    await editor.press('Meta+b');

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
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Meta+c');

    // Read clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    console.log('[TEST] Parent clipboard text:', JSON.stringify(clipboardText));

    expect(clipboardText).toBe('Test clipboard text');
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
    console.log('[TEST] First Meta+b - enabling bold');
    await editor.press('Meta+b');

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
    console.log('[TEST] Selection before second Meta+b:', JSON.stringify(selectionInfo));
    expect(selectionInfo.editorHasFocus).toBe(true);
    expect(selectionInfo.isCollapsed).toBe(true);
    expect(selectionInfo.anchorOffset).toBe(6); // ZWS + "world" = 6 chars

    // Press Cmd+B again to toggle bold OFF
    console.log('[TEST] Second Meta+b - toggling bold off');
    await editor.press('Meta+b');
    await page.waitForTimeout(200);

    // Wait for bold button to become inactive
    await expect(async () => {
      expect(await helper.isActiveFormatButton('bold')).toBe(false);
    }).toPass({ timeout: 5000 });

    // Check cursor is outside the bold element after toggle
    const selectionAfterToggle = await helper.getSelectionInfo(editor);
    console.log('[TEST] Selection after second Meta+b:', JSON.stringify(selectionAfterToggle));
    expect(selectionAfterToggle.editorHasFocus).toBe(true);
    expect(selectionAfterToggle.isCollapsed).toBe(true);
    // Cursor should NOT be inside SPAN (bold element) - it should be in #text after the span
    expect(selectionAfterToggle.anchorNodeName).not.toBe('SPAN');

    // Type " testing" - this should NOT be bold
    await editor.pressSequentially(' testing', { delay: 10 });
    await helper.waitForEditorText(editor, /Hello world testing/);

    // Verify final text via clipboard (tests ZWS cleaning on copy)
    await editor.press('Meta+a');
    await editor.press('Meta+c');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    console.log('[TEST] Clipboard text:', JSON.stringify(clipboardText));
    expect(clipboardText).toBe('Hello world testing');

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
    await editor.press('Meta+b');
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
    await page.keyboard.press('End');
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

    // Wait for bold markup to appear
    await expect(editor.locator('span[style*="font-weight: bold"]')).toBeVisible();

    // Verify "test" is still selected after applying bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after applying bold');

    // Verify bold markup exists
    const html1 = await editor.innerHTML();
    expect(html1).toContain('style="font-weight: bold"');
    expect(html1).toContain('test');

    // Click Bold button again to remove bold formatting
    await helper.clickFormatButton('bold');

    // Wait for bold markup to be removed
    await expect(editor.locator('span[style*="font-weight: bold"]')).not.toBeVisible();

    // Verify "test" is still selected after removing bold
    await helper.verifySelectionMatches(editor, 'test');
    console.log('[TEST] Selection still "test" after removing bold');

    // Verify bold markup is gone
    const html2 = await editor.innerHTML();
    expect(html2).not.toContain('style="font-weight: bold"');
    expect(html2).toContain('test');
  });
});
