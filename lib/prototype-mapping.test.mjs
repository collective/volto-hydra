/**
 * Prototype-tag mapping (design: docs/superpowers/specs/2026-08-14-blockmd-unified-mapping-design.md).
 *
 * A prototype is a `<block>` tag read declaratively. Its `${type/part}` refs
 * are the pattern: they both locate the markdown nodes an instance spans and
 * map them to fields. These tests build the mechanism up from the simplest
 * case (one node -> one block) toward the accordion (scoped prototypes,
 * refs-as-pattern, implicit remainder region).
 */
import { describe, it, expect } from 'vitest';
import { parsePrototypes, matchBlocks, keyBlocks, emitBlocks, emitPage, decodePage } from './prototype-mapping.mjs';

describe('prototype mapping', () => {
  it('maps a paragraph to a slate block via a single-node prototype', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    const blocks = matchBlocks(protos, 'Hello world.');
    expect(blocks).toEqual([
      { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Hello world.' }] }] },
    ]);
  });

  it('maps a paragraph + image to one image block via a two-node prototype', () => {
    const protos = parsePrototypes(
      '<block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" />',
    );
    const blocks = matchBlocks(protos, 'A caption.\n\n![alt text](/img.png)');
    expect(blocks).toEqual([
      { '@type': 'image', description: 'A caption.', url: '/img.png', alt: 'alt text' },
    ]);
  });

  it('prefers the longer pattern, falling back to the shorter (leftmost-longest)', () => {
    const protos = parsePrototypes([
      '<block type="slate" value="${p/slate}" />',
      '<block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" />',
    ].join('\n'));
    // A lone paragraph -> slate (the 2-node image pattern can't match two
    // paragraphs); a paragraph + image -> image.
    const blocks = matchBlocks(protos, 'Just prose.\n\nA caption.\n\n![alt](/i.png)');
    expect(blocks).toEqual([
      { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Just prose.' }] }] },
      { '@type': 'image', description: 'A caption.', url: '/i.png', alt: 'alt' },
    ]);
  });

  it('scopes a panel prototype in a region and splits the accordion at each h2', () => {
    // The accordion prototype nests a region whose `panel` item is delimited by
    // h2; the panel's content is the implicit remainder. (uid-keying deferred:
    // panel content is asserted as an ordered `blocks` list, not a dict.)
    const protos = parsePrototypes([
      '<block type="slate" value="${p/slate}" />',
      '<block type="accordion" right_arrows=true>',
      '  <region name="panels" widget="object_list">',
      '    <block type="panel" title="${h2/text}" />',
      '  </region>',
      '</block>',
    ].join('\n'));
    const md = [
      '<block type="accordion">', '',
      '## First', '', 'First body.', '',
      '## Second', '', 'Second body.', '',
      '</block>',
    ].join('\n');
    const blocks = matchBlocks(protos, md);
    expect(blocks).toEqual([{
      '@type': 'accordion',
      right_arrows: true, // literal-attr coercion (string -> boolean) deferred
      panels: [
        { title: 'First', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'First body.' }] }] }] },
        { title: 'Second', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Second body.' }] }] }] },
      ],
    }]);
  });
});

describe('uid keying', () => {
  it('keys a flat block list into a blocks dict + blocks_layout from assignments', () => {
    const blocks = [
      { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'A' }] }] },
      { '@type': 'separator', styles: { align: 'left' } },
    ];
    const assignments = [
      { uid: 'p-1', type: 'slate' },
      { uid: 'sep-1', type: 'separator' },
    ];
    expect(keyBlocks(blocks, assignments, accProto)).toEqual({
      blocks: {
        'p-1': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'A' }] }] },
        'sep-1': { '@type': 'separator', styles: { align: 'left' } },
      },
      blocks_layout: { items: ['p-1', 'sep-1'] },
    });
  });

  it('fails loudly when an assignment type does not anchor the block type', () => {
    const blocks = [{ '@type': 'slate', value: [] }];
    const assignments = [{ uid: 'x-1', type: 'image' }];
    expect(() => keyBlocks(blocks, assignments)).toThrow(/anchor|type/i);
  });

  const accProto = parsePrototypes([
    '<block type="accordion">',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h2/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('keys a nested accordion depth-first: block uid, panel @id, then child uids', () => {
    const blocks = [{
      '@type': 'accordion', right_arrows: true,
      panels: [
        { title: 'First', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'A' }] }] }] },
        { title: 'Second', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'B' }] }] }] },
      ],
    }];
    const assignments = [
      { uid: 'acc-1', type: 'accordion' },
      { id: 'panel-1' },
      { uid: 's-1', type: 'slate' },
      { id: 'panel-2' },
      { uid: 's-2', type: 'slate' },
    ];
    expect(keyBlocks(blocks, assignments, accProto)).toEqual({
      blocks: {
        'acc-1': {
          '@type': 'accordion', right_arrows: true,
          panels: [
            { '@id': 'panel-1', title: 'First', blocks: { 's-1': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'A' }] }] } }, blocks_layout: { items: ['s-1'] } },
            { '@id': 'panel-2', title: 'Second', blocks: { 's-2': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'B' }] }] } }, blocks_layout: { items: ['s-2'] } },
          ],
        },
      },
      blocks_layout: { items: ['acc-1'] },
    });
  });

  it('decodes accordion markdown end-to-end: matchBlocks then keyBlocks', () => {
    const protos = parsePrototypes([
      '<block type="slate" value="${p/slate}" />',
      '<block type="accordion" right_arrows=true>',
      '  <region name="panels" widget="object_list">',
      '    <block type="panel" title="${h2/text}" />',
      '  </region>',
      '</block>',
    ].join('\n'));
    const md = [
      '<block type="accordion">', '',
      '## First', '', 'First body.', '',
      '## Second', '', 'Second body.', '',
      '</block>',
    ].join('\n');
    const assignments = [
      { uid: 'acc-1', type: 'accordion' },
      { id: 'panel-1' }, { uid: 's-1', type: 'slate' },
      { id: 'panel-2' }, { uid: 's-2', type: 'slate' },
    ];
    const keyed = keyBlocks(matchBlocks(protos, md), assignments, protos);
    expect(keyed.blocks['acc-1'].panels.map((p) => [p['@id'], p.title, p.blocks_layout.items])).toEqual([
      ['panel-1', 'First', ['s-1']],
      ['panel-2', 'Second', ['s-2']],
    ]);
    expect(keyed.blocks['acc-1'].panels[0].blocks['s-1'].value)
      .toEqual([{ type: 'p', children: [{ text: 'First body.' }] }]);
    expect(keyed.blocks_layout).toEqual({ items: ['acc-1'] });
  });
});

describe('emit', () => {
  it('emits a slate block as bare paragraph markdown', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    const block = { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Hello world.' }] }] };
    expect(emitBlocks(protos, [block])).toBe('Hello world.');
  });
});

describe('emit multi-node', () => {
  it('emits an image-with-caption block as paragraph + image markdown', () => {
    const protos = parsePrototypes(
      '<block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" />',
    );
    const block = { '@type': 'image', description: 'A caption.', url: '/img.png', alt: 'alt text' };
    expect(emitBlocks(protos, [block])).toBe('A caption.\n\n![alt text](/img.png)');
  });
});

describe('verify-on-emit', () => {
  it('falls back to a tag when the bare form would over-merge with a neighbour', () => {
    const protos = parsePrototypes([
      '<block type="slate" value="${p/slate}" />',
      '<block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" />',
      '<block type="image" url="${img/src}" alt="${img/alt}" />',
    ].join('\n'));
    // Bare, "Prose." + an image would re-decode as ONE image-with-caption.
    // Verify-on-emit must break that up so it round-trips to two blocks.
    const blocks = [
      { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Prose.' }] }] },
      { '@type': 'image', url: '/i.png', alt: 'a' },
    ];
    const md = emitBlocks(protos, blocks);
    expect(matchBlocks(protos, md)).toEqual(blocks);
  });
});

describe('emit container', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p/slate}" />',
    '<block type="accordion" right_arrows=true>',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h2/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('emits an accordion as a block tag with h2-delimited panels, round-tripping', () => {
    const block = {
      '@type': 'accordion', right_arrows: true,
      panels: [
        { title: 'First', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'First body.' }] }] }] },
        { title: 'Second', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Second body.' }] }] }] },
      ],
    };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('## First');
    expect(md).toContain('<block type="accordion">');
    expect(matchBlocks(protos, md)).toEqual([block]);
  });
});

describe('emitPage / full page round-trip', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p/slate}" />',
    '<block type="accordion" right_arrows=true>',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h2/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  const keyed = {
    blocks: {
      'acc-1': {
        '@type': 'accordion', right_arrows: true,
        panels: [
          { '@id': 'panel-1', title: 'First', blocks: { 's-1': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'First body.' }] }] } }, blocks_layout: { items: ['s-1'] } },
          { '@id': 'panel-2', title: 'Second', blocks: { 's-2': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Second body.' }] }] } }, blocks_layout: { items: ['s-2'] } },
        ],
      },
    },
    blocks_layout: { items: ['acc-1'] },
  };

  it('reads uids straight from the keyed shape, depth-first', () => {
    const { assignments } = emitPage(protos, keyed);
    expect(assignments).toEqual([
      { uid: 'acc-1', type: 'accordion' },
      { id: 'panel-1' }, { uid: 's-1', type: 'slate' },
      { id: 'panel-2' }, { uid: 's-2', type: 'slate' },
    ]);
  });

  it('emits (markdown, assignments) that decode back to the identical keyed page', () => {
    const { markdown, assignments } = emitPage(protos, keyed);
    expect(keyBlocks(matchBlocks(protos, markdown), assignments, protos)).toEqual(keyed);
  });
});

describe('separator (zero-capture node directive)', () => {
  it('decodes --- to a separator and emits it back', () => {
    const protos = parsePrototypes('<block type="separator" _="${hr}" />');
    expect(matchBlocks(protos, '---')).toEqual([{ '@type': 'separator' }]);
    expect(emitBlocks(protos, [{ '@type': 'separator' }])).toBe('---');
  });
});

describe('decodePage (full page: frontmatter + prototypes + assignments + body -> JSON)', () => {
  it('reconstructs block JSON from a markdown page', () => {
    const md = [
      '---',
      '"@type": Document',
      'title: Hi',
      'assignments:',
      '  - { uid: p-1, type: slate }',
      '  - { uid: sep-2, type: separator }',
      'prototypes: |',
      '  <block type="slate" value="${p/slate}" />',
      '  <block type="separator" _="${hr}" />',
      '---',
      '',
      'Hello world.',
      '',
      '---',
      '',
    ].join('\n');
    expect(decodePage(md)).toEqual({
      '@type': 'Document',
      title: 'Hi',
      blocks: {
        'p-1': { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Hello world.' }] }] },
        'sep-2': { '@type': 'separator' },
      },
      blocks_layout: { items: ['p-1', 'sep-2'] },
    });
  });
});

describe('title (match-only h1)', () => {
  it('matches an h1 to a bare title block, storing nothing from it', () => {
    const protos = parsePrototypes('<block type="title" _="${h1}" />');
    expect(matchBlocks(protos, '# Hello')).toEqual([{ '@type': 'title' }]);
  });
});

describe('alternation (slate default over many node kinds)', () => {
  it('a heading decodes to slate via a node set', () => {
    const protos = parsePrototypes('<block type="slate" value="${p|h2|h3/slate}" />');
    expect(matchBlocks(protos, '## A heading'))
      .toEqual([{ '@type': 'slate', value: [{ type: 'h2', children: [{ text: 'A heading' }] }] }]);
  });

  it('still prefers a more specific single-kind prototype over the set', () => {
    const protos = parsePrototypes([
      '<block type="title" _="${h1}" />',
      '<block type="slate" value="${p|h1|h2/slate}" />',
    ].join('\n'));
    // h1 -> title (specific wins), h2 -> slate
    expect(matchBlocks(protos, '# Title\n\n## Sub')).toEqual([
      { '@type': 'title' },
      { '@type': 'slate', value: [{ type: 'h2', children: [{ text: 'Sub' }] }] },
    ]);
  });
});

describe('codeExample (tabs region over pre fences)', () => {
  it('decodes tabs split at h3, each a label + fenced code', () => {
    const protos = parsePrototypes([
      '<block type="codeExample">',
      '  <region name="tabs" widget="object_list">',
      '    <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />',
      '  </region>',
      '</block>',
    ].join('\n'));
    const md = [
      '<block type="codeExample">', '',
      '### Bash', '', '```bash', 'echo hi', '```', '',
      '### JS', '', '```javascript', 'console.log(1)', '```', '',
      '</block>',
    ].join('\n');
    expect(matchBlocks(protos, md)).toEqual([{
      '@type': 'codeExample',
      tabs: [
        { label: 'Bash', language: 'bash', code: 'echo hi' },
        { label: 'JS', language: 'javascript', code: 'console.log(1)' },
      ],
    }]);
  });
});

describe('tier-3 data tag decode', () => {
  it('reconstructs a raw block from a self-closing data tag', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    const md = '<block type="separator" data=\'{"styles":{"align":"left"}}\' />';
    expect(matchBlocks(protos, md)).toEqual([{ '@type': 'separator', styles: { align: 'left' } }]);
  });

  it('keeps string attrs and drops the redundant uid (keying supplies it)', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    const md = '<block type="button" uid="b-1" title="Go" data=\'{"inneralign":"left"}\' />';
    expect(matchBlocks(protos, md)).toEqual([{ '@type': 'button', title: 'Go', inneralign: 'left' }]);
  });
});

describe('codeExample emit + tier-3 emit', () => {
  const cx = parsePrototypes([
    '<block type="codeExample">',
    '  <region name="tabs" widget="object_list">',
    '    <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('emits a codeExample back to wrapped tabs (round-trip)', () => {
    const block = { '@type': 'codeExample', tabs: [
      { label: 'Bash', language: 'bash', code: 'echo hi' },
      { label: 'JS', language: 'javascript', code: 'console.log(1)' },
    ] };
    expect(matchBlocks(cx, emitBlocks(cx, [block]))).toEqual([block]);
  });

  it('emits an un-prototyped type as a tier-3 data tag that decodes back', () => {
    const block = { '@type': 'button', title: 'Go', inneralign: 'left' };
    expect(matchBlocks(cx, emitBlocks(cx, [block]))).toEqual([block]);
  });
});

describe('slateTable (iterate-children regions)', () => {
  const protos = parsePrototypes([
    '<block type="slateTable">',
    '  <region name="table.rows">',
    '    <block type="row">',
    '      <region name="cells">',
    '        <block type="cell" value="${td/slate}" />',
    '      </region>',
    '    </block>',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('decodes table -> rows -> cells, each cell value a slate paragraph', () => {
    const md = ['<block type="slateTable">', '', '| A | B |', '| --- | --- |', '| c | d |', '', '</block>'].join('\n');
    const r = matchBlocks(protos, md);
    expect(r[0]['@type']).toBe('slateTable');
    expect(r[0].table.rows.map((row) => row.cells.map((c) => c.value[0].children[0].text)))
      .toEqual([['A', 'B'], ['c', 'd']]);
  });
});

describe('typed attributes', () => {
  it('decodes HTML booleans (bare=true), unquoted numbers, quoted strings', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    const md = '<block type="toc" celled levels=3 title="Contents" />';
    expect(matchBlocks(protos, md)).toEqual([{ '@type': 'toc', celled: true, levels: 3, title: 'Contents' }]);
  });
});

describe('slateTable round-trip', () => {
  const protos = parsePrototypes([
    '<block type="slateTable">',
    '  <region name="table.rows">',
    '    <block type="row">',
    '      <region name="cells">',
    '        <block type="cell" value="${td/slate}" />',
    '      </region>',
    '    </block>',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('emits a markdown table and decodes back (header derived, keys ignored)', () => {
    const cell = (t, x) => ({ type: t, value: [{ type: 'p', children: [{ text: x }] }] });
    const block = { '@type': 'slateTable', table: { rows: [
      { cells: [cell('header', 'A'), cell('header', 'B')] },
      { cells: [cell('data', 'c'), cell('data', 'd')] },
    ] } };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('| A | B |');
    expect(matchBlocks(protos, md)).toEqual([block]);
  });
});

describe('gridBlock (scoped teaser, blocks_layout, no per-card wrapper)', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p|h2/slate}" />',
    '<block type="image" url="${img/src}" alt="${img/alt}" />',
    '<block type="gridBlock">',
    '  <region name="blocks" widget="blocks_layout">',
    '    <block type="teaser" title="${h2/text}" description="${p/text}" url="${img/src}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('reads each ## card + copy + image as a teaser, and round-trips', () => {
    const md = [
      '<block type="gridBlock">', '',
      '## Card One', '', 'Copy one.', '', '![](/a)', '',
      '## Card Two', '', 'Copy two.', '', '![](/b)', '',
      '</block>',
    ].join('\n');
    const block = matchBlocks(protos, md)[0];
    expect(block['@type']).toBe('gridBlock');
    expect(block.blocks.map((t) => [t['@type'], t.title, t.description, t.url])).toEqual([
      ['teaser', 'Card One', 'Copy one.', '/a'],
      ['teaser', 'Card Two', 'Copy two.', '/b'],
    ]);
    // the scoped teaser is inside the grid; the same markdown outside would be slate/image
    expect(matchBlocks(protos, '## Solo\n\nText.').every((b) => b['@type'] === 'slate')).toBe(true);
  });
});

describe('h* any heading', () => {
  it('matches any heading level for the slate default', () => {
    const protos = parsePrototypes('<block type="slate" value="${p|h*/slate}" />');
    expect(matchBlocks(protos, '#### Deep')).toEqual([{ '@type': 'slate', value: [{ type: 'h4', children: [{ text: 'Deep' }] }] }]);
    expect(matchBlocks(protos, 'Text.')).toEqual([{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Text.' }] }] }]);
  });
});

describe('relative heading depth ${h}', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p|h*/slate}" />',
    '<block type="accordion">',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('resolves to the delimiter level at the current depth', () => {
    const md2 = ['<block type="accordion">', '', '## Two A', '', '### deeper', '', '## Two B', '', 'x', '', '</block>'].join('\n');
    const b2 = matchBlocks(protos, md2, 2)[0]; // depth 2 -> split at h2
    expect(b2.panels.map((p) => p.title)).toEqual(['Two A', 'Two B']);
    expect(b2.panels[0].blocks[0].value[0].type).toBe('h3'); // ### stays as content

    const md3 = ['<block type="accordion">', '', '### Three A', '', '### Three B', '', '</block>'].join('\n');
    const b3 = matchBlocks(protos, md3, 3)[0]; // depth 3 -> same ${h} now splits at h3
    expect(b3.panels.map((p) => p.title)).toEqual(['Three A', 'Three B']);
  });
});

describe('relative depth round-trip', () => {
  it('emits ${h} at the current depth and decodes back', () => {
    const protos = parsePrototypes([
      '<block type="slate" value="${p|h*/slate}" />',
      '<block type="accordion">',
      '  <region name="panels" widget="object_list">',
      '    <block type="panel" title="${h/text}" />',
      '  </region>',
      '</block>',
    ].join('\n'));
    const block = { '@type': 'accordion', panels: [
      { title: 'One', blocks: [{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'body' }] }] }] },
    ] };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('## One'); // depth 2 -> h2
    expect(matchBlocks(protos, md)).toEqual([block]);
  });
});

describe('grid headline as heading (container scalar-ref)', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p|h*/slate}" />',
    '<block type="gridBlock" headline="${h/text}">',
    '  <region name="blocks" widget="blocks_layout">',
    '    <block type="teaser" title="${h/text}" description="${p/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('reads a leading heading as headline, cards one deeper, round-trips', () => {
    const block = { '@type': 'gridBlock', headline: 'The Grid', blocks: [
      { '@type': 'teaser', title: 'Card One', description: 'Copy.' },
      { '@type': 'teaser', title: 'Card Two', description: 'More.' },
    ] };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('## The Grid');
    expect(md).toContain('### Card One');
    expect(matchBlocks(protos, md)).toEqual([block]);
  });

  it('a grid with no headline emits none and round-trips', () => {
    const block = { '@type': 'gridBlock', blocks: [{ '@type': 'teaser', title: 'Only', description: 'x' }] };
    const md = emitBlocks(protos, [block]);
    expect(md).not.toMatch(/^## /m); // no h2 headline line
    expect(matchBlocks(protos, md)).toEqual([block]);
  });
});

describe('local overrides', () => {
  const acc = parsePrototypes([
    '<block type="slate" value="${p|h*/slate}" />',
    '<block type="accordion" right_arrows=true>',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'));

  it('attribute override: an instance attr beats the prototype default', () => {
    const md = ['<block type="accordion" right_arrows=false>', '', '## A', '', 'x', '', '</block>'].join('\n');
    expect(matchBlocks(acc, md)[0].right_arrows).toBe(false); // proto default is true
  });

  it('light tag: a named-type tag with a clean body decodes via its prototype', () => {
    const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');
    expect(matchBlocks(protos, '<block type="slate">\n\nHello.\n\n</block>'))
      .toEqual([{ '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Hello.' }] }] }]);
  });

  it('inline <region>: an explicit region tag sets that region content', () => {
    const md = [
      '<block type="accordion">', '',
      '<region name="panels">', '',
      '## First', '', 'one', '',
      '## Second', '', 'two', '',
      '</region>', '',
      '</block>',
    ].join('\n');
    expect(matchBlocks(acc, md)[0].panels.map((p) => p.title)).toEqual(['First', 'Second']);
  });
});

describe('<fields> tag', () => {
  const protos = parsePrototypes('<block type="slate" value="${p/slate}" />');

  it('hoists an uncovered field, keeping the body clean, and round-trips', () => {
    const block = { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Prose.' }] }], styles: { align: 'left' } };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('Prose.');       // body stays clean markdown
    expect(md).toContain('<fields');      // styles hoisted, not tier-3
    expect(md).not.toMatch(/data='[^']*"value"/); // value is NOT dumped in data
    expect(matchBlocks(protos, md)).toEqual([block]);
  });

  it('decodes multiple fields from one <fields> tag', () => {
    const md = '<block type="slate">\n\nHi.\n\n<fields fixed=true data=\'{"styles":{"align":"left"}}\' />\n\n</block>';
    expect(matchBlocks(protos, md)).toEqual([
      { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'Hi.' }] }], fixed: true, styles: { align: 'left' } },
    ]);
  });
});

describe('link widget (/link)', () => {
  const btn = parsePrototypes('<block type="button" title="${a/text}" href="${a/link}" />');

  it('decodes a markdown link into title + object-browser href', () => {
    const md = '<block type="button">\n\n[Docs](/docs)\n\n</block>';
    expect(matchBlocks(btn, md)).toEqual([
      { '@type': 'button', title: 'Docs', href: [{ '@id': '/docs' }] },
    ]);
  });

  it('round-trips a button through emit as a clean link, not tier-3', () => {
    const block = { '@type': 'button', title: 'Docs', href: [{ '@id': '/docs' }] };
    const md = emitBlocks(btn, [block]);
    expect(md).toContain('[Docs](/docs)');
    expect(md).not.toContain('data=');
    expect(matchBlocks(btn, md)).toEqual([block]);
  });

  it('reads the href from a link inside a heading (teaser)', () => {
    const teaser = parsePrototypes(
      '<block type="teaser" title="${h/text}" href="${h/link}" description="${p/text}" />');
    const block = {
      '@type': 'teaser', title: 'Headline', href: [{ '@id': '/page' }], description: 'Lorem.',
    };
    const md = emitBlocks(teaser, [block]);
    expect(md).toContain('[Headline](/page)');
    expect(matchBlocks(teaser, md)).toEqual([block]);
  });
});

describe('link-item widget (/linkitem) — teaser href.title', () => {
  const teaser = parsePrototypes(
    '<block type="teaser" title="${h/text}" description="${p/text}" href="${a/linkitem}" />');

  it('carries href.title (link text) distinct from block.title (heading)', () => {
    const block = {
      '@type': 'teaser', title: 'Headline', description: 'Lorem.',
      href: [{ '@id': '/page', title: 'Page' }],
    };
    const md = emitBlocks(teaser, [block]);
    expect(md).toContain('[Page](/page)');   // href.title rides in the link text
    expect(md).toMatch(/#+ Headline/);        // block.title is the heading, kept separate
    const decoded = matchBlocks(teaser, md)[0];
    expect(decoded.href).toEqual([{ '@id': '/page', title: 'Page' }]); // title preserved
    expect(decoded.title).toBe('Headline');
  });
});

describe('multi-node slate (whole-body value)', () => {
  const protos = parsePrototypes([
    '<block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />',
    '<block type="slate" value="${*/slate}" />',
  ].join('\n'));

  it('captures a light-tag body of several nodes as one slate value', () => {
    const md = '<block type="slate">\n\n## Heading\n\nBody text.\n\n</block>';
    expect(matchBlocks(protos, md)).toEqual([{
      '@type': 'slate',
      value: [
        { type: 'h2', children: [{ text: 'Heading' }] },
        { type: 'p', children: [{ text: 'Body text.' }] },
      ],
    }]);
  });

  it('emits a multi-node slate as a light tag and round-trips', () => {
    const block = { '@type': 'slate', value: [
      { type: 'h2', children: [{ text: 'H' }] },
      { type: 'p', children: [{ text: 'P.' }] },
    ] };
    const md = emitBlocks(protos, [block]);
    expect(md).toContain('## H');
    expect(matchBlocks(protos, md)).toEqual([block]);
  });
});
