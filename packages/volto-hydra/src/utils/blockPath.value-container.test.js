/**
 * Container <-> value conversion via a region-crossing fieldMappings path
 * (`<region>/<type|*>/<field>`). Collapse merges a region of slate blocks into a
 * single value; expand wraps a value in one child block. See
 * proposals/container-value-conversion.md.
 */
import { describe, test, expect, vi } from 'vitest';

vi.mock('../context', () => ({
  getHydraSchemaContext: () => ({}),
  setHydraSchemaContext: () => () => {},
  getLiveBlockData: () => undefined,
}));

import {
  convertValueContainer,
  parseRegionPath,
  normalizeItemTypes,
} from './blockPath.js';

const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };
const slate = (text) => [{ type: 'p', children: [{ text }] }];

const cfg = {
  slate: { id: 'slate' },
  image: { id: 'image' },
  tableCell: {
    id: 'tableCell',
    blockSchema: {
      properties: {
        blocks: {
          widget: 'object_list',
          typeField: '@type',
          allowedBlocks: ['slate', 'image'],
        },
      },
    },
  },
  tableHeaderCell: {
    id: 'tableHeaderCell',
    blockSchema: { properties: { value: { widget: 'slate' } } },
    // The bridge, declared once on the value block:
    fieldMappings: { tableCell: { value: 'blocks/slate/value' } },
  },
};

describe('parseRegionPath', () => {
  test('a 3-segment path is a region path; * means any type', () => {
    expect(parseRegionPath('blocks/slate/value')).toEqual({
      region: 'blocks',
      type: 'slate',
      field: 'value',
    });
    expect(parseRegionPath('blocks/*/value')).toEqual({
      region: 'blocks',
      type: null,
      field: 'value',
    });
  });

  test('scalar / object-descent paths are NOT region paths', () => {
    expect(parseRegionPath('value')).toBeNull();
    expect(parseRegionPath('content/headline')).toBeNull(); // object descent, 2 segments
    expect(parseRegionPath(undefined)).toBeNull();
  });
});

describe('convertValueContainer — container <-> value bridge', () => {
  test('collapse: a tableCell of slate blocks -> a tableHeaderCell value (merged; key/width preserved)', () => {
    const cell = {
      '@type': 'tableCell',
      key: 'c0',
      width: '20%',
      blocks: [
        { '@type': 'slate', '@id': 's1', value: slate('Hello ') },
        { '@type': 'slate', '@id': 's2', value: slate('world') },
      ],
    };
    const out = convertValueContainer(cell, 'tableCell', 'tableHeaderCell', cfg, intl);
    expect(out['@type']).toBe('tableHeaderCell');
    expect(out.key).toBe('c0'); // unmapped scalar survives
    expect(out.width).toBe('20%');
    expect(out.blocks).toBeUndefined(); // region storage dropped
    expect(out.value).toHaveLength(1); // merged into one node
    const txt = JSON.stringify(out.value);
    expect(txt).toContain('Hello');
    expect(txt).toContain('world');
  });

  test('collapse: an image sibling is skipped by the slate filter', () => {
    const cell = {
      '@type': 'tableCell',
      key: 'c0',
      blocks: [
        { '@type': 'slate', '@id': 's1', value: slate('Text') },
        { '@type': 'image', '@id': 'i1', url: '/x.jpg' },
      ],
    };
    const out = convertValueContainer(cell, 'tableCell', 'tableHeaderCell', cfg, intl);
    const txt = JSON.stringify(out.value);
    expect(txt).toContain('Text');
    expect(txt).not.toContain('x.jpg');
  });

  test('expand: a tableHeaderCell value -> a tableCell with one slate child (key preserved)', () => {
    const hcell = { '@type': 'tableHeaderCell', key: 'c0', value: slate('Method') };
    const out = convertValueContainer(hcell, 'tableHeaderCell', 'tableCell', cfg, intl);
    expect(out['@type']).toBe('tableCell');
    expect(out.key).toBe('c0');
    expect(out.value).toBeUndefined();
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]['@type']).toBe('slate');
    expect(JSON.stringify(out.blocks[0].value)).toContain('Method');
  });

  test('no bridge declared -> null (caller falls back to region funnel)', () => {
    expect(
      convertValueContainer({ '@type': 'slate' }, 'slate', 'image', cfg, intl),
    ).toBeNull();
  });
});

describe('normalizeItemTypes — position drives cell type (the reorder → type flow)', () => {
  const cellsRegion = {
    isObjectList: true,
    region: 'cells',
    idField: 'key',
    typeField: '@type',
  };
  const containerCell = (key, text) => ({
    '@type': 'tableCell',
    key,
    blocks: [{ '@type': 'slate', '@id': `${key}-s`, value: slate(text) }],
  });
  // "the first cell is a header" — the position rule, reduced.
  const headerAtZero = (item, i) => (i === 0 ? 'tableHeaderCell' : 'tableCell');

  test('cell at the header index converts to the value type; others stay container', () => {
    const row = { key: 'r0', cells: [containerCell('c0', 'A'), containerCell('c1', 'B')] };
    const out = normalizeItemTypes(row, cellsRegion, headerAtZero, cfg, intl);
    expect(out.cells[0]['@type']).toBe('tableHeaderCell');
    expect(JSON.stringify(out.cells[0].value)).toContain('A'); // collapsed to a value
    expect(out.cells[1]['@type']).toBe('tableCell'); // unchanged
    expect(out.cells[1].blocks).toHaveLength(1);
  });

  test('reordering flips types: the new first cell becomes a header, the old one reverts (text round-trips)', () => {
    // normalised: c0 = header value, c1 = body container
    let row = normalizeItemTypes(
      { key: 'r0', cells: [containerCell('c0', 'A'), containerCell('c1', 'B')] },
      cellsRegion,
      headerAtZero,
      cfg,
      intl,
    );
    expect(row.cells[0]['@type']).toBe('tableHeaderCell');
    // simulate a DnD reorder: swap the two cells
    row = { ...row, cells: [row.cells[1], row.cells[0]] };
    // re-normalise for the new positions
    row = normalizeItemTypes(row, cellsRegion, headerAtZero, cfg, intl);
    // the block now at index 0 (was the container c1) is a header value
    expect(row.cells[0]['@type']).toBe('tableHeaderCell');
    expect(JSON.stringify(row.cells[0].value)).toContain('B');
    // the block now at index 1 (was the header value c0) reverts to a container,
    // and its text survives the value -> container round-trip
    expect(row.cells[1]['@type']).toBe('tableCell');
    expect(row.cells[1].blocks).toHaveLength(1);
    expect(JSON.stringify(row.cells[1].blocks[0].value)).toContain('A');
  });

  test('no change -> same reference (no spurious write)', () => {
    const row = { key: 'r0', cells: [containerCell('c0', 'A')] };
    expect(normalizeItemTypes(row, cellsRegion, () => 'tableCell', cfg, intl)).toBe(row);
  });
});
