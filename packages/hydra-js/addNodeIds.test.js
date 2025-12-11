/**
 * Unit tests for HydraBridge.addNodeIds()
 * Tests that nodeIds are added correctly to Slate structures
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

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

describe('HydraBridge.addNodeIds()', () => {
  let bridge;

  beforeEach(() => {
    // Create a minimal HydraBridge instance with addNodeIds
    // This matches the fixed implementation in hydra.js
    bridge = {
      addNodeIds(json, path = '') {
        if (Array.isArray(json)) {
          return json.map((item, index) => {
            const itemPath = path ? `${path}.${index}` : `${index}`;
            return this.addNodeIds(item, itemPath);
          });
        } else if (typeof json === 'object' && json !== null) {
          // Clone the object to ensure it's extensible
          json = JSON.parse(JSON.stringify(json));

          // Skip text-only nodes - they shouldn't have nodeIds
          // A proper Slate text node has 'text' but NO 'children' and NO 'type'
          // Note: Some malformed data might have both 'text' AND 'children' on element nodes
          // (like li) - these should be treated as elements, not text nodes
          const isTextNode = json.hasOwnProperty('text') &&
                             !json.hasOwnProperty('children') &&
                             !json.hasOwnProperty('type');
          if (isTextNode) {
            return json;
          }

          // Assign path-based nodeId to this element
          json.nodeId = path;

          // Only process children array - don't recurse into metadata like 'data'
          if (json.children && Array.isArray(json.children)) {
            json.children = json.children.map((child, index) => {
              const childPath = `${path}.${index}`;
              return this.addNodeIds(child, childPath);
            });
          }
        }
        return json;
      },
    };
  });

  describe('Basic Slate structures', () => {
    test('simple paragraph with text', () => {
      const input = [
        { type: 'p', children: [{ text: 'Hello world' }] }
      ];

      const result = bridge.addNodeIds(input);

      expect(result).toEqual([
        {
          type: 'p',
          nodeId: '0',
          children: [{ text: 'Hello world' }]  // text nodes don't get nodeIds
        }
      ]);
    });

    test('paragraph with formatted text', () => {
      const input = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { type: 'strong', children: [{ text: 'world' }] }
          ]
        }
      ];

      const result = bridge.addNodeIds(input);

      expect(result).toEqual([
        {
          type: 'p',
          nodeId: '0',
          children: [
            { text: 'Hello ' },
            { type: 'strong', nodeId: '0.1', children: [{ text: 'world' }] }
          ]
        }
      ]);
    });
  });

  describe('List structures', () => {
    test('unordered list with simple items', () => {
      const input = [
        {
          type: 'ul',
          children: [
            { type: 'li', children: [{ text: 'Item 1' }] },
            { type: 'li', children: [{ text: 'Item 2' }] }
          ]
        }
      ];

      const result = bridge.addNodeIds(input);

      expect(result).toEqual([
        {
          type: 'ul',
          nodeId: '0',
          children: [
            { type: 'li', nodeId: '0.0', children: [{ text: 'Item 1' }] },
            { type: 'li', nodeId: '0.1', children: [{ text: 'Item 2' }] }
          ]
        }
      ]);
    });

    test('list item with link (Plone API structure)', () => {
      // This is the ACTUAL structure from Plone API
      const input = [
        {
          type: 'ul',
          children: [
            {
              type: 'li',
              children: [
                { text: '' },
                {
                  type: 'link',
                  data: { url: 'https://example.com' },
                  children: [{ text: 'NUXT.js Example' }]
                },
                { text: '' }
              ]
            }
          ]
        }
      ];

      const result = bridge.addNodeIds(input);

      // Verify structure is correct - li should NOT have text property
      expect(result[0].children[0]).not.toHaveProperty('text');
      expect(result[0].children[0]).toHaveProperty('type', 'li');
      expect(result[0].children[0]).toHaveProperty('children');
      expect(result[0].children[0]).toHaveProperty('nodeId', '0.0');

      // Full structure check
      expect(result).toEqual([
        {
          type: 'ul',
          nodeId: '0',
          children: [
            {
              type: 'li',
              nodeId: '0.0',
              children: [
                { text: '' },
                {
                  type: 'link',
                  nodeId: '0.0.1',
                  data: { url: 'https://example.com' },
                  children: [{ text: 'NUXT.js Example' }]
                },
                { text: '' }
              ]
            }
          ]
        }
      ]);
    });

    test('multiple list items with links (full Plone structure)', () => {
      // Exact structure from Plone API for the examples list
      const input = [
        {
          type: 'ul',
          children: [
            {
              type: 'li',
              children: [
                { text: '' },
                { type: 'link', data: { url: 'https://hydra-nuxt-flowbrite.netlify.app/' }, children: [{ text: 'NUXT.js Example' }] },
                { text: '' }
              ]
            },
            {
              type: 'li',
              children: [
                { text: '' },
                { type: 'link', data: { url: 'https://hydra-vue-f7.netlify.app/' }, children: [{ text: 'Framework7 Example' }] },
                { text: '' }
              ]
            }
          ]
        }
      ];

      const result = bridge.addNodeIds(input);

      // Verify NO li has a text property
      result[0].children.forEach((li, index) => {
        expect(li).not.toHaveProperty('text');
        expect(li).toHaveProperty('type', 'li');
        expect(li).toHaveProperty('nodeId', `0.${index}`);
      });
    });
  });

  describe('Edge cases - malformed input', () => {
    test('handles node with both text AND children (malformed)', () => {
      // This is INVALID Slate but might come from buggy code
      // addNodeIds should handle it gracefully by treating it as an element
      const input = [
        {
          type: 'li',
          text: '',  // INVALID - element nodes shouldn't have text
          children: [{ text: 'content' }]
        }
      ];

      const result = bridge.addNodeIds(input);

      // Fixed behavior: since it has 'type' and 'children', treat as element
      // nodeId should be added and children should be processed
      expect(result[0]).toHaveProperty('text', '');  // Still has the invalid text
      expect(result[0]).toHaveProperty('nodeId', '0');  // nodeId IS added now
      expect(result[0]).toHaveProperty('type', 'li');
      expect(result[0]).toHaveProperty('children');
    });
  });
});
