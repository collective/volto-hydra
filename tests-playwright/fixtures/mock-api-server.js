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
    return [{ mountPath: '/', dirPath: path.join(__dirname, 'content') }];
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

/**
 * Get session ID from request header
 * @param {Object} req - Express request
 * @returns {string} Session ID (defaults to '_default' if not provided)
 */
function getSessionId(req) {
  return req.headers['x-test-session'] || '_default';
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

  // Check if this is an API request (contains ++api++ prefix)
  req.isApiRequest = cleanPath.includes('++api++');

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
        download: `${baseUrl}${contentPath}/@@images/image`,
        width: width,
        height: height,
        scales: {
          preview: {
            download: `${baseUrl}${contentPath}/@@images/image/preview`,
            width: Math.min(width, 400),
            height: Math.min(height, 400),
          },
          large: {
            download: `${baseUrl}${contentPath}/@@images/image/large`,
            width: Math.min(width, 800),
            height: Math.min(height, 800),
          },
        },
      }
    ]
  };
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
  const dirInfo = contentDirMap[urlPath];
  if (!dirInfo) return null;

  const dataPath = path.join(dirInfo.dirPath, 'data.json');
  if (!fs.existsSync(dataPath)) return null;

  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
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
    'items': [],
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
      return formatNavItem(rawContent, itemPath, baseUrl);
    });
}

/**
 * Get root-level navigation items (wrapper for @search endpoint)
 */
function getRootNavigationItems() {
  return getNavigationItems('/', 1);
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
      // Determine navigation root:
      // - If current path has children (is a folder with content), show its children
      // - Otherwise show siblings (items at same level)
      'items': (() => {
        const hasChildren = Object.keys(contentDirMap).some(p =>
          p !== cleanPath && p.startsWith(cleanPath + '/'));
        if (hasChildren) {
          return getNavigationItems(cleanPath, 1);
        }
        // Show siblings - items under parent path
        const parentPath = pathParts.length > 1
          ? '/' + pathParts.slice(0, -1).join('/')
          : '/';
        return getNavigationItems(parentPath, 1);
      })()
    },
    'workflow': {
      '@id': `${fullUrl}/@workflow`
    }
  };
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

  return {
    ...content,
    '@id': fullUrl,
    'UID': content.UID || `${content.id || urlPath.replace(/\//g, '-')}-uid`,
    'review_state': content.review_state || 'published',
    'is_folderish': content.is_folderish !== undefined ? content.is_folderish : true,
    'allow_discussion': content.allow_discussion !== undefined ? content.allow_discussion : false,
    'exclude_from_nav': content.exclude_from_nav || false,
    'created': content.created || '2025-01-01T12:00:00+00:00',
    'modified': content.modified || '2025-01-01T12:00:00+00:00',
    'lock': content.lock || { 'locked': false, 'stealable': true },
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
}

/**
 * Scan content directory and populate contentDirMap
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

        // Apply mount prefix
        const urlPath = mountPath === '/' ? contentPath : mountPath + contentPath;

        // Only store the directory mapping, content loaded on-demand
        contentDirMap[urlPath] = { dirPath: fullDirPath, dirName: dir.name };
        console.log(`Registered content: ${urlPath}`);
      }
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
 * Checks: session uploads -> site root -> disk content
 * @param {string} urlPath - Content path
 * @param {string} sessionId - Session ID for session-specific uploads
 */
function getContent(urlPath, sessionId) {
  // Check session-specific storage first (for uploads created in this session)
  if (sessionId && sessionContent[sessionId]?.[urlPath]) {
    return sessionContent[sessionId][urlPath];
  }

  // Handle site root specially (not on disk)
  if (urlPath === '/') {
    return getSiteRoot();
  }

  // Load from disk
  return loadContentFromDisk(urlPath);
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

  // Get all content items
  let allItems = Object.keys(contentDirMap)
    .filter((itemPath) => itemPath !== '/')
    .map((itemPath) => loadContentFromDisk(itemPath))
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
    }
    // Add more query operations as needed
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
  const baseUrl = `http://localhost:${PORT}`;

  let items;

  // Handle path.query with path.depth=0 (exact match for specific content)
  if (pathQuery && pathDepth === '0') {
    const content = loadContentFromDisk(pathQuery);
    if (content) {
      items = [formatSearchItem(content, baseUrl)];
    } else {
      items = [];
    }
  } else if (pathDepth === '1') {
    // Get immediate children of the search path
    // For site root (/), return all root-level items
    // For other paths, return their children (if any)
    if (searchPath === '' || searchPath === '/') {
      // Root level - use shared helper
      items = getRootNavigationItems();
    } else {
      // Specific path - return its children
      // For Documents (non-folderish items), this will be empty
      const searchContent = loadContentFromDisk(searchPath);
      if (searchContent && searchContent.is_folderish) {
        // Return children if folder
        items = Object.keys(contentDirMap)
          .filter((itemPath) => {
            if (itemPath === searchPath) return false;
            return itemPath.startsWith(searchPath + '/');
          })
          .map((itemPath) => formatSearchItem(loadContentFromDisk(itemPath), baseUrl));
      } else {
        // Non-folder or not found - return empty
        items = [];
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
 * GET *\/@@images/*
 * Serve images for Plone image scales
 * URLs like: /test-image-1/@@images/image/preview
 * Serves actual image files from content directories if they exist,
 * otherwise falls back to placeholder SVGs.
 */
app.get('*/@@images/*', (req, res) => {
  // Extract content path and scale from URL
  // e.g., /images/test-image-1/@@images/image/preview -> contentPath=/images/test-image-1, scale=preview
  const pathMatch = req.path.match(/^(.+?)\/@@images\/image(?:\/(\w+))?$/);
  const contentPath = pathMatch ? pathMatch[1] : '';
  const scale = pathMatch && pathMatch[2] ? pathMatch[2] : 'preview';

  // Try to serve actual image file from content directory
  // Use contentDirMap to find actual directory for nested paths
  const dirInfo = contentDirMap[contentPath];
  const imageDir = dirInfo ? path.join(dirInfo.dirPath, 'image') : null;

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
 * Update content - returns merged content but does NOT persist changes
 * This ensures test isolation (each test gets fresh fixture data)
 */
app.patch('*', (req, res) => {
  const urlPath = req.path;
  const cleanPath = urlPath.replace('/++api++', '');
  const sessionId = getSessionId(req);

  // Reload content from disk to pick up changes during development
  const content = getContent(cleanPath, sessionId);

  if (content) {
    // Return merged content but don't persist - ensures test isolation
    const mergedContent = { ...content, ...req.body };
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
