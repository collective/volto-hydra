/**
 * Unit tests for getNodePath() DOM path generation
 * Tests various DOM structures and verifies correct Slate path generation
 */

import { test, expect } from '@playwright/test';

test.describe('getNodePath() - DOM to Slate path conversion', () => {
  test.beforeEach(async ({ page }) => {
    // Load a minimal page with the getNodePath function
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>getNodePath Tests</title></head>
        <body>
          <div id="test-container"></div>
          <script>
            // Copy of the getNodePath function from hydra.js
            function getSlateIndexAmongSiblings(node, parent) {
              const siblings = Array.from(parent.childNodes);
              const nodeIndex = siblings.indexOf(node);

              let slateIndex = 0;
              for (let i = 0; i < nodeIndex; i++) {
                const sibling = siblings[i];
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.hasAttribute('data-node-id')) {
                  const nodeId = sibling.getAttribute('data-node-id');
                  const parts = nodeId.split(/[.-]/);
                  const lastIndex = parseInt(parts[parts.length - 1], 10);
                  slateIndex = lastIndex + 1;
                } else if (sibling.nodeType === Node.TEXT_NODE) {
                  slateIndex++;
                }
              }
              return slateIndex;
            }

            function getNodePath(node) {
              const path = [];
              let current = node;

              // If starting with a text node, calculate its Slate index
              if (node.nodeType === Node.TEXT_NODE) {
                const parent = node.parentNode;

                // Check if parent has data-node-id AND is an inline element (span, strong, etc.)
                // Inline elements wrap their text directly, blocks (p, div) may have multiple text children
                if (
                  parent.hasAttribute?.('data-node-id') &&
                  parent.nodeName !== 'P' &&
                  parent.nodeName !== 'DIV' &&
                  !parent.hasAttribute?.('data-editable-field')
                ) {
                  const nodeId = parent.getAttribute('data-node-id');
                  // Parse the parent's path from its node ID
                  const parts = nodeId.split(/[.-]/).map(p => parseInt(p, 10));
                  // Text node index within the parent element
                  const siblings = Array.from(parent.childNodes);
                  const textIndex = siblings.indexOf(node);
                  // Build path: parent path + text index
                  path.push(...parts, textIndex);
                  return path;
                } else {
                  // Parent is a block element or doesn't have data-node-id
                  // Calculate Slate index among siblings considering node IDs
                  const slateIndex = getSlateIndexAmongSiblings(node, parent);
                  path.push(slateIndex);
                  current = parent;
                }
              }

              // Walk up the DOM tree building the path
              while (current) {
                const hasNodeId = current.hasAttribute?.('data-node-id');
                const hasEditableField = current.hasAttribute?.('data-editable-field');
                const hasSlateEditor = current.hasAttribute?.('data-slate-editor');

                // Process current node
                if (hasNodeId) {
                  const nodeId = current.getAttribute('data-node-id');
                  // Parse node ID to get path components (e.g., "0.1" -> [0, 1] or "0-1" -> [0, 1])
                  const parts = nodeId.split(/[.-]/).map(p => parseInt(p, 10));
                  // Prepend these path components
                  for (let i = parts.length - 1; i >= 0; i--) {
                    path.unshift(parts[i]);
                  }
                }

                // Stop if we've reached the editable field container or slate editor
                if (hasEditableField || hasSlateEditor) {
                  break;
                }

                current = current.parentNode;
              }

              // If we didn't find the editable field or slate editor, path is invalid
              if (!current) {
                return null;
              }

              // Ensure path has at least block index
              if (path.length === 0) {
                return [0, 0]; // Default to first block, first text
              }

              return path;
            }

            // Make it globally available for tests
            window.getNodePath = getNodePath;
          </script>
        </body>
      </html>
    `);
  });

  test('plain text directly in paragraph', async ({ page }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">Hello world</p>
    // Expected: [0, 0] (paragraph 0, text leaf 0)
    const path = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello world</p>';
      const textNode = container.querySelector('p').firstChild;
      return window.getNodePath(textNode);
    });

    expect(path).toEqual([0, 0]);
  });

  test('text inside bold span', async ({ page }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        Hello <span data-node-id="0-1">world</span>
    //      </p>
    // Expected: text "world" at [0, 1, 0] (paragraph 0, span 1, text leaf 0)
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello <span style="font-weight: bold" data-node-id="0-1">world</span></p>';

      const p = container.querySelector('p');
      const plainTextNode = p.firstChild; // "Hello "
      const span = p.querySelector('span');
      const boldTextNode = span.firstChild; // "world"

      return {
        plainText: window.getNodePath(plainTextNode),
        boldText: window.getNodePath(boldTextNode),
      };
    });

    expect(paths.plainText).toEqual([0, 0]);
    expect(paths.boldText).toEqual([0, 1, 0]);
  });

  test('text-format-text pattern', async ({ page }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        This is <span data-node-id="0-1">bold</span> text
    //      </p>
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">This is <span data-node-id="0-1">bold</span> text</p>';

      const p = container.querySelector('p');
      const firstText = p.childNodes[0]; // "This is "
      const boldText = p.querySelector('span').firstChild; // "bold"
      const lastText = p.childNodes[2]; // " text"

      return {
        first: window.getNodePath(firstText),
        bold: window.getNodePath(boldText),
        last: window.getNodePath(lastText),
        childNodesCount: p.childNodes.length,
      };
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.first).toEqual([0, 0]);
    expect(paths.bold).toEqual([0, 1, 0]);
    expect(paths.last).toEqual([0, 2]); // Text at index 2, no additional nesting
  });

  test('multiple formatted spans in sequence', async ({ page }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        <span data-node-id="0-0">bold</span>
    //        <span data-node-id="0-1">italic</span>
    //        <span data-node-id="0-2">underline</span>
    //      </p>
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<span data-node-id="0-0">bold</span>' +
        '<span data-node-id="0-1">italic</span>' +
        '<span data-node-id="0-2">underline</span>' +
        '</p>';

      const spans = container.querySelectorAll('span');
      return [
        window.getNodePath(spans[0].firstChild),
        window.getNodePath(spans[1].firstChild),
        window.getNodePath(spans[2].firstChild),
      ];
    });

    expect(paths[0]).toEqual([0, 0, 0]);
    expect(paths[1]).toEqual([0, 1, 0]);
    expect(paths[2]).toEqual([0, 2, 0]);
  });

  test('nested formatting (bold + italic)', async ({ page }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        <span data-node-id="0-0">
    //          <span data-node-id="0-0-0">nested</span>
    //        </span>
    //      </p>
    const path = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<span data-node-id="0-0">' +
        '<span data-node-id="0-0-0">nested</span>' +
        '</span>' +
        '</p>';

      const textNode = container.querySelector('span span').firstChild;
      return window.getNodePath(textNode);
    });

    expect(path).toEqual([0, 0, 0, 0]);
  });

  test('paragraph with wrapper div for editable field', async ({ page }) => {
    // Alternative structure: wrapper has data-editable-field
    // DOM: <div data-editable-field="value">
    //        <p data-node-id="0">Hello world</p>
    //      </div>
    const path = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">Hello world</p></div>';

      const textNode = container.querySelector('p').firstChild;
      return window.getNodePath(textNode);
    });

    expect(path).toEqual([0, 0]);
  });

  test('element node (not text node) returns path without text leaf index', async ({
    page,
  }) => {
    // Testing from an element rather than text node
    const path = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">text</p></div>';

      const pElement = container.querySelector('p');
      return window.getNodePath(pElement);
    });

    // Should not append 0 because we didn't start from text node
    expect(path).toEqual([0]);
  });

  test('node without editable field container returns null', async ({
    page,
  }) => {
    const path = await page.evaluate(() => {
      const container = document.getElementById('test-container');
      container.innerHTML = '<p data-node-id="0">No editable field marker</p>';

      const textNode = container.querySelector('p').firstChild;
      return window.getNodePath(textNode);
    });

    expect(path).toBeNull();
  });

  test('counts text nodes and elements correctly in sibling positions', async ({
    page,
  }) => {
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        text1<span data-node-id="0-1">span</span>text2
    //      </p>
    // Siblings: [text1, span, text2] -> indices [0, 1, 2]
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');

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

      return {
        text1: window.getNodePath(text1),
        spanText: window.getNodePath(span.firstChild),
        text2: window.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.text1).toEqual([0, 0]);
    expect(paths.spanText).toEqual([0, 1, 0]);
    expect(paths.text2).toEqual([0, 2]); // Text at index 2, no additional nesting
  });

  test('first word bold - "This is a test" with "This" bold', async ({
    page,
  }) => {
    // Simulates bolding the first word "This" in "This is a test paragraph"
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        <span data-node-id="0-0">This</span> is a test paragraph
    //      </p>
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      return {
        boldThis: window.getNodePath(span.firstChild),
        plainText: window.getNodePath(text),
        childNodesCount: p.childNodes.length,
      };
    });

    expect(paths.childNodesCount).toBe(2);
    expect(paths.boldThis).toEqual([0, 0, 0]); // First span, first text
    expect(paths.plainText).toEqual([0, 1]); // Second child of paragraph
  });

  test('middle word bold - "This is a test" with "test" bold', async ({
    page,
  }) => {
    // Simulates bolding "test" in "This is a test paragraph"
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        This is a <span data-node-id="0-1">test</span> paragraph
    //      </p>
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      return {
        plainTextBefore: window.getNodePath(text1),
        boldTest: window.getNodePath(span.firstChild),
        plainTextAfter: window.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };
    });

    expect(paths.childNodesCount).toBe(3);
    expect(paths.plainTextBefore).toEqual([0, 0]); // First child
    expect(paths.boldTest).toEqual([0, 1, 0]); // Second child (span), text inside
    expect(paths.plainTextAfter).toEqual([0, 2]); // Third child
  });

  test('two bold words - "This is a test" with "This" and "test" both bold', async ({
    page,
  }) => {
    // Simulates bolding both "This" and "test"
    // DOM: <p data-editable-field="value" data-node-id="0">
    //        <span data-node-id="0-0">This</span> is a <span data-node-id="0-2">test</span> paragraph
    //      </p>
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      return {
        boldThis: window.getNodePath(span1.firstChild),
        plainTextMiddle: window.getNodePath(text1),
        boldTest: window.getNodePath(span2.firstChild),
        plainTextEnd: window.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };
    });

    expect(paths.childNodesCount).toBe(4);
    expect(paths.boldThis).toEqual([0, 0, 0]); // First span (index 0), text inside
    expect(paths.plainTextMiddle).toEqual([0, 1]); // Text node at index 1
    expect(paths.boldTest).toEqual([0, 2, 0]); // Second span (index 2), text inside
    expect(paths.plainTextEnd).toEqual([0, 3]); // Text node at index 3
  });

  test('parses dot notation data-node-id - "0.1" format', async ({ page }) => {
    // Tests parsing data-node-id with dot notation like "0.1" or "0.3"
    // This is the format used by some Slate renderers
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      return {
        textInFirstSpan: window.getNodePath(span1.firstChild),
        textBetweenSpans: window.getNodePath(text1),
        textInSecondSpan: window.getNodePath(span2.firstChild),
        textAfter: window.getNodePath(text2),
        childNodesCount: p.childNodes.length,
      };
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

  test('parses dash notation data-node-id - "0-1" format', async ({ page }) => {
    // Tests parsing data-node-id with dash notation like "0-1" or "0-3"
    // Alternative format some renderers might use
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      return {
        boldText: window.getNodePath(span1.firstChild),
        plainText: window.getNodePath(text1),
        italicText: window.getNodePath(span2.firstChild),
      };
    });

    expect(paths.boldText).toEqual([0, 1, 0]);
    expect(paths.plainText).toEqual([0, 2]);
    expect(paths.italicText).toEqual([0, 3, 0]);
  });

  test('complex scenario - multiple formatted regions with gaps', async ({
    page,
  }) => {
    // Real-world scenario: "This is a test paragraph" with "This" and "test" bolded
    // Matching the exact DOM structure from the user's screenshot
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      // Test paths for all positions
      return {
        // Cursor in "This" (bold)
        inThis: window.getNodePath(span1.firstChild),
        // Cursor in " is a " (plain)
        inPlain: window.getNodePath(text1),
        // Cursor in "test" (bold)
        inTest: window.getNodePath(span2.firstChild),
        // Cursor in " paragraph" (plain)
        inParagraph: window.getNodePath(text2),
      };
    });

    // These are the paths that should make isActive work correctly
    expect(paths.inThis).toEqual([0, 1, 0]); // Bold - isActive should be true
    expect(paths.inPlain).toEqual([0, 2]); // Plain - isActive should be false
    expect(paths.inTest).toEqual([0, 3, 0]); // Bold - isActive should be true
    expect(paths.inParagraph).toEqual([0, 4]); // Plain - isActive should be false
  });

  test('handles whitespace text nodes in sibling counting', async ({
    page,
  }) => {
    const paths = await page.evaluate(() => {
      const container = document.getElementById('test-container');
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

      // Get references to the actual nodes we appended
      const ws = p.childNodes[1];

      return {
        span1Text: window.getNodePath(span1.firstChild),
        whitespace: window.getNodePath(ws),
        span2Text: window.getNodePath(span2.firstChild),
        childNodesCount: p.childNodes.length,
      };
    });

    // span1's text is at [0, 0, 0]
    // whitespace is at [0, 1] - direct child of paragraph
    // span2's text is at [0, 2, 0]
    expect(paths.childNodesCount).toBe(3);
    expect(paths.span1Text).toEqual([0, 0, 0]);
    expect(paths.whitespace).toEqual([0, 1]); // Text at index 1, no additional nesting
    expect(paths.span2Text).toEqual([0, 2, 0]);
  });
});
