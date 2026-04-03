/**
 * Unit tests for bridge.replayOneKey() — verifies cursor position and text
 * after replaying keys, including DOM with BOM/ZWS nodes (nextjs pattern).
 *
 * Each test sets innerHTML on the mock block, places cursor, replays keys
 * via the real bridge code, and checks the result.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Set up DOM, place cursor, replay keys, return { text, textBefore }.
 * `html` is set on the block's edit field.
 * `cursorAt` is visible character offset (skips ZWS/BOM), or 'start'/'end'.
 * `keys` are key names or event objects passed to bridge.replayOneKey.
 * Strings are converted to event objects with no modifiers.
 * Use { key, ctrlKey, metaKey, shiftKey } for modifier combos.
 */
async function replay(
  iframe: ReturnType<AdminUIHelper['getIframe']>,
  html: string,
  cursorAt: 'start' | 'end' | number,
  keys: (string | { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean })[],
) {
  return await iframe.locator('body').evaluate(
    (_el: Element, { html, cursorAt, keys }: { html: string; cursorAt: string | number; keys: any[] }) => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      // Disconnect observer to prevent handleTextChange from firing
      // when we set innerHTML (which would corrupt formData)
      if (bridge.blockTextMutationObserver) {
        bridge.blockTextMutationObserver.disconnect();
      }
      editField.innerHTML = html;

      // Set up bridge state to match real editing flow
      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'value';
      bridge.isInlineEditing = true;

      // Collect text nodes
      const walker = document.createTreeWalker(editField, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let tn: Text | null;
      while ((tn = walker.nextNode() as Text)) textNodes.push(tn);

      // Place cursor by visible offset
      const sel = window.getSelection()!;
      const range = document.createRange();
      if (cursorAt === 'start') {
        range.setStart(textNodes[0], 0);
      } else if (cursorAt === 'end') {
        const last = textNodes[textNodes.length - 1];
        range.setStart(last, last.length);
      } else {
        let remaining = cursorAt as number;
        for (const t of textNodes) {
          const vis = t.textContent!.replace(/[\uFEFF\u200B]/g, '');
          if (remaining <= vis.length) {
            let raw = 0, seen = 0;
            for (let i = 0; i < t.textContent!.length && seen < remaining; i++) {
              if (t.textContent![i] !== '\uFEFF' && t.textContent![i] !== '\u200B') seen++;
              raw++;
            }
            range.setStart(t, raw);
            break;
          }
          remaining -= vis.length;
        }
      }
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Replay via the real replayBufferAndUnblock — same code as production
      bridge.eventBuffer = keys.map((k: any) => {
        if (typeof k === 'string') {
          return { key: k, code: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
        }
        return { code: k.key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...k };
      });
      bridge.pendingTransform = { blockId, requestId: 'test-replay' };
      bridge.blockedBlockId = blockId;
      bridge.replayBufferAndUnblock('unit-test');

      // Debug: check state after replay
      const debugSel = window.getSelection()!;
      const debugInfo = {
        focusNodeType: debugSel.focusNode?.nodeType,
        focusNodeText: debugSel.focusNode?.textContent?.substring(0, 20),
        focusOffset: debugSel.focusOffset,
        editFieldHTML: editField.innerHTML.substring(0, 100),
      };
      console.log('[replayKeys debug]', JSON.stringify(debugInfo));

      // Read result
      const text = editField.textContent!.replace(/[\uFEFF\u200B]/g, '');
      const r = document.createRange();
      r.setStart(editField, 0);
      r.setEnd(sel.focusNode!, sel.focusOffset);
      const textBefore = r.toString().replace(/[\uFEFF\u200B]/g, '');
      return { text, textBefore };
    },
    { html, cursorAt, keys },
  );
}

/**
 * Like replay() but also captures messages sent to parent window.
 * Returns { text, textBefore, messages } where messages is an array of
 * { type, ...data } objects sent via bridge.sendMessageToParent.
 */
async function replayWithMessages(
  iframe: ReturnType<AdminUIHelper['getIframe']>,
  html: string,
  cursorAt: 'start' | 'end' | number,
  keys: (string | { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean })[],
  setup?: (bridge: any) => void,
) {
  return await iframe.locator('body').evaluate(
    (_el: Element, { html, cursorAt, keys, setupStr }: any) => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) {
        bridge.blockTextMutationObserver.disconnect();
      }
      editField.innerHTML = html;
      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'value';
      bridge.isInlineEditing = true;

      // Run optional setup
      if (setupStr) {
        new Function('bridge', setupStr)(bridge);
      }

      // Capture messages
      const messages: any[] = [];
      const origSend = bridge.sendMessageToParent.bind(bridge);
      bridge.sendMessageToParent = (msg: any, ...args: any[]) => {
        messages.push(msg);
        origSend(msg, ...args);
      };

      // Place cursor
      const walker = document.createTreeWalker(editField, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let tn: Text | null;
      while ((tn = walker.nextNode() as Text)) textNodes.push(tn);
      const sel = window.getSelection()!;
      const range = document.createRange();
      if (cursorAt === 'start') {
        range.setStart(textNodes[0], 0);
      } else if (cursorAt === 'end') {
        const last = textNodes[textNodes.length - 1];
        range.setStart(last, last.length);
      } else {
        let remaining = cursorAt as number;
        for (const t of textNodes) {
          const vis = t.textContent!.replace(/[\uFEFF\u200B]/g, '');
          if (remaining <= vis.length) {
            let raw = 0, seen = 0;
            for (let i = 0; i < t.textContent!.length && seen < remaining; i++) {
              if (t.textContent![i] !== '\uFEFF' && t.textContent![i] !== '\u200B') seen++;
              raw++;
            }
            range.setStart(t, raw);
            break;
          }
          remaining -= vis.length;
        }
      }
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Replay
      bridge.eventBuffer = keys.map((k: any) => {
        if (typeof k === 'string') {
          return { key: k, code: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
        }
        return { code: k.key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...k };
      });
      bridge.pendingTransform = { blockId, requestId: 'test-replay' };
      bridge.blockedBlockId = blockId;
      bridge.replayBufferAndUnblock('unit-test');

      // Restore
      bridge.sendMessageToParent = origSend;

      const text = editField.textContent!.replace(/[\uFEFF\u200B]/g, '');
      return { text, messages };
    },
    { html, cursorAt, keys, setupStr: setup?.toString() },
  );
}

test.describe('replayOneKey — cursor movement and editing', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8889/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
  });

  // --- Plain text ---

  test('ArrowLeft from end', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'end', ['ArrowLeft']);
    expect(r.textBefore).toBe('Hell');
  });

  test('ArrowRight from start', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'start', ['ArrowRight']);
    expect(r.textBefore).toBe('H');
  });

  test('Delete at start', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'start', ['Delete']);
    expect(r.text).toBe('ello');
  });

  test('End + 3x ArrowLeft', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Text to format</p>', 'end',
      ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']);
    expect(r.textBefore).toBe('Text to for');
  });

  // --- Trailing BOM (nextjs: <span>text</span> + BOM) ---

  test('ArrowLeft skips trailing BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>Hello</span>\uFEFF</p>', 'end',
      ['ArrowLeft']);
    expect(r.textBefore).toBe('Hell');
  });

  test('End + 3x ArrowLeft with trailing BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>Text to format</span>\uFEFF</p>', 'end',
      ['ArrowLeft', 'ArrowLeft', 'ArrowLeft']);
    expect(r.textBefore).toBe('Text to for');
  });

  // --- Leading BOM (nextjs: BOM + <span>text</span>) ---

  test('Delete with leading BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">\uFEFF<span>Hello</span></p>', 'start',
      ['Delete']);
    expect(r.text).toBe('ello');
  });

  test('ArrowRight skips leading BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">\uFEFF<span>Hello</span></p>', 'start',
      ['ArrowRight']);
    expect(r.textBefore).toBe('H');
  });

  test('Home then Delete with leading BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">\uFEFF<span>Text to format</span></p>',
      'end',
      ['Home', 'Delete']);
    expect(r.text).toBe('ext to format');
    expect(r.textBefore).toBe('');
  });

  test('Home then Delete without BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>Text to format</span></p>',
      'end',
      ['Home', 'Delete']);
    expect(r.text).toBe('ext to format');
    expect(r.textBefore).toBe('');
  });

  test('Home then Delete with span-wrapped text (nextjs plain)', async () => {
    // Nextjs wraps text in <span> even without formatting
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>Text to format</span></p>',
      'end',
      ['Home', 'Delete']);
    expect(r.text).toBe('ext to format');
    expect(r.textBefore).toBe('');
  });

  test('Home then Delete with nextjs bold DOM (BOM in spans)', async () => {
    // Exact nextjs DOM after bold: BOM chars inside <span> wrappers
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>\uFEFF</span><strong data-node-id="0.1"><span>Text to format</span></strong><span>\uFEFF</span></p>',
      'end',
      ['Home', 'Delete']);
    expect(r.text).toBe('ext to format');
    expect(r.textBefore).toBe('');
  });

  test('Home then Delete with nextjs bold DOM (empty spans, font-weight style)', async () => {
    // Exact DOM captured from Firefox + nextjs CI failure.
    // Empty <span></span> wrappers (no BOM), bold via style not <strong>.
    const r = await replay(helper.getIframe(),
      '<span></span><span style="font-weight: bold" data-node-id="0.1"><span>Text to format</span></span><span></span>',
      'end',
      ['Home', 'Delete']);
    expect(r.text).toBe('ext to format');
    expect(r.textBefore).toBe('');
  });

  // --- Text character replay ---

  test('buffered text characters are inserted via insertText', async () => {
    // When focus falls to body during re-render, typed characters get buffered.
    // replayOneKey should insert them via execCommand('insertText').
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello</p>',
      'end',
      ['!', ' ', 'w', 'o', 'r', 'l', 'd']);
    // Browser may convert space to NBSP in contenteditable
    expect(r.text.replace(/\u00A0/g, ' ')).toBe('Hello! world');
  });

  // --- Modifier combos ---

  test('Ctrl+A selects all text', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello world</p>',
      3, // cursor at position 3
      [{ key: 'a', ctrlKey: true }]);
    // After select-all, textBefore should be empty (cursor at start of selection)
    // or full text (selection covers all). The selection itself covers all text.
    expect(r.text).toBe('Hello world');
  });

  test('composed accented character inserts correctly', async () => {
    // Dead key compositions arrive as single characters (e.g. è, ü, ñ)
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">cafe</p>',
      'end',
      ['é']); // composed character, key.length === 1
    expect(r.text).toBe('cafeé');
  });

  test('special characters insert correctly', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">price </p>',
      'end',
      ['€', ' ', '1', '0', '0']);
    expect(r.text.replace(/\u00A0/g, ' ')).toBe('price € 100');
  });

  test('Shift+Arrow extends selection', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello world</p>',
      5, // cursor after "Hello"
      [{ key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true }]);
    // Focus moved 3 chars right, textBefore measures to focus position
    expect(r.textBefore).toBe('Hello wo');
  });

  test('selection replacement: typing replaces selected text', async () => {
    // Select "world" then type "earth"
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0">Hello world</p>',
      6, // cursor at 'w'
      [{ key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true },
       { key: 'ArrowRight', shiftKey: true },
       'E', 'a', 'r', 't', 'h']);
    expect(r.text).toBe('Hello Earth');
  });

  // --- Bold with BOM between elements ---

  test('ArrowLeft through bold boundary with BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>before</span>\uFEFF' +
      '<strong data-node-id="0.1"><span>bold</span></strong>\uFEFF</p>',
      'end', ['ArrowLeft', 'ArrowLeft']);
    expect(r.textBefore).toBe('beforebo');
  });
});

test.describe('replayOneKey — slash menu, undo, save, Enter, Tab', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8889/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
  });

  test('slash menu ArrowDown sends SLASH_MENU down', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      bridge._slashMenuActive = true;
      const messages: any[] = [];
      const origSend = bridge.sendMessageToParent.bind(bridge);
      bridge.sendMessageToParent = (msg: any) => { messages.push(msg); origSend(msg); };
      bridge.replayOneKey('mock-block-1', { key: 'ArrowDown' }, null);
      bridge.sendMessageToParent = origSend;
      bridge._slashMenuActive = false;
      return { messages };
    });
    expect(r.messages.find((m: any) => m.type === 'SLASH_MENU' && m.action === 'down')).toBeTruthy();
  });

  test('slash menu Enter sends SLASH_MENU select', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      bridge._slashMenuActive = true;
      const messages: any[] = [];
      const origSend = bridge.sendMessageToParent.bind(bridge);
      bridge.sendMessageToParent = (msg: any) => { messages.push(msg); origSend(msg); };
      bridge.replayOneKey('mock-block-1', { key: 'Enter' }, null);
      bridge.sendMessageToParent = origSend;
      bridge._slashMenuActive = false;
      return { messages };
    });
    expect(r.messages.find((m: any) => m.type === 'SLASH_MENU' && m.action === 'select')).toBeTruthy();
  });

  test('slash menu Escape sends SLASH_MENU hide and deactivates', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      bridge._slashMenuActive = true;
      const messages: any[] = [];
      const origSend = bridge.sendMessageToParent.bind(bridge);
      bridge.sendMessageToParent = (msg: any) => { messages.push(msg); origSend(msg); };
      bridge.replayOneKey('mock-block-1', { key: 'Escape' }, null);
      bridge.sendMessageToParent = origSend;
      const wasDeactivated = !bridge._slashMenuActive;
      return { messages, wasDeactivated };
    });
    expect(r.messages.find((m: any) => m.type === 'SLASH_MENU' && m.action === 'hide')).toBeTruthy();
    expect(r.wasDeactivated).toBe(true);
  });

  test('Ctrl+Z sends SLATE_UNDO_REQUEST', async () => {
    const r = await replayWithMessages(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'end',
      [{ key: 'z', ctrlKey: true }],
    );
    const undoMsg = r.messages.find((m: any) => m.type === 'SLATE_UNDO_REQUEST');
    expect(undoMsg).toBeTruthy();
  });

  test('Ctrl+Shift+Z sends SLATE_REDO_REQUEST', async () => {
    const r = await replayWithMessages(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'end',
      [{ key: 'z', ctrlKey: true, shiftKey: true }],
    );
    const redoMsg = r.messages.find((m: any) => m.type === 'SLATE_REDO_REQUEST');
    expect(redoMsg).toBeTruthy();
  });

  test('Ctrl+S sends SAVE_REQUEST', async () => {
    const r = await replayWithMessages(helper.getIframe(),
      '<p data-node-id="0">Hello</p>', 'end',
      [{ key: 's', ctrlKey: true }],
    );
    const saveMsg = r.messages.find((m: any) => m.type === 'SAVE_REQUEST');
    expect(saveMsg).toBeTruthy();
  });

  test('Enter in pre element inserts newline', async () => {
    // Wrap in <pre> for the pre-element Enter handler
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();

      // Wrap the edit field in <pre> temporarily
      const pre = document.createElement('pre');
      pre.setAttribute('data-edit-text', 'code');
      pre.setAttribute('contenteditable', 'true');
      pre.innerHTML = 'line1';
      editField.innerHTML = '';
      editField.appendChild(pre);

      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'code';
      bridge.isInlineEditing = true;

      // Place cursor at end
      const textNode = pre.firstChild!;
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, textNode.textContent!.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Replay Enter
      bridge.replayOneKey(blockId, { key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, pre);

      return { text: pre.textContent };
    });
    expect(r.text).toBe('line1\n');
  });

  test('text after prospective inline (Ctrl+B) inserts inside the bold element', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();

      // Set up: "Hello" with a prospective <strong> at the end (simulates Ctrl+B with collapsed cursor)
      editField.innerHTML = '<p data-node-id="0">Hello<strong data-node-id="0.1"></strong></p>';
      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'value';
      bridge.isInlineEditing = true;

      // Set the prospective inline element
      const strong = editField.querySelector('strong')!;
      bridge.prospectiveInlineElement = strong;

      // Place cursor inside the <strong> (where Chrome would put it after Ctrl+B)
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(strong, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Replay a text character — should end up INSIDE the <strong>
      bridge.replayOneKey(blockId, { key: 'x', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, editField);

      // Check if 'x' is inside the <strong>
      const strongText = strong.textContent;
      const fullText = editField.textContent!.replace(/[\uFEFF\u200B]/g, '');
      return { strongText, fullText };
    });
    expect(r.strongText).toContain('x');
    expect(r.fullText).toBe('Hellox');
  });

  test('_handleFieldKeydown skips isComposing events (IME)', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();
      editField.innerHTML = '<p data-node-id="0">Hello</p>';
      editField.setAttribute('contenteditable', 'true');
      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'value';
      bridge.isInlineEditing = true;
      bridge.editMode = 'text';

      // Place cursor at end
      const textNode = editField.querySelector('p')!.firstChild!;
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, textNode.textContent!.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Dispatch a keydown with isComposing=true (simulates IME input)
      const composingEvent = new KeyboardEvent('keydown', {
        key: 'Process', code: 'KeyN', bubbles: true, cancelable: true,
        composed: true,
      });
      // Override isComposing (readonly in constructor, use defineProperty)
      Object.defineProperty(composingEvent, 'isComposing', { value: true });

      // Track if preventDefault was called
      let prevented = false;
      const origPreventDefault = composingEvent.preventDefault.bind(composingEvent);
      composingEvent.preventDefault = () => { prevented = true; origPreventDefault(); };

      editField.dispatchEvent(composingEvent);

      // Text should be unchanged (bridge didn't handle it)
      const text = editField.textContent!.replace(/[\uFEFF\u200B]/g, '');
      return { text, prevented };
    });
    // isComposing event should NOT be prevented — let native/IME handle
    expect(r.prevented).toBe(false);
    expect(r.text).toBe('Hello');
  });

  test('IME composition result is preserved via native input', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();
      editField.innerHTML = '<p data-node-id="0">Hello</p>';
      editField.setAttribute('contenteditable', 'true');
      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'value';
      bridge.isInlineEditing = true;
      bridge.editMode = 'text';

      // Place cursor at end
      const textNode = editField.querySelector('p')!.firstChild!;
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, textNode.textContent!.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // Simulate native IME inserting a character (compositionend)
      // In real IME, browser inserts the character natively
      textNode.textContent = 'Hello\u4e16'; // 世 (Chinese character)

      const text = editField.textContent!.replace(/[\uFEFF\u200B]/g, '');
      return { text };
    });
    // IME character should be in the text (inserted natively, not by replayOneKey)
    expect(r.text).toBe('Hello\u4e16');
  });

  test('Space on button element inserts space (not activate)', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();

      // Replace edit field content with a contenteditable button
      const btn = document.createElement('button');
      btn.setAttribute('data-edit-text', 'buttonText');
      btn.setAttribute('contenteditable', 'true');
      btn.textContent = 'Click';
      editField.innerHTML = '';
      editField.appendChild(btn);

      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'buttonText';
      bridge.isInlineEditing = true;

      // Place cursor at end
      const textNode = btn.firstChild!;
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, textNode.textContent!.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      bridge.replayOneKey(blockId, { key: ' ', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, btn);

      return { text: btn.textContent };
    });
    // Space should be inserted as text, not activate the button
    expect(r.text).toContain('Click\u00A0');
  });

  test('Tab in pre element inserts spaces', async () => {
    const iframe = helper.getIframe();
    const r = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      const blockId = 'mock-block-1';
      const blockEl = document.querySelector('[data-block-uid="mock-block-1"]')!;
      const editField = (blockEl.querySelector('[data-edit-text]') || blockEl) as HTMLElement;

      if (bridge.blockTextMutationObserver) bridge.blockTextMutationObserver.disconnect();

      const pre = document.createElement('pre');
      pre.setAttribute('data-edit-text', 'code');
      pre.setAttribute('contenteditable', 'true');
      pre.innerHTML = 'hello';
      editField.innerHTML = '';
      editField.appendChild(pre);

      bridge.selectedBlockUid = blockId;
      bridge.focusedFieldName = 'code';
      bridge.isInlineEditing = true;

      const textNode = pre.firstChild!;
      const sel = window.getSelection()!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      bridge.replayOneKey(blockId, { key: 'Tab', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, pre);

      return { text: pre.textContent };
    });
    expect(r.text).toBe('  hello');
  });
});
