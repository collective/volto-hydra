/**
 * Crawls a Plone REST API to discover one example of each block @type.
 *
 * Used by globalSetup to write .discovered-blocks.json, which the
 * block-sanity spec reads at module load time to parametrize tests.
 *
 * Works against any Plone API (mock or real) — no filesystem access needed.
 */

export interface DiscoveredBlock {
  /** The block's @type (e.g. "hero_block", "features", "slate") */
  blockType: string;
  /** The block's ID (key in the blocks dict) */
  blockId: string;
  /** The API path of the page containing this block */
  pagePath: string;
  /** The full block data object */
  blockData: Record<string, unknown>;
  /** Whether this is a listing block (multiple elements share same data-block-uid) */
  isListing: boolean;
}

/**
 * Recursively extract all blocks from a content object.
 * Handles nested containers: section, gridBlock, columns, accordion, etc.
 * Returns flat array of { blockId, blockType, blockData }.
 */
function extractBlocks(
  blocks: Record<string, any>,
  layout?: string[],
): { blockId: string; blockType: string; blockData: Record<string, unknown> }[] {
  const result: { blockId: string; blockType: string; blockData: Record<string, unknown> }[] = [];
  const blockIds = layout || Object.keys(blocks);

  for (const blockId of blockIds) {
    const block = blocks[blockId];
    if (!block || typeof block !== 'object') continue;

    const blockType = block['@type'] as string;
    if (!blockType) continue;

    result.push({ blockId, blockType, blockData: block });

    // Recurse into nested blocks (containers)
    if (block.blocks && typeof block.blocks === 'object') {
      const nestedLayout = block.blocks_layout?.items;
      result.push(...extractBlocks(block.blocks, nestedLayout));
    }

    // Handle object_list style arrays (accordion panels, slider slides, etc.)
    for (const [key, value] of Object.entries(block)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && item.blocks) {
            result.push(...extractBlocks(item.blocks, item.blocks_layout?.items));
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
 * @param apiUrl - Base URL of the Plone API (e.g. "http://localhost:8888")
 * @param maxPages - Maximum number of pages to fetch (default 50)
 * @returns Array of DiscoveredBlock, one per unique @type
 */
export async function discoverBlocks(
  apiUrl: string,
  maxPages: number = 50,
): Promise<DiscoveredBlock[]> {
  const seen = new Map<string, DiscoveredBlock>();

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
  const items: { '@id': string; '@type': string }[] = searchData.items || [];
  console.log(`[DISCOVER] Found ${items.length} content items`);

  // Filter to page-like types that have blocks
  const pageTypes = new Set(['Document', 'Folder', 'Plone Site', 'News Item', 'Event']);
  const pages = items.filter(item => pageTypes.has(item['@type']));
  console.log(`[DISCOVER] ${pages.length} page-like items to scan`);

  // Step 2: Fetch each page and extract blocks
  let fetched = 0;
  for (const item of pages) {
    if (fetched >= maxPages) break;

    // Extract path from @id (strip the API base URL)
    const itemUrl = item['@id'];
    const pagePath = new URL(itemUrl).pathname;

    try {
      const contentUrl = `${apiUrl}${pagePath}`;
      const resp = await fetch(contentUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;

      const content = await resp.json();
      fetched++;

      if (!content.blocks || !content.blocks_layout?.items) continue;

      const blocks = extractBlocks(content.blocks, content.blocks_layout.items);

      for (const { blockId, blockType, blockData } of blocks) {
        if (seen.has(blockType)) continue;

        // Skip metadata block types that don't render visually
        const skipTypes = new Set(['title', 'description']);
        if (skipTypes.has(blockType)) continue;

        seen.set(blockType, {
          blockType,
          blockId,
          pagePath,
          blockData,
          isListing: blockType === 'listing',
        });

        console.log(`[DISCOVER] Found ${blockType} block "${blockId}" on ${pagePath}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DISCOVER] Skipping ${pagePath}: ${msg}`);
    }
  }

  const result = Array.from(seen.values());
  console.log(`[DISCOVER] Discovered ${result.length} unique block types from ${fetched} pages`);
  return result;
}
