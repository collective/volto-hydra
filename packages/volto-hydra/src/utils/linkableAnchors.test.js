import { describe, it, expect } from 'vitest';
import {
  collectAnchorsFromContent,
  collectAnchorsFromStore,
  seedAnchorsFromContent,
  mergeAnchorsIntoContent,
} from './linkableAnchors';

const blocksConfig = {}; // page-level blocks_layout only; no custom container schemas

describe('collectAnchorsFromContent', () => {
  it('returns anchors in document (layout) order, not dict order', () => {
    const content = {
      blocks: {
        // intentionally NOT in layout order in the dict:
        b2: { '@type': 'slate', _linkableAnchors: [{ id: 'two', name: 'Two' }] },
        b1: { '@type': 'slate', _linkableAnchors: [{ id: 'one', name: 'One' }] },
        b3: { '@type': 'slate' }, // no anchors
      },
      blocks_layout: { items: ['b1', 'b2', 'b3'] },
    };
    expect(collectAnchorsFromContent(content, blocksConfig)).toEqual([
      { id: 'one', name: 'One', blockUid: 'b1' },
      { id: 'two', name: 'Two', blockUid: 'b2' },
    ]);
  });

  it('flattens multiple anchors from one block in their stored order', () => {
    const content = {
      blocks: {
        b1: {
          '@type': 'slate',
          _linkableAnchors: [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
          ],
        },
      },
      blocks_layout: { items: ['b1'] },
    };
    expect(collectAnchorsFromContent(content, blocksConfig)).toEqual([
      { id: 'a', name: 'A', blockUid: 'b1' },
      { id: 'b', name: 'B', blockUid: 'b1' },
    ]);
  });

  it('returns an empty array when no block has anchors', () => {
    const content = {
      blocks: { b1: { '@type': 'slate' } },
      blocks_layout: { items: ['b1'] },
    };
    expect(collectAnchorsFromContent(content, blocksConfig)).toEqual([]);
  });
});

describe('seedAnchorsFromContent', () => {
  it('reads block._linkableAnchors into a { uid: [...] } map', () => {
    const content = {
      blocks: {
        b1: { '@type': 'slate', _linkableAnchors: [{ id: 'one', name: 'One' }] },
        b2: { '@type': 'slate' },
      },
      blocks_layout: { items: ['b1', 'b2'] },
    };
    expect(seedAnchorsFromContent(content, blocksConfig)).toEqual({
      b1: [{ id: 'one', name: 'One' }],
    });
  });
});

describe('collectAnchorsFromStore', () => {
  it('orders anchors from the store map by document order, ignoring block._linkableAnchors', () => {
    const content = {
      blocks: {
        // blocks carry NO _linkableAnchors during editing
        b2: { '@type': 'slate' },
        b1: { '@type': 'slate' },
      },
      blocks_layout: { items: ['b1', 'b2'] },
    };
    const store = {
      b2: [{ id: 'two', name: 'Two' }],
      b1: [{ id: 'one', name: 'One' }],
    };
    expect(collectAnchorsFromStore(content, store, blocksConfig)).toEqual([
      { id: 'one', name: 'One', blockUid: 'b1' },
      { id: 'two', name: 'Two', blockUid: 'b2' },
    ]);
  });
});

describe('mergeAnchorsIntoContent', () => {
  it('writes the store map into blocks and clears blocks that lost anchors', () => {
    const content = {
      blocks: {
        b1: { '@type': 'slate' }, // gains an anchor
        b2: { '@type': 'slate', _linkableAnchors: [{ id: 'stale', name: 'Stale' }] }, // loses it
      },
      blocks_layout: { items: ['b1', 'b2'] },
    };
    const store = { b1: [{ id: 'one', name: 'One' }] };
    const out = mergeAnchorsIntoContent(content, store, blocksConfig);
    expect(out.blocks.b1._linkableAnchors).toEqual([{ id: 'one', name: 'One' }]);
    expect(out.blocks.b2._linkableAnchors).toBeUndefined();
  });
});
