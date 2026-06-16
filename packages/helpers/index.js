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
function _getAccessToken() {
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
  const token = _getAccessToken();
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
  if (block.blocks_layout?.items && block.blocks) {
    fields.push({ items: block.blocks_layout.items, blocks: block.blocks });
  }
  if (block.columns?.items && block.blocks) {
    fields.push({ items: block.columns.items, blocks: block.blocks });
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
