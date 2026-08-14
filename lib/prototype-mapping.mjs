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
import { tagOf, mdParser, blockToSlate, slateToMd } from './blockmd.mjs';

// ${node[n]/part} -- node type, optional match-index, accessor part.
const REF_RE = /^\$\{([a-z0-9]+)(?:\[(\d+)\])?\/([a-z]+)\}$/i;

function parseRef(v) {
  if (typeof v !== 'string') return null;
  const m = REF_RE.exec(v.trim());
  if (!m) return null;
  return { node: m[1], index: m[2] ? Number(m[2]) : null, part: m[3] };
}

/** Canonical node kind: a heading is `h2` etc, so refs can name a level. */
const kindOf = (n) => (n.type === 'heading' ? `h${n.depth}` : n.type);

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
    else if (t.kind === 'region') t.region.item = proto;
    else throw new Error('a block prototype must sit inside a region, not a block');
  };

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const tag = tagOf(line);
    if (!tag) continue;

    if (tag.name === 'block') {
      const { type, ...fields } = tag.attrs;
      const proto = { type, fields, regions: [] };
      if (tag.kind === 'close') { stack.pop(); continue; }
      place(proto);
      if (tag.kind === 'open') stack.push({ kind: 'block', proto });
    } else if (tag.name === 'region') {
      if (tag.kind === 'close') { stack.pop(); continue; }
      const t = top();
      if (!t || t.kind !== 'block') throw new Error('region outside a block');
      const region = { name: tag.attrs.name, widget: tag.attrs.widget, item: null };
      t.proto.regions.push(region);
      if (tag.kind === 'open') stack.push({ kind: 'region', region });
    }
  }
  return roots;
}

/** node kind -> how many the run needs (`index` null = one, `h2[2]` = two). */
function patternOf(proto) {
  const counts = {};
  for (const v of Object.values(proto.fields)) {
    const r = parseRef(v);
    if (!r) continue;
    counts[r.node] = Math.max(counts[r.node] ?? 0, r.index ?? 1);
  }
  return counts;
}
const patternSize = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);
const isLeaf = (p) => !p.regions?.length && patternSize(patternOf(p)) > 0;

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
    case 'slate': return blockToSlate(node);
    case 'text': return nodeText(node);
    case 'src': return node.url;
    case 'alt': return node.alt;
    default: throw new Error(`unhandled ref part: ${ref.part}`);
  }
}

// ----------------------------------------------------------- leaf matching ---

/** Does the run of `size` nodes at `i` hold exactly the pattern's kinds? */
function runAt(nodes, i, counts) {
  const size = patternSize(counts);
  if (size === 0 || i + size > nodes.length) return null;
  const run = nodes.slice(i, i + size);
  const have = {};
  for (const n of run) have[kindOf(n)] = (have[kindOf(n)] ?? 0) + 1;
  const kinds = new Set([...Object.keys(counts), ...Object.keys(have)]);
  for (const k of kinds) if ((have[k] ?? 0) !== (counts[k] ?? 0)) return null;
  return run;
}

/** Resolve a ref against a run: the index-th node of its kind. */
function resolveRef(run, ref) {
  const node = run.filter((n) => kindOf(n) === ref.node)[(ref.index ?? 1) - 1];
  if (!node) throw new Error(`ref ${ref.node}[${ref.index ?? 1}] not in run`);
  return resolvePart(node, ref);
}

function leafBlock(proto, run) {
  const block = { '@type': proto.type };
  for (const [field, val] of Object.entries(proto.fields)) {
    const ref = parseRef(val);
    block[field] = ref ? resolveRef(run, ref) : val;
  }
  return block;
}

/** Match one bare-markdown block starting at `i`; returns {block, len}. */
function matchRun(protos, nodes, i) {
  const ordered = protos.filter(isLeaf)
    .map((p) => ({ p, counts: patternOf(p) }))
    .sort((a, b) => patternSize(b.counts) - patternSize(a.counts));
  for (const { p, counts } of ordered) {
    const run = runAt(nodes, i, counts);
    if (run) return { block: leafBlock(p, run), len: run.length };
  }
  throw new Error(`no prototype matches node kind: ${kindOf(nodes[i])}`);
}

// --------------------------------------------------------- scoped matching ---

/** Split nodes into groups, each starting at a delimiter node. */
function splitAt(nodes, delim) {
  const groups = [];
  for (const n of nodes) {
    if (kindOf(n) === delim) groups.push([n]);
    else if (groups.length) groups[groups.length - 1].push(n);
    else throw new Error(`content before first ${delim} delimiter`);
  }
  return groups;
}

/** The heading ref an item repeats on. */
function delimiterOf(item) {
  for (const v of Object.values(item.fields)) {
    const r = parseRef(v);
    if (r && /^h[1-6]$/.test(r.node)) return r.node;
  }
  throw new Error('a repeating item needs a heading delimiter ref');
}

function decodeItem(protos, item, group) {
  const result = {};
  const consumed = new Set();
  for (const [field, val] of Object.entries(item.fields)) {
    const ref = parseRef(val);
    if (!ref) { result[field] = val; continue; }
    const node = group.filter((n) => kindOf(n) === ref.node)[(ref.index ?? 1) - 1];
    if (!node) throw new Error(`item ref ${ref.node} not found`);
    consumed.add(node);
    result[field] = resolvePart(node, ref);
  }
  const remainder = group.filter((n) => !consumed.has(n));
  result.blocks = matchNodes(protos, remainder); // implicit remainder region
  return result;
}

function decodeRegion(protos, region, inner) {
  const delim = delimiterOf(region.item);
  return splitAt(inner, delim).map((group) => decodeItem(protos, region.item, group));
}

/** Decode an explicit `<block type=X>` tag with body `inner`. */
function decodeTag(protos, attrs, inner) {
  const { type, ...override } = attrs;

  const container = protos.find((p) => p.type === type && p.regions.length);
  if (container) {
    const block = { '@type': type };
    for (const [k, v] of Object.entries(container.fields)) if (!parseRef(v)) block[k] = v;
    for (const [k, v] of Object.entries(override)) block[k] = v;
    for (const region of container.regions) block[region.name] = decodeRegion(protos, region, inner);
    return block;
  }

  // A leaf light tag: the type's leaf prototype whose pattern fills the body.
  const leaves = protos.filter((p) => p.type === type && isLeaf(p))
    .sort((a, b) => patternSize(patternOf(b)) - patternSize(patternOf(a)));
  for (const proto of leaves) {
    const run = runAt(inner, 0, patternOf(proto));
    if (run && run.length === inner.length) {
      const block = leafBlock(proto, inner);
      for (const [k, v] of Object.entries(override)) block[k] = v;
      return block;
    }
  }
  throw new Error(`no leaf prototype for <block type="${type}"> matching its body`);
}

/** Walk a node stream, handling explicit `<block>` tags and bare runs. */
function matchNodes(protos, nodes) {
  const blocks = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.type === 'html') {
      const tag = tagOf(n.value);
      if (!tag || tag.name !== 'block' || tag.kind !== 'open') {
        throw new Error(`unexpected html node: ${n.value}`);
      }
      let depth = 1, j = i + 1;
      for (; j < nodes.length && depth; j++) {
        const m = nodes[j].type === 'html' ? tagOf(nodes[j].value) : null;
        if (m && m.name === 'block' && m.kind === 'open') depth += 1;
        else if (m && m.name === 'block' && m.kind === 'close') depth -= 1;
      }
      blocks.push(decodeTag(protos, tag.attrs, nodes.slice(i + 1, j - 1)));
      i = j;
      continue;
    }
    const { block, len } = matchRun(protos, nodes, i);
    blocks.push(block);
    i += len;
  }
  return blocks;
}

/** Match a markdown body against prototypes, producing block objects. */
export function matchBlocks(prototypes, markdown) {
  return matchNodes(prototypes, topNodes(markdown));
}

// ------------------------------------------------------------------ emit -----

/** Reconstruct the markdown for one pattern node from the fields that feed it. */
function emitNode(block, entry) {
  const p = entry.parts;
  if (entry.node === 'paragraph') {
    if (p.slate) return slateToMd(block[p.slate]);
    if (p.text) return block[p.text];
  }
  if (entry.node === 'image') return `![${p.alt ? block[p.alt] : ''}](${block[p.src]})`;
  throw new Error(`cannot emit node ${entry.node}`);
}

/** Non-default string fields, as an attribute string for a `<block>` tag. */
function emitOverrides(proto, block) {
  const out = [];
  for (const [k, v] of Object.entries(block)) {
    if (k === '@type' || proto.regions.some((r) => r.name === k)) continue;
    const def = proto.fields[k];
    if (def !== undefined && !parseRef(def) && String(def) === String(v)) continue; // matches default
    if (typeof v === 'string') out.push(`${k}="${v}"`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

/** Emit one repeating item: its heading ref(s), then the remainder blocks. */
function emitItem(protos, itemProto, item) {
  const parts = [];
  for (const [field, v] of Object.entries(itemProto.fields)) {
    const ref = parseRef(v);
    if (!ref) continue;
    if (/^h[1-6]$/.test(ref.node) && ref.part === 'text') {
      parts.push(`${'#'.repeat(Number(ref.node[1]))} ${item[field]}`);
    } else {
      throw new Error(`cannot emit item ref ${ref.node}/${ref.part}`);
    }
  }
  parts.push(emitBlocks(protos, item.blocks)); // implicit remainder
  return parts.join('\n\n');
}

/** Emit a container block as a `<block type>` tag over its regions. */
function emitContainer(protos, proto, block) {
  const body = proto.regions
    .map((region) => block[region.name].map((item) => emitItem(protos, region.item, item)).join('\n\n'))
    .join('\n\n');
  return `<block type="${block['@type']}"${emitOverrides(proto, block)}>\n\n${body}\n\n</block>`;
}

/** Emit a leaf block by reversing its prototype's refs. */
function emitLeaf(protos, block) {
  const leaves = protos.filter((p) => p.type === block['@type'] && isLeaf(p));
  // Prefer a prototype whose ref fields the block actually has, so a caption-
  // less image picks the 1-node prototype rather than emitting an empty caption.
  const proto = leaves.find((p) => Object.entries(p.fields)
    .every(([f, v]) => !parseRef(v) || block[f] !== undefined)) ?? leaves[0];
  if (!proto) throw new Error(`no prototype for type: ${block['@type']}`);
  const nodes = [];
  for (const [field, v] of Object.entries(proto.fields)) {
    const ref = parseRef(v);
    if (!ref) continue;
    const key = `${ref.node}[${ref.index ?? 1}]`;
    let entry = nodes.find((e) => e.key === key);
    if (!entry) { entry = { key, node: ref.node, parts: {} }; nodes.push(entry); }
    entry.parts[ref.part] = field;
  }
  return nodes.map((e) => emitNode(block, e)).join('\n\n');
}

/**
 * Emit one block as markdown. A container (a type with regions) becomes a
 * `<block type>` tag over its regions; a leaf reverses its refs, the fields'
 * declaration order fixing a deterministic output order that verify-on-emit
 * confirms.
 */
function emitBlock(protos, block) {
  const container = protos.find((p) => p.type === block['@type'] && p.regions.length);
  return container ? emitContainer(protos, container, block) : emitLeaf(protos, block);
}

/** Wrap a block's bare markdown in an explicit `<block type>` tag. */
function emitTag(protos, block) {
  return `<block type="${block['@type']}">\n\n${emitBlock(protos, block)}\n\n</block>`;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

const roundTrips = (protos, md, expected) => {
  try { return deepEqual(matchBlocks(protos, md), expected); } catch { return false; }
};

/**
 * Emit an ordered block list as markdown, verifying on emit: each block is
 * written in its lightest bare form unless doing so would stop the sequence so
 * far from decoding back to exactly those blocks (e.g. a bare paragraph that
 * would merge with a following image) -- then it falls back to an explicit tag.
 */
export function emitBlocks(prototypes, blocks) {
  const parts = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const expected = blocks.slice(0, i + 1);
    const bare = emitBlock(prototypes, blocks[i]);
    parts.push(roundTrips(prototypes, [...parts, bare].join('\n\n'), expected)
      ? bare
      : emitTag(prototypes, blocks[i]));
  }
  return parts.join('\n\n');
}

// ------------------------------------------------------------- uid keying ----

/** An object_list region: an array of items, each with its own `blocks` list. */
const isItemArray = (v) => Array.isArray(v) && v.length > 0
  && v.every((el) => el && typeof el === 'object' && Array.isArray(el.blocks));

/**
 * Key a matched block tree into stored shape from an ordered assignments list,
 * consumed depth-first (pre-order): a block's uid, then each object_list item's
 * `@id`, then that item's child blocks, recursively. Assignments are
 * `{uid, type}` for a block (the stored `type` anchors the positional bind, so
 * a desync fails loudly) and `{id}` for an object_list item.
 *
 * A block's `blocks` list and each item's `blocks` list become a `blocks` dict
 * + `blocks_layout`. Blocks are mutated in place.
 */
export function keyBlocks(blocks, assignments) {
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
      for (const val of Object.values(block)) {
        if (!isItemArray(val)) continue;
        for (const item of val) {
          const ia = next();
          if (!ia.id) throw new Error(`expected an item @id assignment, got ${JSON.stringify(ia)}`);
          item['@id'] = ia.id;
          const keyed = keyList(item.blocks);
          item.blocks = keyed.blocks;
          item.blocks_layout = keyed.blocks_layout;
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
