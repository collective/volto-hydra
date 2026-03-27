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
 * `keys` are key names passed to bridge.replayOneKey.
 */
async function replay(
  iframe: ReturnType<AdminUIHelper['getIframe']>,
  html: string,
  cursorAt: 'start' | 'end' | number,
  keys: string[],
) {
  return await iframe.locator('body').evaluate(
    (_el: Element, { html, cursorAt, keys }: { html: string; cursorAt: string | number; keys: string[] }) => {
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
      bridge.eventBuffer = keys.map((key: string) => ({
        key,
        code: key,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }));
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

  // --- Bold with BOM between elements ---

  test('ArrowLeft through bold boundary with BOM', async () => {
    const r = await replay(helper.getIframe(),
      '<p data-node-id="0"><span>before</span>\uFEFF' +
      '<strong data-node-id="0.1"><span>bold</span></strong>\uFEFF</p>',
      'end', ['ArrowLeft', 'ArrowLeft']);
    expect(r.textBefore).toBe('beforebo');
  });
});
