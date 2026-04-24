/**
 * Unit tests for containerOps.js — shared predicates and transforms for the
 * container UX feature family (wrap, unwrap, edge-drag, convert).
 *
 * Strict TDD: each `it` below must fail before its implementation exists.
 */

import { canContain, canContainAll } from './containerOps.js';

describe('containerOps', () => {
  describe('canContain', () => {
    test('accepts any block when allowedBlocks is undefined', () => {
      expect(canContain({}, 'slate', 0)).toBe(true);
      expect(canContain({}, 'image', 5)).toBe(true);
    });

    test('accepts any block when allowedBlocks is null', () => {
      expect(canContain({ allowedBlocks: null }, 'slate', 0)).toBe(true);
    });

    test('rejects block type not in allowedBlocks list', () => {
      const cfg = { allowedBlocks: ['slate', 'image'] };
      expect(canContain(cfg, 'slate', 0)).toBe(true);
      expect(canContain(cfg, 'image', 0)).toBe(true);
      expect(canContain(cfg, 'teaser', 0)).toBe(false);
    });

    test('rejects when at maxLength', () => {
      const cfg = { allowedBlocks: ['slate'], maxLength: 3 };
      expect(canContain(cfg, 'slate', 2)).toBe(true);
      expect(canContain(cfg, 'slate', 3)).toBe(false);
      expect(canContain(cfg, 'slate', 4)).toBe(false);
    });

    test('rejects a readOnly container', () => {
      const cfg = { allowedBlocks: ['slate'], readOnly: true };
      expect(canContain(cfg, 'slate', 0)).toBe(false);
    });

    test('rejects a fixed container', () => {
      const cfg = { allowedBlocks: ['slate'], fixed: true };
      expect(canContain(cfg, 'slate', 0)).toBe(false);
    });
  });

  describe('canContainAll', () => {
    test('returns true when every block type is accepted and count fits', () => {
      const cfg = { allowedBlocks: ['slate', 'image'], maxLength: 5 };
      expect(canContainAll(cfg, ['slate', 'image'], 2)).toBe(true);
    });

    test('returns false when any block type is rejected', () => {
      const cfg = { allowedBlocks: ['slate'] };
      expect(canContainAll(cfg, ['slate', 'teaser'], 0)).toBe(false);
    });

    test('returns false when combined count would exceed maxLength', () => {
      const cfg = { allowedBlocks: ['slate'], maxLength: 4 };
      expect(canContainAll(cfg, ['slate', 'slate', 'slate'], 2)).toBe(false);
      expect(canContainAll(cfg, ['slate', 'slate'], 2)).toBe(true);
    });

    test('returns true for an empty input list (nothing to add)', () => {
      const cfg = { allowedBlocks: ['slate'], maxLength: 0 };
      expect(canContainAll(cfg, [], 0)).toBe(true);
    });
  });
});
