/**
 * Markdown -> Plone blocks.
 *
 * These cases are all taken from real docs pages whose published output is
 * wrong. Each one is a shape the hand-rolled inline regex could not express.
 */
import { describe, it, expect } from 'vitest';
import { parseConceptsMd } from './markdown-to-blocks.mjs';

/** Flatten a slate value to the node types and text it actually contains. */
function shape(node) {
  if (Array.isArray(node)) return node.map(shape).join('');
  if (node.text !== undefined && !node.type) return JSON.stringify(node.text);
  return `<${node.type}>${shape(node.children || [])}</${node.type}>`;
}

const firstSlate = (md) => {
  const { blocks, items } = parseConceptsMd(md);
  const id = items.find((i) => blocks[i]['@type'] === 'slate');
  return blocks[id].value;
};

describe('myst admonitions -> callout blocks', () => {
  const firstOfType = (md, type) => {
    const { blocks, items } = parseConceptsMd(md);
    const id = items.find((i) => blocks[i]['@type'] === type);
    return id ? blocks[id] : null;
  };

  it('converts {note} to a callout block (variation note, body as slate)', () => {
    const b = firstOfType('```{note}\nBe careful with **this**.\n```\n', 'callout');
    expect(b).not.toBeNull();
    expect(b.variation).toBe('note');
    expect(shape(b.value)).toBe('<p>"Be careful with "<strong>"this"</strong>"."</p>');
  });

  it('maps tip/warning/important to their variation', () => {
    for (const kind of ['tip', 'warning', 'important']) {
      const b = firstOfType('```{' + kind + '}\nHeads up.\n```\n', 'callout');
      expect(b.variation).toBe(kind);
    }
  });

  it('keeps multiple paragraphs in the body', () => {
    const b = firstOfType('```{note}\nFirst para.\n\nSecond para.\n```\n', 'callout');
    expect(b.value.length).toBe(2);
    expect(shape(b.value)).toBe('<p>"First para."</p><p>"Second para."</p>');
  });

  it('still drops {toctree} and {raw} (not content blocks)', () => {
    const { blocks } = parseConceptsMd('```{toctree}\n:hidden:\na\nb\n```\n\n```{raw} html\n<video></video>\n```\n');
    expect(Object.values(blocks).some((b) => b['@type'] === 'callout')).toBe(false);
    expect(Object.values(blocks).some((b) => b['@type'] === 'codeExample')).toBe(false);
  });
});

describe('inline formatting', () => {
  // docs/architecture.md:83. The old regex used \*\*([^*]+)\*\* for strong,
  // which cannot contain an asterisk, so this never matched as strong; the em
  // rule then paired from the second asterisk of the opening ** and every
  // delimiter after it was one position out of phase, corrupting the rest of
  // the block.
  it('parses emphasis nested inside strong', () => {
    const value = firstSlate('1. in **bold with *italic* inside** and after\n');
    expect(shape(value)).toBe(
      '<ol><li>"in "<strong>"bold with "<em>"italic"</em>" inside"</strong>' +
        '" and after"</li></ol>',
    );
  });

  it('leaves no literal asterisk behind', () => {
    const value = firstSlate('1. in **bold with *italic* inside** and after\n');
    expect(JSON.stringify(value)).not.toContain('*');
  });
});

describe('inline text that looks like a block', () => {
  // "## 2. Build the Page Template" -- the heading text starts with "2. ".
  // Inline content must not be parsed as a document, or remark reads that as
  // an ordered list and eats the number as syntax.
  it('keeps a leading number in a heading', () => {
    const { blocks, items } = parseConceptsMd('## 2. Build the Page Template\n');
    const h = items.map((i) => blocks[i]).find((b) => b.value?.[0]?.type === 'h2');
    expect(shape(h.value)).toBe('<h2>"2. Build the Page Template"</h2>');
  });

  it('keeps a leading hyphen in a table cell', () => {
    const { blocks, items } = parseConceptsMd('| a | b |\n| - | - |\n| - dash | x |\n');
    const tbl = items.map((i) => blocks[i]).find((b) => b['@type'] === 'slateTable');
    expect(shape(tbl.table.rows[1].cells[0].value)).toBe('<p>"- dash"</p>');
  });
});

describe('soft-wrapped lines', () => {
  // docs/build-a-frontend.md:124. The list loop consumed exactly one line per
  // <li>, so a ** that closed on the next line never matched and both markers
  // survived as literal text. (The paragraph handler already joins wrapped
  // lines; lists did not.)
  it('joins a list item wrapped across lines', () => {
    const value = firstSlate('- a heading anchor **at that\nlevel**. Use these.\n');
    expect(shape(value)).toBe(
      '<ul><li>"a heading anchor "<strong>"at that level"</strong>" Use these."</li></ul>'
        .replace('"</strong>" Use', '"</strong>". Use'),
    );
  });
});

describe('nested lists', () => {
  // An indented sub-list is a new block, not a continuation of the item above
  // it. Testing the raw line for '- ' misses the indented form, so joining
  // wrapped lines swallowed the whole sub-list into the parent item's text.
  it('does not swallow an indented sub-list into the parent item', () => {
    const value = firstSlate('- Blocks — discrete visual elements.\n  - Type, title, icon.\n');
    const text = JSON.stringify(value);
    expect(text).toContain('Blocks — discrete visual elements.');
    expect(text).not.toContain('- Type, title, icon.');
  });

  // Nested as HTML nests: the sub-list is a child of the item it hangs off.
  it('nests a sub-list inside its parent item', () => {
    const value = firstSlate(
      '- Blocks — discrete visual elements.\n  - Type, title, icon.\n  - Fields: string, image.\n',
    );
    expect(shape(value)).toBe(
      '<ul><li>"Blocks — discrete visual elements."' +
        '<ul><li>"Type, title, icon."</li><li>"Fields: string, image."</li></ul>' +
        '</li></ul>',
    );
  });

  it('nests to a third level', () => {
    const value = firstSlate('- a\n  - b\n    - c\n');
    expect(shape(value)).toBe(
      '<ul><li>"a"<ul><li>"b"<ul><li>"c"</li></ul></li></ul></li></ul>',
    );
  });

  it('keeps an ordered sub-list ordered', () => {
    const value = firstSlate('- a\n  1. one\n  2. two\n');
    expect(shape(value)).toBe(
      '<ul><li>"a"<ol><li>"one"</li><li>"two"</li></ol></li></ul>',
    );
  });
});

describe('blockquotes', () => {
  // docs/container-blocks.md:55. There is no '>' handler at all, so quoted
  // lines fall through to the paragraph handler and the markers are published
  // as literal text -- even though blockquote is a supported node type
  // (hydra.src.js has the '>' shortcut and the toolbar has a block button).
  // The inlines are the blockquote's direct children. blockquote is a
  // node-type conversion in the editor (hydra's '>' shortcut lists it beside
  // h2/h3; volto-slate's BlockButton toggles the node type), so wrapping it in
  // a <p> would not survive a round-trip through the editor.
  it('parses a blockquote as a blockquote node', () => {
    const value = firstSlate('> The wrong form may *look* fine, but\n> it is **not registered**.\n');
    expect(shape(value)).toBe(
      '<blockquote>"The wrong form may "<em>"look"</em>" fine, but it is "' +
        '<strong>"not registered"</strong>"."</blockquote>',
    );
  });

  it('leaves no literal > behind', () => {
    const value = firstSlate('> quoted text\n');
    expect(JSON.stringify(value)).not.toContain('>');
  });
});
