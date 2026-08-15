/**
 * Prototype-tag mapping: markdown -> Plone blocks, driven by prototype tags.
 *
 * Design: docs/superpowers/specs/2026-08-14-blockmd-unified-mapping-design.md
 *
 * A prototype is a `<block>` tag read declaratively. Its `${type[n]/part}` refs
 * are the pattern -- they both locate the markdown nodes an instance spans and
 * map them to fields; there is no separate `match=`. A container prototype
 * nests a `<region>` whose item prototype applies in that child scope: the
 * item's heading ref is the repeat delimiter, and whatever the item's scalar
 * refs do not consume falls into the region as the implicit remainder.
 *
 * Matching is a run over the top-level node stream: leftmost, longest,
 * prototype declaration order as the tiebreak.
 *
 * NOTE (spike): uid-keying is deferred. A region yields an ordered list of
 * items, and a panel's remainder is an ordered `blocks` list -- not yet the
 * uid-keyed `blocks` dict + `blocks_layout` the stored shape uses.
 */
import YAML from 'yaml';
import { tagOf, mdParser, blockToSlate, slateToMd, fmtTagAttrs, renderTable } from './blockmd.mjs';

// ${node[n]/part} -- node kind, optional match-index, optional accessor part.
// No `/part` means match-only: consume the node, capture nothing (separator,
// title). The `${}` is what marks a value as matching; a literal is a field
// default, so a field literally named `node` never collides with a directive.
const REF_RE = /^\$\{([a-z0-9|*]+)(?:\[(\d+)\])?(?:\/([a-z]+))?\}$/i;

function parseRef(v) {
  if (typeof v !== 'string') return null;
  const m = REF_RE.exec(v.trim());
  if (!m) return null;
  return { node: m[1], index: m[2] ? Number(m[2]) : null, part: m[3] ?? null };
}

// Parse a tag's attributes, typed by syntax: a bare name is `true` (HTML
// boolean), an unquoted value is coerced (number / true / false / null / JSON),
// a double-quoted value stays a string (so `${refs}` survive), and a
// single-quoted value is a data JSON string (entities un-escaped).
const ATTR_RE = /([\w@.$-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
function typedAttrs(raw) {
  const inner = raw.replace(/^\s*<\/?[A-Za-z][\w-]*/, '').replace(/\/?>\s*$/, '');
  const out = {};
  for (const [, k, dq, sq, bare] of inner.matchAll(ATTR_RE)) {
    if (dq !== undefined) out[k] = dq;
    else if (sq !== undefined) out[k] = sq.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    else if (bare === undefined) out[k] = true; // HTML boolean
    else if (bare === 'true' || bare === 'false') out[k] = bare === 'true';
    else if (bare === 'null') out[k] = null;
    else if (/^-?\d+(\.\d+)?$/.test(bare)) out[k] = Number(bare);
    else if (bare[0] === '{' || bare[0] === '[') out[k] = JSON.parse(bare);
    else out[k] = bare;
  }
  return out;
}

/**
 * Canonical node kind, in HTML vocabulary so refs read as `p`/`hr`/`img`/`td`
 * rather than mdast's internal names. A heading carries its level (`h2`).
 */
const HTML_KIND = {
  paragraph: 'p', image: 'img', thematicBreak: 'hr', code: 'pre',
  table: 'table', tableRow: 'tr', tableCell: 'td', link: 'a',
  listItem: 'li', blockquote: 'blockquote', break: 'br', inlineCode: 'code',
};
const kindOf = (n) => {
  if (n.type === 'heading') return `h${n.depth}`;
  if (n.type === 'list') return n.ordered ? 'ol' : 'ul';
  return HTML_KIND[n.type] ?? n.type;
};

// -------------------------------------------------------------- prototypes ---

/**
 * Parse a run of prototype tags into a tree. A `<block>` may nest `<region>`s,
 * and a region holds one item prototype.
 */
export function parsePrototypes(text) {
  const roots = [];
  const stack = []; // {kind:'block',proto} | {kind:'region',region}
  const top = () => stack[stack.length - 1];

  const place = (proto) => {
    const t = top();
    if (!t) roots.push(proto);
    else if (t.kind === 'region') t.region.protos.push(proto);
    else throw new Error('a block prototype must sit inside a region, not a block');
  };

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const tag = tagOf(line);
    if (!tag) continue;
    const attrs = typedAttrs(line);

    if (tag.name === 'block') {
      const { type, ...fields } = attrs;
      const proto = { type, fields, regions: [] };
      if (tag.kind === 'close') { stack.pop(); continue; }
      place(proto);
      if (tag.kind === 'open') stack.push({ kind: 'block', proto });
    } else if (tag.name === 'region') {
      if (tag.kind === 'close') { stack.pop(); continue; }
      const t = top();
      if (!t || t.kind !== 'block') throw new Error('region outside a block');
      const region = { name: attrs.name, widget: attrs.widget, protos: [] };
      t.proto.regions.push(region);
      if (tag.kind === 'open') stack.push({ kind: 'region', region });
    }
  }
  return roots;
}

/** node kind -> how many the run needs (`index` null = one, `h2[2]` = two). */
/**
 * The node slots a prototype's refs imply. Each slot is a set of acceptable
 * node kinds (`p|h2|…`, or `*` for any); a ref with index n needs n slots of
 * that kind, and refs sharing a node (img/src, img/alt) share one slot.
 */
function slotsOf(proto) {
  const need = new Map(); // node-set string -> how many the run needs
  for (const v of Object.values(proto.fields)) {
    const r = parseRef(v); // includes match-only refs (no /part)
    if (!r) continue;
    need.set(r.node, Math.max(need.get(r.node) ?? 0, r.index ?? 1));
  }
  const slots = [];
  for (const [nodeSet, count] of need) for (let i = 0; i < count; i += 1) slots.push(nodeSet.split('|'));
  return slots;
}
// `h` is the heading at the current nesting depth (relative); `h*` is any
// heading; `h2` is absolute. `depth` = title level + nesting.
const nodeInSlot = (node, kinds, depth) => kinds.includes('*') || kinds.includes(kindOf(node))
  || (kinds.includes('h*') && /^h[1-6]$/.test(kindOf(node)))
  || (kinds.includes('h') && kindOf(node) === `h${depth}`);
const kindCount = (slots) => slots.reduce((n, s) => n + s.length, 0); // fewer kinds = more specific
const isLeaf = (p) => !p.regions?.length && slotsOf(p).length > 0;

// ------------------------------------------------------------------ nodes ----

/**
 * Top-level mdast nodes, normalised: a paragraph whose only child is an image
 * becomes an image node (a standalone image is its own block). Links stay
 * inline and are reached by path navigation.
 */
function topNodes(markdown) {
  return mdParser.parse(markdown).children.map((n) => (
    n.type === 'paragraph' && n.children?.length === 1 && n.children[0].type === 'image'
      ? n.children[0]
      : n
  ));
}

const nodeText = (node) => (
  node.value !== undefined ? node.value : (node.children || []).map(nodeText).join('')
);

function resolvePart(node, ref) {
  switch (ref.part) {
    // A table cell's content is inline; wrap it as a paragraph so it becomes a
    // slate value like any other block.
    case 'slate': return blockToSlate(node.type === 'tableCell' ? { type: 'paragraph', children: node.children } : node);
    case 'text': return nodeText(node);
    case 'src': return node.url;
    case 'alt': return node.alt;
    case 'lang': return node.lang;
    default: throw new Error(`unhandled ref part: ${ref.part}`);
  }
}

// ----------------------------------------------------------- leaf matching ---

/** Does the run of `slots.length` nodes at `i` fill every slot (a bijection)? */
function runAt(nodes, i, slots, depth) {
  const size = slots.length;
  if (size === 0 || i + size > nodes.length) return null;
  const run = nodes.slice(i, i + size);
  const used = new Set();
  for (const kinds of slots) {
    const j = run.findIndex((n, k) => !used.has(k) && nodeInSlot(n, kinds, depth));
    if (j < 0) return null;
    used.add(j);
  }
  return used.size === run.length ? run : null;
}

/** Resolve a ref against a run: the index-th node whose kind is in the ref's set. */
function resolveRef(run, ref, depth) {
  const kinds = ref.node.split('|');
  const node = run.filter((n) => nodeInSlot(n, kinds, depth))[(ref.index ?? 1) - 1];
  if (!node) throw new Error(`ref ${ref.node}[${ref.index ?? 1}] not in run`);
  return resolvePart(node, ref);
}

function leafBlock(proto, run, depth) {
  const block = { '@type': proto.type };
  for (const [field, val] of Object.entries(proto.fields)) {
    const ref = parseRef(val);
    // `_` is the discard sink, and a no-/part ref has nothing to store: both
    // consume their node for the pattern but keep nothing on the block.
    if (field === '_' || (ref && ref.part === null)) continue;
    block[field] = ref ? resolveRef(run, ref, depth) : val;
  }
  return block;
}

/** Match one bare-markdown block starting at `i`; returns {block, len}. */
function matchRun(protos, nodes, i, depth) {
  const ordered = protos.filter(isLeaf)
    .map((p) => ({ p, slots: slotsOf(p) }))
    .sort((a, b) => b.slots.length - a.slots.length || kindCount(a.slots) - kindCount(b.slots));
  for (const { p, slots } of ordered) {
    const run = runAt(nodes, i, slots, depth);
    if (run) return { block: leafBlock(p, run, depth), len: run.length };
  }
  throw new Error(`no prototype matches node kind: ${kindOf(nodes[i])} at depth ${depth}`);
}

// --------------------------------------------------------- scoped matching ---

/** Split nodes into groups, each starting at a delimiter (a heading at `depth`). */
function splitAt(nodes, delim, depth) {
  const isDelim = (n) => (delim === 'h' ? kindOf(n) === `h${depth}` : kindOf(n) === delim);
  const groups = [];
  for (const n of nodes) {
    if (isDelim(n)) groups.push([n]);
    else if (groups.length) groups[groups.length - 1].push(n);
    else throw new Error(`content before first ${delim} delimiter`);
  }
  return groups;
}

/** The heading ref an item repeats on (`h` relative, or `h2` absolute). */
function delimiterOf(item) {
  for (const v of Object.values(item.fields)) {
    const r = parseRef(v);
    if (r && /^h([1-6])?$/.test(r.node)) return r.node;
  }
  throw new Error('a repeating item needs a heading delimiter ref');
}

// An object_list item's delimiter sits at `depth`; its content is one deeper.
function decodeItem(protos, item, group, depth) {
  const result = {};
  const consumed = new Set();
  for (const [field, val] of Object.entries(item.fields)) {
    const ref = parseRef(val);
    if (!ref) { result[field] = val; continue; }
    const node = group.filter((n) => nodeInSlot(n, ref.node.split('|'), depth))[(ref.index ?? 1) - 1];
    if (!node) throw new Error(`item ref ${ref.node} not found in item`);
    consumed.add(node);
    if (field !== '_' && ref.part !== null) result[field] = resolvePart(node, ref);
  }
  // The implicit remainder region only appears when nodes are left over: a panel
  // keeps its content, but a tab (label + fence, both consumed) has none.
  const remainder = group.filter((n) => !consumed.has(n));
  if (remainder.length) result.blocks = matchNodes(protos, remainder, depth + 1);
  return result;
}

// Nodes whose children ARE the region items (already nested in mdast), so the
// region iterates them rather than splitting a flat stream at a delimiter.
const STRUCTURAL = new Set(['table', 'tr']);

/** Decode one item from a single already-structured node (a tr, a td). */
function decodeItemNode(protos, item, node, depth) {
  const result = {};
  for (const [field, val] of Object.entries(item.fields)) {
    const ref = parseRef(val);
    if (!ref) { result[field] = val; continue; }
    if (field !== '_' && ref.part !== null) result[field] = resolvePart(node, ref);
  }
  for (const region of item.regions || []) result[region.name] = decodeRegion(protos, region, [node], depth);
  return result;
}

function decodeRegion(protos, region, inner, depth) {
  if (region.widget === 'blocks_layout') { // a plain block sequence one level
    return matchNodes([...protos, ...region.protos], inner, depth + 1); // deeper, with scoped protos
  }
  const item = region.protos[0];
  if (inner.length === 1 && STRUCTURAL.has(kindOf(inner[0]))) { // iterate-children (tables)
    return inner[0].children.map((child) => decodeItemNode(protos, item, child, depth));
  }
  const delim = delimiterOf(item); // object_list: delimiter at `depth`, content one deeper
  return splitAt(inner, delim, depth).map((group) => decodeItem(protos, item, group, depth));
}

/**
 * Pull explicit `<region name=X>…</region>` tags out of a body: a local override
 * where the instance says exactly which content is that region. Returns the
 * region-name → its inner nodes, and the nodes left outside any region.
 */
function splitRegions(nodes) {
  const regions = {}, rest = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    const tag = n.type === 'html' ? tagOf(n.value) : null;
    if (tag && tag.name === 'region' && tag.kind === 'open') {
      let nest = 1, j = i + 1;
      for (; j < nodes.length && nest; j += 1) {
        const m = nodes[j].type === 'html' ? tagOf(nodes[j].value) : null;
        if (m && m.name === 'region' && m.kind === 'open') nest += 1;
        else if (m && m.name === 'region' && m.kind === 'close') nest -= 1;
      }
      regions[typedAttrs(n.value).name] = nodes.slice(i + 1, j - 1);
      i = j;
    } else { rest.push(n); i += 1; }
  }
  return { regions, rest };
}

/**
 * Pull `<fields …/>` tags out of a body and merge their values: a local override
 * that sets named fields on the enclosing block without a data blob. Typed
 * attrs set fields directly; a `data='…'` attr carries object fields. Returns
 * the merged fields and the content nodes left over.
 */
function extractFields(nodes) {
  const fields = {}, rest = [];
  for (const n of nodes) {
    const tag = n.type === 'html' ? tagOf(n.value) : null;
    if (tag && tag.name === 'fields') {
      const { data, ...attrs } = typedAttrs(n.value);
      Object.assign(fields, attrs);
      if (data) Object.assign(fields, JSON.parse(data));
    } else rest.push(n);
  }
  return { fields, rest };
}

/** Set a possibly-dotted path (`table.rows`) on an object. */
function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i += 1) { o[parts[i]] ??= {}; o = o[parts[i]]; }
  o[parts[parts.length - 1]] = value;
}

/** Decode an explicit `<block type=X>` tag with body `inner`. */
function decodeTag(protos, attrs, inner, depth) {
  const { type, ...override } = attrs;

  const container = protos.find((p) => p.type === type && p.regions.length);
  if (container) {
    const block = { '@type': type };
    for (const [k, v] of Object.entries(container.fields)) if (!parseRef(v)) block[k] = v;
    for (const [k, v] of Object.entries(override)) setPath(block, k, v); // dotted (table.celled) supported
    // Consume the container's own scalar refs from the body front (a grid
    // `headline="${h}"`), optionally -- absent leading heading = no headline --
    // then the region gets the remainder.
    const consumed = new Set();
    for (const [field, val] of Object.entries(container.fields)) {
      const ref = parseRef(val);
      if (!ref || ref.part === null || field === '_') continue;
      const node = inner.find((n) => !consumed.has(n) && nodeInSlot(n, ref.node.split('|'), depth));
      if (node) { consumed.add(node); block[field] = resolvePart(node, ref); }
    }
    const rest = inner.filter((n) => !consumed.has(n));
    // An explicit `<region name=X>` in the instance body overrides which content
    // is region X (a local override); regions without one take the remainder.
    const { regions: explicit, rest: bodyRest } = splitRegions(rest);
    for (const region of container.regions) {
      const content = region.name in explicit ? explicit[region.name] : bodyRest;
      setPath(block, region.name, decodeRegion(protos, region, content, depth));
    }
    // A markdown table's first row is its header (GFM); derive the cell type.
    if (Array.isArray(block.table?.rows)) {
      block.table.rows.forEach((row, i) => row.cells.forEach((c) => { c.type = i === 0 ? 'header' : 'data'; }));
    }
    return block;
  }

  // A leaf light tag: `<fields>` merged in, the rest matched by the type's leaf
  // prototype whose pattern fills the remaining body.
  const { fields: extra, rest: content } = extractFields(inner);
  const leaves = protos.filter((p) => p.type === type && isLeaf(p))
    .sort((a, b) => slotsOf(b).length - slotsOf(a).length || kindCount(slotsOf(a)) - kindCount(slotsOf(b)));
  for (const proto of leaves) {
    const run = runAt(content, 0, slotsOf(proto), depth);
    if (run && run.length === content.length) {
      const block = leafBlock(proto, content, depth);
      Object.assign(block, extra);
      for (const [k, v] of Object.entries(override)) block[k] = v;
      return block;
    }
  }
  throw new Error(`no leaf prototype for <block type="${type}"> matching its body`);
}

/** A tier-3 self-closing data tag -> the raw block it stores. The `uid` is
 *  redundant (assignments carry it) and dropped; `data` merges the JSON fields. */
function decodeRawTag(attrs) {
  const { type, uid, data, ...rest } = attrs;
  const block = { '@type': type, ...rest };
  if (data) Object.assign(block, JSON.parse(data));
  return block;
}

/** Walk a node stream, handling explicit `<block>` tags and bare runs, at the
 *  current heading `depth` (title level + nesting; top content is 2). */
function matchNodes(protos, nodes, depth = 2) {
  const blocks = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.type === 'html') {
      const tag = tagOf(n.value);
      if (tag && tag.name === 'block' && tag.kind === 'self') { // tier-3 data tag
        blocks.push(decodeRawTag(typedAttrs(n.value)));
        i += 1;
        continue;
      }
      if (!tag || tag.name !== 'block' || tag.kind !== 'open') {
        throw new Error(`unexpected html node: ${n.value}`);
      }
      let nest = 1, j = i + 1;
      for (; j < nodes.length && nest; j++) {
        const m = nodes[j].type === 'html' ? tagOf(nodes[j].value) : null;
        if (m && m.name === 'block' && m.kind === 'open') nest += 1;
        else if (m && m.name === 'block' && m.kind === 'close') nest -= 1;
      }
      blocks.push(decodeTag(protos, typedAttrs(n.value), nodes.slice(i + 1, j - 1), depth));
      i = j;
      continue;
    }
    const { block, len } = matchRun(protos, nodes, i, depth);
    blocks.push(block);
    i += len;
  }
  return blocks;
}

/** Match a markdown body against prototypes, producing block objects. */
export function matchBlocks(prototypes, markdown, depth = 2) {
  return matchNodes(prototypes, topNodes(markdown), depth);
}

/**
 * Decode a full markdown page -> block JSON. The frontmatter carries the page
 * metadata, the `prototypes` (the mapping) and the `assignments` (uids + type
 * anchor); the body is the content. This is the read side the mock API needs.
 */
export function decodePage(md) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  if (!m) throw new Error('page has no frontmatter');
  const { assignments, prototypes, ...metadata } = YAML.parse(m[1]) ?? {};
  const protos = parsePrototypes(prototypes ?? '');
  const keyed = keyBlocks(matchBlocks(protos, md.slice(m[0].length)), assignments ?? [], protos);
  return { ...metadata, ...keyed };
}

// ------------------------------------------------------------------ emit -----

/** Reconstruct the markdown for one pattern node from the fields that feed it. */
function emitNode(block, entry, depth) {
  const p = entry.parts;
  // `/slate` renders whatever the value is (p, h2, list…), so it ignores the
  // node-kind set the ref matched on.
  if (p.slate) return slateToMd(block[p.slate]);
  if (entry.node === 'p' && p.text) return block[p.text];
  if (entry.node === 'img') return `![${p.alt ? block[p.alt] : ''}](${block[p.src]})`;
  if (entry.node === 'hr') return '---';
  if (/^h[1-6]$/.test(entry.node)) return `${'#'.repeat(Number(entry.node[1]))} ${block[p.text] ?? ''}`;
  if (entry.node === 'h') return `${'#'.repeat(depth)} ${block[p.text] ?? ''}`; // relative
  if (entry.node === 'pre') return `\`\`\`${block[p.lang] ?? ''}\n${block[p.text] ?? ''}\n\`\`\``;
  throw new Error(`cannot emit node ${entry.node}`);
}

/** Reverse a set of prototype refs against an object, into markdown nodes. */
function emitFields(proto, obj, depth) {
  const nodes = [];
  for (const [field, v] of Object.entries(proto.fields)) {
    const ref = parseRef(v);
    if (!ref) continue;
    const key = `${ref.node}[${ref.index ?? 1}]`;
    let entry = nodes.find((e) => e.key === key);
    if (!entry) { entry = { key, node: ref.node, parts: {} }; nodes.push(entry); }
    if (ref.part !== null) entry.parts[ref.part] = field;
  }
  // An optional field that's absent (a grid with no headline) emits nothing; a
  // match-only node (no parts) always emits.
  return nodes
    .filter((e) => { const ps = Object.values(e.parts); return ps.length === 0 || ps.some((f) => obj[f] !== undefined); })
    .map((e) => emitNode(obj, e, depth)).join('\n\n');
}

/** Non-default string fields, as an attribute string for a `<block>` tag. */
function emitOverrides(proto, block) {
  const out = [];
  for (const [k, v] of Object.entries(block)) {
    if (k === '@type' || proto.regions.some((r) => r.name === k)) continue;
    const def = proto.fields[k];
    if (def !== undefined && parseRef(def)) continue; // a ref field is emitted inline, not as an attr
    if (def !== undefined && deepEqual(def, v)) continue; // matches default
    if (v === true) out.push(k); // HTML boolean; false is just absence
    else if (v === false) continue;
    else if (typeof v === 'number') out.push(`${k}=${v}`); // unquoted -> number
    else if (typeof v === 'string') out.push(`${k}="${v}"`);
    // objects can't be a clean attribute; verify-on-emit sends the block to tier-3
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

/** Emit one repeating item: its ref'd nodes (at `depth`), then remainder blocks
 *  one level deeper. */
function emitItem(protos, itemProto, item, depth) {
  const fields = emitFields(itemProto, item, depth);
  const rest = item.blocks ? emitBlocks(protos, item.blocks, depth + 1) : '';
  return [fields, rest].filter(Boolean).join('\n\n');
}

/** Emit a container block as a `<block type>` tag over its regions. */
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

function emitContainer(protos, proto, block, depth) {
  // A table-structured region (`table.rows`) emits a markdown table; if a cell
  // is too rich for one, renderTable returns null and verify-on-emit tier-3s it.
  const rowsRegion = proto.regions.find((r) => r.name.endsWith('rows'));
  if (rowsRegion) {
    const md = renderTable(getPath(block, rowsRegion.name));
    if (!md) throw new Error('table cell too rich for markdown'); // -> verify-on-emit fallback
    // Hoist the table's own true flags as dotted `table.celled` booleans; false
    // ones are semantic-ignored, so they need not be written.
    const tableObj = getPath(block, rowsRegion.name.split('.').slice(0, -1).join('.')) ?? {};
    const flags = Object.entries(tableObj).filter(([k, v]) => k !== 'rows' && v === true).map(([k]) => `table.${k}`);
    const attrs = [emitOverrides(proto, block).trim(), ...flags].filter(Boolean).join(' ');
    return `<block type="${block['@type']}"${attrs ? ` ${attrs}` : ''}>\n\n${md}\n\n</block>`;
  }
  const head = emitFields(proto, block, depth); // the container's own scalar refs (a grid headline)
  const body = proto.regions.map((region) => {
    const val = block[region.name];
    if (region.widget === 'blocks_layout') return emitBlocks([...protos, ...region.protos], val, depth + 1);
    return val.map((item) => emitItem(protos, region.protos[0], item, depth)).join('\n\n');
  }).join('\n\n');
  const inner = [head, body].filter(Boolean).join('\n\n');
  return `<block type="${block['@type']}"${emitOverrides(proto, block)}>\n\n${inner}\n\n</block>`;
}

/** Emit a leaf block by reversing its prototype's refs. */
function emitLeaf(protos, block, depth) {
  const leaves = protos.filter((p) => p.type === block['@type'] && isLeaf(p));
  // Prefer a prototype whose captured fields the block actually has, so a
  // caption-less image picks the 1-node prototype not the caption one. A
  // match-only ref (no /part) captures nothing, so it imposes no such need.
  const proto = leaves.find((p) => Object.entries(p.fields).every(([f, v]) => {
    const r = parseRef(v);
    return f === '_' || !r || r.part === null || block[f] !== undefined;
  })) ?? leaves[0];
  return emitFields(proto, block, depth);
}

/** Tier-3: an un-prototyped block -> a self-closing data tag (decodeRawTag reads it). */
function emitRawTag(block) {
  const { '@type': type, plaintext, ...rest } = block;
  const attrs = fmtTagAttrs(rest);
  return `<block type="${type}"${attrs ? ` ${attrs}` : ''} />`;
}

/**
 * Emit one block as markdown. A container (a type with regions) becomes a
 * `<block type>` tag over its regions; a leaf reverses its refs; a type with no
 * prototype falls back to a tier-3 data tag.
 */
function emitBlock(protos, block, depth) {
  const container = protos.find((p) => p.type === block['@type'] && p.regions.length);
  if (container) return emitContainer(protos, container, block, depth);
  if (protos.some((p) => p.type === block['@type'] && isLeaf(p))) return emitLeaf(protos, block, depth);
  return emitRawTag(block);
}

/** Wrap a block's bare markdown in an explicit `<block type>` tag. */
function emitTag(protos, block, depth) {
  return `<block type="${block['@type']}">\n\n${emitBlock(protos, block, depth)}\n\n</block>`;
}

/** Fields a leaf's clean form can't carry: not @type, not a ref (in the body),
 *  not a matching default. */
function uncoveredFields(proto, block) {
  const out = {};
  for (const [k, v] of Object.entries(block)) {
    if (k === '@type' || k === 'plaintext') continue;
    const def = proto.fields[k];
    if (def !== undefined && parseRef(def)) continue; // emitted in the body
    if (def !== undefined && deepEqual(def, v)) continue; // default
    out[k] = v;
  }
  return out;
}

/** A leaf's clean body plus a `<fields>` tag for whatever it can't carry --
 *  the verify-on-emit rung before tier-3. Null if there's nothing to hoist. */
function emitFieldsTag(protos, block, depth) {
  const proto = protos.find((p) => p.type === block['@type'] && isLeaf(p));
  if (!proto) return null;
  const extra = uncoveredFields(proto, block);
  if (!Object.keys(extra).length) return null;
  return `<block type="${block['@type']}">\n\n${emitLeaf(protos, block, depth)}\n\n<fields ${fmtTagAttrs(extra)} />\n\n</block>`;
}

/**
 * Comparison view for verify-on-emit: drop what is derived or default-nothing --
 * `plaintext`, empty text leaves, and empty objects (`styles:{}`, `credit:{}`) --
 * so a clean form that omits them still counts as reproducing the block. Matches
 * the parity harness's normalisation.
 */
function semantic(v) {
  if (Array.isArray(v)) return v.map(semantic).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'text' && v.text === '') return undefined;
    const out = {};
    for (const k of keys.sort()) {
      if (k === 'plaintext' || k === 'key') continue; // derived / internal identity
      if (v[k] === false) continue; // a false boolean is "off" -- nothing
      const r = semantic(v[k]);
      if (r === undefined) continue;
      if (r && typeof r === 'object' && !Array.isArray(r) && !Object.keys(r).length) continue;
      out[k] = r;
    }
    return out;
  }
  return v;
}
const semanticEqual = (a, b) => JSON.stringify(semantic(a)) === JSON.stringify(semantic(b));

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

const roundTrips = (protos, md, expected, depth) => {
  try { return semanticEqual(matchBlocks(protos, md, depth), expected); } catch { return false; }
};

/**
 * Emit an ordered block list as markdown, verifying on emit: each block is
 * written in its lightest form that still lets the sequence so far decode back
 * to exactly those blocks. The fallback chain is bare -> light `<block>` tag
 * (breaks an over-merge with a neighbour) -> tier-3 data tag. The last always
 * round-trips (decodeRawTag reads the full data), so emit can never lose a
 * block -- a field the clean form can't carry just lands in a data tag.
 */
export function emitBlocks(prototypes, blocks, depth = 2) {
  const parts = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const expected = blocks.slice(0, i + 1);
    const isContainer = prototypes.some((p) => p.type === block['@type'] && p.regions.length);
    // A container is already a tag, so light-wrapping it would double-nest. Each
    // candidate is generated lazily -- a clean form that can't be produced (a
    // table cell too rich for markdown) just throws and is skipped.
    const gens = isContainer
      ? [() => emitBlock(prototypes, block, depth), () => emitRawTag(block)]
      : [() => emitBlock(prototypes, block, depth), () => emitTag(prototypes, block, depth),
         () => emitFieldsTag(prototypes, block, depth), () => emitRawTag(block)];
    let chosen = null;
    for (const gen of gens) {
      let c; try { c = gen(); } catch { continue; }
      if (c != null && roundTrips(prototypes, [...parts, c].join('\n\n'), expected, depth)) { chosen = c; break; }
    }
    parts.push(chosen ?? emitRawTag(block));
  }
  return parts.join('\n\n');
}

/**
 * Reverse of `keyBlocks`: read a keyed page back into the ordered block list
 * `emitBlocks` takes, collecting uids/@ids into an assignments list in the same
 * depth-first order `keyBlocks` consumes. Region kinds come from the prototypes
 * (an object_list region's items get `@id`s even when they carry no child
 * blocks, e.g. codeExample tabs). The input is not mutated.
 */
export function unkeyBlocks(keyed, protos = []) {
  const regionsOf = (type) => protos.find((p) => p.type === type)?.regions ?? [];
  const assignments = [];
  const unkeyList = ({ blocks, blocks_layout }) => blocks_layout.items.map((uid) => {
    const block = { ...blocks[uid] };
    assignments.push({ uid, type: block['@type'] });
    for (const region of regionsOf(block['@type'])) {
      const val = block[region.name];
      if (region.widget === 'blocks_layout') {
        if (val && block.blocks_layout) {
          block[region.name] = unkeyList({ blocks: val, blocks_layout: block.blocks_layout });
          delete block.blocks_layout;
        }
        continue;
      }
      if (!Array.isArray(val)) continue; // object_list
      block[region.name] = val.map((item) => {
        assignments.push({ id: item['@id'] });
        const { '@id': _id, blocks_layout: _bl, blocks: kids, ...rest } = item;
        return kids ? { ...rest, blocks: unkeyList({ blocks: kids, blocks_layout: _bl }) } : rest;
      });
    }
    return block;
  });
  return { blocks: unkeyList(keyed), assignments };
}

/**
 * Emit a keyed page to a clean markdown body plus its frontmatter assignments,
 * read straight from the keyed shape.
 */
export function emitPage(prototypes, keyed) {
  const { blocks, assignments } = unkeyBlocks(keyed, prototypes);
  return { markdown: emitBlocks(prototypes, blocks), assignments };
}

// ------------------------------------------------------------- uid keying ----

/**
 * Key a matched block tree into stored shape from an ordered assignments list,
 * consumed depth-first (pre-order): a block's uid, then each object_list item's
 * `@id`, then that item's child blocks. Region kinds come from the prototypes.
 * Assignments are `{uid, type}` for a block (the `type` anchors the positional
 * bind) and `{id}` for an object_list item. Blocks are mutated in place.
 */
export function keyBlocks(blocks, assignments, protos = []) {
  const regionsOf = (type) => protos.find((p) => p.type === type)?.regions ?? [];
  let i = 0;
  const next = () => {
    if (i >= assignments.length) throw new Error('ran out of assignments');
    return assignments[i++];
  };

  const keyList = (list) => {
    const out = {}, items = [];
    for (const block of list) {
      const a = next();
      if (a.type !== block['@type']) {
        throw new Error(`assignment ${a.uid} type "${a.type}" does not anchor block type "${block['@type']}"`);
      }
      for (const region of regionsOf(block['@type'])) {
        const val = block[region.name];
        if (region.widget === 'blocks_layout') {
          if (Array.isArray(val)) { const k = keyList(val); block[region.name] = k.blocks; block.blocks_layout = k.blocks_layout; }
          continue;
        }
        if (!Array.isArray(val)) continue; // object_list
        for (const item of val) {
          const ia = next();
          if (!ia.id) throw new Error(`expected an item @id assignment, got ${JSON.stringify(ia)}`);
          item['@id'] = ia.id;
          if (Array.isArray(item.blocks)) { const k = keyList(item.blocks); item.blocks = k.blocks; item.blocks_layout = k.blocks_layout; }
        }
      }
      out[a.uid] = block;
      items.push(a.uid);
    }
    return { blocks: out, blocks_layout: { items } };
  };

  const result = keyList(blocks);
  if (i !== assignments.length) throw new Error(`${assignments.length - i} assignments left over`);
  return result;
}
