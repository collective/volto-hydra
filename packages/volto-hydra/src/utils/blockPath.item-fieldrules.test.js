/**
 * Does a fieldRule on an object_list ITEM get applied with the item's POSITION
 * context (`@index` / `../@index`)?
 *
 * This is the load-bearing question for a container table's header rule: a cell
 * that caps its `blocks` region at one when it is in the first row. A non-typed
 * object_list item's virtual type (`table:rows:cells`) is REGISTERED as a
 * first-class blocksConfig entry at mint time, so pass 2 re-runs its inline
 * schemaEnhancer with { blockId, blockPathMap } — the same path as a real typed
 * block — and `../@index` resolves. These tests pin it for a typed cell and an
 * inline (virtual-typed) cell.
 *
 * NOTE: each test uses a DISTINCT block-type name — `getBlockTypeSchema` memoises
 * generic schemas by type name in a module-level cache, so two tests defining the
 * same type differently would pollute each other.
 */
import { describe, test, expect, vi } from 'vitest';

// HydraSchemaContext.js is JSX inside a .js file — esbuild (vitest) can't parse it.
// The pathmap/enhancer path doesn't touch the live schema context, so stub it.
vi.mock('../context', () => ({
  getHydraSchemaContext: () => ({}),
  setHydraSchemaContext: () => {},
  getLiveBlockData: () => undefined,
}));

import { createSchemaEnhancerFromRecipe } from './blockSync.js';
import {
  buildBlockPathMap,
  getResolvedSchema,
} from '../../../hydra-js/buildBlockPathMap.js';

const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

// Cap the cell's `blocks` region at one block when its ROW is the first row
// (../@index < 1) — the header-cell rule, reduced to the position half.
const headerCapRecipe = {
  fieldRules: {
    blocks: [{ when: { '../@index': { lt: 1 } }, set: { maxLength: 1 } }],
  },
};

// Fresh per test (buildBlockPathMap may stamp the form) + a per-test type name.
const makeForm = (type) => ({
  '@type': 'Document',
  blocks: {
    t1: {
      '@type': type,
      table: {
        rows: [
          { key: 'r0', cells: [{ key: 'c0', '@type': 'tableCell', blocks: [{ '@id': 'b0', '@type': 'slate' }] }] },
          { key: 'r1', cells: [{ key: 'c1', '@type': 'tableCell', blocks: [{ '@id': 'b1', '@type': 'slate' }] }] },
        ],
      },
    },
  },
  blocks_layout: { items: ['t1'] },
});

const tableSchema = (type, cellsField) => ({
  id: type,
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
              schema: { properties: { cells: cellsField } },
            },
          },
        },
      },
    },
  },
});

const basecfg = () => ({
  _page: { id: '_page', schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }) },
  slate: { id: 'slate' },
});

describe('object_list item fieldRules — applied per position (@index) for typed AND inline items', () => {
  test('TYPED cell (registered tableCell): ../@index rule caps the header row, not the body row', () => {
    const cfg = {
      ...basecfg(),
      tableCell: {
        id: 'tableCell',
        schemaEnhancer: createSchemaEnhancerFromRecipe(headerCapRecipe),
        blockSchema: {
          fieldsets: [{ id: 'default', title: 'Cell', fields: ['blocks'] }],
          properties: { blocks: { title: 'Content', widget: 'object_list', allowedBlocks: ['slate'] } },
        },
      },
      tblTyped: tableSchema('tblTyped', {
        widget: 'object_list',
        idField: 'key',
        allowedBlocks: ['tableCell'],
        typeField: '@type',
      }),
    };

    const map = buildBlockPathMap(makeForm('tblTyped'), cfg, intl);
    expect(getResolvedSchema(map['c0'], map)?.properties?.blocks?.maxLength).toBe(1); // row 0 → capped
    expect(getResolvedSchema(map['c1'], map)?.properties?.blocks?.maxLength).toBeUndefined(); // row 1
  });

  test('INLINE cell (virtual type): its own schemaEnhancer IS applied per row position', () => {
    const cfg = {
      ...basecfg(),
      tblInline: tableSchema('tblInline', {
        widget: 'object_list',
        idField: 'key',
        // inline schema (no @type / blocksConfig entry) + a fieldRule enhancer
        schema: {
          schemaEnhancer: createSchemaEnhancerFromRecipe(headerCapRecipe),
          fieldsets: [{ id: 'default', title: 'Cell', fields: ['blocks'] }],
          properties: { blocks: { title: 'Content', widget: 'object_list', allowedBlocks: ['slate'] } },
        },
      }),
    };

    const map = buildBlockPathMap(makeForm('tblInline'), cfg, intl);
    // pass 2 runs the virtual-typed item's inline enhancer with blockId+pathMap,
    // so `../@index` resolves and caps only the header row.
    expect(getResolvedSchema(map['c0'], map)?.properties?.blocks?.maxLength).toBe(1); // row 0 → capped
    expect(getResolvedSchema(map['c1'], map)?.properties?.blocks?.maxLength).toBeUndefined(); // row 1
  });
});
