/**
 * blockmd — two-way conversion between Plone block documents and markdown.
 *
 * Implements the format sketched in ../mcp-content-authoring.md. Measured
 * against all real content; see ../blockmd-prototype/FINDINGS.md for how the
 * mapping was derived and what it can't carry.
 *
 * DESIGN — two layers, each doing what it is good at:
 *
 *   1. Frame layer (here). A line-anchored scanner for `:::type{attrs}` … `:::`.
 *      This grammar is ours and is always block-level at line start, so a
 *      scanner is exact and needs no dependency. It nests, and `::::name`
 *      opens a named region (a blocks_layout region, or an object_list field).
 *
 *   2. Prose layer (remark). mdast <-> slate. Markdown parsing is where
 *      hand-rolling goes wrong — the python prototype's regexes lost inline
 *      code, split lists and mangled nested emphasis — so it is delegated.
 *
 * Page metadata rides in YAML frontmatter, authored fields only, plus an
 * ordered `blocks:` map (uid -> type) so a plain paragraph can BE a slate block
 * without a directive wrapper. That map is the proposal's blockMap (§3).
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import YAML from 'yaml';

const mdParser = unified().use(remarkParse).use(remarkGfm);
const mdSerializer = unified()
  .use(remarkStringify, { bullet: '-', emphasis: '*', strong: '*', fences: true, rule: '-' })
  .use(remarkGfm);

// Page fields a human authors. Everything else (created, modified,
// workflow_history, lock, is_folderish, parent, type_title, …) is server state:
// including it produces spurious diffs on every export and invites someone to
// hand-edit an audit trail.
export const AUTHORED = ['title', 'description', 'review_state', 'exclude_from_nav',
  'subjects', 'language', 'rights', 'effective', 'expires', 'id'];
// Server-assigned but load-bearing — a re-import needs stable identity.
export const IDENTITY = ['UID', '@type'];

const RESERVED = new Set(['@type', '@id', 'blocks', 'blocks_layout', 'value', 'plaintext']);

// ---------------------------------------------------------------- slate ----
const MARK_KEYS = { strong: 'bold', emphasis: 'italic', delete: 'strikethrough' };

/** mdast inline nodes -> slate children. */
function inlineToSlate(nodes) {
  const out = [];
  for (const n of nodes || []) {
    switch (n.type) {
      case 'text':
        out.push({ text: n.value });
        break;
      case 'inlineCode':
        // Stored content uses a code NODE (859 of them) not a {code:true}
        // mark. Both exist in the data; emit the dominant form.
        out.push({ type: 'code', children: [{ text: n.value }] });
        break;
      case 'strong':
        out.push({ type: 'strong', children: inlineToSlate(n.children) });
        break;
      case 'emphasis':
        out.push({ type: 'em', children: inlineToSlate(n.children) });
        break;
      case 'delete':
        out.push({ type: 'del', children: inlineToSlate(n.children) });
        break;
      case 'link':
        out.push({ type: 'link', data: { url: n.url }, children: inlineToSlate(n.children) });
        break;
      case 'break':
        // Inverse of the hard-break emit: fold back into the previous leaf so
        // the text node matches what was stored.
        if (out.length && out[out.length - 1].text !== undefined && !out[out.length - 1].type) {
          out[out.length - 1].text += '\n';
        } else {
          out.push({ text: '\n' });
        }
        break;
      default:
        if (n.children) out.push(...inlineToSlate(n.children));
        else if (n.value != null) out.push({ text: String(n.value) });
    }
  }
  // Merge adjacent plain leaves. Folding hard breaks back into text produces
  // several leaves where storage had one, which is semantically identical but
  // does not compare equal.
  const merged = [];
  for (const n of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.text !== undefined && !prev.type && n.text !== undefined && !n.type
        && Object.keys(prev).length === 1 && Object.keys(n).length === 1) {
      prev.text += n.text;
    } else merged.push(n);
  }
  return merged.length ? merged : [{ text: '' }];
}

function listToSlate(node) {
  const items = (node.children || []).map((li) => {
    // A list item's children are usually a single paragraph.
    const kids = (li.children || []).flatMap((c) =>
      c.type === 'paragraph' ? inlineToSlate(c.children) : blockToSlate(c));
    return { type: 'li', children: kids.length ? kids : [{ text: '' }] };
  });
  return { type: node.ordered ? 'ol' : 'ul', children: items };
}

/** One mdast block node -> one slate top-level node. */
function blockToSlate(n) {
  switch (n.type) {
    case 'paragraph':
      return [{ type: 'p', children: inlineToSlate(n.children) }];
    case 'heading':
      return [{ type: `h${n.depth}`, children: inlineToSlate(n.children) }];
    case 'list':
      return [listToSlate(n)];
    case 'blockquote':
      return [{ type: 'blockquote', children: (n.children || []).flatMap(blockToSlate) }];
    case 'code':
      return [{ type: 'p', children: [{ type: 'code', children: [{ text: n.value ?? '' }] }] }];
    case 'thematicBreak':
      return [];
    default:
      return n.children ? [{ type: 'p', children: inlineToSlate(n.children) }] : [];
  }
}

/**
 * markdown -> slate value.
 *
 * Returns a LIST of top-level nodes. docs/visual-editing.md says a slate value
 * always holds exactly one; stored content disagrees (43 of 997 hold more —
 * grid cards are a bold lead-in plus a body paragraph), so this does not
 * enforce the invariant.
 */
export function mdToSlate(md) {
  const tree = mdParser.parse(md);
  const out = (tree.children || []).flatMap(blockToSlate);
  return out.length ? out : [{ type: 'p', children: [{ text: '' }] }];
}

// slate -> mdast
function slateInlineToMdast(nodes) {
  const out = [];
  for (const n of nodes || []) {
    if (n.text !== undefined && !n.type) {
      // A newline inside a text leaf would reparse as a paragraph break.
      // markdown's hard break keeps it inside the same node.
      if (n.text.includes('\n') && !n.code) {
        const parts = n.text.split('\n');
        // Drop a trailing empty part: a newline at the very end of a paragraph
        // carries no meaning and would serialise to a dangling "\" that
        // reparses as a literal backslash.
        while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
        parts.forEach((part, idx) => {
          if (idx) out.push({ type: 'break' });
          if (part) out.push({ type: 'text', value: part });
        });
        continue;
      }
      let node = { type: 'text', value: n.text };
      // Marks nest outward; order is fixed so serialisation is stable.
      for (const [mdType, slateKey] of Object.entries(MARK_KEYS)) {
        if (n[slateKey]) node = { type: mdType, children: [node] };
      }
      if (n.code) node = { type: 'inlineCode', value: n.text };
      out.push(node);
      continue;
    }
    // An inline element with no content serialises to a bare "**" or "*",
    // which markdown reads back as literal asterisks. Stored content contains
    // several of these (empty strong/em left behind by editing).
    if (n.children && !plaintextOf(n.children) && n.type !== 'link' && n.type !== 'a') continue;
    switch (n.type) {
      case 'strong': case 'b':
        out.push({ type: 'strong', children: slateInlineToMdast(n.children) }); break;
      case 'em': case 'i':
        out.push({ type: 'emphasis', children: slateInlineToMdast(n.children) }); break;
      case 'del':
        out.push({ type: 'delete', children: slateInlineToMdast(n.children) }); break;
      case 'code':
        out.push({ type: 'inlineCode', value: plaintextOf(n.children) }); break;
      case 'link': case 'a':
        out.push({ type: 'link', url: n.data?.url ?? n.url ?? '',
                   children: slateInlineToMdast(n.children) }); break;
      default:
        out.push(...slateInlineToMdast(n.children));
    }
  }
  return out;
}

function slateBlockToMdast(n) {
  const t = n.type;
  if (/^h[1-6]$/.test(t)) return { type: 'heading', depth: +t[1], children: slateInlineToMdast(n.children) };
  if (t === 'ul' || t === 'ol') {
    return {
      type: 'list', ordered: t === 'ol', spread: false,
      children: (n.children || []).map((li) => ({
        type: 'listItem', spread: false,
        children: [{ type: 'paragraph', children: slateInlineToMdast(li.children) }],
      })),
    };
  }
  if (t === 'blockquote') {
    return { type: 'blockquote', children: (n.children || []).map(slateBlockToMdast) };
  }
  return { type: 'paragraph', children: slateInlineToMdast(n.children) };
}

export function slateToMd(value) {
  const tree = { type: 'root', children: (value || []).map(slateBlockToMdast) };
  return mdSerializer.stringify(tree).trim();
}

export function plaintextOf(v) {
  let s = '';
  const walk = (n) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      if (typeof n.text === 'string') s += n.text;
      (n.children || []).forEach(walk);
    }
  };
  walk(v);
  return s;
}

// ------------------------------------------------------------ attributes ---
/** A value that can live in {attrs}: scalar, single-line, not enormous. */
function attrable(v) {
  if (typeof v === 'boolean' || typeof v === 'number') return true;
  if (typeof v === 'string') return !v.includes('\n') && !v.includes('"') && v.length <= 200;
  return false;
}

function fmtAttrs(o) {
  return Object.entries(o).map(([k, v]) =>
    typeof v === 'string' ? `${k}="${v}"` : `${k}=${v}`).join(' ');
}

const ATTR_RE = /([\w@.-]+)=(?:"([^"]*)"|(\S+))/g;

function parseAttrs(s) {
  const out = {};
  for (const [, k, quoted, bare] of (s || '').matchAll(ATTR_RE)) {
    if (quoted !== undefined) out[k] = quoted;
    else if (bare === 'true' || bare === 'false') out[k] = bare === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(bare)) out[k] = Number(bare);
    else out[k] = bare;
  }
  return out;
}

// -------------------------------------------------------------- emitting ---
function childFields(schema, type) {
  return Object.entries(schema?.[type] || {})
    .filter(([, p]) => p.widget === 'object_list')
    .map(([f]) => f);
}

function blockToMd(uid, b, schema, depth = 0) {
  const type = b['@type'];
  const kidFields = childFields(schema, type);
  const skip = new Set([...RESERVED, ...kidFields]);
  const attrs = {}, complex = {};
  for (const [k, v] of Object.entries(b)) {
    if (skip.has(k)) continue;
    (attrable(v) ? attrs : complex)[k] = v;
  }

  const lines = [`:::${type}{${fmtAttrs({ uid, ...attrs })}}`];

  // A multi-line STRING is prose or source code — the things markdown exists
  // for. Emitting it as a JSON one-liner (which is what a generic escape hatch
  // does) makes the most common structured block, codeExample, unreadable and
  // unauthorable. Give it a fenced block labelled with the field name, and use
  // the `language` attr for highlighting when there is one.
  const fenced = {}, json = {};
  for (const [k, v] of Object.entries(complex)) {
    (typeof v === 'string' ? fenced : json)[k] = v;
  }
  if (Object.keys(json).length) {
    lines.push('```fields', JSON.stringify(json, null, 1), '```');
  }
  for (const [k, v] of Object.entries(fenced)) {
    lines.push(openFence(v, k, attrs.language), v, closeFence(v));
  }
  if ((type === 'slate' || type === 'introduction') && b.value) lines.push(slateToMd(b.value));

  for (const f of kidFields) {
    if (!Array.isArray(b[f])) continue;
    lines.push(`::::${f}`);
    for (const item of b[f]) {
      if (item && typeof item === 'object') {
        // form.subblocks items have no @id; inventing "" adds a field that
        // was never there.
        const itemId = item['@id'] ?? '';
        const emitted = blockToMd(itemId, { ...item, '@type': item['@type'] ?? singular(f) }, schema, depth + 1);
        lines.push(itemId ? emitted : emitted.replace(/^(:::[\w-]+\{)uid="" ?/, '$1'));
      }
    }
    lines.push('::::');
  }

  if (b.blocks && typeof b.blocks === 'object') {
    const bl = b.blocks_layout || {};
    const regions = Object.keys(bl);
    if (!regions.length) {
      for (const [k, v] of Object.entries(b.blocks)) lines.push(blockToMd(k, v, schema, depth + 1));
    } else {
      for (const region of regions) {
        const named = regions.length > 1 || region !== 'items';
        if (named) lines.push(`::::${region}`);
        for (const k of bl[region] || []) if (b.blocks[k]) lines.push(blockToMd(k, b.blocks[k], schema, depth + 1));
        if (named) lines.push('::::');
      }
    }
  }
  lines.push(':::');
  return lines.join('\n');
}

/** A fence longer than any backtick run inside the payload. */
function fenceLen(text) {
  let max = 0;
  for (const m of String(text).matchAll(/`+/g)) max = Math.max(max, m[0].length);
  return Math.max(3, max + 1);
}
const openFence = (text, field, lang) =>
  '`'.repeat(fenceLen(text)) + `field:${field}` + (lang ? ` ${lang}` : '');
const closeFence = (text) => '`'.repeat(fenceLen(text));

const singular = (f) => (f.endsWith('s') ? f.slice(0, -1) : f);

export function pageToMd(page, schema = {}) {
  const blocks = page.blocks || {};
  const order = [...(page.blocks_layout?.items || [])];
  for (const k of Object.keys(blocks)) if (!order.includes(k)) order.push(k);

  const meta = {};
  for (const k of [...AUTHORED, ...IDENTITY]) if (k in page) meta[k] = page[k];
  meta.blocks = order.filter((u) => blocks[u]).map((u) => ({ [u]: blocks[u]['@type'] }));

  const body = order.filter((u) => blocks[u]).map((uid) => {
    const b = blocks[uid];
    const extra = Object.keys(b).filter((k) => !['@type', 'value', 'plaintext'].includes(k));
    // Prose with nothing but a value renders as bare markdown.
    // Bare markdown only when there IS prose: an empty paragraph serialises to
    // an empty string and would silently disappear from the document.
    if (b['@type'] === 'slate' && !extra.length && (b.value || []).length === 1
        && slateToMd(b.value).trim()) {
      return slateToMd(b.value);
    }
    return blockToMd(uid, b, schema);
  });

  return `---\n${YAML.stringify(meta).trim()}\n---\n\n${body.join('\n\n')}\n`;
}

// --------------------------------------------------------------- parsing ---
const OPEN_RE = /^(:{3,4})([\w-]*)(?:\{(.*)\})?\s*$/;

export function mdToPage(md, schema = {}) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  const meta = m ? YAML.parse(m[1]) || {} : {};
  const body = m ? md.slice(m[0].length) : md;

  const blockmap = (meta.blocks || []).map((e) => {
    const [uid, type] = Object.entries(e)[0];
    return { uid, type };
  });
  delete meta.blocks;

  const blocks = {}, order = [];
  const stack = [];       // { uid, block, order, region }
  let buf = [];

  const flushProse = () => {
    const text = buf.join('\n').trim();
    buf = [];
    if (!text) return;
    const next = blockmap.find((e) => e.type === 'slate' && !(e.uid in blocks));
    const uid = next?.uid ?? `slate-${Object.keys(blocks).length}`;
    const value = mdToSlate(text);
    blocks[uid] = { '@type': 'slate', value, plaintext: plaintextOf(value) };
    order.push(uid);
  };

  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const open = OPEN_RE.exec(line);

    if (open && open[2] && open[3] !== undefined) {
      flushProse();
      const type = open[2];
      const attrs = parseAttrs(open[3]);
      const attrsHadUid = attrs.uid !== undefined;
      const uid = attrs.uid ?? `${type}-${Object.keys(blocks).length}`;
      delete attrs.uid;
      const block = { '@type': type, ...attrs };
      const parent = stack[stack.length - 1];
      if (parent) {
        if (parent.region && childFields(schema, parent.block['@type']).includes(parent.region)) {
          // Push the SAME object that goes on the stack, never a copy: later
          // ```fields updates mutate the stack entry, and a copy loses them
          // silently (this is how every codeExample lost its `code`).
          if (attrsHadUid) block['@id'] = uid;
          block._objlist = parent.region;
          (parent.block[parent.region] ||= []).push(block);
        } else {
          (parent.block.blocks ||= {})[uid] = block;
          (parent.regions ||= {});
          const region = parent.region || 'items';
          (parent.regions[region] ||= []).push(uid);
        }
      } else {
        blocks[uid] = block;
        order.push(uid);
      }
      stack.push({ uid, block, regions: {}, region: null });
      continue;
    }

    if (open && open[1] === '::::' && open[2] && open[3] === undefined) {
      if (stack.length) stack[stack.length - 1].region = open[2];
      continue;
    }

    if (line === ':::' || line === '::::') {
      const top = stack[stack.length - 1];
      if (line === '::::' && top?.region) { top.region = null; continue; }
      const frame = stack.pop();
      if (frame) {
        const { block, regions } = frame;
        if (regions && Object.keys(regions).length) block.blocks_layout = regions;
        const region = block._objlist;
        delete block._objlist;
        // blockToMd synthesises a type from the field name (tabs -> tab) for
        // items that have none; drop it again so the item matches storage.
        if (region && block['@type'] === singular(region)) delete block['@type'];
        if ((block['@type'] === 'slate' || block['@type'] === 'introduction') && block._md) {
          block.value = mdToSlate(block._md.trim());
          block.plaintext = plaintextOf(block.value);
        }
        delete block._md;
      }
      continue;
    }

    const fieldFence = /^(`{3,})field:([\w.-]+)(?:\s+\S+)?\s*$/.exec(line);
    if (fieldFence && stack.length) {
      const close = fieldFence[1];
      const chunk = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== close) chunk.push(lines[j++]);
      stack[stack.length - 1].block[fieldFence[2]] = chunk.join('\n');
      i = j;
      continue;
    }

    if (line === '```fields' && stack.length) {
      const chunk = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '```') chunk.push(lines[j++]);
      Object.assign(stack[stack.length - 1].block, JSON.parse(chunk.join('\n')));
      i = j;
      continue;
    }

    if (stack.length) {
      const top = stack[stack.length - 1];
      top.block._md = (top.block._md ?? '') + raw + '\n';
    } else if (!line && buf.length) {
      flushProse();
    } else if (line) {
      buf.push(raw);
    }
  }
  flushProse();

  return { ...meta, blocks, blocks_layout: { items: order } };
}
