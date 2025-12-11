/**
 * Unit tests for HydraBridge.getNodePath()
 * Tests various DOM structures and verifies correct Slate path generation
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock console methods to suppress debug output during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe('HydraBridge.getNodePath()', () => {
  let dom;
  let document;
  let bridge;

  beforeEach(() => {
    // Set up JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.document = document;
    global.Node = dom.window.Node;

    // Create a minimal HydraBridge instance for testing
    // This mock matches the actual implementation in hydra.js
    bridge = {
      getSlateIndexAmongSiblings: function (node, parent) {
        const siblings = Array.from(parent.childNodes);
        const nodeIndex = siblings.indexOf(node);

        // Look at all siblings before this node to determine Slate index
        let slateIndex = 0;
        for (let i = 0; i < nodeIndex; i++) {
          const sibling = siblings[i];
          if (
            sibling.nodeType === Node.ELEMENT_NODE &&
            sibling.hasAttribute('data-node-id')
          ) {
            // Element with data-node-id: parse its index from the ID
            const nodeId = sibling.getAttribute('data-node-id');
            const parts = nodeId.split(/[.-]/); // Split on . or -
            const lastIndex = parseInt(parts[parts.length - 1], 10);
            slateIndex = lastIndex + 1; // Next index after this element
          } else if (sibling.nodeType === Node.TEXT_NODE) {
            // Text node: takes the next index
            slateIndex++;
          }
        }

        return slateIndex;
      },

      getNodePath: function (node) {
        const path = [];
        let current = node;

        // If starting with a text node, calculate its Slate index
        if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentNode;

          // Check if parent has data-node-id AND is an inline element (span, strong, etc.)
          if (
            parent.hasAttribute?.('data-node-id') &&
            parent.nodeName !== 'P' &&
            parent.nodeName !== 'DIV' &&
            !parent.hasAttribute?.('data-editable-field')
          ) {
            const nodeId = parent.getAttribute('data-node-id');
            // Parse the parent's path from its node ID
            const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));
            // Text node index within the parent element
            const siblings = Array.from(parent.childNodes);
            const textIndex = siblings.indexOf(node);
            // Build path: parent path + text index
            path.push(...parts, textIndex);
            return path;
          } else {
            // Parent is a block element or doesn't have data-node-id
            const slateIndex = this.getSlateIndexAmongSiblings(node, parent);
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
            const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));
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
      },
    };
  });

  describe('Plain text scenarios', () => {
    test('plain text directly in paragraph', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">Hello world</p>
      // Slate: [0] = paragraph, [0, 0] = text "Hello world"
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello world</p>';

      const textNode = document.querySelector('p').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 0]);
    });

    test('empty paragraph with placeholder', () => {
      // DOM: <p data-editable-field="value" data-node-id="0"><br></p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><br></p>';

      const brElement = document.querySelector('br');
      const path = bridge.getNodePath(brElement);

      // BR element is not a text node, so walks up to find parent with data-node-id
      // Parent <p> has data-node-id="0", so path is [0]
      expect(path).toEqual([0]);
    });
  });

  describe('Formatted text scenarios', () => {
    test('text inside bold span (single format)', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        Hello <span data-node-id="0-1">world</span>
      //      </p>
      // Slate: [0] = paragraph, [0, 0] = text "Hello ", [0, 1] = strong node, [0, 1, 0] = text "world"
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello <span style="font-weight: bold" data-node-id="0-1">world</span></p>';

      const span = document.querySelector('span');
      const textNode = span.firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 1, 0]);
    });

    test('plain text before formatted text', () => {
      // Testing the "Hello " text node before the span
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">Hello <span data-node-id="0-1">world</span></p>';

      const textNode = document.querySelector('p').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 0]);
    });

    test('multiple formatted spans', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        <span data-node-id="0-0">Hello</span>
      //        <span data-node-id="0-2">world</span>
      //      </p>
      // Note: span indices from data-node-id determine Slate indices
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><span data-node-id="0-0">Hello</span> <span data-node-id="0-2">world</span></p>';

      const firstSpanText = document.querySelectorAll('span')[0].firstChild;
      const secondSpanText = document.querySelectorAll('span')[1].firstChild;
      const spaceBetween = document.querySelector('p').childNodes[1]; // Text node with space

      expect(bridge.getNodePath(firstSpanText)).toEqual([0, 0, 0]);
      expect(bridge.getNodePath(spaceBetween)).toEqual([0, 1]); // Space text node at index 1 (after 0-0)
      expect(bridge.getNodePath(secondSpanText)).toEqual([0, 2, 0]);
    });
  });

  describe('Nested formatting scenarios', () => {
    test('nested formatting (bold + italic)', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        <span data-node-id="0-0">
      //          <span data-node-id="0-0-0">nested</span>
      //        </span>
      //      </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><span data-node-id="0-0"><span data-node-id="0-0-0">nested</span></span></p>';

      const textNode = document.querySelector('span span').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 0, 0, 0]);
    });
  });

  describe('Complex paragraph scenarios', () => {
    test('text-format-text pattern', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        This is <span data-node-id="0-1">bold</span> text
      //      </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">This is <span data-node-id="0-1">bold</span> text</p>';

      const firstText = document.querySelector('p').firstChild;
      const boldText = document.querySelector('span').firstChild;
      const lastText = document.querySelector('p').lastChild;

      expect(bridge.getNodePath(firstText)).toEqual([0, 0]);
      expect(bridge.getNodePath(boldText)).toEqual([0, 1, 0]);
      // lastText is at Slate index 2 (after span with node-id 0-1, so 1+1=2)
      expect(bridge.getNodePath(lastText)).toEqual([0, 2]);
    });

    test('multiple formats in sequence', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        <span data-node-id="0-0">bold</span>
      //        <span data-node-id="0-1">italic</span>
      //        <span data-node-id="0-2">underline</span>
      //      </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<span data-node-id="0-0">bold</span>' +
        '<span data-node-id="0-1">italic</span>' +
        '<span data-node-id="0-2">underline</span>' +
        '</p>';

      const spans = document.querySelectorAll('span');
      expect(bridge.getNodePath(spans[0].firstChild)).toEqual([0, 0, 0]);
      expect(bridge.getNodePath(spans[1].firstChild)).toEqual([0, 1, 0]);
      expect(bridge.getNodePath(spans[2].firstChild)).toEqual([0, 2, 0]);
    });
  });

  describe('Alternative DOM structures', () => {
    test('paragraph with wrapper div for editable field', () => {
      // Alternative structure: wrapper has data-editable-field
      // DOM: <div data-editable-field="value">
      //        <p data-node-id="0">Hello world</p>
      //      </div>
      document.body.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">Hello world</p></div>';

      const textNode = document.querySelector('p').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 0]);
    });

    test('text node with explicit text leaf wrapper', () => {
      // Some renderers might wrap text in explicit leaf elements
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        <span data-node-id="0-0">text</span>
      //      </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><span data-node-id="0-0">text</span></p>';

      const textNode = document.querySelector('span').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toEqual([0, 0, 0]);
    });
  });

  describe('Edge cases', () => {
    test('node without editable field container returns null', () => {
      // DOM: <p data-node-id="0">No editable field marker</p>
      document.body.innerHTML = '<p data-node-id="0">No editable field marker</p>';

      const textNode = document.querySelector('p').firstChild;
      const path = bridge.getNodePath(textNode);

      expect(path).toBeNull();
    });

    test('element node with data-node-id (not text node)', () => {
      // Testing from an element rather than text node
      document.body.innerHTML =
        '<div data-editable-field="value"><p data-node-id="0">text</p></div>';

      const pElement = document.querySelector('p');
      const path = bridge.getNodePath(pElement);

      // Should not append 0 because we didn't start from text node
      expect(path).toEqual([0]);
    });

    test('deeply nested structure', () => {
      // DOM: <div data-editable-field="value">
      //        <div><div><p data-node-id="0">text</p></div></div>
      //      </div>
      document.body.innerHTML =
        '<div data-editable-field="value"><div><div><p data-node-id="0">text</p></div></div></div>';

      const textNode = document.querySelector('p').firstChild;
      const path = bridge.getNodePath(textNode);

      // Only elements with data-node-id are counted
      expect(path).toEqual([0, 0]);
    });
  });

  describe('Sibling counting with mixed content', () => {
    test('counts text nodes and elements correctly', () => {
      // DOM: <p data-editable-field="value" data-node-id="0">
      //        text1<span data-node-id="0-1">span</span>text2
      //      </p>
      // Siblings: [text1, span, text2] -> Slate indices based on data-node-id
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">text1<span data-node-id="0-1">span</span>text2</p>';

      const p = document.querySelector('p');
      const text1 = p.childNodes[0];
      const span = p.childNodes[1];
      const text2 = p.childNodes[2];

      expect(bridge.getNodePath(text1)).toEqual([0, 0]);
      expect(bridge.getNodePath(span.firstChild)).toEqual([0, 1, 0]);
      // text2 is after span with node-id 0-1, so Slate index = 1+1 = 2
      expect(bridge.getNodePath(text2)).toEqual([0, 2]);
    });

    test('handles whitespace text nodes', () => {
      // DOM with whitespace between elements
      // <p data-editable-field="value" data-node-id="0">
      //   <span data-node-id="0-0">a</span>
      //   <span data-node-id="0-2">b</span>
      // </p>
      // Note: Whitespace text nodes between spans get Slate index based on preceding node-id
      const p = document.createElement('p');
      p.setAttribute('data-editable-field', 'value');
      p.setAttribute('data-node-id', '0');

      const span1 = document.createElement('span');
      span1.setAttribute('data-node-id', '0-0');
      span1.textContent = 'a';

      const whitespace = document.createTextNode('\n  ');

      const span2 = document.createElement('span');
      span2.setAttribute('data-node-id', '0-2');
      span2.textContent = 'b';

      p.appendChild(span1);
      p.appendChild(whitespace);
      p.appendChild(span2);
      document.body.appendChild(p);

      // span1's text is at [0, 0, 0]
      // whitespace is at Slate index 1 (after 0-0, so 0+1=1)
      // span2's text is at [0, 2, 0] (from node-id 0-2)
      expect(bridge.getNodePath(span1.firstChild)).toEqual([0, 0, 0]);
      expect(bridge.getNodePath(whitespace)).toEqual([0, 1]);
      expect(bridge.getNodePath(span2.firstChild)).toEqual([0, 2, 0]);
    });
  });

  describe('List structure scenarios', () => {
    test('text inside list item with link', () => {
      // DOM structure from Nuxt RichText component for:
      // Slate: { type: 'ul', children: [{ type: 'li', children: [
      //   { text: '' }, { type: 'link', children: [{ text: 'NUXT.js Example' }] }, { text: '' }
      // ]}]}
      // Note: ul is MISSING data-node-id (bug in RichText.vue)
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul class="list-disc">' +  // NO data-node-id on ul!
        '<li data-node-id="0.0">' +
        '<a data-node-id="0.0.1" href="#">NUXT.js Example</a>' +
        '</li>' +
        '</ul>' +
        '</div>';

      const linkText = document.querySelector('a').firstChild;
      const path = bridge.getNodePath(linkText);

      // Path should be [0, 0, 1, 0]:
      // [0] = ul (first child of editable field)
      // [0, 0] = li (first child of ul)
      // [0, 0, 1] = link (second child of li, index from node-id)
      // [0, 0, 1, 0] = text inside link
      expect(path).toEqual([0, 0, 1, 0]);
    });

    test('text directly in list item (before link)', () => {
      // When user clicks on empty text before the link inside li
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul class="list-disc">' +
        '<li data-node-id="0.0">' +
        'before text' +
        '<a data-node-id="0.0.1" href="#">link</a>' +
        '</li>' +
        '</ul>' +
        '</div>';

      const li = document.querySelector('li');
      const beforeText = li.firstChild; // Text node "before text"
      const path = bridge.getNodePath(beforeText);

      // Path should be [0, 0, 0]:
      // li has node-id "0.0", text is first child (index 0)
      expect(path).toEqual([0, 0, 0]);
    });

    test('ul with data-node-id (correct rendering)', () => {
      // If ul HAD data-node-id (correct implementation)
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul data-node-id="0" class="list-disc">' +
        '<li data-node-id="0.0">' +
        '<a data-node-id="0.0.1" href="#">NUXT.js Example</a>' +
        '</li>' +
        '</ul>' +
        '</div>';

      const linkText = document.querySelector('a').firstChild;
      const path = bridge.getNodePath(linkText);

      // Same expected path - ul's node-id "0" should be parsed
      expect(path).toEqual([0, 0, 1, 0]);
    });
  });

  describe('Double wrapper scenarios', () => {
    test('double wrapper with same node-id renders correctly', () => {
      // DOM: When a renderer wraps text twice (e.g., bold+italic using same node-id)
      // <p data-editable-field="value" data-node-id="0">
      //   <strong data-node-id="0-0">
      //     <em data-node-id="0-0">text</em>
      //   </strong>
      // </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        '<strong data-node-id="0-0"><em data-node-id="0-0">styled text</em></strong>' +
        '</p>';

      const textNode = document.querySelector('em').firstChild;
      const path = bridge.getNodePath(textNode);

      // Both wrappers have same node-id "0-0", so path should be [0, 0, 0]
      // The implementation parses node-id from the immediate parent (em)
      expect(path).toEqual([0, 0, 0]);
    });

    test('double wrapper with text before and after', () => {
      // <p data-editable-field="value" data-node-id="0">
      //   before <strong data-node-id="0-1"><em data-node-id="0-1">bold</em></strong> after
      // </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">' +
        'before <strong data-node-id="0-1"><em data-node-id="0-1">bold</em></strong> after' +
        '</p>';

      const p = document.querySelector('p');
      const beforeText = p.firstChild;
      const boldText = document.querySelector('em').firstChild;
      const afterText = p.lastChild;

      expect(bridge.getNodePath(beforeText)).toEqual([0, 0]);
      expect(bridge.getNodePath(boldText)).toEqual([0, 1, 0]);
      // afterText is after element with node-id 0-1, so Slate index = 1+1 = 2
      expect(bridge.getNodePath(afterText)).toEqual([0, 2]);
    });
  });
});
