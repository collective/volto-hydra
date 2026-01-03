/**
 * Link creation and editing tests for inline editing in Volto Hydra admin UI.
 *
 * TODO - additional tests and bugs:
 * - Bug - I can clear a link in the sidebar (causes path exception currently)
 * - click link without selection and then type - should create link?
 * - paste a link
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Links', () => {
  test('can create a link', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Edit the text (this also clicks the block, waits for toolbar, and selects all before typing)
    await helper.editBlockTextInIframe(blockId, 'Click here');

    // Select all the text for link button test
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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

  test('can edit link URL', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Create text and initial link
    await helper.editBlockTextInIframe(blockId, 'Click here');
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);
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
    const editor = await helper.getEditorLocator(blockId);

    // Select "link" text (characters 7-11)
    await helper.selectTextRange(editor, 7, 11);

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

});
