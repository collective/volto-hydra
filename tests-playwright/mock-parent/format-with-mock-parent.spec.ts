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

  test('text echo arriving before format response does not lose buffered keystrokes', async ({ helper, page }) => {
    // Reproduce the race condition:
    // 1. Type "Hello" → debounce fires → INLINE_EDIT_DATA sent
    // 2. Ctrl+B → blocking starts, SLATE_TRANSFORM_REQUEST sent
    // 3. " world" typed → buffered
    // 4. Text echo FORM_DATA arrives DURING blocking (before format response)
    // 5. If the echo triggers replayBufferAndUnblock, it drains the buffer
    //    into the pre-format DOM. The format response then overwrites it,
    //    losing the replayed text.
    //
    // We control timing precisely: slow transform (500ms), and manually
    // send the text echo from the test during the blocking window.

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(500);
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');

    // Type initial text and wait for debounce to settle
    await editable.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Hello');
    await page.waitForTimeout(500);

    // Ctrl+B starts blocking, transform will take 500ms
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(20); // Ensure blocking is set

    // Type during blocking — these go into the event buffer
    await page.keyboard.type(' world');

    // NOW send a text echo FORM_DATA — simulating the INLINE_EDIT_DATA echo
    // arriving during the blocking window (before the format response).
    // This is the exact race: the echo has no formatRequestId.
    await page.evaluate(() => {
      const iframe = document.getElementById('previewIframe');
      const echoData = JSON.parse(JSON.stringify(window.mockParent.getFormData()));
      iframe.contentWindow.postMessage({
        type: 'FORM_DATA',
        data: echoData,
        blockPathMap: {},
      }, '*');
      console.log('[TEST] Sent text echo FORM_DATA during blocking');
    });

    // Wait for format response (500ms transform) + replay
    await expect(async () => {
      const text = await helper.getCleanTextContent(editable);
      expect(text).toBe('Hello world');
    }).toPass({ timeout: 10000 });

    // Cleanup
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  test('Redux echo after format response does not overwrite replayed keystrokes', async ({ helper, page }) => {
    // Reproduce the Redux re-render cascade race:
    //
    // In real Volto, after sending the format response FORM_DATA, View.jsx
    // calls onChangeFormData() → Redux update → useEffect → ANOTHER FORM_DATA
    // (without formatRequestId) with the same formatted content.
    //
    // If this "Redux echo" arrives while afterContentRender is in its
    // double-rAF window (after format response rendered, before buffer replay),
    // it triggers callback(formData) → re-renders DOM with PRE-REPLAY data
    // → buffer replay text is lost.
    //
    // We simulate this from the mock parent: listen for the format response
    // postMessage, then immediately send a Redux echo (same data, no
    // formatRequestId) so it arrives during the double-rAF window.

    await page.evaluate(() => {
      window.mockParent.setTransformDelay(200);

      // Install a listener that sends a Redux echo immediately after the
      // mock parent sends the format response. The mock parent's transform
      // handler posts FORM_DATA to the iframe; we intercept this by
      // listening on the parent window for the iframe's message event,
      // then posting the echo right after.
      const iframeEl = document.getElementById('previewIframe') as HTMLIFrameElement;
      (window as any).__reduxEchoCleanup = null;

      // Override the mock parent's transform to also send a Redux echo
      const origProcessMessage = (window as any).processMessage;

      // Simpler: just listen for FORM_DATA messages sent TO the iframe
      // and echo them without formatRequestId
      const observer = new MutationObserver(() => {}); // dummy
      let echoArmed = true;

      // Use a MessageChannel to intercept outgoing messages
      // Actually, simplest: patch postMessage on the iframe's contentWindow
      const origPostMessage = iframeEl.contentWindow!.postMessage.bind(iframeEl.contentWindow!);
      iframeEl.contentWindow!.postMessage = function(msg: any, origin: any) {
        origPostMessage(msg, origin);
        // If this is the format response, send a Redux echo right after
        if (echoArmed && msg?.type === 'FORM_DATA' && msg?.formatRequestId) {
          echoArmed = false;
          // Send echo WITHOUT formatRequestId — like Redux re-render would
          const echoData = JSON.parse(JSON.stringify(msg.data));
          origPostMessage({
            type: 'FORM_DATA',
            data: echoData,
            blockPathMap: msg.blockPathMap || {},
          }, origin);
          console.log('[TEST] Sent Redux echo FORM_DATA immediately after format response');
        }
      };

      (window as any).__reduxEchoCleanup = () => {
        if (iframeEl.contentWindow) {
          iframeEl.contentWindow.postMessage = origPostMessage;
        }
      };
    });

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');

    // Type initial text and wait for debounce to settle
    await editable.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Hello');
    await page.waitForTimeout(500);

    // Ctrl+B starts blocking, transform will take 200ms
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(20); // Ensure blocking is set

    // Type during blocking — these go into the event buffer
    await page.keyboard.type(' world');

    // Wait for format response + replay
    // The Redux echo should NOT overwrite the replayed " world"
    await expect(async () => {
      const text = await helper.getCleanTextContent(editable);
      expect(text).toBe('Hello world');
    }).toPass({ timeout: 10000 });

    // Cleanup
    await page.evaluate(() => {
      if ((window as any).__reduxEchoCleanup) {
        (window as any).__reduxEchoCleanup();
      }
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

  test('space-only buffer replay is not destroyed by ensureValidInsertionTarget', async ({ helper, page }) => {
    // Reproduce the exact flaky bug from inline-editing-formatting.spec.ts:655.
    //
    // When only a space character is buffered during a format transform:
    // 1. Ctrl+B → blocking starts, SLATE_TRANSFORM_REQUEST sent
    // 2. Space typed → buffered (1 char)
    // 3. Format response arrives → re-render → restoreSlateSelection (ensureZwsPosition
    //    creates BOM in empty bold span) → replayBufferAndUnblock → insertText(" ")
    //    cleans up BOM sibling, inserts space → UNBLOCK
    // 4. Next keydown "w" → element keydown handler calls ensureValidInsertionTarget()
    // 5. BUG: ensureValidInsertionTarget sees the space-only text node inside the
    //    bold <span data-node-id="0.1">, walks up to <p data-editable-field="value"
    //    data-node-id="0">, hits data-editable-field BEFORE data-node-id → breaks
    //    without checking P's content ("Hello ") → replaces space with FEFF
    //
    // We use a transform delay to ensure ONLY the space is buffered,
    // then type the rest after the transform completes.

    const iframe = helper.getIframe();
    const editable = iframe.locator('[data-editable-field="value"]');

    // Type "Hello" and wait for it to settle
    await editable.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Hello');
    await page.waitForTimeout(300);

    // Set a short delay — long enough for the space to be buffered,
    // short enough that subsequent chars arrive after unblocking
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(100);
    });

    // Ctrl+B: toggle bold (prospective formatting with collapsed cursor)
    await page.keyboard.press('ControlOrMeta+b');

    // Type space immediately — should be buffered during the 100ms transform
    await page.waitForTimeout(20); // ensure blocking is set
    await page.keyboard.press('Space');

    // Wait for the transform to complete and space to be replayed
    await page.waitForTimeout(200);

    // Now type "world" — these arrive AFTER unblocking, as direct keystrokes.
    // The "w" keydown will trigger ensureValidInsertionTarget on the space.
    await page.keyboard.type('world');

    // Verify the space was preserved — "Hello world", not "Helloworld"
    await expect(async () => {
      const text = await helper.getCleanTextContent(editable);
      expect(text).toBe('Hello world');
    }).toPass({ timeout: 5000 });

    // Cleanup
    await page.evaluate(() => {
      window.mockParent.setTransformDelay(0);
    });
  });

  // NOTE: "should handle selection across node boundaries and delete" test moved to
  // tests-playwright/integration/inline-editing-basic.spec.ts because it requires
  // SLATE_TRANSFORM_REQUEST processing which only works with full Volto Admin UI
});
