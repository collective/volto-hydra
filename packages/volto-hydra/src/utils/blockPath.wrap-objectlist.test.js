import { describe, test, expect } from 'vitest';
import { buildBlockPathMap, wrapBlocksInContainer, unwrapContainer } from './blockPath';

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
        slides: { widget: 'object_list', typeField: '@type', idField: '@id', allowedBlocks: ['image', 'slate'] },
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

  test('wrap: page blocks are moved into the container\'s object_list child field', () => {
    const formData = makeFormData();
    const pathMap = buildBlockPathMap(formData, blocksConfig, intl);

    const { formData: out, newContainerId } = wrapBlocksInContainer(
      formData, pathMap, ['img-1', 'img-2'], 'flexSlider', blocksConfig, intl, { uuidGenerator },
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
      formData, pathMap, ['img-1', 'img-2'], 'flexSlider', blocksConfig, intl, { uuidGenerator },
    );

    const wrappedMap = buildBlockPathMap(wrapped, blocksConfig, intl);
    const { formData: out, promotedIds } = unwrapContainer(
      wrapped, wrappedMap, newContainerId, blocksConfig, intl,
    );

    // container gone; img-1,img-2 back on the page at its position, before txt-1.
    expect(out.blocks_layout.items).toEqual(['img-1', 'img-2', 'txt-1']);
    expect(promotedIds).toEqual(['img-1', 'img-2']);
    expect(out.blocks['img-1']['@type']).toBe('image');
    expect(out.blocks['img-1'].url).toBe('a.png');
    expect(out.blocks[newContainerId]).toBeUndefined();
  });
});
