/**
 * Mock Plone REST API server for testing Volto admin UI.
 * Implements minimal endpoints required for content editing.
 *
 * Run directly: node mock-api-server.js
 * Or started automatically by Playwright config webServer
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

// Session-based transient content storage for uploads
// Uploads are stored per-session so they don't appear for other users
// Format: { sessionId: { '/path': content, ... } }
const sessionContent = {};

// Map URL paths to source directories (for loading content from disk)
const contentDirMap = {};

// Map UIDs to URL paths (for resolveuid endpoint)
const uidToPathMap = {};

/**
 * Get session ID from request header.
 * Uses auth token as session identifier - each test login generates a unique
 * token (based on timestamp), providing session isolation between tests.
 * Both admin (Volto) and Nuxt SSR include Authorization headers, so they
 * share the same session when using the same auth token.
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

  // Handle simple ++api++ prefix: /++api++/@site -> /@site
  cleanPath = cleanPath.replace(/^\/\+\+api\+\+/, '');

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
      'download': `@@images/image-800-${hash}.svg`,
      'filename': 'placeholder.svg',
      'height': 600,
      'width': 800,
      'scales': {
        'preview': {
          'download': `@@images/image/preview`,
          'height': 300,
          'width': 400,
        },
        'mini': {
          'download': `@@images/image/mini`,
          'height': 150,
          'width': 200,
        },
        'thumb': {
          'download': `@@images/image/thumb`,
          'height': 96,
          'width': 128,
        },
      },
    }],
  };
}

/**
 * Format a content item for search results
 * Includes image_field and image_scales matching real Plone API structure
 * Includes is_folderish for folder navigation in object browser
 * Includes hasPreviewImage for teaser blocks to show target's preview image
 */
function formatSearchItem(content, baseUrl) {
  // Check if content has a preview image (common for Documents, News Items, etc.)
  const hasPreviewImage = !!(content.preview_image || content['@type'] === 'Image');

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
    // Match real Plone API: image_field and image_scales for all items
    'image_field': 'image',
    'image_scales': getPlaceholderImageScales(content.title),
  };

  // For Image content types, use actual image data if available
  if (content['@type'] === 'Image') {
    const scales = getImageScales(content, baseUrl);
    if (scales) {
      item.image_scales = scales;
    }
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
function loadContentFromDisk(urlPath) {
  const baseUrl = `http://localhost:${PORT}`;
  const content = loadRawContentFromDisk(urlPath);
  if (!content) return null;

  return enrichContent(content, urlPath, baseUrl);
}

/**
 * Format raw content for navigation (avoids enrichment to prevent circular calls)
 */
function formatNavItem(rawContent, urlPath, baseUrl) {
  const hasPreviewImage = !!(rawContent.preview_image || rawContent['@type'] === 'Image');
  const children = (rawContent.is_folderish !== false)
    ? getNavigationItems(urlPath, 1)
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
function getNavigationItems(basePath = '/', depth = 1) {
  const baseUrl = `http://localhost:${PORT}`;
  const normalizedBase = basePath.replace(/\/$/, '') || '/';
  const baseDepth = normalizedBase === '/' ? 0 : normalizedBase.split('/').filter(p => p).length;

  return Object.keys(contentDirMap)
    .filter((itemPath) => {
      if (itemPath === '/') return false;
      if (itemPath === normalizedBase) return false; // Exclude the base itself

      // Check if item is under the base path
      if (normalizedBase !== '/' && !itemPath.startsWith(normalizedBase + '/')) {
        return false;
      }

      // Check depth - items should be at baseDepth + 1 level
      const itemParts = itemPath.split('/').filter(p => p);
      return itemParts.length === baseDepth + 1;
    })
    .map((itemPath) => {
      const rawContent = loadRawContentFromDisk(itemPath);
      if (rawContent.exclude_from_nav) return null;
      if (rawContent['@type'] === 'Image' || rawContent['@type'] === 'File') return null;
      return formatNavItem(rawContent, itemPath, baseUrl);
    })
    .filter(Boolean);
}

/**
 * Get root-level navigation items.
 * Merges items from all content mounts so test content (/_test_data/*)
 * appears alongside docs content in the navigation.
 */
function getRootNavigationItems() {
  const items = [];
  for (const { mountPath } of CONTENT_MOUNTS) {
    items.push(...getNavigationItems(mountPath, 1));
  }
  return items;
}

/**
 * Generate @components for a content item (breadcrumbs, navigation, workflow, actions)
 */
function generateComponents(urlPath, baseUrl) {
  // Remove trailing slash for URL construction
  const cleanPath = urlPath.replace(/\/$/, '') || '/';
  const fullUrl = cleanPath === '/' ? baseUrl : `${baseUrl}${cleanPath}`;
  const pathParts = urlPath.split('/').filter(Boolean);

  // Build breadcrumb items (use raw content to avoid circular calls)
  const breadcrumbItems = [{ '@id': baseUrl, 'title': 'Home' }];
  let currentPath = '';
  for (const part of pathParts) {
    currentPath += '/' + part;
    const partContent = loadRawContentFromDisk(currentPath);
    breadcrumbItems.push({
      '@id': baseUrl + currentPath,
      'title': partContent?.title || part
    });
  }

  return {
    'actions': {
      '@id': `${fullUrl}/@actions`,
      'document_actions': [],
      'object': [
        { 'id': 'view', 'title': 'View' },
        { 'id': 'edit', 'title': 'Edit' },
        { 'id': 'folderContents', 'title': 'Contents' }
      ],
      'object_buttons': [],
      'portal_tabs': [],
      'site_actions': [],
      'user': []
    },
    'breadcrumbs': {
      '@id': `${fullUrl}/@breadcrumbs`,
      'items': breadcrumbItems,
      'root': baseUrl
    },
    'navigation': {
      '@id': `${fullUrl}/@navigation`,
      // Always rooted at site root — top-level items with nested children
      'items': getRootNavigationItems()
    },
    'workflow': {
      '@id': `${fullUrl}/@workflow`
    }
  };
}

/**
 * Resolve resolveuid/UID references in content to actual paths.
 * Like Plone's serializer, converts resolveuid/UID strings to full URLs.
 * All string values are resolved, including templateId/templateInstanceId —
 * these are real Plone paths that the serializer resolves.
 */
function resolveUidUrls(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/(?:\.\.\/)*resolveuid\/([a-z0-9][-a-z0-9]*)/g, (match, uid) => {
      const resolvedPath = uidToPathMap[uid];
      if (!resolvedPath) return match;
      return `http://localhost:${PORT}${resolvedPath}`;
    });
  }
  if (Array.isArray(obj)) return obj.map(item => resolveUidUrls(item));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveUidUrls(value);
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
 * Enrich content with generated fields (@id, @components, permissions, etc.)
 * Content files use distribution format with relative @id paths.
 */
function enrichContent(content, urlPath, baseUrl) {
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

  const enriched = {
    ...transformed,
    '@id': fullUrl,
    'UID': transformed.UID || `${transformed.id || urlPath.replace(/\//g, '-')}-uid`,
    'review_state': transformed.review_state || 'published',
    'is_folderish': transformed.is_folderish !== undefined ? transformed.is_folderish : true,
    'allow_discussion': transformed.allow_discussion !== undefined ? transformed.allow_discussion : false,
    'exclude_from_nav': transformed.exclude_from_nav || false,
    'created': transformed.created || '2025-01-01T12:00:00+00:00',
    'modified': transformed.modified || '2025-01-01T12:00:00+00:00',
    'lock': transformed.lock || { 'locked': false, 'stealable': true },
    'parent': parent,
    '@components': generateComponents(urlPath, baseUrl),
    // Permissions - always grant for mock API
    'can_manage_portlets': true,
    'can_view': true,
    'can_edit': true,
    'can_delete': true,
    'can_add': true,
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

        // Apply mount prefix
        const urlPath = mountPath === '/' ? contentPath : mountPath + contentPath;

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
    scanContentDir(dirPath, mountPath);
  });
  console.log(`Registered ${Object.keys(contentDirMap).length} content paths`);
}

// Initialize on startup
initContentDirMap();

/**
 * Get content for a path
 * Checks: session uploads -> disk content -> generated site root
 * @param {string} urlPath - Content path
 * @param {string} sessionId - Session ID for session-specific uploads
 */
function getContent(urlPath, sessionId) {
  // Check session-specific storage first (for uploads created in this session)
  if (sessionId && sessionContent[sessionId]?.[urlPath]) {
    return sessionContent[sessionId][urlPath];
  }

  // Try disk first (distribution content may have a site root)
  const diskContent = loadContentFromDisk(urlPath);
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
  // Skip special endpoints (already handled above)
  if (req.path.startsWith('/@')) {
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
 * GET /@querystring
 * Get querystring schema (available indexes, operators, sortable indexes)
 * Used by QuerystringWidget to populate criteria and sort dropdowns
 */
app.get('/@querystring', (req, res) => {
  res.json({
    '@id': 'http://localhost:8888/@querystring',
    'indexes': {
      'portal_type': {
        'title': 'Type',
        'description': 'Content type',
        'group': 'Metadata',
        'enabled': true,
        'sortable': false,
        'operations': [
          'plone.app.querystring.operation.selection.any',
          'plone.app.querystring.operation.selection.all',
          'plone.app.querystring.operation.selection.none',
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'description': 'Matches any of the selected values',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.any',
          },
          'plone.app.querystring.operation.selection.all': {
            'title': 'Matches all of',
            'description': 'Matches all of the selected values',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.all',
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
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'widget': 'MultipleSelectionWidget',
            'operation': 'plone.app.querystring.operation.selection.any',
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
        ],
        'operators': {
          'plone.app.querystring.operation.selection.any': {
            'title': 'Matches any of',
            'widget': 'autocomplete',
            'operation': 'plone.app.querystring.operation.selection.any',
          },
        },
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
  });
});

/**
 * GET /@workflow
 * Get workflow information for site root
 */
app.get('/@workflow', (req, res) => {
  res.json({
    '@id': 'http://localhost:8888/@workflow',
    history: [],
    transitions: [],
  });
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

  if (fs.existsSync(schemaPath)) {
    return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } else {
    // Return default Document schema
    return {
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
}

app.get('/@types/:typeName', (req, res) => {
  const { typeName } = req.params;
  res.json(getTypeSchema(typeName));
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
  const fullPath = req.path.replace('/@breadcrumbs', '');
  const parts = fullPath.split('/').filter((p) => p);
  const items = [{ '@id': 'http://localhost:8888/', title: 'Home' }];

  let currentPath = '';
  parts.forEach((part) => {
    currentPath += '/' + part;
    items.push({
      '@id': `http://localhost:8888${currentPath}`,
      title: part.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    });
  });

  res.json({
    '@id': `http://localhost:8888${req.path}`,
    items,
  });
});

/**
 * GET /:path/@actions
 * Get available actions for content (Edit, View, etc.)
 * Use regex to ensure matching with ++api++ prefix
 */
app.get(/.*\/@actions$/, (req, res) => {
  // Handle ++api++ prefix
  const cleanPath = req.path.replace('/++api++', '').replace('/@actions', '') || '/';
  const baseUrl = 'http://localhost:8888';
  res.json({
    '@id': `${baseUrl}${cleanPath}/@actions`,
    object: [
      {
        '@id': `${baseUrl}${cleanPath}`,
        icon: '',
        id: 'view',
        title: 'View',
      },
      {
        '@id': `${baseUrl}${cleanPath}/edit`,
        icon: '',
        id: 'edit',
        title: 'Edit',
      },
    ],
    object_buttons: [],
    user: [],
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
  for (const condition of query) {
    const { i: index, o: operation, v: value } = condition;

    if (index === 'portal_type' && operation.includes('selection')) {
      // Filter by content type
      const types = Array.isArray(value) ? value : [value];
      allItems = allItems.filter((item) => types.includes(item['@type']));
    } else if (index === 'path' && operation.includes('absolutePath')) {
      // Filter by path - items under the specified path
      const basePath = value || '/';
      if (basePath !== '/') {
        allItems = allItems.filter((item) => item['@id'].startsWith(basePath));
      }
    } else if (index === 'path' && operation.includes('relativePath')) {
      // Filter by relative path from context
      const fullPath = contextPath + (value || '');
      if (fullPath !== '/') {
        allItems = allItems.filter((item) => item['@id'].startsWith(fullPath));
      }
    } else if (index === 'SearchableText' && operation.includes('string.contains')) {
      // Full-text search - search in title, description, and text content
      const searchTerm = (value || '').toLowerCase();
      if (searchTerm) {
        allItems = allItems.filter((item) => {
          const title = (item.title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          const id = (item.id || '').toLowerCase();
          return title.includes(searchTerm) || description.includes(searchTerm) || id.includes(searchTerm);
        });
      }
    } else if (index === 'review_state' && operation.includes('selection')) {
      // Filter by review state
      const states = Array.isArray(value) ? value : [value];
      allItems = allItems.filter((item) => states.includes(item.review_state || 'published'));
    }
  }

  // Sort items
  if (sort_on) {
    allItems.sort((a, b) => {
      const aVal = a[sort_on] || '';
      const bVal = b[sort_on] || '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort_order === 'descending' ? -cmp : cmp;
    });
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

  // Handle SearchableText (used by ObjectBrowser search input)
  if (searchableText) {
    const searchTerm = searchableText.replace(/\*$/, '').toLowerCase();
    items = Object.keys(contentDirMap)
      .filter((itemPath) => itemPath !== '/')
      .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl))
      .filter((item) => {
        const title = (item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        return title.includes(searchTerm) || description.includes(searchTerm);
      });
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
    // No depth filter - return all content items from disk
    items = Object.keys(contentDirMap)
      .filter((itemPath) => itemPath !== '/')
      .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl));
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
app.get('*/@@images/*', (req, res) => {
  // Extract content path, field name, and scale from URL
  // e.g., /images/test-image-1/@@images/image/preview -> contentPath=/images/test-image-1, fieldName=image, scale=preview
  // e.g., /block/grid-block/@@images/preview_image/large -> fieldName=preview_image, scale=large
  const pathMatch = req.path.match(/^(.+?)\/@@images\/(\w+)(?:\/(\w+))?$/);
  const contentPath = pathMatch ? pathMatch[1] : '';
  const fieldName = pathMatch ? pathMatch[2] : 'image';
  const scale = pathMatch && pathMatch[3] ? pathMatch[3] : 'preview';

  // Try to serve actual image file from content directory
  // Use contentDirMap to find actual directory for nested paths
  const dirInfo = contentDirMap[contentPath];
  const imageDir = dirInfo ? path.join(dirInfo.dirPath, fieldName) : null;

  if (imageDir && fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    if (files.length > 0) {
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
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.set('Content-Type', contentType);
      res.sendFile(imageFile);
      return;
    }
  }

  // Fall back to placeholder SVG
  const scaleDimensions = {
    icon: { width: 32, height: 32 },
    tile: { width: 64, height: 64 },
    thumb: { width: 128, height: 128 },
    mini: { width: 200, height: 200 },
    preview: { width: 400, height: 400 },
    teaser: { width: 600, height: 600 },
    large: { width: 800, height: 800 },
    great: { width: 1200, height: 1200 },
    huge: { width: 1600, height: 1600 },
  };

  const { width, height } = scaleDimensions[scale] || scaleDimensions.preview;

  // Generate a simple SVG placeholder image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e0e0e0"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#666"
          text-anchor="middle" dominant-baseline="middle">${width}×${height}</text>
  </svg>`;

  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
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
  const cleanPath = urlPath.replace('/++api++', '');
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

  // Reload content from disk to pick up changes during development
  const content = getContent(cleanPath, sessionId);

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
    res.status(404).json({
      error: {
        type: 'NotFound',
        message: `Content not found: ${cleanPath}`,
      },
    });
  }
});

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
    const mergedContent = { ...content, ...req.body };

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

// Serve the real hydra.js from packages/hydra-js
app.get('/hydra.js', (req, res) => {
  const hydraJsPath = path.join(__dirname, '../../packages/hydra-js/hydra.js');
  res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Cache-busting headers to force reload during development
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(hydraJsPath);
});

// Serve shared block schemas (used by test frontend via import)
app.get('/shared-block-schemas.js', (req, res) => {
  const filePath = path.join(__dirname, 'shared-block-schemas.js');
  res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  res.sendFile(filePath);
});

// Serve static files from content directories (for images, etc.)
// This allows content like /pretagov/images/client-1.png to be served directly
const STATIC_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.pdf'];
app.get('*', (req, res, next) => {
  // Skip API requests and requests without file extensions
  if (req.isApiRequest) return next();

  const ext = path.extname(req.path).toLowerCase();
  if (!STATIC_FILE_EXTENSIONS.includes(ext)) return next();

  // Find content mount that matches this path
  for (const { mountPath, dirPath } of CONTENT_MOUNTS) {
    if (req.path.startsWith(mountPath)) {
      const relativePath = req.path.slice(mountPath.length);
      const filePath = path.join(dirPath, relativePath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const mimeTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.ico': 'image/x-icon',
          '.pdf': 'application/pdf',
        };
        res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.sendFile(filePath);
        return;
      }
    }
  }
  next();
});

// Serve frontend files (after all API routes)
const FRONTEND_DIR = path.join(__dirname, 'test-frontend');
app.use(express.static(FRONTEND_DIR, {
  setHeaders: (res) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  }
}));

// Fallback to index.html for any non-API routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Mock Plone API server running on http://localhost:${PORT}`);
  console.log(`Mock frontend server also running on http://localhost:${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Content endpoints available:`);
  console.log(`  - http://localhost:${PORT}/`);
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

// Export the HTTP server instance (not the Express app) for proper teardown
module.exports = server;
