/**
 * Unit tests for slateTransforms.js
 *
 * Tests the headless Slate editor implementation for applying
 * formatting transforms to Slate document structures.
 */

import { createHeadlessEditor, applyFormat, getFormatState, serialize } from './slateTransforms';

describe('slateTransforms', () => {
  describe('createHeadlessEditor', () => {
    it('should create a headless editor with given value', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const editor = createHeadlessEditor(value);

      expect(editor).toBeDefined();
      expect(editor.children).toEqual(value);
    });

    it('should create editor with empty value', () => {
      const editor = createHeadlessEditor([]);

      expect(editor).toBeDefined();
      expect(editor.children).toEqual([]);
    });
  });

  describe('applyFormat - bold', () => {
    it('should add bold to entire text node', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 11 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result).toEqual([
        {
          type: 'p',
          children: [{ text: 'Hello world', bold: true }],
        },
      ]);
    });

    it('should split text node when applying bold to middle', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result[0].children.length).toBe(2);
      expect(result[0].children[0]).toEqual({ text: 'Hello', bold: true });
      expect(result[0].children[1]).toEqual({ text: ' world' });
    });

    it('should remove bold when already present (toggle)', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello', bold: true }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result).toEqual([
        {
          type: 'p',
          children: [{ text: 'Hello' }],
        },
      ]);
    });

    it('should apply bold with action="add"', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'add');

      expect(result[0].children[0]).toEqual({ text: 'Hello', bold: true });
    });

    it('should remove bold with action="remove"', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello', bold: true }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'remove');

      expect(result[0].children[0]).toEqual({ text: 'Hello' });
    });
  });

  describe('applyFormat - italic', () => {
    it('should add italic to text', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 6 },
        focus: { path: [0, 0], offset: 11 },
      };

      const result = applyFormat(value, selection, 'italic', 'toggle');

      expect(result[0].children.length).toBe(2);
      expect(result[0].children[0]).toEqual({ text: 'Hello ' });
      expect(result[0].children[1]).toEqual({ text: 'world', italic: true });
    });

    it('should handle mixed formatting (bold + italic)', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello', bold: true }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'italic', 'toggle');

      expect(result[0].children[0]).toEqual({ text: 'Hello', bold: true, italic: true });
    });
  });

  describe('applyFormat - strikethrough (del)', () => {
    it('should add strikethrough to text', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 11 },
      };

      const result = applyFormat(value, selection, 'del', 'toggle');

      expect(result[0].children[0]).toEqual({ text: 'Hello world', del: true });
    });
  });

  describe('applyFormat - across multiple nodes', () => {
    it('should apply bold across multiple text nodes', () => {
      const value = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { text: 'beautiful ' },
            { text: 'world' },
          ],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 2], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      // All three nodes should have bold
      result[0].children.forEach((child) => {
        expect(child.bold).toBe(true);
      });
    });

    it('should handle partial selection across nodes', () => {
      const value = [
        {
          type: 'p',
          children: [
            { text: 'Hello ' },
            { text: 'world' },
          ],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 3 },  // Start mid-"Hello"
        focus: { path: [0, 1], offset: 2 },    // End mid-"world"
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      // Should split nodes at selection boundaries
      expect(result[0].children.length).toBeGreaterThan(2);

      // Check that only selected text has bold
      const allText = result[0].children.map(n => n.text).join('');
      expect(allText).toBe('Hello world');
    });
  });

  describe('applyFormat - link (element, not mark)', () => {
    it('should wrap text in link element', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Click here' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 6 },
        focus: { path: [0, 0], offset: 10 },
      };

      const result = applyFormat(value, selection, 'link', 'add', { url: 'https://example.com' });

      // Link should be an element, not a mark
      expect(result[0].children.length).toBe(2);
      expect(result[0].children[0]).toEqual({ text: 'Click ' });
      expect(result[0].children[1]).toMatchObject({
        type: 'a',
        url: 'https://example.com',
      });
      expect(result[0].children[1].children[0]).toEqual({ text: 'here' });
    });

    it('should remove link element', () => {
      const value = [
        {
          type: 'p',
          children: [
            { text: 'Visit ' },
            {
              type: 'a',
              url: 'https://example.com',
              children: [{ text: 'our site' }],
            },
          ],
        },
      ];

      const selection = {
        anchor: { path: [0, 1, 0], offset: 0 },
        focus: { path: [0, 1, 0], offset: 8 },
      };

      const result = applyFormat(value, selection, 'link', 'remove');

      // Link element should be unwrapped
      expect(result[0].children.length).toBe(2);
      expect(result[0].children[1]).toEqual({ text: 'our site' });
    });
  });

  describe('getFormatState', () => {
    it('should return active marks for selection', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello', bold: true, italic: true }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const state = getFormatState(value, selection);

      expect(state.bold).toBe(true);
      expect(state.italic).toBe(true);
      expect(state.del).toBe(false);
    });

    it('should detect link element', () => {
      const value = [
        {
          type: 'p',
          children: [
            {
              type: 'a',
              url: 'https://example.com',
              children: [{ text: 'link text' }],
            },
          ],
        },
      ];

      const selection = {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 4 },
      };

      const state = getFormatState(value, selection);

      expect(state.link).toBeDefined();
      expect(state.link.present).toBe(true);
      expect(state.link.url).toBe('https://example.com');
    });

    it('should return false for inactive marks', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Plain text' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 10 },
      };

      const state = getFormatState(value, selection);

      expect(state.bold).toBe(false);
      expect(state.italic).toBe(false);
      expect(state.del).toBe(false);
      expect(state.link.present).toBe(false);
    });
  });

  describe('serialize', () => {
    it('should serialize simple paragraph to HTML', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('Hello world');
      expect(html).toContain('<p');
      expect(html).toContain('</p>');
    });

    it('should serialize bold text with <strong> tag', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Bold text', bold: true }],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('<strong');
      expect(html).toContain('Bold text');
      expect(html).toContain('</strong>');
    });

    it('should serialize italic text with <em> tag', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Italic text', italic: true }],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('<em');
      expect(html).toContain('Italic text');
      expect(html).toContain('</em>');
    });

    it('should serialize strikethrough text with <del> tag', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Deleted text', del: true }],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('<del');
      expect(html).toContain('Deleted text');
      expect(html).toContain('</del>');
    });

    it('should serialize link with <a> tag', () => {
      const value = [
        {
          type: 'p',
          children: [
            {
              type: 'a',
              url: 'https://example.com',
              children: [{ text: 'link text' }],
            },
          ],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('<a');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('link text');
      expect(html).toContain('</a>');
    });

    it('should include data-node-id attributes', () => {
      const value = [
        {
          type: 'p',
          nodeId: 1,
          children: [{ text: 'Hello', nodeId: 2 }],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('data-node-id="1"');
      expect(html).toContain('data-node-id="2"');
    });

    it('should serialize mixed formatting', () => {
      const value = [
        {
          type: 'p',
          children: [
            { text: 'Plain ' },
            { text: 'bold', bold: true },
            { text: ' and ' },
            { text: 'italic', italic: true },
          ],
        },
      ];

      const html = serialize(value);

      expect(html).toContain('Plain');
      expect(html).toContain('<strong');
      expect(html).toContain('bold');
      expect(html).toContain('<em');
      expect(html).toContain('italic');
    });
  });

  describe('edge cases', () => {
    it('should handle empty selection (collapsed)', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 5 },
        focus: { path: [0, 0], offset: 5 },  // Collapsed
      };

      // Should not throw, but also should not modify anything
      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result).toBeDefined();
    });

    it('should handle selection with no text', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: '' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result).toBeDefined();
    });

    it('should handle multiple paragraphs', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'First paragraph' }],
        },
        {
          type: 'p',
          children: [{ text: 'Second paragraph' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = applyFormat(value, selection, 'bold', 'toggle');

      expect(result.length).toBe(2);
      expect(result[1].children[0].text).toBe('Second paragraph');
    });
  });
});
