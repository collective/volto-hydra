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
      // Wait for Ctrl+A to take effect — on slow CI the keystroke may not
      // be processed before the evaluate runs.
      await expect.poll(() => editable.evaluate((el) => {
        const sel = el.ownerDocument.defaultView.getSelection();
        return sel?.isCollapsed;
      }), { timeout: 5000 }).toBe(false);
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
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
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
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered End+X:', text);
    // End moved cursor to end (collapsing selection), then X was typed there
    expect(text).toMatch(/Text to formatX$/);

    // Verify cursor is after X at end
    await helper.waitForCursorPosition(editable, 'Text to formatX');

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
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
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
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered Backspace+type:', text);
    expect(text).toContain('replacement text');

    // Verify cursor is at end of typed text
    await helper.waitForCursorPosition(editable, 'replacement text');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Clear formatted content then type immediately preserves all characters', async ({ helper, page }) => {
    // Reproduces nuxt timing issue: after a delete transform completes and
    // the DOM re-renders, the double-RAF in afterContentRender delays unblocking.
    // Characters typed in that window should be buffered and replayed.
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(100);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Apply bold to create formatted content
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await helper.waitForFormattedText(editable, 'Text to format', 'bold', { timeout: 5000 });

    // Select all bold text and delete — triggers delete transform
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('Backspace');

    // Type immediately — characters arrive while transform is in flight.
    // They should be buffered and replayed, not lost.
    await page.keyboard.type('some new text');

    await expect(editable).toContainText('some new text', { timeout: 5000 });
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after clear+type:', text);
    expect(text).toContain('some new text');

    // Verify cursor is at end of typed text
    await helper.waitForCursorPosition(editable, 'some new text');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Typing into whitespace-only text node stays inside data-node-id element', async ({ helper, page }) => {
    // Reproduces nuxt integration test failure: after clearing, Nuxt renders
    // empty paragraphs as <p> </p> (space). The browser's contenteditable
    // refuses to insert characters into a whitespace-only text node inside
    // a block element, creating a new text node on the parent DIV instead.
    // ensureValidInsertionTarget replaces the space with FEFF to fix this.
    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Apply bold to create formatted content
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await helper.waitForFormattedText(editable, 'Text to format', 'bold', { timeout: 5000 });

    // Select all bold text and delete — triggers delete transform
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('Backspace');

    // Wait for the clear to complete
    await expect.poll(() => editable.textContent()).toMatch(/^[\s\uFEFF\u200B]*$/);

    // Simulate Nuxt's rendering: replace content of <p> with whitespace-only text node.
    // This is what Nuxt does after a re-render — Vue templates produce " " in empty elements.
    // On mock frontend, data-node-id is on the same element as data-edit-text;
    // on Nuxt, data-node-id is on a child <p>. Handle both cases.
    await editable.evaluate((el) => {
      const nodeEl = el.querySelector('[data-node-id="0"]')
        || (el.hasAttribute('data-node-id') ? el : null);
      if (!nodeEl) throw new Error('No data-node-id="0" element found');
      nodeEl.textContent = ' ';
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(nodeEl.firstChild, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Type — without the fix, "r" would land outside <p> as a sibling text node
    await page.keyboard.type('replacement text', { delay: 10 });

    await expect(editable).toContainText('replacement text', { timeout: 5000 });
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after whitespace fix:', text);

    // Verify all text is inside a data-node-id element, not leaked as a sibling.
    // On mock frontend, data-node-id is on the editable itself (same <p>).
    // On Nuxt, data-node-id is on a child <p> inside a <div> editable.
    const hasLeakedText = await editable.evaluate((el) => {
      // If the editable itself has data-node-id, text inside it is fine
      if (el.hasAttribute('data-node-id')) return false;
      // Otherwise, check for text nodes directly under editable (outside <p>)
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          return true; // Leaked text outside data-node-id element
        }
      }
      return false;
    });
    expect(hasLeakedText).toBe(false);
    expect(text).toContain('replacement text');
  });

  test('Ctrl+A buffered during transform replays as select-all', async ({ helper, page }) => {
    // When Ctrl+A arrives while input is blocked (transform in flight),
    // it should be buffered and replayed as selectNodeContents after unblock.
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Place cursor at position 3 (not selecting all)
    await helper.moveCursorToPosition(editable, 3);
    const info0 = await helper.getCursorInfo(editable);
    expect(info0.selectionCollapsed).toBe(true);
    expect(info0.cursorOffset).toBe(3);

    // Select all and apply bold — blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50); // Let blocking kick in

    // Press Ctrl+A while blocked — should be buffered
    await page.keyboard.press('ControlOrMeta+a');

    // Wait for transform to complete and buffer to replay
    await helper.waitForFormattedText(editable, 'Text to format', 'bold', { timeout: 5000 });

    // Ctrl+A should have been replayed — poll for selection to cover all text
    await helper.verifySelectionMatches(editable, 'Text to format');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Home replay during buffer moves cursor to start of line', async ({ helper, page }) => {
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Select all text and apply bold — blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50);

    // Press Home then type — Home should move cursor to start, X typed there
    await page.keyboard.press('Home');
    await page.keyboard.type('X');

    await expect(editable).toContainText('X', { timeout: 5000 });
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered Home+X:', text);
    expect(text).toMatch(/^XText to format/);

    // Verify cursor is after X at start (position 1)
    await helper.waitForCursorPosition(editable, 'X');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('ArrowLeft replay during buffer moves cursor left', async ({ helper, page }) => {
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Select all text and apply bold — blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50);

    // Press End (collapse to end), then ArrowLeft 3 times, then type X
    // "Text to format" → End → at pos 14 → Left×3 → at pos 11 → type X
    // Expected: "Text to forXmat"
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X');

    await expect(editable).toContainText('X', { timeout: 5000 });
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered ArrowLeft+X:', text);
    expect(text).toBe('Text to forXmat');

    // Verify cursor is after X (between "for" and "mat")
    await helper.waitForCursorPosition(editable, 'Text to forX');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('ArrowRight replay during buffer moves cursor right', async ({ helper, page }) => {
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Select all text and apply bold — blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50);

    // Press Home (collapse to start), then ArrowRight 4 times, then type X
    // "Text to format" → Home → at pos 0 → Right×4 → at pos 4 → type X
    // Expected: "TextX to format"
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('X');

    await expect(editable).toContainText('X', { timeout: 5000 });
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered ArrowRight+X:', text);
    expect(text).toBe('TextX to format');

    // Verify cursor is after X (between "Text" and " to format")
    await helper.waitForCursorPosition(editable, 'TextX');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Delete replay during buffer forward-deletes character', async ({ helper, page }) => {
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = await helper.getEditorLocator('mock-block-1', 'value');
    await editable.click();

    // Select all text and apply bold — blocks input for 500ms
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(50);

    // Press Home (collapse to start), then Delete to remove first char
    // "Text to format" → Home → at pos 0 → Delete → "ext to format"
    await page.keyboard.press('Home');
    await page.keyboard.press('Delete');

    await expect.poll(() => helper.getCleanTextContent(editable), { timeout: 5000 }).toBe('ext to format');
    const text = await helper.getCleanTextContent(editable);
    console.log('[TEST] Text after buffered Delete:', text);
    expect(text).toBe('ext to format');

    // Verify cursor is at start (position 0, nothing before cursor)
    await helper.waitForCursorPosition(editable, '');

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });
});
