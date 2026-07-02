/**
 * Region-awareness of the blockPath operation funnel.
 *
 * The load-bearing guarantee: writing one region (reorder/move/insert/delete)
 * must PRESERVE the sibling regions of the same blocks_layout field.
 */
import { describe, test, expect } from 'vitest';
import {
  buildBlockPathMap,
  getContainerFieldConfig,
  getContainerItems,
  reorderBlocksInContainer,
  moveBlockBetweenContainers,
  ensureEmptyBlockIfEmpty,
  insertBlockInContainer,
  getAllContainerFields,
  listContainerChildren,
  convertContainerBlock,
} from './blockPath.js';

const PAGE = '_page';
const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

const blocksConfig = {
  _page: {
    id: '_page',
    schema: () => ({
      properties: {
        items: { widget: 'blocks_layout' },
        footer: { widget: 'blocks_layout', title: 'Footer' },
      },
    }),
  },
  slate: { id: 'slate' },
};

const makeForm = () => ({
  '@type': 'Document',
  blocks: {
    a: { '@type': 'slate' },
    b: { '@type': 'slate' },
    f1: { '@type': 'slate' },
    f2: { '@type': 'slate' },
  },
  blocks_layout: {
    items: ['a', 'b'],
    footer: ['f1', 'f2'],
  },
});

describe('getContainerFieldConfig — region', () => {
  test('reports the region for a footer block and an items block', () => {
    const form = makeForm();
    const map = buildBlockPathMap(form, blocksConfig, intl);
    expect(
      getContainerFieldConfig('f1', map, form, blocksConfig, intl).region,
    ).toBe('footer');
    expect(
      getContainerFieldConfig('a', map, form, blocksConfig, intl).region,
    ).toBe('items');
  });
});

describe('getContainerItems — region-scoped read', () => {
  test('reads the requested region, not always items', () => {
    const form = makeForm();
    expect(
      getContainerItems(form, { region: 'footer' }),
    ).toEqual(['f1', 'f2']);
    expect(
      getContainerItems(form, { region: 'items' }),
    ).toEqual(['a', 'b']); // default region = items
  });
});

describe('reorderBlocksInContainer — sibling preservation', () => {
  test('reordering the footer region leaves items untouched', () => {
    const form = makeForm();
    const map = buildBlockPathMap(form, blocksConfig, intl);
    const result = reorderBlocksInContainer(
      form,
      map,
      PAGE,
      'footer',
      ['f2', 'f1'],
      blocksConfig,
      intl,
    );
    expect(result.blocks_layout.footer).toEqual(['f2', 'f1']);
    expect(result.blocks_layout.items).toEqual(['a', 'b']); // preserved
  });
});

describe('moveBlockBetweenContainers — cross-region within one field', () => {
  test('moving an items block into the footer region updates both lists', () => {
    const form = makeForm();
    const map = buildBlockPathMap(form, blocksConfig, intl);
    const result = moveBlockBetweenContainers(
      form,
      map,
      'b', // move this items block
      'f1', // before this footer block
      false,
      PAGE,
      PAGE,
      blocksConfig,
      intl,
    );
    expect(result).not.toBeNull();
    expect(result.blocks_layout.items).toEqual(['a']); // b left items
    expect(result.blocks_layout.footer).toContain('b'); // b entered footer
    expect(result.blocks_layout.footer).toContain('f1');
    expect(result.blocks_layout.footer).toContain('f2');
    // block data still in the shared dict
    expect(result.blocks.b).toBeTruthy();
  });

  test('same-region move is still a reorder (not a cross-container move)', () => {
    const form = makeForm();
    const map = buildBlockPathMap(form, blocksConfig, intl);
    const result = moveBlockBetweenContainers(
      form,
      map,
      'a',
      'b',
      true, // after b
      PAGE,
      PAGE,
      blocksConfig,
      intl,
    );
    expect(result).not.toBeNull();
    expect(result.blocks_layout.items).toEqual(['b', 'a']);
    expect(result.blocks_layout.footer).toEqual(['f1', 'f2']); // preserved
  });
});

describe('empty-region seeding', () => {
  const cfg = {
    _page: {
      id: '_page',
      schema: () => ({
        properties: {
          items: { widget: 'blocks_layout', allowedBlocks: ['slate'], defaultBlockType: 'slate' },
          footer: { widget: 'blocks_layout', title: 'Footer', allowedBlocks: ['slate'], defaultBlockType: 'slate' },
        },
      }),
    },
    slate: { id: 'slate' },
  };

  test('getAllContainerFields returns one entry per region', () => {
    const form = {
      '@type': 'Document',
      blocks: { a: { '@type': 'slate' } },
      blocks_layout: { items: ['a'], footer: [] },
    };
    const map = buildBlockPathMap(form, cfg, intl);
    const fields = getAllContainerFields(PAGE, map, form, cfg, intl);
    const regions = fields.filter((f) => !f.isObjectList).map((f) => f.region);
    expect(regions).toContain('items');
    expect(regions).toContain('footer');
  });

  test('seeds an empty block into an empty declared region, leaving siblings', () => {
    const form = {
      '@type': 'Document',
      blocks: { a: { '@type': 'slate' } },
      blocks_layout: { items: ['a'], footer: [] },
    };
    const map = buildBlockPathMap(form, cfg, intl);
    let n = 0;
    const uuid = () => `seed-${++n}`;
    const result = ensureEmptyBlockIfEmpty(form, { parentId: PAGE }, map, uuid, cfg, { intl });
    expect(result.blocks_layout.items).toEqual(['a']); // untouched
    expect(result.blocks_layout.footer.length).toBe(1); // seeded
    expect(result.blocks[result.blocks_layout.footer[0]]).toBeTruthy();
  });
});

describe('ensureEmptyBlockIfEmpty — auto-content joins the template instance', () => {
  // A container that IS a template instance, with an empty items region. When the
  // editor seeds its default child (e.g. a new column's auto-slate), that child
  // must join the SAME instance so it stays editable in template edit mode — the
  // flat readonly check is `isBlockReadonly = block.templateInstanceId === templateEditMode`.
  // If it isn't stamped, the seeded slate is read-only → no add-after "+" → you
  // can't add anything into a freshly-added column.
  const cfgTpl = {
    _page: { id: '_page', schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }) },
    column: { id: 'column', schema: () => ({ properties: { items: { widget: 'blocks_layout', allowedBlocks: ['slate'], defaultBlockType: 'slate' } } }) },
    slate: { id: 'slate' },
  };

  test('a default block seeded into an empty template-instance container carries templateInstanceId', () => {
    const form = {
      '@type': 'Document',
      blocks: {
        col1: {
          '@type': 'column',
          templateId: 'resolveuid/x',
          templateInstanceId: 'inst-1',
          slotId: 'col1',
          blocks: {},
          blocks_layout: { items: [] },
        },
      },
      blocks_layout: { items: ['col1'] },
    };
    const map = buildBlockPathMap(form, cfgTpl, intl);
    let n = 0;
    const uuid = () => `seed-${++n}`;
    const result = ensureEmptyBlockIfEmpty(form, { parentId: 'col1' }, map, uuid, cfgTpl, { intl });

    const col = result.blocks.col1;
    const childId = col.blocks_layout.items[0];
    const child = col.blocks[childId];
    expect(child, 'empty template-instance column should be seeded with a default child').toBeTruthy();
    // Reproduces the bug: the seeded child currently has NO templateInstanceId, so
    // it renders read-only in template edit mode (no add-after "+").
    expect(child.templateInstanceId).toBe('inst-1');
  });
});

describe('insertBlockInContainer — add-after joins the template instance', () => {
  // Adding a block after a template-instance sibling must stamp it into the same instance
  // (centralized via inheritTemplateMembership) — else the added block renders read-only
  // in template edit mode, the same failure as the seeded auto-content.
  const cfg = {
    _page: { id: '_page', schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }) },
    column: { id: 'column', schema: () => ({ properties: { items: { widget: 'blocks_layout', allowedBlocks: ['slate'] } } }) },
    slate: { id: 'slate' },
  };

  test('a block added after a template-instance sibling carries templateInstanceId', () => {
    const form = {
      '@type': 'Document',
      blocks: {
        col1: {
          '@type': 'column',
          templateId: 'resolveuid/x',
          templateInstanceId: 'inst-1',
          slotId: 'col1',
          blocks: { a: { '@type': 'slate', templateId: 'resolveuid/x', templateInstanceId: 'inst-1', slotId: 'a' } },
          blocks_layout: { items: ['a'] },
        },
      },
      blocks_layout: { items: ['col1'] },
    };
    const map = buildBlockPathMap(form, cfg, intl);
    const cc = getContainerFieldConfig('a', map, form, cfg, intl);
    const result = insertBlockInContainer(form, map, 'a', 'b', { '@type': 'slate' }, cc, 'after');

    const col = result.blocks.col1;
    expect(col.blocks_layout.items).toEqual(['a', 'b']);
    expect(col.blocks.b.templateInstanceId).toBe('inst-1'); // added block joins the instance
  });
});

describe('listContainerChildren — storage-agnostic read', () => {
  test('reads a blocks_layout region from the shared blocks dict', () => {
    const form = makeForm();
    const children = listContainerChildren(form, {
      region: 'footer',
    });
    expect(children).toEqual([
      { id: 'f1', type: 'slate', data: form.blocks.f1 },
      { id: 'f2', type: 'slate', data: form.blocks.f2 },
    ]);
  });

  test('defaults to the items region', () => {
    const form = makeForm();
    expect(
      listContainerChildren(form, { region: 'items' }).map((c) => c.id),
    ).toEqual(['a', 'b']);
  });

  test('reads an object_list container as inline items', () => {
    const parent = {
      slides: [
        { '@id': 's1', '@type': 'slide' },
        { '@id': 's2', '@type': 'slide' },
      ],
    };
    const children = listContainerChildren(parent, {
      region: 'slides',
      isObjectList: true,
      idField: '@id',
      typeField: '@type',
    });
    expect(children).toEqual([
      { id: 's1', type: 'slide', data: parent.slides[0] },
      { id: 's2', type: 'slide', data: parent.slides[1] },
    ]);
  });
});

describe('convertContainerBlock — region preservation', () => {
  const cfg = {
    _page: {
      id: '_page',
      schema: () => ({ properties: { items: { widget: 'blocks_layout' } } }),
    },
    slate: { id: 'slate' },
    colsA: {
      id: 'colsA',
      blockSchema: {
        properties: { items: { widget: 'blocks_layout' }, footer: { widget: 'blocks_layout' } },
      },
    },
    colsB: {
      id: 'colsB',
      blockSchema: { properties: { items: { widget: 'blocks_layout' } } },
    },
  };

  test('carries every region when changing a container block @type', () => {
    const form = {
      '@type': 'Document',
      blocks: {
        'cols-1': {
          '@type': 'colsA',
          blocks: { a: { '@type': 'slate' }, f: { '@type': 'slate' } },
          blocks_layout: { items: ['a'], footer: ['f'] },
        },
      },
      blocks_layout: { items: ['cols-1'] },
    };
    const map = buildBlockPathMap(form, cfg, intl);
    const result = convertContainerBlock(form, map, 'cols-1', 'colsB', cfg, intl);
    const converted = result.blocks['cols-1'];
    expect(converted['@type']).toBe('colsB');
    expect(converted.blocks_layout.items).toEqual(['a']);
    expect(converted.blocks_layout.footer).toEqual(['f']); // preserved
  });
});
