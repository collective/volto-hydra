/**
 * Unit tests for slateTransforms.js
 *
 * Tests the headless Slate editor implementation for applying
 * formatting transforms to Slate document structures.
 */

import { createHeadlessEditor } from './slateTransforms';
import slateTransforms from './slateTransforms';

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

  describe('htmlToSlate', () => {
    it('should convert simple paragraph HTML to Slate', () => {
      const html = '<p>Hello world</p>';
      const result = slateTransforms.htmlToSlate(html);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert bold text to Slate marks', () => {
      const html = '<p><strong>Bold text</strong></p>';
      const result = slateTransforms.htmlToSlate(html);

      expect(result).toBeDefined();
      // Check that bold mark is applied
      const hasBold = JSON.stringify(result).includes('"bold":true');
      expect(hasBold).toBe(true);
    });
  });

  describe('splitBlock', () => {
    it('should split a block at the selection point', () => {
      const value = [
        {
          type: 'p',
          children: [{ text: 'Hello world' }],
        },
      ];

      const selection = {
        anchor: { path: [0, 0], offset: 5 },
        focus: { path: [0, 0], offset: 5 },
      };

      const result = slateTransforms.splitBlock(value, selection);

      expect(result).toBeDefined();
      expect(result.topValue).toBeDefined();
      expect(result.bottomValue).toBeDefined();
    });
  });
});
