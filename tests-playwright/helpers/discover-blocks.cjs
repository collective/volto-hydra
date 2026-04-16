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
 *  - Multi-root values force renderers to add a nodeId-less wrapper.
 *  - Missing `type` on root element.
 *  - Invalid node shapes anywhere in the tree.
 *
 * Schema-independent; runs against raw API data.
 */
function collectSlateIssues(blockData, pagePath, blockId, out) {
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
      issues.push(`multiple top-level nodes (${value.length}); split into separate blocks`);
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
function collectWidgetShapeIssues(blockData, blockSchema, pagePath, blockId, out) {
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

    if (widget === 'url') {
      if (typeof value !== 'string') {
        issues.push(describe('url string', value));
      }
    } else if (widget === 'object_browser') {
      // Plone link format: [{"@id": "/path"}] (array of objects with @id).
      if (!Array.isArray(value)) {
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
    } else if (widget === 'select' || widget === 'choice' || def?.factory === 'Choice') {
      const choices = def.choices || [];
      const allowed = choices.map(c => (Array.isArray(c) ? c[0] : c));
      if (allowed.length && !allowed.includes(value)) {
        issues.push(`field "${field}": value ${JSON.stringify(value)} not in declared choices ${JSON.stringify(allowed)}`);
      }
    } else if (widget === 'slate') {
      if (!Array.isArray(value)) issues.push(describe('slate array', value));
    } else if (widget === 'object_list') {
      // object_list stores an array of items; an idField (default '@id')
      // identifies each. If data is nested (dataPath), value may be an
      // object — tolerate that. Just check it's not a primitive.
      if (typeof value !== 'object' || value === null) {
        issues.push(describe('object_list array/object', value));
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

  if (issues.length) {
    out.push({ pagePath, blockId, blockType: blockData['@type'], issues });
  }
}

async function discoverBlocks(apiUrl, maxPages = Infinity, blocksConfig = {}, frontendKeys = []) {
  // Use hydra's canonical buildBlockPathMap to walk content — it knows
  // the schema-defined container fields (blocks_layout, object_list,
  // columns, …) and distinguishes real blocks from inline sub-items.
  // Dynamically imported because the module is ESM and this helper is CJS.
  const { buildBlockPathMap } = await import('../../packages/hydra-js/buildBlockPathMap.js');

  const seen = new Map();
  const slateIssues = [];
  const shapeIssues = [];
  // Track block @types seen in content that aren't in blocksConfig — the
  // frontend's Block.vue falls through to a "Not implemented" placeholder
  // for these. Collect all occurrences so the report shows every page
  // affected, not just the first.
  const unregisteredTypes = new Map(); // blockType → [{pagePath, blockId}]
  const REGISTERED = new Set(Object.keys(blocksConfig || {}));
  // Plone content types appear as @type on the page root (Document, etc.)
  // — skip these, they're not blocks.
  const PAGE_TYPES = new Set(['Document', 'Folder', 'Plone Site', 'News Item', 'Event']);
  const objectListFields = buildObjectListFieldsMap(blocksConfig);
  const allowedBlocksList = buildAllowedBlocksList(blocksConfig);

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

        const blockType = blockData['@type']; // may be undefined for object_list items
        // Resolved schema for this entry — may be inline (object_list schema)
        // or come from blocksConfig[blockType].
        const schemaRef = entry._schemaRef;
        const resolvedSchema = schemaRef ? pathMap._schemas?.[schemaRef] : null;
        const schema = resolvedSchema || (blockType ? blocksConfig[blockType]?.blockSchema : null);

        collectSlateIssues(blockData, pagePath, blockId, slateIssues);
        collectWidgetShapeIssues(blockData, schema, pagePath, blockId, shapeIssues);

        // Unregistered block type: only real @type values placed at a
        // blocks_layout-style position count. Object_list sub-items don't
        // need top-level registration — their type is controlled by the
        // parent's schema.
        const isTopLevelBlock = entry.containerField === 'blocks' || entry.parentId === '_page';
        if (
          blockType &&
          isTopLevelBlock &&
          REGISTERED.size &&
          !REGISTERED.has(blockType) &&
          !PAGE_TYPES.has(blockType)
        ) {
          if (!unregisteredTypes.has(blockType)) unregisteredTypes.set(blockType, []);
          unregisteredTypes.get(blockType).push({ pagePath, blockId });
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

  if (unregisteredTypes.size) {
    const lines = [];
    for (const [blockType, occurrences] of unregisteredTypes) {
      const sample = occurrences.slice(0, 5).map((o) => `${o.pagePath} [${o.blockId}]`);
      const more = occurrences.length > 5 ? ` (+ ${occurrences.length - 5} more)` : '';
      lines.push(`  - "${blockType}": ${occurrences.length} occurrence(s) — e.g. ${sample.join(', ')}${more}`);
    }
    throw new Error(
      `Discovery found ${unregisteredTypes.size} block @type(s) used in content but not registered ` +
        `in the frontend's blocksConfig. The renderer will fall through to "Not implemented Block". ` +
        `Either register the schema (customBlocks) or migrate the content to an existing type.\n` +
        lines.join('\n'),
    );
  }

  if (shapeIssues.length) {
    const lines = shapeIssues.flatMap((e) => [
      `  ${e.pagePath} [${e.blockId}] (${e.blockType}):`,
      ...e.issues.map((msg) => `    - ${msg}`),
    ]);
    throw new Error(
      `Discovery found ${shapeIssues.length} block(s) whose data shape doesn't match the ` +
        `declared widget/type in the block schema. These will crash Volto's sidebar widgets ` +
        `(e.g. UrlWidget expecting a string but getting an array). Either fix the content ` +
        `or update the schema.\n` +
        lines.join('\n'),
    );
  }

  if (slateIssues.length) {
    const lines = slateIssues.flatMap((e) => [
      `  ${e.pagePath} [${e.blockId}] field "${e.field}":`,
      ...e.issues.map((msg) => `    - ${msg}`),
    ]);
    throw new Error(
      `Discovery found ${slateIssues.length} slate field(s) with structural issues. ` +
        `Each slate field must be a single element root with a string \`type\`; ` +
        `text leaves must live inside an element.\n` +
        lines.join('\n'),
    );
  }

  // Every block type the FRONTEND registers needs at least one content
  // example so the sanity spec emits a render test for it. We use
  // `frontendKeys` (passed in) — the set of types the frontend sent via
  // INIT.blocks — so mock-parent's own test baseline (hero, slate, mock-*)
  // doesn't trigger false positives. `restricted: true` types (form fields,
  // column sub-blocks) are only valid inside specific containers and are
  // covered by their parent's render test.
  if (frontendKeys && frontendKeys.length) {
    const discoveredTypes = new Set(result.map((r) => r.blockType));
    const missing = [];
    for (const blockType of frontendKeys) {
      const cfg = blocksConfig[blockType];
      if (cfg?.restricted) continue;
      if (!discoveredTypes.has(blockType)) missing.push(blockType);
    }
    if (missing.length) {
      throw new Error(
        `Discovery found ${missing.length} frontend-registered block type(s) with no content ` +
          `example to run the sanity render test against. Add a fixture (page with a populated ` +
          `instance) or mark the type restricted if it only belongs inside a parent container.\n` +
          missing.map((t) => `  - ${t}`).join('\n'),
      );
    }
  }

  return result;
}

module.exports = { discoverBlocks, extractBlocks, buildObjectListFieldsMap };
