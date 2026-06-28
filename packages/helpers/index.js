/**
 * @volto-hydra/helpers
 *
 * Pure data helpers extracted from `packages/hydra-js/hydra.src.js`.
 *
 * Importing this module must be safe from any JS runtime — browsers,
 * Node servers (Astro / Nuxt server / Express render endpoints), and
 * SSR build steps. It must NOT depend on `window`, `document`,
 * `postMessage`, the Bridge class, or anything that requires the
 * iframe-admin handshake.
 *
 * The two "almost-pure" helpers — `expandListingBlocks` and
 * `ploneFetchItems` — touch the network (fetch) and may consult
 * `window.__hydraBridge` / cookies *if available*, but they are
 * SSR-safe via `typeof window` guards. They are also re-exported from
 * `@volto-hydra/hydra-js` for back-compat so existing callers keep
 * working unchanged.
 */

////////////////////////////////////////////////////////////////////////////////
// Internal: SSR-safe logging + auth header
////////////////////////////////////////////////////////////////////////////////

// Debug logging - disabled by default, enable via window.HYDRA_DEBUG or
// _hydra_debug URL param. Mirrors the gate used in hydra.src.js so the
// two modules log consistently.
let debugEnabled = false;
try {
  debugEnabled = typeof window !== 'undefined' && !!(
    window.HYDRA_DEBUG ||
    (window.location?.search && new URLSearchParams(window.location.search).has('_hydra_debug'))
  );
} catch { /* SSR or restricted environment */ }
function log(...args) {
  if (
    !debugEnabled &&
    !(typeof window !== 'undefined' && window.HYDRA_DEBUG)
  )
    return;
  const runId = typeof window !== 'undefined' && window.__testRunId;
  const prefix = runId != null ? `[HYDRA][RUN-${runId}]` : '[HYDRA]';
  console.log(prefix, ...args);
}

/**
 * SSR-safe minimal token cookie reader — mirrors the cookie-only path
 * of hydra-js's `getTokenFromCookie`. Returns null in any non-browser
 * environment.
 */
function _getTokenFromCookie() {
  if (typeof document === 'undefined') {
    return null;
  }
  const name = 'access_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}

/**
 * SSR-safe minimal access-token reader — mirrors hydra-js's
 * `getAccessToken` but without sessionStorage writes in non-browser
 * environments. Order: URL `access_token` param → sessionStorage →
 * cookie. Returns null on server.
 */
export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  const urlToken = new URL(window.location.href).searchParams.get('access_token');
  if (urlToken) {
    sessionStorage.setItem('hydra_access_token', urlToken);
    return urlToken;
  }
  const sessionToken = sessionStorage.getItem('hydra_access_token');
  if (sessionToken) {
    return sessionToken;
  }
  return _getTokenFromCookie();
}

/**
 * SSR-safe auth headers — returns Bearer if a token is reachable, else
 * just `{ Accept: 'application/json' }`. Mirrors hydra-js's
 * `getAuthHeaders` so server-side and client-side fetchers produce
 * matching requests.
 */
function _getAuthHeaders() {
  const token = getAccessToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }
  return {
    Accept: 'application/json',
  };
}

////////////////////////////////////////////////////////////////////////////////
// contentPath
////////////////////////////////////////////////////////////////////////////////

/**
 * Convert an absolute API URL to a frontend-relative path.
 *
 * Content URLs from the Plone REST API (e.g. @id fields in listing items)
 * use the API base URL. Pass your API base URL to convert them to
 * frontend-relative paths. Note: the bridge may not be initialised in
 * non-edit mode, so the API URL must be provided by the frontend itself.
 *
 * @param {string} url - URL to convert (absolute or relative)
 * @param {string} apiUrl - API base URL (e.g. 'https://api.example.com')
 * @returns {string} Relative path if url starts with apiUrl, otherwise url unchanged
 */
export function contentPath(url, apiUrl) {
  if (!url || !apiUrl || typeof url !== 'string') return url || '';
  if (url.startsWith(apiUrl)) {
    const rel = url.slice(apiUrl.length);
    return rel.startsWith('/') ? rel : '/' + rel;
  }
  return url;
}

////////////////////////////////////////////////////////////////////////////////
// buildQuerystringSearchBody
////////////////////////////////////////////////////////////////////////////////

/**
 * Build the request body for @querystring-search endpoint.
 * This is the Plone endpoint that accepts Volto's querystring format.
 *
 * @param {Object} queryConfig - Volto querystring configuration
 * @param {Array} queryConfig.query - Array of query conditions [{i, o, v}, ...]
 * @param {string} [queryConfig.sort_on] - Field to sort on
 * @param {string} [queryConfig.sort_order] - 'ascending' or 'descending'
 * @param {number} [queryConfig.limit] - Maximum number of results (0 = unlimited)
 * @param {Object} [paging] - Paging options
 * @param {number} [paging.b_start=0] - Starting index
 * @param {number} [paging.b_size=10] - Number of items per page
 * @param {Object} [extraCriteria={}] - Additional query criteria (for search blocks)
 * @param {string} [extraCriteria.SearchableText] - Text search term
 * @param {string} [extraCriteria.sort_on] - Override sort field
 * @param {string} [extraCriteria.sort_order] - Override sort order
 * @param {string|string[]} [extraCriteria['facet.*']] - Facet filters (e.g., 'facet.portal_type': ['Document'])
 * @returns {Object} Request body for POST to @querystring-search
 */
export function buildQuerystringSearchBody(queryConfig, paging = {}, extraCriteria = {}) {
  const { b_start = 0, b_size = 10 } = paging;

  // When no queryConfig at all (listing with no querystring configured),
  // default to current folder contents in folder order — matching Plone's
  // behavior for unconfigured listing blocks.
  const hasQuery = queryConfig?.query && Array.isArray(queryConfig.query) && queryConfig.query.length > 0;

  let query;
  if (hasQuery) {
    // Clone to avoid mutations
    query = [...queryConfig.query];
  } else {
    // Default: relative path "." = current context's children
    query = [
      {
        i: 'path',
        o: 'plone.app.querystring.operation.string.relativePath',
        v: '.',
      },
    ];
  }

  // Merge extraCriteria into query
  if (extraCriteria.SearchableText) {
    query.push({
      i: 'SearchableText',
      o: 'plone.app.querystring.operation.string.contains',
      v: extraCriteria.SearchableText,
    });
  }

  // Add facet filters from extraCriteria (keys starting with 'facet.')
  for (const [key, value] of Object.entries(extraCriteria)) {
    if (key.startsWith('facet.')) {
      const field = key.replace('facet.', '');
      query.push({
        i: field,
        o: 'plone.app.querystring.operation.selection.any',
        v: Array.isArray(value) ? value : [value],
      });
    }
  }

  // Default sort: folder order for unconfigured listings, effective date for configured ones
  const defaultSort = hasQuery ? 'effective' : 'getObjPositionInParent';
  const defaultOrder = hasQuery ? 'descending' : 'ascending';

  const body = {
    query,
    sort_on: extraCriteria.sort_on || queryConfig?.sort_on || defaultSort,
    sort_order: extraCriteria.sort_order || queryConfig?.sort_order || defaultOrder,
    b_start,
    b_size,
    metadata_fields: '_all',
  };

  // Add depth if specified — Plone catalog supports a top-level depth
  // field that limits results to N levels under each path criterion.
  // Used by contextNavigation's listing config so a path+depth combo
  // returns only the right tree slice.
  if (queryConfig?.depth !== undefined) {
    body.depth = queryConfig.depth;
  }

  // Add limit if specified (0 or undefined means no limit)
  if (queryConfig?.limit && queryConfig.limit > 0) {
    body.limit = queryConfig.limit;
  }

  return body;
}

////////////////////////////////////////////////////////////////////////////////
// calculatePaging
////////////////////////////////////////////////////////////////////////////////

/**
 * Calculate paging information from search results.
 *
 * @param {number} itemsTotal - Total number of items
 * @param {number} bSize - Items per page
 * @param {number} currentPage - Current page index (0-based)
 * @returns {Object} Paging info with pages array, prev, next, last
 */
export function calculatePaging(itemsTotal, bSize, currentPage = 0) {
  if (!bSize || bSize <= 0 || !itemsTotal || itemsTotal <= 0) {
    return { pages: [], prev: null, next: null, last: null, totalPages: 0, currentPage: 0, totalItems: 0 };
  }

  const totalPages = Math.ceil(itemsTotal / bSize);
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    start: i * bSize,
    page: i + 1,
  }));

  // Get a window of pages around current page (show 5 pages max)
  const windowStart = Math.max(0, currentPage - 2);
  const windowEnd = Math.min(totalPages, currentPage + 3);
  const visiblePages = pages.slice(windowStart, windowEnd);

  return {
    pages: visiblePages,
    prev: currentPage > 0 ? currentPage - 1 : null,
    next: currentPage < totalPages - 1 ? currentPage + 1 : null,
    last: totalPages - 1,
    totalPages,
    currentPage,
    totalItems: itemsTotal,
  };
}

////////////////////////////////////////////////////////////////////////////////
// staticBlocks (+ computePagingUI helper)
////////////////////////////////////////////////////////////////////////////////

/**
 * Expand listing blocks by fetching query results and converting items to blocks.
 * Uses itemType and fieldMapping from each listing block to determine output format.
 * Each listing is replaced by multiple blocks of the specified itemType in the layout.
 * Works with any fetch library (Nuxt $fetch, React Query, SWR, etc.)
 *
 * @param {Object} blocks - Block data keyed by block ID
 * @param {Array} blocksLayout - Ordered array of block IDs (blocks_layout.items)
 * @param {Object} options
 * @param {string} [options.apiUrl] - Base API URL (required if no fetcher provided)
 * @param {string} options.contextPath - Current content path for relative queries
 * @param {number} [options.page=0] - Current page number (0-indexed)
 * @param {number} [options.pageSize=10] - Number of elements per page
 * @param {Function} [options.fetcher] - Custom fetch function(path, body, headers) => Promise<response>
 * @param {Object} [options.extraCriteria={}] - Additional query criteria (for search blocks)
 * @param {string} [options.extraCriteria.SearchableText] - Text search term
 * @param {string} [options.extraCriteria.sort_on] - Override sort field
 * @param {string} [options.extraCriteria.sort_order] - Override sort order ('ascending'|'descending')
 * @param {string|string[]} [options.extraCriteria['facet.*']] - Facet filters (e.g., 'facet.portal_type': ['Document'])
 * @param {string} [options.itemTypeField='itemType'] - Field name to read item block type from (e.g., 'variation')
 * @param {string} [options.defaultItemType='summary'] - Default item type when field is not set
 * @returns {Promise<{items: Array, paging: Object}>}
 *   - items: Array of blocks, each with @uid (block ID for data-block-uid) and @type
 *   - paging: { currentPage, totalPages, totalItems, prev, next, pages }
 *
 * @example
 * // Listing block with itemType and fieldMapping:
 * // {
 * //   '@type': 'listing',
 * //   'itemType': 'teaser',
 * //   'fieldMapping': { 'title': 'headline', '@id': 'href' },
 * //   'itemDefaults': { 'showImage': true }
 * // }
 * // Query result: { title: 'My Page', '@id': '/my-page', description: '...' }
 * // Output block: { '@type': 'teaser', headline: 'My Page', href: '/my-page', showImage: true }
 */

/**
 * Synchronous helper to pass through static blocks with @uid.
 * Use for non-listing blocks in grids with combined paging.
 *
 * Returns { items, paging } — does NOT mutate the input paging object.
 * Chain `paging.seen` from one call to the next for correct positioning.
 *
 * @param {Array} inputItems - Array of block IDs or objects with @uid
 * @param {Object} options - Configuration options
 * @param {Object} options.blocks - Map of blockId -> block data (for ID lookups)
 * @param {Object} options.paging - Paging input { start, size } (not mutated)
 * @param {number} [options.seen=0] - Number of items already seen (from prior calls)
 * @returns {{ items: Array, paging: Object }} Items on current page + computed paging state
 */
export function staticBlocks(inputItems, options = {}) {
  const { blocks: blocksDict, paging: pagingIn = {} } = options;
  let seen = options.seen || 0;
  const start = pagingIn.start || 0;
  const size = pagingIn.size || 1000;

  // Normalize items: convert IDs to objects if blocksDict provided
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] staticBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    return item;
  }).filter(Boolean);

  const items = [];

  for (const item of normalizedItems) {
    seen++;
    // Only include items on current page
    if (seen > start && (seen - start) <= size) {
      items.push(item);
    }
  }

  // Build output paging with computed UI values
  const paging = { start, size, total: seen, seen };
  computePagingUI(paging);

  return { items, paging };
}

/**
 * Internal helper to compute paging UI values.
 */
function computePagingUI(paging) {
  const { start, size, total } = paging;
  if (size && total) {
    paging.currentPage = Math.floor(start / size);
    paging.totalPages = Math.ceil(total / size);
    paging.totalItems = total;

    // Page number window (show ~5 pages centered on current)
    const windowStart = Math.max(0, paging.currentPage - 2);
    const windowEnd = Math.min(paging.totalPages, paging.currentPage + 3);
    paging.pages = [];
    for (let i = windowStart; i < windowEnd; i++) {
      paging.pages.push({ start: i * size, page: i + 1 });
    }

    paging.prev = paging.currentPage > 0 ? paging.currentPage - 1 : null;
    paging.next = paging.currentPage < paging.totalPages - 1 ? paging.currentPage + 1 : null;
  }

}

////////////////////////////////////////////////////////////////////////////////
// convertFieldValue (+ slateToText, textToSlate helpers)
////////////////////////////////////////////////////////////////////////////////

/**
 * Extract plain text from a Slate JSON value (array of nodes).
 * BR nodes within a paragraph become newlines when separator is '\n'.
 */
function slateToText(nodes, separator = '\n') {
  if (!Array.isArray(nodes)) return String(nodes ?? '');
  return nodes.map(node => {
    if (node.text !== undefined) return node.text;
    if (node.type === 'br') return separator;
    if (node.children) return slateToText(node.children, separator);
    return '';
  }).join('');
}

/**
 * Convert a plain text string to Slate JSON value.
 * Always produces a single paragraph node (Slate fields have one block element).
 * Newlines become BR inline nodes within the paragraph.
 */
function textToSlate(text) {
  const str = String(text ?? '');
  if (!str || !str.includes('\n')) {
    return [{ type: 'p', children: [{ text: str }] }];
  }
  const lines = str.split('\n');
  const children = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) children.push({ type: 'br', children: [{ text: '' }] });
    children.push({ text: lines[i] });
  }
  return [{ type: 'p', children }];
}

/**
 * Convert a field value to match a target JSON Schema type.
 * Used by expandListingBlocks when fieldMapping specifies a target type,
 * and by convertBlockType for coercing values between block schemas.
 *
 * Conversions:
 *   array → string:  join with ", " (or extract @id from link arrays)
 *   Slate array → string:  extract text (no line breaks)
 *   object (image) → string:  extract main image URL
 *   string → link:   wrap as [{ '@id': value }]
 *   string → array:  wrap as [value]
 *   string → slate:  wrap as [{type:'p', children:[{text:value}]}]
 *   Slate → textarea:  extract text with line breaks between paragraphs
 *   string → textarea:  pass through
 *   textarea → slate:  split on newlines into paragraph nodes
 *   * → string:      String(value)
 */
export function convertFieldValue(value, targetType) {
  if (!targetType) return value;  // No type specified = pass through

  switch (targetType) {
    case 'string':
      if (Array.isArray(value)) {
        // Object browser link array: [{@id: '/path', title: '...'}] → extract URL
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        // Slate array: extract text without line breaks
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, ' ');
        return value.join(', ');
      }
      if (value && typeof value === 'object') {
        // Image object: extract main URL from image_scales
        if (value.image_scales && value.image_field) {
          const field = value.image_field;
          const scaleData = value.image_scales[field];
          if (scaleData?.[0]?.download) {
            return `${value['@id'] || ''}/${scaleData[0].download}`;
          }
        }
        return String(value);
      }
      return String(value);

    case 'textarea':
      // Like 'string' but preserves line breaks from Slate paragraphs
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, '\n');
        return value.join(', ');
      }
      if (typeof value === 'string') return value;
      return String(value ?? '');

    case 'slate':
      // Convert to Slate JSON array
      if (Array.isArray(value)) {
        // Already a Slate array — pass through
        if (value.length > 0 && value[0]?.type && value[0]?.children) return value;
        // Object browser link array → extract URL and wrap
        if (value.length > 0 && value[0]?.['@id']) return textToSlate(value[0]['@id']);
        return textToSlate(value.join(', '));
      }
      if (typeof value === 'string') return textToSlate(value);
      return textToSlate(String(value ?? ''));

    case 'link':
      // Volto link format: [{ '@id': url, title?: '...' }]
      if (typeof value === 'string') return [{ '@id': value }];
      if (Array.isArray(value)) {
        // Strip image-specific metadata, keep only link fields
        if (value.length > 0 && value[0]?.['@id']) {
          return value.map(item => {
            const { image_field, image_scales, ...linkFields } = item;
            return linkFields;
          });
        }
        return value;
      }
      if (value && typeof value === 'object' && value['@id']) return [{ '@id': value['@id'] }];
      return [{ '@id': String(value) }];

    case 'image':
      // ImageWidget format: plain string URL (siblings handled by pack/unpack in convertBlockType)
      if (Array.isArray(value)) {
        // Image link array: [{ '@id': url, ... }] → extract URL string
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        // Slate array → extract text as URL
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, ' ');
        return value.join(', ');
      }
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && value['@id']) return value['@id'];
      return value;

    case 'image_link':
      // object_browser image format: [{ '@id': url, image_field?: '...', image_scales?: {...} }]
      if (Array.isArray(value)) {
        // Already array format — pass through
        if (value.length > 0 && value[0]?.['@id']) return value;
        // Slate array → extract text as URL
        if (value.length > 0 && value[0]?.type && value[0]?.children) {
          return [{ '@id': slateToText(value, ' ') }];
        }
        return value;
      }
      if (typeof value === 'string') return [{ '@id': value }];
      if (value && typeof value === 'object' && value['@id']) return [value];
      return value;

    case 'array':
      if (Array.isArray(value)) return value;
      return [value];

    default:
      return value;  // 'object', 'number', 'boolean', 'integer' — pass through
  }
}

////////////////////////////////////////////////////////////////////////////////
// expandListingBlocks
////////////////////////////////////////////////////////////////////////////////

export async function expandListingBlocks(inputItems, options = {}) {
  const {
    blocks: blocksDict,  // Optional: lookup dict for when items are IDs
    fetchItems,          // { blockType: async (block, { start, size }) => { items, total } }
    paging: pagingIn,    // { start, size } — not mutated
    itemTypeField = 'itemType',  // Field name to read item type from (e.g., 'variation')
    defaultItemType = 'summary',  // Default item type when field is not set
  } = options;

  if (!fetchItems || typeof fetchItems !== 'object') {
    throw new Error('expandListingBlocks requires a fetchItems map of { blockType: fetcherFn }');
  }

  // Normalize items: convert IDs to objects if blocksDict provided
  // Items can be: objects with @uid, or string IDs (looked up in blocksDict)
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      // It's a block ID - look up in blocksDict
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandListingBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    // Already an object with @uid
    return item;
  }).filter(Boolean);

  // Convert to blocks/layout format for internal processing
  const blocks = Object.fromEntries(normalizedItems.map(item => [item['@uid'], item]));
  const blocksLayout = normalizedItems.map(item => item['@uid']);

  // Use input paging values (not mutated) and seen count from prior calls
  const paging = pagingIn || { start: 0, size: 1000 };

  // Find all listing blocks that need expansion (any block whose @type has a fetcher)
  const listingBlockIds = blocksLayout.filter(
    (blockId) => fetchItems[blocks[blockId]?.['@type']]
  );

  // Register listing blocks as readonly on the live bridge (browser-only).
  // Expanded items share these UIDs and shouldn't have editable fields.
  // Server-side: window.__hydraBridge is undefined — skip.
  const bridgeInstance =
    (typeof window !== 'undefined' && window.__hydraBridge) || null;
  if (bridgeInstance) {
    for (const blockId of listingBlockIds) {
      bridgeInstance.setBlockReadonly(blockId, true);
      log('expandListingBlocks: registered readonly block:', blockId);
    }
  } else {
    log('expandListingBlocks: no bridgeInstance, skipping readonly registration for:', listingBlockIds);
  }

  // Account for items already counted by prior staticBlocks calls.
  // Caller passes seen count explicitly (no shared mutable state).
  const priorSeen = options.seen || 0;

  // Single-pass: walk blocks in layout order, fetching each listing sequentially.
  // Each fetch returns { items, total }, so we learn the total and get the items
  // in one request. This avoids a separate "get totals" phase.
  let globalPos = priorSeen;
  let batchTotal = 0;
  const listingTotals = {};
  const listingResults = {};
  const windowStart = paging.start;
  const windowEnd = paging.start + paging.size;

  for (const blockId of blocksLayout) {
    if (!listingBlockIds.includes(blockId)) {
      globalPos += 1; // Non-listing blocks contribute 1 item
      batchTotal += 1;
      continue;
    }

    const blockStart = globalPos;

    // Optimistic check: if this listing starts past the page window end,
    // we still need its total for paging UI, so fetch with size: 0.
    // Otherwise, compute the slice we need and fetch items + total together.
    let localStart = 0;
    let localSize = 0;
    if (blockStart < windowEnd) {
      // This listing might overlap the window — compute the slice
      localStart = Math.max(0, windowStart - blockStart);
      // We don't know total yet, so request up to the remaining window size.
      // The backend will clamp to actual available items.
      localSize = windowEnd - Math.max(blockStart, windowStart);
    }

    try {
      const fetcher = fetchItems[blocks[blockId]['@type']];
      const result = await fetcher(blocks[blockId], { start: localStart, size: localSize });
      const total = result.total || 0;
      listingTotals[blockId] = total;
      batchTotal += total;

      // Now that we know the actual total, check if this listing truly overlaps
      const blockEnd = blockStart + total;
      if (localSize > 0 && blockEnd > windowStart && blockStart < windowEnd) {
        listingResults[blockId] = result.items || [];
      }

      globalPos += total;
    } catch (error) {
      console.error(`[HYDRA] Failed to fetch listing ${blockId}:`, error);
      listingTotals[blockId] = 0;
      globalPos += 0;
    }
  }

  // Build items array — walk layout in order, emitting items that fall in the page window
  const items = [];
  globalPos = priorSeen;

  for (const blockId of blocksLayout) {
    const block = blocks[blockId];

    if (listingBlockIds.includes(blockId)) {
      const total = listingTotals[blockId];
      const blockStart = globalPos;

      if (listingResults[blockId]) {
        const itemType = block[itemTypeField] || defaultItemType;
        const fieldMapping = block.fieldMapping || {};

        // Extract itemDefaults from flat keys (e.g., itemDefaults_overwrite -> overwrite)
        const itemDefaults = {};
        const defaultsPrefix = 'itemDefaults_';
        for (const [key, value] of Object.entries(block)) {
          if (key.startsWith(defaultsPrefix)) {
            const fieldName = key.slice(defaultsPrefix.length);
            itemDefaults[fieldName] = value;
          }
        }
        log('expandListingBlocks:', { blockId, itemType, fieldMapping: JSON.stringify(fieldMapping), itemDefaults: JSON.stringify(itemDefaults), itemCount: listingResults[blockId].length });

        // Convert each query result to a block of itemType
        // All expanded items share the same @uid (the listing block's ID)
        // fieldMapping acts as an allowlist: only mapped fields end up on the block.
        // Format: { source: { field: target, type: jsonSchemaType } }
        // Or legacy: { source: target } (simple rename, no conversion)
        const DEFAULT_FIELD_MAPPING = { '@id': 'href', 'title': 'title', 'description': 'description', 'image': 'image' };
        const effectiveMapping = Object.keys(fieldMapping).length > 0 ? fieldMapping : DEFAULT_FIELD_MAPPING;

        for (const result of listingResults[blockId]) {
          const itemBlock = {
            '@uid': blockId,  // Block UID for data-block-uid attribute
            '@type': itemType,
            ...itemDefaults,
            readOnly: true,
          };

          for (const [sourceField, mapping] of Object.entries(effectiveMapping)) {
            const targetField = typeof mapping === 'string' ? mapping : mapping?.field;
            const targetType = typeof mapping === 'object' ? mapping?.type : undefined;
            if (!targetField) continue;
            if (result[sourceField] === undefined) continue;

            itemBlock[targetField] = convertFieldValue(result[sourceField], targetType);
          }

          items.push(itemBlock);
        }
      }

      globalPos += total;
    } else if (block) {
      // Non-listing block: include if it falls in the page window
      if (globalPos >= paging.start && globalPos < paging.start + paging.size) {
        items.push({ ...block, '@uid': blockId });
      }
      globalPos += 1;
    }
  }

  // Build output paging with computed UI values (input is not mutated)
  const seen = priorSeen + batchTotal;
  const outPaging = { start: paging.start, size: paging.size, total: seen, seen };
  computePagingUI(outPaging);

  return { items, paging: outPaging };
}

////////////////////////////////////////////////////////////////////////////////
// ploneFetchItems (+ hierarchicalSortByPosition helper)
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a fetchItems callback for Plone's @querystring-search endpoint.
 *
 * @param {Object} options
 * @param {string} options.apiUrl - Plone site URL (e.g., 'http://localhost:8080/Plone')
 * @param {string} [options.contextPath='/'] - Path for relative queries
 * @param {Object} [options.extraCriteria={}] - Additional query params (SearchableText, facet.*, sort_on, sort_order)
 * @returns {Function} fetchItems(block, { start, size }) => Promise<{ items, total }>
 */
export function ploneFetchItems({ apiUrl, contextPath = '/', extraCriteria = {} } = {}) {
  if (!apiUrl) {
    throw new Error('ploneFetchItems requires apiUrl');
  }

  return async function fetchItems(block, { start, size }) {
    const body = buildQuerystringSearchBody(block.querystring, {
      b_start: start,
      b_size: size,
    }, extraCriteria);

    const headers = _getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const path = `${contextPath}/++api++/@querystring-search`;
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const response = await res.json();

    const rawItems = response.items || [];
    // Normalize: package image_field + image_scales into self-contained image object
    // with @id duplicated inside (imageProps needs it as base URL for relative paths)
    let items = rawItems.map(item => {
      if (!item.image_scales || !item.image_field) return item;
      const normalized = { ...item };
      normalized.image = {
        '@id': item['@id'],
        image_field: item.image_field,
        image_scales: item.image_scales,
      };
      delete normalized.image_scales;
      delete normalized.image_field;
      return normalized;
    });

    // `getObjPositionInParent` is the catalog's position-within-parent
    // index. Plone returns items in flat position order; for a query
    // spanning multiple folders that flat order isn't hierarchical —
    // parents and children interleave by position number. When the
    // listing sorts on it, post-sort into parent-before-children order.
    // This is a pure re-ordering: every item Plone returned is kept and
    // nothing is injected. Tree expansion and pruning for the context
    // navigation is the frontend ContextNavigationBlock's job, not this
    // fetcher's — ploneFetchItems returns exactly what Plone returns.
    if (block.querystring?.sort_on === 'getObjPositionInParent' && items.length > 1) {
      items = hierarchicalSortByPosition(items);
    }

    return {
      items,
      total: response.items_total ?? rawItems.length,
    };
  };
}

/**
 * Re-order a flat result set into parent-before-children order,
 * position-sorted within each parent. Each item must have `@id` (used to
 * derive its path + parent path); `getObjPositionInParent` orders
 * siblings (missing values sort last).
 *
 * Pure post-sort: every item is kept and nothing is added. An item whose
 * parent path is not in the set is a top-level root. Each subtree is
 * walked depth-first.
 */
function hierarchicalSortByPosition(items) {
  const pathOf = (item) => {
    try { return new URL(item['@id']).pathname; }
    catch { return item['@id']; }
  };
  const parentOf = (path) => path.replace(/\/[^/]+\/?$/, '') || '/';
  const positionOf = (item) =>
    typeof item.getObjPositionInParent === 'number'
      ? item.getObjPositionInParent
      : Infinity;

  const itemPaths = new Set(items.map(pathOf));
  const childrenByParent = new Map();
  const roots = [];

  for (const item of items) {
    const parent = parentOf(pathOf(item));
    if (itemPaths.has(parent)) {
      const bucket = childrenByParent.get(parent) || [];
      bucket.push(item);
      childrenByParent.set(parent, bucket);
    } else {
      // Parent not in the result set — a top-level root for ordering.
      // Never dropped: a pure post-sort keeps every item Plone returned.
      roots.push(item);
    }
  }

  for (const bucket of childrenByParent.values()) {
    bucket.sort((a, b) => positionOf(a) - positionOf(b));
  }
  roots.sort((a, b) => positionOf(a) - positionOf(b));

  const out = [];
  const visit = (item) => {
    out.push(item);
    const kids = childrenByParent.get(pathOf(item)) || [];
    for (const k of kids) visit(k);
  };
  for (const r of roots) visit(r);
  return out;
}

////////////////////////////////////////////////////////////////////////////////
// Field type utilities
////////////////////////////////////////////////////////////////////////////////

/**
 * Convert a schema field definition to a "type:widget" string.
 * Mirrors the format used by extractBlockFieldTypes in View.jsx.
 * @param {Object} field - Schema field definition with optional type and widget
 * @returns {string} Field type string like "string", "array:slate", "string:textarea", ":object_browser"
 */
export function getFieldTypeString(field) {
  const type = field.type;
  const widget = field.widget;
  if (type && widget) return `${type}:${widget}`;
  if (widget) return `:${widget}`;
  if (type) return type;
  return 'string';
}

/**
 * Check if a field type indicates a Slate field.
 * Handles both old format ('slate') and new format ('array:slate', 'object:richtext').
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isSlateFieldType(fieldType) {
  if (!fieldType) return false;
  return fieldType === 'slate' || fieldType.includes(':slate') || fieldType.includes(':richtext');
}

/**
 * Check if a field type indicates a textarea field.
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isTextareaFieldType(fieldType) {
  return fieldType?.includes(':textarea') || false;
}

/**
 * Check if a field type indicates a plain string field (single-line text).
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isPlainStringFieldType(fieldType) {
  if (!fieldType) return false;
  if (isSlateFieldType(fieldType) || isTextareaFieldType(fieldType)) {
    return false;
  }
  return fieldType === 'string' || fieldType.startsWith('string:');
}

/**
 * Check if a field type is text-editable (string, textarea, or slate).
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isTextEditableFieldType(fieldType) {
  if (!fieldType) return false;
  return isSlateFieldType(fieldType) ||
         isTextareaFieldType(fieldType) ||
         isPlainStringFieldType(fieldType);
}

////////////////////////////////////////////////////////////////////////////////
// deepEqual + formDataContentEqual + findChangedUnit
////////////////////////////////////////////////////////////////////////////////

/**
 * Key-order-independent deep equality check for JSON-like objects.
 * JSON.stringify comparison fails when the same data has different key ordering
 * (e.g., Plone API returns {type, children} but Slate produces {children, type}).
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!b.hasOwnProperty(k) || !deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Compare two formData objects for content equality, ignoring _editSequence.
 * Used to detect if form content has actually changed vs just metadata.
 * @param {Object} formDataA - First formData object
 * @param {Object} formDataB - Second formData object
 * @returns {boolean} True if content is equal (ignoring _editSequence)
 */
export function formDataContentEqual(formDataA, formDataB) {
  if (!formDataA || !formDataB) return formDataA === formDataB;
  const { _editSequence: seqA, ...contentA } = formDataA;
  const { _editSequence: seqB, ...contentB } = formDataB;
  return deepEqual(contentA, contentB);
}

/**
 * Find the SHALLOWEST changed unit between two formData snapshots.
 *
 * Returns one of:
 *   - null                                — forms are deep-equal, no edit happened.
 *   - { unit: 'page' }                    — render the whole content area.
 *   - { unit: 'block', blockId: 'X' }     — render only block X.
 *
 * Used by server-rendered frontends (Astro / PHP / Django / Rails — anything
 * without client-side reactivity). The bridge invokes this internally when
 * `renderEndpoint` is configured on initBridge; the result tells the bridge
 * what to POST to the server-render endpoint.
 *
 * Algorithm (recursive, walks DOWN from the page):
 *
 *   1. If items array at this level differs (add/remove/reorder) → THIS
 *      level is the unit. Re-render this container, its children come along.
 *   2. Otherwise find children whose data differs (deep compare):
 *        - 0 differ → no change here, return null
 *        - 1 differ AND child is a container → recurse into it. If
 *          recursion finds a deeper unit, return that; otherwise return
 *          the child itself.
 *        - 1 differ, leaf → return that child.
 *        - 2+ differ → return THIS level (multiple children changed,
 *          shallowest common parent is here).
 *
 * Spans more than one nesting level (e.g. block moved from col-1 to col-2
 * — both containers' items change) → walks up to PAGE.
 *
 * Reactive frontends (Vue/React/Svelte/Solid) don't need this — their
 * framework reconciliation provides per-block updates implicitly. Pure
 * server-rendered frontends do: a naive full-page innerHTML swap on every
 * keystroke would destroy contenteditable cursors, image loads, scroll
 * state. Diffing to the smallest changed unit makes outerHTML swaps
 * targeted enough that the unchanged DOM keeps its state.
 */
export function findChangedUnit(prevForm, newForm) {
  if (deepEqual(prevForm, newForm)) return null;
  const prevItems = prevForm?.blocks_layout?.items || [];
  const newItems = newForm?.blocks_layout?.items || [];
  if (!deepEqual(prevItems, newItems)) return { unit: 'page' };
  const prevBlocks = prevForm?.blocks || {};
  const newBlocks = newForm?.blocks || {};
  const changed = [];
  for (const id of newItems) {
    if (!deepEqual(prevBlocks[id], newBlocks[id])) changed.push(id);
  }
  // No top-level block data changed but forms differ → page-level scalar
  // (title, description, etc.) changed. Re-render page.
  if (changed.length === 0) return { unit: 'page' };
  if (changed.length > 1) return { unit: 'page' };
  const blockId = changed[0];
  const inner = _findChangedInBlock(prevBlocks[blockId], newBlocks[blockId]);
  if (inner?.unit === 'this') return { unit: 'block', blockId };
  if (inner?.unit === 'block') return inner;
  return { unit: 'block', blockId };
}

/**
 * Container fields on a block worth recursing into. Mirrors the
 * blockPathMap conventions: `blocks_layout` for slate/image/etc lists,
 * `columns` for column items in a columns block — both reference ids
 * in the same sibling `blocks` dict.
 */
function _getContainerFields(block) {
  if (!block || typeof block !== 'object') return [];
  const fields = [];
  // Every blocks field is a sub-key of the shared blocks_layout dict (the
  // default `items`, plus named fields like `columns`, `listing`, `footer`).
  // Each sub-key is an ordered id list into the same sibling `blocks` dict.
  if (block.blocks_layout && block.blocks) {
    for (const ids of Object.values(block.blocks_layout)) {
      if (Array.isArray(ids)) {
        fields.push({ items: ids, blocks: block.blocks });
      }
    }
  }
  return fields;
}

function _findChangedInBlock(prevBlock, newBlock) {
  const newFields = _getContainerFields(newBlock);
  const prevFields = _getContainerFields(prevBlock);
  if (newFields.length !== prevFields.length) return { unit: 'this' };
  for (let f = 0; f < newFields.length; f++) {
    const cur = newFields[f];
    const old = prevFields[f];
    if (!deepEqual(cur.items, old.items)) return { unit: 'this' };
    const changed = [];
    for (const childId of cur.items) {
      if (!deepEqual(cur.blocks[childId], old.blocks[childId])) changed.push(childId);
    }
    if (changed.length === 0) continue;
    if (changed.length > 1) return { unit: 'this' };
    const childId = changed[0];
    const inner = _findChangedInBlock(old.blocks[childId], cur.blocks[childId]);
    if (inner?.unit === 'this') return { unit: 'block', blockId: childId };
    if (inner?.unit === 'block') return inner;
    return { unit: 'block', blockId: childId };
  }
  return null;
}

/**
 * Decide whether the only differences between two block objects are
 * `.text` string changes inside slate `value[]` arrays. Used by
 * `_installRenderEndpoint` (in hydra.src.js) to decide whether a render
 * is necessary on a server-only frontend like Astro — if the change is
 * text-only AND the iframe DOM already has the new text (because the
 * user typed it directly into the contenteditable), we can skip the
 * POST + outerHTML swap, preserving cursor / focus / IME state.
 *
 * Returns `true` when:
 *   - block @type and all non-slate fields are deepEqual
 *   - any slate fields (value, description, etc. — heuristic: array of
 *     {type, children} or {text} nodes) differ only in `.text` strings
 *     with the SAME node tree structure (same number of nodes at each
 *     level, same types, same marks, same attrs other than text/nodeId)
 *
 * Returns `false` for anything structural (new/removed/reordered nodes,
 * changed marks like bold, link href changes, image url, slot id, etc.).
 * False on those forces a render so the bridge's existing cursor
 * save/restore + blockedBlockId protections kick in for transforms.
 *
 * Ignores `nodeId` on every node — the bridge stamps these and they can
 * legitimately differ between renders without being a "real" change.
 */
export function isTextOnlyBlockChange(prevBlock, newBlock) {
  if (!prevBlock || !newBlock) return false;
  // Block-level non-slate fields must match exactly. We strip slate-shaped
  // arrays out so we can compare them separately with the text-only rule.
  const stripSlateFields = (block) => {
    const out = {};
    const slateFieldNames = [];
    for (const [k, v] of Object.entries(block)) {
      if (_looksLikeSlateValue(v)) {
        slateFieldNames.push(k);
      } else {
        out[k] = v;
      }
    }
    return { stripped: out, slateFieldNames };
  };
  const pa = stripSlateFields(prevBlock);
  const pb = stripSlateFields(newBlock);
  if (!deepEqual(pa.stripped, pb.stripped)) return false;
  if (!deepEqual(pa.slateFieldNames.sort(), pb.slateFieldNames.sort())) return false;
  for (const field of pa.slateFieldNames) {
    if (!_slateValuesDifferOnlyInText(prevBlock[field], newBlock[field])) return false;
  }
  return true;
}

function _looksLikeSlateValue(v) {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (n) => n && typeof n === 'object' && (
      typeof n.text === 'string' || Array.isArray(n.children)
    ),
  );
}

function _slateValuesDifferOnlyInText(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (!_slateNodeDiffersOnlyInText(prev[i], next[i])) return false;
  }
  return true;
}

/**
 * Walk a formData tree and find the block with the given uid anywhere
 * in the nested blocks dicts (columns -> col-N.blocks -> slate, etc.).
 * Returns the block data object or null. Pure walk — no use of
 * blockPathMap, no Bridge dependency.
 */
export function findBlockInForm(form, blockId) {
  if (!form || !blockId) return null;
  const blocks = form.blocks;
  if (!blocks) return null;
  if (blocks[blockId]) return blocks[blockId];
  for (const child of Object.values(blocks)) {
    if (child && typeof child === 'object') {
      const inside = findBlockInForm(child, blockId);
      if (inside) return inside;
    }
  }
  return null;
}

/**
 * Concatenate all text leaves of a slate-style node array, in document
 * order. Used by the renderEndpoint's text-only-skip heuristic to
 * compare with the iframe DOM's textContent.
 */
export function slateNodesText(nodes) {
  if (!Array.isArray(nodes)) return '';
  let out = '';
  for (const n of nodes) {
    if (!n) continue;
    if (typeof n.text === 'string') out += n.text;
    else if (Array.isArray(n.children)) out += slateNodesText(n.children);
  }
  return out;
}

function _slateNodeDiffersOnlyInText(p, n) {
  if (!p || !n) return p === n;
  const pIsText = typeof p.text === 'string';
  const nIsText = typeof n.text === 'string';
  if (pIsText !== nIsText) return false;
  if (pIsText) {
    // Both text leaves. `text` strings may differ; marks (bold, italic, ...)
    // must match. nodeId is bridge-stamped, ignore.
    const { text: _pt, nodeId: _pn, ...prest } = p;
    const { text: _nt, nodeId: _nn, ...nrest } = n;
    return deepEqual(prest, nrest);
  }
  // Both element nodes. Type, attrs, data must match (ignoring nodeId).
  // Then recurse into children.
  const { children: pc, nodeId: _pn, ...prest } = p;
  const { children: nc, nodeId: _nn, ...nrest } = n;
  if (!deepEqual(prest, nrest)) return false;
  return _slateValuesDifferOnlyInText(pc || [], nc || []);
}

/**
 * Convert a Plone image value to a full URL suitable for `<img src>`.
 *
 * Handles every shape the Plone REST API hands back:
 *   - string paths (relative or absolute)
 *   - objects with an `@id`
 *   - catalog brains with `image_scales` + `image_field`
 *   - arrays of the above (first element wins)
 *
 * Relative paths are prefixed with `apiUrl`. For paths that don't already
 * point at a scale URL (no `@@images` / `@@download`), the canonical
 * `@@images/image` suffix is appended.
 *
 * Was previously duplicated in each example's `utils.js`. Centralised
 * here because every frontend needs the same URL resolution; per-example
 * copies always drifted from each other.
 *
 * `apiUrl` is the base origin (e.g. `'http://localhost:8888'`) — pass it
 * explicitly so this works in SSR / Node where `window` is undefined.
 */
export function getImageUrl(value, apiUrl = '') {
  if (!value) return '';

  // Catalog brain with image_scales
  if (value.image_scales && value.image_field) {
    const field = value.image_field;
    const scales = value.image_scales[field];
    if (scales?.[0]?.download) {
      const baseUrl = value['@id'] || '';
      const prefix = baseUrl.startsWith('http') ? '' : apiUrl;
      return `${prefix}${baseUrl}/${scales[0].download}`;
    }
  }

  // No image data (catalog brain without image_scales) — return empty
  if (value.image_scales === null || value.image_field === '') return '';

  // Extract URL from various formats
  let url = Array.isArray(value) ? value[0]?.['@id'] : value?.['@id'] || value;
  if (typeof url !== 'string') return '';

  // Add @@images/image for content paths without a scale URL
  if (url.startsWith('/') && !url.includes('@@images') && !url.includes('@@download')) {
    url = `${url}/@@images/image`;
  }

  // Prepend API origin for relative paths
  if (url.startsWith('/')) {
    url = `${apiUrl}${url}`;
  }

  return url;
}

////////////////////////////////////////////////////////////////////////////////
// Plone template family
//
// Templates are Plone documents whose `blocks` describe a layout (with
// `fixed: true` blocks for chrome) or a snippet (no fixed blocks). At
// render time we merge templates into a page's `blocks_layout` so the
// frontend renders the composed result. All of this is pure data —
// no DOM, no postMessage, no Bridge state — so it lives here in helpers
// to be shared by hydra-js (admin), Nuxt/Astro/Vue SSR frontends and the
// admin's `mergeTemplatesIntoPage`.
//
// Container-aware predicates / Bridge methods (e.g. canContain) stay in
// containerOps.js; only the templateEditMode-aware addability helpers and
// canContainAll were pulled in because they're called from both SSR
// (helpers) and bridge code paths.
////////////////////////////////////////////////////////////////////////////////

/**
 * Marker field name used internally to flag template blocks during
 * legacy migrations. Kept exported because external callers may still
 * key off it; current code uses the flat `templateId` / `slotId` fields.
 */
export const TEMPLATE_MARKER = '_template';

/**
 * SSR-safe edit-mode detector. Mirrors hydra-js's `isEditMode` but
 * returns false on the server so template expansion works the same way
 * in Node (Astro/Nuxt server render) as it does in the browser.
 */
function _isEditMode() {
  if (typeof window === 'undefined') {
    return false;
  }
  const url = new URL(window.location.href);
  const editParam = url.searchParams.get('_edit');
  return window.name.startsWith('hydra-edit:') || editParam === 'true';
}

/**
 * Simple UUID generator for block IDs.
 * @returns {string} UUID v4 format string
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extract content field values from a block to use as fieldPlaceholders.
 * Skips system/template fields. Only includes fields with actual content.
 * @param {Object} block - The block data
 * @returns {Object} Map of fieldName -> value for non-empty content fields
 */
function extractFieldPlaceholders(block) {
  const SYSTEM_FIELDS = new Set([
    '@type', '@uid', 'templateId', 'templateInstanceId', 'slotId',
    'fixed', 'readOnly', 'readOnly', 'fieldPlaceholders', 'fieldMappings',
    'blocks', 'blocks_layout', 'nextSlotId', 'childSlotIds',
  ]);
  const placeholders = {};
  for (const [key, value] of Object.entries(block)) {
    if (SYSTEM_FIELDS.has(key)) continue;
    if (typeof value === 'string' && value.trim()) {
      placeholders[key] = value;
    } else if (Array.isArray(value) && value.length > 0 && value[0]?.children) {
      // Slate value — check if there's text content
      const text = value.map(n =>
        (n.children || []).map(c => c.text || '').join('')
      ).join('').trim();
      if (text) placeholders[key] = value;
    }
  }
  return placeholders;
}

/**
 * Check if a template is a layout (has fixed blocks at edges).
 * Layout = first or last block has fixed: true (Volto standard property).
 *
 * @param {Object} templateData - Template document with blocks and blocks_layout
 * @returns {boolean}
 */
export function isLayoutTemplate(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  if (layout.length === 0) return false;

  const firstBlock = blocks?.[layout[0]];
  const lastBlock = blocks?.[layout[layout.length - 1]];

  // If first or last block has fixed: true (Volto standard), it's a layout
  const firstIsFixed = firstBlock?.fixed === true;
  const lastIsFixed = lastBlock?.fixed === true;

  return firstIsFixed || lastIsFixed;
}

/**
 * Find slot regions in a template.
 * Slot blocks (fixed: false) with same slotId form a region.
 *
 * @param {Object} templateData - Template document
 * @returns {Object} { slotId: { blockIds: [], allowedBlocks: [] } }
 */
export function findSlotRegions(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  const regions = {};

  for (const blockId of layout) {
    const block = blocks?.[blockId];
    // Slot blocks have fixed: false (or undefined) and a slotId
    if (block?.fixed) continue; // Skip fixed blocks

    const slotId = block?.slotId;
    if (slotId) {
      if (!regions[slotId]) {
        regions[slotId] = {
          blockIds: [],
          allowedBlocks: null,
        };
      }
      regions[slotId].blockIds.push(blockId);
    }
  }
  return regions;
}

/**
 * Check if a template is allowed in a given container context.
 *
 * @param {Object} templateData - Template document
 * @param {string} containerType - Block @type of container (e.g., "page", "columns")
 * @param {string} fieldName - Container field name (e.g., "blocks")
 * @returns {boolean}
 */
export function isTemplateAllowedIn(templateData, containerType, fieldName) {
  const { allowed_container_types, allowed_field_names } = templateData;

  // If no restrictions, allow everywhere
  if (!allowed_container_types?.length && !allowed_field_names?.length) {
    return true;
  }

  // Check restrictions
  const typeOk =
    !allowed_container_types?.length ||
    allowed_container_types.includes(containerType);
  const fieldOk =
    !allowed_field_names?.length || allowed_field_names.includes(fieldName);

  return typeOk && fieldOk;
}

/**
 * Filter templates for "Apply Layout" UI.
 * Returns templates that are layouts and allowed in the given context.
 *
 * @param {Array} templates - Array of template documents
 * @param {string} containerType - Block @type of container
 * @param {string} fieldName - Container field name
 * @returns {Array} Filtered templates
 */
export function getLayoutTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) => isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName),
  );
}

/**
 * Filter templates for block chooser (snippets).
 * Returns templates that are NOT layouts and allowed in the given context.
 *
 * @param {Array} templates - Array of template documents
 * @param {string} containerType - Block @type of container
 * @param {string} fieldName - Container field name
 * @returns {Array} Filtered templates
 */
export function getSnippetTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) =>
      !isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName),
  );
}

/**
 * Clone template blocks with fresh UUIDs.
 * Recursively filters nested blocks to only include those with template markers.
 *
 * @param {Object} blocks - Template blocks object
 * @param {Array} layout - Template blocks_layout.items array
 * @param {Function} uuidGenerator - Function to generate UUIDs (default: generateUUID)
 * @returns {Object} { blocks, layout, idMap } where idMap tracks old->new IDs
 */
export function cloneBlocksWithNewIds(blocks, layout, uuidGenerator = generateUUID) {
  const idMap = {}; // oldId -> newId
  const newBlocks = {};
  const newLayout = [];

  for (const oldId of layout) {
    const newId = uuidGenerator();
    idMap[oldId] = newId;

    // Deep clone the block, filtering nested blocks without template markers
    const block = blocks[oldId];
    if (block) {
      newBlocks[newId] = cloneBlockFilteringNested(block, uuidGenerator);
    }

    newLayout.push(newId);
  }

  return { blocks: newBlocks, layout: newLayout, idMap };
}

/**
 * Clone a block, recursively filtering nested blocks without template markers.
 * Only nested blocks with `slotId` or `templateId` are included.
 *
 * @param {Object} block - Block to clone
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @returns {Object} Cloned block with filtered nested blocks
 */
function cloneBlockFilteringNested(block, uuidGenerator) {
  // Start with a shallow clone
  const cloned = { ...block };

  // Check for nested blocks field (blocks + blocks_layout pattern)
  if (cloned.blocks && cloned.blocks_layout?.items) {
    const nestedBlocks = {};
    const nestedLayout = [];

    for (const nestedId of cloned.blocks_layout.items) {
      const nestedBlock = cloned.blocks[nestedId];
      if (!nestedBlock) continue;

      // Only include nested blocks that have template markers
      if (nestedBlock.slotId || nestedBlock.templateId) {
        const newNestedId = uuidGenerator();
        // Recursively filter this nested block's children too
        nestedBlocks[newNestedId] = cloneBlockFilteringNested(nestedBlock, uuidGenerator);
        nestedLayout.push(newNestedId);
      }
    }

    cloned.blocks = nestedBlocks;
    cloned.blocks_layout = { ...cloned.blocks_layout, items: nestedLayout };
  }

  return cloned;
}

/**
 * Insert snippet blocks at a specific position.
 * - Clones snippet blocks with new IDs
 * - Adds template fields (templateId, templateInstanceId, slotId)
 * - Preserves Volto's fixed/readOnly properties
 * - Inserts at the specified position
 *
 * @param {Object} pageFormData - Existing page data
 * @param {Object} templateData - Snippet template document
 * @param {number} position - Index to insert at
 * @param {Function} uuidGenerator - Function to generate UUIDs (default: generateUUID)
 * @returns {Object} Updated formData with snippet inserted
 */
export function insertSnippetBlocks(pageFormData, templateData, position, uuidGenerator = generateUUID) {
  const result = {
    blocks: { ...pageFormData.blocks },
    blocks_layout: {
      items: [...(pageFormData.blocks_layout?.items || [])],
    },
  };
  const templateId = templateData['@id'] || templateData.UID;
  const instanceId = uuidGenerator(); // New instance ID for this insertion

  // Clone snippet blocks
  const { blocks: clonedBlocks, layout: clonedLayout, idMap } =
    cloneBlocksWithNewIds(
      templateData.blocks,
      templateData.blocks_layout?.items || [],
      uuidGenerator,
    );

  // Add template fields
  for (const [newId, block] of Object.entries(clonedBlocks)) {
    const originalId = Object.entries(idMap).find(
      ([_, v]) => v === newId,
    )?.[0];
    const originalBlock = templateData.blocks?.[originalId];

    // Set flat template fields
    block.templateId = templateId;
    block.templateInstanceId = instanceId;
    block.slotId = originalBlock?.slotId || originalId;

    // Preserve Volto's fixed/readOnly from template
    if (originalBlock?.fixed !== undefined) block.fixed = originalBlock.fixed;
    if (originalBlock?.readOnly !== undefined) block.readOnly = originalBlock.readOnly;

    // Snippet insert is always a user action — store content as fieldPlaceholders
    // for editable blocks so authored text shows as hints
    if (!block.readOnly) {
      const placeholders = extractFieldPlaceholders(originalBlock || block);
      if (Object.keys(placeholders).length > 0) {
        block.fieldPlaceholders = placeholders;
      }
    }

    result.blocks[newId] = block;
  }

  // Insert at position
  result.blocks_layout.items.splice(position, 0, ...clonedLayout);

  return result;
}

/**
 * Get blocks that belong to a specific template.
 *
 * @param {Object} formData - Page form data
 * @param {string} tplId - Template UID to find
 * @returns {Array} Array of block IDs belonging to this template
 */
export function getTemplateBlocks(formData, tplId) {
  const blockIds = [];
  for (const blockId of formData.blocks_layout?.items || []) {
    const block = formData.blocks?.[blockId];
    if (block?.templateId === tplId) {
      blockIds.push(blockId);
    }
  }
  return blockIds;
}

/**
 * Check if a block is a fixed template block (cannot be moved individually).
 * Uses Volto's standard fixed property.
 *
 * @param {Object} block - Block data
 * @returns {boolean}
 */
export function isFixedTemplateBlock(block) {
  // Fixed if it has templateId AND fixed: true (Volto standard)
  return block?.templateId && block?.fixed === true;
}

/**
 * Check if a block is slot content (can be moved freely).
 * Slot blocks have templateId but fixed: false (or undefined).
 *
 * @param {Object} block - Block data
 * @returns {boolean}
 */
export function isPlaceholderContent(block) {
  // Placeholder if it has templateId but is NOT fixed
  return block?.templateId && !block?.fixed;
}

/**
 * Check if a block is inside the template currently being edited.
 * A block is inside if its templateInstanceId matches the templateEditMode.
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block is inside the edited template, false otherwise
 */
export function isBlockInEditedTemplate(blockData, templateEditMode) {
  if (!templateEditMode) return false;
  return blockData?.templateInstanceId === templateEditMode;
}

/**
 * Check if a block should be readonly based on template edit mode.
 * This is the shared utility for both admin (sidebar/toolbar) and hydra.js Bridge.
 *
 * In template edit mode:
 * - Blocks inside the template being edited are editable (return false)
 * - Blocks outside the template are locked (return true)
 *
 * In normal mode:
 * - Check the block's readOnly property (Volto standard)
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block should be readonly
 */
export function isBlockReadonly(blockData, templateEditMode) {
  if (templateEditMode) {
    // In template edit mode:
    // - Blocks inside the template being edited are editable
    // - Blocks outside the template are readonly
    return !isBlockInEditedTemplate(blockData, templateEditMode);
  }

  // Normal mode: check block's readOnly property (Volto standard)
  return !!blockData?.readOnly;
}

/**
 * Check if a block's position is locked (cannot be moved/dragged).
 * This is the shared utility for both admin (toolbar) and hydra.js Bridge.
 *
 * In template edit mode:
 * - Blocks inside the template being edited are movable (return false) - even if fixed
 * - Blocks outside the template are locked (return true)
 *
 * In normal mode:
 * - Check the block's fixed property (Volto standard)
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block's position is locked
 */
export function isBlockPositionLocked(blockData, templateEditMode) {
  if (templateEditMode) {
    // In template edit mode, ALL blocks are draggable (not position-locked)
    // This allows dragging outside blocks into the template
    // Drop zone restriction (where blocks can be dropped) is handled
    // separately in the drag handler via isDropAllowedInTemplateEditMode
    return false;
  }

  // Normal mode: check block's fixed property (Volto standard)
  return !!blockData?.fixed;
}

/**
 * Get block addability - centralized logic for whether blocks can be added
 * before/after/into a block. Used by DnD, add buttons, and BlockChooser.
 *
 * @param {string} blockId - The block ID to check addability for (target block)
 * @param {Object} blockPathMap - Map of blockId -> pathInfo
 * @param {Object} blockData - The target block data object (can be null for pathMap-only checks)
 * @param {string|null} templateEditMode - The templateInstanceId being edited, or null
 * @param {Object|null} sourceBlockData - For DnD: the source block being moved. Enables template-aware logic.
 * @returns {Object} Addability info:
 *   - canInsertBefore: Can add a sibling before this block
 *   - canInsertAfter: Can add a sibling after this block
 *   - canReplace: Can replace this block (for empty blocks)
 *   - allowedTypes: Array of allowed block types, or null for all types
 *   - maxReached: Whether container is at maxLength
 */
export function getBlockAddability(blockId, blockPathMap, blockData, templateEditMode, sourceBlockData = null) {
  const pathInfo = blockPathMap?.[blockId];

  // Default: can't add anywhere
  const result = {
    canInsertBefore: false,
    canInsertAfter: false,
    canReplace: false,
    allowedTypes: null,
    maxReached: false,
  };

  if (!pathInfo) {
    return result;
  }

  // Get static insert restrictions from pathMap (based on fixed blocks)
  const staticCanInsertBefore = pathInfo.canInsertBefore !== false;
  const staticCanInsertAfter = pathInfo.canInsertAfter !== false;

  // Check if container is at maxLength
  const maxReached = pathInfo.maxSiblings != null &&
    pathInfo.siblingCount >= pathInfo.maxSiblings;
  result.maxReached = maxReached;

  // If max is reached, can't add more blocks
  if (maxReached) {
    return result;
  }

  // Template edit mode handling:
  // - For add button (no sourceBlockData): Only allow if target is in the edited template
  // - For DnD (sourceBlockData provided): Allow if source OR target is in the template
  //   This enables dragging blocks from outside INTO the template
  let targetInTemplate = false;
  if (templateEditMode) {
    targetInTemplate = isBlockInEditedTemplate(blockData, templateEditMode);
    const sourceInTemplate = sourceBlockData ? isBlockInEditedTemplate(sourceBlockData, templateEditMode) : false;

    // For DnD: allow if either source or target is in the template
    // For add button: only allow if target is in the template
    const allowedByTemplateMode = sourceBlockData
      ? (sourceInTemplate || targetInTemplate)
      : targetInTemplate;

    if (!allowedByTemplateMode) {
      // Neither block is in the template being edited - can't add here
      return result;
    }
  }

  // Apply static restrictions
  // In template edit mode, ignore restrictions for blocks in the template being edited
  // (the restrictions are for normal mode to prevent adding outside slots)
  if (templateEditMode && targetInTemplate) {
    result.canInsertBefore = true;
    result.canInsertAfter = true;
  } else {
    result.canInsertBefore = staticCanInsertBefore;
    result.canInsertAfter = staticCanInsertAfter;
  }

  // For empty blocks: can replace (unless readonly), but NOT add before/after
  // Empty blocks are meant to be replaced via block chooser
  const isEmptyBlock = blockData?.['@type'] === 'empty';
  if (isEmptyBlock) {
    // In template edit mode, check if block is in the edited template for replace permission
    const blockIsReadonly = isBlockReadonly(blockData, templateEditMode);
    result.canReplace = !blockIsReadonly;
    result.canInsertBefore = false;
    result.canInsertAfter = false;
  }

  // Include allowed types from pathInfo
  result.allowedTypes = pathInfo.allowedSiblingTypes || null;

  return result;
}

/**
 * Can a container accept every block type in `blockTypes` given its current
 * count? Considers the combined count against maxLength. Pulled into
 * helpers (rather than left in containerOps.js) so SSR template-merge code
 * can call it without dragging the iframe-only container ops along.
 *
 * @param {object} config         Container field config
 * @param {string[]} blockTypes   Block types to add (in order)
 * @param {number} currentCount   Current number of children
 * @returns {boolean}
 */
export function canContainAll(config, blockTypes, currentCount) {
  if (blockTypes.length === 0) return true;
  if (config?.readOnly || config?.fixed) return false;
  const { allowedBlocks, maxLength } = config || {};
  if (allowedBlocks != null) {
    for (const type of blockTypes) {
      if (!allowedBlocks.includes(type)) return false;
    }
  }
  if (maxLength != null && currentCount + blockTypes.length > maxLength) {
    return false;
  }
  return true;
}

/**
 * Extract the pathname from a template ID, which may be a full URL or a path.
 * Plone's API resolves resolveuid/UID references to full URLs (e.g.
 * "http://plone.example.com/templates/foo"), but allowedLayouts may use
 * relative paths (e.g. "/templates/foo").  This helper normalises both
 * forms to a plain pathname so comparisons work regardless of format.
 *
 * @param {string|null} id - Template ID (URL or path)
 * @returns {string|null} The pathname portion, or the original value
 */
export function templateIdToPath(id) {
  if (!id || typeof id !== 'string') return id;
  // Fast path: already a relative path
  if (!id.startsWith('http://') && !id.startsWith('https://')) return id;
  try {
    return new URL(id).pathname;
  } catch {
    return id;
  }
}

/**
 * Check whether two template IDs refer to the same template, ignoring
 * URL-vs-path differences.  E.g. "http://localhost:8888/tpl/foo" matches
 * "/tpl/foo".
 */
function templateIdsMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return templateIdToPath(a) === templateIdToPath(b);
}

/**
 * Get unique template IDs (paths) from page data.
 *
 * @param {Object} formData - Page data with blocks
 * @returns {Array<string>} Array of unique template paths
 */
export function getUniqueTemplateIds(formData) {
  const templateIds = new Set();
  for (const blockId of Object.keys(formData.blocks || {})) {
    const block = formData.blocks[blockId];
    if (block?.templateId) {
      templateIds.add(block.templateId);
    }
  }
  return Array.from(templateIds);
}
// Note: callers that need to avoid recursing into the template's own
// definition page (e.g. saveTemplatesRef) filter by `id !== currentPath`
// — that's the load-bearing check. Earlier this function ALSO skipped
// blocks where `templateInstanceId === templateId` as a heuristic for
// "definition-side", but the load/expand path
// (loadTemplates / expandTemplatesSync) never reads stored instanceIds
// from a definition (it generates fresh per-application ids), so the
// only consumer of the heuristic was this very function. Removing it
// also unblocks make-template, where the page-side block can have
// instanceId === templateId for unrelated reasons and was being silently
// excluded from save → the new template never POSTed to the backend.

/**
 * Check if an object looks like a blocks map (string keys -> objects with @type).
 */
function isBlocksMap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.values(obj).some(v => v?.['@type']);
}

/**
 * Whether `tplBlock` is a container whose children need merging. Post-#234 a
 * container's child ordering always lives in its own `blocks_layout` dict, as
 * one or more named regions ({ <region>: [stringId, ...], ... } — e.g. a columns
 * block's `columns` region, a column's default `items` region). Returns true for
 * a container (has a `blocks` map + a `blocks_layout` dict), false otherwise.
 * Callers iterate every region in `tplBlock.blocks_layout`.
 */
function hasNestedBlocksLayout(tplBlock) {
  return !!(
    tplBlock && tplBlock.blocks && isBlocksMap(tplBlock.blocks) &&
    tplBlock.blocks_layout && typeof tplBlock.blocks_layout === 'object' &&
    !Array.isArray(tplBlock.blocks_layout)
  );
}

/**
 * Recursively scan for blocks with matching templateInstanceId.
 * Handles arbitrary nesting - looks for blocks maps (values have @type)
 * and corresponding layout arrays.
 *
 * @param {Object} container - Container object to scan
 * @param {string} instanceId - Template instance ID to match
 * @param {Map} pendingContent - Map of slotId -> [{blockId, block}]
 * @param {Array} standaloneBlocks - Blocks without slotId
 * @param {Set} visited - Already visited objects (prevent cycles)
 */
function collectContentFromTree(container, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited = new Set()) {
  if (!container || typeof container !== 'object') return;
  if (visited.has(container)) return;
  visited.add(container);

  if (Array.isArray(container)) {
    for (const item of container) {
      collectContentFromTree(item, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
    return;
  }

  // Look for blocks maps (shared blocks format: one "blocks" dict + named layout fields)
  for (const [fieldName, value] of Object.entries(container)) {
    if (!isBlocksMap(value)) continue;

    // Collect block IDs from all layout fields ({ items: [...] }) in this container.
    // In shared blocks format, layout fields are named (columns, top_images, blocks_layout, etc.)
    // — there is no ${fieldName}_layout convention.
    const layoutBlockIds = new Set();
    for (const [key, val] of Object.entries(container)) {
      if (key !== fieldName && val?.items && Array.isArray(val.items)) {
        for (const id of val.items) layoutBlockIds.add(id);
      }
    }
    // Fall back to all keys if no layout fields found
    const blockLayout = layoutBlockIds.size > 0 ? layoutBlockIds : Object.keys(value);

    // Process in order
    for (const blockId of blockLayout) {
      const block = value[blockId];
      if (!block) continue;

      // Only collect blocks matching our instance
      if (block.templateInstanceId === instanceId) {
        const slotId = block.slotId;
        if (slotId) {
          if (block.fixed) {
            // Track existing fixed block ID and content for reuse
            existingFixedBlockIds.set(slotId, { blockId, block });
          } else {
            // User content block
            if (!pendingContent.has(slotId)) {
              pendingContent.set(slotId, []);
            }
            pendingContent.get(slotId).push({ blockId, block });
          }
        }
      } else if (!block.templateId && !block.slotId) {
        // Standalone block (no template markers) - track position
        standaloneBlocks.push({ blockId, block });
      }

      // Recurse into block for nested containers
      collectContentFromTree(block, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
  }
}

/**
 * Process blocks at a nested level inside a fixed template container.
 * Called when expandTemplates recognizes we're inside a registered nested container.
 *
 * @param {Object} docBlocks - The document's blocks at this nested level
 * @param {Array} docLayout - The document's layout at this nested level
 * @param {Object} nestedInfo - Info about the template structure at this level
 * @param {Object} templateState - Shared template state
 * @param {Object} options - Original options passed to expandTemplates
 * @param {Function} addItem - Helper to add items to result
 * @param {Array} items - Result array to populate
 * @returns {Array} Items with @uid field
 */
function processNestedTemplateLevel(docBlocks, docLayout, nestedInfo, templateState, options, addItem, items) {
  const { templateBlocks, templateLayout } = nestedInfo;
  const { templateId, instanceId } = templateState;
  const { uuidGenerator, firstInsert } = options;

  // Build a map of document blocks by slotId for user content lookup
  const docBlocksBySlotId = new Map();
  for (const blockId of docLayout) {
    const block = docBlocks[blockId];
    if (block?.slotId) {
      if (!docBlocksBySlotId.has(block.slotId)) {
        docBlocksBySlotId.set(block.slotId, []);
      }
      docBlocksBySlotId.get(block.slotId).push({ blockId, block });
    }
  }

  // Process the template layout at this nested level
  // Only emit blocks that have template markers (fixed or slotId)
  // Blocks without markers are just defaults and should NOT be synced
  for (const tplBlockId of templateLayout) {
    const tplBlock = templateBlocks[tplBlockId];
    if (!tplBlock) continue;

    if (tplBlock.fixed) {
      // Fixed block - emit template version
      const blockId = uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;

      // Look ahead for next non-fixed slot at this nested level
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextSlotId = undefined;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = templateBlocks[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.slotId) {
          nextSlotId = nextTplBlock.slotId;
          break;
        }
        if (nextTplBlock?.fixed) break;
      }

      // childSlotIds for nested containers. A container's children are ordered
      // by the named regions in its `blocks_layout` dict (#234); we throw if
      // `blocks` is present but `blocks_layout` isn't, surfacing malformed
      // templates loudly.
      let childSlotIds = undefined;
      const isContainer = hasNestedBlocksLayout(tplBlock);
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        if (!isContainer) {
          throw new Error(
            `processNestedTemplateLevel: template block "${tplBlockId}" has nested ` +
            `\`blocks\` but no \`blocks_layout\` dict listing them by region.`,
          );
        }
        const innerLayout = Object.values(tplBlock.blocks_layout).filter(Array.isArray).flat();
        for (const nestedId of innerLayout) {
          const nested = tplBlock.blocks[nestedId];
          if (nested && !nested.fixed && nested.slotId) {
            if (!childSlotIds) childSlotIds = {};
            childSlotIds['blocks'] = nested.slotId;
            break;
          }
        }
      }

      const fixedBlock = {
        ...tplBlock,
        templateId: templateId,
        templateInstanceId: instanceId,
        ...(nextSlotId && { nextSlotId }),
        ...(childSlotIds && { childSlotIds }),
      };
      // Fixed but editable blocks: store content as placeholders on first insert
      if (firstInsert && !tplBlock.readOnly) {
        const placeholders = extractFieldPlaceholders(tplBlock);
        if (Object.keys(placeholders).length > 0) {
          fixedBlock.fieldPlaceholders = placeholders;
        }
      }
      addItem(fixedBlock, blockId);

      // Register further nested containers (blocks_layout regions and object_list)
      if (isContainer) {
        templateState.nestedContainers.set(tplBlock.blocks, {
          templateBlockId: tplBlockId,
          templateBlocks: tplBlock.blocks,
          templateLayout: Object.values(tplBlock.blocks_layout).filter(Array.isArray).flat(),
        });
      }
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = '@id';
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map(item => [item[itemIdField], item])),
            templateLayout: val.map(item => item[itemIdField]),
          });
        }
      }
    } else if (tplBlock.slotId) {
      // Slot block - emit document content that goes here
      const slotId = tplBlock.slotId;
      const userContent = docBlocksBySlotId.get(slotId) || [];
      if (userContent.length > 0) {
        for (const { blockId, block } of userContent) {
          addItem(
            {
              ...block,
              templateId: templateId,
              templateInstanceId: instanceId,
              slotId: slotId,
            },
            blockId
          );
        }
      } else if (firstInsert) {
        // First insert with no user content — copy template slot block
        // with its content values stored as fieldPlaceholders
        const blockId = uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;
        const newBlock = {
          ...tplBlock,
          templateId: templateId,
          templateInstanceId: instanceId,
        };
        const placeholders = extractFieldPlaceholders(tplBlock);
        if (Object.keys(placeholders).length > 0) {
          newBlock.fieldPlaceholders = placeholders;
        }
        addItem(newBlock, blockId);
      }
    }
    // Skip blocks without fixed or slotId - they're just template defaults
    // and should NOT be synced to the document
  }

  return items;
}

/**
 * Load all templates referenced in data, including nested templates.
 * Recursively scans data for templateId references, loads them,
 * then scans loaded templates for more references until all are loaded.
 *
 * @param {Object} data - Page data to scan for template references
 * @param {Function} loadTemplate - Async function: (templateId) => Promise<templateData>
 * @param {Object} preloadedTemplates - Already-loaded templates: { templateId: templateData }. Caller owns the cache.
 * @param {Array} extraTemplateIds - Additional template IDs to fetch (e.g. forced layouts not referenced in page data)
 * @returns {Promise<Object>} Map of templateId -> template data (includes preloaded + newly fetched)
 */
export async function loadTemplates(data, loadTemplate, preloadedTemplates = {}, extraTemplateIds = []) {
  // Start with caller-provided templates (caller owns the cache)
  const templates = { ...preloadedTemplates };
  const loaded = new Set(Object.keys(preloadedTemplates));
  const failed = new Map();

  // Helper to scan an object for templateId references
  function collectTemplateIds(obj, visited = new Set()) {
    const ids = new Set();

    function scan(o) {
      if (!o || typeof o !== 'object') return;
      if (visited.has(o)) return;
      visited.add(o);

      if (Array.isArray(o)) {
        for (const item of o) scan(item);
        return;
      }

      if (o.templateId && typeof o.templateId === 'string') {
        ids.add(o.templateId);
      }

      for (const value of Object.values(o)) {
        scan(value);
      }
    }

    scan(obj);
    return ids;
  }

  // Collect template IDs referenced in the page data, plus any extra forced layouts.
  let pending = collectTemplateIds(data);
  for (const id of extraTemplateIds) {
    if (id) pending.add(id);
  }

  // Keep loading until no new templates found
  while (pending.size > 0) {
    // Filter out already loaded/failed
    const toLoad = Array.from(pending).filter(id => !loaded.has(id) && !failed.has(id));
    pending.clear();

    if (toLoad.length === 0) break;

    // Load in parallel with a per-template timeout so a hanging request
    // doesn't block INITIAL_DATA indefinitely.
    const TEMPLATE_LOAD_TIMEOUT = 5000;
    const results = await Promise.all(
      toLoad.map(async (id) => {
        try {
          const template = await Promise.race([
            loadTemplate(id),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Template load timed out after ${TEMPLATE_LOAD_TIMEOUT}ms`)), TEMPLATE_LOAD_TIMEOUT)
            ),
          ]);
          return { id, template };
        } catch (error) {
          console.warn(`[HYDRA] Failed to load template ${id}:`, error);
          return { id, template: null, error };
        }
      })
    );

    // Process results and collect nested template IDs
    for (const { id, template, error } of results) {
      if (template) {
        loaded.add(id);
        templates[id] = template;
        preloadedTemplates[id] = template;  // Write back to caller's cache

        // Scan this template for nested template references
        const nestedIds = collectTemplateIds(template);
        for (const nestedId of nestedIds) {
          if (!loaded.has(nestedId) && !failed.has(nestedId)) {
            pending.add(nestedId);
          }
        }
      } else {
        failed.set(id, error);
      }
    }
  }

  const errors = Array.from(failed.entries()).map(([templateId, error]) => ({ templateId, error }));
  return { templates, errors };
}

/**
 * Async version of expandTemplates.
 * Loads templates on-demand using loadTemplates callback, then delegates to expandTemplatesSync.
 *
 * @param {Array} inputItems - Input items (block IDs or block objects)
 * @param {Object} options - Configuration options
 * @param {Object} options.blocks - Blocks dict for ID lookup
 * @param {Object} options.templateState - Mutable state object (pass {} on first call)
 * @param {Function} options.loadTemplate - Async callback: (templateId) => Promise<templateData>
 * @param {Array} options.allowedLayouts - Force layout from this list if no matching layout applied
 * @returns {Promise<Array>} Items with @uid field
 */
export async function expandTemplates(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    loadTemplate,
    preloadedTemplates,
  } = options;

  // Build data object for loadTemplates to scan
  const data = blocksDict
    ? { blocks: blocksDict, blocks_layout: { items: inputItems } }
    : { items: inputItems };

  // Load templates referenced in the page data, seeded with caller's cache
  const { templates } = await loadTemplates(data, loadTemplate, preloadedTemplates);

  // Delegate to sync version with pre-loaded templates.
  // Don't pass loadTemplate — it's async and expandTemplatesSync requires
  // sync loaders. Instead, catch "not found" errors and retry after awaiting.
  const { loadTemplate: _drop, ...syncOptions } = options;
  const loaded = new Set(Object.keys(templates));
  while (true) {
    try {
      return expandTemplatesSync(inputItems, {
        ...syncOptions,
        templates,
      });
    } catch (e) {
      const match = e.message?.match(/^Template "(.+)" not found/);
      if (match && loadTemplate && !loaded.has(match[1])) {
        const missingId = match[1];
        loaded.add(missingId);
        try {
          templates[missingId] = await loadTemplate(missingId);
          continue;
        } catch {
          // loadTemplate failed — fall through to rethrow
        }
      }
      throw e;
    }
  }
}

/**
 * Synchronous version of expandTemplates.
 * Requires all templates to be pre-loaded in options.templates.
 * Falls back to options.loadTemplate (must be synchronous) if a required template
 * is not in the pre-loaded map. Throws if loadTemplate returns a Promise or if
 * the template still can't be found.
 *
 * This function is called recursively: the top-level BlocksRenderer calls it for
 * the page layout, and the expanded result may contain container blocks (columns,
 * accordions, etc.) whose child BlocksRenderers call it again. Nested containers
 * are detected via templateState.nestedContainers (keyed by blocksDict reference)
 * and handled by processNestedTemplateLevel instead of the main path.
 *
 * templateState is shared across all BlocksRenderer instances on the page (via
 * Vue provide/inject or similar). It must be a fresh {} for each page render to
 * avoid stale state across navigations.
 *
 * @param {Array} inputItems - Input items (block IDs or block objects)
 * @param {Object} options - Configuration options
 * @param {Object} options.templates - Map of templateId -> template data (REQUIRED)
 * @param {Object} options.templateState - Mutable state object (pass {} on first call)
 * @param {Array} options.allowedLayouts - Force layout from this list if no matching layout applied
 * @returns {Array} Items with @uid field
 */
export function expandTemplatesSync(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    templateState = {},
    templates,
    allowedLayouts,
    uuidGenerator,
    filterInstanceId,
    loadTemplate,
    idField,  // For object_list arrays: field name used as item ID (e.g. '@id', 'key')
    firstInsert,  // When true, copy slot block defaults as fieldPlaceholders
  } = options;

  const items = [];
  const addItem = (block, blockId) => {
    items.push({ ...block, '@uid': blockId });
  };

  // In edit mode, admin handles template merging - pass blocks through as-is.
  // Templates option is only needed for view-mode expansion, so the check
  // for it runs after this early return.
  const editMode = _isEditMode();
  if (editMode) {
    return (inputItems || []).map(item => {
      if (typeof item === 'string') {
        const block = blocksDict?.[item];
        return block ? { ...block, '@uid': item } : null;
      }
      // Object_list items: map idField → @uid
      if (idField && item && !item['@uid']) {
        const id = item[idField];
        if (id) return { ...item, '@uid': id };
      }
      return item;
    }).filter(Boolean);
  }

  if (!templates) {
    throw new Error('expandTemplatesSync requires options.templates with pre-loaded templates');
  }

  // Normalize items
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandTemplatesSync: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    // Object_list items: map idField → @uid
    if (idField && item && !item['@uid']) {
      const id = item[idField];
      if (id) return { ...item, '@uid': id };
    }
    return item;
  }).filter(Boolean);

  const blocks = Object.fromEntries(normalizedItems.map(item => [item['@uid'], item]));
  const layout = normalizedItems.map(item => item['@uid']);

  // Initialize global state structures if needed
  if (!templateState.instances) {
    templateState.instances = {};
  }
  if (!templateState.nestedContainers) {
    templateState.nestedContainers = new Map();
  }
  if (!templateState.generatedInstanceIds) {
    templateState.generatedInstanceIds = new WeakMap(); // blocksDict -> generated instanceId
  }

  // Check if inside a registered nested container (blocks_layout or object_list)
  if (blocksDict && templateState.nestedContainers.has(blocksDict)) {
    const nestedInfo = templateState.nestedContainers.get(blocksDict);
    return processNestedTemplateLevel(blocks, layout, nestedInfo, templateState, options, addItem, items);
  }
  if (inputItems && templateState.nestedContainers.has(inputItems)) {
    const nestedInfo = templateState.nestedContainers.get(inputItems);
    return processNestedTemplateLevel(blocks, layout, nestedInfo, templateState, options, addItem, items);
  }

  if (layout.length === 0 && !allowedLayouts?.length) {
    return items;
  }

  // Determine templateId and instanceId for this call
  let templateId = null;
  let existingInstanceId = filterInstanceId || null;
  for (const blockId of layout) {
    const block = blocks[blockId];
    if (block?.templateId) {
      templateId = block.templateId;
      if (!filterInstanceId) {
        existingInstanceId = block.templateInstanceId;
      }
      break;
    }
  }

  // Track previous templateId before allowedLayouts may override it
  const previousTemplateId = templateId;

  if (allowedLayouts?.length > 0) {
    // Determine if this is a layout (all blocks belong to the template) or an
    // inserted template (template blocks mixed with standalone blocks).
    // allowedLayouts should only enforce on layouts, not on inserted templates.
    const isLayout = templateId && layout.every(blockId => {
      const block = blocks[blockId];
      return block?.templateInstanceId === existingInstanceId;
    });

    // Use path-normalised comparison: block templateId may be a full URL
    // (e.g. from Plone's resolveuid) while allowedLayouts may be paths.
    if (isLayout && !allowedLayouts.some(l => templateIdsMatch(l, templateId))) {
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    } else if (!templateId) {
      // No template found — apply the forced layout
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    }
  }

  // Template removal: allowedLayouts forced null but a template was applied.
  // Use same merge logic with a synthetic "container" template (just a default slot)
  // so content is properly extracted from nested structures, then strip markers.
  let removingTemplate = false;
  if (!templateId && previousTemplateId) {
    removingTemplate = true;
    templateId = '__none__';
    templates['__none__'] = {
      blocks: { '__default__': { '@type': 'slate', slotId: 'default' } },
      blocks_layout: { items: ['__default__'] },
    };
  }

  // No template to apply - pass through
  if (!templateId) {
    for (const blockId of layout) {
      if (blocks[blockId]) {
        addItem(blocks[blockId], blockId);
      }
    }
    return items;
  }

  // Get or generate instanceId
  // For forced layouts (no existing instanceId), we use a WeakMap keyed by blocksDict
  // to ensure idempotency - same blocks object returns same generated instanceId
  let instanceId = existingInstanceId;
  if (!instanceId) {
    if (blocksDict && templateState.generatedInstanceIds.has(blocksDict)) {
      instanceId = templateState.generatedInstanceIds.get(blocksDict);
    } else {
      instanceId = generateUUID();
      if (blocksDict) {
        templateState.generatedInstanceIds.set(blocksDict, instanceId);
      }
    }
  }

  // Store for processNestedTemplateLevel (called from nested expandTemplatesSync calls)
  templateState.templateId = templateId;
  templateState.instanceId = instanceId;

  // Get or create instance context.
  // Always rebuild ctx when the instanceId is re-encountered (e.g. after save,
  // the API returns blocks with the same templateInstanceId but different content).
  // The ctx is mutated during processing (pendingContent consumed, emittedSlotIds
  // populated) so it cannot be reused.
  let ctx = templateState.instances[instanceId];
  if (ctx) {
    delete templateState.instances[instanceId];
    ctx = null;
  }

  if (!ctx) {
    ctx = {
      templateId,
      template: null,
      instanceId,
      emittedSlotIds: new Set(),
      pendingContent: new Map(),
      existingFixedBlockIds: new Map(),
      leadingStandaloneBlocks: [],
      trailingStandaloneBlocks: [],
      newTemplateIds: new Set(),
    };
    templateState.instances[instanceId] = ctx;

    // Initialize content collection for this instance
    if (existingInstanceId) {
      const allStandaloneBlocks = [];
      collectContentFromTree(
        { blocks, blocks_layout: { items: layout } },
        existingInstanceId,
        ctx.pendingContent,
        allStandaloneBlocks,
        ctx.existingFixedBlockIds
      );

      let foundFirstTemplateBlock = false;
      let lastTemplateBlockIndex = -1;
      for (let i = 0; i < layout.length; i++) {
        const block = blocks[layout[i]];
        if (block?.templateInstanceId === existingInstanceId) {
          if (!foundFirstTemplateBlock) foundFirstTemplateBlock = true;
          lastTemplateBlockIndex = i;
        }
      }

      for (let i = 0; i < layout.length; i++) {
        const blockId = layout[i];
        const block = blocks[blockId];
        if (!block) continue;
        if (!block.templateId && !block.templateInstanceId && !block.slotId) {
          if (!foundFirstTemplateBlock || i < layout.indexOf(layout.find((id, idx) => {
            const b = blocks[id];
            return b?.templateInstanceId === existingInstanceId && idx <= lastTemplateBlockIndex;
          }))) {
            ctx.leadingStandaloneBlocks.push({ blockId, block });
          } else if (i > lastTemplateBlockIndex) {
            ctx.trailingStandaloneBlocks.push({ blockId, block });
          }
        }
      }
    } else {
      for (const blockId of layout) {
        const block = blocks[blockId];
        if (!block) continue;
        if (block.templateId && block.templateId !== templateId) {
          ctx.newTemplateIds.add(block.templateId);
        }
        if (block.fixed && block.templateId && block.templateId !== templateId) {
          if (block.readOnly) continue;
          if (block.slotId) {
            ctx.existingFixedBlockIds.set(block.slotId, { blockId, block });
          }
          continue;
        }
        if (block.slotId) {
          const slotId = block.slotId;
          if (!ctx.pendingContent.has(slotId)) {
            ctx.pendingContent.set(slotId, []);
          }
          ctx.pendingContent.get(slotId).push({ blockId, block });
        } else {
          if (!ctx.pendingContent.has('default')) {
            ctx.pendingContent.set('default', []);
          }
          ctx.pendingContent.get('default').push({ blockId, block });
        }
      }
    }
  }

  // Load template from pre-loaded map, falling back to sync loadTemplate callback.
  if (!ctx.template) {
    let template = templates[templateId];
    if (!template && loadTemplate) {
      template = loadTemplate(templateId);
      if (!template || typeof template.then === 'function') {
        throw new Error(`loadTemplate for "${templateId}" must return data synchronously, not a Promise. Use expandTemplates() for async loading, or pre-load templates via loadTemplates().`);
      }
      templates[templateId] = template;
    }
    if (!template) {
      throw new Error(`Template "${templateId}" not found in pre-loaded templates. Available: ${Object.keys(templates).join(', ')}`);
    }
    ctx.template = template;
  }

  const { template, emittedSlotIds, pendingContent, leadingStandaloneBlocks, trailingStandaloneBlocks, existingFixedBlockIds } = ctx;

  // Process template (same as async version from here)
  const templateLayout = template.blocks_layout?.items || [];
  let firstFixedIndex = -1;
  let lastFixedIndex = -1;
  const slotPositions = {};

  for (let i = 0; i < templateLayout.length; i++) {
    const tplBlock = template.blocks?.[templateLayout[i]];
    if (!tplBlock?.slotId) continue;
    if (tplBlock.fixed) {
      if (firstFixedIndex === -1) firstFixedIndex = i;
      lastFixedIndex = i;
    } else {
      if (firstFixedIndex === -1) {
        slotPositions[tplBlock.slotId] = 'top';
      } else if (i > lastFixedIndex) {
        slotPositions[tplBlock.slotId] = 'bottom';
      } else {
        slotPositions[tplBlock.slotId] = 'middle';
      }
    }
  }

  for (const { blockId, block } of leadingStandaloneBlocks) {
    addItem(block, blockId);
  }

  let defaultInsertIndex = -1;
  let bottomSlotInsertIndex = -1;
  let topSlotInsertIndex = -1;

  for (const tplBlockId of templateLayout) {
    const tplBlock = template.blocks?.[tplBlockId];
    if (!tplBlock) continue;

    if (tplBlock.fixed) {
      const slotId = tplBlock.slotId;
      const existing = slotId && existingFixedBlockIds?.get(slotId);
      const blockId = existing?.blockId
        ? existing.blockId
        : (uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`);

      let blockContent = tplBlock;
      if (!tplBlock.readOnly && existing?.block) {
        blockContent = { ...tplBlock, value: existing.block.value };
      }

      // Look ahead in template layout for the next non-fixed slot at this level.
      // This preserves slot info even when all slot blocks are deleted.
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextSlotId = undefined;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = template.blocks?.[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.slotId) {
          nextSlotId = nextTplBlock.slotId;
          break;
        }
        if (nextTplBlock?.fixed) break; // Stop at next fixed block
      }

      // For container blocks, filter nested blocks to only those with
      // template markers (slotId or templateId). Blocks without these are
      // template-internal details that should not be synced to pages. A
      // container's children are ordered by the named regions in its
      // `blocks_layout` dict (#234); filter each region and preserve them all.
      let childSlotIds = undefined;
      let filteredBlocks = blockContent.blocks;
      let filteredLayout = undefined;
      const isContainer = hasNestedBlocksLayout(tplBlock);
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        if (!isContainer) {
          throw new Error(
            `expandTemplatesSync: template block "${tplBlockId}" has nested ` +
            `\`blocks\` but no \`blocks_layout\` dict listing them by region.`,
          );
        }
        const newNestedBlocks = {};
        const newBlocksLayout = {};
        for (const [region, arr] of Object.entries(tplBlock.blocks_layout)) {
          if (!Array.isArray(arr)) { newBlocksLayout[region] = arr; continue; }
          const newArr = [];
          for (const nestedId of arr) {
            const nested = tplBlock.blocks[nestedId];
            if (!nested) continue;
            if (nested.slotId || nested.templateId) {
              newNestedBlocks[nestedId] = nested;
              newArr.push(nestedId);
              if (!nested.fixed && nested.slotId) {
                if (!childSlotIds) childSlotIds = {};
                if (!childSlotIds['blocks']) childSlotIds['blocks'] = nested.slotId;
              }
            }
          }
          newBlocksLayout[region] = newArr;
        }
        filteredBlocks = newNestedBlocks;
        filteredLayout = newBlocksLayout;
      }

      addItem(
        {
          ...blockContent,
          blocks: filteredBlocks,
          ...(isContainer && { blocks_layout: filteredLayout }),
          templateId: templateId,
          templateInstanceId: instanceId,
          ...(nextSlotId && { nextSlotId }),
          ...(childSlotIds && { childSlotIds }),
        },
        blockId
      );

      if (isContainer) {
        templateState.nestedContainers.set(filteredBlocks, {
          templateBlockId: tplBlockId,
          templateBlocks: filteredBlocks,
          templateLayout: Object.values(filteredLayout).filter(Array.isArray).flat(),
        });
      }
      // Register object_list arrays (arrays of objects with templateId)
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = '@id';
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map(item => [item[itemIdField], item])),
            templateLayout: val.map(item => item[itemIdField]),
          });
        }
      }
    } else {
      const slotId = tplBlock.slotId || 'default';
      const insertIndex = items.length;

      if (slotId === 'default') {
        defaultInsertIndex = insertIndex;
      }
      const position = slotPositions[slotId];
      if (position === 'bottom' && bottomSlotInsertIndex === -1) {
        bottomSlotInsertIndex = insertIndex;
      } else if (position === 'top' && topSlotInsertIndex === -1) {
        topSlotInsertIndex = insertIndex;
      }

      if (!emittedSlotIds.has(slotId)) {
        emittedSlotIds.add(slotId);
        const content = pendingContent.get(slotId) || [];
        for (const { blockId, block } of content) {
          addItem(
            {
              ...block,
              templateId: templateId,
              templateInstanceId: instanceId,
              slotId: slotId,
            },
            blockId
          );
        }
        pendingContent.delete(slotId);
      }
    }
  }

  const remainingContent = [];
  for (const [slotId, content] of pendingContent) {
    if (!emittedSlotIds.has(slotId)) {
      emittedSlotIds.add(slotId);
      for (const { blockId, block } of content) {
        remainingContent.push({
          ...block,
          templateId: templateId,
          templateInstanceId: instanceId,
          slotId: 'default',
          _orphaned: true,
          '@uid': blockId,
        });
      }
    }
  }

  if (remainingContent.length > 0) {
    let insertIndex = -1;
    if (defaultInsertIndex >= 0) {
      insertIndex = defaultInsertIndex;
    } else if (bottomSlotInsertIndex >= 0) {
      insertIndex = bottomSlotInsertIndex;
    } else if (topSlotInsertIndex >= 0) {
      insertIndex = topSlotInsertIndex;
    }

    if (insertIndex >= 0) {
      items.splice(insertIndex, 0, ...remainingContent);
    }
  }

  for (const { blockId, block } of trailingStandaloneBlocks) {
    addItem(block, blockId);
  }

  // Template removal: strip all template markers so blocks are clean
  if (removingTemplate) {
    for (const item of items) {
      delete item.templateId;
      delete item.templateInstanceId;
      delete item.slotId;
      delete item.fixed;
      delete item.readOnly;
      delete item.nextSlotId;
      delete item.childSlotIds;
      delete item._orphaned;
    }
  }

  return items;
}
