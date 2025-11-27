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
    bridge = {
      getNodePath: function (node) {
        const path = [];
        let current = node;
        let isTextNodeChild = false;

        // If starting with a text node, start from its parent element
        if (node.nodeType === Node.TEXT_NODE) {
          isTextNodeChild = true;
          current = node.parentNode;
        }

        // Walk up the DOM tree building the path
        while (current) {
          const hasNodeId = current.hasAttribute?.('data-node-id');
          const hasEditableField = current.hasAttribute?.(
            'data-editable-field',
          );
          const hasSlateEditor = current.hasAttribute?.('data-slate-editor');

          // Process current node
          if (hasNodeId) {
            // This is a Slate node, find its index among ALL siblings (including text nodes)
            const parent = current.parentNode;
            // Use childNodes (not children) to include text nodes in the count
            const siblings = Array.from(parent.childNodes);
            const index = siblings.indexOf(current);
            if (index !== -1) {
              path.unshift(index);
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

        // If we started from a text node, append 0 to represent the text leaf
        // In Slate, text is always in leaf nodes, so text node paths always end with a leaf index
        if (isTextNodeChild) {
          path.push(0);
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

      // BR element doesn't have data-node-id, so path should be null or handle gracefully
      expect(path).toBeNull();
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
      //        <span data-node-id="0-1">world</span>
      //      </p>
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0"><span data-node-id="0-0">Hello</span> <span data-node-id="0-1">world</span></p>';

      const firstSpanText = document.querySelectorAll('span')[0].firstChild;
      const secondSpanText = document.querySelectorAll('span')[1].firstChild;
      const spaceBetween = document.querySelector('p').childNodes[1]; // Text node with space

      expect(bridge.getNodePath(firstSpanText)).toEqual([0, 0, 0]);
      expect(bridge.getNodePath(spaceBetween)).toEqual([0, 1, 0]); // Space text node
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
      expect(bridge.getNodePath(lastText)).toEqual([0, 2, 0]);
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
      // Siblings: [text1, span, text2] -> indices [0, 1, 2]
      document.body.innerHTML =
        '<p data-editable-field="value" data-node-id="0">text1<span data-node-id="0-1">span</span>text2</p>';

      const p = document.querySelector('p');
      const text1 = p.childNodes[0];
      const span = p.childNodes[1];
      const text2 = p.childNodes[2];

      expect(bridge.getNodePath(text1)).toEqual([0, 0]);
      expect(bridge.getNodePath(span.firstChild)).toEqual([0, 1, 0]);
      expect(bridge.getNodePath(text2)).toEqual([0, 2, 0]);
    });

    test('handles whitespace text nodes', () => {
      // DOM with whitespace between elements
      // <p data-editable-field="value" data-node-id="0">
      //   <span data-node-id="0-0">a</span>
      //   <span data-node-id="0-1">b</span>
      // </p>
      // Note: Whitespace text nodes between spans should be counted
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
      document.body.appendChild(p);

      // span1's text is at [0, 0, 0]
      // whitespace is at [0, 1, 0]
      // span2's text is at [0, 2, 0]
      expect(bridge.getNodePath(span1.firstChild)).toEqual([0, 0, 0]);
      expect(bridge.getNodePath(whitespace)).toEqual([0, 1, 0]);
      expect(bridge.getNodePath(span2.firstChild)).toEqual([0, 2, 0]);
    });
  });
});
