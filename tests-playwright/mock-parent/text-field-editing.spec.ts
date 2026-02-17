/**
 * Tests for non-Slate text field inline editing using the hero block.
 *
 * Uses the hero block because it has string fields (heading, buttonText)
 * and a textarea field (subheading) that both the mock frontend and Nuxt render.
 */
import { test, expect } from './fixtures';

test.describe('Non-Slate Text Field Editing', () => {
  test('should render hero heading with contenteditable', async ({ helper, page }) => {
    const iframe = helper.getIframe();

    // Click the hero block to select it
    await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });

    const heroBlock = iframe.locator('[data-block-uid="mock-hero-block"]');

    // Verify heading field is editable
    const headingField = heroBlock.locator('[data-editable-field="heading"]');
    await expect(headingField).toBeVisible();
    await expect(headingField).toHaveAttribute('contenteditable', 'true');

    // Verify initial content
    await expect(headingField).toHaveText('Simple text field');
  });

  test('should edit heading field content', async ({ helper, page }) => {
    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    await headingField.click();

    // Clear existing text and type new text
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Updated text');

    // Verify the text was updated
    await expect(headingField).toHaveText('Updated text');
  });

  test('should send INLINE_EDIT_DATA message on text change', async ({ helper, page }) => {
    const messages: any[] = [];

    // Capture console messages to verify protocol
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('INLINE_EDIT_DATA')) {
        messages.push(text);
        console.log('[PROTOCOL]', text);
      }
    });

    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    await headingField.click();
    await page.keyboard.type(' edited');

    // Wait for INLINE_EDIT_DATA message to be captured
    await expect.poll(() => messages.some(m => m.includes('INLINE_EDIT_DATA'))).toBe(true);
  });

  test('should maintain cursor position while typing', async ({ helper, page }) => {
    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    // Click at the end
    await headingField.click();
    await page.keyboard.press('End');

    // Type some text
    await page.keyboard.type(' - more text');

    // Verify text was appended
    await expect(headingField).toContainText('Simple text field - more text');
  });

  test('string field prevents Enter key from creating new line', async ({ helper, page }) => {
    // String fields should be single-line inputs
    // Pressing Enter should NOT create a new line within the field

    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    // Clear and type initial text
    await headingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('First line');

    // Press Enter - should NOT create a new line in string field
    await page.keyboard.press('Enter');

    // Verify no newline was created
    await expect(headingField).toHaveText('First line');

    // Verify HTML doesn't contain <br> or newlines
    const html = await headingField.innerHTML();
    expect(html).not.toContain('<br');
    expect(html).not.toContain('\n');
  });

  test('ArrowRight moves cursor forward', async ({ helper, page }) => {
    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    // Clear and type initial text
    await headingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await headingField.pressSequentially('Hello', { delay: 10 });

    // Move to start
    await helper.moveCursorToStart(headingField);
    const posAfterHome = await helper.getCursorInfo(headingField);
    expect(posAfterHome.cursorOffset, 'After moveCursorToStart, cursor should be at 0').toBe(0);

    // Press ArrowRight 3 times - cursor should be at position 3
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const posAfterArrows = await helper.getCursorInfo(headingField);
    expect(posAfterArrows.cursorOffset, 'After 3x ArrowRight, cursor should be at 3').toBe(3);
  });

  test('string field cursor stays in position while typing in middle', async ({ helper, page }) => {
    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const headingField = heroBlock.locator('[data-editable-field="heading"]');

    // Clear and type initial text
    await headingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await headingField.pressSequentially('Hello World', { delay: 10 });

    // Move cursor to middle (after "Hello ")
    await helper.moveCursorToStart(headingField);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowRight');
    }

    // Verify cursor is at position 6
    const posBeforeType = await helper.getCursorInfo(headingField);
    expect(posBeforeType.cursorOffset, 'Before typing, cursor should be at 6').toBe(6);

    // Type at cursor position - should insert "Beautiful " in the middle
    await page.keyboard.type('Beautiful ');

    // Verify text was inserted at cursor position
    await expect(headingField).toHaveText('Hello Beautiful World');
  });

  test('textarea field allows Enter to create newlines with \\n', async ({ helper, page }) => {
    // Textarea fields should be multiline
    // Pressing Enter should create a newline character (\n) not <br> HTML

    const heroBlock = await helper.clickBlockInIframe('mock-hero-block', { waitForToolbar: false });
    const subheadingField = heroBlock.locator('[data-editable-field="subheading"]');

    // Click the subheading field to focus it
    await subheadingField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await subheadingField.pressSequentially('First line', { delay: 20 });

    // Wait for first line to appear before pressing Enter
    await expect(subheadingField).toContainText('First line');

    // Press Enter - should create a newline within the field
    await page.keyboard.press('Enter');

    // Small wait for DOM to settle after Enter
    await page.waitForTimeout(50);

    // Type second line
    await subheadingField.pressSequentially('Second line', { delay: 20 });

    // Verify the content contains both lines
    await expect(subheadingField).toContainText('First line');
    await expect(subheadingField).toContainText('Second line');

    // Verify the innerText contains \n
    await expect.poll(async () => await subheadingField.evaluate(el => el.innerText)).toBe('First line\nSecond line');
  });
});
