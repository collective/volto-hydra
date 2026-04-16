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
  for (const [key, value] of Object.entries(blockData || {})) {
    if (key.startsWith('@') || key === 'blocks' || key === 'blocks_layout') continue;
    if (value == null) continue;
    if (typeof value === 'string' && value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    score += 1;
    // Arrays of slate nodes or single slate-like trees
    if (Array.isArray(value) && value.length && typeof value[0] === 'object' && value[0] && 'children' in value[0]) {
      collectSlateNodeTypes(value, slateTypes);
    }
  }
  return score + slateTypes.size;
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

async function discoverBlocks(apiUrl, maxPages = Infinity, blocksConfig = {}) {
  const seen = new Map();
  const slateIssues = [];
  const objectListFields = buildObjectListFieldsMap(blocksConfig);

  if (objectListFields.size > 0) {
    console.log(`[DISCOVER] Using schemas for ${objectListFields.size} block types with object_list fields`);
  }

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

      const blocks = extractBlocks(content.blocks, content.blocks_layout.items, objectListFields);

      for (const { blockId, blockType, blockData } of blocks) {
        collectSlateIssues(blockData, pagePath, blockId, slateIssues);

        // Skip metadata block types that don't render visually
        if (blockType === 'title' || blockType === 'description') continue;

        const variation = variationOf(blockData);
        const key = `${blockType}:${variation}`;
        const score = richnessScore(blockData);
        const existing = seen.get(key);
        if (existing && existing._score >= score) continue;

        const label = variation === 'default' ? blockType : `${blockType} (${variation})`;
        if (existing) {
          console.log(`[DISCOVER] Replaced ${label} with richer example from ${pagePath} (score ${existing._score} → ${score})`);
        } else {
          console.log(`[DISCOVER] Found ${label} block "${blockId}" on ${pagePath} (score ${score})`);
        }

        seen.set(key, {
          blockType,
          variation,
          blockId,
          pagePath,
          blockData,
          isListing: blockType === 'listing',
          _score: score,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DISCOVER] Skipping ${pagePath}: ${msg}`);
    }
  }

  const result = Array.from(seen.values()).map(({ _score, ...rest }) => rest);
  console.log(`[DISCOVER] Discovered ${result.length} unique (blockType, variation) pairs from ${fetched} pages`);

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

  return result;
}

module.exports = { discoverBlocks, extractBlocks, buildObjectListFieldsMap };
