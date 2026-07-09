/**
 * Reusable mock Plone REST API server.
 * Implements minimal Plone REST API endpoints for content editing.
 * Serves content from disk (JSON files in content directories).
 *
 * Run standalone: node mock-plone-api.cjs
 * Or import the express app: const { app } = require('./mock-plone-api');
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

/**
 * Parse CONTENT_MOUNTS env variable for multiple content directories
 * Format: "mountPath:dirPath,mountPath2:dirPath2"
 * Example: "/:/default/content,/pretagov:/path/to/pretagov/content"
 * Falls back to default ./content directory mounted at /
 */
function parseContentMounts() {
  const mountsEnv = process.env.CONTENT_MOUNTS;
  if (!mountsEnv) {
    return [
      { mountPath: '/', dirPath: path.join(__dirname, '../../docs/content/content/content') },
      { mountPath: '/_test_data', dirPath: path.join(__dirname, 'content') },
    ];
  }

  return mountsEnv.split(',').map(mount => {
    const [mountPath, dirPath] = mount.split(':');
    const resolvedDir = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
    return { mountPath: mountPath || '/', dirPath: resolvedDir };
  });
}

const CONTENT_MOUNTS = parseContentMounts();

/**
 * Resolve a moved-content redirect, mimicking plone.app.redirector.
 * Each mount may carry a redirects.json sibling ({ oldPath: newPath },
 * mount-relative) next to its content dir. Returns the new mount-prefixed
 * path or null. Read fresh each call (tiny file, only hit on a 404) so dev
 * edits to redirects.json take effect without a restart.
 */
function getRedirectTarget(cleanPath) {
  for (const { mountPath, dirPath } of CONTENT_MOUNTS) {
    const redirectsFile = path.join(dirPath, '..', 'redirects.json');
    if (!fs.existsSync(redirectsFile)) continue;
    let map;
    try { map = JSON.parse(fs.readFileSync(redirectsFile, 'utf8')); }
    catch { continue; }
    const rel = mountPath === '/'
      ? cleanPath
      : (cleanPath.startsWith(mountPath) ? cleanPath.slice(mountPath.length) || '/' : null);
    if (rel == null) continue;
    if (map[rel]) {
      return mountPath === '/' ? map[rel] : mountPath + map[rel];
    }
  }
  return null;
}

/**
 * Enumerate every redirects.json entry across mounts as mount-prefixed
 * {path, 'redirect-to'} pairs. Used by the @aliases endpoint.
 */
function getAllRedirects() {
  const out = [];
  for (const { mountPath, dirPath } of CONTENT_MOUNTS) {
    const redirectsFile = path.join(dirPath, '..', 'redirects.json');
    if (!fs.existsSync(redirectsFile)) continue;
    let map;
    try { map = JSON.parse(fs.readFileSync(redirectsFile, 'utf8')); }
    catch { continue; }
    for (const [from, to] of Object.entries(map)) {
      out.push({
        path: mountPath === '/' ? from : mountPath + from,
        'redirect-to': mountPath === '/' ? to : mountPath + to,
      });
    }
  }
  return out;
}

// Validate each mounted content tree at startup. Errors are loud (listed)
// but non-fatal — tests using the mock API still start. Set
// SKIP_CONTENT_VALIDATION=true to suppress entirely.
if (process.env.SKIP_CONTENT_VALIDATION !== 'true') {
  const { validate, checkIntegrity, formatReport } = require('./plone-content-validator.cjs');
  for (const { mountPath, dirPath } of CONTENT_MOUNTS) {
    if (!fs.existsSync(path.join(dirPath, '__metadata__.json'))) continue;
    const v = validate(dirPath);
    const c = checkIntegrity(dirPath);
    const problems = v.errors.length + v.warnings.length + c.errors.length + c.warnings.length;
    if (problems > 0) {
      console.log(`[content-check] ${mountPath} -> ${dirPath}`);
      if (v.errors.length || v.warnings.length) console.log(formatReport('validate', v));
      if (c.errors.length || c.warnings.length) console.log(formatReport('check', c));
    }
  }
}

// Session-based transient content storage for uploads
// Uploads are stored per-session so they don't appear for other users
// Format: { sessionId: { '/path': content, ... } }
const sessionContent = {};

// Map URL paths to source directories (for loading content from disk)
const contentDirMap = {};

// Map UIDs to URL paths (for resolveuid endpoint)
const uidToPathMap = {};

// Map UIDs to their getObjPositionInParent value (from __metadata__.json ordering)
const uidPositionMap = {};

/**
 * Get session ID from request header.
 * Uses the Bearer auth token as the session identifier. AdminUIHelper
 * gives each test a unique token (TEST_AUTH_TOKEN + a uuid), so every
 * test gets an isolated session and its saves don't leak into others.
 * Admin (Volto) and Nuxt SSR both forward the same Authorization header,
 * so they share that one test's session.
 * @param {Object} req - Express request
 * @returns {string} Session ID (defaults to '_default' for unauthenticated requests)
 */
function getSessionId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return `token:${token}`;
  }
  // Unauthenticated requests use default session (no persistence)
  return '_default';
}

/**
 * Store uploaded content in session-specific storage
 * @param {string} sessionId - Session ID from request
 * @param {string} urlPath - Content path
 * @param {Object} content - Content object to store
 */
function setSessionContent(sessionId, urlPath, content) {
  if (!sessionContent[sessionId]) {
    sessionContent[sessionId] = {};
  }
  sessionContent[sessionId][urlPath] = content;
}

/**
 * Generate a fresh JWT token with 24-hour expiration from now.
 * Called on each login/renew to ensure token is always valid.
 */
function generateAuthToken(username = 'admin') {
  const header = Buffer.from(JSON.stringify({"alg":"HS256","typ":"JWT"})).toString('base64').replace(/=/g, '');
  const payload = Buffer.from(JSON.stringify({
    "sub": username,
    "exp": Math.floor(Date.now()/1000) + 86400  // 24 hours from NOW
  })).toString('base64').replace(/=/g, '');
  return `${header}.${payload}.fake-signature`;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads

// Virtual Host Monster path rewriting middleware
// Volto's proxy adds VHM paths like: /VirtualHostBase/http/localhost:8888/++api++/VirtualHostRoot/@login
// And also sends requests with ++api++ prefix like: /++api++/@site
// Strip these prefixes and extract the actual path while preserving query string
// Also track if this is an API request (contains ++api++) vs frontend request
app.use((req, res, next) => {
  const url = require('url');
  const parsedUrl = url.parse(req.url, true);
  let cleanPath = parsedUrl.pathname;

  // Check if this is an API request (contains ++api++ prefix or Accept: application/json header)
  const acceptHeader = req.headers.accept || '';
  req.isApiRequest = cleanPath.includes('++api++') || acceptHeader.includes('application/json');

  // Handle full VHM path: /VirtualHostBase/http/localhost:8888/++api++/VirtualHostRoot/@login
  const vhmPattern = /^\/VirtualHostBase\/[^/]+\/[^/]+\/\+\+api\+\+\/VirtualHostRoot(.*)$/;
  const vhmMatch = cleanPath.match(vhmPattern);

  if (vhmMatch) {
    cleanPath = vhmMatch[1] || '/';
  }

  // Strip ++api++ anywhere in path (start or mid-path):
  //   /++api++/@site           -> /@site
  //   /blocks/search/++api++/@ -> /blocks/search/@
  cleanPath = cleanPath.replace(/\/?\+\+api\+\+\/?/g, '/');

  // Normalize multiple slashes to single slash (e.g., //@search -> /@search)
  cleanPath = cleanPath.replace(/\/+/g, '/');

  // Ensure path starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Reconstruct URL with cleaned path and preserved query string
  req.url = cleanPath + (parsedUrl.search || '');
  next();
});

// Request logging (only in debug mode)
if (process.env.DEBUG) {
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(`${req.method} ${req.path}${authHeader ? ' [AUTH: ' + authHeader.substring(0, 30) + '...]' : ' [NO AUTH]'}`);
    next();
  });
}

/**
 * Check if request has valid authentication
 * @param {Object} req - Express request object
 * @returns {boolean} True if authenticated
 */
function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ');
}

/**
 * Filter actions based on authentication status
 * Unauthenticated users don't get edit permission
 * @param {Object} content - Content object with @components
 * @param {boolean} authenticated - Whether user is authenticated
 * @returns {Object} Content with filtered actions
 */
function filterActionsForAuth(content, authenticated) {
  if (!content || !content['@components'] || !content['@components'].actions) {
    return content;
  }

  // Clone content to avoid mutating original
  const filtered = JSON.parse(JSON.stringify(content));

  if (!authenticated) {
    // Remove edit action for unauthenticated users
    if (filtered['@components'].actions.object) {
      filtered['@components'].actions.object = filtered[
        '@components'
      ].actions.object.filter((action) => action.id !== 'edit');
    }
  }

  return filtered;
}

/**
 * Generate image_scales for Image content types
 * Used by object browser to display thumbnails
 */
function getImageScales(content, baseUrl) {
  if (content['@type'] !== 'Image' || !content.image) {
    return null;
  }

  const { width, height } = content.image;
  const contentPath = content['@id'].replace(baseUrl, '');

  return {
    image: [
      {
        'content-type': 'image/jpeg',
        download: `@@images/image`,
        filename: `${content.id || 'image'}.jpg`,
        width: width,
        height: height,
        scales: {
          preview: {
            download: `@@images/image/preview`,
            width: Math.min(width, 400),
            height: Math.min(height, 400),
          },
          large: {
            download: `@@images/image/large`,
            width: Math.min(width, 800),
            height: Math.min(height, 800),
          },
        },
      }
    ]
  };
}

/**
 * Generate image_scales for a non-Image content item that has a lead image
 * field set via blob_path (Documents/CaseStudy with the ILeadImage behaviour).
 * Real Plone exposes image_field + image_scales for these in listing brains;
 * our distribution export only carries the raw blob_path field, so synthesise
 * the brain shape here. Downloads are relative (`@@images/<field>[/scale]`) so
 * the frontend prefixes the item @id — same as getImageScales. No actual
 * resizing happens; the @@images endpoint serves the same bytes at any scale.
 */
function getLeadImageScales(content, fieldName) {
  const f = content[fieldName];
  if (!f) return null;
  const width = f.width || 800;
  const height = f.height || 600;
  const scaleConfigs = {
    icon: 32, tile: 64, thumb: 128, mini: 200, preview: 400,
    teaser: 600, large: 800, larger: 1000, great: 1200, huge: 1600,
  };
  const scales = {};
  for (const [name, maxDim] of Object.entries(scaleConfigs)) {
    if (maxDim < width || maxDim < height) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      scales[name] = {
        download: `@@images/${fieldName}/${name}`,
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
      };
    }
  }
  return {
    [fieldName]: [{
      'content-type': f['content-type'] || 'image/jpeg',
      download: `@@images/${fieldName}`,
      filename: f.filename || `${content.id || fieldName}`,
      width,
      height,
      scales,
    }],
  };
}

/**
 * Generate scales object for an image field
 * @param {string} fullUrl - Full URL of the content item
 * @param {string} fieldName - Image field name (e.g., 'image', 'preview_image')
 * @param {number} width - Original image width
 * @param {number} height - Original image height
 */
function generateScalesForField(fullUrl, fieldName, width, height) {
  const scaleConfigs = {
    icon: 32, tile: 64, thumb: 128, mini: 200,
    preview: 400, teaser: 600, large: 800, larger: 1000,
    great: 1200, huge: 1600,
  };
  const scales = {};
  for (const [name, maxDim] of Object.entries(scaleConfigs)) {
    if (maxDim < width || maxDim < height) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      scales[name] = {
        download: `${fullUrl}/@@images/${fieldName}/${name}`,
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
      };
    }
  }
  return scales;
}

/**
 * Transform distribution blob_path fields to proper download URLs.
 * Distribution content uses `blob_path` for image/preview_image fields;
 * the Plone REST API uses `download` URLs and `scales`.
 */
function transformBlobPaths(content, fullUrl) {
  const imageFields = ['image', 'preview_image'];
  const result = { ...content };
  for (const field of imageFields) {
    if (result[field]?.blob_path) {
      const { blob_path, ...rest } = result[field];
      result[field] = {
        ...rest,
        download: `${fullUrl}/@@images/${field}`,
        scales: generateScalesForField(fullUrl, field, rest.width || 800, rest.height || 600),
      };
    }
  }
  return result;
}

/**
 * Generate placeholder image_scales for search results
 * Mimics Plone's image_scales structure - uses relative @@images paths
 * The mock server's @@images/* endpoint serves SVG placeholders
 */
function getPlaceholderImageScales(title, fieldName = 'image') {
  // Use a hash based on title for consistent URLs
  const hash = (title || 'item').split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString(16);
  return {
    [fieldName]: [{
      'content-type': 'image/svg+xml',
      'download': `@@images/${fieldName}-800-${hash}.svg`,
      'filename': 'placeholder.svg',
      'height': 600,
      'width': 800,
      'scales': {
        'preview': {
          'download': `@@images/${fieldName}/preview`,
          'height': 300,
          'width': 400,
        },
        'mini': {
          'download': `@@images/${fieldName}/mini`,
          'height': 150,
          'width': 200,
        },
        'thumb': {
          'download': `@@images/${fieldName}/thumb`,
          'height': 96,
          'width': 128,
        },
      },
    }],
  };
}

/**
 * Match a SearchableText query against an item, mimicking Plone 6.2's
 * plone.app.querystring 3.0.0 `munge_search_term`: split the term on
 * whitespace, then each word must prefix-match a word token in any of
 * title/description/id. (Plone uses ZCText word-prefix indexing; we
 * tokenize on `\W+` and check `startsWith`, which is close enough.)
 */
function matchSearchableText(searchTerm, item) {
  const term = (searchTerm || '').replace(/\*+$/g, '').trim().toLowerCase();
  if (!term) return true;
  const parts = term.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return true;
  const haystackTokens = [
    ...(item.title || '').toLowerCase().split(/\W+/),
    ...(item.description || '').toLowerCase().split(/\W+/),
    ...(item.id || '').toLowerCase().split(/\W+/),
  ].filter(Boolean);
  return parts.every((p) => haystackTokens.some((tok) => tok.startsWith(p)));
}

/**
 * Format a content item for search results
 * Includes image_field and image_scales matching real Plone API structure
 * Includes is_folderish for folder navigation in object browser
 * Includes hasPreviewImage for teaser blocks to show target's preview image
 */
function formatSearchItem(content, baseUrl) {
  // Check if content has a preview image (common for Documents, News Items, etc.).
  // For distribution-style content the preview_image is a blob_path reference;
  // unless the bytes also exist on disk under the content dir, the mock can't
  // serve the @@images URL — so don't claim a preview image we can't deliver.
  const declaresPreview = !!(content.preview_image || content['@type'] === 'Image');
  let hasPreviewImage = declaresPreview;
  if (declaresPreview && content.preview_image?.blob_path) {
    const urlPath = (content['@id'] || '').replace(/^https?:\/\/[^/]+/, '') || '/';
    const dirInfo = contentDirMap[urlPath];
    hasPreviewImage = !!(dirInfo && findFirstImageFile(dirInfo.dirPath, 3));
  }

  const item = {
    '@id': content['@id'],
    '@type': content['@type'],
    'id': content.id,
    'title': content.title,
    'description': content.description || '',
    'review_state': content.review_state || 'published',
    'UID': content.UID,
    'is_folderish': content.is_folderish !== undefined ? content.is_folderish : true,
    'hasPreviewImage': hasPreviewImage,
    'effective': content.effective || content.created || null,
    'created': content.created || null,
    // Catalog brain attributes that nav-shaped listings rely on:
    // - getObjPositionInParent: position within immediate parent folder
    //   (from __metadata__.json ordering). The hierarchical post-sort
    //   in ploneFetchItems uses this to assemble parent-then-children.
    // - exclude_from_nav: whether the item is hidden from navigation —
    //   authors filter on this via a querystring criterion.
    'getObjPositionInParent': content.UID && uidPositionMap[content.UID] !== undefined
      ? uidPositionMap[content.UID]
      : null,
    'exclude_from_nav': content.exclude_from_nav === true,
    // Subject (capital S) is the Plone catalog index name; the @querystring-search
    // filter reads `item.Subject` for facet.Subject criteria. Populate from the
    // content's `subjects` field (the lowercase schema field).
    'Subject': content.subjects || [],
  };

  // Match real Plone: always include image_field and image_scales.
  // With image: image_field='image', image_scales={...}
  // Without image: image_field='', image_scales=null
  if (content['@type'] === 'Image') {
    item.image_field = 'image';
    item.image_scales = getImageScales(content, baseUrl) || getPlaceholderImageScales(content.title);
  } else if (content.image && (content.image.blob_path || content.image.width)) {
    // Lead image field (CaseStudy/Document with ILeadImage). Real Plone
    // exposes image_field='image' + image_scales for these in listings; the
    // @@images endpoint resolves the blob_path (incl. cross-referenced blobs).
    item.image_field = 'image';
    item.image_scales = getLeadImageScales(content, 'image');
  } else if (hasPreviewImage) {
    item.image_field = 'preview_image';
    item.image_scales = getPlaceholderImageScales(content.title, 'preview_image');
  } else {
    item.image_field = '';
    item.image_scales = null;
  }

  return item;
}

/**
 * Load raw content from disk (without enrichment, for internal use)
 * @param {string} urlPath - The URL path to load content for
 * @returns {Object|null} The raw content object or null if not found
 */
function loadRawContentFromDisk(urlPath) {
  // First check contentDirMap (for pre-scanned content)
  const dirInfo = contentDirMap[urlPath];
  if (dirInfo) {
    const dataPath = path.join(dirInfo.dirPath, 'data.json');
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  }

  // Fallback: try to find content directly from disk for paths not in map
  // This allows new content files added during tests to be found
  for (const { mountPath, dirPath } of CONTENT_MOUNTS) {
    const relativePath = mountPath === '/' ? urlPath : urlPath.replace(mountPath, '');
    const contentDir = path.join(dirPath, relativePath.replace(/^\//, ''));
    const dataPath = path.join(contentDir, 'data.json');
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
  }

  return null;
}

/**
 * Load content from disk for a given URL path (with enrichment)
 * @param {string} urlPath - The URL path to load content for
 * @returns {Object|null} The enriched content object or null if not found
 */
/**
 * Parse the ?expand= query string into an array of component names.
 * Real Plone treats this as a comma-separated list driving which
 * @components entries are returned expanded vs as @id stubs.
 */
function parseExpand(req) {
  const raw = req?.query?.expand;
  if (!raw) return [];
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

function loadContentFromDisk(urlPath, expandList = []) {
  const baseUrl = `http://localhost:${PORT}`;
  const content = loadRawContentFromDisk(urlPath);
  if (!content) return null;

  return enrichContent(content, urlPath, baseUrl, expandList);
}

/**
 * Format raw content for navigation (avoids enrichment to prevent circular calls).
 * remainingDepth controls how much of the subtree to include: 0 means no
 * children, 1 means direct children only, etc.
 */
function formatNavItem(rawContent, urlPath, baseUrl, remainingDepth) {
  const hasPreviewImage = !!(rawContent.preview_image || rawContent['@type'] === 'Image');
  const children = (remainingDepth > 0 && rawContent.is_folderish !== false)
    ? getNavigationItems(urlPath, remainingDepth, baseUrl)
    : [];
  return {
    '@id': `${baseUrl}${urlPath}`,
    '@type': rawContent['@type'],
    'id': rawContent.id,
    'title': rawContent.title,
    'description': rawContent.description || '',
    'review_state': rawContent.review_state || 'published',
    'UID': rawContent.UID || `${rawContent.id}-uid`,
    'is_folderish': rawContent.is_folderish !== undefined ? rawContent.is_folderish : true,
    'hasPreviewImage': hasPreviewImage,
    'items': children,
  };
}

/**
 * Get navigation items at a specific level under a base path
 * Only includes content from disk (contentDirMap), not session uploads
 * Uses raw content to avoid circular enrichment calls
 * @param {string} basePath - The base path to get navigation for (e.g., '/' or '/pretagov')
 * @param {number} depth - How many levels deep to include (default 1)
 */
function getNavigationItems(basePath = '/', depth = 1, baseUrlIn) {
  const baseUrl = baseUrlIn || `http://localhost:${PORT}`;
  const normalizedBase = basePath.replace(/\/$/, '') || '/';
  const baseDepth = normalizedBase === '/' ? 0 : normalizedBase.split('/').filter(p => p).length;

  const items = Object.keys(contentDirMap)
    .filter((itemPath) => {
      if (itemPath === '/') return false;
      if (itemPath === normalizedBase) return false; // Exclude the base itself

      // Check if item is under the base path
      if (normalizedBase !== '/' && !itemPath.startsWith(normalizedBase + '/')) {
        return false;
      }

      // Direct children of the base only — formatNavItem recurses for the
      // rest of the subtree with remainingDepth-1.
      const itemParts = itemPath.split('/').filter(p => p);
      return itemParts.length === baseDepth + 1;
    })
    .map((itemPath) => {
      const rawContent = loadRawContentFromDisk(itemPath);
      if (!rawContent) return null;
      if (rawContent.exclude_from_nav) return null;
      if (rawContent['@type'] === 'Image' || rawContent['@type'] === 'File') return null;
      return formatNavItem(rawContent, itemPath, baseUrl, depth - 1);
    })
    .filter(Boolean);

  // Sort by __metadata__.json ordering (UID→position), preserving
  // contentDirMap key order (filesystem alphabetical) as fallback.
  items.sort((a, b) => {
    const aPos = a.UID ? uidPositionMap[a.UID] : undefined;
    const bPos = b.UID ? uidPositionMap[b.UID] : undefined;
    if (aPos !== undefined && bPos !== undefined) return aPos - bPos;
    if (aPos !== undefined) return -1;
    if (bPos !== undefined) return 1;
    return 0; // preserve original order
  });

  return items;
}

/**
 * Get root-level navigation items.
 * Merges items from all content mounts so test content (/_test_data/*)
 * appears alongside docs content in the navigation.
 */
function getRootNavigationItems() {
  // Top-level items each pre-populated with their immediate children, so
  // the dropdown menu shows the next level on hover. depth=2 means "two
  // levels of items in total" — top + their direct children — which is
  // what the previous (depth-1-with-implicit-child-recursion) code produced.
  return getNavigationItems('/', 2);
}

// ── Per-component builders ────────────────────────────────────────────────
//
// Single source of truth for each @components entry. Used by:
//   1. generateComponents() — the inline expansion path that fills
//      @components when ?expand=... lists the component on a content GET/POST.
//   2. Dedicated endpoint handlers (`/@actions`, `/@breadcrumbs`, ...) that
//      respond to direct fetches from clients.
//
// Without this dedupe the two paths drift: the inline @components.actions
// historically had `view + edit + folderContents` while the dedicated
// /@actions endpoint had only `view + edit`, so reducers seeing the same
// "actions" data via different code paths got different results.

function buildBreadcrumbsComponent(cleanPath, baseUrl) {
  const pathParts = cleanPath.split('/').filter(Boolean);
  const items = [{ '@id': baseUrl, title: 'Home' }];
  let currentPath = '';
  for (const part of pathParts) {
    currentPath += '/' + part;
    const partContent = loadRawContentFromDisk(currentPath);
    items.push({
      '@id': baseUrl + currentPath,
      title: partContent?.title || part,
    });
  }
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  return {
    '@id': `${fullUrl}/@breadcrumbs`,
    items,
    root: baseUrl,
  };
}

function buildActionsComponent(cleanPath, baseUrl) {
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  return {
    '@id': `${fullUrl}/@actions`,
    document_actions: [],
    object: [
      { '@id': fullUrl, icon: '', id: 'view', title: 'View' },
      { '@id': `${fullUrl}/edit`, icon: '', id: 'edit', title: 'Edit' },
      { id: 'folderContents', title: 'Contents' },
    ],
    object_buttons: [],
    portal_tabs: [],
    site_actions: [],
    user: [],
  };
}

function buildNavigationComponent(cleanPath, baseUrl) {
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  return {
    '@id': `${fullUrl}/@navigation`,
    // Always rooted at site root — top-level items with nested children
    items: getRootNavigationItems(),
  };
}

function buildWorkflowComponent(cleanPath, baseUrl) {
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  return {
    '@id': `${fullUrl}/@workflow`,
    history: [],
    transitions: [],
  };
}

function buildNavrootComponent(cleanPath, baseUrl) {
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  return {
    '@id': `${fullUrl}/@navroot`,
    navroot: {
      '@id': baseUrl,
      '@type': 'Plone Site',
      title: 'Site',
    },
  };
}

function buildTypesComponent() {
  return listAddableTypes();
}

/**
 * Generate the FULL @components map (every entry expanded). The
 * expand-aware caller (enrichContent) decides which entries are included
 * vs left as @id stubs.
 */
function generateComponents(urlPath, baseUrl) {
  const cleanPath = urlPath.replace(/\/$/, '') || '/';
  return {
    actions: buildActionsComponent(cleanPath, baseUrl),
    breadcrumbs: buildBreadcrumbsComponent(cleanPath, baseUrl),
    navigation: buildNavigationComponent(cleanPath, baseUrl),
    navroot: buildNavrootComponent(cleanPath, baseUrl),
    types: buildTypesComponent(),
    workflow: buildWorkflowComponent(cleanPath, baseUrl),
  };
}

/**
 * Resolve resolveuid/UID references in content to actual paths.
 * Like Plone's serializer, converts resolveuid/UID strings to addressable
 * locations.
 *
 * Most fields get a full URL (matches Plone's serializer behaviour for
 * link/href fields). templateId / templateInstanceId / slotId resolve to
 * paths only — these are template-system identifiers compared against the
 * admin's currentPath (also a path), so an origin prefix would defeat
 * equality checks like the save-flow's `id !== currentPath` filter and
 * the load-flow's "don't recursively expand a template into its own page"
 * guard.
 */
function resolveUidUrls(obj, parentKey = null) {
  if (typeof obj === 'string') {
    const resolveAsPath = parentKey === 'templateId'
      || parentKey === 'templateInstanceId'
      || parentKey === 'slotId';
    return obj.replace(/(?:\.\.\/)*resolveuid\/([a-z0-9][-a-z0-9]*)/g, (match, uid) => {
      let resolvedPath = uidToPathMap[uid];
      if (!resolvedPath) {
        // UID not found — rescan content dirs in case new files were added
        initContentDirMap();
        resolvedPath = uidToPathMap[uid];
      }
      if (!resolvedPath) return match;
      return resolveAsPath ? resolvedPath : `http://localhost:${PORT}${resolvedPath}`;
    });
  }
  if (Array.isArray(obj)) return obj.map(item => resolveUidUrls(item, parentKey));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveUidUrls(value, key);
    }
    return result;
  }
  return obj;
}

/**
 * Add image_scales to catalog brain references embedded in block data.
 * Real Plone includes image_scales in catalog brains; our content export doesn't.
 * Walks the data and for any object with image_field but no image_scales,
 * looks up the referenced image content and generates scales.
 */
function enrichImageBrains(obj, baseUrl) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => enrichImageBrains(item, baseUrl));

  // Check if this object is a catalog brain reference missing image_scales
  if (obj.image_field && !obj.image_scales && obj['@id']) {
    // Extract path from @id URL
    const idUrl = obj['@id'];
    const contentPath = idUrl.startsWith('http') ? new URL(idUrl).pathname : idUrl;
    const rawContent = loadRawContentFromDisk(contentPath);
    if (rawContent) {
      const enrichedImage = enrichContent(rawContent, contentPath, baseUrl);
      const scales = getImageScales(enrichedImage, baseUrl);
      if (scales) {
        obj = { ...obj, image_scales: scales };
      }
    }
  }

  // Recurse into nested objects
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = enrichImageBrains(value, baseUrl);
  }
  return result;
}

/**
 * Get folder child items sorted by __metadata__.json ordering.
 * Like Plone's content serializer, returns summary representations of children.
 */
function getFolderChildItems(folderPath, baseUrl) {
  const normalizedFolder = folderPath.replace(/\/$/, '') || '/';
  const folderDepth = normalizedFolder === '/' ? 0 : normalizedFolder.split('/').filter(Boolean).length;

  const items = Object.keys(contentDirMap)
    .filter((itemPath) => {
      if (itemPath === '/') return false;
      if (itemPath === normalizedFolder) return false;
      if (normalizedFolder !== '/' && !itemPath.startsWith(normalizedFolder + '/')) return false;
      const itemParts = itemPath.split('/').filter(Boolean);
      return itemParts.length === folderDepth + 1;
    })
    .map((itemPath) => {
      const rawContent = loadRawContentFromDisk(itemPath);
      if (!rawContent) return null;
      return {
        '@id': `${baseUrl}${itemPath}`,
        '@type': rawContent['@type'],
        'description': rawContent.description || '',
        'review_state': rawContent.review_state || 'published',
        'title': rawContent.title,
        'UID': rawContent.UID,
      };
    })
    .filter(Boolean);

  // Sort by __metadata__.json ordering (UID→position)
  items.sort((a, b) => {
    const aPos = a.UID ? uidPositionMap[a.UID] : undefined;
    const bPos = b.UID ? uidPositionMap[b.UID] : undefined;
    if (aPos !== undefined && bPos !== undefined) return aPos - bPos;
    if (aPos !== undefined) return -1;
    if (bPos !== undefined) return 1;
    return 0;
  });

  return items;
}

/**
 * Enrich content with generated fields (@id, @components, permissions, etc.)
 * Content files use distribution format with relative @id paths.
 */
/**
 * Build a stubbed @components map: every component is just {'@id': '<endpoint URL>'}.
 * Mirrors real Plone — without ?expand=, components are stubs that point to
 * dedicated endpoints (`@actions`, `@breadcrumbs`, ...). Reducers that need
 * the data either dispatch separate fetches or rely on the apiExpanders
 * middleware to add ?expand= which the request handler then expands.
 */
function stubComponents(fullUrl) {
  const ids = ['actions', 'aliases', 'breadcrumbs', 'contextnavigation', 'navigation', 'navroot', 'types', 'workflow'];
  const stubs = {};
  for (const k of ids) {
    stubs[k] = { '@id': `${fullUrl}/@${k}` };
  }
  return stubs;
}

/**
 * Replace stubs for the named components with their fully-expanded bodies.
 * `expandList` is parsed from ?expand= on the incoming request.
 */
function expandComponents(stubs, expandList, urlPath, baseUrl) {
  if (!expandList || expandList.length === 0) return stubs;
  const expanded = generateComponents(urlPath, baseUrl);
  const out = { ...stubs };
  for (const name of expandList) {
    if (expanded[name] !== undefined) out[name] = expanded[name];
  }
  return out;
}

function enrichContent(content, urlPath, baseUrl, expandList = []) {
  // Always use urlPath for @id (includes mount prefix), normalize trailing slash
  const cleanPath = urlPath.replace(/\/$/, '') || '/';
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;

  // Convert parent @id to full URL if needed
  let parent = content.parent;
  if (parent && parent['@id'] && !parent['@id'].startsWith('http')) {
    parent = {
      ...parent,
      '@id': baseUrl + parent['@id']
    };
  } else if (!parent) {
    parent = {
      '@id': baseUrl,
      '@type': 'Plone Site',
      'title': 'Site'
    };
  }

  // Transform distribution blob_path fields to download URLs
  const transformed = transformBlobPaths(content, fullUrl);

  // Dynamically build items (folder children) like Plone does,
  // sorted by __metadata__.json ordering
  const isFolderish = transformed.is_folderish !== undefined ? transformed.is_folderish : true;
  const childItems = isFolderish ? getFolderChildItems(cleanPath, baseUrl) : [];

  const enriched = {
    ...transformed,
    '@id': fullUrl,
    'UID': transformed.UID || `${transformed.id || urlPath.replace(/\//g, '-')}-uid`,
    'review_state': transformed.review_state || 'published',
    'is_folderish': isFolderish,
    'allow_discussion': transformed.allow_discussion !== undefined ? transformed.allow_discussion : false,
    'exclude_from_nav': transformed.exclude_from_nav || false,
    'created': transformed.created || '2025-01-01T12:00:00+00:00',
    'modified': transformed.modified || '2025-01-01T12:00:00+00:00',
    'lock': transformed.lock || { 'locked': false, 'stealable': true },
    'parent': parent,
    'items': childItems,
    'items_total': childItems.length,
    '@components': expandComponents(stubComponents(fullUrl), expandList, urlPath, baseUrl),
    // Permissions - granted by default, but a fixture may set `_mockPermissions` to model
    // an unauthorized case (e.g. a templates folder the user can't add to, or a template
    // document the user can't modify). This mirrors Plone's per-object permission flags.
    'can_manage_portlets': true,
    'can_view': transformed._mockPermissions?.can_view ?? true,
    'can_edit': transformed._mockPermissions?.can_edit ?? true,
    'can_delete': transformed._mockPermissions?.can_delete ?? true,
    'can_add': transformed._mockPermissions?.can_add ?? true,
    'can_list_contents': true
  };

  // Resolve resolveuid/UID references to actual URLs (like Plone's serializer)
  // Then add image_scales to catalog brain references (like Plone's serializer)
  return enrichImageBrains(resolveUidUrls(enriched), baseUrl);
}

/**
 * Scan content directory and populate contentDirMap (recursively)
 * Content is loaded from disk on-demand, not cached
 */
function scanContentDir(contentDirPath, mountPath) {
  if (!fs.existsSync(contentDirPath)) {
    console.log(`Content directory not found: ${contentDirPath}`);
    return;
  }

  console.log(`Scanning content from ${contentDirPath} mounted at ${mountPath}`);

  // Read __metadata__.json ordering if present (Plone distribution format)
  const metadataPath = path.join(contentDirPath, '__metadata__.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    if (metadata.ordering) {
      for (const [uid, position] of Object.entries(metadata.ordering)) {
        uidPositionMap[uid] = position;
      }
    }
  }

  const dirs = fs.readdirSync(contentDirPath, { withFileTypes: true });
  dirs.forEach((dir) => {
    // Support both real directories and symlinks to directories
    const fullDirPath = path.join(contentDirPath, dir.name);
    const isDir = dir.isDirectory() || (dir.isSymbolicLink() &&
      fs.statSync(fullDirPath).isDirectory());
    if (isDir) {
      const dataPath = path.join(fullDirPath, 'data.json');
      if (fs.existsSync(dataPath)) {
        const content = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        // Use @id from content if it's a path, otherwise use directory name
        let contentPath = content['@id']?.startsWith('/') ? content['@id'] : '/' + (content.id || dir.name);

        // Handle distribution site root (plone_site_root dir or @id=/Plone)
        if (dir.name === 'plone_site_root' || contentPath === '/Plone') {
          contentPath = '/';
        }

        // Apply mount prefix (skip if @id already starts with mountPath)
        const urlPath = mountPath === '/' || contentPath.startsWith(mountPath)
          ? contentPath
          : mountPath + contentPath;

        // Only store the directory mapping, content loaded on-demand
        contentDirMap[urlPath] = { dirPath: fullDirPath, dirName: dir.name };
        // Track UID→path for resolveuid endpoint
        if (content.UID) {
          uidToPathMap[content.UID] = urlPath;
        }
        console.log(`Registered content: ${urlPath}`);
      }
      // Always recurse into subdirectories to find nested content (e.g., templates/)
      scanContentDir(fullDirPath, mountPath);
    }
  });
}

/**
 * Generate site root content (not from disk)
 */
function getSiteRoot() {
  const baseUrl = `http://localhost:${PORT}`;
  return {
    '@id': baseUrl + '/',
    '@type': 'Plone Site',
    'id': 'Plone',
    'title': 'Plone Site',
    'description': '',
    'items': [],
    'items_total': 0,
    'is_folderish': true,
    'blocks': {},
    'blocks_layout': { 'items': [] },
    '@components': generateComponents('/', baseUrl),
    'can_manage_portlets': true,
    'can_view': true,
    'can_edit': true,
    'can_delete': true,
    'can_add': true,
    'can_list_contents': true
  };
}

// Scan content directories on startup (content loaded on-demand)
function initContentDirMap() {
  CONTENT_MOUNTS.forEach(({ mountPath, dirPath }) => {
    // Register the mount point itself if it has a root data.json (e.g., /_test_data folder page).
    // The '/' mount is handled via plone_site_root inside scanContentDir.
    if (mountPath !== '/') {
      const rootDataPath = path.join(dirPath, 'data.json');
      if (fs.existsSync(rootDataPath)) {
        contentDirMap[mountPath] = { dirPath, dirName: path.basename(dirPath) };
        console.log(`Registered content: ${mountPath}`);
      }
    }
    scanContentDir(dirPath, mountPath);
  });
  console.log(`Registered ${Object.keys(contentDirMap).length} content paths`);
}

// Initialize on startup
initContentDirMap();

// Watch content mounts for additions/deletions/modifications and rebuild
// contentDirMap. node --watch only restarts the JS process on .cjs edits —
// new fixture directories aren't reliably detected, so listings and other
// catalog queries would miss fresh content until restart. fs.watch with
// recursive:true covers macOS + Windows; Linux falls back to no-op (tests
// fixtures only see live additions during local dev, not CI).
function setupContentWatchers() {
  const debounceMs = 100;
  let timer = null;
  const onChange = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      initContentDirMap();
    }, debounceMs);
  };
  for (const { dirPath } of CONTENT_MOUNTS) {
    if (!fs.existsSync(dirPath)) continue;
    try {
      fs.watch(dirPath, { recursive: true, persistent: false }, onChange);
      console.log(`Watching content dir: ${dirPath}`);
    } catch (err) {
      // Linux doesn't support recursive — let it throw so the missing
      // support is visible rather than silently degrading.
      throw err;
    }
  }
}
setupContentWatchers();

/**
 * Get content for a path
 * Checks: session uploads -> disk content -> generated site root
 * @param {string} urlPath - Content path
 * @param {string} sessionId - Session ID for session-specific uploads
 */
function getContent(urlPath, sessionId, expandList = []) {
  // Check session-specific storage first (for uploads created in this session)
  if (sessionId && sessionContent[sessionId]?.[urlPath]) {
    const stored = sessionContent[sessionId][urlPath];
    // Session content may be stored raw (POST handlers) or already-enriched
    // (legacy callers that built full responses inline). Re-enrich
    // unconditionally so the read-time @components reflect the current
    // request's ?expand= choices, like Plone does.
    const baseUrl = `http://localhost:${PORT}`;
    return enrichContent(stored, urlPath, baseUrl, expandList);
  }

  // Try disk first (distribution content may have a site root)
  const diskContent = loadContentFromDisk(urlPath, expandList);
  if (diskContent) return diskContent;

  // Fall back to generated site root
  if (urlPath === '/') {
    return getSiteRoot();
  }

  return null;
}

/**
 * POST /@login-renew
 * Renew/validate existing JWT token - generates fresh token each time
 */
app.post('/@login-renew', (req, res) => {
  if (process.env.DEBUG) {
    console.log('Token renewal requested');
  }

  // Generate fresh token with new expiration
  res.json({
    token: generateAuthToken('admin'),
    user: {
      '@id': 'http://localhost:8888/@users/admin',
      id: 'admin',
      fullname: 'Admin User',
      email: 'admin@example.com',
      roles: ['Manager', 'Authenticated'],
    },
  });
});

/**
 * POST /@login
 * Authenticate and return JWT token with user info - generates fresh token each time
 */
app.post('/@login', (req, res) => {
  const { login, password } = req.body;

  if (process.env.DEBUG) {
    console.log(`Login attempt - username: ${login}, password: ${password ? '***' : 'missing'}`);
  }

  if (login && password) {
    // Generate fresh token with new expiration
    const token = generateAuthToken(login);
    const response = {
      token,
      user: {
        '@id': `http://localhost:8888/@users/${login}`,
        id: login,
        fullname: 'Admin User',
        email: 'admin@example.com',
        roles: ['Manager', 'Authenticated'],
      },
    };

    if (process.env.DEBUG) {
      console.log(`Login successful, returning token: ${token.substring(0, 20)}...`);
      console.log(`Response body:`, JSON.stringify(response));
    }

    res.json(response);
  } else {
    if (process.env.DEBUG) {
      console.log(`Login failed - missing credentials`);
    }

    res.status(401).json({
      error: {
        type: 'Invalid',
        message: 'Login and password required',
      },
    });
  }
});

/**
 * POST /@logout
 * Logout and invalidate the session (mock - always succeeds)
 */
app.post('/@logout', (req, res) => {
  if (process.env.DEBUG) {
    console.log('Logout requested');
  }
  // Return 204 No Content on successful logout (Plone behavior)
  res.status(204).send();
});

/**
 * POST /:path (content creation)
 * Create new content (e.g., Image upload)
 * Used by ImageWidget for file uploads
 */
app.post('/*', (req, res, next) => {
  // Skip special endpoints (already handled above or below)
  if (req.path.startsWith('/@') || req.path.includes('/@')) {
    return next();
  }

  if (process.env.DEBUG) {
    console.log(`POST content creation: path=${req.path}, @type=${req.body?.['@type']}`);
  }

  const body = req.body;
  if (!body || !body['@type']) {
    // No @type means this isn't a content creation request - pass to next handler
    return next();
  }

  const parentPath = req.path || '/';
  const contentType = body['@type'];

  if (contentType === 'Image') {
    // Return error for test trigger filename
    if (body.image?.filename === 'trigger-error.png') {
      return res.status(500).json({
        error: {
          type: 'InternalServerError',
          message: 'Upload failed: simulated server error',
        },
      });
    }

    // Generate a unique ID for the uploaded image
    const imageId = `uploaded-image-${Date.now()}`;
    const imagePath = `${parentPath === '/' ? '' : parentPath}/${imageId}`.replace(/\/+/g, '/');

    // Extract image dimensions from data if possible, otherwise use defaults
    const width = 800;
    const height = 600;

    // Create the image content
    const imageContent = {
      '@id': `http://localhost:8888${imagePath}`,
      '@type': 'Image',
      'UID': `uid-${imageId}`,
      'id': imageId,
      'title': body.title || 'Uploaded Image',
      'description': body.description || '',
      'image': {
        'content-type': body.image?.['content-type'] || 'image/png',
        'download': `http://localhost:8888${imagePath}/@@images/image`,
        'filename': body.image?.filename || 'image.png',
        'height': height,
        'width': width,
        'scales': {
          'preview': {
            'download': `http://localhost:8888${imagePath}/@@images/image/preview`,
            'height': 400,
            'width': 400,
          },
          'large': {
            'download': `http://localhost:8888${imagePath}/@@images/image/large`,
            'height': 800,
            'width': 800,
          },
        },
        'size': body.image?.data?.length || 1000,
      },
      'image_scales': {
        'image': [{
          'content-type': body.image?.['content-type'] || 'image/png',
          'download': `@@images/image-${width}-hash.${body.image?.['content-type']?.split('/')[1] || 'png'}`,
          'filename': body.image?.filename || 'image.png',
          'height': height,
          'width': width,
          'scales': {
            'preview': {
              'download': `@@images/image-400-hash.${body.image?.['content-type']?.split('/')[1] || 'png'}`,
              'height': 400,
              'width': 400,
            },
          },
        }],
      },
      'review_state': 'published',
    };

    // Store in session-specific storage (or global if no session)
    const sessionId = getSessionId(req);
    setSessionContent(sessionId, imagePath, imageContent);

    if (process.env.DEBUG) {
      console.log(`Created Image: ${imagePath}${sessionId ? ` (session: ${sessionId})` : ''}`);
    }

    return res.status(201).json(imageContent);
  }

  if (contentType === 'Document') {
    // Plone populates server-side fields (UID, created, modified,
    // effective, review_state, etc.) on create — the client only sends
    // title, blocks, blocks_layout (and an optional id, e.g. for
    // templates that want a stable path). Match real Plone's response
    // shape so Volto can transition straight from Add → Edit on the
    // POST response without re-fetching: store the bare doc, then
    // serialize through enrichContent so the response carries
    // @components / is_folderish / parent / items / etc., same as a
    // GET on the same path would.
    const id = body.id || `untitled-document-${Date.now()}`;
    const docPath = `${parentPath === '/' ? '' : parentPath}/${id}`.replace(/\/+/g, '/');
    const now = new Date().toISOString();
    const baseUrl = `http://localhost:${PORT}`;
    const rawDoc = {
      '@type': 'Document',
      id,
      title: body.title || id,
      description: body.description || '',
      blocks: body.blocks || {},
      blocks_layout: body.blocks_layout || { items: [] },
      created: now,
      modified: now,
      effective: now,
      review_state: 'published',
    };

    const sessionId = getSessionId(req);
    setSessionContent(sessionId, docPath, rawDoc);

    if (process.env.DEBUG) {
      console.log(`Created Document: ${docPath}${sessionId ? ` (session: ${sessionId})` : ''}`);
    }

    return res.status(201).json(enrichContent(rawDoc, docPath, baseUrl, parseExpand(req)));
  }

  // Unsupported content type - return 501 instead of passing to next
  return res.status(501).json({ error: `Content type '${contentType}' not supported` });
});

/**
 * GET /health
 * Health check endpoint for server readiness
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Walk every registered content dir and collect unique `subjects` values
 * across all data.json files. Returns the `{ value: { title } }` shape
 * Plone's @querystring endpoint uses for the Subject (Keywords) index.
 */
function collectSubjectValues() {
  const subjects = new Set();
  for (const { dirPath } of Object.values(contentDirMap)) {
    const dataFile = path.join(dirPath, 'data.json');
    if (!fs.existsSync(dataFile)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      for (const s of (data.subjects || [])) {
        if (typeof s === 'string' && s) subjects.add(s);
      }
    } catch { /* ignore malformed data.json */ }
  }
  const out = {};
  for (const s of [...subjects].sort()) out[s] = { title: s };
  return out;
}

/**
 * GET /@querystring
 * Get querystring schema (available indexes, operators, sortable indexes)
 * Used by QuerystringWidget to populate criteria and sort dropdowns
 */
app.get('*/@querystring', (req, res) => {
  res.json({
    '@id': 'http://localhost:8888/@querystring',
    'indexes': {
      'portal_type': {
        'title': 'Type',
        'description': 'Content type',
        'group': 'Metadata',
        'enabled': true,
        'sortable': false,
        // portal_type is a FieldIndex (one value per item) — real Plone
        // offers only .any / .none for it; .all is KeywordIndex-only.
        'operations': [
          'plone.app.querystring.operation.selection.any',
          'plone.app.querystring.operation.selection.none',
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'description': 'Matches any of the selected values',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.any',
          },
          'plone.app.querystring.operation.selection.none': {
            'title': 'Matches none of',
            'description': 'Matches none of the selected values',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.none',
          },
        },
        'values': {
          'Document': { 'title': 'Page' },
          'News Item': { 'title': 'News Item' },
          'Event': { 'title': 'Event' },
          'Image': { 'title': 'Image' },
          'File': { 'title': 'File' },
          'Link': { 'title': 'Link' },
        },
      },
      'path': {
        'title': 'Location',
        'description': 'Location in the site structure',
        'group': 'Metadata',
        'enabled': true,
        'sortable': false,
        'operations': [
          'plone.app.querystring.operation.string.absolutePath',
          'plone.app.querystring.operation.string.relativePath',
        ],
        'operators': {
          'plone.app.querystring.operation.string.absolutePath': {
            'title': 'Absolute path',
            'description': 'Absolute path from site root',
            'widget': 'ReferenceWidget',
            'operation': 'plone.app.querystring.operation.string.absolutePath',
          },
          'plone.app.querystring.operation.string.relativePath': {
            'title': 'Relative path',
            'description': 'Relative to current location',
            'widget': 'ReferenceWidget',
            'operation': 'plone.app.querystring.operation.string.relativePath',
          },
        },
      },
      'review_state': {
        'title': 'Review state',
        'description': 'Workflow state',
        'group': 'Metadata',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.selection.any',
          'plone.app.querystring.operation.selection.none',
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.any',
          },
          'plone.app.querystring.operation.selection.none': {
            'title': 'Matches none of',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.none',
          },
        },
        'values': {
          'private': { 'title': 'Private' },
          'pending': { 'title': 'Pending' },
          'published': { 'title': 'Published' },
        },
      },
      'created': {
        'title': 'Creation date',
        'description': 'Date created',
        'group': 'Dates',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.date.lessThan',
          'plone.app.querystring.operation.date.largerThan',
          'plone.app.querystring.operation.date.between',
        ],
        'operators': {
          'plone.app.querystring.operation.date.lessThan': {
            'title': 'Before',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.lessThan',
          },
          'plone.app.querystring.operation.date.largerThan': {
            'title': 'After',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.largerThan',
          },
          'plone.app.querystring.operation.date.between': {
            'title': 'Between',
            'widget': 'DateRangeWidget',
            'operation': 'plone.app.querystring.operation.date.between',
          },
        },
      },
      'effective': {
        'title': 'Effective date',
        'description': 'Publication date',
        'group': 'Dates',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.date.lessThan',
          'plone.app.querystring.operation.date.largerThan',
        ],
        'operators': {
          'plone.app.querystring.operation.date.lessThan': {
            'title': 'Before',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.lessThan',
          },
          'plone.app.querystring.operation.date.largerThan': {
            'title': 'After',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.largerThan',
          },
        },
      },
      'modified': {
        'title': 'Modification date',
        'description': 'Date last modified',
        'group': 'Dates',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.date.lessThan',
          'plone.app.querystring.operation.date.largerThan',
        ],
        'operators': {
          'plone.app.querystring.operation.date.lessThan': {
            'title': 'Before',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.lessThan',
          },
          'plone.app.querystring.operation.date.largerThan': {
            'title': 'After',
            'widget': 'DateWidget',
            'operation': 'plone.app.querystring.operation.date.largerThan',
          },
        },
      },
      'Creator': {
        'title': 'Creator',
        'description': 'Content author',
        'group': 'Metadata',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.string.is',
        ],
        'operators': {
          'plone.app.querystring.operation.string.is': {
            'title': 'Is',
            'widget': null,
            'operation': 'plone.app.querystring.operation.string.is',
          },
        },
      },
      'Subject': {
        'title': 'Tag',
        'description': 'Subject/tag',
        'group': 'Text',
        'enabled': true,
        'sortable': false,
        'vocabulary': 'plone.app.vocabularies.Keywords',
        'operations': [
          'plone.app.querystring.operation.selection.any',
          'plone.app.querystring.operation.selection.all',
          'plone.app.querystring.operation.selection.none',
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'widget': 'autocomplete',
            'operation': 'plone.app.querystring.operation.selection.any',
          },
          'plone.app.querystring.operation.selection.all': {
            'title': 'Matches all of',
            'widget': 'autocomplete',
            'operation': 'plone.app.querystring.operation.selection.all',
          },
          'plone.app.querystring.operation.selection.none': {
            'title': 'Matches none of',
            'widget': 'autocomplete',
            'operation': 'plone.app.querystring.operation.selection.none',
          },
        },
        'values': collectSubjectValues(),
      },
      'Title': {
        'title': 'Title',
        'description': 'Content title',
        'group': 'Text',
        'enabled': true,
        'sortable': true,
        'operations': [
          'plone.app.querystring.operation.string.contains',
        ],
        'operators': {
          'plone.app.querystring.operation.string.contains': {
            'title': 'Contains',
            'widget': null,
            'operation': 'plone.app.querystring.operation.string.contains',
          },
        },
      },
      'Description': {
        'title': 'Description',
        'description': 'Content description',
        'group': 'Text',
        'enabled': true,
        'sortable': false,
        'operations': [
          'plone.app.querystring.operation.string.contains',
        ],
        'operators': {
          'plone.app.querystring.operation.string.contains': {
            'title': 'Contains',
            'widget': null,
            'operation': 'plone.app.querystring.operation.string.contains',
          },
        },
      },
      'SearchableText': {
        'title': 'Searchable text',
        'description': 'All text content',
        'group': 'Text',
        'enabled': true,
        'sortable': false,
        'operations': [
          'plone.app.querystring.operation.string.contains',
        ],
        'operators': {
          'plone.app.querystring.operation.string.contains': {
            'title': 'Contains',
            'widget': null,
            'operation': 'plone.app.querystring.operation.string.contains',
          },
        },
      },
    },
    'sortable_indexes': {
      'effective': { 'title': 'Effective date', 'description': 'Publication date' },
      'created': { 'title': 'Creation date', 'description': 'Date created' },
      'modified': { 'title': 'Modification date', 'description': 'Date last modified' },
      'sortable_title': { 'title': 'Title', 'description': 'Title (sortable)' },
      'Creator': { 'title': 'Creator', 'description': 'Content author' },
      'review_state': { 'title': 'Review state', 'description': 'Workflow state' },
      // Position in the parent folder — used by navigation listings.
      // ploneFetchItems detects path+getObjPositionInParent and routes
      // the call to @navigation instead of @querystring-search.
      'getObjPositionInParent': { 'title': 'Position in parent', 'description': 'Order within parent folder (navigation order)' },
    },
  });
});

/**
 * GET /@site
 * Get site information
 */
app.get('/@site', (req, res) => {
  res.json({
    '@id': 'http://localhost:8888',
    'plone.site_title': 'Plone Site',
    'plone.site_logo': null,
    // Volto 19 reads `plone.default_language` from this response as the
    // middle fallback in its SSR language-resolution chain
    // (server.jsx -> toBackendLang(initialLang)). Volto 18 used
    // `config.settings.defaultLanguage` instead — the source moved from
    // frontend config to backend response, so the mock has to provide it.
    'plone.default_language': 'en',
    'plone.available_languages': ['en'],
  });
});

/**
 * GET /@workflow
 * Get workflow information for site root
 */
app.get(/.*\/@workflow$/, (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@workflow$/, '') || '/').replace(/\/+$/, '') || '/';
  res.json(buildWorkflowComponent(cleanPath, `http://localhost:${PORT}`));
});

/**
 * GET /@users/:userid
 * Get user information
 */
app.get('/@users/:userid', (req, res) => {
  const { userid } = req.params;
  res.json({
    '@id': `http://localhost:8888/@users/${userid}`,
    id: userid,
    fullname: 'Admin User',
    email: 'admin@example.com',
    roles: ['Manager', 'Authenticated'],
    username: userid,
  });
});

/**
 * GET /@types/:typeName
 * Get content type schema
 */
function getTypeSchema(typeName) {
  const schemaPath = path.join(
    __dirname,
    'api',
    `schema-${typeName.toLowerCase()}.json`
  );

  const baseSchemaPath = path.join(__dirname, 'api', 'schema-base.json');
  const base = fs.existsSync(baseSchemaPath)
    ? JSON.parse(fs.readFileSync(baseSchemaPath, 'utf-8'))
    : { properties: {}, fieldsets: [] };

  let schema;
  if (fs.existsSync(schemaPath)) {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } else {
    // Return default Document schema
    schema = {
      title: typeName,
      properties: {
        title: {
          title: 'Title',
          type: 'string',
        },
        description: {
          title: 'Summary',
          type: 'string',
        },
        blocks: {
          title: 'Blocks',
          type: 'object',
        },
        blocks_layout: {
          title: 'Blocks Layout',
          type: 'object',
        },
      },
      required: ['title'],
      fieldsets: [
        {
          id: 'default',
          title: 'Default',
          fields: ['title', 'description'],
        },
      ],
    };
  }

  // Merge base schema fields (only add fields not already defined)
  schema.properties = { ...base.properties, ...schema.properties };
  const existingFieldsetIds = new Set((schema.fieldsets || []).map((f) => f.id));
  for (const fs_ of base.fieldsets || []) {
    if (!existingFieldsetIds.has(fs_.id)) {
      schema.fieldsets = [...(schema.fieldsets || []), fs_];
    }
  }

  return schema;
}

app.get('/@types/:typeName', (req, res) => {
  const { typeName } = req.params;
  res.json(getTypeSchema(typeName));
});

/**
 * GET /@types  (and GET /<folder>/@types)
 * List addable content types for the current container. Volto's toolbar
 * Add button reads this to populate the type-picker menu — without it the
 * button is hidden (Toolbar.jsx requires types.length > 0).
 *
 * Returns just Document for now; extend if a test needs Folder/News Item.
 */
function listAddableTypes() {
  return [
    {
      '@id': `http://localhost:${PORT}/@types/Document`,
      addable: true,
      title: 'Page',
    },
  ];
}

app.get('/@types', (req, res) => {
  res.json(listAddableTypes());
});
app.get('*/@types', (req, res) => {
  res.json(listAddableTypes());
});

/**
 * GET /:path/@types/:typeName
 * Get content type schema for a specific content path
 */
app.get('*/@types/:typeName', (req, res) => {
  const { typeName } = req.params;
  res.json(getTypeSchema(typeName));
});

/**
 * GET /:path/@breadcrumbs
 * Get breadcrumb trail
 */
app.get('*/@breadcrumbs', (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@breadcrumbs$/, '') || '/').replace(/\/+$/, '') || '/';
  res.json(buildBreadcrumbsComponent(cleanPath, `http://localhost:${PORT}`));
});

/**
 * GET /:path/@actions
 * Get available actions for content (Edit, View, etc.)
 * Use regex to ensure matching with ++api++ prefix
 */
app.get(/.*\/@actions$/, (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@actions$/, '') || '/').replace(/\/+$/, '') || '/';
  res.json(buildActionsComponent(cleanPath, `http://localhost:${PORT}`));
});

/**
 * GET /<path>/@navigation, /<path>/@navroot — sibling components reachable
 * via the @id stubs that @components emits when not in ?expand=. Same
 * builders feed the inline expansion path.
 */
app.get(/.*\/@navigation$/, (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@navigation$/, '') || '/').replace(/\/+$/, '') || '/';
  const baseUrl = `http://localhost:${PORT}`;
  // Real Plone honors `?expand.navigation.depth=N` and
  // `?expand.navigation.root_path=/some/path`. Default: rooted at site
  // root, depth 1 (matches the existing buildNavigationComponent behavior).
  const depthParam = req.query['expand.navigation.depth'];
  const rootPathParam = req.query['expand.navigation.root_path'];
  if (depthParam !== undefined || rootPathParam !== undefined) {
    const depth = depthParam !== undefined ? parseInt(depthParam, 10) : 1;
    const rootPath = rootPathParam || '/';
    res.json({
      '@id': `${baseUrl}${cleanPath}/@navigation`,
      items: getNavigationItems(rootPath, depth, baseUrl),
    });
    return;
  }
  res.json(buildNavigationComponent(cleanPath, baseUrl));
});

app.get(/.*\/@navroot$/, (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@navroot$/, '') || '/').replace(/\/+$/, '') || '/';
  res.json(buildNavrootComponent(cleanPath, `http://localhost:${PORT}`));
});

/**
 * GET /@aliases or /:path/@aliases
 * plone.app.redirector aliases (manual redirects). On the site root the
 * response lists every alias; on a context it filters to aliases that
 * target that context (path or descendant), matching plone.restapi's
 * `@aliases` GET behavior in Plone 6.2.
 */
app.get(/.*\/@aliases$/, (req, res) => {
  const cleanPath = (req.path.replace('/++api++', '').replace(/\/?@aliases$/, '') || '/').replace(/\/+$/, '') || '/';
  const baseUrl = `http://localhost:${PORT}`;
  const all = getAllRedirects();
  const items = cleanPath === '/'
    ? all
    : all.filter((a) => a['redirect-to'] === cleanPath || a['redirect-to'].startsWith(cleanPath + '/'));
  res.json({
    '@id': `${baseUrl}${cleanPath === '/' ? '' : cleanPath}/@aliases`,
    items,
    items_total: items.length,
  });
});

/**
 * POST /@querystring-search
 * Search for content using Volto's querystring format.
 * Used by listing blocks to fetch query results.
 *
 * Request body:
 * {
 *   query: [{ i: 'portal_type', o: 'plone.app.querystring.operation.selection.any', v: ['Document'] }],
 *   sort_on: 'effective',
 *   sort_order: 'descending',
 *   b_start: 0,
 *   b_size: 10,
 *   metadata_fields: '_all'
 * }
 */
app.post('*/@querystring-search', (req, res) => {
  const contextPath = req.path.replace('/++api++/@querystring-search', '').replace('/@querystring-search', '');
  const baseUrl = `http://localhost:${PORT}`;

  const { query = [], sort_on, sort_order, b_start = 0, b_size = 10, limit } = req.body;
  console.log('[MOCK-API] @querystring-search query:', JSON.stringify(query));

  // Extract the "root" path from the path criteria so depth (below) can
  // compute "how far below root is this item". Real Plone applies depth
  // relative to each path criterion; for our use we only support one path
  // criterion at a time — which matches sectionNav's listing config.
  // Resolve `..` / `.` segments in a path the way real Plone does for relativePath.
  const resolveRelativePath = (base, rel) => {
    const segs = (base + '/' + rel).split('/').filter(Boolean);
    const stack = [];
    for (const seg of segs) {
      if (seg === '.') continue;
      if (seg === '..') stack.pop();
      else stack.push(seg);
    }
    return '/' + stack.join('/');
  };

  // Plone encodes path-criterion depth in the criterion VALUE as
  // `path::depth` (e.g. `/docs/examples::1`, `.::2`). A bare path is a
  // recursive query. The top-level `depth` field on the request body is
  // NOT honoured by Plone's @querystring-search — verified against
  // demo.plone.org — so it is deliberately ignored here.
  const splitPathDepth = (v) => {
    const s = typeof v === 'string' ? v : '';
    const sep = s.indexOf('::');
    if (sep === -1) return { path: s, depth: null };
    const n = parseInt(s.slice(sep + 2), 10);
    return { path: s.slice(0, sep), depth: Number.isNaN(n) ? null : n };
  };

  let depthRoot = null;
  let pathDepth = null;
  for (const cond of query) {
    if (cond.i !== 'path') continue;
    const { path: pathV, depth: critDepth } = splitPathDepth(cond.v);
    if (critDepth !== null) pathDepth = critDepth;
    if (cond.o.includes('absolutePath')) {
      depthRoot = pathV;
    } else if (cond.o.includes('relativePath')) {
      let rel = pathV;
      if (rel === '.' || rel === '') rel = '';
      depthRoot = rel ? resolveRelativePath(contextPath, rel) : contextPath;
    }
  }

  // Get all content items using raw content (no enrichment needed for search).
  // loadContentFromDisk enriches every item (resolveuid, image scales, components)
  // which is extremely slow with 70+ items. Search results only need basic fields.
  let allItems = Object.keys(contentDirMap)
    .filter((itemPath) => itemPath !== '/')
    .map((itemPath) => {
      const raw = loadRawContentFromDisk(itemPath);
      if (!raw) return null;
      // Add @id and UID like enrichContent would, but skip expensive processing
      return {
        ...raw,
        '@id': `${baseUrl}${itemPath}`,
        UID: raw.UID || `${raw.id || itemPath.split('/').pop()}-uid`,
        id: raw.id || itemPath.split('/').pop(),
      };
    })
    .filter((content) => content !== null);

  // Apply query filters
  // plone.app.querystring `selection.*` operations apply by index TYPE,
  // not index name: FieldIndexes (portal_type, review_state — one value
  // per item) and KeywordIndexes (Subject — a list per item) share the
  // same .any/.all/.none semantics. selectionFields maps each index to
  // the item value(s) the operation compares against, so the single
  // handler below covers them all instead of per-index branches that drift.
  const selectionFields = {
    portal_type: (item) => [item['@type']],
    review_state: (item) => [item.review_state || 'published'],
    // Items here come from loadRawContentFromDisk — the raw content schema
    // field is lowercase `subjects`. The catalog index name `Subject`
    // (capital S) is only added later by formatSearchItem. Read both so
    // this works whether the filter runs on raw or brain-formatted items.
    Subject: (item) => item.subjects || item.Subject || [],
  };

  for (const condition of query) {
    const { i: index, o: operation } = condition;
    // For path criteria the value may carry a `::depth` suffix — strip it
    // for the path match (depth is applied separately, below).
    const value =
      index === 'path' ? splitPathDepth(condition.v).path : condition.v;

    if (operation.includes('selection')) {
      // Generic plone.app.querystring selection filter (see selectionFields):
      //   .all  — item has every wanted value (KeywordIndex only — a
      //           FieldIndex item has one value, so .all of 2+ matches none)
      //   .none — item has no wanted value (nav listings use this to drop
      //           Image/File from portal_type)
      //   .any  — item has at least one wanted value (default)
      const accessor = selectionFields[index];
      const wanted = Array.isArray(value) ? value : [value];
      if (!accessor) {
        console.warn(
          `[MOCK-API] @querystring-search: no selection mapping for index '${index}' — criterion ignored`,
        );
      } else if (operation.endsWith('.all')) {
        allItems = allItems.filter((item) =>
          wanted.every((w) => accessor(item).includes(w)),
        );
      } else if (operation.endsWith('.none')) {
        allItems = allItems.filter((item) =>
          !wanted.some((w) => accessor(item).includes(w)),
        );
      } else {
        allItems = allItems.filter((item) =>
          wanted.some((w) => accessor(item).includes(w)),
        );
      }
    } else if (index === 'path' && operation.includes('absolutePath')) {
      // Filter by path — strict descendants of basePath (exclude basePath
      // itself). The trailing '/' ensures `/foo` matches `/foo/bar` but
      // not `/foo` itself, and avoids `/foo` matching `/foobar`.
      const basePath = value || '/';
      if (basePath !== '/') {
        const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
        allItems = allItems.filter((item) => {
          const itemPath = new URL(item['@id']).pathname;
          return itemPath.startsWith(prefix);
        });
      }
    } else if (index === 'path' && operation.includes('relativePath')) {
      // Filter by relative path from context.
      // '.' means current context, '..' means parent, etc.
      //
      // Plone quirk: relativePath EXCLUDES the current context page
      // itself from results. So a `..` query from /a/b returns
      // /a's strict descendants minus /a/b. That's a deliberate Plone
      // navigation convention ("don't list me in my own nav"). We
      // replicate it here so cnav rendering works the same under mock
      // as under prod — including exposing the missing-intermediate-
      // parent case that hierarchicalSortByPosition has to handle.
      let relValue = value || '';
      if (relValue === '.' || relValue === '') {
        relValue = '';
      }
      const fullPath = relValue ? resolveRelativePath(contextPath, relValue) : contextPath;
      if (fullPath !== '/') {
        allItems = allItems.filter((item) => {
          const itemPath = new URL(item['@id']).pathname;
          return itemPath.startsWith(fullPath + '/');
        });
      }
      allItems = allItems.filter((item) => new URL(item['@id']).pathname !== contextPath);
    } else if (index === 'SearchableText' && operation.includes('string.contains')) {
      // Full-text search across title/description/id. Mirrors Plone 6.2's
      // plone.app.querystring 3.0.0 wildcard-prefix behavior — each word in
      // the search term must prefix-match a word token in one of those fields.
      if (value) {
        allItems = allItems.filter((item) => matchSearchableText(value, item));
      }
    } else if (index === 'exclude_from_nav' && operation.includes('boolean')) {
      // Nav listings filter out items marked exclude_from_nav: true.
      // Mirrors Plone's plone.app.querystring.operation.boolean.{isFalse,isTrue}.
      const wantTrue = operation.includes('isTrue');
      allItems = allItems.filter((item) => {
        const flag = item.exclude_from_nav === true;
        return wantTrue ? flag : !flag;
      });
      // Note: `review_state` and `Subject` selection.{any,all,none} are
      // handled generically above via `selectionFields` (which already
      // maps both indices), so we don't need explicit branches here.
    }
  }

  // Apply depth limit from the path criterion's `::depth` suffix (parsed
  // into pathDepth above). `path::1` under /docs returns /docs/foo but
  // not /docs/foo/bar; a bare path is recursive (no limit).
  if (typeof pathDepth === 'number' && depthRoot !== null) {
    const rootSegments = depthRoot.split('/').filter(Boolean).length;
    const maxSegments = rootSegments + pathDepth;
    allItems = allItems.filter((item) => {
      const itemSegments = new URL(item['@id']).pathname.split('/').filter(Boolean).length;
      return itemSegments <= maxSegments;
    });
  }

  // Sort items. Plone's `sort_order: descending` reverses the whole result
  // sequence — tied items included — so sort ascending and reverse the
  // array. Negating the comparator instead leaves ties in input order
  // (a stable sort treats -0 as 0), so descending != reverse(ascending).
  let comparator = null;
  if (sort_on === 'getObjPositionInParent') {
    // Folder order: use __metadata__.json ordering (UID→position),
    // falling back to contentDirMap key order (filesystem alphabetical).
    const allPaths = Object.keys(contentDirMap);
    comparator = (a, b) => {
      const aPos = a.UID ? uidPositionMap[a.UID] : undefined;
      const bPos = b.UID ? uidPositionMap[b.UID] : undefined;
      if (aPos !== undefined && bPos !== undefined) return aPos - bPos;
      if (aPos !== undefined) return -1; // items with ordering come first
      if (bPos !== undefined) return 1;
      // Fallback to contentDirMap key order
      const aPath = new URL(a['@id']).pathname;
      const bPath = new URL(b['@id']).pathname;
      return allPaths.indexOf(aPath) - allPaths.indexOf(bPath);
    };
  } else if (sort_on) {
    comparator = (a, b) => {
      const aVal = a[sort_on] || '';
      const bVal = b[sort_on] || '';
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    };
  }
  if (comparator) {
    allItems.sort(comparator);
    if (sort_order === 'descending') allItems.reverse();
  }

  // Apply results limit (different from b_size which is for pagination)
  if (limit && limit > 0) {
    allItems = allItems.slice(0, limit);
  }

  const itemsTotal = allItems.length;

  // Apply paging
  const pagedItems = allItems.slice(b_start, b_start + b_size);

  // Format items for response
  const items = pagedItems.map((content) => formatSearchItem(content, baseUrl));

  const searchUrl = contextPath
    ? `${baseUrl}${contextPath}/@querystring-search`
    : `${baseUrl}/@querystring-search`;

  res.json({
    '@id': searchUrl,
    items,
    items_total: itemsTotal,
    batching: {
      '@id': searchUrl,
      first: `${searchUrl}?b_start=0`,
      last: `${searchUrl}?b_start=${Math.max(0, itemsTotal - b_size)}`,
      next: b_start + b_size < itemsTotal ? `${searchUrl}?b_start=${b_start + b_size}` : null,
      prev: b_start > 0 ? `${searchUrl}?b_start=${Math.max(0, b_start - b_size)}` : null,
    },
  });
});

/**
 * GET /@search or /:path/@search
 * Search for content (used by ObjectBrowser)
 * Supports path.depth parameter to get children of a specific path
 * Supports path.query parameter to get a specific content item
 */
app.get('*/@search', (req, res) => {
  const searchPath = req.path.replace('/@search', '');
  const pathDepth = req.query['path.depth'];
  const pathQuery = req.query['path.query'];
  const searchableText = req.query['SearchableText'];
  const portalType = req.query['portal_type'];
  const baseUrl = `http://localhost:${PORT}`;

  let items;

  // Handle SearchableText (used by ObjectBrowser search input). Plone 6.2
  // (plone.app.querystring 3.0.0) appends a wildcard to each word and ANDs
  // the parts — matchSearchableText replicates that on title/description/id.
  if (searchableText) {
    items = Object.keys(contentDirMap)
      .filter((itemPath) => itemPath !== '/')
      .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl))
      .filter((item) => matchSearchableText(searchableText, item));
    // Filter by portal_type if specified
    if (portalType) {
      const types = Array.isArray(portalType) ? portalType : [portalType];
      items = items.filter((item) => types.includes(item['@type']));
    }
  }
  // Handle path.query with path.depth=0 (exact match for specific content)
  else
  if (pathQuery && pathDepth === '0') {
    const content = loadContentFromDisk(pathQuery);
    if (content) {
      items = [formatSearchItem(content, baseUrl)];
    } else {
      items = [];
    }
  } else if (pathDepth === '1') {
    // Get immediate children of the search path (used by ObjectBrowser)
    // Unlike navigation, search returns ALL content types (including Images, Files)
    const normalizedSearch = (searchPath === '' || searchPath === '/') ? '/' : searchPath;
    const searchDepth = normalizedSearch === '/' ? 0 : normalizedSearch.split('/').filter(Boolean).length;

    // Get direct children from contentDirMap (items at searchDepth + 1)
    items = Object.keys(contentDirMap)
      .filter((itemPath) => {
        if (itemPath === '/') return false;
        if (itemPath === normalizedSearch) return false;
        // Must be under the search path
        if (normalizedSearch !== '/' && !itemPath.startsWith(normalizedSearch + '/')) return false;
        // Must be exactly one level deeper
        const itemParts = itemPath.split('/').filter(Boolean);
        return itemParts.length === searchDepth + 1;
      })
      .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl));

    // For root searches, also include non-root mount points as virtual folders
    // so the object browser can navigate into them (e.g., _test_data)
    if (normalizedSearch === '/') {
      CONTENT_MOUNTS.forEach(({ mountPath }) => {
        if (mountPath === '/') return;
        const mountParts = mountPath.split('/').filter(Boolean);
        if (mountParts.length !== 1) return; // Only top-level mounts
        const mountName = mountParts[0];
        // Skip if already in contentDirMap (has its own data.json)
        if (contentDirMap[mountPath]) return;
        items.push({
          '@id': `${baseUrl}${mountPath}`,
          '@type': 'Folder',
          'id': mountName,
          'title': mountName.replace(/[_-]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()),
          'description': '',
          'review_state': 'published',
          'UID': `virtual-mount-${mountName}`,
          'is_folderish': true,
          'hasPreviewImage': false,
          'image_field': null,
          'image_scales': null,
        });
      });
    }

    // For non-root paths not in contentDirMap (e.g. mount points like /_test_data),
    // check if any content exists under this path and list children
    if (items.length === 0 && normalizedSearch !== '/' && !contentDirMap[normalizedSearch]) {
      const hasChildren = Object.keys(contentDirMap).some(p => p.startsWith(normalizedSearch + '/'));
      if (hasChildren) {
        items = Object.keys(contentDirMap)
          .filter((itemPath) => {
            if (itemPath === normalizedSearch) return false;
            if (!itemPath.startsWith(normalizedSearch + '/')) return false;
            const itemParts = itemPath.split('/').filter(Boolean);
            return itemParts.length === searchDepth + 1;
          })
          .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl));
      }
    }
  } else {
    // No depth filter - return all content items from disk.
    // Rescan so newly-added fixture directories surface without a server
    // restart — same "rescan on miss" pattern as resolveUidUrls() above.
    initContentDirMap();
    items = Object.keys(contentDirMap)
      .filter((itemPath) => itemPath !== '/')
      .map((itemPath) => loadContentFromDisk(itemPath))
      .filter((content) => content != null)  // skip dirs with no parseable data.json
      .map((content) => formatSearchItem(content, baseUrl));
  }

  const searchUrl = searchPath === '' || searchPath === '/'
    ? 'http://localhost:8888/@search'
    : `http://localhost:8888${searchPath}/@search`;

  res.json({
    '@id': searchUrl,
    'items': items,
    'items_total': items.length,
    'batching': {
      '@id': searchUrl,
      'first': `${searchUrl}?b_start=0`,
      'last': `${searchUrl}?b_start=0`,
      'next': null,
      'prev': null,
    },
  });
});

/**
 * GET /:path/@contents or /@contents
 * Get folder contents for content browsing
 * Returns items at the parent folder level (siblings of current content)
 */
app.get('*/@contents', (req, res) => {
  const contentPath = req.path.replace('/@contents', '') || '/';

  // Helper to format content item for response
  const formatItem = (itemPath) => {
    const content = loadContentFromDisk(itemPath);
    if (!content) return null;
    return {
      '@id': content['@id'],
      '@type': content['@type'],
      'id': content.id,
      'title': content.title,
      'description': content.description || '',
      'review_state': content.review_state || 'published',
      'UID': content.UID,
      'is_folderish': content.is_folderish !== undefined ? content.is_folderish : true,
    };
  };

  // For Documents, we return siblings (contents of parent folder)
  // For the site root, we return all root-level items
  let items;

  if (contentPath === '' || contentPath === '/') {
    // Root level - return all root-level items
    items = Object.keys(contentDirMap)
      .filter((itemPath) => {
        if (itemPath === '/') return false;
        const pathParts = itemPath.split('/').filter(p => p);
        return pathParts.length === 1;
      })
      .map(formatItem)
      .filter(Boolean);
  } else {
    // Get parent folder's contents (siblings of this content)
    const pathParts = contentPath.split('/').filter(p => p);
    const parentPath = pathParts.length > 1
      ? '/' + pathParts.slice(0, -1).join('/')
      : '/';

    items = Object.keys(contentDirMap)
      .filter((itemPath) => {
        if (itemPath === '/') return false;
        const itemParts = itemPath.split('/').filter(p => p);
        // Same depth as current content and same parent
        if (parentPath === '/') {
          return itemParts.length === 1;
        } else {
          return itemPath.startsWith(parentPath + '/') &&
                 itemParts.length === pathParts.length;
        }
      })
      .map(formatItem)
      .filter(Boolean);
  }

  res.json({
    '@id': `http://localhost:8888${contentPath}/@contents`,
    'items': items,
    'items_total': items.length,
  });
});

/**
 * POST /:path/@submit-form
 * Form submission endpoint (collective.volto.formsupport)
 * Accepts { block_id, data: [{ field_id, label, value }] }
 */
app.post('*/@submit-form', (req, res) => {
  if (process.env.DEBUG) {
    console.log(`POST @submit-form: path=${req.path}`);
  }
  res.status(204).end();
});

/**
 * POST /:path/@lock
 * Lock content for editing
 */
app.post('*/@lock', (req, res) => {
  res.json({
    locked: true,
    stealable: true,
    creator: 'admin',
    time: new Date().toISOString(),
    timeout: 600
  });
});

/**
 * DELETE /:path/@lock
 * Unlock content after editing
 */
app.delete('*/@lock', (req, res) => {
  res.json({ locked: false });
});

/**
 * GET /resolveuid/:uid
 * Resolve a UID to content - used by distribution content that references
 * other content via resolveuid/UID links
 */
app.get('*/resolveuid/:uid', (req, res) => {
  const uid = req.params.uid;
  const contentPath = uidToPathMap[uid];
  if (contentPath) {
    const content = getContent(contentPath, getSessionId(req));
    if (content) return res.json(content);
  }
  res.status(404).json({
    error: { type: 'NotFound', message: `UID not found: ${uid}` }
  });
});

/**
 * GET *\/@@images/*
 * Serve images for Plone image scales
 * URLs like: /test-image-1/@@images/image/preview
 * Serves actual image files from content directories if they exist,
 * otherwise falls back to placeholder SVGs.
 */
function findFirstImageFile(rootDir, maxDepth) {
  const imageExts = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && imageExts.has(path.extname(entry.name).toLowerCase())) {
        return full;
      }
      if (entry.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return null;
}

app.get('*/@@images/*', (req, res) => {
  // Extract content path and field name from URL. Serves the same image
  // file regardless of scale — the mock doesn't generate actual scales.
  // e.g., /images/test-image-1/@@images/image/preview
  // e.g., /block/grid-block/@@images/preview_image/large
  // e.g., /concepts/custom-blocks/@@images/image-800-1c983515.svg (listing expansion scale URL)
  // Match field name which may include hash suffix: image-800-1c983515.svg
  const pathMatch = req.path.match(/^(.+?)\/@@images\/([a-z_]+(?:-[\w.-]+)?)/i);
  const contentPath = pathMatch ? pathMatch[1] : '';
  // Strip hash suffix from field name (e.g., 'image-800-1c983515.svg' → 'image')
  const rawField = pathMatch ? pathMatch[2] : 'image';
  const fieldName = rawField.replace(/-\d+.*$/, '');
  const scale = pathMatch && pathMatch[3] ? pathMatch[3] : 'preview';

  // Try to serve actual image file from content directory
  // Use contentDirMap to find actual directory for nested paths
  // If not found, rescan in case content was added after startup
  let dirInfo = contentDirMap[contentPath];
  if (!dirInfo) {
    initContentDirMap();
    dirInfo = contentDirMap[contentPath];
  }
  const imageDir = dirInfo ? path.join(dirInfo.dirPath, fieldName) : null;

  const mimeTypes = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const isImageExt = (ext) => ext in mimeTypes;
  const serveFile = (imageFile) => {
    const ext = path.extname(imageFile).toLowerCase();
    res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.sendFile(imageFile);
  };

  // Distribution lead/preview image may reference ANOTHER content item's blob
  // via blob_path (e.g. a case study whose lead image points at /images/msc.png).
  // Resolve the blob_path through contentDirMap and serve the exact bytes, so
  // <item>/@@images/<field> works even when the bytes live under another item.
  if (dirInfo) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dirInfo.dirPath, 'data.json'), 'utf-8'));
      const bp = data[fieldName] && data[fieldName].blob_path;
      const sep = `/${fieldName}/`;
      const idx = bp ? bp.indexOf(sep) : -1;
      if (idx > 0) {
        const itemRel = bp.slice(0, idx);   // e.g. images/msc.png
        const within = bp.slice(idx + 1);   // e.g. image/<file>.png
        const tgt = contentDirMap['/' + itemRel];
        const blobFile = tgt ? path.join(tgt.dirPath, within) : null;
        if (blobFile && fs.existsSync(blobFile)) { serveFile(blobFile); return; }
      }
    } catch (e) { /* fall through to dir scan */ }
  }

  if (imageDir && fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    if (files.length > 0) {
      serveFile(path.join(imageDir, files[0]));
      return;
    }
  }

  // Fallback for distribution-style content where preview_image is set via
  // blob_path. The actual bytes live in a nested image content item under
  // the data dir, e.g. <content>/<screenshot>.png/image/<file>.png.
  // Walk the dir tree and serve the first image file found (depth-limited).
  if (dirInfo && fs.existsSync(dirInfo.dirPath)) {
    const found = findFirstImageFile(dirInfo.dirPath, 3);
    if (found) {
      serveFile(found);
      return;
    }
  }

  res.status(404).json({
    error: { type: 'NotFound', message: `Image not found: ${req.path}` }
  });
});

// @@download — same as @@images, serves image files from content directories
app.get('*/@@download/*', (req, res) => {
  // e.g., /images/quadrant/@@download/image/quadrant.svg -> contentPath=/images/quadrant, fieldName=image
  const pathMatch = req.path.match(/^(.+?)\/@@download\/(\w+)(?:\/.*)?$/);
  const contentPath = pathMatch ? pathMatch[1] : '';
  const fieldName = pathMatch ? pathMatch[2] : 'image';

  const dirInfo = contentDirMap[contentPath];
  const imageDir = dirInfo ? path.join(dirInfo.dirPath, fieldName) : null;

  if (imageDir && fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    if (files.length > 0) {
      const imageFile = path.join(imageDir, files[0]);
      const ext = path.extname(files[0]).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.sendFile(imageFile);
      return;
    }
  }

  res.status(404).json({
    error: { type: 'NotFound', message: `Download not found: ${req.path}` }
  });
});

/**
 * GET /<content-path-that-is-an-Image>
 *
 * Plone's Zope-traversal layer serves Image content items' blob bytes
 * directly at their plain content path (no /@@images/image suffix, no
 * ++api++ prefix, Accept != application/json). Frontend <img src> URLs
 * rely on this so image refs like `/company/about-us/screenshot.png`
 * resolve against the backend. The @@images handler above covers
 * explicit scale paths; this covers the implicit default-view case.
 */
app.get('*', (req, res, next) => {
  if (req.isApiRequest) return next();

  const dirInfo = contentDirMap[req.path];
  if (!dirInfo) return next();

  const dataFile = path.join(dirInfo.dirPath, 'data.json');
  if (!fs.existsSync(dataFile)) return next();

  let item;
  try { item = JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
  catch { return next(); }
  if (item['@type'] !== 'Image') return next();

  // Image items store the blob in an `image/` subdirectory (same shape as
  // the @@images handler reads from). Serve whatever file is in there.
  const imageDir = path.join(dirInfo.dirPath, 'image');
  if (!fs.existsSync(imageDir)) return next();
  const files = fs.readdirSync(imageDir);
  if (files.length === 0) return next();

  const imageFile = path.join(imageDir, files[0]);
  const ext = path.extname(files[0]).toLowerCase();
  const mimeTypes = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.sendFile(imageFile);
});

/**
 * GET /:path
 * Get content by path (API requests only)
 * Frontend requests fall through to static file serving
 */
app.get('*', (req, res, next) => {
  // Only handle API requests (with ++api++ prefix)
  // Frontend requests should be handled by static file middleware
  if (!req.isApiRequest) {
    return next();
  }

  const urlPath = req.path;
  // Normalize: remove ++api++ prefix and strip trailing slash (except root)
  const cleanPath = (urlPath.replace('/++api++', '') || '/').replace(/\/+$/, '') || '/';
  const sessionId = getSessionId(req);

  // Debug logging for template/page requests
  if (cleanPath.includes('template') || cleanPath.includes('test-page')) {
    const fs = require('fs');
    const hasInSession = sessionId && sessionContent[sessionId]?.[cleanPath];
    let contentPreview = '';
    if (hasInSession) {
      // Log content to verify edited value is present
      const sessionData = sessionContent[sessionId][cleanPath];
      const blockIds = sessionData?.blocks_layout?.items || Object.keys(sessionData?.blocks || {});
      const firstBlockId = blockIds[0];
      if (firstBlockId && sessionData?.blocks?.[firstBlockId]) {
        const val = JSON.stringify(sessionData.blocks[firstBlockId].value || '');
        contentPreview = ` firstBlock: ${val.substring(0, 150)}`;
      }
    }
    const logMsg = `[GET] ${cleanPath} sessionId: ${sessionId} inSession: ${!!hasInSession}${contentPreview}\n`;
    fs.appendFileSync('/tmp/mock-api-get.log', logMsg);
    console.log(logMsg);
  }

  // Reload content from disk to pick up changes during development.
  // Pass ?expand= so @components matches what the client requested
  // (real Plone behaviour: stub by default, expand only what's listed).
  const content = getContent(cleanPath, sessionId, parseExpand(req));

  if (content) {
    // Filter actions based on authentication
    const authenticated = isAuthenticated(req);
    const filteredContent = filterActionsForAuth(content, authenticated);

    if (process.env.DEBUG) {
      console.log(`[DEBUG] Serving API content for ${cleanPath} (auth: ${authenticated})${sessionId ? ` (session: ${sessionId})` : ''}`);
      console.log(`[DEBUG] Query params:`, req.query);
      console.log(`[DEBUG] Response preview:`, JSON.stringify(filteredContent).substring(0, 500));
    }
    res.json(filteredContent);
  } else {
    // plone.app.redirector: moved content 302s (GET) to the new path, keeping
    // the ++api++ namespace. The frontend (ploneApi) upgrades this to a 301.
    const redirectTo = getRedirectTarget(cleanPath);
    if (redirectTo) {
      res.redirect(302, `http://localhost:${PORT}/++api++${redirectTo}`);
      return;
    }
    res.status(404).json({
      error: {
        type: 'NotFound',
        message: `Content not found: ${cleanPath}`,
      },
    });
  }
});

/**
 * Standard Plone fields that are "registered" in this mock world — common
 * dexterity/behavior fields a content type may legitimately expose. Used to
 * decide which top-level fields survive a PATCH (see dropUnregisteredFields).
 * Deliberately does NOT include `footer_blocks` / `header_blocks`: layout
 * regions now live as sub-keys of `blocks_layout`, not as separate fields.
 */
const STANDARD_REGISTERED_FIELDS = new Set([
  'title', 'description', 'blocks', 'blocks_layout', 'id', 'UID',
  'review_state', 'created', 'modified', 'effective', 'expires',
  'subjects', 'language', 'rights', 'relatedItems', 'preview_image',
  'exclude_from_nav', 'allow_discussion', 'layout', 'text',
  'contact_email', 'contact_name', 'contact_phone', 'event_url',
  'start', 'end', 'open_end', 'whole_day', 'location', 'image',
]);

/**
 * Mirror Plone's deserializer: keep only top-level keys that are registered
 * fields. A key survives if it is metadata (`@`-prefixed), already present on
 * the stored object (so it's clearly a real field of this type), or in the
 * standard registered set. Everything else is dropped, the same way a real
 * Plone backend ignores values for fields that don't exist on the schema.
 */
function dropUnregisteredFields(body, baseline) {
  const out = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (
      key.startsWith('@') ||
      (baseline && Object.prototype.hasOwnProperty.call(baseline, key)) ||
      STANDARD_REGISTERED_FIELDS.has(key)
    ) {
      out[key] = value;
    } else {
      console.log(`[PATCH] dropping unregistered field: ${key}`);
    }
  }
  return out;
}

/**
 * PATCH /:path
 * Update content - persists to session storage for authenticated requests.
 * Default session ('_default') does NOT persist to ensure test isolation for
 * unauthenticated requests.
 */
app.patch('*', (req, res) => {
  const urlPath = req.path;
  const cleanPath = urlPath.replace('/++api++', '');
  const sessionId = getSessionId(req);

  const fs = require('fs');
  const logMsg = `[PATCH] ${cleanPath} sessionId: ${sessionId}\n`;
  fs.appendFileSync('/tmp/mock-api-patch.log', logMsg);
  console.log(logMsg);

  // Reload content from disk to pick up changes during development
  const content = getContent(cleanPath, sessionId);

  if (content) {
    // Emulate Plone's REST deserializer: only fields backed by a registered
    // dexterity field / behavior survive a save. Unknown top-level fields (e.g.
    // an ad-hoc `footer_blocks`) are silently dropped. This is WHY layout
    // regions must live as sub-keys of the registered `blocks_layout` dict —
    // they ride along inside a registered field and persist, whereas a separate
    // top-level region field would be discarded here.
    const registeredBody = dropUnregisteredFields(req.body, content);
    const mergedContent = { ...content, ...registeredBody };

    // Persist to session storage for test verification when session is provided
    // Default session doesn't persist to maintain backward compatibility
    if (sessionId && sessionId !== '_default') {
      console.log(`[PATCH] Persisting to session: ${sessionId} path: ${cleanPath}`);
      setSessionContent(sessionId, cleanPath, mergedContent);
      // Verify it was saved
      const fs = require('fs');
      const verifyInSession = sessionContent[sessionId]?.[cleanPath] ? 'YES' : 'NO';
      const verifyMsg = `[PATCH VERIFY] ${cleanPath} in session: ${verifyInSession}\n`;
      fs.appendFileSync('/tmp/mock-api-patch.log', verifyMsg);
    } else {
      console.log(`[PATCH] NOT persisting (no session or default)`);
    }

    res.json(mergedContent);
  } else {
    res.status(404).json({
      error: {
        type: 'NotFound',
        message: `Content not found: ${cleanPath}`,
      },
    });
  }
});

// Start server only when run directly (not when require()'d)
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`Mock Plone API server running on http://localhost:${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/health`);
    console.log(`Content endpoints available:`);
    Object.keys(contentDirMap).forEach((urlPath) => {
      console.log(`  - http://localhost:${PORT}${urlPath}`);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export for use by test frontend server or test harnesses
module.exports = { app, server, contentDirMap, CONTENT_MOUNTS };