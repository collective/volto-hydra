/**
 * Unit tests for Bridge.readSlateValueFromDOM()
 * Tests that DOM content is correctly read back as Slate JSON
 */

import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Bridge.readSlateValueFromDOM()', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8889/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
  });

  test('bold text with leading empty text node (Nuxt BOM)', async () => {
    // Nuxt renders a BOM/ZWS before <strong>, producing an extra empty
    // text node that readSlateValueFromDOM must handle.
    // HTML: <p data-node-id="0">﻿<strong data-node-id="0.0">Text</strong> to format</p>
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const bridge = (window as any).bridge;

      // Build the DOM as Nuxt would render it
      const field = document.createElement('div');
      field.setAttribute('data-edit-text', 'value');
      field.innerHTML = '<p data-node-id="0">\uFEFF<strong data-node-id="0.0">Text</strong> to format</p>';

      // The expected Slate value (with Slate normalization: empty text
      // nodes before/after inline elements)
      const existingValue = [
        {
          type: 'p',
          children: [
            { text: '' },
            { type: 'strong', children: [{ text: 'Text' }], nodeId: '0.0' },
            { text: ' to format' },
          ],
          nodeId: '0',
        },
      ];

      const domValue = bridge.readSlateValueFromDOM(field, existingValue);
      return {
        domValue,
        expected: existingValue,
        match: JSON.stringify(domValue) === JSON.stringify(existingValue),
      };
    });

    console.log('DOM value:', JSON.stringify(result.domValue));
    console.log('Expected:', JSON.stringify(result.expected));
    expect(result.match, `DOM value should match expected.\nDOM: ${JSON.stringify(result.domValue)}\nEXP: ${JSON.stringify(result.expected)}`).toBe(true);
  });
});
