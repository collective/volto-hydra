/**
 * Tests for multi-field block inline editing using the hero block.
 *
 * The hero block has multiple string fields (heading, subheading, buttonText)
 * which allows testing:
 * - Simple text field editing (non-Slate string fields)
 * - Editing multiple fields in a single block
 * - Focus movement between fields
 * - Independent field updates
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const HERO_BLOCK_ID = 'block-4-hero';

test.describe('Inline Editing - Hero Block Fields', () => {
  test('hero block renders with all editable fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Verify the hero block is rendered
    const heroBlock = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"]`);
    await expect(heroBlock).toBeVisible();

    // Verify all editable fields are present
    const headingField = heroBlock.locator('[data-editable-field="heading"]');
    const subheadingField = heroBlock.locator('[data-editable-field="subheading"]');
    const buttonTextField = heroBlock.locator('[data-editable-field="buttonText"]');

    await expect(headingField).toBeVisible();
    await expect(subheadingField).toBeVisible();
    await expect(buttonTextField).toBeVisible();

    // Verify initial content
    await expect(headingField).toContainText('Welcome Hero');
    await expect(subheadingField).toContainText('This is the hero subtitle');
    await expect(buttonTextField).toContainText('Click Me');
  });

  test('can edit heading field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe(HERO_BLOCK_ID);

    // Find and click the heading field
    const headingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="heading"]`);
    await headingField.click();

    // Verify it's contenteditable
    await expect(headingField).toHaveAttribute('contenteditable', 'true');

    // Select all and type new heading
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('New Hero Title');

    // Verify the heading was updated
    await expect(headingField).toHaveText('New Hero Title');
  });

  test('string field does not allow Enter to create newlines', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe(HERO_BLOCK_ID);

    // Find and click the heading field (a string type field)
    const headingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="heading"]`);
    await headingField.click();

    // Clear and type text
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('First line');

    // Press Enter - should NOT create a newline in string field
    await page.keyboard.press('Enter');

    // Wait for any potential updates
    await page.waitForTimeout(200);

    // Verify no newline was created - text should still be single line
    const text = await headingField.textContent();
    expect(text).toBe('First line');

    // Verify HTML doesn't contain <br>
    const html = await headingField.innerHTML();
    expect(html).not.toContain('<br');
  });

  test('can edit multiple fields sequentially', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe(HERO_BLOCK_ID);

    // Edit the heading field
    const headingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="heading"]`);
    await headingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Updated Heading');
    await expect(headingField).toHaveText('Updated Heading');

    // Now click and edit the subheading field
    const subheadingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="subheading"]`);
    await subheadingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Updated Subheading');
    await expect(subheadingField).toHaveText('Updated Subheading');

    // Now click and edit the button text field
    const buttonTextField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="buttonText"]`);
    await buttonTextField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('New Button');
    await expect(buttonTextField).toHaveText('New Button');

    // Verify all edits persisted
    await expect(headingField).toHaveText('Updated Heading');
    await expect(subheadingField).toHaveText('Updated Subheading');
    await expect(buttonTextField).toHaveText('New Button');
  });

  test('editing one field does not affect other fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe(HERO_BLOCK_ID);

    // Get references to all fields
    const headingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="heading"]`);
    const subheadingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="subheading"]`);
    const buttonTextField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="buttonText"]`);

    // Get initial values
    const initialSubheading = await subheadingField.textContent();
    const initialButton = await buttonTextField.textContent();

    // Edit only the heading
    await headingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Only Heading Changed');

    // Wait for changes to propagate
    await page.waitForTimeout(300);

    // Verify only heading changed, other fields remain the same
    await expect(headingField).toHaveText('Only Heading Changed');
    await expect(subheadingField).toHaveText(initialSubheading!);
    await expect(buttonTextField).toHaveText(initialButton!);
  });

  test('cursor position remains stable while typing', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe(HERO_BLOCK_ID);

    // Find and click the heading field
    const headingField = iframe.locator(`[data-block-uid="${HERO_BLOCK_ID}"] [data-editable-field="heading"]`);
    await headingField.click();

    // Get initial render count after block is selected and ready
    const initialRenderCount = await iframe.locator('#render-counter').textContent();

    // Clear and type text
    await page.keyboard.press('ControlOrMeta+a');
    await headingField.pressSequentially('Hello World', { delay: 20 });

    // Wait for debounce (300ms) + buffer
    await page.waitForTimeout(500);

    // Simple text edits should NOT trigger re-render
    const afterTypingCount = await iframe.locator('#render-counter').textContent();
    expect(afterTypingCount).toBe(initialRenderCount);

    // Check cursor is at end after typing (position 11 = length of "Hello World")
    const cursorAfterTyping = await helper.getCursorInfo(headingField);
    expect(cursorAfterTyping.cursorOffset, `Cursor should be at end after typing. Got: ${JSON.stringify(cursorAfterTyping)}`).toBe(11);

    // Verify focus is still on the heading field before navigation
    const focusInfo = await helper.isEditorFocused(headingField);
    expect(focusInfo.isFocused, `Should be focused on heading field. Got: ${JSON.stringify(focusInfo)}`).toBe(true);

    // Move cursor to start with helper - NO re-render should happen
    // Use helper instead of keyboard Home to avoid scrolling the window
    await helper.moveCursorToStart(headingField);
    const renderAfterHome = await iframe.locator('#render-counter').textContent();
    expect(renderAfterHome, `Render count should not change on Home key`).toBe(initialRenderCount);
    const cursorAfterHome = await helper.getCursorInfo(headingField);
    expect(cursorAfterHome.cursorOffset, `Cursor should be at 0 after Home. Got: ${JSON.stringify(cursorAfterHome)}`).toBe(0);

    // Move cursor right 6 positions (after "Hello ") - NO re-render should happen
    for (let i = 0; i < 6; i++) {
      await headingField.press('ArrowRight');
    }
    const renderAfterArrows = await iframe.locator('#render-counter').textContent();
    expect(renderAfterArrows, `Render count should not change on ArrowRight keys`).toBe(initialRenderCount);
    const cursorAfterArrows = await helper.getCursorInfo(headingField);
    expect(cursorAfterArrows.cursorOffset, `Cursor should be at 6 after 6x ArrowRight. Got: ${JSON.stringify(cursorAfterArrows)}`).toBe(6);

    // Type at cursor position
    await page.keyboard.type('Beautiful ');

    // Assert cursor is now at position 16 (6 + 10 chars of "Beautiful ")
    await helper.assertCursorAtPosition(headingField, 16, HERO_BLOCK_ID);

    // Wait for debounce again
    await page.waitForTimeout(500);

    // Still no re-render
    const finalRenderCount = await iframe.locator('#render-counter').textContent();
    expect(finalRenderCount).toBe(initialRenderCount);

    // Verify text was inserted at cursor position
    await expect(headingField).toHaveText('Hello Beautiful World');
  });
});
