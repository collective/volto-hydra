import { test, expect } from './fixtures';

/**
 * Navigation Key Behavior Tests
 *
 * Characterize End/Home/Arrow key behavior in contenteditable via Playwright.
 * Tests run against mock parent (no full Volto) to isolate hydra.js behavior.
 *
 * Key question: when does press('End') actually move the cursor?
 */

test.describe('Navigation key behavior in contenteditable', () => {
  test('End on collapsed cursor in plain text moves to end of line', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');
    await editable.click();

    // Place cursor at position 3 (mid-text)
    await helper.moveCursorToPosition(editable, 3);

    // Verify cursor is collapsed and not at end
    const info0 = await helper.getCursorInfo(editable);
    expect(info0.selectionCollapsed).toBe(true);
    expect(info0.cursorOffset).toBe(3);

    // Press End
    await page.keyboard.press('End');

    // Verify cursor moved to end
    const info1 = await helper.getCursorInfo(editable);
    expect(info1.selectionCollapsed).toBe(true);
    expect(info1.cursorOffset).toBe(info1.textLength);
  });

  test('End on non-collapsed selection in plain text collapses to end', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');
    await editable.click();

    // Select all text
    await page.keyboard.press('ControlOrMeta+a');

    // Verify selection is non-collapsed
    let info = await editable.evaluate((el) => {
      const sel = el.ownerDocument.defaultView.getSelection();
      return { collapsed: sel.isCollapsed, text: sel.toString() };
    });
    expect(info.collapsed).toBe(false);
    expect(info.text).toBe('Text to format');

    // Press End — should collapse selection to end of line
    await page.keyboard.press('End');

    info = await editable.evaluate((el) => {
      const sel = el.ownerDocument.defaultView.getSelection();
      const text = sel.focusNode?.textContent || '';
      return { collapsed: sel.isCollapsed, offset: sel.focusOffset, textLength: text.length };
    });
    expect(info.collapsed).toBe(true);
    expect(info.offset).toBe(info.textLength);
  });

  test('End on non-collapsed selection inside bold inline collapses to end', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');
    await editable.click();

    // Select all and apply bold (Ctrl+B triggers SLATE_TRANSFORM_REQUEST)
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() => editable.evaluate(() => window.getSelection()?.toString())).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold to be applied
    await helper.waitForFormattedText(editable, 'Text to format', 'bold');

    // Selection should be non-collapsed (restored by restoreSlateSelection)
    let info = await editable.evaluate((el) => {
      const sel = el.ownerDocument.defaultView.getSelection();
      return { collapsed: sel.isCollapsed, text: sel.toString() };
    });
    // Selection may or may not be restored — just verify what we have
    console.log('[TEST] Selection after bold:', info);

    // If selection is collapsed, select all again to test the non-collapsed case
    if (info.collapsed) {
      await page.keyboard.press('ControlOrMeta+a');
      info = await editable.evaluate((el) => {
        const sel = el.ownerDocument.defaultView.getSelection();
        return { collapsed: sel.isCollapsed, text: sel.toString() };
      });
    }
    expect(info.collapsed).toBe(false);

    // Press End — should collapse to end
    await page.keyboard.press('End');

    info = await editable.evaluate((el) => {
      const sel = el.ownerDocument.defaultView.getSelection();
      const text = sel.focusNode?.textContent || '';
      return {
        collapsed: sel.isCollapsed,
        offset: sel.focusOffset,
        textLength: text.length,
        nodeName: sel.focusNode?.parentElement?.tagName,
      };
    });
    console.log('[TEST] After End on bold non-collapsed:', info);
    expect(info.collapsed).toBe(true);
    expect(info.offset).toBe(info.textLength);
  });

  test('End replay during buffer works via selection.modify', async ({ helper, page }) => {
    // Use slow transform to ensure End gets buffered
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');
    await editable.click();

    // Select all text
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');

    // Apply bold — this blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50); // Let blocking kick in

    // Press End then type — should be buffered during transform
    await page.keyboard.press('End');
    await page.keyboard.type('X');

    // Wait for transform to complete and buffer to replay
    // End should move cursor to end, then X typed at end
    await expect(editable).toContainText('X', { timeout: 5000 });

    // Verify X is at the end of the text (not replacing the selection)
    const text = await editable.textContent();
    console.log('[TEST] Text after buffered End+X:', text);
    // End moved cursor to end (collapsing selection), then X was typed there
    expect(text).toMatch(/Text to formatX$/);

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Backspace on formatted selection buffers and replays typed text correctly', async ({ helper, page }) => {
    // Reproduces CI failure: selectAll on formatted content → Backspace → type immediately.
    // Backspace on a selection spanning element nodes (e.g. <strong>) sends a delete transform.
    // Characters typed during the transform should be buffered and replayed in full.
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(300);
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');
    await editable.click();

    // Select all and apply bold to create formatted content
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold transform to complete
    await helper.waitForFormattedText(editable, 'Text to format', 'bold', { timeout: 5000 });

    // Now select all the bold text
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');

    // Backspace deletes the formatted selection → triggers delete transform (300ms delay)
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(50); // Let blocking kick in

    // Type replacement text immediately — should be buffered during the transform
    await page.keyboard.type('replacement text');

    // Wait for transform to complete and buffer to replay
    await expect(editable).toContainText('replacement text', { timeout: 5000 });

    // Verify the full text is correct (no missing characters)
    const text = await editable.textContent();
    console.log('[TEST] Text after buffered Backspace+type:', text);
    expect(text).toContain('replacement text');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });
});
