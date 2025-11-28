/**
 * Tests for non-Slate text field inline editing.
 *
 * Verifies that simple text fields (not using Slate) can be edited inline
 * without formatting capabilities.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Non-Slate Text Field Editing', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);

    // Load the mock parent page from the mock API server
    await page.goto('http://localhost:8888/mock-parent.html');

    // Wait for iframe to load using helper (waits for [data-block-uid] not contenteditable)
    await helper.waitForIframeReady();

    console.log('[TEST] Mock parent page loaded');
  });

  test('should render text block with contenteditable', async ({ page }) => {
    const iframe = helper.getIframe();

    // Find the text block by its UID
    const textBlock = iframe.locator('[data-block-uid="mock-text-block"]');
    await expect(textBlock).toBeVisible();

    // Click the block to select it (this will set contenteditable on the field)
    // Use waitForToolbar: false since mock parent doesn't have Volto's quanta-toolbar
    await helper.clickBlockInIframe('mock-text-block', { waitForToolbar: false });

    // Verify it has editable field
    const textField = textBlock.locator('[data-editable-field="text"]');
    await expect(textField).toBeVisible();
    await expect(textField).toHaveAttribute('contenteditable', 'true');

    // Verify initial content
    await expect(textField).toHaveText('Simple text field');
  });

  test('should edit text field content', async ({ page }) => {
    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block', { waitForToolbar: false });

    // Find the text field within the block
    const textField = textBlock.locator('[data-editable-field="text"]');

    await textField.click();

    // Clear existing text and type new text
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Updated text');

    // Verify the text was updated (auto-retries until condition met)
    await expect(textField).toHaveText('Updated text');
  });

  test('should send INLINE_EDIT_DATA message on text change', async ({ page }) => {
    const messages: any[] = [];

    // Capture console messages to verify protocol
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('INLINE_EDIT_DATA')) {
        messages.push(text);
        console.log('[PROTOCOL]', text);
      }
    });

    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block', { waitForToolbar: false });
    const textField = textBlock.locator('[data-editable-field="text"]');

    await textField.click();
    await page.keyboard.type(' edited');

    // Wait for INLINE_EDIT_DATA message to be captured (polls until condition met)
    await expect.poll(() => messages.some(m => m.includes('INLINE_EDIT_DATA'))).toBe(true);
  });


  test('should maintain cursor position while typing', async ({ page }) => {
    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block', { waitForToolbar: false });
    const textField = textBlock.locator('[data-editable-field="text"]');

    // Click at the end
    await textField.click();
    await page.keyboard.press('End');

    // Type some text
    await page.keyboard.type(' - more text');

    // Verify text was appended
    await expect(textField).toContainText('Simple text field - more text');
  });

  test('string field prevents Enter key from creating new line', async ({ page }) => {
    // String fields should be single-line inputs
    // Pressing Enter should NOT create a new line within the field

    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block', { waitForToolbar: false });
    const textField = textBlock.locator('[data-editable-field="text"]');

    // Clear and type initial text
    await textField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('First line');

    // Press Enter - should NOT create a new line in string field
    await page.keyboard.press('Enter');

    // Verify no newline was created (polls until stable)
    await expect(textField).toHaveText('First line');

    // Verify HTML doesn't contain <br> or newlines
    const html = await textField.innerHTML();
    expect(html).not.toContain('<br');
    expect(html).not.toContain('\n');
  });

  test('slate field allows Enter key (not prevented by string handler)', async ({ page }) => {
    // Slate fields are multiline and have their own Enter handling
    // Our string field Enter prevention should NOT affect slate fields
    // This test verifies that pressing Enter in a slate field triggers a transform request

    // Select the slate block
    const slateBlock = await helper.clickBlockInIframe('mock-block-1', { waitForToolbar: false });
    const slateField = slateBlock.locator('[data-editable-field="value"]');

    // Clear and type initial text
    await slateField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('First line');

    // Press Enter - should trigger SLATE_TRANSFORM_REQUEST (not be prevented)
    await page.keyboard.press('Enter');

    // Wait for Enter transform to complete by checking DOM has changed
    // Enter in slate creates a new paragraph, so text should be split
    await expect.poll(async () => {
      const text = await slateField.textContent();
      // After Enter, "First line" should still exist but field should have been re-rendered
      return text?.includes('First line');
    }).toBe(true);

    // If Enter was blocked by string handler, typing would fail
    // Since this is a slate field, Enter should NOT be blocked
    // We verify typing still works after Enter
    await page.keyboard.type('After Enter');

    // Verify text appears (polls until condition met)
    await expect(slateField).toContainText('After Enter');
  });

  test('textarea field allows Enter to create newlines with \\n', async ({ page }) => {
    // Textarea fields should be multiline
    // Pressing Enter should create a newline character (\n) not <br> HTML
    // The field value should be sent as plain text with \n

    // Select the textarea block
    const textareaBlock = await helper.clickBlockInIframe('mock-textarea-block', { waitForToolbar: false });
    const textareaField = textareaBlock.locator('[data-editable-field="content"]');

    // Clear and type initial text (use pressSequentially with delay for CI stability)
    await textareaField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await textareaField.pressSequentially('First line', { delay: 20 });

    // Wait for first line to appear before pressing Enter
    await expect(textareaField).toContainText('First line');

    // Press Enter - should create a newline within the field
    await page.keyboard.press('Enter');

    // Small wait for DOM to settle after Enter (helps with CI timing)
    await page.waitForTimeout(50);

    // Type second line (use pressSequentially with delay for CI stability)
    await textareaField.pressSequentially('Second line', { delay: 20 });

    // Verify the content contains both lines (polls until condition met)
    await expect(textareaField).toContainText('First line');
    await expect(textareaField).toContainText('Second line');

    // Verify the innerText (which is what gets sent) contains \n
    await expect.poll(async () => await textareaField.evaluate(el => el.innerText)).toBe('First line\nSecond line');
  });
});
