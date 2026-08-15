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
