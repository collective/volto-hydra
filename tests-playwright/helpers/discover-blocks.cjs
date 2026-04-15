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
async function discoverBlocks(apiUrl, maxPages = 50, blocksConfig = {}) {
  const seen = new Map();
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
  return result;
}

module.exports = { discoverBlocks, extractBlocks, buildObjectListFieldsMap };
