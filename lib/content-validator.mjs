/**
 * Pure, format-agnostic content-object validation.
 *
 * The same checks whether the object came from `data.json` or a markdown decode,
 * because they read the content object, not a file. This is the authoring/dev
 * layer -- run it on every load (the mock API drives it over its mounts) so a
 * `--watch` restart surfaces problems while you develop, not when a test runs.
 *
 * Scope is PER-CONTENT (`validateContent`): `blocks_layout` integrity and, with a
 * schema, that every block type is one the frontend knows. Cross-tree reference
 * existence (does an href target exist?) needs the whole tree, so it lives in
 * `validateTree`, which builds the uid/path sets and reuses the SAME
 * reference-classification the distribution validator uses (lib/content-refs.cjs).
 */
import { LINK_FIELDS, refStrings, refFailure } from './content-refs.cjs';

/** Yield [id, block] for every block, descending into nested containers: a
 *  container holds child blocks under `blocks`, and object_list items (panels,
 *  tabs, cards) hold their own `blocks` inside an array field. */
function* walkBlocks(blocks) {
  for (const [id, block] of Object.entries(blocks || {})) {
    if (!block || typeof block !== 'object') continue;
    yield [id, block];
    if (block.blocks) yield* walkBlocks(block.blocks);
    for (const v of Object.values(block)) {
      if (Array.isArray(v)) for (const item of v) if (item && item.blocks) yield* walkBlocks(item.blocks);
    }
  }
}

/** Every id listed in a container's blocks_layout must be a block of that same
 *  container. Covers the standard `items` list and any other array key. */
function layoutErrors(container, where, out) {
  const bl = container.blocks_layout;
  const blocks = container.blocks || {};
  if (!bl || typeof bl !== 'object') return;
  for (const [key, val] of Object.entries(bl)) {
    const items = Array.isArray(val) ? val : (val && Array.isArray(val.items) ? val.items : null);
    if (!items) continue;
    for (const ref of items) {
      if (!(ref in blocks)) out.push(`${where}blocks_layout.${key} references missing block ${ref}`);
    }
  }
}

/**
 * @param content a Plone content object ({ blocks, blocks_layout, @type, ... }).
 * @param opts.schema optional block-schema map (e.g. sharedBlocksConfig): its
 *   KEYS are the known block types. When given, an unknown type is flagged.
 * @param opts.label a prefix for messages (defaults to the content @id).
 * @returns string[] of problems (empty = valid).
 */
export function validateContent(content, { schema, label } = {}) {
  const out = [];
  const prefix = `${label ?? content?.['@id'] ?? '?'}: `;
  const known = schema ? new Set(Object.keys(schema)) : null;

  layoutErrors(content, prefix, out);
  for (const [id, block] of walkBlocks(content.blocks)) {
    // a nested container has its own layout to check
    if (block.blocks_layout) layoutErrors(block, `${prefix}block ${id} `, out);
    for (const v of Object.values(block)) {
      if (Array.isArray(v)) for (const item of v) {
        if (item && item.blocks_layout) layoutErrors(item, `${prefix}block ${id} item `, out);
      }
    }
    // A slate value must be a SINGLE top-level node. The editor makes one block
    // per paragraph, and a paragraph boundary is a block boundary, so a multi-node
    // value (a grid/table cell that packed heading + paragraph into one slate) has
    // no bare-markdown spelling. lib/slate-normalize collapses it to one node.
    if (block['@type'] === 'slate' && Array.isArray(block.value) && block.value.length > 1) {
      out.push(`${prefix}block ${id} slate value has ${block.value.length} top-level nodes (expected 1; run normalizeSlateValue)`);
    }
    // schema: is this a type the frontend knows how to render?
    if (known && block['@type'] && !known.has(block['@type'])) {
      out.push(`${prefix}block ${id} unknown type "${block['@type']}" (not in schema)`);
    }
  }
  return out;
}

/** A block's reference fields, descending into object_list/column sub-items the
 *  same way the distribution validator does. */
function* blockRefs(id, block) {
  for (const field of LINK_FIELDS) {
    if (field in block) for (const ref of refStrings(block[field])) yield { id, field, ref };
  }
  for (const key of ['items', 'columns', 'column_items']) {
    const arr = block[key];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i += 1) {
      const it = arr[i];
      if (it && typeof it === 'object') yield* blockRefs(`${id}.${key}[${i}]`, it);
    }
  }
}

/**
 * Validate a whole tree of content objects: every per-content check, PLUS
 * cross-tree reference existence -- a `resolveuid`/href/image reference must
 * point at a uid or path that exists somewhere in the tree.
 *
 * @param items Map or array of content objects.
 */
export function validateTree(items, { schema } = {}) {
  const list = items instanceof Map ? [...items.values()] : Array.from(items);
  const paths = new Set();
  const uids = new Set();
  for (const c of list) {
    if (c?.['@id']) paths.add(c['@id']);
    if (c?.UID) uids.add(c.UID);
  }
  const probe = { hasUid: (u) => uids.has(u), hasPath: (p) => paths.has(p) };

  const out = [];
  for (const content of list) {
    out.push(...validateContent(content, { schema }));
    const prefix = `${content?.['@id'] ?? '?'}: `;
    for (const [id, block] of walkBlocks(content.blocks)) {
      for (const { id: rid, field, ref } of blockRefs(id, block)) {
        const reason = refFailure(ref, probe);
        if (reason) out.push(`${prefix}block ${rid} ${field}: ${reason}`);
      }
    }
  }
  return out;
}
