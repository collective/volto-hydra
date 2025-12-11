/**
 * Unit tests for HydraBridge.updateJsonNode()
 * Tests that updating text in Slate structures doesn't corrupt the structure
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

describe('HydraBridge.updateJsonNode()', () => {
  let bridge;

  beforeEach(() => {
    // Create a minimal HydraBridge instance with updateJsonNode
    // This matches the implementation in hydra.js
    bridge = {
      updateJsonNode(json, nodeId, newText) {
        if (Array.isArray(json)) {
          return json.map((item) => this.updateJsonNode(item, nodeId, newText));
        } else if (typeof json === 'object' && json !== null) {
          // Compare nodeIds as strings (path-based IDs like "0", "0.0", etc.)
          if (json.nodeId === nodeId || json.nodeId === String(nodeId)) {
            if (json.hasOwnProperty('text')) {
              json.text = newText;
            } else {
              json.children[0].text = newText;
            }
            return json;
          }
          for (const key in json) {
            if (json.hasOwnProperty(key) && key !== 'nodeId' && key !== 'data') {
              json[key] = this.updateJsonNode(json[key], nodeId, newText);
            }
          }
        }
        return json;
      },
    };
  });

  /**
   * Helper to validate Slate structure - element nodes should NOT have 'text' property
   */
  function validateSlateStructure(node, path = '') {
    if (Array.isArray(node)) {
      node.forEach((child, i) => validateSlateStructure(child, `${path}[${i}]`));
      return;
    }
    if (typeof node !== 'object' || node === null) return;

    // If node has 'type' (element node), it should NOT have 'text'
    if (node.type && node.hasOwnProperty('text')) {
      throw new Error(`Invalid Slate: element node at ${path} has both 'type' and 'text'. Node: ${JSON.stringify(node)}`);
    }

    // Recurse into children
    if (node.children) {
      node.children.forEach((child, i) => validateSlateStructure(child, `${path}.children[${i}]`));
    }
  }

  describe('Simple paragraph updates', () => {
    test('updates text in simple paragraph', () => {
      const input = {
        '@type': 'slate',
        value: [
          { type: 'p', nodeId: '0', children: [{ text: 'Hello' }] }
        ]
      };

      const result = bridge.updateJsonNode(input, '0', 'Updated');

      // Text should be updated on first child
      expect(result.value[0].children[0].text).toBe('Updated');
      // Structure should still be valid
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });
  });

  describe('List structure updates', () => {
    test('updates text in list item - structure remains valid', () => {
      // Valid Plone API structure with nodeIds added
      const input = {
        '@type': 'slate',
        value: [
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
              },
              {
                type: 'li',
                nodeId: '0.1',
                children: [
                  { text: '' },
                  {
                    type: 'link',
                    nodeId: '0.1.1',
                    data: { url: 'https://example2.com' },
                    children: [{ text: 'Framework7 Example' }]
                  },
                  { text: '' }
                ]
              }
            ]
          }
        ]
      };

      // Update text in first li (nodeId '0.0')
      const result = bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)), // Deep clone to avoid mutation
        '0.0',
        'New text'
      );

      // First li's first child should have updated text
      expect(result.value[0].children[0].children[0].text).toBe('New text');

      // CRITICAL: li elements should NOT have 'text' property
      expect(result.value[0].children[0]).not.toHaveProperty('text');
      expect(result.value[0].children[1]).not.toHaveProperty('text');

      // Full structure validation
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });

    test('updates text in link inside list - structure remains valid', () => {
      const input = {
        '@type': 'slate',
        value: [
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
                    children: [{ text: 'Original link text' }]
                  },
                  { text: '' }
                ]
              }
            ]
          }
        ]
      };

      // Update text in link (nodeId '0.0.1')
      const result = bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0.1',
        'Updated link text'
      );

      // Link's first child should have updated text
      expect(result.value[0].children[0].children[1].children[0].text).toBe('Updated link text');

      // CRITICAL: No element should have 'text' property
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });

    test('multiple updates preserve structure', () => {
      const input = {
        '@type': 'slate',
        value: [
          {
            type: 'ul',
            nodeId: '0',
            children: [
              {
                type: 'li',
                nodeId: '0.0',
                children: [{ text: 'Item 1' }]
              },
              {
                type: 'li',
                nodeId: '0.1',
                children: [{ text: 'Item 2' }]
              }
            ]
          }
        ]
      };

      // Update first item
      let result = bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0',
        'Updated Item 1'
      );

      // Update second item
      result = bridge.updateJsonNode(result, '0.1', 'Updated Item 2');

      // Both items updated
      expect(result.value[0].children[0].children[0].text).toBe('Updated Item 1');
      expect(result.value[0].children[1].children[0].text).toBe('Updated Item 2');

      // Structure still valid
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });
  });

  describe('handleTextChange simulation (Object.assign flow)', () => {
    /**
     * This simulates what handleTextChange does:
     * 1. Get blockData (the full block)
     * 2. Call updateJsonNode to update text
     * 3. Object.assign(block, updatedJson)
     *
     * The concern is whether Object.assign corrupts the structure
     */
    test('Object.assign after updateJsonNode preserves structure', () => {
      // Simulate formData with a slate block
      const formData = {
        blocks: {
          'block-123': {
            '@type': 'slate',
            value: [
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
            ],
            plaintext: 'NUXT.js Example'
          }
        }
      };

      // Get blockData (reference to the block)
      const blockData = formData.blocks['block-123'];

      // Simulate handleTextChange calling updateJsonNode
      const updatedJson = bridge.updateJsonNode(
        blockData,
        '0.0',
        'Updated text'
      );

      // Simulate Object.assign(block, updatedJson) from handleTextChange line 3984
      const block = formData.blocks['block-123'];
      Object.assign(block, updatedJson);

      // CRITICAL: After Object.assign, structure should still be valid
      // li elements should NOT have 'text' property
      expect(block.value[0].children[0]).not.toHaveProperty('text');
      expect(() => validateSlateStructure(block.value)).not.toThrow();

      // The text should be updated
      expect(block.value[0].children[0].children[0].text).toBe('Updated text');
    });

    test('Object.assign with value array directly', () => {
      // What if blockData IS the value array (not the full block)?
      const valueArray = [
        {
          type: 'ul',
          nodeId: '0',
          children: [
            {
              type: 'li',
              nodeId: '0.0',
              children: [{ text: 'Original' }]
            }
          ]
        }
      ];

      const updatedJson = bridge.updateJsonNode(valueArray, '0.0', 'Updated');

      // If someone does Object.assign on an array result...
      // This shouldn't happen but let's test it
      expect(Array.isArray(updatedJson)).toBe(true);
      expect(updatedJson[0].children[0].children[0].text).toBe('Updated');
      expect(() => validateSlateStructure(updatedJson)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    test('non-existent nodeId returns unchanged structure', () => {
      const input = {
        '@type': 'slate',
        value: [
          { type: 'p', nodeId: '0', children: [{ text: 'Hello' }] }
        ]
      };

      const result = bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        'nonexistent',
        'New text'
      );

      // Text should be unchanged
      expect(result.value[0].children[0].text).toBe('Hello');
      // Structure still valid
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });

    test('deeply nested update preserves full structure', () => {
      const input = {
        '@type': 'slate',
        value: [
          {
            type: 'ul',
            nodeId: '0',
            children: [
              {
                type: 'li',
                nodeId: '0.0',
                children: [
                  {
                    type: 'ul',
                    nodeId: '0.0.0',
                    children: [
                      {
                        type: 'li',
                        nodeId: '0.0.0.0',
                        children: [{ text: 'Nested item' }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0.0.0',
        'Updated nested'
      );

      // Deeply nested text updated
      expect(result.value[0].children[0].children[0].children[0].children[0].text).toBe('Updated nested');

      // Full structure preserved
      expect(result.value[0].type).toBe('ul');
      expect(result.value[0].children[0].type).toBe('li');
      expect(result.value[0].children[0].children[0].type).toBe('ul');

      // No element has 'text' property
      expect(() => validateSlateStructure(result.value)).not.toThrow();
    });
  });
});
