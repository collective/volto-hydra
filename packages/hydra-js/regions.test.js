/**
 * Unit tests for multi-region blocks_layout helpers.
 *
 * A `blocks_layout` value may hold multiple named regions as sub-keys:
 *   { items: [...], footer: [...], mobile_footer: [...] }
 * `items` is the implicit default region. Regions are declared in the schema
 * via a `regions` map so the editor knows them even when empty.
 *
 * Strict TDD: each test must fail before its implementation exists.
 */

import {
  getFieldRegions,
  resolveRegionConstraints,
  buildBlockPathMap,
} from './buildBlockPathMap.js';
import { mapLayoutItems } from './containerOps.js';

describe('getFieldRegions', () => {
  test('returns ["items"] when no regions declared and only items present', () => {
    expect(getFieldRegions({ widget: 'blocks_layout' }, { items: ['a'] })).toEqual([
      'items',
    ]);
  });

  test('"items" is always present even when the field value is empty/undefined', () => {
    expect(getFieldRegions({ widget: 'blocks_layout' }, undefined)).toEqual(['items']);
    expect(getFieldRegions(undefined, {})).toEqual(['items']);
  });

  test('declared regions appear even when empty (no data yet)', () => {
    const fieldDef = {
      widget: 'blocks_layout',
      regions: { footer: { title: 'Footer' }, mobile_footer: { title: 'Mobile' } },
    };
    expect(getFieldRegions(fieldDef, { items: ['a'] })).toEqual([
      'items',
      'footer',
      'mobile_footer',
    ]);
  });

  test('present-but-undeclared array sub-keys are tolerated (never silently dropped)', () => {
    const regions = getFieldRegions(
      { widget: 'blocks_layout', regions: { footer: {} } },
      { items: ['a'], footer: ['f'], legacy_region: ['x'] },
    );
    expect(regions).toContain('legacy_region');
    // no duplicates
    expect(new Set(regions).size).toBe(regions.length);
  });

  test('non-array sub-keys are not treated as regions', () => {
    const regions = getFieldRegions(
      { widget: 'blocks_layout' },
      { items: ['a'], somethingElse: { not: 'an array' } },
    );
    expect(regions).toEqual(['items']);
  });
});

describe('resolveRegionConstraints', () => {
  const fieldDef = {
    widget: 'blocks_layout',
    allowedBlocks: ['slate', 'image'],
    maxLength: 20,
    regions: {
      footer: { title: 'Footer', allowedBlocks: ['slate', 'link'], maxLength: 1 },
    },
  };

  test('region override wins over field-level', () => {
    const rc = resolveRegionConstraints(fieldDef, 'footer', null);
    expect(rc.allowedBlocks).toEqual(['slate', 'link']);
    expect(rc.maxLength).toBe(1);
    expect(rc.title).toBe('Footer');
  });

  test('falls back to field-level when region declares no override', () => {
    const rc = resolveRegionConstraints(fieldDef, 'items', null);
    expect(rc.allowedBlocks).toEqual(['slate', 'image']);
    expect(rc.maxLength).toBe(20);
  });

  test('falls back to block-level config when field-level absent', () => {
    const rc = resolveRegionConstraints(
      { widget: 'blocks_layout' },
      'items',
      { allowedBlocks: ['teaser'], maxLength: 5 },
    );
    expect(rc.allowedBlocks).toEqual(['teaser']);
    expect(rc.maxLength).toBe(5);
  });

  test('items region default title derives from field title', () => {
    const rc = resolveRegionConstraints({ title: 'Blocks' }, 'items', null);
    expect(rc.title).toBe('Blocks');
  });
});

describe('mapLayoutItems — multi-region', () => {
  test('carries every region (items + named) into the target field', () => {
    const sourceBlock = {
      blocks: { a: {}, f: {}, m: {} },
      cols: { items: ['a'], footer: ['f'], mobile_footer: ['m'] },
    };
    const result = mapLayoutItems(
      { fieldName: 'cols' },
      { fieldName: 'blocks_layout' },
      sourceBlock,
    );
    expect(result.blocks).toBe(sourceBlock.blocks);
    expect(result.blocks_layout).toEqual({
      items: ['a'],
      footer: ['f'],
      mobile_footer: ['m'],
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

  test('ignores non-array sub-keys on the source layout', () => {
    const result = mapLayoutItems(
      { fieldName: 'cols' },
      { fieldName: 'blocks_layout' },
      { blocks: {}, cols: { items: ['a'], meta: { x: 1 } } },
    );
    expect(result.blocks_layout).toEqual({ items: ['a'] });
  });
});

describe('buildBlockPathMap — page-level regions', () => {
  const blocksConfig = {
    _page: {
      id: '_page',
      schema: () => ({
        properties: {
          blocks_layout: {
            widget: 'blocks_layout',
            regions: { footer: { title: 'Footer' } },
          },
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

  test('records the region each block lives in', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['hero-1'].region).toBe('items');
    expect(map['body-1'].region).toBe('items');
    expect(map['footer-1'].region).toBe('footer');
  });

  test('all blocks share one blocks dict (path under blocks)', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['footer-1'].path).toEqual(['blocks', 'footer-1']);
    expect(map['footer-1'].containerField).toBe('blocks_layout');
  });

  test('siblingCount is per-region', () => {
    const map = buildBlockPathMap(formData, blocksConfig);
    expect(map['hero-1'].siblingCount).toBe(2);
    expect(map['footer-1'].siblingCount).toBe(1);
  });

  test('a page with data only in a non-items region is still processed', () => {
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
