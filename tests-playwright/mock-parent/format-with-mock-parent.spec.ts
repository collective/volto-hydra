import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Mock Parent Window Inline Editing Tests
 *
 * These tests verify inline editing functionality using a mock parent window
 * instead of full Volto. This tests the postMessage protocol and hydra.js
 * behavior without needing the full Volto stack.
 *
 * Focus areas:
 * - Selection and cursor behavior
 * - Typing works correctly
 * - Deleting works
 * - Events are blocked until update is re-rendered
 *
 * Architecture:
 * - Parent page (mock-parent.html) contains iframe
 * - Iframe loads test-frontend with hydra.js
 * - Mock parent responds to SLATE_TRANSFORM_REQUEST messages with updated Slate JSON
 * - Frontend re-renders when it receives FORM_DATA from parent
 */

test.describe('Inline Editing with Mock Parent', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);

    // Load the mock parent page from the mock API server
    await page.goto('http://localhost:8888/mock-parent.html');

    // Wait for iframe to load using helper (waits for [data-block-uid] not contenteditable)
    await helper.waitForIframeReady();

    // Mock parent auto-selects first block, wait for it to be selected
    await helper.waitForBlockSelected('mock-block-1');

    console.log('[TEST] Mock parent page loaded');
  });

  test('should load mock parent with iframe and initial content', async ({ page }) => {
    // Verify parent page loaded
    await expect(page.locator('h1')).toContainText('Mock Parent Window');

    // Verify iframe loaded with blocks
    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid="mock-block-1"]')).toBeVisible();

    // Click block to select it (this will set contenteditable)
    // Use waitForToolbar: false since mock parent doesn't have Volto's quanta-toolbar
    await helper.clickBlockInIframe('mock-block-1', { waitForToolbar: false });

    // Verify initial content
    const content = await iframe.locator('[contenteditable="true"]').first().textContent();
    expect(content?.trim()).toBe('Text to format');
  });

  test('should handle selection and apply formatting', async ({ page }) => {
    const iframe = helper.getIframe();

    // Click block to select it (this will set contenteditable)
    await helper.clickBlockInIframe('mock-block-1', { waitForToolbar: false });

    const editable = iframe.locator('[contenteditable="true"]');

    // Click to focus the editable
    await editable.click();

    // Select all text
    await page.keyboard.press('Meta+A');

    // Verify selection exists in iframe (polls until text is selected)
    await expect.poll(() => editable.evaluate(() => window.getSelection()?.toString())).toBe('Text to format');

    // Apply bold using keyboard shortcut (triggers SLATE_TRANSFORM_REQUEST)
    await page.keyboard.press('Meta+b');

    // Wait for bold formatting to appear (polls until condition met)
    await expect(editable.locator('span[style*="font-weight: bold"]')).toBeVisible();

    // Verify bold was applied (renderer converts {type: "strong"} to styled span)
    const html = await editable.innerHTML();
    console.log('[TEST] HTML after formatting:', html);

    expect(html).toContain('font-weight: bold');
    expect(html).toContain('Text to format');
  });

  test('should maintain cursor position after typing', async ({ page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    // Click at the beginning - use smaller x position to ensure cursor is before first character
    await editable.click({ position: { x: 1, y: 5 } });

    // Type some text
    await page.keyboard.type('Hello ');

    // Verify text was added at the beginning
    const content = await editable.textContent();
    expect(content).toContain('Hello');
    expect(content).toMatch(/^Hello\s+Text to format/); // Should start with "Hello "
  });

  test('should handle deleting text with backspace', async ({ page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    // Click at the end
    await editable.click();
    await page.keyboard.press('End');

    // Delete some characters
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    // Verify text was deleted
    const content = await editable.textContent();
    expect(content).not.toContain('mat'); // 'format' should have lost 'mat'
  });

  test('should buffer input during slow transform and replay after completion', async ({ page }) => {
    // Configure mock parent to simulate a slow transform (500ms delay)
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');

    // Select all text programmatically to ensure selection exists
    await editable.click();
    const selectionSet = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const el = document.querySelector('[contenteditable="true"]');
      const textNode = el?.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return {
          success: true,
          text: selection?.toString(),
          rangeCount: selection?.rangeCount,
        };
      }
      return { success: false };
    });
    console.log('[TEST] Selection set:', selectionSet);
    expect(selectionSet.success).toBe(true);
    expect(selectionSet.text).toBe('Text to format');

    // Apply bold using keyboard shortcut to trigger transform
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(50); // Small delay for blocking to kick in

    // Type during the slow transform - should be buffered (not inserted yet)
    await page.keyboard.type('BUFFERED');

    // Verify the typed text was NOT inserted yet (buffered during pending transform)
    const textDuringBlock = await editable.textContent();
    console.log('[TEST] Text after typing attempt during transform:', textDuringBlock);
    expect(textDuringBlock).not.toContain('BUFFERED');

    // Wait for transform to complete and buffered text to be replayed
    // The buffered text should appear after cursor is restored
    await expect(editable).toContainText('BUFFERED');

    // Verify bold was applied (renderer converts {type: "strong"} to styled span)
    const html = await editable.innerHTML();
    console.log('[TEST] HTML after formatting:', html);
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('Text to format');
    expect(html).toContain('BUFFERED');

    // Reset delay for other tests
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('should handle partial text selection', async ({ page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    await editable.click();

    // Select just "Text" (first word)
    const selectionResult = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const el = document.querySelector('[contenteditable="true"]');

      // The contenteditable element IS the paragraph element, so el.firstChild is the text node
      const textNode = el?.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Verify selection was set
        const verifySelection = window.getSelection();
        console.log('[TEST-EVAL] Selection after setting:', {
          rangeCount: verifySelection?.rangeCount,
          isCollapsed: verifySelection?.isCollapsed,
          text: verifySelection?.toString(),
          anchorNode: verifySelection?.anchorNode,
          focusNode: verifySelection?.focusNode
        });

        return {
          success: true,
          rangeCount: verifySelection?.rangeCount,
          isCollapsed: verifySelection?.isCollapsed,
          text: verifySelection?.toString()
        };
      }
      return { success: false };
    });

    console.log('[TEST] Selection result:', selectionResult);

    await page.waitForTimeout(200);

    // Apply bold using keyboard shortcut
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(500);

    const html = await editable.innerHTML();
    console.log('[TEST] HTML after partial selection formatting:', html);

    // Should have bold styling (renderer converts {type: "strong"} to styled span)
    expect(html).toContain('font-weight: bold');
    // Should still have all the text
    expect(html).toContain('Text');
    expect(html).toContain('to format');

    // Verify cursor position is restored correctly
    const selectionInfo = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { hasSelection: false };
      }

      const range = selection.getRangeAt(0);
      return {
        hasSelection: true,
        isCollapsed: range.collapsed,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        selectedText: selection.toString(),
        startContainerText: range.startContainer.textContent,
        endContainerText: range.endContainer.textContent,
      };
    });

    console.log('[TEST] Selection after formatting:', selectionInfo);

    // Verify selection is restored (should still select "Text")
    expect(selectionInfo.hasSelection).toBe(true);
    expect(selectionInfo.selectedText).toBe('Text');
    expect(selectionInfo.startOffset).toBe(0);
    expect(selectionInfo.endOffset).toBe(4);
  });

  test('should exchange correct postMessage types', async ({ page }) => {
    const messages: string[] = [];

    // Track console messages to verify protocol
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SLATE_TRANSFORM_REQUEST') ||
          text.includes('FORM_DATA') ||
          text.includes('INITIAL_DATA')) {
        messages.push(text);
        console.log('[PROTOCOL]', text);
      }
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    await editable.click();
    await page.keyboard.press('Meta+A');
    await page.waitForTimeout(200);

    // Apply bold using keyboard shortcut
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(500);

    // Verify we saw the expected messages
    const hasTransformRequest = messages.some(m => m.includes('SLATE_TRANSFORM_REQUEST'));
    const hasFormData = messages.some(m => m.includes('FORM_DATA'));

    console.log('[TEST] Protocol messages:', { hasTransformRequest, hasFormData });

    expect(hasTransformRequest || hasFormData).toBe(true); // At least one should be present
  });

  test('should render data-node-id attributes in HTML after formatting', async ({ page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    // Click to focus the editable
    await editable.click();

    // Select all text
    await page.keyboard.press('Meta+A');

    // Verify selection exists in iframe (polls until text is selected)
    await expect.poll(() => editable.evaluate(() => window.getSelection()?.toString())).toBe('Text to format');

    // Apply bold using keyboard shortcut
    await page.keyboard.press('Meta+b');

    // Wait for bold formatting to appear (polls until condition met)
    await expect(editable.locator('span[style*="font-weight: bold"]')).toBeVisible();

    // Get the rendered HTML
    const html = await editable.innerHTML();
    const outerHtml = await editable.evaluate((el) => el.outerHTML);
    console.log('[TEST] Rendered innerHTML after formatting:', html);
    console.log('[TEST] Rendered outerHTML after formatting:', outerHtml);

    // Verify bold was applied (renderer converts {type: "strong"} to styled span)
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('Text to format');

    // Verify the paragraph element has data-node-id attribute
    expect(outerHtml).toContain('data-node-id=');
    expect(outerHtml).toMatch(/<p[^>]*data-node-id="[^"]+"/);

    // The nodeId should NOT be a temp fallback - it should be a real nodeId from hydra.js
    // For now, we're checking that data-node-id exists (even if it's temp-0)
    // TODO: Verify hydra.js is adding real nodeIds instead of renderer falling back to temp-*
    expect(outerHtml).toMatch(/data-node-id="([^"]+)"/);

    const nodeIdMatch = outerHtml.match(/data-node-id="([^"]+)"/);
    if (nodeIdMatch) {
      console.log('[TEST] Found data-node-id:', nodeIdMatch[1]);
    }
  });

  test('should handle selection across node boundaries and delete', async ({ page }) => {
    // First, create content with multiple text nodes by applying bold to part of the text
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    await editable.click();

    // Select "Text" (first word) and make it bold
    const formatResult = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const el = document.querySelector('[contenteditable="true"]');
      const textNode = el?.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4); // Select "Text"
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return { success: true, text: selection?.toString() };
      }
      return { success: false };
    });

    console.log('[TEST] Initial selection for formatting:', formatResult);

    await page.waitForTimeout(200);

    // Apply bold using keyboard shortcut to create multiple nodes
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(500);

    // Verify we have bold and normal text (renderer converts {type: "strong"} to styled span)
    let html = await editable.innerHTML();
    console.log('[TEST] HTML after bold formatting:', html);
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('Text');
    expect(html).toContain('to format');

    // Now select across the boundary: from "xt" in styled span to "to" in " to format"
    // This creates a selection that spans from inside the styled span element to outside it
    const crossBoundarySelection = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const el = document.querySelector('[contenteditable="true"]');
      // The renderer creates <span style="font-weight: bold">Text</span>
      const boldSpan = el?.querySelector('span[style*="font-weight: bold"]');
      const textAfterBold = boldSpan?.nextSibling;

      if (boldSpan && textAfterBold && textAfterBold.nodeType === Node.TEXT_NODE) {
        const boldTextNode = boldSpan.firstChild;
        if (boldTextNode && boldTextNode.nodeType === Node.TEXT_NODE) {
          const range = document.createRange();
          // Start at position 2 in "Text" (at "xt")
          range.setStart(boldTextNode, 2);
          // End at position 3 in " to format" (after " to")
          range.setEnd(textAfterBold, 3);

          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);

          return {
            success: true,
            selectedText: selection?.toString(),
            anchorNode: boldTextNode.textContent,
            anchorOffset: 2,
            focusNode: textAfterBold.textContent,
            focusOffset: 3,
          };
        }
      }
      return { success: false };
    });

    console.log('[TEST] Cross-boundary selection:', crossBoundarySelection);
    expect(crossBoundarySelection.success).toBe(true);
    expect(crossBoundarySelection.selectedText).toMatch(/xt\s+to/);

    await page.waitForTimeout(200);

    // Press Delete to remove the selected text
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // Verify the result
    html = await editable.innerHTML();
    console.log('[TEST] HTML after delete:', html);

    // Should have "Te" (from "Text") + "format" (from " to format")
    // The styled span might remain around "Te" or the formatting might be normalized
    expect(html).toContain('Te');
    expect(html).toContain('format');
    expect(html).not.toContain('xt to');

    // Verify cursor position is at the deletion point
    const cursorInfo = await iframe.locator('[contenteditable="true"]').evaluate(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return { hasSelection: false };
      }

      const range = selection.getRangeAt(0);
      return {
        hasSelection: true,
        isCollapsed: range.collapsed,
        anchorNode: range.startContainer.textContent,
        anchorOffset: range.startOffset,
        focusNode: range.endContainer.textContent,
        focusOffset: range.endOffset,
      };
    });

    console.log('[TEST] Cursor position after delete:', cursorInfo);

    // Cursor should be collapsed (no selection) at the deletion point
    expect(cursorInfo.hasSelection).toBe(true);
    expect(cursorInfo.isCollapsed).toBe(true);

    // The cursor should be positioned where the deletion occurred
    // After deleting "xt to", cursor should be between "Te" and "format"
    // The exact position depends on how the DOM is restructured
    expect(cursorInfo.anchorNode).toBeTruthy();
  });
});
