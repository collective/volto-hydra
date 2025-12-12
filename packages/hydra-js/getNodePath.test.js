/**
 * Unit tests for Bridge.getNodePath()
 * Tests various DOM structures and verifies correct Slate path generation
 * Uses the ACTUAL Bridge implementation from hydra.js
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { Bridge } from './hydra.js';

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

describe('Bridge.getNodePath()', () => {
  let dom;
  let document;
  let bridge;

  beforeEach(() => {
    // Set up JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;

    // Set up globals that Bridge expects
    global.document = document;
    global.window = dom.window;
    global.Node = dom.window.Node;

    // Create Bridge instance using the ACTUAL implementation from hydra.js
    bridge = new Bridge('http://localhost:3001');
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.Node;
  });

  /**
   * Helper to create DOM with Vue-style empty/whitespace text node artifacts.
   * Vue/Nuxt templates create empty ("") and whitespace (" ") text nodes
   * between elements that don't appear when using innerHTML.
   *
   * @param {string} html - HTML string to parse
   * @returns {DocumentFragment} - DOM with Vue-style artifacts injected
   */
  function createVueStyleDOM(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;

    // Recursively inject Vue-style artifacts into all elements
    function injectArtifacts(element) {
      if (element.nodeType !== Node.ELEMENT_NODE) return;

      const children = Array.from(element.childNodes);

      // Insert artifacts at the start
      element.insertBefore(document.createTextNode(' '), element.firstChild);
      element.insertBefore(document.createTextNode(''), element.firstChild);

      // Insert artifacts between each existing child
      for (let i = children.length - 1; i > 0; i--) {
        const child = children[i];
        element.insertBefore(document.createTextNode(''), child);
      }

      // Insert artifact at the end
      element.appendChild(document.createTextNode(''));

      // Recurse into child elements
      for (const child of children) {
        injectArtifacts(child);
      }
    }

    // Inject into all top-level elements
    for (const child of Array.from(fragment.childNodes)) {
      injectArtifacts(child);
    }

    return fragment;
  }

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

  describe('Text leaf wrapper scenarios (Vue/Nuxt)', () => {
    test('text wrapped in span with empty nodeId inside strong', () => {
      // Bug scenario: Vue wraps text in span even when text has no nodeId
      // <strong data-node-id="1.1"><span data-node-id="">Disclaimer</span></strong>
      // Slate structure: [1, 1] = strong, [1, 1, 0] = text
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First para</p>' +
        '<p data-node-id="1">' +
        '<span data-node-id="1-0">preamble </span>' +
        '<strong data-node-id="1-1"><span data-node-id="">Disclaimer</span></strong>' +
        '</p>' +
        '</div>';

      const strongSpan = document.querySelector('strong span');
      const textNode = strongSpan.firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [1, 1, 0] - should skip the wrapper span with empty nodeId
      expect(path).toEqual([1, 1, 0]);
    });

    test('text wrapped in span with undefined nodeId inside strong', () => {
      // Vue might render undefined as string "undefined"
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1"><span data-node-id="undefined">Disclaimer</span></strong>' +
        '</p>' +
        '</div>';

      const textNode = document.querySelector('strong span').firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [1, 1, 0] - should skip the wrapper span with "undefined" nodeId
      expect(path).toEqual([1, 1, 0]);
    });

    test('text wrapped in span WITHOUT nodeId attribute inside strong', () => {
      // Best case: Vue doesn't render the attribute at all
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1"><span>Disclaimer</span></strong>' +
        '</p>' +
        '</div>';

      const textNode = document.querySelector('strong span').firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [1, 1, 0] - walks up correctly since span has no nodeId
      expect(path).toEqual([1, 1, 0]);
    });

    test('plain text directly in strong (no wrapper span)', () => {
      // This is the ideal rendering without extra wrapper
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1">Disclaimer</strong>' +
        '</p>' +
        '</div>';

      const textNode = document.querySelector('strong').firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [1, 1, 0]
      expect(path).toEqual([1, 1, 0]);
    });

    test('exact production DOM structure from Nuxt', () => {
      // Exact DOM from production: spans without any data-node-id attribute
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0"><span></span><strong data-node-id="0.1"><span></span></strong><span>You can use this site.</span></p>' +
        '<p data-node-id="1"><span></span><strong data-node-id="1.1"><span>Disclaimer</span></strong><span>: This instance is reset.</span></p>' +
        '</div>';

      // Click on "Disclaimer" text inside strong > span
      const strongSpan = document.querySelectorAll('strong')[1].querySelector('span');
      const textNode = strongSpan.firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [1, 1, 0] - text inside strong at [1, 1]
      expect(path).toEqual([1, 1, 0]);
    });

    test('list with links - li and link HAVE nodeId', () => {
      // When li and link have nodeIds, path calculation works
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul class="list-disc">' +
        '<li data-node-id="0.0"><span></span><a data-node-id="0.0.1" href="#"><span>NUXT.js Example</span></a><span></span></li>' +
        '<li data-node-id="0.1"><span></span><a data-node-id="0.1.1" href="#"><span>Framework7 Example</span></a><span></span></li>' +
        '</ul>' +
        '</div>';

      const linkSpan = document.querySelector('a span');
      const textNode = linkSpan.firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [0, 0, 1, 0] - text inside link at [0, 0, 1]
      expect(path).toEqual([0, 0, 1, 0]);
    });

    test('EXACT production list DOM - NO nodeIds anywhere - returns null with error', () => {
      // Exact production DOM: NO data-node-id on ul, li, or a elements!
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul class="list-disc list-inside mx-4">' +
        '<li><span></span><a href="#" class="underline"><span>NUXT.js Example</span></a><span></span></li>' +
        '<li><span></span><a href="#" class="underline"><span>Framework7 Example</span></a><span></span></li>' +
        '</ul>' +
        '</div>';

      const linkSpan = document.querySelector('a span');
      const textNode = linkSpan.firstChild;
      const path = bridge.getNodePath(textNode);

      // Without nodeIds, getNodePath returns null and logs helpful error
      // showing which elements are missing data-node-id
      expect(path).toBeNull();
    });

    test('list with links - ul HAS nodeId (correct rendering)', () => {
      // If ul had data-node-id (ideal rendering)
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<ul data-node-id="0" class="list-disc">' +
        '<li data-node-id="0.0"><span></span><a data-node-id="0.0.1" href="#"><span>NUXT.js Example</span></a><span></span></li>' +
        '</ul>' +
        '</div>';

      const linkSpan = document.querySelector('a span');
      const textNode = linkSpan.firstChild;
      const path = bridge.getNodePath(textNode);

      // Expected: [0, 0, 1, 0]
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

  describe('Production bug reproduction - path [1,3] should be [1,2]', () => {
    test('empty text + strong + text AFTER (direct text nodes in p)', () => {
      // Exact Slate structure from production error:
      // {"children":[{"text":""},{"children":[{"text":"Disclaimer"}],"type":"strong"},{"text":": This instance..."}],"type":"p"}
      // Expected: clicking on text at index 2 should return [1, 2]
      // Bug: returning [1, 3]
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1"><strong data-node-id="1-1">Disclaimer</strong>: This instance is reset every night</p>' +
        '</div>';

      const p = document.querySelectorAll('p')[1]; // Second paragraph
      const textAfterStrong = p.lastChild; // ": This instance..."

      // Text after strong (node-id 1-1) should be at Slate index 2 (1+1)
      // Full path: [1, 2] (paragraph 1, child 2)
      expect(bridge.getNodePath(textAfterStrong)).toEqual([1, 2]);
    });

    test('empty text + strong + text AFTER (with empty text node)', () => {
      // Same structure but WITH the empty text node at child 0
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1">' +
        '<strong data-node-id="1-1">Disclaimer</strong>: This instance is reset every night</p>' +
        '</div>';

      const p = document.querySelectorAll('p')[1];
      // Add empty text node at the beginning (before strong)
      const emptyText = document.createTextNode('');
      p.insertBefore(emptyText, p.firstChild);

      const textAfterStrong = p.lastChild;

      // Now structure is: [empty text, strong, text after]
      // Child 0: empty text
      // Child 1: strong (node-id 1-1)
      // Child 2: text ": This instance..."
      // Path should be [1, 2]
      expect(bridge.getNodePath(textAfterStrong)).toEqual([1, 2]);
    });

    test('text wrapped in spans (Nuxt wrapper scenario)', () => {
      // Nuxt might wrap text leaves in spans without nodeId
      // DOM: <p data-node-id="1"><span></span><strong data-node-id="1-1">Disclaimer</strong><span>: This...</span></p>
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1">' +
        '<span></span>' + // empty text wrapper (no nodeId)
        '<strong data-node-id="1-1">Disclaimer</strong>' +
        '<span>: This instance is reset every night</span>' + // text wrapper (no nodeId)
        '</p>' +
        '</div>';

      const p = document.querySelectorAll('p')[1];
      const lastSpan = p.lastElementChild; // span wrapping ": This instance..."
      const textInSpan = lastSpan.firstChild;

      // Clicking on text inside the wrapper span
      // Span is at DOM index 2 in p.children (after empty span and strong)
      // But Slate index should be 2 (empty=0, strong=1, text=2)
      // Full path: [1, 2, 0] or [1, 2] depending on how wrapper is handled
      // The text inside a wrapper span without nodeId should resolve to the parent's position
      expect(bridge.getNodePath(textInSpan)).toEqual([1, 2]);
    });

    test('text with whitespace nodes in p (HTML formatting)', () => {
      // HTML often has whitespace between tags that creates text nodes
      // This might explain path [1, 3] vs expected [1, 2]
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">First paragraph</p>' +
        '<p data-node-id="1">\n' + // whitespace text node!
        '  <strong data-node-id="1-1">Disclaimer</strong>\n' + // more whitespace!
        '  : This instance is reset every night\n' +
        '</p>' +
        '</div>';

      const p = document.querySelectorAll('p')[1];
      // Find the text node that contains ": This instance"
      const textNodes = Array.from(p.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.includes('This instance')
      );
      const targetText = textNodes[0];

      // Even with whitespace, the path to this text should be based on Slate structure
      // Slate doesn't see whitespace-only nodes, so path should be [1, 2]
      expect(bridge.getNodePath(targetText)).toEqual([1, 2]);
    });
  });

  describe('Nuxt slider page bug - path [0,3] should be [0,2]', () => {
    test('text BEFORE bold + bold + text AFTER (Nuxt richtext.vue structure)', () => {
      // Exact reproduction from Nuxt playwright test error:
      // Slate: {"children":[{"type":"p","children":[
      //   {"text":"This text appears after the slider. Click on "},
      //   {"type":"strong","children":[{"text":"bold text"}]},
      //   {"text":" to test getNodePath."}
      // ]}]}
      // Bug: clicking on " to test getNodePath." returns [0, 3] instead of [0, 2]
      //
      // Nuxt richtext.vue renders:
      // - Text leaves (no type): plain text node, NO wrapper
      // - Typed elements (strong): <strong data-node-id="...">text</strong>
      document.body.innerHTML =
        '<div data-editable-field="value">' +
        '<p data-node-id="0">' +
        'This text appears after the slider. Click on ' +
        '<strong data-node-id="0-1">bold text</strong>' +
        ' to test getNodePath.' +
        '</p>' +
        '</div>';

      const p = document.querySelector('p');
      // Find the text node " to test getNodePath." (the last text node in p)
      const textAfterBold = p.lastChild;

      // Slate structure:
      // [0] = paragraph
      //   [0, 0] = text "This text appears..."
      //   [0, 1] = strong with "bold text"
      //   [0, 2] = text " to test getNodePath."
      //
      // Expected path for clicking on last text: [0, 2]
      expect(bridge.getNodePath(textAfterBold)).toEqual([0, 2]);
    });

    test('text BEFORE bold + bold + text AFTER with Vue empty text nodes', () => {
      // Vue/Nuxt creates EMPTY text nodes ("") and whitespace-only nodes (" ")
      // as artifacts of template rendering. Use createVueStyleDOM helper to simulate.
      const fragment = createVueStyleDOM(
        '<div data-editable-field="value">' +
        '<p data-node-id="0">' +
        'This text appears after the slider. Click on ' +
        '<strong data-node-id="0.1">bold text</strong>' +
        ' to test getNodePath.' +
        '</p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const p = document.querySelector('p');
      // Find the actual text node (not the Vue artifacts)
      const textAfterBold = Array.from(p.childNodes).find(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.includes('to test')
      );

      // Without the fix: counts empty/whitespace text nodes, returns wrong path
      // With the fix: skips empty/whitespace, uses data-node-id from strong (0.1 -> index 2)
      // Expected path: [0, 2]
      expect(bridge.getNodePath(textAfterBold)).toEqual([0, 2]);
    });

    test('clicking empty Vue artifact INSIDE strong returns correct path', () => {
      // Bug reproduction: clicking on empty text node after "bold text" inside strong
      // Error: path [0,1,3] returned instead of [0,3,0]
      //
      // Slate structure with two strongs:
      // p.children = [
      //   {text: "This text appears after the "},  // [0,0]
      //   {type: "strong", children: [{text: "slider"}]},  // [0,1]
      //   {text: ". Click on "},  // [0,2]
      //   {type: "strong", children: [{text: "bold text"}]},  // [0,3]
      //   {text: " to test getNodePath."}  // [0,4]
      // ]
      const fragment = createVueStyleDOM(
        '<div data-editable-field="value">' +
        '<p data-node-id="0">' +
        'This text appears after the ' +
        '<strong data-node-id="0.1">slider</strong>' +
        '. Click on ' +
        '<strong data-node-id="0.3">bold text</strong>' +
        ' to test getNodePath.' +
        '</p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      // Find the LAST empty Vue artifact text node INSIDE the second strong (after "bold text")
      const strong2 = document.querySelectorAll('strong')[1];
      const strongChildren = Array.from(strong2.childNodes);

      // Verify DOM structure: should have artifacts at start, content, artifact at end
      // Expected: ["", " ", "bold text", ""]
      expect(strongChildren.length).toBeGreaterThanOrEqual(4);
      expect(strongChildren[strongChildren.length - 1].nodeType).toBe(Node.TEXT_NODE);
      expect(strongChildren[strongChildren.length - 1].textContent).toBe('');

      // Find the "bold text" node and the empty node after it
      const boldTextNode = strongChildren.find(n => n.textContent === 'bold text');
      expect(boldTextNode).toBeDefined();

      const emptyAfterBoldText = strongChildren[strongChildren.length - 1];  // last child is empty artifact
      expect(emptyAfterBoldText.textContent.trim()).toBe('');  // confirm it's empty

      // Click on the empty text node AFTER "bold text" inside the second strong
      // This empty node doesn't exist in Slate - it should map to the text at [0,3,0]
      // Bug: was returning wrong path like [0,1,3]
      // Expected: [0,3,0] (text inside second strong)
      expect(bridge.getNodePath(emptyAfterBoldText)).toEqual([0, 3, 0]);
    });
  });
});
