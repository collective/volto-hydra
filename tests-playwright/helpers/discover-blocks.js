/**
 * Crawls a Plone REST API to discover one example of each block @type.
 *
 * Used by globalSetup to write .discovered-blocks.json, which the
 * block-sanity spec reads at module load time to parametrize tests.
 *
 * Works against any Plone API (mock or real) — no filesystem access needed.
 * When blocksConfig (schemas) is provided, also discovers object_list sub-blocks.
 *
 * @typedef {{ blockType: string, blockId: string, pagePath: string, blockData: Object, isListing: boolean }} DiscoveredBlock
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
 * Discover one example of each block type from a Plone API.
 *
 * @param {string} apiUrl - Base URL of the Plone API (e.g. "http://localhost:8888")
 * @param {number} [maxPages=50] - Maximum number of pages to fetch
 * @param {Object} [blocksConfig={}] - Block schemas for object_list discovery
 * @returns {Promise<DiscoveredBlock[]>} One entry per unique block @type
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
        if (seen.has(blockType)) continue;

        // Skip metadata block types that don't render visually
        if (blockType === 'title' || blockType === 'description') continue;

        seen.set(blockType, {
          blockType,
          blockId,
          pagePath,
          blockData,
          isListing: blockType === 'listing',
        });

        console.log(`[DISCOVER] Found ${blockType} block "${blockId}" on ${pagePath}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DISCOVER] Skipping ${pagePath}: ${msg}`);
    }
  }

  const result = Array.from(seen.values());
  console.log(`[DISCOVER] Discovered ${result.length} unique block types from ${fetched} pages`);
  return result;
}

module.exports = { discoverBlocks, extractBlocks, buildObjectListFieldsMap };
