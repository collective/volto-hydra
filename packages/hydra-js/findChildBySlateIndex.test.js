/**
 * Unit tests for Bridge.findChildBySlateIndex()
 * Tests finding DOM child nodes by Slate child index
 *
 * The algorithm walks childNodes counting Slate children:
 * - Text nodes count as 1 Slate child
 * - Elements with node-id count as 1 Slate child
 * - Elements with same node-id as previous are skipped (wrappers)
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

describe('Bridge.findChildBySlateIndex()', () => {
  let dom;
  let document;
  let bridge;

  beforeEach(() => {
    // Set up JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    global.Node = dom.window.Node;

    // Create a Bridge instance - we only need the findChildBySlateIndex method
    // which doesn't depend on constructor params
    bridge = new Bridge(null, { _learnOriginFromFirstMessage: true });
  });

  describe('Bug case: cursor after inline element', () => {
    test('finds ZWS text node after inline element at index 2', () => {
      // DOM: <p data-node-id="0">"Hello "<span data-node-id="0.1">world</span>"﻿"</p>
      // Slate children: [text "Hello ", strong, text ""]
      // Target: Slate index 2 (the ZWS text node after SPAN)
      document.body.innerHTML =
        '<p data-node-id="0">Hello <span data-node-id="0.1">world</span>\uFEFF</p>';

      const p = document.querySelector('p');
      const result = bridge.findChildBySlateIndex(p, 2);

      expect(result).not.toBeNull();
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe('\uFEFF'); // ZWS
    });

    test('finds inline element at index 1', () => {
      // Same DOM, but finding the SPAN at index 1
      document.body.innerHTML =
        '<p data-node-id="0">Hello <span data-node-id="0.1">world</span>\uFEFF</p>';

      const p = document.querySelector('p');
      const result = bridge.findChildBySlateIndex(p, 1);

      expect(result).not.toBeNull();
      expect(result.nodeType).toBe(Node.ELEMENT_NODE);
      expect(result.tagName).toBe('SPAN');
      expect(result.getAttribute('data-node-id')).toBe('0.1');
    });

    test('finds first text node at index 0', () => {
      // Same DOM, finding "Hello " at index 0
      document.body.innerHTML =
        '<p data-node-id="0">Hello <span data-node-id="0.1">world</span>\uFEFF</p>';

      const p = document.querySelector('p');
      const result = bridge.findChildBySlateIndex(p, 0);

      expect(result).not.toBeNull();
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe('Hello ');
    });
  });

  describe('Wrapper elements with same node-id', () => {
    test('skips wrapper elements with same node-id, counts as 1 Slate child', () => {
      // DOM: <p>"Hello "<strong data-node-id="0.1"><b data-node-id="0.1">world</b></strong>"﻿"</p>
      // The strong and b both have node-id="0.1", should count as 1 Slate child
      // Slate children: [text, strong(wrapper), text]
      document.body.innerHTML =
        '<p data-node-id="0">Hello <strong data-node-id="0.1"><b data-node-id="0.1">world</b></strong>\uFEFF</p>';

      const p = document.querySelector('p');

      // Index 0: "Hello " text
      const result0 = bridge.findChildBySlateIndex(p, 0);
      expect(result0.nodeType).toBe(Node.TEXT_NODE);
      expect(result0.textContent).toBe('Hello ');

      // Index 1: The STRONG element (first with node-id "0.1")
      const result1 = bridge.findChildBySlateIndex(p, 1);
      expect(result1.nodeType).toBe(Node.ELEMENT_NODE);
      expect(result1.tagName).toBe('STRONG');

      // Index 2: The ZWS text after (the b element was skipped because same node-id)
      const result2 = bridge.findChildBySlateIndex(p, 2);
      expect(result2.nodeType).toBe(Node.TEXT_NODE);
      expect(result2.textContent).toBe('\uFEFF');
    });

    test('handles multiple sequential wrappers with same node-id', () => {
      // Edge case: <p>"text"<span node-id="1"><b node-id="1">bold</b></span>"after"</p>
      // Both span and b have same node-id="0.1", should count as 1 Slate child
      // Note: Using span instead of div because div inside p is invalid HTML
      document.body.innerHTML =
        '<p data-node-id="0">text<span data-node-id="0.1"><b data-node-id="0.1">bold</b></span>after</p>';

      const p = document.querySelector('p');

      // Index 0: "text"
      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('text');

      // Index 1: The SPAN (first element with node-id "0.1")
      const result1 = bridge.findChildBySlateIndex(p, 1);
      expect(result1.tagName).toBe('SPAN');

      // Index 2: "after"
      expect(bridge.findChildBySlateIndex(p, 2).textContent).toBe('after');
    });
  });

  describe('Elements without node-id', () => {
    test('elements without node-id are transparent (skipped)', () => {
      // DOM: <p>"Hello "<span class="wrapper"><strong data-node-id="0.1">world</strong></span>"﻿"</p>
      // The span.wrapper has no node-id, should be transparent
      // NOTE: This violates the renderer contract but we handle it gracefully
      document.body.innerHTML =
        '<p data-node-id="0">Hello <span class="wrapper"><strong data-node-id="0.1">world</strong></span>\uFEFF</p>';

      const p = document.querySelector('p');

      // Index 0: "Hello "
      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('Hello ');

      // Index 1: Should skip the wrapper span and not find anything at top level
      // The STRONG is nested inside span.wrapper, not a direct child
      const result1 = bridge.findChildBySlateIndex(p, 1);
      // This is the ZWS because the wrapper span doesn't count
      expect(result1.textContent).toBe('\uFEFF');

      // Index 2: Should be null (no more children)
      expect(bridge.findChildBySlateIndex(p, 2)).toBeNull();
    });
  });

  describe('Simple text-only scenarios', () => {
    test('paragraph with only text', () => {
      // DOM: <p>"Hello world"</p>
      // Slate children: [text]
      document.body.innerHTML = '<p data-node-id="0">Hello world</p>';

      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('Hello world');
      expect(bridge.findChildBySlateIndex(p, 1)).toBeNull();
    });

    test('paragraph with multiple text nodes (shouldn\'t happen but test anyway)', () => {
      // Create DOM with multiple adjacent text nodes programmatically
      const p = document.createElement('p');
      p.setAttribute('data-node-id', '0');
      p.appendChild(document.createTextNode('Hello '));
      p.appendChild(document.createTextNode('world'));
      document.body.appendChild(p);

      // Each text node counts as separate Slate child
      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('Hello ');
      expect(bridge.findChildBySlateIndex(p, 1).textContent).toBe('world');
      expect(bridge.findChildBySlateIndex(p, 2)).toBeNull();
    });
  });

  describe('Multiple inline elements', () => {
    test('text between multiple inline elements', () => {
      // DOM: <p>"a "<strong node-id="1">b</strong>" c "<em node-id="2">d</em>" e"</p>
      // Slate children: [text, strong, text, em, text]
      document.body.innerHTML =
        '<p data-node-id="0">a <strong data-node-id="0.1">b</strong> c <em data-node-id="0.2">d</em> e</p>';

      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('a ');
      expect(bridge.findChildBySlateIndex(p, 1).tagName).toBe('STRONG');
      expect(bridge.findChildBySlateIndex(p, 2).textContent).toBe(' c ');
      expect(bridge.findChildBySlateIndex(p, 3).tagName).toBe('EM');
      expect(bridge.findChildBySlateIndex(p, 4).textContent).toBe(' e');
      expect(bridge.findChildBySlateIndex(p, 5)).toBeNull();
    });

    test('adjacent inline elements (no text between)', () => {
      // DOM: <p><strong node-id="1">a</strong><em node-id="2">b</em></p>
      // Slate children: [strong, em]
      document.body.innerHTML =
        '<p data-node-id="0"><strong data-node-id="0.1">a</strong><em data-node-id="0.2">b</em></p>';

      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, 0).tagName).toBe('STRONG');
      expect(bridge.findChildBySlateIndex(p, 1).tagName).toBe('EM');
      expect(bridge.findChildBySlateIndex(p, 2)).toBeNull();
    });
  });

  describe('Edge cases', () => {
    test('empty parent element', () => {
      document.body.innerHTML = '<p data-node-id="0"></p>';
      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, 0)).toBeNull();
    });

    test('index out of bounds', () => {
      document.body.innerHTML = '<p data-node-id="0">Hello</p>';
      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, 0).textContent).toBe('Hello');
      expect(bridge.findChildBySlateIndex(p, 1)).toBeNull();
      expect(bridge.findChildBySlateIndex(p, 10)).toBeNull();
    });

    test('negative index returns null', () => {
      document.body.innerHTML = '<p data-node-id="0">Hello</p>';
      const p = document.querySelector('p');

      expect(bridge.findChildBySlateIndex(p, -1)).toBeNull();
    });
  });
});
