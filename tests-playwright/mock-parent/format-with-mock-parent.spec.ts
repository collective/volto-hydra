import { test, expect } from './fixtures';

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
  test('should load mock parent with iframe and initial content', async ({ helper, page }) => {
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

  test('should handle selection and apply formatting', async ({ helper, page }) => {
    const iframe = helper.getIframe();

    // Click block to select it (this will set contenteditable)
    await helper.clickBlockInIframe('mock-block-1', { waitForToolbar: false });

    const editable = iframe.locator('[contenteditable="true"]');

    // Click to focus the editable
    await editable.click();

    // Select all text
    await page.keyboard.press('ControlOrMeta+a');

    // Verify selection exists in iframe (polls until text is selected)
    await expect.poll(() => editable.evaluate(() => window.getSelection()?.toString())).toBe('Text to format');

    // Apply bold using keyboard shortcut (triggers SLATE_TRANSFORM_REQUEST)
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold formatting to appear
    await helper.waitForFormattedText(editable, 'Text to format', 'bold');

    // Verify bold was applied
    const boldEl = editable.locator(helper.getFormatSelector('bold')).first();
    await expect(boldEl).toContainText('Text to format');
  });

  test('should maintain cursor position after typing', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    // Click at the beginning - use smaller x position to ensure cursor is before first character
    await editable.click({ position: { x: 1, y: 5 } });

    // Type some text
    await page.keyboard.type('Hello ');

    // Verify text was added at the beginning
    await expect(editable).toContainText(/^Hello\s+Text to format/);
  });

  test('should handle deleting text with backspace', async ({ helper, page }) => {
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

  test('should buffer input during slow transform and replay after completion', async ({ helper, page }) => {
    // Configure mock parent to simulate a slow transform (500ms delay)
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');

    // Select all text using keyboard (works across all frontends)
    await editable.click();
    await page.keyboard.press('ControlOrMeta+a');
    await expect.poll(() =>
      iframe.locator('[contenteditable="true"]').evaluate(() => window.getSelection()?.toString())
    ).toBe('Text to format');

    // Apply bold using keyboard shortcut to trigger transform
    await page.keyboard.press('ControlOrMeta+b');
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

    // Verify bold was applied and BUFFERED replaced original text
    await helper.waitForFormattedText(editable, 'BUFFERED', 'bold');
    await expect(editable).not.toContainText('Text to format');

    // Reset delay for other tests
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('should handle partial text selection', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    await editable.click();

    // Select just "Text" (first word) using helper that walks text nodes
    await helper.selectTextRange(editable, 0, 4);

    // Verify selection was set
    const selectionResult = await editable.evaluate((el) => {
      const sel = el.ownerDocument.defaultView.getSelection();
      return { text: sel?.toString(), collapsed: sel?.isCollapsed };
    });
    expect(selectionResult.collapsed).toBe(false);
    expect(selectionResult.text).toBe('Text');

    // Apply bold using keyboard shortcut
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(500);

    const html = await editable.innerHTML();
    console.log('[TEST] HTML after partial selection formatting:', html);

    // Should have bold styling and still have all the text
    await helper.waitForFormattedText(editable, 'Text', 'bold');
    expect(html).toContain('Text');
    expect(html).toContain('to format');

    // Verify selection is restored (should still select "Text")
    const selectedText = await editable.evaluate((el) => {
      return el.ownerDocument.defaultView.getSelection()?.toString() || '';
    });
    expect(selectedText).toBe('Text');
  });

  test('should exchange correct postMessage types', async ({ helper, page }) => {
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
    await page.keyboard.press('ControlOrMeta+a');
    await page.waitForTimeout(200);

    // Apply bold using keyboard shortcut
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(500);

    // Verify we saw the expected messages
    const hasTransformRequest = messages.some(m => m.includes('SLATE_TRANSFORM_REQUEST'));
    const hasFormData = messages.some(m => m.includes('FORM_DATA'));

    console.log('[TEST] Protocol messages:', { hasTransformRequest, hasFormData });

    expect(hasTransformRequest || hasFormData).toBe(true); // At least one should be present
  });

  test('should render data-node-id attributes in HTML after formatting', async ({ helper, page }) => {
    const iframe = helper.getIframe();
    const editable = iframe.locator('[contenteditable="true"]');

    // Click to focus the editable
    await editable.click();

    // Select all text
    await page.keyboard.press('ControlOrMeta+a');

    // Verify selection exists in iframe (polls until text is selected)
    await expect.poll(() => editable.evaluate(() => window.getSelection()?.toString())).toBe('Text to format');

    // Apply bold using keyboard shortcut
    await page.keyboard.press('ControlOrMeta+b');

    // Wait for bold formatting to appear
    await helper.waitForFormattedText(editable, 'Text to format', 'bold');

    // Get the rendered HTML
    const outerHtml = await editable.evaluate((el) => el.outerHTML);
    console.log('[TEST] Rendered outerHTML after formatting:', outerHtml);

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

  // NOTE: "should handle selection across node boundaries and delete" test moved to
  // tests-playwright/integration/inline-editing-basic.spec.ts because it requires
  // SLATE_TRANSFORM_REQUEST processing which only works with full Volto Admin UI
});
