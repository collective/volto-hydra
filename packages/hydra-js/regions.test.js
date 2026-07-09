/**
 * Unit tests for multi-region blocks_layout.
 *
 * A container declares one BLOCKS FIELD per region — a schema property with
 * widget 'blocks_layout', each with its own allowedBlocks. The field name IS
 * the key under the container's shared `blocks_layout` dict (default 'items'):
 *   schema:  { items: {widget:'blocks_layout'}, footer: {widget:'blocks_layout'} }
 *   data:    blocks_layout: { items: [...], footer: [...] }
 * No `regions` map, no synthesised 'items'.
 */

import { getBlocksFieldNames, buildBlockPathMap, getPageAllowedBlocksFromRestricted } from './buildBlockPathMap.js';
import { mapLayoutItems } from './containerOps.js';

describe('getBlocksFieldNames', () => {
  test('returns the schema properties with widget blocks_layout', () => {
    const schema = {
      properties: {
        title: { type: 'string' },
        items: { widget: 'blocks_layout' },
        footer: { widget: 'blocks_layout' },
        slides: { widget: 'object_list' },
      },
    };
    expect(getBlocksFieldNames(schema)).toEqual(['items', 'footer']);
  });

  test('returns [] when no blocks field is declared (not a container)', () => {
    expect(getBlocksFieldNames({ properties: { title: { type: 'string' } } })).toEqual([]);
    expect(getBlocksFieldNames(undefined)).toEqual([]);
  });
});

describe('mapLayoutItems — multi-region', () => {
  test('carries every region of the source blocks_layout into the target', () => {
    const sourceBlock = {
      blocks: { a: {}, h: {}, f: {} },
      cols: { items: ['a'], header: ['h'], footer: ['f'] },
    };
    const result = mapLayoutItems(
      { fieldName: 'cols' },
      { fieldName: 'blocks_layout' },
      sourceBlock,
    );
    expect(result.blocks).toBe(sourceBlock.blocks);
    expect(result.blocks_layout).toEqual({
      items: ['a'],
      header: ['h'],
      footer: ['f'],
    });
  });

  test('defaults to empty items region when source has no layout', () => {
    const result = mapLayoutItems(
      { fieldName: 'cols' },
      { fieldName: 'blocks_layout' },
      { blocks: {} },
    );
    expect(result.blocks_layout).toEqual({ items: [] });
  });
});

describe('buildBlockPathMap — page blocks fields', () => {
  // Page declares two blocks fields: items (default) + footer. Data lives in the
  // shared blocks_layout dict keyed by field name.
  const blocksConfig = {
    _page: {
      id: '_page',
      schema: () => ({
        properties: {
          items: { widget: 'blocks_layout' },
          footer: { widget: 'blocks_layout', allowedBlocks: ['slate'] },
        },
      }),
    },
    slate: { id: 'slate' },
  };

  const formData = {
    '@type': 'Document',
    blocks: {
      'hero-1': { '@type': 'slate' },
      'body-1': { '@type': 'slate' },
      'footer-1': { '@type': 'slate' },
    },
    blocks_layout: {
      items: ['hero-1', 'body-1'],
      footer: ['footer-1'],
    },
  };

  test('records the blocks field (region) each block lives in', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['hero-1'].region).toBe('items');
    expect(map['body-1'].region).toBe('items');
    expect(map['footer-1'].region).toBe('footer');
  });

  test('all blocks-field children share the one blocks dict', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    // Every blocks-field child (any region) lives in the shared `blocks` dict;
    // the region (field name) is the single container identifier — there is no
    // separate `containerField`.
    expect(map['footer-1'].path).toEqual(['blocks', 'footer-1']);
    expect(map['hero-1'].path).toEqual(['blocks', 'hero-1']);
    expect(map['footer-1'].containerField).toBeUndefined();
  });

  test('siblingCount is per blocks field', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['hero-1'].siblingCount).toBe(2);
    expect(map['footer-1'].siblingCount).toBe(1);
  });

  test('per-field allowedBlocks applies to its blocks', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['footer-1'].allowedSiblingTypes).toEqual(['slate']);
  });

  test('the default (items) region with no per-region allowedBlocks falls back to the page-level list', () => {
    // Compat: a page's single "top-level" allowed-blocks list (derived from `restricted`) must
    // apply to the default `items` region when that region declares no allowedBlocks of its own.
    // effectiveAllowedBlocks is null → allowedSiblingTypes is `defaultPageAllowedBlocks`, NOT
    // undefined and NOT the footer's ['slate']. (Guards the removal of the page-level intersect:
    // that filter was a no-op; this fallback is the actual page-level application.)
    const map = buildBlockPathMap(formData, blocksConfig);
    const pageLevel = getPageAllowedBlocksFromRestricted(blocksConfig, { properties: formData });
    expect(map['hero-1'].allowedSiblingTypes).toEqual(pageLevel);
    // and it is NOT the footer region's per-region list
    expect(map['hero-1'].allowedSiblingTypes).not.toEqual(['slate']);
  });

  test('a page with data only in a non-default field is still processed', () => {
    const map = buildBlockPathMap(
      {
        '@type': 'Document',
        blocks: { 'footer-1': { '@type': 'slate' } },
        blocks_layout: { items: [], footer: ['footer-1'] },
      },
      blocksConfig,
    );
    expect(map['footer-1']?.region).toBe('footer');
  });
});
