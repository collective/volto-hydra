/**
 * The `@type` RULE: a typed object_list item carries a `typeRule` (a `when`-based
 * fieldRule whose `set` is a block-TYPE name) that decides the item's `@type` by
 * POSITION. `applySchemaDefaultsToFormData` — the same pass that applies field
 * defaults, run on every mutation — re-resolves that type and, when it differs from
 * the stored `@type`, CONVERTS the item in place via the container⇄value bridge.
 *
 * The motivating case: a table cell is `tableHeaderCell` (a single slate `value`)
 * in the header row and `tableCell` (a `blocks` container) elsewhere; moving a row
 * to/from row 0 flips its cells' types, losslessly. No new resolver, no editor
 * plumbing — "run the rules, see what changed, write it back".
 */
import { describe, test, expect, vi } from 'vitest';

vi.mock('../context', () => ({
  getHydraSchemaContext: () => ({}),
  setHydraSchemaContext: () => () => {},
  getLiveBlockData: () => undefined,
}));

import {
  applySchemaDefaultsToFormData,
  previewSchemaDefaultConversions,
} from './blockSync.js';
import { getBlockById } from './blockPath.js';
import { buildBlockPathMap } from '../../../hydra-js/buildBlockPathMap.js';

const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };
const slate = (text) => [{ type: 'p', children: [{ text }] }];

// First row → header cell, else body cell. `../@index` is the CELL's ROW index.
const typeRule = [
  { when: { '../@index': { lt: 1 } }, set: 'tableHeaderCell' },
  { set: 'tableCell' },
];

const containerCell = (key, text) => ({
  '@type': 'tableCell',
  key,
  blocks: [{ '@id': `${key}-s`, '@type': 'slate', value: slate(text) }],
});

const makeForm = (rows) => ({
  '@type': 'Document',
  blocks: {
    t1: { '@type': 'tbl', table: { rows } },
  },
  blocks_layout: { items: ['t1'] },
});

const cfg = {
  _page: {
    id: '_page',
    schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }),
  },
  slate: { id: 'slate' },
  tableCell: {
    id: 'tableCell',
    blockSchema: {
      properties: {
        blocks: { widget: 'object_list', typeField: '@type', allowedBlocks: ['slate'] },
      },
    },
  },
  tableHeaderCell: {
    id: 'tableHeaderCell',
    blockSchema: { properties: { value: { widget: 'slate' } } },
    // The container⇄value bridge, declared once on the value block.
    fieldMappings: { tableCell: { value: 'blocks/slate/value' } },
  },
  tbl: {
    id: 'tbl',
    blockSchema: {
      properties: {
        table: {
          widget: 'object',
          schema: {
            properties: {
              rows: {
                widget: 'object_list',
                idField: 'key',
                addMode: 'table',
                schema: {
                  properties: {
                    cells: {
                      widget: 'object_list',
                      idField: 'key',
                      typeField: '@type',
                      allowedBlocks: ['tableCell', 'tableHeaderCell'],
                      typeRule, // ← the @type rule under test
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe('@type rule — position converts a cell between container and value', () => {
  test('the header-row cell becomes tableHeaderCell (value merged); the body cell stays a container', () => {
    const form = makeForm([
      { key: 'r0', cells: [containerCell('c0', 'Method')] },
      { key: 'r1', cells: [containerCell('c1', 'Body')] },
    ]);
    const map = buildBlockPathMap(form, cfg, intl);
    // sanity: the rule is carried onto the typed item
    expect(map['c0']?.typeRule).toBe(typeRule);

    const out = applySchemaDefaultsToFormData(form, map, cfg, intl);

    const c0 = getBlockById(out, map, 'c0'); // getBlockById is path-based → still finds it
    expect(c0['@type']).toBe('tableHeaderCell'); // row 0 → converted to the value type
    expect(c0.blocks).toBeUndefined(); // container storage dropped
    expect(JSON.stringify(c0.value)).toContain('Method'); // collapsed to a value

    const c1 = getBlockById(out, map, 'c1');
    expect(c1['@type']).toBe('tableCell'); // row 1 → unchanged
    expect(c1.blocks).toHaveLength(1);
  });

  test('reordering rows flips the types: the new row-0 cell becomes a header, the old one reverts (text round-trips)', () => {
    // normalise once: c0 = header value, c1 = body container
    const form = makeForm([
      { key: 'r0', cells: [containerCell('c0', 'Method')] },
      { key: 'r1', cells: [containerCell('c1', 'Body')] },
    ]);
    let map = buildBlockPathMap(form, cfg, intl);
    let out = applySchemaDefaultsToFormData(form, map, cfg, intl);
    expect(getBlockById(out, map, 'c0')['@type']).toBe('tableHeaderCell');

    // simulate a DnD row reorder: swap the two rows, then re-run the pass
    const rows = out.blocks.t1.table.rows;
    out = {
      ...out,
      blocks: {
        ...out.blocks,
        t1: { ...out.blocks.t1, table: { rows: [rows[1], rows[0]] } },
      },
    };
    map = buildBlockPathMap(out, cfg, intl); // positions changed → rebuild
    out = applySchemaDefaultsToFormData(out, map, cfg, intl);

    // c1 is now in row 0 → a header value carrying its text
    const c1 = getBlockById(out, map, 'c1');
    expect(c1['@type']).toBe('tableHeaderCell');
    expect(JSON.stringify(c1.value)).toContain('Body');

    // c0 is now in row 1 → reverts to a container; its text survives value→container
    const c0 = getBlockById(out, map, 'c0');
    expect(c0['@type']).toBe('tableCell');
    expect(c0.blocks).toHaveLength(1);
    expect(JSON.stringify(c0.blocks[0].value)).toContain('Method');
  });

  test('a stable table (no position change) does not rewrite any cell type', () => {
    const form = makeForm([
      { key: 'r0', cells: [{ '@type': 'tableHeaderCell', key: 'c0', value: slate('H') }] },
      { key: 'r1', cells: [containerCell('c1', 'B')] },
    ]);
    const map = buildBlockPathMap(form, cfg, intl);
    const out = applySchemaDefaultsToFormData(form, map, cfg, intl);
    expect(getBlockById(out, map, 'c0')['@type']).toBe('tableHeaderCell'); // already right
    expect(getBlockById(out, map, 'c1')['@type']).toBe('tableCell');
  });
});

// The generic "sandbox the drop, see what converts" detector the DnD/paste path
// uses to decide whether to ask before committing.
describe('previewSchemaDefaultConversions — trial a candidate, report @type changes', () => {
  test('a candidate whose rules convert a cell reports that conversion (and returns the converted formData)', () => {
    // Candidate = a container cell sitting in the header row (as if just dropped there).
    const candidate = makeForm([
      { key: 'r0', cells: [containerCell('c0', 'Method')] },
      { key: 'r1', cells: [containerCell('c1', 'Body')] },
    ]);
    const map = buildBlockPathMap(candidate, cfg, intl);
    const { formData, conversions } = previewSchemaDefaultConversions(candidate, map, cfg, intl);

    expect(conversions).toEqual([
      { blockId: 'c0', from: 'tableCell', to: 'tableHeaderCell' },
    ]);
    // the returned formData is already converted — the caller commits it as-is
    expect(getBlockById(formData, map, 'c0')['@type']).toBe('tableHeaderCell');
    expect(getBlockById(formData, map, 'c1')['@type']).toBe('tableCell');
  });

  test('a candidate the rules leave alone reports no conversions (→ commit silently)', () => {
    const candidate = makeForm([
      { key: 'r0', cells: [{ '@type': 'tableHeaderCell', key: 'c0', value: slate('H') }] },
      { key: 'r1', cells: [containerCell('c1', 'B')] },
    ]);
    const map = buildBlockPathMap(candidate, cfg, intl);
    const { conversions } = previewSchemaDefaultConversions(candidate, map, cfg, intl);
    expect(conversions).toEqual([]);
  });
});
