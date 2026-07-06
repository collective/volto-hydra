import { describe, test, expect } from 'vitest';
import { buildBlockPathMap, wrapBlocksInContainer, unwrapContainer } from './blockPath';

/**
 * wrap/unwrap for a TYPED object_list parent. A typed object_list (allowedBlocks + typeField)
 * is a general child region like blocks_layout — just stored as an inline array instead of
 * ids-in-a-dict. When its allowedBlocks includes a container type, wrapping its items into
 * that container (and unwrapping back) is valid; the functions used to throw only because they
 * were written blocks_layout-specific. Both directions here route through the funnel.
 */
const blocksConfig = {
  // Typed object_list whose items may be slates OR a section container.
  flexList: {
    id: 'flexList',
    blockSchema: {
      properties: {
        entries: {
          widget: 'object_list',
          typeField: '@type',
          idField: '@id',
          allowedBlocks: ['slate', 'section'],
        },
      },
    },
  },
  section: {
    id: 'section',
    blockSchema: { properties: { blocks: { widget: 'blocks_layout', allowedBlocks: ['slate'] } } },
  },
  slate: { id: 'slate', blockSchema: { properties: { value: {} } } },
};

describe('wrap/unwrap — typed object_list parent (funnel-based)', () => {
  let c = 0;
  const uuidGenerator = () => `u-${++c}`;
  const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

  const makeFormData = () => ({
    blocks: {
      'fl-1': {
        '@type': 'flexList',
        entries: [
          { '@id': 's1', '@type': 'slate', value: 'A' },
          { '@id': 's2', '@type': 'slate', value: 'B' },
          { '@id': 's3', '@type': 'slate', value: 'C' },
        ],
      },
    },
    blocks_layout: { items: ['fl-1'] },
  });

  test('wrap: two object_list items become blocks_layout children of a new container item', () => {
    const formData = makeFormData();
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);

    const { formData: out, newContainerId } = wrapBlocksInContainer(
      formData, pathMap, ['s1', 's2'], 'section', blocksConfig, intl, { uuidGenerator },
    );

    const entries = out.blocks['fl-1'].entries;
    // s1+s2 wrapped into ONE section item at s1's position; s3 remains after it.
    expect(entries.map((e) => e['@id'])).toEqual([newContainerId, 's3']);
    const section = entries[0];
    expect(section['@type']).toBe('section');
    expect(Object.keys(section.blocks)).toEqual(['s1', 's2']);
    expect(section.blocks_layout.items).toEqual(['s1', 's2']);
    // child data preserved
    expect(section.blocks.s1.value).toBe('A');
  });

  test('unwrap: a container item promotes its children back into the object_list (round-trip)', () => {
    const formData = makeFormData();
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);
    const { formData: wrapped, newContainerId } = wrapBlocksInContainer(
      formData, pathMap, ['s1', 's2'], 'section', blocksConfig, intl, { uuidGenerator },
    );

    const wrappedMap = buildBlockPathMap(wrapped, blocksConfig, intl);
    const { formData: out, promotedIds } = unwrapContainer(
      wrapped, wrappedMap, newContainerId, blocksConfig, intl,
    );

    const entries = out.blocks['fl-1'].entries;
    // Section gone; s1,s2 promoted back to the flexList at its position, before s3 — original order.
    expect(entries.map((e) => e['@id'])).toEqual(['s1', 's2', 's3']);
    expect(promotedIds).toEqual(['s1', 's2']);
    const s1 = entries.find((e) => e['@id'] === 's1');
    expect(s1['@type']).toBe('slate'); // back to an object_list item
    expect(s1.value).toBe('A'); // data preserved through the round-trip
  });

  test('wrap rejects a non-typed (single-schema) object_list — no slot for a container', () => {
    // A non-typed object_list: `schema` set, no typeField/allowedBlocks — one fixed item shape.
    const nonTyped = {
      tabList: {
        id: 'tabList',
        blockSchema: {
          properties: {
            tabs: { widget: 'object_list', idField: '@id', schema: { properties: { label: {} } } },
          },
        },
      },
    };
    const formData = {
      blocks: { 'tl-1': { '@type': 'tabList', tabs: [{ '@id': 't1', label: 'A' }, { '@id': 't2', label: 'B' }] } },
      blocks_layout: { items: ['tl-1'] },
    };
    const pathMap = buildBlockPathMap(formData, nonTyped, intl);
    expect(() =>
      wrapBlocksInContainer(formData, pathMap, ['t1', 't2'], 'section', nonTyped, intl, { uuidGenerator }),
    ).toThrow(/single-schema/);
  });
});
