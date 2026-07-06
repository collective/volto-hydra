import { describe, test, expect } from 'vitest';
import {
  buildBlockPathMap,
  wrapBlocksInContainer,
  unwrapContainer,
  convertContainerBlock,
} from './blockPath';

/**
 * wrap/unwrap where the NEW/target container stores its children in an object_list field
 * (like a real slider's `slides`) rather than blocks_layout. The parent is an ordinary
 * blocks_layout region (the page). This is the reachable dimension: wrap page images into a
 * slider, unwrap the slider back. Both go through the funnel via a child-field descriptor —
 * no branch on storage in wrap/unwrap.
 */
const blocksConfig = {
  // A container whose CHILD field is an object_list (mirrors the real slider's `slides`).
  flexSlider: {
    id: 'flexSlider',
    blockSchema: {
      properties: {
        slides: {
          widget: 'object_list',
          typeField: '@type',
          idField: '@id',
          allowedBlocks: ['image', 'slate'],
        },
      },
    },
  },
  // A container whose child field is blocks_layout (same accepted types as flexSlider).
  sectionLike: {
    id: 'sectionLike',
    blockSchema: {
      properties: {
        items: { widget: 'blocks_layout', allowedBlocks: ['image', 'slate'] },
      },
    },
  },
  // A MIXED container: one blocks_layout region (`items`) AND one object_list region (`extra`).
  twoRegion: {
    id: 'twoRegion',
    blockSchema: {
      properties: {
        items: { widget: 'blocks_layout', allowedBlocks: ['image', 'slate'] },
        extra: {
          widget: 'object_list',
          typeField: '@type',
          idField: '@id',
          allowedBlocks: ['image', 'slate'],
        },
      },
    },
  },
  image: { id: 'image', blockSchema: { properties: { url: {} } } },
  slate: { id: 'slate', blockSchema: { properties: { value: {} } } },
};

describe('wrap/unwrap — container with an object_list CHILD field (e.g. a slider)', () => {
  let c = 0;
  const uuidGenerator = () => `u-${++c}`;
  const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

  const makeFormData = () => ({
    blocks: {
      'img-1': { '@type': 'image', url: 'a.png' },
      'img-2': { '@type': 'image', url: 'b.png' },
      'txt-1': { '@type': 'slate', value: 'C' },
    },
    blocks_layout: { items: ['img-1', 'img-2', 'txt-1'] },
  });

  test("wrap: page blocks are moved into the container's object_list child field", () => {
    const formData = makeFormData();
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);

    const { formData: out, newContainerId } = wrapBlocksInContainer(
      formData,
      pathMap,
      ['img-1', 'img-2'],
      'flexSlider',
      blocksConfig,
      intl,
      { uuidGenerator },
    );

    // page: the container replaces img-1,img-2 at position 0; txt-1 remains.
    expect(out.blocks_layout.items).toEqual([newContainerId, 'txt-1']);
    const container = out.blocks[newContainerId];
    expect(container['@type']).toBe('flexSlider');
    // children live in the object_list `slides` (array of block objects), NOT blocks_layout.
    expect(Array.isArray(container.slides)).toBe(true);
    expect(container.slides.map((s) => s['@id'])).toEqual(['img-1', 'img-2']);
    expect(container.slides[0]['@type']).toBe('image');
    expect(container.slides[0].url).toBe('a.png');
    expect(container.blocks_layout).toBeUndefined();
    // the wrapped blocks are removed from the page's shared dict
    expect(out.blocks['img-1']).toBeUndefined();
  });

  test('unwrap: an object_list-child container promotes its children back to the page (round-trip)', () => {
    const formData = makeFormData();
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);
    const { formData: wrapped, newContainerId } = wrapBlocksInContainer(
      formData,
      pathMap,
      ['img-1', 'img-2'],
      'flexSlider',
      blocksConfig,
      intl,
      { uuidGenerator },
    );

    const wrappedMap = buildBlockPathMap(wrapped, blocksConfig, intl);
    const { formData: out, promotedIds } = unwrapContainer(
      wrapped,
      wrappedMap,
      newContainerId,
      blocksConfig,
      intl,
    );

    // container gone; img-1,img-2 back on the page at its position, before txt-1.
    expect(out.blocks_layout.items).toEqual(['img-1', 'img-2', 'txt-1']);
    expect(promotedIds).toEqual(['img-1', 'img-2']);
    expect(out.blocks['img-1']['@type']).toBe('image');
    expect(out.blocks['img-1'].url).toBe('a.png');
    expect(out.blocks[newContainerId]).toBeUndefined();
  });

  test('unwrap a MIXED/multi-region container promotes children from EVERY region', () => {
    // twoRegion has a child in its blocks_layout `items` AND one in its object_list `extra`.
    const formData = {
      blocks: {
        'tr-1': {
          '@type': 'twoRegion',
          blocks: { a: { '@type': 'image', url: 'a.png' } },
          blocks_layout: { items: ['a'] },
          extra: [{ '@id': 'b', '@type': 'slate', value: 'B' }],
        },
        sib: { '@type': 'slate', value: 'S' },
      },
      blocks_layout: { items: ['tr-1', 'sib'] },
    };
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);
    const { formData: out, promotedIds } = unwrapContainer(
      formData,
      pathMap,
      'tr-1',
      blocksConfig,
      intl,
    );

    // BOTH region children promoted to the page at tr-1's position, before sib.
    expect(out.blocks_layout.items).toEqual(['a', 'b', 'sib']);
    expect([...promotedIds].sort()).toEqual(['a', 'b']);
    expect(out.blocks['a']['@type']).toBe('image');
    expect(out.blocks['b']['@type']).toBe('slate'); // object_list child promoted too
    expect(out.blocks['tr-1']).toBeUndefined();
  });
});

describe('convert — region-aware across object_list-child and blocks_layout-child containers', () => {
  let c = 0;
  const uuidGenerator = () => `u-${++c}`;
  const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

  test('blocks_layout-child container → object_list-child container carries children into slides', () => {
    const formData = {
      blocks: {
        'sec-1': {
          '@type': 'sectionLike',
          blocks: {
            'img-1': { '@type': 'image', url: 'a.png' },
            'img-2': { '@type': 'image', url: 'b.png' },
          },
          blocks_layout: { items: ['img-1', 'img-2'] },
        },
      },
      blocks_layout: { items: ['sec-1'] },
    };
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);
    const out = convertContainerBlock(
      formData,
      pathMap,
      'sec-1',
      'flexSlider',
      blocksConfig,
      intl,
    );
    const conv = out.blocks['sec-1'];
    expect(conv['@type']).toBe('flexSlider');
    expect(conv.slides.map((s) => s['@id'])).toEqual(['img-1', 'img-2']);
    expect(conv.slides[0].url).toBe('a.png');
    expect(conv.blocks).toBeUndefined();
    expect(conv.blocks_layout).toBeUndefined();
  });

  test('object_list-child container → blocks_layout-child container carries slides into blocks_layout', () => {
    const formData = {
      blocks: {
        'sl-1': {
          '@type': 'flexSlider',
          slides: [
            { '@id': 'img-1', '@type': 'image', url: 'a.png' },
            { '@id': 'img-2', '@type': 'image', url: 'b.png' },
          ],
        },
      },
      blocks_layout: { items: ['sl-1'] },
    };
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);
    const out = convertContainerBlock(
      formData,
      pathMap,
      'sl-1',
      'sectionLike',
      blocksConfig,
      intl,
    );
    const conv = out.blocks['sl-1'];
    expect(conv['@type']).toBe('sectionLike');
    expect(conv.blocks_layout.items).toEqual(['img-1', 'img-2']);
    expect(conv.blocks['img-1']['@type']).toBe('image');
    expect(conv.blocks['img-1'].url).toBe('a.png');
    expect(conv.slides).toBeUndefined();
  });
});
