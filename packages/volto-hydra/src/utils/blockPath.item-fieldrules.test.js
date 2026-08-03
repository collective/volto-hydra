/**
 * Does a fieldRule on an object_list ITEM get applied with the item's POSITION
 * context (`@index` / `../@index`)?
 *
 * This is the load-bearing question for a container table's header rule: a cell
 * that caps its `blocks` region at one when it is in the first row. buildBlockPathMap
 * pass-2 re-runs a block's `schemaEnhancer` with { blockId, blockPathMap }, but only
 * for entries whose blockType has a real blocksConfig entry — so a NON-typed
 * object_list item (virtual blockType, inline schema) is skipped, while a TYPED item
 * (a registered block type) is enhanced. These tests pin both facts.
 */
import { describe, test, expect, vi } from 'vitest';

// HydraSchemaContext.js is JSX inside a .js file — esbuild (vitest) can't parse it.
// The pathmap/enhancer path doesn't touch the live schema context, so stub it
// (same as blockSync.test.js). resolveWhenField reads position from the passed
// blockPathMap, not the context singleton.
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
// (../@index < 1). This is the header-cell rule, reduced to the position half.
const headerCapRecipe = {
  fieldRules: {
    blocks: [{ when: { '../@index': { lt: 1 } }, set: { maxLength: 1 } }],
  },
};

const form = {
  '@type': 'Document',
  blocks: {
    t1: {
      '@type': 'table',
      table: {
        rows: [
          { key: 'r0', cells: [{ key: 'c0', '@type': 'tableCell', blocks: [{ '@id': 'b0', '@type': 'slate' }] }] },
          { key: 'r1', cells: [{ key: 'c1', '@type': 'tableCell', blocks: [{ '@id': 'b1', '@type': 'slate' }] }] },
        ],
      },
    },
  },
  blocks_layout: { items: ['t1'] },
};

const tableSchema = (cellsField) => ({
  id: 'table',
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

describe('object_list item fieldRules — applied only for TYPED items (with @index position)', () => {
  test('TYPED cell (registered tableCell): ../@index rule caps the header row, not the body row', () => {
    const cfg = {
      _page: { id: '_page', schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }) },
      slate: { id: 'slate' },
      tableCell: {
        id: 'tableCell',
        schemaEnhancer: createSchemaEnhancerFromRecipe(headerCapRecipe),
        blockSchema: {
          fieldsets: [{ id: 'default', title: 'Cell', fields: ['blocks'] }],
          properties: { blocks: { title: 'Content', widget: 'object_list', allowedBlocks: ['slate'] } },
        },
      },
      table: tableSchema({
        widget: 'object_list',
        idField: 'key',
        allowedBlocks: ['tableCell'],
        typeField: '@type',
      }),
    };

    const map = buildBlockPathMap(form, cfg, intl);
    const headerCell = getResolvedSchema(map['c0'], map);
    const bodyCell = getResolvedSchema(map['c1'], map);

    expect(headerCell?.properties?.blocks?.maxLength).toBe(1); // row 0 → capped
    expect(bodyCell?.properties?.blocks?.maxLength).toBeUndefined(); // row 1 → uncapped
  });

  test('NON-typed cell (inline schema): the same rule is NOT applied (documents the gap)', () => {
    const cfg = {
      _page: { id: '_page', schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }) },
      slate: { id: 'slate' },
      table: tableSchema({
        widget: 'object_list',
        idField: 'key',
        // inline schema (no @type / blocksConfig entry) + a fieldRule recipe on it
        schema: {
          schemaEnhancer: createSchemaEnhancerFromRecipe(headerCapRecipe),
          fieldsets: [{ id: 'default', title: 'Cell', fields: ['blocks'] }],
          properties: { blocks: { title: 'Content', widget: 'object_list', allowedBlocks: ['slate'] } },
        },
      }),
    };

    const map = buildBlockPathMap(form, cfg, intl);
    const headerCell = getResolvedSchema(map['c0'], map);

    // The inline item's schemaEnhancer never runs (pass-2 skips virtual types),
    // so the cap is absent — this is why an inline-cell header rule silently
    // does nothing.
    expect(headerCell?.properties?.blocks?.maxLength).toBeUndefined();
  });
});
