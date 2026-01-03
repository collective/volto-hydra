/**
 * Unit tests for Bridge.updateJsonNode()
 * Tests that updating text in Slate structures doesn't corrupt the structure
 */

import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Bridge.updateJsonNode()', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8888/mock-parent.html');
    await helper.waitForIframeReady();
    await helper.waitForBlockSelected('mock-block-1');
    await helper.injectPreserveWhitespaceHelper();
  });

  /**
   * Helper to validate Slate structure - element nodes should NOT have 'text' property
   */
  function validateSlateStructure(node: any, path = ''): void {
    if (Array.isArray(node)) {
      node.forEach((child, i) => validateSlateStructure(child, `${path}[${i}]`));
      return;
    }
    if (typeof node !== 'object' || node === null) return;

    // If node has 'type' (element node), it should NOT have 'text'
    if (node.type && Object.prototype.hasOwnProperty.call(node, 'text')) {
      throw new Error(
        `Invalid Slate: element node at ${path} has both 'type' and 'text'. Node: ${JSON.stringify(node)}`
      );
    }

    // Recurse into children
    if (node.children) {
      node.children.forEach((child: any, i: number) =>
        validateSlateStructure(child, `${path}.children[${i}]`)
      );
    }
  }

  test('updates text in simple paragraph', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const input = {
        '@type': 'slate',
        value: [{ type: 'p', nodeId: '0', children: [{ text: 'Hello' }] }],
      };
      return (window as any).bridge.updateJsonNode(input, '0', 'Updated');
    });

    // Text should be updated on first child
    expect(result.value[0].children[0].text).toBe('Updated');
    // Structure should still be valid
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('updates text in list item - structure remains valid', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
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
                    children: [{ text: 'NUXT.js Example' }],
                  },
                  { text: '' },
                ],
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
                    children: [{ text: 'Framework7 Example' }],
                  },
                  { text: '' },
                ],
              },
            ],
          },
        ],
      };
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0',
        'New text'
      );
    });

    // First li's first child should have updated text
    expect(result.value[0].children[0].children[0].text).toBe('New text');

    // CRITICAL: li elements should NOT have 'text' property
    expect(result.value[0].children[0]).not.toHaveProperty('text');
    expect(result.value[0].children[1]).not.toHaveProperty('text');

    // Full structure validation
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('updates text in link inside list - structure remains valid', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
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
                    children: [{ text: 'Original link text' }],
                  },
                  { text: '' },
                ],
              },
            ],
          },
        ],
      };
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0.1',
        'Updated link text'
      );
    });

    // Link's first child should have updated text
    expect(result.value[0].children[0].children[1].children[0].text).toBe(
      'Updated link text'
    );

    // CRITICAL: No element should have 'text' property
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('multiple updates preserve structure', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
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
                children: [{ text: 'Item 1' }],
              },
              {
                type: 'li',
                nodeId: '0.1',
                children: [{ text: 'Item 2' }],
              },
            ],
          },
        ],
      };

      // Update first item
      let result = (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0',
        'Updated Item 1'
      );

      // Update second item
      result = (window as any).bridge.updateJsonNode(result, '0.1', 'Updated Item 2');

      return result;
    });

    // Both items updated
    expect(result.value[0].children[0].children[0].text).toBe('Updated Item 1');
    expect(result.value[0].children[1].children[0].text).toBe('Updated Item 2');

    // Structure still valid
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('non-existent nodeId returns unchanged structure', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
      const input = {
        '@type': 'slate',
        value: [{ type: 'p', nodeId: '0', children: [{ text: 'Hello' }] }],
      };
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        'nonexistent',
        'New text'
      );
    });

    // Text should be unchanged
    expect(result.value[0].children[0].text).toBe('Hello');
    // Structure still valid
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('deeply nested update preserves full structure', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    const result = await body.evaluate(() => {
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
                        children: [{ text: 'Nested item' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0.0.0.0',
        'Updated nested'
      );
    });

    // Deeply nested text updated
    expect(
      result.value[0].children[0].children[0].children[0].children[0].text
    ).toBe('Updated nested');

    // Full structure preserved
    expect(result.value[0].type).toBe('ul');
    expect(result.value[0].children[0].type).toBe('li');
    expect(result.value[0].children[0].children[0].type).toBe('ul');

    // No element has 'text' property
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('updates specific child by index in paragraph with inline elements', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Simulate typing " normal" after a strong element
    // DOM: [TEXT "Hello "][STRONG [TEXT "bold"]][TEXT " normal"]
    // Slate: [{text: "Hello "}, {type: strong, children: [{text: "bold"}]}, {text: ""}]
    const result = await body.evaluate(() => {
      const input = {
        '@type': 'slate',
        value: [
          {
            type: 'p',
            nodeId: '0',
            children: [
              { text: 'Hello ' },
              {
                type: 'strong',
                nodeId: '0.1',
                children: [{ text: 'bold' }],
              },
              { text: '' },
            ],
          },
        ],
      };
      // Update child at index 2 (the text node after the strong)
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0',
        ' normal',
        2 // childIndex
      );
    });

    // First text node should be UNCHANGED
    expect(result.value[0].children[0].text).toBe('Hello ');
    // Strong element should be preserved with its text
    expect(result.value[0].children[1].type).toBe('strong');
    expect(result.value[0].children[1].children[0].text).toBe('bold');
    // Third text node (index 2) should have the new text
    expect(result.value[0].children[2].text).toBe(' normal');
    // Structure should still be valid
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('updates specific child by index when inline element is at index 0', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Paragraph starting with bold: [STRONG "Bold"][TEXT " after"]
    const result = await body.evaluate(() => {
      const input = {
        '@type': 'slate',
        value: [
          {
            type: 'p',
            nodeId: '0',
            children: [
              {
                type: 'strong',
                nodeId: '0.0',
                children: [{ text: 'Bold' }],
              },
              { text: ' after' },
            ],
          },
        ],
      };
      // Update child at index 1 (text after strong)
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0',
        ' after typing',
        1 // childIndex
      );
    });

    // Strong element should be unchanged
    expect(result.value[0].children[0].type).toBe('strong');
    expect(result.value[0].children[0].children[0].text).toBe('Bold');
    // Second child should have updated text
    expect(result.value[0].children[1].text).toBe(' after typing');
    // Structure should still be valid
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('childIndex null falls back to updating first child', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Without childIndex, should use original behavior (update children[0])
    const result = await body.evaluate(() => {
      const input = {
        '@type': 'slate',
        value: [
          {
            type: 'p',
            nodeId: '0',
            children: [{ text: 'Hello' }],
          },
        ],
      };
      // No childIndex - fallback behavior
      return (window as any).bridge.updateJsonNode(
        JSON.parse(JSON.stringify(input)),
        '0',
        'Updated',
        null
      );
    });

    // First child should be updated (fallback behavior)
    expect(result.value[0].children[0].text).toBe('Updated');
    expect(() => validateSlateStructure(result.value)).not.toThrow();
  });

  test('handleTextChange detects childIndex in Nuxt-style DOM (P without data-editable-field)', async () => {
    const iframe = helper.getIframe();
    const body = iframe.locator('body');

    // Simulate Nuxt structure: DIV[data-editable-field] > P[data-node-id] > [text, STRONG, text]
    // When typing " normal" in the third text node, handleTextChange should detect childIndex=2
    const result = await body.evaluate(() => {
      // Create Nuxt-style DOM structure
      const fragment = (window as any).preserveWhitespaceDOM(
        '<div id="test-nuxt-handletext" data-block-uid="test-block" data-editable-field="value">' +
        '<p data-node-id="0">Hello <strong data-node-id="0.1">bold</strong> normal</p>' +
        '</div>'
      );
      document.body.appendChild(fragment);

      const container = document.getElementById('test-nuxt-handletext')!;
      const p = container.querySelector('p')!;
      const textNodeAfterStrong = p.childNodes[2]; // " normal"

      // Set up bridge with mock block data
      const bridge = (window as any).bridge;
      bridge.blockPathMap = {
        'test-block': { path: ['blocks', 'test-block'] },
      };
      bridge.formData = {
        blocks: {
          'test-block': {
            '@type': 'slate',
            value: [
              {
                type: 'p',
                nodeId: '0',
                children: [
                  { text: 'Hello ' },
                  { type: 'strong', nodeId: '0.1', children: [{ text: 'bold' }] },
                  { text: '' }, // Empty initially, will be updated to " normal"
                ],
              },
            ],
          },
        },
      };

      // Call handleTextChange simulating a mutation on the text node after strong
      // This should detect childIndex=2 and update only that child
      bridge.handleTextChange(container, p, textNodeAfterStrong);

      // Get the updated block data
      const updatedBlock = bridge.formData.blocks['test-block'];
      container.remove();

      return {
        child0: updatedBlock.value[0].children[0],
        child1: updatedBlock.value[0].children[1],
        child2: updatedBlock.value[0].children[2],
      };
    });

    // CRITICAL: First text node should be UNCHANGED (not "Hello bold normal")
    expect(result.child0.text).toBe('Hello ');

    // Strong element should be preserved
    expect(result.child1.type).toBe('strong');
    expect(result.child1.children[0].text).toBe('bold');

    // Third text node should have the new text
    expect(result.child2.text).toBe(' normal');
  });
});
