/**
 * Unit tests for findPositionByVisibleOffset() - Range-based position finding
 * Uses real browser Range API which jsdom cannot properly simulate
 */

import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('findPositionByVisibleOffset() - Range-based position finding', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8888/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
  });

  test('finds position at offset 0', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">hello world</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 0);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('hello world');
    expect(result.offset).toBe(0);
  });

  test('finds position in middle of text', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">hello world</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 5);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('hello world');
    expect(result.offset).toBe(5);
  });

  test('skips empty text nodes using browser text model', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<strong data-node-id="0-1"></strong>' +
        '</div>';
      document.body.appendChild(container);

      const strong = container.querySelector('strong')!;
      strong.appendChild(document.createTextNode('')); // Empty - ignored by Range
      strong.appendChild(document.createTextNode('test'));

      const result = (window as any).bridge.findPositionByVisibleOffset(strong, 2);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('test');
    expect(result.offset).toBe(2);
  });

  test('handles multiple text nodes', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0"></p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      p.appendChild(document.createTextNode('hello'));
      p.appendChild(document.createTextNode(' '));
      p.appendChild(document.createTextNode('world'));

      // Offset 7 should be in "world" (after "hello " = 6 chars)
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 7);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('world');
    expect(result.offset).toBe(1); // 7 - 6 = 1
  });

  test('returns end of last text node for offset at end', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">test</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 4);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('test');
    expect(result.offset).toBe(4);
  });

  test('handles nested elements (bold inside paragraph)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">before <strong data-node-id="0-1">bold</strong> after</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;

      // Offset 9 should be in "bold" (after "before " = 7 chars, then 2 into "bold")
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 9);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe('bold');
    expect(result.offset).toBe(2);
  });

  test('finds position in text AFTER existing bold', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">before <strong data-node-id="0-1">bold</strong> after</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;

      // Offset 12 should be in " after" (after "before bold" = 11 chars, then 1 into " after")
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 12);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe(' after');
    expect(result.offset).toBe(1);
  });

  test('selection range in text after bold with Vue empty nodes', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0"></p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      p.appendChild(document.createTextNode('before '));

      const strong = document.createElement('strong');
      strong.setAttribute('data-node-id', '0-1');
      strong.appendChild(document.createTextNode('')); // Vue artifact
      strong.appendChild(document.createTextNode('bold'));
      p.appendChild(strong);

      p.appendChild(document.createTextNode(' after'));

      // Find position for offset 12 - should be in " after"
      const result = (window as any).bridge.findPositionByVisibleOffset(p, 12);

      container.remove();

      return {
        text: result?.node?.textContent,
        offset: result?.offset,
      };
    });

    expect(result.text).toBe(' after');
    expect(result.offset).toBe(1);
  });

  test('find start and end of word after bold', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0"><strong data-node-id="0-0">This</strong> bold text</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;

      // Find position for "text" which starts at offset 10
      const startResult = (window as any).bridge.findPositionByVisibleOffset(p, 10);
      const endResult = (window as any).bridge.findPositionByVisibleOffset(p, 14);

      container.remove();

      return {
        startText: startResult?.node?.textContent,
        startOffset: startResult?.offset,
        endText: endResult?.node?.textContent,
        endOffset: endResult?.offset,
      };
    });

    expect(result.startText).toBe(' bold text');
    expect(result.startOffset).toBe(6); // " bold " = 6 chars, then start of "text"
    expect(result.endText).toBe(' bold text');
    expect(result.endOffset).toBe(10); // end of " bold text"
  });
});
