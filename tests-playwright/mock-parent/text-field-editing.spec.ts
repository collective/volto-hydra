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
    await helper.clickBlockInIframe('mock-text-block');

    // Verify it has editable field
    const textField = textBlock.locator('[data-editable-field="text"]');
    await expect(textField).toBeVisible();
    await expect(textField).toHaveAttribute('contenteditable', 'true');

    // Verify initial content
    await expect(textField).toHaveText('Simple text field');
  });

  test('should edit text field content', async ({ page }) => {
    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block');

    // Find the text field within the block
    const textField = textBlock.locator('[data-editable-field="text"]');

    await textField.click();

    // Clear existing text and type new text
    await page.keyboard.press('Meta+A');
    await page.keyboard.type('Updated text');

    // Wait for the change to be sent
    await page.waitForTimeout(500);

    // Verify the text was updated
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
    const textBlock = await helper.clickBlockInIframe('mock-text-block');
    const textField = textBlock.locator('[data-editable-field="text"]');

    await textField.click();
    await page.keyboard.type(' edited');

    // Wait for message to be sent
    await page.waitForTimeout(500);

    // Verify we saw INLINE_EDIT_DATA message
    const hasInlineEditData = messages.some(m => m.includes('INLINE_EDIT_DATA'));
    expect(hasInlineEditData).toBe(true);
  });

  test('should not show formatting buttons for text blocks', async ({ page }) => {
    // Select the text block using helper
    await helper.clickBlockInIframe('mock-text-block');

    // Wait a moment for toolbar to appear if it would
    await page.waitForTimeout(500);

    // Verify no format buttons appear
    const iframe = helper.getIframe();
    const formatButtons = iframe.locator('.volto-hydra-format-button');
    await expect(formatButtons).toHaveCount(0);
  });

  test('should maintain cursor position while typing', async ({ page }) => {
    // Select the text block using helper - returns the block locator
    const textBlock = await helper.clickBlockInIframe('mock-text-block');
    const textField = textBlock.locator('[data-editable-field="text"]');

    // Click at the end
    await textField.click();
    await page.keyboard.press('End');

    // Type some text
    await page.keyboard.type(' - more text');

    // Verify text was appended
    await expect(textField).toContainText('Simple text field - more text');
  });
});
