/**
 * Crawls a Plone REST API to discover one example of each (block @type, variation) pair.
 *
 * Used by globalSetup to write .discovered-blocks.json, which the
 * block-sanity spec reads at module load time to parametrize tests.
 *
 * Works against any Plone API (mock or real) — no filesystem access needed.
 * When blocksConfig (schemas) is provided, also discovers object_list sub-blocks.
 *
 * @typedef {{ blockType: string, variation: string, blockId: string, pagePath: string, blockData: Object, isListing: boolean }} DiscoveredBlock
 */

/**
 * Build a map of blockType → { fieldName → idField } for object_list fields.
 * Same logic as BlockVerificationHelper.buildObjectListFieldsMap but in plain JS.
 * @param {Object} blocksConfig - Block schemas from initBridge INIT message
 * @returns {Map<string, Map<string, string>>}
 */
function buildObjectListFieldsMap(blocksConfig) {
  const map = new Map();
  for (const [blockType, blockDef] of Object.entries(blocksConfig || {})) {
    const props = blockDef?.blockSchema?.properties;
    if (!props) continue;
    for (const [fieldName, fieldDef] of Object.entries(props)) {
      if (fieldDef?.widget === 'object_list') {
        if (!map.has(blockType)) map.set(blockType, new Map());
        const idField = fieldDef.idField || '@id';
        map.get(blockType).set(fieldName, idField);
      }
    }
  }
  return map;
}

/**
 * Build a map of (parentType, field) → allowedBlocks[] for every container
 * field that declares allowedBlocks (object_list subblocks + blocks_layout
 * child containers). Sanity coverage needs one content example per
 * (parentType, field, subType) tuple.
 * @param {Object} blocksConfig - Block schemas from initBridge INIT message
 * @returns {Array<{parentType: string, field: string, allowedBlocks: string[]}>}
 */
function buildAllowedBlocksList(blocksConfig) {
  const out = [];
  for (const [blockType, blockDef] of Object.entries(blocksConfig || {})) {
    const props = blockDef?.blockSchema?.properties;
    if (!props) continue;
    for (const [fieldName, fieldDef] of Object.entries(props)) {
      const widget = fieldDef?.widget;
      if (widget !== 'object_list' && widget !== 'blocks_layout') continue;
      const allowedBlocks = fieldDef?.allowedBlocks;
      if (!Array.isArray(allowedBlocks) || allowedBlocks.length === 0) continue;
      out.push({ parentType: blockType, field: fieldName, allowedBlocks });
    }
  }
  return out;
}

/**
 * The field whose value names the @type of the items a listing/grid renders.
 * A listing declares it on `schemaEnhancer.inheritSchemaFrom.typeField` (it has
 * no blocks field); a grid declares `itemTypeField` on its blocks_layout /
 * object_list field. The value that field holds MUST be a registered block type
 * — expandListingBlocks stamps it onto every expanded item's `@type`, so a value
 * that isn't a real block type makes every result render as "Unimplemented".
 * Returns the field name, or null when the block renders no dynamic items.
 */
function itemTypeFieldOf(blockDef) {
  const tf = blockDef?.schemaEnhancer?.inheritSchemaFrom?.typeField;
  if (tf) return tf;
  const props = blockDef?.blockSchema?.properties || {};
  for (const def of Object.values(props)) {
    if (def && typeof def === 'object' && def.itemTypeField) return def.itemTypeField;
  }
  return null;
}

/**
 * A blocks_layout region seeds an `@type: "empty"` placeholder — rather than a
 * concrete default/single type — exactly when it has no `defaultBlockType` and
 * more than one `allowedBlocks`. Mirrors getEmptyBlockType() in
 * packages/volto-hydra/src/utils/blockPath.js (a 3-line predicate kept in sync
 * here because that module imports Volto's `config`, which this CJS discovery
 * can't load). Only these regions need the "renders when empty" sanity check —
 * default/single-type regions seed a normal block that block-sanity already
 * exercises.
 * @returns {Array<{parentType: string, field: string}>}
 */
function emptySeedingRegions(blocksConfig) {
  const out = [];
  for (const [blockType, blockDef] of Object.entries(blocksConfig || {})) {
    const props = blockDef?.blockSchema?.properties;
    if (!props) continue;
    for (const [fieldName, fieldDef] of Object.entries(props)) {
      if (fieldDef?.widget !== 'blocks_layout') continue;
      if (fieldDef?.defaultBlockType) continue; // seeds the default type
      const allowed = fieldDef?.allowedBlocks;
      if (!Array.isArray(allowed) || allowed.length <= 1) continue; // seeds the single type
      out.push({ parentType: blockType, field: fieldName });
    }
  }
  return out;
}

/**
 * Pair each empty-seeding region with a real discovered container example so
 * the sanity test has a page + block to load and strip. Regions whose parent
 * container has no content example anywhere are skipped (nothing to strip).
 * @param {Object} blocksConfig
 * @param {DiscoveredBlock[]} blocks - discoverBlocks() output
 * @returns {Array<{parentType: string, field: string, pagePath: string, blockId: string}>}
 */
function buildEmptyRegionCases(blocksConfig, blocks) {
  const exampleByType = new Map();
  for (const b of blocks || []) {
    if (!exampleByType.has(b.blockType)) exampleByType.set(b.blockType, b);
  }
  const cases = [];
  for (const { parentType, field } of emptySeedingRegions(blocksConfig)) {
    const example = exampleByType.get(parentType);
    if (!example) continue;
    cases.push({ parentType, field, pagePath: example.pagePath, blockId: example.blockId });
  }
  return cases;
}

/**
 * For a parent block's data, return the set of sub-block types present in
 * the given container field. Handles both object_list shape (array of items
 * with field_type/@type) and blocks_layout shape (ids in {items:[]} that
 * resolve to blocks dict entries with @type).
 */
function subTypesInField(blockData, field) {
  const types = new Set();
  const value = blockData?.[field];
  if (!value) return types;
  // blocks_layout: { items: [...] } pointing into blockData.blocks
  if (typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.items)) {
    const dict = blockData?.blocks || {};
    for (const id of value.items) {
      const t = dict[id]?.['@type'];
      if (typeof t === 'string') types.add(t);
    }
    return types;
  }
  // object_list: array of items with type info
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const t = item['@type'] || item.field_type || item.type;
      if (typeof t === 'string') types.add(t);
    }
  }
  return types;
}

/**
 * Recursively extract all blocks from a content object.
 * Handles nested containers: section, gridBlock, columns, accordion, etc.
 * When objectListFields is provided, also extracts object_list sub-blocks.
 * @param {Object} blocks - Block dict keyed by ID
 * @param {string[]} [layout] - Ordered block IDs (from blocks_layout.items)
 * @param {Map} [objectListFields] - From buildObjectListFieldsMap
 * @returns {{ blockId: string, blockType: string, blockData: Object }[]}
 */
function extractBlocks(blocks, layout, objectListFields) {
  const result = [];
  const blockIds = layout || Object.keys(blocks);

  for (const blockId of blockIds) {
    const block = blocks[blockId];
    if (!block || typeof block !== 'object') continue;

    const blockType = block['@type'];
    if (!blockType) continue;

    result.push({ blockId, blockType, blockData: block });

    // Recurse into nested blocks (containers)
    if (block.blocks && typeof block.blocks === 'object') {
      result.push(...extractBlocks(block.blocks, block.blocks_layout?.items, objectListFields));
    }

    // Handle object_list fields from schema (clients items, features items, etc.)
    const knownListFields = objectListFields?.get(blockType);
    if (knownListFields) {
      for (const [fieldName, idField] of knownListFields) {
        const items = block[fieldName];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const subId = item[idField];
          if (!subId) continue;
          // Sub-blocks from object_list use the parent's @type as a virtual type
          // e.g. clients items are "clients:item", features items are "features:item"
          result.push({
            blockId: subId,
            blockType: `${blockType}:${fieldName}`,
            blockData: item,
          });
        }
      }
    }

    // Handle arrays with nested blocks (accordion panels, slider slides, etc.)
    for (const [, value] of Object.entries(block)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && item.blocks) {
            result.push(...extractBlocks(item.blocks, item.blocks_layout?.items, objectListFields));
          }
        }
      }
    }
  }

  return result;
}

/**
 * Pick a variation key from block data. Covers the common select-widget
 * field names hydra blocks use: `variation`, `template`, `variant`. Falls
 * back to `'default'` so blocks without variations still get one entry.
 */
function variationOf(blockData) {
  return (
    blockData?.variation ||
    blockData?.template ||
    blockData?.variant ||
    'default'
  );
}

/**
 * Is this document the template the block belongs to? A `templateId` is written
 * either as the template's path or as `resolveuid/<uid>`, so match both.
 *
 * @param {Object} content - The page JSON the block was found in
 * @param {string} templateId
 * @returns {boolean}
 */
function isOwnDefinition(content, templateId) {
  if (!templateId || typeof templateId !== 'string') return false;
  const ids = new Set();
  if (content?.['@id']) ids.add(new URL(content['@id'], 'http://x').pathname);
  if (content?.UID) ids.add(`resolveuid/${content.UID}`);
  if (ids.has(templateId)) return true;
  return ids.has(new URL(templateId, 'http://x').pathname);
}

/**
 * Can an author edit this instance, and what does it take? Only an editable
 * instance is a valid subject for the sanity checks, which click a field and
 * require it to become editable.
 *
 * A `readOnly` block stamped onto an ordinary page is a COPY of a template
 * member: the author edits the template, not the copy, so it is not a subject.
 * On the template's OWN document that same block IS the thing being authored —
 * it unlocks there like any template member (the merge gives a definition's
 * blocks a `templateInstanceId`), so it is a subject that carries the id to
 * unlock with.
 *
 * `fixed` is not a criterion at all. Fixed means position-locked — the bridge
 * uses isFixed to keep a block out of drag and edge-drag candidates — which is
 * a different thing from uneditable, the question isBlockReadonly answers. A
 * contentLayout is the clearest case: the page has exactly one and you switch
 * which layout rather than dragging it about, yet its own fields are edited in
 * the sidebar and its regions hold ordinary authored content.
 *
 * Definition pages used to be excluded outright, because ranking by richness
 * picked `alert0` in /templates/site-announcement for globalAlert — and back
 * then a definition could not be edited at all, so the subject was doomed:
 * "locked by design". Definitions unlock now, so a definition is as good a
 * subject as any other instance and richness alone decides. The exclusion also
 * hid every block whose only home is a template, which is how `footer` came to
 * report "no editable content example" while being the most-edited chrome on
 * the site.
 *
 * The caller learns only WHETHER unlocking is needed, never with what id. An
 * unlock id is a `templateInstanceId` — one APPLICATION of a template — and in
 * the general case the merge mints it (`const instanceId = uuidGenerator()`), so
 * it cannot be derived from stored content at all. Predicting it worked only for
 * the deterministic cases (a forced layout's `instanceId === templateId`, a
 * fixture storing its own, the stamp for definitions lacking one) and failed as
 * "stayed locked" for every other. The spec reads the id off the bridge instead.
 *
 * @param {Object} content - The page JSON the block was found in
 * @param {Object} blockData - The block's stored data
 * @returns {{needsUnlock: boolean}|null} null when not a subject
 */
function editableInstance(content, blockData) {
  const templateId = blockData?.templateId;
  const onOwnDefinition = isOwnDefinition(content, templateId);
  // Template CHROME (`fixed` or `readOnly`) as opposed to slot CONTENT (neither,
  // and the author's own). A `fixed` member is re-inserted from the template on
  // every render — "copy block content from a page block with the same slotId" —
  // so the copy on an ordinary page gets a freshly minted uid each load and
  // cannot be addressed by the id discovery read from stored content. The
  // definition is where it is authored and where its id is stable.
  //
  // `fixed` alone is NOT chrome: a contentLayout is fixed with no templateId,
  // position-locked rather than template-owned, and is edited in place.
  if (templateId && blockData?.fixed === true && !onOwnDefinition) {
    return null;
  }
  if (blockData?.readOnly === true) {
    return onOwnDefinition ? { needsUnlock: true } : null;
  }
  return { needsUnlock: false };
}

/**
 * Score an example block by content richness, so when multiple pages
 * contain the same (blockType, variation) we keep the most interesting
 * example for testing. Heuristic:
 *  - +1 per non-empty field
 *  - +number of unique slate node types across slate values (heading, list,
 *    link, bold, etc. — exercises more renderer paths)
 *
 * Handles circular-ish data defensively: a shallow walk is enough for slate.
 */
function collectSlateNodeTypes(node, types) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectSlateNodeTypes(item, types);
    return;
  }
  if (typeof node.type === 'string') types.add(node.type);
  // Slate leaves carry inline marks as boolean keys
  for (const key of ['bold', 'italic', 'underline', 'strikethrough', 'code']) {
    if (node[key]) types.add(`leaf:${key}`);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectSlateNodeTypes(child, types);
  }
}

function richnessScore(blockData) {
  let score = 0;
  const slateTypes = new Set();
  const itemTypes = new Set();
  for (const [key, value] of Object.entries(blockData || {})) {
    if (key.startsWith('@') || key === 'blocks' || key === 'blocks_layout') continue;
    if (value == null) continue;
    if (typeof value === 'string' && value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    score += 1;
    if (Array.isArray(value) && value.length && typeof value[0] === 'object' && value[0]) {
      // Slate values: array of {children: [...]} — collect every node type
      if ('children' in value[0]) {
        collectSlateNodeTypes(value, slateTypes);
      }
      // Object_list items (form subblocks, hero_slider slides, etc.):
      // collect every distinct @type / field_type / type so a fixture that
      // exercises many variants scores higher than one with repeats.
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const t = item['@type'] || item.field_type || item.type;
          if (typeof t === 'string') itemTypes.add(`${key}:${t}`);
        }
      }
    }
  }
  return score + slateTypes.size + itemTypes.size;
}

/**
 * Discover one example of each (block type, variation) pair from a Plone API.
 *
 * @param {string} apiUrl - Base URL of the Plone API (e.g. "http://localhost:8888")
 * @param {number} [maxPages=50] - Maximum number of pages to fetch
 * @param {Object} [blocksConfig={}] - Block schemas for object_list discovery
 * @returns {Promise<DiscoveredBlock[]>} One entry per unique (blockType, variation)
 */
/**
 * Walk a slate subtree and collect structural issues:
 *  - Element nodes (have `children`) must have a string `type`.
 *  - Text leaves (have `text`) must not also have `children` or `type`.
 *  - Leaf-only nodes at root level (text without element wrapper) are invalid.
 */
function validateSlateNode(node, pathStr, issues) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    issues.push(`${pathStr}: non-object slate node (${typeof node})`);
    return;
  }
  const hasChildren = Array.isArray(node.children);
  const hasText = Object.prototype.hasOwnProperty.call(node, 'text');
  const hasType = typeof node.type === 'string' && node.type.length > 0;

  if (hasChildren) {
    if (!hasType) issues.push(`${pathStr}: element has children but no \`type\``);
    for (let i = 0; i < node.children.length; i++) {
      validateSlateNode(node.children[i], `${pathStr}.children[${i}]`, issues);
    }
  } else if (hasText) {
    if (hasType) issues.push(`${pathStr}: text leaf must not have \`type\``);
    // Newlines inside a text leaf mean under-structured content — multi-
    // paragraph or bulleted content stuffed into one text node instead of
    // proper slate elements. Breaks inline editing boundaries.
    if (typeof node.text === 'string' && node.text.includes('\n')) {
      const preview = node.text.replace(/\n/g, '\\n').slice(0, 80);
      issues.push(`${pathStr}: text leaf contains newline(s) — split into separate slate elements ("${preview}${node.text.length > 80 ? '…' : ''}")`);
    }
  } else {
    issues.push(`${pathStr}: node has neither \`children\` nor \`text\``);
  }
}

/**
 * Walk a block's data for slate-shaped fields (arrays whose first item looks
 * like a slate node) and record all structural issues:
 *  - A slate field always resolves to exactly ONE top-level node (see
 *    visual-editing.md "One top-level node per slate field"). Hydra normalizes
 *    extras during editing — the `value` of a `slate` BLOCK splits each extra
 *    node into its own block; a slate FIELD on any other block flattens them
 *    back into the first node — so stored data with >1 top-level node is
 *    un-normalized and breaks the one-node guarantee renderers rely on.
 *  - Missing `type` on root element.
 *  - Invalid node shapes anywhere in the tree.
 *
 * Schema-independent; runs against raw API data.
 */
function collectSlateIssues(blockData, pagePath, blockId, out, blockType) {
  if (!blockData || typeof blockData !== 'object') return;
  for (const [key, value] of Object.entries(blockData)) {
    if (key.startsWith('@') || key === 'blocks' || key === 'blocks_layout') continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0];
    const looksSlate =
      first && typeof first === 'object' &&
      (Array.isArray(first.children) || Object.prototype.hasOwnProperty.call(first, 'text'));
    if (!looksSlate) continue;

    const issues = [];
    if (value.length > 1) {
      // Advice differs by where the field lives, but both are invalid stored data.
      const advice =
        blockType === 'slate'
          ? 'split into separate blocks'
          : 'flatten into a single top-level node (a slate field holds exactly one)';
      issues.push(`multiple top-level nodes (${value.length}); ${advice}`);
    }
    for (let i = 0; i < value.length; i++) {
      validateSlateNode(value[i], `value[${i}]`, issues);
    }
    // A slate field's roots must be elements, not text leaves.
    for (let i = 0; i < value.length; i++) {
      const n = value[i];
      if (n && typeof n === 'object' && Object.prototype.hasOwnProperty.call(n, 'text') && !Array.isArray(n.children)) {
        issues.push(`value[${i}]: text leaf at root (must be wrapped in an element)`);
      }
    }
    if (issues.length) {
      out.push({ pagePath, blockId, field: key, issues });
    }
  }
}

/**
 * Check each field in blockData against the declared widget/type in the
 * block schema. Catches shape mismatches (e.g. `widget: 'url'` with an
 * array value) that would crash Volto's sidebar widget rendering.
 *
 * Checks performed:
 *  - `widget: 'url'` / `type: 'string'` — value is a string
 *  - `widget: 'object_browser'` / `widget: 'image'` — value is an array of
 *    objects with `@id` (Plone link format)
 *  - `widget: 'select'` / `factory: 'Choice'` — value is one of the declared
 *    choice values (accepts both `[value, label]` tuples and plain strings)
 *  - `type: 'boolean'` — value is a boolean
 *  - `type: 'number'` / `'integer'` — value is a number
 *  - `widget: 'slate'` — value is a non-empty array of slate nodes (deep
 *    structural checks stay in collectSlateIssues)
 */
// Fields present in block data that are not schema properties but are never
// authored/editable content: structural, serialisation, and Volto slot runtime.
// The template trio (templateId/templateInstanceId/slotId) is written by the
// template machinery to bind a block to its template instance and slot; it is
// not sidebar-editable, so it must not be reported as an undeclared field.
const UNDECLARED_EXEMPT = new Set([
  'id', 'blocks', 'blocks_layout', 'image_scales', 'plaintext', 'value',
  'styles', 'override', 'block',
  'fixed', 'slotId', 'templateId', 'templateInstanceId', 'readOnly',
  // Deep-link anchors hydra harvests + persists on the owning block (#273/#281).
  // Not sidebar-authored — a consumer (in-page nav) reads them; exempt like the
  // other serialisation/runtime fields above.
  '_linkableAnchors',
]);

// Block-level slate STYLES a person can actually choose from the editor's style
// menu (Volto's slate styleName plugin). There is no slate style menu yet, so
// this is EMPTY: any `styleName` on a slate node is content a person cannot
// author — it was hand-injected — and block-sanity must flag it. When a style
// menu is added, list its style values here (or derive from the slate config).
const AUTHORABLE_SLATE_STYLES = new Set([]);

// Hydra's own value validator (packages/volto-hydra/.../schemaValidation.mjs) —
// the SAME `isValidValue` Hydra runs to strip un-authorable values on load, so
// block-sanity and the editor agree on "is this a valid value?". Loaded lazily
// via dynamic import (it's ESM but dependency-free by design) in discoverBlocks.
let isValidValueFn = null;

// Hydra's REAL schema resolver, run offline. resolveEffectiveBlockSchema(blockId,
// pageFormData, blockPathMap, blocksConfig, intl) returns a block's schema with
// its schemaEnhancer applied — so `.required` is the DYNAMIC required set (a
// card's `image` is required only when its grid enables it). blockSync.js /
// blockPath.js are idiomatic Volto source (JSX, lodash CJS, extensionless imports)
// that bare Node can't load, so we esbuild-bundle the offline API once (see
// loadOfflineBlockSyncApi). null until loaded.
let resolveEffectiveSchemaFn = null;

// Offline stub intl: block schemas call intl.formatMessage for titles; we only
// need field NAMES/required, not translations.
const STUB_INTL = { formatMessage: (m) => (m && (m.defaultMessage || m.id)) || '' };

// Evaluate one `when` operator against a resolved surface value. Mirrors the
// operators our schemaEnhancer.fieldRules use (see volto-hydra blockSync).
function condMatches(cond, val) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('gte' in cond && !(val >= cond.gte)) return false;
    if ('gt' in cond && !(val > cond.gt)) return false;
    if ('lte' in cond && !(val <= cond.lte)) return false;
    if ('lt' in cond && !(val < cond.lt)) return false;
    if ('isSet' in cond && (cond.isSet ? val == null : val != null)) return false;
    if ('isNot' in cond && val === cond.isNot) return false;
    if ('eq' in cond && val !== cond.eq) return false;
    return true;
  }
  return val === cond;
}

// Resolve a field def against a block's data when it's driven by
// `schemaEnhancer.fieldRules` — so we validate against the ACTUAL option set the
// editor would show (e.g. columns `layout` gains "wide-middle" at 3+ columns via
// `{ when: { items: { gte: 3 } }, set: columnsLayoutField(3) }`). The `set` values
// are pre-computed defs in the served config, so we only need to pick the first
// matching rule. Region operators (a blocks_layout field in `when`) compare the
// region's child count. Returns the resolved def, or `false` if the field is
// hidden (no validation), or the base def when no rule applies.
function resolveFieldDef(field, def, blockData, blockConfig, props) {
  const rules = blockConfig?.schemaEnhancer?.fieldRules?.[field];
  if (!rules) return def;
  const childCount =
    (Array.isArray(blockData?.blocks_layout?.items) && blockData.blocks_layout.items.length) ||
    (blockData?.blocks && typeof blockData.blocks === 'object' ? Object.keys(blockData.blocks).length : 0);
  const surface = (name) =>
    props?.[name]?.widget === 'blocks_layout' ? childCount : blockData?.[name];
  const list = Array.isArray(rules) ? rules : [rules];
  for (const r of list) {
    if (r === false) return false;
    const when = r && r.when;
    const ok = !when || Object.entries(when).every(([n, c]) => condMatches(c, surface(n)));
    if (ok) return 'set' in r ? r.set : def;
  }
  return def;
}

// Recursively collect any `styleName` on a slate value's nodes that isn't an
// authorable style. Catches hand-injected styles a person can't reproduce.
function unauthorableSlateStyles(nodes, seen = new Set()) {
  for (const n of Array.isArray(nodes) ? nodes : []) {
    if (n && typeof n === 'object') {
      if (n.styleName && !AUTHORABLE_SLATE_STYLES.has(n.styleName)) seen.add(n.styleName);
      if (Array.isArray(n.children)) unauthorableSlateStyles(n.children, seen);
    }
  }
  return seen;
}

function collectWidgetShapeIssues(
  blockData, blockSchema, pagePath, blockId, out, blockType, undeclaredFields, blockConfig, blocksConfig,
  effectiveRequired, pathInfo,
) {
  const props = blockSchema?.properties;
  if (!props || !blockData || typeof blockData !== 'object') return;

  const issues = [];

  for (const [field, def] of Object.entries(props)) {
    if (!(field in blockData)) continue;
    const value = blockData[field];
    if (value == null) continue; // null/undefined is "unset" — widget handles it

    const widget = def?.widget;
    const type = def?.type;
    const expected = widget || type || 'string';

    const describe = (exp, got) =>
      `field "${field}": expected ${exp}, got ${Array.isArray(got) ? `array(${got.length})` : typeof got}`;

    // Plone rich text (`widget: 'richtext'`, value serialized as
    // `{data: '<html>', encoding, content-type}`) is not permitted: this design
    // system renders all rich text as slate so it round-trips through the
    // editing bridge. Flag it from either side —
    //   1. the schema still declares `widget: 'richtext'`, or
    //   2. the stored value is still the `{data: '<html>'}` object
    //      (catches content the slate migration hasn't converted yet, even once
    //      the schema has been flipped to `widget: 'slate'`).
    const looksLikeRichText =
      value && typeof value === 'object' && !Array.isArray(value) && typeof value.data === 'string';
    if (widget === 'richtext' || looksLikeRichText) {
      issues.push(
        `field "${field}": Plone rich text is not allowed — this design system renders rich text as slate. ` +
          `Declare the field as \`widget: 'slate'\` (an array of slate nodes) and store its value as slate, ` +
          `not \`{data: '<html>'}\`.`,
      );
      continue;
    }

    // Images must be declared with the image widget so the editor offers an
    // upload control and the frontend resolves scales. Detect an image
    // reference by its Plone markers (image_scales / image_field) or a
    // data:image URI, and require the declaring field to be `widget: 'image'`.
    const looksLikeImageRef =
      (value && typeof value === 'object' && !Array.isArray(value) &&
        ('image_scales' in value || 'image_field' in value)) ||
      (typeof value === 'string' && value.startsWith('data:image/'));
    if (looksLikeImageRef && widget !== 'image') {
      issues.push(
        `field "${field}": image reference must be declared \`widget: 'image'\`, ` +
          `got ${widget ? `\`widget: '${widget}'\`` : 'no widget'}.`,
      );
      continue;
    }

    // A URL/link value must live in a url/link widget so the editor gives a link
    // control and the frontend resolves it. Flag an absolute (http(s)://) or
    // site-relative (/path) string sitting in a plain text field. url,
    // object_browser (incl. mode:'link'), image and file legitimately hold
    // URLs/paths and are handled by their own branches.
    const urlWidgets = ['url', 'object_browser', 'image', 'file'];
    const looksLikeUrl =
      typeof value === 'string' &&
      (/^https?:\/\//.test(value) || /^\/[^/]/.test(value));
    if (looksLikeUrl && !urlWidgets.includes(widget)) {
      issues.push(
        `field "${field}": value looks like a URL/link (${JSON.stringify(value.slice(0, 48))}` +
          `) — declare it as \`widget: 'url'\` (or \`widget: 'object_browser'\`, ` +
          `mode: 'link' for a content link), not a plain text field.`,
      );
      continue;
    }

    if (widget === 'url') {
      if (typeof value !== 'string') {
        issues.push(describe('url string', value));
      }
    } else if (widget === 'object_browser') {
      // Plone link format: [{"@id": "/path"}] (array of objects with @id).
      // `mode: 'link'` fields additionally accept a plain string href — a link
      // may be an external URL or come from a listing fieldMapping (@id -> a
      // string), and the frontend's link resolver handles both. Only reject a
      // string for non-link object browsers (content/image selection), where an
      // @id array is required.
      if (def?.mode === 'link' && typeof value === 'string') {
        // valid href
      } else if (!Array.isArray(value)) {
        issues.push(describe('object_browser array', value));
      } else if (value.length && (typeof value[0] !== 'object' || !value[0]['@id'])) {
        issues.push(`field "${field}": object_browser items must be objects with "@id"`);
      }
    } else if (widget === 'image') {
      // Image fields accept:
      //  - string (data URI, absolute URL)
      //  - single image object `{@id, image_field, image_scales}`
      //  - array of image objects (Plone catalog format)
      const ok =
        typeof value === 'string' ||
        (Array.isArray(value) && (value.length === 0 || (typeof value[0] === 'object' && value[0]['@id']))) ||
        (typeof value === 'object' && !Array.isArray(value) && value['@id']);
      if (!ok) {
        issues.push(`field "${field}": image expected string (URL/data URI), object, or array of objects with "@id" — got ${Array.isArray(value) ? 'malformed array' : typeof value}`);
      }
    } else if (widget === 'file') {
      // This DS renders images through the shared image pipeline; an image
      // field must use `widget: 'image'` (not the generic file upload) so it is
      // shape-checked and edited as an image.
      issues.push(
        `field "${field}": image content must use \`widget: 'image'\`, not \`widget: 'file'\`.`,
      );
    } else if (
      widget === 'select' || widget === 'choice' || def?.factory === 'Choice' ||
      Array.isArray(def?.actions) || widget === 'blockTypeSelect'
    ) {
      // Resolve the field against this block's data first, so a fieldRules-driven
      // field (columns `layout`, which gains "wide-middle" at 3+ columns) is
      // checked against its ACTUAL option set. Then reuse Hydra's `isValidValue`
      // — the SAME check Hydra strips content with — so block-sanity flags exactly
      // what the editor can't produce (a size:"xxl", a tags variation:"card").
      // blockTypeSelect derives its options from the container's `allowedBlocks`,
      // so hand isValidValue an explicit `choices` set for it.
      const eff = resolveFieldDef(field, def, blockData, blockConfig, props);
      if (eff !== false) {
        let checkDef = eff;
        let skip = false;
        if (widget === 'blockTypeSelect') {
          // A blockTypeSelect's valid values are the container's addable item
          // types — hydra resolves them in getBlockTypeChoices, which needs the
          // bridge's blockPathMap/registry and can't run offline. Mirror only the
          // two OFFLINE-decidable forms:
          //   • region-synced (grid / tags): a sibling region field carries
          //     itemTypeField===field, so its `allowedBlocks` is the set.
          //   • region-less convertible (listing): the field declares
          //     `filterConvertibleFrom`, and the set is every block type whose
          //     config has `fieldMappings[that source]` — the SAME filter
          //     getBlockTypeChoices applies.
          // Any other form (parent `allowedSiblingTypes`, blocksField '..') needs
          // the pathMap — skip rather than guess (guessing choices=[] was flagging
          // every valid listing variation).
          const region = Object.values(props).find((p) => p && p.itemTypeField === field);
          if (region) {
            checkDef = { ...eff, choices: region.allowedBlocks || [] };
          } else if (eff.filterConvertibleFrom && blocksConfig) {
            checkDef = {
              ...eff,
              choices: Object.keys(blocksConfig).filter(
                (t) => blocksConfig[t]?.fieldMappings?.[eff.filterConvertibleFrom],
              ),
            };
          } else {
            skip = true; // unresolvable offline
          }
        }
        if (!skip && isValidValueFn && !isValidValueFn(value, checkDef)) {
          issues.push(
            `field "${field}": value ${JSON.stringify(value)} is not an allowed value — the ` +
              `editor can't produce it (Hydra would strip it on load).`,
          );
        }
      }
    } else if (widget === 'slate') {
      if (!Array.isArray(value)) {
        issues.push(describe('slate array', value));
      } else {
        // The value being an array isn't enough: a slate node's block-level
        // `styleName` must be a style the editor's style menu can apply. Any
        // other styleName is content nobody can author — hand-injected to fake a
        // rendering. Flag each one (this is what caught a fabricated nsw-intro).
        const bad = unauthorableSlateStyles(value);
        for (const s of bad) {
          issues.push(
            `field "${field}": slate node styleName ${JSON.stringify(s)} is not an ` +
              `authorable style — no such option exists in the editor's style menu, so ` +
              `this content can't be reproduced by hand. Register the style (add it to ` +
              `the slate style menu) or remove it.`,
          );
        }
      }
    } else if (widget === 'object_list') {
      // object_list stores an array of items; an idField (default '@id')
      // identifies each. If data is nested (dataPath), value may be an
      // object — tolerate that. Just check it's not a primitive.
      if (typeof value !== 'object' || value === null) {
        issues.push(describe('object_list array/object', value));
      } else if (Array.isArray(value) && Array.isArray(def.default) && def.default.length) {
        // The field declares a `default` (e.g. codeExample.tabs → one JavaScript
        // tab). A content item carrying only its idField dropped every field the
        // default supplies — the signature of a seed that clobbered the schema
        // default with a blank item (initializeContainerBlock used to overwrite
        // the already-applied default). Missing optional fields are otherwise
        // skipped above, so this default-aware check is what catches it.
        const idField = def.idField || '@id';
        const defaultFields = Object.keys(def.default[0] || {}).filter((k) => k !== idField);
        if (defaultFields.length) {
          for (const item of value) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            if (Object.keys(item).filter((k) => k !== idField).length === 0) {
              issues.push(
                `field "${field}": item ${JSON.stringify(item[idField])} has only its id — the ` +
                  `schema default supplies ${JSON.stringify(defaultFields)}, so a bare item means the default was lost`,
              );
            }
          }
        }
      }
    } else if (widget === 'blocks_layout') {
      // blocks_layout field holds `{items: [...]}` pointing at sibling
      // block ids in the parent block's `blocks` dict.
      if (!value || typeof value !== 'object' || !Array.isArray(value.items)) {
        issues.push(`field "${field}": blocks_layout expected {items: [...]}, got ${typeof value}`);
      }
    } else if (type === 'boolean') {
      if (typeof value !== 'boolean') issues.push(describe('boolean', value));
    } else if (type === 'number' || type === 'integer') {
      if (typeof value !== 'number') issues.push(describe(type, value));
    } else if (type === 'string') {
      if (typeof value !== 'string') issues.push(describe('string', value));
    }
  }

  // Required fields: a `required` field must hold a value — the editor blocks
  // saving a block with an empty required field, so content that omits one is
  // data nobody could have authored (an untitled card, a link with no href).
  //
  // `required` is DYNAMIC: hydra drops hidden fields from it, so a card's `image`
  // is required only when its grid enables the image element (its `fieldRules`
  // read the parent grid's `../itemDefaults_elements` with `contains`). We resolve
  // that with Hydra's REAL evaluator offline: `effectiveRequired` is the resolved
  // set (hidden fields already dropped), so we check it directly — no guessing.
  // Fallback (resolver unavailable): enforce only fields with NO fieldRules entry,
  // never a conditional one (under-enforce, never false-flag).
  const usingResolved = Array.isArray(effectiveRequired);
  const requiredFields = usingResolved
    ? effectiveRequired
    : Array.isArray(blockSchema.required)
      ? blockSchema.required
      : [];
  const fieldRules = blockConfig?.schemaEnhancer?.fieldRules || {};
  const isEmptyRequired = (v) =>
    v == null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
  for (const field of requiredFields) {
    if (!props[field]) continue; // required names an undeclared field — a schema bug, not a value issue
    if (!usingResolved && field in fieldRules) continue; // no resolver: defer conditional fields
    if (isEmptyRequired(blockData[field])) {
      issues.push(
        `field "${field}": required but empty — the editor won't let a block save without ` +
          `it, so this content can't be authored. Provide a value, or drop the field from \`required\`.`,
      );
    }
  }

  // Synced container: a container with an `itemTypeField` (a blockTypeSelect —
  // grid, tags, …) fixes ONE item type, so every child must be that type. A
  // `listing` child is the one structural exception (it expands into the synced
  // type). allowedBlocks permits several types at once, so THIS is the check that
  // catches a MIXED synced container — e.g. a tags variation="link" holding a
  // textItem — which allowedBlocks alone can't.
  const regionEntry = Object.entries(props).find(([, p]) => p && p.itemTypeField);
  if (regionEntry) {
    const variation = blockData[regionEntry[1].itemTypeField];
    const kids =
      blockData.blocks && typeof blockData.blocks === 'object'
        ? Object.values(blockData.blocks)
        : [];
    if (typeof variation === 'string' && variation && variation !== 'default') {
      for (const kid of kids) {
        const kt = kid && kid['@type'];
        if (kt && kt !== variation && kt !== 'listing') {
          issues.push(
            `synced container item type is ${JSON.stringify(variation)} but it holds a ` +
              `${JSON.stringify(kt)} child — a synced container can't mix types; every child ` +
              `must be ${JSON.stringify(variation)} (or a structural "listing").`,
          );
        }
      }
    }
  }

  // Reverse check: a stored field with no schema property. Only declared fields
  // (plus blocks/blocks_layout) belong in a block's data — an undeclared field
  // means the schema is missing it (it can't be edited in the sidebar) or the
  // data is stray. Collected per (blockType, field) so it reports ONCE per field
  // name, not once per instance. Structural / serialisation keys and Volto
  // slot-runtime fields (added by the slot editor, not authored data) are exempt.
  // Synced-defaults prefix: a block with an `inheritSchemaFrom` recipe (a
  // grid) stores its shared child defaults as flat `<defaultsField>_<field>`
  // keys (itemDefaults_colour, ...). Those aren't in the static blockSchema —
  // hydra builds them dynamically onto the "Item Defaults" fieldset from the
  // child type's fields at edit time, so they ARE editable there. Full
  // resolution needs the bridge's blockPathMap/registry and can't run offline
  // in discovery, so exempt the prefix rather than flag it as undeclared.
  const defaultsField =
    blockConfig && blockConfig.schemaEnhancer &&
    blockConfig.schemaEnhancer.inheritSchemaFrom &&
    blockConfig.schemaEnhancer.inheritSchemaFrom.defaultsField;
  const defaultsPrefix = defaultsField ? (defaultsField + '_') : null;
  // A typed / keyed object_list item carries STRUCTURAL keys that are not schema
  // properties: the container's idField (its own uid, e.g. `key`) and typeField
  // (e.g. `@type` — already `@`-exempt, but a custom typeField like `variation`
  // is not). They're set by the container, not sidebar-authored, so exempt them.
  const idField = pathInfo?.idField;
  const typeField = pathInfo?.typeField;
  if (blockType) {
    for (const key of Object.keys(blockData)) {
      if (key.startsWith('@') || UNDECLARED_EXEMPT.has(key) || props[key]) continue;
      if (key === idField || key === typeField) continue;
      if (defaultsPrefix && key.startsWith(defaultsPrefix)) continue;
      const dedupeKey = `${blockType} ${key}`;
      if (!undeclaredFields.has(dedupeKey)) {
        undeclaredFields.set(dedupeKey, { blockType, field: key, pagePath, blockId });
      }
    }
  }

  if (issues.length) {
    out.push({ pagePath, blockId, blockType: blockData['@type'], issues });
  }
}

// blocksConfig objects whose child-block enhancers have already been installed
// Maps the pristine discovery blocksConfig -> an enhanced CLONE. installChild
// BlockEnhancers composes hideParentOwnedFields into each container-child's
// schemaEnhancer; running it on the discovery's OWN blocksConfig would make
// buildBlockPathMap resolve child schemas with parent-owned fields DROPPED, so
// the undeclared-field check would then flag those legit parent-owned fields
// (contentBlock's imagePosition/imageIsIcon/showViewMoreLink) as stray. So the
// enhancers go on a copy — only the required check (resolveEffectiveBlockSchema)
// uses it; buildBlockPathMap + every other check keep the pristine config.
const _enhancedConfigFor = new WeakMap();
let _offlineApiModule = null;

// esbuild-bundle Hydra's offline block-sync API once and wire it up: idiomatic
// Volto source (JSX, lodash CJS, extensionless imports) can't load in bare Node,
// so esbuild transpiles the small entry into one self-contained ESM module. Then
// inject blocksConfig + install the child-block enhancers, exactly as the addon's
// applyConfig does at init, so resolveEffectiveBlockSchema resolves dynamic
// `required` (fieldRules / hideParentOwnedFields) the same way the editor does.
async function loadOfflineBlockSyncApi(blocksConfig) {
  if (!_offlineApiModule) {
    const path = require('path');
    const os = require('os');
    const { pathToFileURL } = require('url');
    const esbuild = require('esbuild');
    const entry = path.resolve(
      __dirname,
      '../../packages/volto-hydra/src/utils/offlineBlockSyncApi.js',
    );
    const outfile = path.join(
      os.tmpdir(),
      `hydra-offline-block-sync-${process.pid}.mjs`,
    );
    esbuild.buildSync({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile,
      loader: { '.js': 'jsx' },
      logLevel: 'silent',
    });
    _offlineApiModule = await import(pathToFileURL(outfile).href);
  }
  const api = _offlineApiModule;
  let enhanced = _enhancedConfigFor.get(blocksConfig);
  if (!enhanced) {
    // Shallow-per-block clone: installChildBlockEnhancers sets each block's
    // `schemaEnhancer`, so copy the block config objects (shared functions like
    // blockSchema are referenced, never mutated). Enhancers + the injected
    // getBlocksConfig all point at the clone, so hideParentOwnedFields resolves
    // consistently against it — while the discovery's blocksConfig stays pristine.
    enhanced = {};
    for (const [k, v] of Object.entries(blocksConfig)) {
      enhanced[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : v;
    }
    api.setInjectedVoltoConfig({ getBlocksConfig: () => enhanced });
    api.populateTypeSchemaCache?.(enhanced, STUB_INTL);
    api.installVariationFieldEnhancers?.(enhanced);
    api.installChildBlockEnhancers?.(enhanced);
    _enhancedConfigFor.set(blocksConfig, enhanced);
  }
  // Resolve required against the enhanced clone (fieldRules + hideParentOwnedFields),
  // ignoring the caller's blocksConfig arg so the pristine config never leaks in.
  resolveEffectiveSchemaFn = (blockId, formData, pathMap, _bc, intl) =>
    api.resolveEffectiveBlockSchema(blockId, formData, pathMap, enhanced, intl);
}

// Structural types: hydra's own plumbing, never a project's placement choice.
const CONTAINMENT_EXEMPT_TYPES = new Set(['empty', 'column', 'title', 'description']);

/**
 * Rules the CONSUMING PROJECT passes in, saying where a block placed outside
 * its container's allowedBlocks is deliberate rather than a mistake.
 *
 * `CONTAINMENT_EXEMPT_SLOTS` — comma-separated template slot ids. The case this
 * exists for: a documentation site shows every component on its own doc page,
 * inside a showcase slot of a page template. Chrome like `header`, or a layout
 * like `contentLayout`, is in no ordinary region's allowedBlocks and must stay
 * that way — otherwise the block chooser offers site chrome on every page — yet
 * the doc page still has to show one. Only the project that authored the
 * template knows which slot means "an example lives here", so hydra takes it as
 * configuration instead of guessing.
 */
function readContainmentRules(env = process.env) {
  return {
    slots: (env.CONTAINMENT_EXEMPT_SLOTS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Is this block's placement exempt from the containment check?
 *
 * Exempt when: it is structural, template-placed or position-fixed; its
 * container declares no allowed set, or declares one that includes the type;
 * or it sits in a slot the project nominated (see readContainmentRules).
 */
function isContainmentExempt(entry, blockData, rules = { slots: [] }) {
  if (entry.isTemplateInstance || entry.isFixed) return true;
  if (CONTAINMENT_EXEMPT_TYPES.has(entry.blockType)) return true;
  if (!Array.isArray(entry.allowedSiblingTypes) || entry.allowedSiblingTypes.length === 0) {
    return true;
  }
  if (entry.allowedSiblingTypes.includes(entry.blockType)) return true;
  const slotId = blockData && blockData.slotId;
  return !!slotId && (rules.slots || []).includes(slotId);
}

async function discoverBlocks(
  apiUrl,
  maxPages = Infinity,
  blocksConfig = {},
  frontendKeys = [],
  // Schemas used ONLY to work out coverage — which fields are object_lists and
  // what each container allows. A schema-less CI sweep deliberately passes an
  // empty blocksConfig to keep the strict shape/slate checks off, but coverage
  // still has to know that a form's `subblocks` holds typed sub-items;
  // otherwise every sub-type reports "no content example" while an example sits
  // right there in the fixture. Defaults to blocksConfig, so schema-ful callers
  // are unaffected.
  coverageConfig = null,
) {
  // Use hydra's canonical buildBlockPathMap to walk content — it knows
  // the schema-defined container fields (blocks_layout, object_list,
  // columns, …) and distinguishes real blocks from inline sub-items.
  // Dynamically imported because the module is ESM and this helper is CJS.
  const { buildBlockPathMap } = await import('../../packages/hydra-js/buildBlockPathMap.js');
  // Reuse Hydra's canonical value validator (choices/enum/actions) — same check
  // it strips content with, so block-sanity flags exactly what the editor can't
  // produce. Dependency-free ESM.
  ({ isValidValue: isValidValueFn } = await import(
    '../../packages/volto-hydra/src/utils/schemaValidation.mjs'
  ));

  // Load Hydra's real schema resolver offline (esbuild-bundled) and install the
  // child-block enhancers + inject blocksConfig, exactly as the addon does at
  // init. After this, resolveEffectiveSchemaFn gives the dynamic required set.
  await loadOfflineBlockSyncApi(blocksConfig);

  const seen = new Map();
  const slateIssues = [];
  const shapeIssues = [];
  // (blockType, field) → one example location, for fields present in data but
  // absent from the schema. Deduped so each missing field is reported once.
  const undeclaredFields = new Map();
  // Containment: a non-fixed block whose @type isn't in its container's resolved
  // allowedSiblingTypes can't be reordered within its container (the mobile
  // chevron / drag walks it OUT to the nearest ancestor that accepts the type,
  // so it "escapes"). Surface each as a failing test, like the issues below.
  const allowedBlocksViolations = []; // {blockType, allowed, parentType, pagePath, blockId}
  const containmentRules = readContainmentRules();
  // Track block @types seen in content that aren't in blocksConfig — the
  // frontend's Block.vue falls through to a "Not implemented" placeholder
  // for these. Collect all occurrences so the report shows every page
  // affected, not just the first.
  const unregisteredTypes = new Map(); // blockType → [{pagePath, blockId}]
  // Item block types a stored listing/grid renders via its item-type field, and
  // WHERE. Such a type has no stored authored instance of its own, but it IS
  // rendered on the page holding that listing/grid — so we emit its render test
  // anchored there (the items share the container's data-block-uid).
  // itemType → { pagePath, containerUid }
  const itemTypeExamples = new Map();
  const REGISTERED = new Set(Object.keys(blocksConfig || {}));
  // Plone content types appear as @type on the page root (Document, etc.)
  // — skip these, they're not blocks.
  const PAGE_TYPES = new Set(['Document', 'Folder', 'Plone Site', 'News Item', 'Event']);
  const covConfig =
    coverageConfig && Object.keys(coverageConfig).length ? coverageConfig : blocksConfig;
  // Which types actually appear in content, according to the container API
  // itself. Collected from the path map rather than rebuilt from `allCovered`
  // and the `sub:` filler entries: buildBlockPathMap is what knows the
  // schema-defined container fields and resolves an object_list item's real
  // type from its typeField, so asking it is both shorter and the single
  // source of truth. Re-deriving that is how the earlier version managed to
  // report "no content example" for a form field type sitting in the fixture.
  const typesInContent = new Set();
  const objectListFields = buildObjectListFieldsMap(covConfig);
  const allowedBlocksList = buildAllowedBlocksList(covConfig);

  if (objectListFields.size > 0) {
    console.log(`[DISCOVER] Using schemas for ${objectListFields.size} block types with object_list fields`);
  }

  // subTypeExamples: key "parentType|field|subType" → first parent instance
  // (uid + pagePath + blockData) that contains a sub-block of that subType.
  // After the rich/simple pass, we use this to ensure every allowedBlocks
  // sub-type has at least one parent covering it in the final test set.
  const subTypeExamples = new Map();

  // Step 1: Get all content paths via @search (b_size=9999 to avoid pagination)
  const searchUrl = `${apiUrl}/@search?b_size=9999`;
  console.log(`[DISCOVER] Fetching content list from ${searchUrl}`);
  const searchResp = await fetch(searchUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!searchResp.ok) {
    throw new Error(`Failed to fetch @search: ${searchResp.status} ${searchResp.statusText}`);
  }
  const searchData = await searchResp.json();
  const items = searchData.items || [];
  console.log(`[DISCOVER] Found ${items.length} content items`);

  // Filter to page-like types that have blocks
  const pageTypes = new Set(['Document', 'Folder', 'Plone Site', 'News Item', 'Event']);
  const pages = items.filter(item => pageTypes.has(item['@type']));

  // Always include site root (/) — @search typically excludes it
  const rootInResults = pages.some(p => new URL(p['@id']).pathname === '/');
  if (!rootInResults) {
    pages.unshift({ '@id': `${apiUrl}/`, '@type': 'Plone Site' });
  }
  console.log(`[DISCOVER] ${pages.length} page-like items to scan`);

  // Step 2: Fetch each page and extract blocks
  let fetched = 0;
  for (const item of pages) {
    if (fetched >= maxPages) break;

    const pagePath = new URL(item['@id']).pathname;

    try {
      const resp = await fetch(`${apiUrl}${pagePath}`, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;

      const content = await resp.json();
      fetched++;

      if (!content.blocks || !content.blocks_layout?.items) continue;

      // Use hydra's schema-driven pathMap. Every entry (top-level block or
      // object_list sub-item) has a real path + resolved schema via
      // `_schemaRef`. No synthetic `parentType:field` types.
      const pathMap = buildBlockPathMap(content, blocksConfig);

      // Coverage view of the same page. In a schema-less sweep blocksConfig is
      // empty, so the map above cannot see object_list fields at all — and
      // every typed sub-item would look absent from content. Built only when
      // the two configs differ, so schema-ful callers pay nothing.
      //
      // On a CLONE, deliberately: buildBlockPathMap normalizes as it walks, so
      // running it a second time over the same object left the main walk seeing
      // typed items it had not seen before — 48 shape/slate issues appeared out
      // of nowhere in a schema-less run that had reported none.
      const covMap =
        covConfig === blocksConfig
          ? pathMap
          : buildBlockPathMap(JSON.parse(JSON.stringify(content)), covConfig);
      for (const [id, e] of Object.entries(covMap)) {
        if (id === '_schemas' || id === '_page' || !e || !Array.isArray(e.path)) continue;
        // An untyped object_list item has a virtual type (`parent:field`) and is
        // not a registrable block; only typed items count as their own type.
        if (e.isObjectListItem && !e.typeField) continue;
        if (!e.blockType) continue;
        // Same bar as the render tests: a locked instance is not an editable
        // example. Counting one would let a type whose only appearance is a
        // readOnly template member look covered — the opposite of what this
        // check is for.
        let d = content;
        for (const seg of e.path) d = d?.[seg];
        if (!d || typeof d !== 'object') continue;
        if (!isEditableInstance(pagePath, d)) continue;
        typesInContent.add(e.blockType);
      }

      for (const [blockId, entry] of Object.entries(pathMap)) {
        if (blockId === '_schemas' || blockId === '_page') continue;
        if (!entry || typeof entry !== 'object' || !Array.isArray(entry.path)) continue;

        // Resolve block data from the entry's path
        let blockData = content;
        for (const segment of entry.path) {
          blockData = blockData?.[segment];
          if (blockData === undefined) break;
        }
        if (!blockData || typeof blockData !== 'object') continue;

        // `@type` for a real block; for a TYPED object_list item (a form's
        // `subblocks`, keyed by `field_id` and typed by `field_type`) the item
        // has no `@type`, so fall back to the per-item type buildBlockPathMap
        // already resolved from the container's `typeField`. Without this a form
        // field (text / select / single_choice …) is skipped from coverage
        // instead of being credited as its own registered block type.
        const blockType = blockData['@type'] || entry.blockType;
        // Resolved schema for this entry — may be inline (object_list schema)
        // or come from blocksConfig[blockType].
        const schemaRef = entry._schemaRef;
        const resolvedSchema = schemaRef ? pathMap._schemas?.[schemaRef] : null;
        const schema = resolvedSchema || (blockType ? blocksConfig[blockType]?.blockSchema : null);

        // Containment check (see allowedBlocksViolations above): flag a block
        // placed in a container that doesn't allow its @type.
        if (
          entry.blockType &&
          !isContainmentExempt(entry, blockData, containmentRules)
        ) {
          allowedBlocksViolations.push({
            blockType: entry.blockType,
            allowed: entry.allowedSiblingTypes,
            parentType: pathMap[entry.parentId]?.blockType || 'page',
            pagePath,
            blockId,
          });
        }

        collectSlateIssues(blockData, pagePath, blockId, slateIssues, blockType);
        // Effective (dynamic) required set from Hydra's REAL resolver — fieldRules
        // + hideParentOwnedFields applied, so a conditionally-hidden field (a
        // card's `image` when its grid disables the image element) is correctly
        // dropped. Per-block try/catch: one odd block must not abort discovery;
        // on failure the shape check falls back to unconditional-required only.
        let effectiveRequired = null;
        if (resolveEffectiveSchemaFn) {
          try {
            effectiveRequired =
              resolveEffectiveSchemaFn(blockId, content, pathMap, blocksConfig, STUB_INTL)
                ?.required || null;
          } catch {
            effectiveRequired = null;
          }
        }
        collectWidgetShapeIssues(
          blockData, schema, pagePath, blockId, shapeIssues, blockType, undeclaredFields,
          blockType ? blocksConfig[blockType] : undefined, blocksConfig, effectiveRequired,
          pathMap?.[blockId],
        );

        // Unregistered block type: any real @type the frontend can't render is
        // a problem no matter how deep it sits — a nested unknown falls through
        // to the "Not implemented" placeholder just like a top-level one. Flag
        // every unregistered @type at any depth (object_list sub-items whose
        // type is parent-controlled have no @type of their own, so they're
        // naturally excluded by the `blockType` guard).
        if (
          blockType &&
          REGISTERED.size &&
          !REGISTERED.has(blockType) &&
          !PAGE_TYPES.has(blockType)
        ) {
          if (!unregisteredTypes.has(blockType)) unregisteredTypes.set(blockType, []);
          unregisteredTypes.get(blockType).push({ pagePath, blockId });
        }

        // A listing/grid stamps its item-type field's VALUE onto every expanded
        // result's @type, so that value must be a registered block type. When it
        // is, record the type as covered (it's rendered — and render-tested — on
        // this block's page even without a stored instance of its own). When it
        // isn't, flag it: every result would fall through to "Unimplemented".
        if (blockType) {
          const itemTypeField = itemTypeFieldOf(blocksConfig[blockType]);
          if (itemTypeField) {
            const itemType = blockData[itemTypeField];
            if (typeof itemType === 'string' && itemType && itemType !== 'default') {
              if (REGISTERED.has(itemType)) {
                if (!itemTypeExamples.has(itemType)) {
                  itemTypeExamples.set(itemType, { pagePath, containerUid: blockId });
                }
              } else if (!PAGE_TYPES.has(itemType)) {
                shapeIssues.push({
                  pagePath,
                  blockId,
                  blockType,
                  issues: [
                    `field "${itemTypeField}": item type ${JSON.stringify(itemType)} is not a registered block ` +
                      `type — ${blockType} expands each result as \`@type: ${JSON.stringify(itemType)}\`, which the ` +
                      `frontend renders as "Unimplemented". Set it to a registered item block type (e.g. "card", "listItem").`,
                  ],
                });
              }
            }
          }
        }

        // Only add real @type blocks to the dedup set used for sanity tests.
        // Object_list sub-items get their widget-shape check above but don't
        // need separate sanity test cases — they're covered by their parent
        // block's render test.
        if (!blockType) continue;

        const variation = variationOf(blockData);
        const score = richnessScore(blockData);
        const label = variation === 'default' ? blockType : `${blockType} (${variation})`;

        // Track BOTH the richest example (most populated → exercises every
        // edit annotation, widget shape, slate node type) AND the simplest
        // (lowest score → catches degenerate cases like null slate values
        // that fall through to "Not implemented" rendering). Same render
        // test fires for each kind.
        //
        // Locked copies stamped onto ordinary pages are still walked above for
        // shape/slate/containment validation, but are never the subject of the
        // render + editing checks (see editableInstance).
        const editable = editableInstance(content, blockData);
        if (!editable) continue;

        for (const kind of ['rich', 'simple']) {
          const key = `${blockType}:${variation}:${kind}`;
          const existing = seen.get(key);
          const better = kind === 'rich' ? score > (existing?._score ?? -Infinity)
                                         : score < (existing?._score ?? Infinity);
          if (existing && !better) continue;
          if (existing) {
            console.log(`[DISCOVER] Replaced ${label} (${kind}) with ${kind === 'rich' ? 'richer' : 'simpler'} example from ${pagePath} (score ${existing._score} → ${score})`);
          } else {
            console.log(`[DISCOVER] Found ${label} (${kind}) block "${blockId}" on ${pagePath} (score ${score})`);
          }
          seen.set(key, {
            blockType,
            variation,
            kind,
            blockId,
            pagePath,
            blockData,
            isListing: blockType === 'listing',
            // A locked block on its own definition page: the spec unlocks its
            // template instance (id read from the bridge) before checking.
            needsUnlock: editable.needsUnlock,
            _score: score,
          });
        }

        // Record first-seen example of every (parentType, field, subType)
        // tuple so the sub-type coverage pass can fill gaps the rich/simple
        // picks don't happen to cover.
        for (const { parentType, field } of allowedBlocksList) {
          if (parentType !== blockType) continue;
          for (const subType of subTypesInField(blockData, field)) {
            const stKey = `${parentType}|${field}|${subType}`;
            if (!subTypeExamples.has(stKey)) {
              subTypeExamples.set(stKey, { blockId, pagePath, blockData, variation });
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DISCOVER] Skipping ${pagePath}: ${msg}`);
    }
  }

  // Sub-type coverage pass: ensure every declared allowedBlocks sub-type has
  // at least one test case via a parent instance containing it. If a rich or
  // simple pick already covers it (same blockId appears in seen), no extra
  // test is added. Uncovered sub-types with no content example anywhere are
  // reported via missingSubTypes for a warning below.
  const missingSubTypes = [];
  const coveredByBlockId = new Map(); // blockId → Set<"parentType|field|subType">
  for (const entry of seen.values()) {
    const covered = coveredByBlockId.get(entry.blockId) || new Set();
    for (const { parentType, field } of allowedBlocksList) {
      if (parentType !== entry.blockType) continue;
      for (const subType of subTypesInField(entry.blockData, field)) {
        covered.add(`${parentType}|${field}|${subType}`);
      }
    }
    coveredByBlockId.set(entry.blockId, covered);
  }
  const allCovered = new Set();
  for (const covered of coveredByBlockId.values()) {
    for (const k of covered) allCovered.add(k);
  }

  for (const { parentType, field, allowedBlocks } of allowedBlocksList) {
    for (const subType of allowedBlocks) {
      const stKey = `${parentType}|${field}|${subType}`;
      if (allCovered.has(stKey)) continue;
      const example = subTypeExamples.get(stKey);
      if (!example) {
        missingSubTypes.push({ parentType, field, subType });
        continue;
      }
      const key = `sub:${parentType}:${field}:${subType}`;
      console.log(`[DISCOVER] Found ${parentType} [sub:${subType}] block "${example.blockId}" on ${example.pagePath} (adds ${subType} coverage)`);
      seen.set(key, {
        blockType: parentType,
        variation: example.variation,
        kind: `sub:${subType}`,
        blockId: example.blockId,
        pagePath: example.pagePath,
        blockData: example.blockData,
        isListing: parentType === 'listing',
        _score: 0,
      });
    }
  }

  // Dedupe by blockId — when the same parent uid shows up as rich AND as a
  // sub-type filler (or simple + sub-type), one render test exercises the
  // full pathMap walk and covers everything inside.
  const byUid = new Map();
  for (const entry of seen.values()) {
    if (!byUid.has(entry.blockId)) byUid.set(entry.blockId, entry);
  }
  const result = Array.from(byUid.values()).map(({ _score, ...rest }) => rest);
  console.log(`[DISCOVER] Discovered ${result.length} unique (blockType, variation, kind) pairs from ${fetched} pages`);

  if (missingSubTypes.length) {
    const lines = missingSubTypes.map(
      ({ parentType, field, subType }) => `  - ${parentType}.${field}: allowed sub-type "${subType}" has no content example`,
    );
    console.warn(
      `[DISCOVER] ${missingSubTypes.length} allowed sub-type(s) have no content example — ` +
        `renderer paths for these are untested:\n${lines.join('\n')}`,
    );
  }

  // A block @type used in content but not registered in the frontend's
  // blocksConfig is a real problem (it renders as "Not implemented Block"), but
  // it should NOT block the whole suite in globalSetup — it is just another
  // failing test. Emit a synthetic discovered-block entry per unregistered
  // type so block-sanity generates one failing test each, while the registered
  // blocks still run.
  for (const [blockType, occurrences] of unregisteredTypes) {
    result.push({
      blockType,
      blockId: occurrences[0].blockId,
      pagePath: occurrences[0].pagePath,
      unregistered: true,
      occurrenceCount: occurrences.length,
    });
  }

  // Like unregistered types, containment / shape / slate issues are real
  // content/schema problems but should each be a failing test rather than
  // blocking the whole suite in globalSetup. Emit a synthetic discovered-block
  // entry per issue.
  for (const v of allowedBlocksViolations) {
    result.push({
      blockType: v.blockType,
      blockId: v.blockId,
      pagePath: v.pagePath,
      allowedBlocksViolation: true,
      parentType: v.parentType,
      allowed: v.allowed,
    });
  }

  for (const e of shapeIssues) {
    result.push({
      blockType: e.blockType,
      blockId: e.blockId,
      pagePath: e.pagePath,
      shapeIssue: true,
      issues: e.issues,
    });
  }

  for (const e of slateIssues) {
    result.push({
      blockType: e.blockType || 'slate',
      blockId: e.blockId,
      pagePath: e.pagePath,
      slateIssue: true,
      field: e.field,
      issues: e.issues,
    });
  }

  // One failing test per (blockType, field) present in data but missing from
  // the schema — reported once, not per instance. A schema-completeness backlog
  // (these fields can't be edited in the sidebar until declared).
  for (const { blockType, field, blockId, pagePath } of undeclaredFields.values()) {
    result.push({ blockType, blockId, pagePath, field, undeclaredField: true });
  }

  // Every block type the FRONTEND registers needs at least one content
  // example so the sanity spec emits a render test for it — INCLUDING
  // `restricted` types. `restricted` only means "not offered in the page block
  // chooser"; the block still renders (inside a container), so it still needs
  // an example to be render-tested. If a type is genuinely container-only, add
  // a fixture whose parent instance uses it — the child is then discovered
  // nested and covered — rather than relying on `restricted` to skip coverage.
  // `frontendKeys` (types the frontend sent via INIT.blocks) keeps mock-parent's
  // own baseline (hero, slate, mock-*) from causing false positives.
  if (frontendKeys && frontendKeys.length) {
    // Coverage requirement = the frontend's own registered types PLUS every type
    // they declare addable in a region (`allowedBlocks`). A block that can be
    // added anywhere must render, so it needs a content example even when it is
    // not itself a top-level registered type — this is how the always-addable
    // default blocks (slate, image) enter the hard coverage set. Restricted to
    // FRONTEND schemas (`parentType` in frontendKeys) so the mock-parent test
    // baseline's own allowedBlocks (e.g. 'column') don't create false positives.
    const frontendKeySet = new Set(frontendKeys);
    const required = new Set(frontendKeys);
    for (const { parentType, allowedBlocks } of allowedBlocksList) {
      if (!frontendKeySet.has(parentType)) continue;
      for (const subType of allowedBlocks) required.add(subType);
    }
    // Only entries that carry block data are real render cases. Issue entries
    // (shape, slate, undeclared field, containment) name a blockType too, and
    // counting those as coverage let a type with an unrelated failure hide the
    // fact that it has no example at all — `form` and `search` both have
    // schema-gap failures, and were silently exempted from needing one.
    const discoveredTypes = new Set(
      result.filter((r) => r.blockData !== undefined).map((r) => r.blockType),
    );
    // An object_list sub-item IS an example of its own type, even though its
    // render test is anchored on the parent and therefore carries the parent's
    // blockType (kind: 'sub:<type>'). Counting only `blockType` reported "no
    // content example" for every form field type while form-test-page plainly
    // contained a text, a textarea, a select, a single_choice, a checkbox and a
    // from. Turning that into a failure would have asked maintainers to add
    // fixtures that already exist.
    // Every type the container API found in content — including object_list
    // sub-items, whose examples live inside a parent and so never appear in
    // `result` under their own blockType. Without this a form field type
    // reported "no content example" while form-test-page plainly contained one.
    for (const t of typesInContent) discoveredTypes.add(t);
    for (const blockType of required) {
      if (discoveredTypes.has(blockType)) continue;
      // A dynamic listing/grid item type has no stored authored instance, but a
      // stored listing/grid that VALIDLY names it renders it on a real page.
      // Emit its render test anchored on that page against the container's uid:
      // the expanded items share their container's data-block-uid, so verifying
      // the container walks the rendered items (their images must load, etc.).
      // Added after the by-uid dedup above, so it coexists with the container's
      // own test but is labelled as this item type. A type nothing validly
      // renders (or only named via an already-flagged invalid value) still fails.
      const ex = itemTypeExamples.get(blockType);
      if (ex) {
        result.push({
          blockType,
          blockId: ex.containerUid,
          pagePath: ex.pagePath,
          blockData: {},
          isListing: true,
        });
        continue;
      }
      result.push({ blockType, noExample: true });
    }
  }

  return result;
}

module.exports = {
  discoverBlocks,
  extractBlocks,
  buildObjectListFieldsMap,
  buildEmptyRegionCases,
  isContainmentExempt,
  readContainmentRules,
};
