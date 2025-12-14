/**
 * Unit tests for getNodePath() DOM path generation
 * Tests the REAL getNodePath function from hydra.js
 */

import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('getNodePath() - DOM to Slate path conversion (real hydra.js)', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);

    // Load the mock parent page which initializes the real hydra.js bridge
    await page.goto('http://localhost:8888/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');

    // Inject helper for creating DOM with preserved whitespace (Vue/Nuxt template artifacts)
    await helper.injectPreserveWhitespaceHelper();
  });

  test('plain text directly in paragraph', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Set up test DOM and call real getNodePath
    const path = await body.evaluate(() => {
      // Create test DOM structure inside a test container
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello world</p>';
      document.body.appendChild(container);

      const textNode = container.querySelector('p')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      // Clean up
      container.remove();
      return result;
    });

    expect(path).toEqual([0, 0]);
  });

  test('text inside bold span', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello <span style="font-weight: bold" data-node-id="0-1">world</span></p>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const plainTextNode = p.firstChild; // "Hello "
      const span = p.querySelector('span')!;
      const boldTextNode = span.firstChild; // "world"

      const result = {
        plainText: (window as any).bridge.getNodePath(plainTextNode),
        boldText: (window as any).bridge.getNodePath(boldTextNode),
      };

      container.remove();
      return result;
    });

    expect(paths.plainText).toEqual([0, 0]);
    expect(paths.boldText).toEqual([0, 1, 0]);
  });

  test('text-format-text pattern', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">This is <span data-node-id="0-1">bold</span> text</p>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const firstText = p.childNodes[0]; // "This is "
      const boldText = p.querySelector('span')!.firstChild; // "bold"
      const lastText = p.childNodes[2]; // " text"

      const result = {
        first: (window as any).bridge.getNodePath(firstText),
        bold: (window as any).bridge.getNodePath(boldText),
        last: (window as any).bridge.getNodePath(lastText),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.first).toEqual([0, 0]);
    expect(paths.bold).toEqual([0, 1, 0]);
    expect(paths.last).toEqual([0, 2]); // Text at index 2, no additional nesting
  });

  test('multiple formatted spans in sequence', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<span data-node-id="0-0">bold</span>' +
        '<span data-node-id="0-1">italic</span>' +
        '<span data-node-id="0-2">underline</span>' +
        '</p>';
      document.body.appendChild(container);

      const spans = container.querySelectorAll('span');
      const result = [
        (window as any).bridge.getNodePath(spans[0].firstChild),
        (window as any).bridge.getNodePath(spans[1].firstChild),
        (window as any).bridge.getNodePath(spans[2].firstChild),
      ];

      container.remove();
      return result;
    });

    expect(paths[0]).toEqual([0, 0, 0]);
    expect(paths[1]).toEqual([0, 1, 0]);
    expect(paths[2]).toEqual([0, 2, 0]);
  });

  test('nested formatting (bold + italic)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<span data-node-id="0-0">' +
        '<span data-node-id="0-0-0">nested</span>' +
        '</span>' +
        '</p>';
      document.body.appendChild(container);

      const textNode = container.querySelector('span span')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    expect(path).toEqual([0, 0, 0, 0]);
  });

  test('paragraph with wrapper div for editable field', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">Hello world</p></div>';
      document.body.appendChild(container);

      const textNode = container.querySelector('p')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    expect(path).toEqual([0, 0]);
  });

  test('element node (not text node) returns path without text leaf index', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">text</p></div>';
      document.body.appendChild(container);

      const pElement = container.querySelector('p')!;
      const result = (window as any).bridge.getNodePath(pElement);

      container.remove();
      return result;
    });

    // Should not append 0 because we didn't start from text node
    expect(path).toEqual([0]);
  });

  test('node without editable field container returns null', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML = '<p data-node-id="0">No editable field marker</p>';
      document.body.appendChild(container);

      const textNode = container.querySelector('p')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    expect(path).toBeNull();
  });

  test('counts text nodes and elements correctly in sibling positions', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');

      // Build DOM manually to ensure we get 3 child nodes
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const text1 = document.createTextNode('text1');
      const span = document.createElement('span');
      span.setAttribute('data-node-id', '0-1');
      span.textContent = 'span';
      const text2 = document.createTextNode('text2');

      p.appendChild(text1);
      p.appendChild(span);
      p.appendChild(text2);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        text1: (window as any).bridge.getNodePath(text1),
        spanText: (window as any).bridge.getNodePath(span.firstChild),
        text2: (window as any).bridge.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.text1).toEqual([0, 0]);
    expect(paths.spanText).toEqual([0, 1, 0]);
    expect(paths.text2).toEqual([0, 2]); // Text at index 2, no additional nesting
  });

  test('first word bold - "This is a test" with "This" bold', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span = document.createElement('span');
      span.setAttribute('data-node-id', '0-0');
      span.textContent = 'This';

      const text = document.createTextNode(' is a test paragraph');

      p.appendChild(span);
      p.appendChild(text);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        boldThis: (window as any).bridge.getNodePath(span.firstChild),
        plainText: (window as any).bridge.getNodePath(text),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(2);
    expect(paths.boldThis).toEqual([0, 0, 0]); // First span, first text
    expect(paths.plainText).toEqual([0, 1]); // Second child of paragraph
  });

  test('middle word bold - "This is a test" with "test" bold', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const text1 = document.createTextNode('This is a ');
      const span = document.createElement('span');
      span.setAttribute('data-node-id', '0-1');
      span.textContent = 'test';
      const text2 = document.createTextNode(' paragraph');

      p.appendChild(text1);
      p.appendChild(span);
      p.appendChild(text2);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        plainTextBefore: (window as any).bridge.getNodePath(text1),
        boldTest: (window as any).bridge.getNodePath(span.firstChild),
        plainTextAfter: (window as any).bridge.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.plainTextBefore).toEqual([0, 0]); // First child
    expect(paths.boldTest).toEqual([0, 1, 0]); // Second child (span), text inside
    expect(paths.plainTextAfter).toEqual([0, 2]); // Third child
  });

  test('two bold words - "This is a test" with "This" and "test" both bold', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span1 = document.createElement('span');
      span1.setAttribute('data-node-id', '0-0');
      span1.textContent = 'This';

      const text1 = document.createTextNode(' is a ');

      const span2 = document.createElement('span');
      span2.setAttribute('data-node-id', '0-2');
      span2.textContent = 'test';

      const text2 = document.createTextNode(' paragraph');

      p.appendChild(span1);
      p.appendChild(text1);
      p.appendChild(span2);
      p.appendChild(text2);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        boldThis: (window as any).bridge.getNodePath(span1.firstChild),
        plainTextMiddle: (window as any).bridge.getNodePath(text1),
        boldTest: (window as any).bridge.getNodePath(span2.firstChild),
        plainTextEnd: (window as any).bridge.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(4);
    expect(paths.boldThis).toEqual([0, 0, 0]); // First span (index 0), text inside
    expect(paths.plainTextMiddle).toEqual([0, 1]); // Text node at index 1
    expect(paths.boldTest).toEqual([0, 2, 0]); // Second span (index 2), text inside
    expect(paths.plainTextEnd).toEqual([0, 3]); // Text node at index 3
  });

  test('parses dot notation data-node-id - "0.1" format', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span1 = document.createElement('span');
      span1.setAttribute('data-node-id', '0.1');
      span1.textContent = 'This';

      const text1 = document.createTextNode(' is a ');

      const span2 = document.createElement('span');
      span2.setAttribute('data-node-id', '0.3');
      span2.textContent = 'test';

      const text2 = document.createTextNode(' paragraph');

      p.appendChild(span1);
      p.appendChild(text1);
      p.appendChild(span2);
      p.appendChild(text2);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        textInFirstSpan: (window as any).bridge.getNodePath(span1.firstChild),
        textBetweenSpans: (window as any).bridge.getNodePath(text1),
        textInSecondSpan: (window as any).bridge.getNodePath(span2.firstChild),
        textAfter: (window as any).bridge.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(4);
    // Text inside span with data-node-id="0.1" -> path [0, 1, 0]
    expect(paths.textInFirstSpan).toEqual([0, 1, 0]);
    // Text between spans - after node at 0.1, so at Slate index 2 -> [0, 2]
    expect(paths.textBetweenSpans).toEqual([0, 2]);
    // Text inside span with data-node-id="0.3" -> path [0, 3, 0]
    expect(paths.textInSecondSpan).toEqual([0, 3, 0]);
    // Text after second span - after node at 0.3, so at Slate index 4 -> [0, 4]
    expect(paths.textAfter).toEqual([0, 4]);
  });

  test('parses dash notation data-node-id - "0-1" format', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span1 = document.createElement('span');
      span1.setAttribute('data-node-id', '0-1');
      span1.textContent = 'bold';

      const text1 = document.createTextNode(' plain ');

      const span2 = document.createElement('span');
      span2.setAttribute('data-node-id', '0-3');
      span2.textContent = 'italic';

      p.appendChild(span1);
      p.appendChild(text1);
      p.appendChild(span2);
      container.appendChild(p);
      document.body.appendChild(container);

      const result = {
        boldText: (window as any).bridge.getNodePath(span1.firstChild),
        plainText: (window as any).bridge.getNodePath(text1),
        italicText: (window as any).bridge.getNodePath(span2.firstChild),
      };

      container.remove();
      return result;
    });

    expect(paths.boldText).toEqual([0, 1, 0]);
    expect(paths.plainText).toEqual([0, 2]);
    expect(paths.italicText).toEqual([0, 3, 0]);
  });

  test('complex scenario - multiple formatted regions with gaps', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      // <span data-node-id="0.1">This</span>
      const span1 = document.createElement('span');
      span1.setAttribute('style', 'font-weight: bold');
      span1.setAttribute('data-node-id', '0.1');
      span1.textContent = 'This';

      // " is a "
      const text1 = document.createTextNode(' is a ');

      // <span data-node-id="0.3">test</span>
      const span2 = document.createElement('span');
      span2.setAttribute('style', 'font-weight: bold');
      span2.setAttribute('data-node-id', '0.3');
      span2.textContent = 'test';

      // " paragraph"
      const text2 = document.createTextNode(' paragraph');

      p.appendChild(span1);
      p.appendChild(text1);
      p.appendChild(span2);
      p.appendChild(text2);
      container.appendChild(p);
      document.body.appendChild(container);

      // Test paths for all positions
      const result = {
        // Cursor in "This" (bold)
        inThis: (window as any).bridge.getNodePath(span1.firstChild),
        // Cursor in " is a " (plain)
        inPlain: (window as any).bridge.getNodePath(text1),
        // Cursor in "test" (bold)
        inTest: (window as any).bridge.getNodePath(span2.firstChild),
        // Cursor in " paragraph" (plain)
        inParagraph: (window as any).bridge.getNodePath(text2),
      };

      container.remove();
      return result;
    });

    // These are the paths that should make isActive work correctly
    expect(paths.inThis).toEqual([0, 1, 0]); // Bold - isActive should be true
    expect(paths.inPlain).toEqual([0, 2]); // Plain - isActive should be false
    expect(paths.inTest).toEqual([0, 3, 0]); // Bold - isActive should be true
    expect(paths.inParagraph).toEqual([0, 4]); // Plain - isActive should be false
  });

  test('handles whitespace text nodes in sibling counting', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span1 = document.createElement('span');
      span1.setAttribute('data-node-id', '0-0');
      span1.textContent = 'a';

      const whitespace = document.createTextNode('\n  ');

      const span2 = document.createElement('span');
      span2.setAttribute('data-node-id', '0-1');
      span2.textContent = 'b';

      p.appendChild(span1);
      p.appendChild(whitespace);
      p.appendChild(span2);
      container.appendChild(p);
      document.body.appendChild(container);

      // Get references to the actual nodes we appended
      const ws = p.childNodes[1];

      const result = {
        span1Text: (window as any).bridge.getNodePath(span1.firstChild),
        whitespace: (window as any).bridge.getNodePath(ws),
        span2Text: (window as any).bridge.getNodePath(span2.firstChild),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    // span1's text is at [0, 0, 0] - from data-node-id="0-0"
    // whitespace is at [0, 1] - Slate index based on sibling with data-node-id="0-0"
    // span2's text is at [0, 1, 0] - from data-node-id="0-1" (NOT DOM position!)
    // Note: getNodePath uses data-node-id to derive path, not DOM position
    expect(paths.childNodesCount).toBe(3);
    expect(paths.span1Text).toEqual([0, 0, 0]);
    expect(paths.whitespace).toEqual([0, 1]); // Slate index from previous sibling's data-node-id
    expect(paths.span2Text).toEqual([0, 1, 0]); // Path from data-node-id="0-1"
  });

  test('empty paragraph with placeholder BR', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><br></p>';
      document.body.appendChild(container);

      const brElement = container.querySelector('br');
      const result = (window as any).bridge.getNodePath(brElement);

      container.remove();
      return result;
    });

    // BR element walks up to find parent with data-node-id, returns [0]
    expect(path).toEqual([0]);
  });

  test('deeply nested structure', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value"><div><div><p data-node-id="0">text</p></div></div></div>';
      document.body.appendChild(container);

      const textNode = container.querySelector('p')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    // Only elements with data-node-id are counted
    expect(path).toEqual([0, 0]);
  });

  test('text wrapped in span WITHOUT nodeId inside strong', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1"><span>Disclaimer</span></strong>' +
        '</p>' +
        '</div>';
      document.body.appendChild(container);

      const textNode = container.querySelector('strong span')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    // Span without nodeId should be skipped, path from strong is [1, 1, 0]
    expect(path).toEqual([1, 1, 0]);
  });

  test('plain text directly in strong (no wrapper span)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1">Disclaimer</strong>' +
        '</p>' +
        '</div>';
      document.body.appendChild(container);

      const textNode = container.querySelector('strong')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    expect(path).toEqual([1, 1, 0]);
  });

  test('double wrapper with same node-id', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<strong data-node-id="0-0"><em data-node-id="0-0">styled text</em></strong>' +
        '</p>';
      document.body.appendChild(container);

      const textNode = container.querySelector('em')!.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    // Both wrappers have same node-id "0-0", path should be [0, 0, 0]
    expect(path).toEqual([0, 0, 0]);
  });

  test('double wrapper with text before and after', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        'before <strong data-node-id="0-1"><em data-node-id="0-1">bold</em></strong> after' +
        '</p>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const beforeText = p.firstChild;
      const boldText = container.querySelector('em')!.firstChild;
      const afterText = p.lastChild;

      const result = {
        before: (window as any).bridge.getNodePath(beforeText),
        bold: (window as any).bridge.getNodePath(boldText),
        after: (window as any).bridge.getNodePath(afterText),
      };

      container.remove();
      return result;
    });

    expect(paths.before).toEqual([0, 0]);
    expect(paths.bold).toEqual([0, 1, 0]);
    expect(paths.after).toEqual([0, 2]);
  });

  test('production bug - empty text + strong + text AFTER', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1"><strong data-node-id="1-1">Disclaimer</strong>: This instance is reset every night</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelectorAll('p')[1];
      const textAfterStrong = p.lastChild;
      const result = (window as any).bridge.getNodePath(textAfterStrong);

      container.remove();
      return result;
    });

    // Text after strong (node-id 1-1) should be at Slate index 2 (1+1)
    expect(path).toEqual([1, 2]);
  });

  test('text wrapped in spans (Nuxt wrapper scenario)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1">' +
        '<span></span>' +
        '<strong data-node-id="1-1">Disclaimer</strong>' +
        '<span>: This instance is reset every night</span>' +
        '</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelectorAll('p')[1];
      const lastSpan = p.lastElementChild as HTMLElement;
      const textInSpan = lastSpan.firstChild;
      const result = (window as any).bridge.getNodePath(textInSpan);

      container.remove();
      return result;
    });

    // Text inside wrapper span without nodeId resolves to parent's position
    expect(path).toEqual([1, 2]);
  });

  test('list with links - li and link HAVE nodeId', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<ul class="list-disc">' +
        '<li data-node-id="0.0"><span></span><a data-node-id="0.0.1" href="#"><span>NUXT.js Example</span></a><span></span></li>' +
        '</ul>' +
        '</div>';
      document.body.appendChild(container);

      const linkSpan = container.querySelector('a span')!;
      const textNode = linkSpan.firstChild;
      const result = (window as any).bridge.getNodePath(textNode);

      container.remove();
      return result;
    });

    // Expected: [0, 0, 1, 0] - text inside link at [0, 0, 1]
    expect(path).toEqual([0, 0, 1, 0]);
  });

  test('text BEFORE bold + bold + text AFTER (Nuxt structure)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">' +
        'This text appears after the slider. Click on ' +
        '<strong data-node-id="0-1">bold text</strong>' +
        ' to test getNodePath.' +
        '</p>' +
        '</div>';
      document.body.appendChild(container);

      const p = container.querySelector('p')!;
      const textAfterBold = p.lastChild;
      const result = (window as any).bridge.getNodePath(textAfterBold);

      container.remove();
      return result;
    });

    // Expected path for clicking on last text: [0, 2]
    expect(path).toEqual([0, 2]);
  });

  test('whitespace text node before p in container (Vue template artifact)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      // Use the injected helper that preserves whitespace text nodes
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-whitespace-container" data-editable-field="value">\n' +
        '  <p data-node-id="0">Hello world</p>\n' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-whitespace-container')!;
      const whitespaceNode = container.firstChild as Text;
      const bridge = (window as any).bridge;

      const isTextNode = whitespaceNode?.nodeType === Node.TEXT_NODE;
      const textContent = whitespaceNode?.textContent;

      // Test isOnInvalidWhitespace detection
      const isInvalid = bridge.isOnInvalidWhitespace(whitespaceNode);

      // Test cursor correction: set cursor on whitespace, then correct it
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.setStart(whitespaceNode, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // Cursor should now be on whitespace
      const cursorBeforeCorrection = selection.anchorNode;

      // Correct the selection
      bridge.correctInvalidWhitespaceSelection();

      // After correction, cursor should be in the first text node inside the p
      const cursorAfterCorrection = selection.anchorNode;
      const offsetAfterCorrection = selection.anchorOffset;
      const cursorInValidNode = cursorAfterCorrection?.parentElement?.hasAttribute('data-node-id');

      container.remove();

      return {
        isTextNode,
        textContent,
        isInvalid,
        cursorWasOnWhitespace: cursorBeforeCorrection === whitespaceNode,
        cursorInValidNode,
        offsetAfterCorrection,
      };
    });

    expect(result.isTextNode).toBe(true);
    expect(result.textContent).toBe('\n  ');
    expect(result.isInvalid).toBe(true);
    expect(result.cursorWasOnWhitespace).toBe(true);
    // After correction, cursor should be in a valid node (inside element with data-node-id)
    expect(result.cursorInValidNode).toBe(true);
    expect(result.offsetAfterCorrection).toBe(0); // Start of first text node
  });

  test('text BEFORE bold + bold + text AFTER with Vue whitespace', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const path = await body.evaluate(() => {
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-vue-whitespace" data-editable-field="value">\n' +
        '  <p data-node-id="0">\n' +
        '    This text appears after the slider. Click on \n' +
        '    <strong data-node-id="0.1">bold text</strong>\n' +
        '     to test getNodePath.\n' +
        '  </p>\n' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-vue-whitespace')!;
      const p = container.querySelector('p')!;
      // Find the actual text node containing "to test" (not whitespace artifacts)
      const textAfterBold = Array.from(p.childNodes).find(
        (n: any) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes('to test')
      );

      const result = (window as any).bridge.getNodePath(textAfterBold);

      container.remove();

      return result;
    });

    // With range.toString() normalization, path should be [0, 2]
    expect(path).toEqual([0, 2]);
  });

  test('text with leading whitespace INSIDE strong returns correct path', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      // Two strongs with Vue template whitespace
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-leading-whitespace" data-editable-field="value">\n' +
        '  <p data-node-id="0">\n' +
        '    This text appears after the \n' +
        '    <strong data-node-id="0.1">slider</strong>\n' +
        '    . Click on \n' +
        '    <strong data-node-id="0.3">\n      bold text\n    </strong>\n' +
        '     to test getNodePath.\n' +
        '  </p>\n' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-leading-whitespace')!;
      // Find text inside the second strong - includes leading/trailing whitespace
      const strong2 = container.querySelectorAll('strong')[1];
      const textInStrong = strong2.firstChild;

      const isTextNode = textInStrong?.nodeType === Node.TEXT_NODE;
      const textContent = (textInStrong as Text)?.textContent;
      const path = (window as any).bridge.getNodePath(textInStrong);

      container.remove();

      return { isTextNode, textContent, path };
    });

    expect(result.isTextNode).toBe(true);
    // The text includes template whitespace
    expect(result.textContent).toBe('\n      bold text\n    ');
    // Even with leading whitespace, should resolve to [0, 3, 0]
    expect(result.path).toEqual([0, 3, 0]);
  });
});

test.describe('getNodeIdFromPath() - Slate path to DOM nodeId conversion (real hydra.js)', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);

    // Load the mock parent page which initializes the real hydra.js bridge
    await page.goto('http://localhost:8888/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');

    // Inject helper for creating DOM with preserved whitespace
    await helper.injectPreserveWhitespaceHelper();
  });

  test('path to text node returns parent nodeId', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Slate structure: [{type: 'p', children: [{text: 'Hello'}], nodeId: '0'}]
    // Path [0, 0] points to the text node
    const result = await body.evaluate(() => {
      const slateValue = [
        { type: 'p', children: [{ text: 'Hello' }], nodeId: '0' },
      ];
      return (window as any).bridge.getNodeIdFromPath(slateValue, [0, 0]);
    });

    expect(result.nodeId).toBe('0');
    expect(result.textChildIndex).toBe(0);
  });

  test('path to inline element returns its nodeId', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const slateValue = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { type: 'strong', children: [{ text: 'world' }], nodeId: '0.1' },
          ],
          nodeId: '0',
        },
      ];
      return (window as any).bridge.getNodeIdFromPath(slateValue, [0, 1]);
    });

    // Inline element has its own nodeId, textChildIndex is null (not a text node)
    expect(result.nodeId).toBe('0.1');
    expect(result.textChildIndex).toBeNull();
  });

  test('path [0,2] to empty text node after inline element returns parent nodeId', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // This tests the case where Slate has an empty text node after an inline element
    // Path [0, 2] points to the empty text node AFTER the strong
    const result = await body.evaluate(() => {
      const slateValue = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { type: 'strong', children: [{ text: 'world' }], nodeId: '0.1' },
            { text: '' }, // Empty text node at index 2
          ],
          nodeId: '0',
        },
      ];

      // Get nodeId for path [0, 2] (the empty text node)
      return (window as any).bridge.getNodeIdFromPath(slateValue, [0, 2]);
    });

    // Text nodes return parent's nodeId, with textChildIndex indicating position
    expect(result.nodeId).toBe('0');
    expect(result.textChildIndex).toBe(2);
  });

  test('BUG: selection restoration for path [0,2] offset 0 should position after inline element', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // This test demonstrates the selection restoration bug:
    // - Slate has: "Hello " + <strong>world</strong> + "" (empty text at index 2)
    // - User toggles bold off, cursor should be AFTER "world"
    // - Slate selection: path [0, 2], offset 0
    // - Current bug: cursor ends up at start of "Hello " instead of after "world"

    const result = await body.evaluate(() => {
      const container = document.createElement('div');

      // Build DOM: <p data-node-id="test-0">Hello <span data-node-id="test-0.1">world</span></p>
      // Note: empty text node at Slate index 2 doesn't render in DOM
      // Using unique nodeIds to avoid collision with existing mock content
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', 'test-0');

      const text1 = document.createTextNode('Hello ');
      const span = document.createElement('span');
      span.setAttribute('data-node-id', 'test-0.1');
      span.textContent = 'world';

      p.appendChild(text1);
      p.appendChild(span);
      container.appendChild(p);
      document.body.appendChild(container);

      // Slate value with empty text node at index 2
      const slateValue = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { type: 'strong', children: [{ text: 'world' }], nodeId: 'test-0.1' },
            { text: '' }, // Empty text at index 2 - this is where cursor should be
          ],
          nodeId: 'test-0',
        },
      ];

      // Slate selection after toggling bold off: path [0, 2], offset 0
      const slateSelection = {
        anchor: { path: [0, 2], offset: 0 },
        focus: { path: [0, 2], offset: 0 },
      };

      // getNodeIdFromPath now returns {nodeId, textChildIndex, parentChildren}
      const nodeIdResult = (window as any).bridge.getNodeIdFromPath(
        slateValue,
        slateSelection.anchor.path
      );

      // Find the DOM element
      const element = document.querySelector('[data-node-id="' + nodeIdResult.nodeId + '"]');

      // Use calculateAbsoluteOffset to get the correct offset
      // This should sum text from all children before the target child
      let absoluteOffset = slateSelection.anchor.offset;
      if (nodeIdResult.textChildIndex !== null && nodeIdResult.parentChildren) {
        absoluteOffset = (window as any).bridge.calculateAbsoluteOffset(
          nodeIdResult.parentChildren,
          nodeIdResult.textChildIndex,
          slateSelection.anchor.offset
        );
      }

      // Now find the text node with the correct absolute offset
      const textResult = (window as any).bridge.findPositionByVisibleOffset(element, absoluteOffset);

      container.remove();

      return {
        // The fixed behavior using calculateAbsoluteOffset
        foundText: textResult?.node?.textContent,
        foundOffset: textResult?.offset,
        // Debug info
        nodeIdResult: nodeIdResult,
        calculatedAbsoluteOffset: absoluteOffset,
      };
    });

    console.log('Found:', result.foundText, 'at offset', result.foundOffset);
    console.log('Absolute offset calculated:', result.calculatedAbsoluteOffset);

    // After the fix: cursor should be at end of "world" (offset 5)
    // calculateAbsoluteOffset([{text:"Hello "}, {strong...}, {text:""}], 2, 0) = 6 + 5 + 0 = 11
    expect(result.calculatedAbsoluteOffset).toBe(11); // 6 ("Hello ") + 5 ("world") = 11
    expect(result.foundText).toBe('world');
    expect(result.foundOffset).toBe(5); // End of "world"
  });

  test('getNodeIdFromPath with text inside nested inline element', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const slateValue = [
        {
          type: 'p',
          children: [
            { text: 'Normal ' },
            {
              type: 'strong',
              children: [
                {
                  type: 'em',
                  children: [{ text: 'bold-italic' }],
                  nodeId: '0.1.0',
                },
              ],
              nodeId: '0.1',
            },
            { text: ' end' },
          ],
          nodeId: '0',
        },
      ];

      return {
        // Path to text node inside nested em
        nestedText: (window as any).bridge.getNodeIdFromPath(slateValue, [0, 1, 0, 0]),
        // Path to em element
        emElement: (window as any).bridge.getNodeIdFromPath(slateValue, [0, 1, 0]),
        // Path to strong element
        strongElement: (window as any).bridge.getNodeIdFromPath(slateValue, [0, 1]),
        // Path to trailing text
        trailingText: (window as any).bridge.getNodeIdFromPath(slateValue, [0, 2]),
      };
    });

    // Text inside em uses em's nodeId
    expect(result.nestedText.nodeId).toBe('0.1.0');
    expect(result.nestedText.textChildIndex).toBe(0);
    // em element has its own nodeId (not a text node)
    expect(result.emElement.nodeId).toBe('0.1.0');
    expect(result.emElement.textChildIndex).toBeNull();
    // strong element has its own nodeId
    expect(result.strongElement.nodeId).toBe('0.1');
    expect(result.strongElement.textChildIndex).toBeNull();
    // Trailing text uses paragraph's nodeId
    expect(result.trailingText.nodeId).toBe('0');
    expect(result.trailingText.textChildIndex).toBe(2);
  });

  test('getNodeIdFromPath returns null for invalid path', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const slateValue = [
        { type: 'p', children: [{ text: 'Hello' }], nodeId: '0' },
      ];
      return (window as any).bridge.getNodeIdFromPath(slateValue, [0, 5]); // Index 5 doesn't exist
    });

    expect(result).toBeNull();
  });

  // ZWS-specific tests for cursor exit scenarios
  test('ZWS text node after inline element returns correct path', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-zws-after" data-editable-field="value">' +
        '<p data-node-id="0">Hello <span data-node-id="0-1">world</span>\uFEFF</p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-zws-after')!;
      const p = container.querySelector('p')!;
      const span = p.querySelector('span')!;

      const result = {
        helloText: (window as any).bridge.getNodePath(p.childNodes[0]),
        worldText: (window as any).bridge.getNodePath(span.firstChild),
        zwsText: (window as any).bridge.getNodePath(p.childNodes[2]),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.helloText).toEqual([0, 0]);
    expect(paths.worldText).toEqual([0, 1, 0]);
    // ZWS after span should be at index 2 (third child of paragraph)
    expect(paths.zwsText).toEqual([0, 2]);
  });

  test('ZWS inside empty inline element (prospective formatting)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-zws-inside" data-editable-field="value">' +
        '<p data-node-id="0">Hello <span data-node-id="0-1">\uFEFF</span></p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-zws-inside')!;
      const p = container.querySelector('p')!;
      const span = p.querySelector('span')!;

      const result = {
        helloText: (window as any).bridge.getNodePath(p.childNodes[0]),
        zwsInsideSpan: (window as any).bridge.getNodePath(span.firstChild),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(2);
    expect(paths.helloText).toEqual([0, 0]);
    // ZWS inside span should have path inside the span element
    expect(paths.zwsInsideSpan).toEqual([0, 1, 0]);
  });

  test('ZWS + typed text inside span with ZWS after (cursor exit scenario)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const paths = await body.evaluate(() => {
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-zws-both" data-editable-field="value">' +
        '<p data-node-id="0">Hello <span data-node-id="0-1">\uFEFFworld</span>\uFEFF</p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-zws-both')!;
      const p = container.querySelector('p')!;
      const span = p.querySelector('span')!;

      const result = {
        helloText: (window as any).bridge.getNodePath(p.childNodes[0]),
        zwsPlusWorldText: (window as any).bridge.getNodePath(span.firstChild),
        zwsAfterSpan: (window as any).bridge.getNodePath(p.childNodes[2]),
        childNodesCount: p.childNodes.length,
      };

      container.remove();
      return result;
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.helloText).toEqual([0, 0]);
    // Text with ZWS prefix inside span should have path inside the span
    expect(paths.zwsPlusWorldText).toEqual([0, 1, 0]);
    // ZWS after span should be at index 2
    expect(paths.zwsAfterSpan).toEqual([0, 2]);
  });
});
