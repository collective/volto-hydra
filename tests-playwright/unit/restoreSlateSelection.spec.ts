/**
 * Unit tests for Bridge.restoreSlateSelection()
 * Tests selection restoration after format operations
 */

import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Bridge.restoreSlateSelection()', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8889/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
  });

  test('range selection across inline boundary selects correct text', async () => {
    // After partial bold: "This is a <strong>test</strong> paragraph"
    // Restore selection to select just "test" (anchor inside strong, focus after strong)
    // Bug: cursor exit logic was firing for the focus point of a range selection,
    // creating a ZWS and shifting the selection to offset 0-1 instead of "test".
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const bridge = (window as any).bridge;

      // Set up formData with partial bold
      const blockId = 'mock-block-1';
      const value = [
        {
          type: 'p',
          children: [
            { text: 'This is a ' },
            { type: 'strong', children: [{ text: 'test' }] },
            { text: ' paragraph' },
          ],
        },
      ];
      // Add nodeIds
      const valueWithIds = bridge.addNodeIds(value);
      bridge.formData.blocks[blockId].value = valueWithIds;

      // Set up the DOM to match (simulate what the renderer produces)
      const blockEl = document.querySelector(`[data-block-uid="${blockId}"]`);
      const editField = blockEl?.querySelector('[data-edit-text="value"]') || blockEl;
      if (editField) {
        editField.innerHTML = '<p data-node-id="0">This is a <strong data-node-id="0.1">test</strong> paragraph</p>';
      }

      // Restore selection: anchor at start of "test" inside strong, focus at start of " paragraph"
      const selection = {
        anchor: { path: [0, 1, 0], offset: 0 },
        focus: { path: [0, 2], offset: 0 },
      };
      bridge.restoreSlateSelection(selection, bridge.formData);

      // Read back the browser selection
      const sel = document.getSelection();
      return {
        selectedText: sel?.toString() || '',
        anchorOffset: sel?.anchorOffset,
        focusOffset: sel?.focusOffset,
        isCollapsed: sel?.isCollapsed,
        rangeCount: sel?.rangeCount,
      };
    });

    expect(result.selectedText).toBe('test');
    expect(result.isCollapsed).toBe(false);
  });

  test('collapsed selection after inline does not break', async () => {
    // Collapsed cursor right after </strong> — cursor exit SHOULD fire here
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const bridge = (window as any).bridge;

      const blockId = 'mock-block-1';
      const value = [
        {
          type: 'p',
          children: [
            { text: 'This is a ' },
            { type: 'strong', children: [{ text: 'test' }] },
            { text: ' paragraph' },
          ],
        },
      ];
      const valueWithIds = bridge.addNodeIds(value);
      bridge.formData.blocks[blockId].value = valueWithIds;

      const blockEl = document.querySelector(`[data-block-uid="${blockId}"]`);
      const editField = blockEl?.querySelector('[data-edit-text="value"]') || blockEl;
      if (editField) {
        editField.innerHTML = '<p data-node-id="0">This is a <strong data-node-id="0.1">test</strong> paragraph</p>';
      }

      // Collapsed cursor at start of text after strong
      const selection = {
        anchor: { path: [0, 2], offset: 0 },
        focus: { path: [0, 2], offset: 0 },
      };
      bridge.restoreSlateSelection(selection, bridge.formData);

      const sel = document.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorOffset: sel?.anchorOffset,
      };
    });

    expect(result.isCollapsed).toBe(true);
  });
});
