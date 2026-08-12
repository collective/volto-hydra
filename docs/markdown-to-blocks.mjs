/**
 * Markdown -> Plone blocks.
 *
 * Split out of sync.mjs so it can be tested: sync.mjs does all its work at
 * module top level and calls process.exit, so importing it from a test runs a
 * full sync. This module is pure — markdown in, blocks out.
 *
 * The inline layer delegates to remark rather than matching delimiters by
 * hand. The previous regex could not express nesting (`**a *b* c**` left a
 * literal asterisk and cascaded through the rest of the block), and adding
 * cases to it only moves where it breaks.
 */
import { basename } from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

/**
 * True for a line that starts a new block, so a wrapped line can't swallow it.
 *
 * Tests the TRIMMED line: an indented sub-list item ("  - Type, title") is a
 * new block too, and matching the raw line would fold a whole nested list into
 * the parent item's text.
 */
function startsNewBlock(l) {
  const t = l.trim();
  return t === ''
    || t.startsWith('- ') || t.startsWith('* ') || /^\d+\.\s/.test(t)
    || t.startsWith('#') || t.startsWith('>') || t.startsWith('|')
    || t.startsWith('```') || t.startsWith('<!--');
}

/** A list item line, at any indent depth. */
const isListItem = (l) => /^\s*([-*]\s|\d+\.\s)/.test(l);

/**
 * The whole list, from its first marker to the first line that isn't part of
 * it: further items at any indent, plus indented continuation lines.
 *
 * Taken as one chunk so remark sees the list as a list. Reading it line by
 * line is what flattened nested lists into a paragraph of literal hyphens --
 * indentation is structure, and it only means anything in context.
 */
function takeListRun(lines, i) {
  const chunk = [];
  let j = i;
  // A further item at any indent, or a continuation line -- including a lazy
  // one at column 0, which markdown still counts as part of the item above.
  while (j < lines.length
         && (isListItem(lines[j]) || (chunk.length && !startsNewBlock(lines[j])))) {
    chunk.push(lines[j]);
    j++;
  }
  return { md: chunk.join('\n'), next: j };
}

/** mdast list -> slate. The sub-list hangs off the item, as it does in HTML. */
function listFromMdast(node) {
  return {
    type: node.ordered ? 'ol' : 'ul',
    children: node.children.map((item) => ({
      type: 'li',
      children: item.children.flatMap((child) => {
        if (child.type === 'list') return [listFromMdast(child)];
        if (child.children) return child.children.flatMap(inlineFromMdast);
        return [{ text: child.value ?? '' }];
      }),
    })),
  };
}

/** Text of a slate subtree, for the `plaintext` field. */
function slateText(n) {
  if (Array.isArray(n)) return n.map(slateText).join('');
  if (n.text !== undefined && !n.type) return n.text;
  return (n.children || []).map(slateText).join('');
}

/** Random suffix for generated @ids (mirrors sync.mjs's own helper). */
function hexSuffix() {
  return Math.random().toString(16).slice(2, 8);
}

/** Shared markdown processor — parse only, no stringify. */
const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * mdast inline node -> slate node.
 *
 * Recursive, which is the whole point: `**a *b* c**` is a strong containing an
 * emphasis, and any parser that matches delimiters in one flat pass cannot
 * represent that.
 */
function inlineFromMdast(node) {
  switch (node.type) {
    case 'text':
      // A soft break is markdown for "same paragraph, wrapped source". It
      // renders as a space, so it must not survive as a newline in a leaf.
      return [{ text: node.value.replace(/\s*\n\s*/g, ' ') }];
    case 'strong':
      return [{ type: 'strong', children: node.children.flatMap(inlineFromMdast) }];
    case 'emphasis':
      return [{ type: 'em', children: node.children.flatMap(inlineFromMdast) }];
    case 'delete':
      return [{ type: 'del', children: node.children.flatMap(inlineFromMdast) }];
    case 'inlineCode':
      return [{ type: 'code', children: [{ text: node.value }] }];
    case 'link':
      return [{
        type: 'link',
        data: { url: node.url },
        children: node.children.flatMap(inlineFromMdast),
      }];
    case 'break':
      return [{ text: ' ' }];
    case 'image':
      return [{ text: node.alt || '' }];
    default:
      // Unknown inline construct: keep its text rather than dropping it.
      return node.children
        ? node.children.flatMap(inlineFromMdast)
        : [{ text: node.value ?? '' }];
  }
}

/**
 * Escape a leading block marker so a phrase is read as inline text.
 *
 * The callers pass inline content -- a heading's text, a table cell -- but
 * remark parses a document. "2. Build the Page Template" is a heading whose
 * text happens to start like an ordered list, and left alone remark eats the
 * "2." as syntax. Markdown's own backslash escape says "this is literal".
 */
function escapeBlockStart(text) {
  return text
    .replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3')
    .replace(/^(\s*)([-*+#>|])(\s)/, '$1\\$2$3');
}

/**
 * Parse markdown inline formatting into a Slate children array.
 * Handles `code`, **strong**, *em*, ~~del~~, [text](url), and any nesting of
 * them.
 */
export function parseInline(text) {
  const root = processor.parse(escapeBlockStart(text));
  // Callers pass one logical paragraph, so take the first block's inlines.
  const first = root.children.find((n) => n.type === 'paragraph' || n.children);
  const leaves = first ? first.children.flatMap(inlineFromMdast) : [];
  return leaves.length ? leaves : [{ text: '' }];
}

/** Plain text of inline markdown, derived from the parse rather than by
 *  stripping markers with a second set of regexes that can disagree. */
export function inlineToPlaintext(text) {
  const walk = (n) => (n.text !== undefined && !n.type
    ? n.text
    : (n.children || []).map(walk).join(''));
  return parseInline(text).map(walk).join('');
}

/**
 * Convert plain text to a Slate paragraph value array, parsing inline marks.
 */
export function textToSlate(text) {
  return [{ type: 'p', children: parseInline(text) }];
}

/**
 * Parse a markdown file into a sequence of Plone blocks + layout items.
 * Handles: # title (skip), ## ### #### headings, paragraphs (with inline
 * `code`, **bold**, *em*, links), bullet/numbered lists, markdown tables,
 * fenced code blocks, and <!-- codeExample: lang [label="..."] --> markers.
 */
export function parseConceptsMd(mdContent, { imagesParentPath = "" } = {}) {
  const blocks = {};
  const items = [];
  const lines = mdContent.split('\n');
  let i = 0;
  let blockCounter = 0;

  function addBlock(id, block) {
    blocks[id] = block;
    items.push(id);
  }

  function nextId(prefix) {
    return `${prefix}-${++blockCounter}`;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Skip H1 title — the title block in the JSON handles it
    if (line.startsWith('# ')) {
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___) → separator block
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim()) && line.trim().length >= 3) {
      const id = nextId('sep');
      addBlock(id, { '@type': 'separator' });
      i++;
      continue;
    }

    // Standalone image: ![alt](path/to/image.png) → image block.
    // Matches Phase 5's slug rule: filename without extension.
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      const slug = basename(url).replace(/\.[^.]+$/, '');
      const id = nextId('img');
      addBlock(id, {
        '@type': 'image',
        url: `${imagesParentPath}/images/${slug}`,
        alt,
        align: 'center',
        size: 'l',
      });
      i++;
      continue;
    }

    // H2/H3/H4 heading → slate h2/h3/h4 block
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;  // 2, 3, or 4
      const rawText = headingMatch[2].trim();
      const id = nextId('h');
      addBlock(id, {
        '@type': 'slate',
        plaintext: inlineToPlaintext(rawText),
        value: [{ type: `h${level}`, children: parseInline(rawText) }],
      });
      i++;
      continue;
    }

    // <!-- codeExample: lang [label="..."] --> marker
    const ceMatch = line.match(/^<!-- codeExample: (\w+)(?:\s+label="([^"]+)")?\s*-->$/);
    if (ceMatch) {
      const lang = ceMatch[1];
      const label = ceMatch[2] || lang.charAt(0).toUpperCase() + lang.slice(1);
      i++;
      // Next non-empty line should be the opening fence
      while (i < lines.length && lines[i].trim() === '') i++;
      if (lines[i] && lines[i].startsWith('```')) {
        i++; // skip opening fence
        const codeLines = [];
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        const id = nextId('ce');
        addBlock(id, {
          '@type': 'codeExample',
          tabs: [{
            '@id': `${id}-${lang}-${hexSuffix()}`,
            label,
            language: lang,
            code: codeLines.join('\n').trimEnd(),
          }],
        });
      }
      continue;
    }

    // Blockquote ('> ' lines). Consecutive quoted lines are one blockquote.
    // `blockquote` is a node-type conversion in the editor (it sits with h2/h3
    // in hydra's markdown shortcuts and in volto-slate's BlockButton), so the
    // inlines are its direct children -- no wrapping paragraph, or a round-trip
    // through the editor would not match what we wrote.
    if (/^>\s?/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, '').trim());
        i++;
      }
      const text = quoted.join(' ').trim();
      const id = nextId('bq');
      addBlock(id, {
        '@type': 'slate',
        plaintext: inlineToPlaintext(text),
        value: [{ type: 'blockquote', children: parseInline(text) }],
      });
      continue;
    }

    // Lists, bullet or numbered, to any depth. The whole run goes to remark in
    // one piece: nesting is expressed by indentation, which only means
    // something in context, so it cannot be read a line at a time.
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const run = takeListRun(lines, i);
      i = run.next;
      const mdastList = processor.parse(run.md).children.find((n) => n.type === 'list');
      if (!mdastList) continue;
      const value = [listFromMdast(mdastList)];
      const id = nextId(mdastList.ordered ? 'ol' : 'ul');
      addBlock(id, {
        '@type': 'slate',
        plaintext: value[0].children.map(slateText).join(' '),
        value,
      });
      continue;
    }

    // Markdown pipe table:
    //   | a | b | c |
    //   | - | - | - |
    //   | 1 | 2 | 3 |
    // → slateTable block. Stops at first non-pipe line.
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cellsFrom = (l) => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const headerCells = cellsFrom(lines[i]);
      i += 2; // skip header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        bodyRows.push(cellsFrom(lines[i]));
        i++;
      }
      const id = nextId('tbl');
      const mkCell = (text, isHeader, rIdx, cIdx) => ({
        key: `${id}-r${rIdx}c${cIdx}`,
        type: isHeader ? 'header' : 'data',
        value: [{ type: 'p', children: parseInline(text) }],
      });
      const rows = [
        { key: `${id}-r0`, cells: headerCells.map((c, cIdx) => mkCell(c, true, 0, cIdx)) },
        ...bodyRows.map((r, rIdx) => ({
          key: `${id}-r${rIdx + 1}`,
          cells: r.map((c, cIdx) => mkCell(c, false, rIdx + 1, cIdx)),
        })),
      ];
      addBlock(id, {
        '@type': 'slateTable',
        table: { fixed: true, compact: false, basic: false, celled: true, inverted: false, striped: false, rows },
      });
      continue;
    }

    // Fenced code block without a codeExample marker — wrap as codeExample.
    // Exception: MyST directive fences like ```{toctree}``` or ```{warning}```
    // are Sphinx-only markup; the toctree is consumed elsewhere (drives sync
    // ordering), and admonitions render natively. None of them should leak
    // into Plone as a codeExample. If we ever want admonition text on the
    // live site, add a directive-aware branch above.
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      // MyST directive fences: ```{toctree}, ```{warning}, ```{raw} html, etc.
      // The language token always starts with `{` for these.
      if (lang.startsWith('{')) continue;
      const id = nextId('ce');
      const label = lang.charAt(0).toUpperCase() + lang.slice(1);
      addBlock(id, {
        '@type': 'codeExample',
        tabs: [{
          '@id': `${id}-${lang}-${hexSuffix()}`,
          label,
          language: lang,
          code: codeLines.join('\n').trimEnd(),
        }],
      });
      continue;
    }

    // Non-empty paragraph line — collect until blank line
    if (line.trim() !== '') {
      const paraLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Stop if next line is a heading, list, code fence, or table.
        if (lines[i].startsWith('#') || lines[i].startsWith('- ') ||
            lines[i].startsWith('* ') || /^\d+\.\s/.test(lines[i]) ||
            lines[i].startsWith('```') || lines[i].startsWith('<!--') ||
            lines[i].startsWith('|')) {
          break;
        }
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        const text = paraLines.join(' ').trim();
        const id = nextId('p');
        addBlock(id, {
          '@type': 'slate',
          plaintext: text,
          value: textToSlate(text),
        });
      }
      continue;
    }

    i++;
  }

  return { blocks, items };
}
