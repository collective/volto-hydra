import { describe, test, expect, vi } from 'vitest';

// blockSync.js pulls in the React context barrel (JSX in a .js file, which
// vite won't parse). convertBlockType is a pure function that never touches it,
// so stub the barrel out of the module graph.
vi.mock('../context/index.js', () => ({
  getHydraSchemaContext: () => null,
  setHydraSchemaContext: () => {},
  getLiveBlockData: () => null,
}));

import { convertBlockType } from './blockSync.js';

// -----------------------------------------------------------------------------
// Container↔container "reshape" conversion.
//
// tabs / steps / definitionList / accordion are all the SAME shape: a container
// whose children are cells (tab / stepItem / definitionItem / accordionPanel),
// each cell a mini-container of arbitrary content blocks. `fieldMappings` wire a
// hub-and-spoke graph (tabs is the container hub, tab the cell hub) so any pair
// converts transitively. A region↔region mapping must MOVE the cells across and
// cascade-convert each cell to a type the target region allows — recursively,
// via this same converter.
//
// Storage note: a region is a region. Top-level containers keep cells in their
// own `blocks`/`blocks_layout`; accordion nests them under a `data` object
// wrapper (region path `data/items`). Both go through the same code path.
// -----------------------------------------------------------------------------

// A content region shared by every CELL: holds arbitrary content (here: slate).
const contentRegion = {
  widget: 'blocks_layout',
  allowedBlocks: ['slate'],
  defaultBlockType: 'slate',
};

const cellSchema = {
  properties: {
    title: { widget: 'text' },
    items: contentRegion,
  },
};

// A container region: holds CELLS of a single type.
const containerRegion = (cellType) => ({
  widget: 'blocks_layout',
  allowedBlocks: [cellType],
  defaultBlockType: cellType,
});

const blocksConfig = {
  slate: { blockSchema: { properties: { value: { widget: 'slate' } } } },

  // --- cells (item hub = tab) ---
  tab: {
    blockSchema: cellSchema,
    fieldMappings: {
      stepItem: { title: 'title', items: 'items' },
      definitionItem: { title: 'title', items: 'items' },
      accordionPanel: { title: 'title', items: 'items' },
    },
  },
  stepItem: {
    blockSchema: cellSchema,
    fieldMappings: { tab: { title: 'title', items: 'items' } },
  },
  definitionItem: {
    blockSchema: cellSchema,
    fieldMappings: { tab: { title: 'title', items: 'items' } },
  },
  accordionPanel: {
    blockSchema: cellSchema,
    fieldMappings: { tab: { title: 'title', items: 'items' } },
  },

  // --- containers (container hub = tabs) ---
  tabs: {
    blockSchema: { properties: { items: containerRegion('tab') } },
    fieldMappings: {
      steps: { items: 'items' },
      definitionList: { items: 'items' },
      accordion: { 'data/items': 'items' },
    },
  },
  steps: {
    blockSchema: { properties: { items: containerRegion('stepItem') } },
    fieldMappings: { tabs: { items: 'items' } },
  },
  definitionList: {
    blockSchema: { properties: { items: containerRegion('definitionItem') } },
    fieldMappings: { tabs: { items: 'items' } },
  },
  accordion: {
    // Nested region: cells live under a `data` object wrapper at `data/items`.
    blockSchema: {
      properties: {
        data: {
          widget: 'object',
          schema: { properties: { items: containerRegion('accordionPanel') } },
        },
      },
    },
    fieldMappings: { tabs: { items: 'data/items' } },
  },

  // --- value ↔ region bridge (single value block ↔ a container of slate) ---
  // calloutValue is a VALUE block (one slate `message`); calloutBox is the
  // container form (a region of slate children). The bridge uses the
  // `region/type/field` path on the region side, declared target-side both ways
  // so "Convert to…" (findConversionPath) has an edge in each direction.
  calloutValue: {
    blockSchema: { properties: { message: { widget: 'slate' } } },
    // calloutBox → calloutValue (COLLAPSE): gather items' slate `value` → message.
    fieldMappings: { calloutBox: { 'items/slate/value': 'message' } },
  },
  calloutBox: {
    blockSchema: {
      properties: {
        items: {
          widget: 'blocks_layout',
          allowedBlocks: ['slate'],
          defaultBlockType: 'slate',
        },
      },
    },
    // calloutValue → calloutBox (EXPAND): wrap message into one slate child.
    fieldMappings: { calloutValue: { message: 'items/slate/value' } },
  },
};

const intl = { formatMessage: (m) => m?.defaultMessage ?? '' };

// A slate content block.
const slate = (text) => ({
  '@type': 'slate',
  value: [{ type: 'p', children: [{ text }] }],
});

// A cell: title + one slate content child.
const cell = (type, id, title, text) => ({
  '@type': type,
  title,
  blocks: { [`${id}c`]: slate(text) },
  blocks_layout: { items: [`${id}c`] },
});

// A top-level container: cells in its own blocks/blocks_layout.
const container = (type, cells) => ({
  '@type': type,
  blocks: Object.fromEntries(cells.map((c, i) => [`cell-${i}`, c])),
  blocks_layout: { items: cells.map((_, i) => `cell-${i}`) },
});

describe('convertBlockType — container↔container reshape', () => {
  test('tabs → steps: tab cells become stepItems, content preserved', () => {
    const tabs = container('tabs', [
      cell('tab', 'a', 'First', 'alpha'),
      cell('tab', 'b', 'Second', 'beta'),
    ]);

    const out = convertBlockType(tabs, 'steps', blocksConfig, '@type', intl);

    expect(out['@type']).toBe('steps');
    const cells = out.blocks_layout.items.map((id) => out.blocks[id]);
    expect(cells.map((c) => c['@type'])).toEqual(['stepItem', 'stepItem']);
    expect(cells.map((c) => c.title)).toEqual(['First', 'Second']);
    // Each stepItem keeps its slate content child.
    const firstContent = cells[0].blocks[cells[0].blocks_layout.items[0]];
    expect(firstContent['@type']).toBe('slate');
    expect(firstContent.value[0].children[0].text).toBe('alpha');
    // The old tabs cells did not leak through as a preserved field.
    expect(cells.every((c) => c['@type'] !== 'tab')).toBe(true);
  });

  test('steps → tabs: reverse direction (stepItem → tab)', () => {
    const steps = container('steps', [cell('stepItem', 'a', 'Do it', 'go')]);
    const out = convertBlockType(steps, 'tabs', blocksConfig, '@type', intl);
    expect(out['@type']).toBe('tabs');
    const only = out.blocks[out.blocks_layout.items[0]];
    expect(only['@type']).toBe('tab');
    expect(only.title).toBe('Do it');
  });

  test('accordion → tabs: nested data/items region → top-level items', () => {
    const accordion = {
      '@type': 'accordion',
      data: {
        blocks: { p0: cell('accordionPanel', 'a', 'Panel', 'inside') },
        blocks_layout: { items: ['p0'] },
      },
    };

    const out = convertBlockType(accordion, 'tabs', blocksConfig, '@type', intl);

    expect(out['@type']).toBe('tabs');
    // Cells moved OUT of the nested `data` wrapper up to the top level...
    const cells = out.blocks_layout.items.map((id) => out.blocks[id]);
    expect(cells.map((c) => c['@type'])).toEqual(['tab']);
    expect(cells[0].title).toBe('Panel');
    // ...and the stale `data` wrapper did not leak onto the tabs block.
    expect(out.data).toBeUndefined();
  });

  test('tabs → accordion: top-level items → nested data/items region', () => {
    const tabs = container('tabs', [cell('tab', 'a', 'Q', 'ans')]);
    const out = convertBlockType(tabs, 'accordion', blocksConfig, '@type', intl);
    expect(out['@type']).toBe('accordion');
    const ids = out.data.blocks_layout.items;
    expect(ids).toHaveLength(1);
    const panel = out.data.blocks[ids[0]];
    expect(panel['@type']).toBe('accordionPanel');
    expect(panel.title).toBe('Q');
    // Not left at the top level.
    expect(out.blocks).toBeUndefined();
  });

  test('transitive: steps → definitionList (via tabs hub) converts cells', () => {
    const steps = container('steps', [cell('stepItem', 'a', 'Term', 'def')]);
    const out = convertBlockType(
      steps,
      'definitionList',
      blocksConfig,
      '@type',
      intl,
    );
    expect(out['@type']).toBe('definitionList');
    const only = out.blocks[out.blocks_layout.items[0]];
    expect(only['@type']).toBe('definitionItem');
    expect(only.title).toBe('Term');
  });

  test('roundtrip tabs → steps → tabs preserves titles + content', () => {
    const tabs = container('tabs', [
      cell('tab', 'a', 'One', 'first'),
      cell('tab', 'b', 'Two', 'second'),
    ]);
    const steps = convertBlockType(tabs, 'steps', blocksConfig, '@type', intl);
    const back = convertBlockType(steps, 'tabs', blocksConfig, '@type', intl);
    expect(back['@type']).toBe('tabs');
    const cells = back.blocks_layout.items.map((id) => back.blocks[id]);
    expect(cells.map((c) => c['@type'])).toEqual(['tab', 'tab']);
    expect(cells.map((c) => c.title)).toEqual(['One', 'Two']);
    const c0 = cells[0].blocks[cells[0].blocks_layout.items[0]];
    expect(c0.value[0].children[0].text).toBe('first');
  });
});

describe('convertBlockType — single value ↔ region', () => {
  test('expand: a value block becomes a container with one slate child', () => {
    const value = { '@type': 'calloutValue', message: slate('heads up').value };
    const out = convertBlockType(
      value,
      'calloutBox',
      blocksConfig,
      '@type',
      intl,
    );
    expect(out['@type']).toBe('calloutBox');
    // The scalar `message` was wrapped into ONE slate child in the region...
    const ids = out.blocks_layout.items;
    expect(ids).toHaveLength(1);
    const child = out.blocks[ids[0]];
    expect(child['@type']).toBe('slate');
    expect(child.value[0].children[0].text).toBe('heads up');
    // ...and the raw scalar did not leak onto the container.
    expect(out.message).toBeUndefined();
  });

  test('collapse: a container of slate children becomes one value', () => {
    const box = {
      '@type': 'calloutBox',
      blocks: { s1: slate('line one'), s2: slate('line two') },
      blocks_layout: { items: ['s1', 's2'] },
    };
    const out = convertBlockType(
      box,
      'calloutValue',
      blocksConfig,
      '@type',
      intl,
    );
    expect(out['@type']).toBe('calloutValue');
    // Slate children merged into the single `message` value...
    expect(Array.isArray(out.message)).toBe(true);
    const text = JSON.stringify(out.message);
    expect(text).toContain('line one');
    expect(text).toContain('line two');
    // ...and the region storage did not leak onto the value block.
    expect(out.blocks).toBeUndefined();
    expect(out.blocks_layout).toBeUndefined();
  });

  test('roundtrip value → container → value preserves the message', () => {
    const value = { '@type': 'calloutValue', message: slate('remember me').value };
    const box = convertBlockType(value, 'calloutBox', blocksConfig, '@type', intl);
    const back = convertBlockType(box, 'calloutValue', blocksConfig, '@type', intl);
    expect(back['@type']).toBe('calloutValue');
    expect(JSON.stringify(back.message)).toContain('remember me');
    expect(back.blocks).toBeUndefined();
  });
});
