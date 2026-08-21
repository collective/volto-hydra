import { describe, it, expect } from 'vitest';
import { validateContent, validateTree } from './content-validator.mjs';

describe('validateContent', () => {
  const ok = {
    '@id': '/p', '@type': 'Document',
    blocks: { a: { '@type': 'slate' }, b: { '@type': 'image' } },
    blocks_layout: { items: ['a', 'b'] },
  };

  it('passes a well-formed page', () => {
    expect(validateContent(ok)).toEqual([]);
  });

  it('flags a blocks_layout reference with no matching block', () => {
    const bad = { ...ok, blocks_layout: { items: ['a', 'ghost'] } };
    expect(validateContent(bad)).toEqual([
      '/p: blocks_layout.items references missing block ghost',
    ]);
  });

  it('checks nested container layouts', () => {
    const nested = {
      '@id': '/n',
      blocks: {
        grid: {
          '@type': 'gridBlock',
          blocks: { c1: { '@type': 'teaser' } },
          blocks_layout: { blocks: ['c1', 'missing'] },
        },
      },
      blocks_layout: { items: ['grid'] },
    };
    expect(validateContent(nested)).toEqual([
      '/n: block grid blocks_layout.blocks references missing block missing',
    ]);
  });

  it('with a schema, flags an unknown block type', () => {
    const schema = { slate: {}, image: {}, Document: {} };
    const bad = { ...ok, blocks: { a: { '@type': 'slate' }, b: { '@type': 'widgetzzz' } } };
    expect(validateContent(bad, { schema })).toEqual([
      '/p: block b unknown type "widgetzzz" (not in schema)',
    ]);
  });

  it('with a schema, passes when every type is known', () => {
    expect(validateContent(ok, { schema: { slate: {}, image: {} } })).toEqual([]);
  });

  it('flags a slate value with more than one top-level node', () => {
    // A grid/table cell that packed a heading + paragraph into one slate: the
    // editor never makes this, and it has no bare-markdown spelling (a paragraph
    // boundary is a block boundary). lib/slate-normalize collapses it to one node.
    const bad = {
      ...ok,
      blocks: {
        a: {
          '@type': 'slate',
          value: [
            { type: 'p', children: [{ type: 'strong', children: [{ text: 'Compliance' }] }] },
            { type: 'p', children: [{ text: 'Accessibility and the standards you are held to.' }] },
          ],
        },
      },
      blocks_layout: { items: ['a'] },
    };
    expect(validateContent(bad)).toEqual([
      '/p: block a slate value has 2 top-level nodes (expected 1; run normalizeSlateValue)',
    ]);
  });

  it('passes a single-node slate value', () => {
    const good = {
      ...ok,
      blocks: { a: { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'One paragraph.' }] }] } },
      blocks_layout: { items: ['a'] },
    };
    expect(validateContent(good)).toEqual([]);
  });
});

describe('validateTree — cross-tree references', () => {
  it('flags an href pointing outside the tree', () => {
    const items = [
      { '@id': '/a', blocks: { t: { '@type': 'teaser', href: [{ '@id': '/gone' }] } }, blocks_layout: { items: ['t'] } },
      { '@id': '/b', blocks: {}, blocks_layout: { items: [] } },
    ];
    expect(validateTree(items)).toEqual(['/a: block t href: path not in content: /gone']);
  });

  it('accepts an href to a page that exists in the tree', () => {
    const items = [
      { '@id': '/a', blocks: { t: { '@type': 'teaser', href: [{ '@id': '/b' }] } }, blocks_layout: { items: ['t'] } },
      { '@id': '/b', blocks: {}, blocks_layout: { items: [] } },
    ];
    expect(validateTree(items)).toEqual([]);
  });
});
