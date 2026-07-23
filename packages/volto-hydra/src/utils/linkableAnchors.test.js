import { describe, it, expect } from 'vitest';
import { collectAnchorsFromContent } from './linkableAnchors';

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
