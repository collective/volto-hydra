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

// In-memory content database
const contentDB = {};

// Map URL paths to source directories (for reloading content from disk)
const contentDirMap = {};

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
 * Format a content item for search results
 * Includes image_field and image_scales for Image content types
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
    'is_folderish': content.is_folderish || false,
    'hasPreviewImage': hasPreviewImage,
  };

  // Add image fields for Image content types (needed by object browser)
  if (content['@type'] === 'Image') {
    item.image_field = 'image';
    item.image_scales = getImageScales(content, baseUrl);
  }

  return item;
}

/**
 * Get navigation items at a specific level under a base path
 * @param {string} basePath - The base path to get navigation for (e.g., '/' or '/pretagov')
 * @param {number} depth - How many levels deep to include (default 1)
 */
function getNavigationItems(basePath = '/', depth = 1) {
  const baseUrl = `http://localhost:${PORT}`;
  const normalizedBase = basePath.replace(/\/$/, '') || '/';
  const baseDepth = normalizedBase === '/' ? 0 : normalizedBase.split('/').filter(p => p).length;

  return Object.entries(contentDB)
    .filter(([itemPath]) => {
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
    .map(([, content]) => ({
      ...formatSearchItem(content, baseUrl),
      'items': [],  // Child items (empty for flat structure, needed for depth=2)
    }));
}

/**
 * Get root-level navigation items from contentDB (legacy wrapper)
 * Used by @search endpoint
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

  // Build breadcrumb items
  const breadcrumbItems = [{ '@id': baseUrl, 'title': 'Home' }];
  let currentPath = '';
  for (const part of pathParts) {
    currentPath += '/' + part;
    const partContent = contentDB[currentPath];
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
        const hasChildren = Object.keys(contentDB).some(p =>
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

// Mapping from URL path to content directory info (for image serving and reloading)
// { urlPath: { dirPath: '/full/path/to/dir', dirName: 'dirname' } }
const contentDirMap = {};

/**
 * Load content from a single directory with a mount prefix
 */
function loadContentFromDir(contentDirPath, mountPath, baseUrl) {
  if (!fs.existsSync(contentDirPath)) {
    console.log(`Content directory not found: ${contentDirPath}`);
    return;
  }

  console.log(`Loading content from ${contentDirPath} mounted at ${mountPath}`);

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

        contentDB[urlPath] = enrichContent(content, urlPath, baseUrl);
        contentDirMap[urlPath] = { dirPath: fullDirPath, dirName: dir.name };
        console.log(`Loaded content: ${urlPath}`);
      }
    }
  });
}

// Load initial content from fixtures
function loadInitialContent() {
  const baseUrl = `http://localhost:${PORT}`;

  // Add site root content
  contentDB['/'] = {
    '@id': baseUrl + '/',
    '@type': 'Plone Site',
    'id': 'Plone',
    'title': 'Plone Site',
    'description': '',
    'items': [],
    'items_total': 0,
    'is_folderish': true,
    '@components': generateComponents('/', baseUrl),
    'can_manage_portlets': true,
    'can_view': true,
    'can_edit': true,
    'can_delete': true,
    'can_add': true,
    'can_list_contents': true
  };
  console.log('Loaded content: /');

  // Load content from all mount points
  CONTENT_MOUNTS.forEach(({ mountPath, dirPath }) => {
    loadContentFromDir(dirPath, mountPath, baseUrl);
  });
}

// Initialize on startup
loadInitialContent();

/**
 * Get content for a path, reloading from disk to pick up changes during development.
 * Falls back to cached contentDB if no file exists.
 */
function getContent(urlPath) {
  const baseUrl = `http://localhost:${PORT}`;

  // Use contentDirMap to find the source directory for this path
  const dirInfo = contentDirMap[urlPath];
  if (dirInfo) {
    const dataPath = path.join(dirInfo.dirPath, 'data.json');
    if (fs.existsSync(dataPath)) {
      const content = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      return enrichContent(content, urlPath, baseUrl);
    }
  }

  // Fall back to cached contentDB
  return contentDB[urlPath];
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

    // Store in memory
    contentDB[imagePath] = imageContent;

    if (process.env.DEBUG) {
      console.log(`Created Image: ${imagePath}`);
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
app.get('{*path}/@types/:typeName', (req, res) => {
  const { typeName } = req.params;
  res.json(getTypeSchema(typeName));
});

/**
 * GET /:path/@breadcrumbs
 * Get breadcrumb trail
 */
app.get('{*path}/@breadcrumbs', (req, res) => {
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
 * GET /@search or /:path/@search
 * Search for content (used by ObjectBrowser)
 * Supports path.depth parameter to get children of a specific path
 * Supports path.query parameter to get a specific content item
 */
app.get('{*path}/@search', (req, res) => {
  const searchPath = req.path.replace('/@search', '');
  const pathDepth = req.query['path.depth'];
  const pathQuery = req.query['path.query'];
  const baseUrl = `http://localhost:${PORT}`;

  let items;

  // Handle path.query with path.depth=0 (exact match for specific content)
  if (pathQuery && pathDepth === '0') {
    const content = contentDB[pathQuery];
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
      const searchContent = contentDB[searchPath];
      if (searchContent && searchContent.is_folderish) {
        // Return children if folder
        items = Object.entries(contentDB)
          .filter(([itemPath]) => {
            if (itemPath === searchPath) return false;
            return itemPath.startsWith(searchPath + '/');
          })
          .map(([, content]) => formatSearchItem(content, baseUrl));
      } else {
        // Non-folder or not found - return empty
        items = [];
      }
    }
  } else {
    // No depth filter - return all content items
    items = Object.entries(contentDB)
      .filter(([itemPath]) => itemPath !== '/')
      .map(([, content]) => formatSearchItem(content, baseUrl));
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
app.get('{*path}/@contents', (req, res) => {
  const contentPath = req.path.replace('/@contents', '') || '/';

  // For Documents, we return siblings (contents of parent folder)
  // For the site root, we return all root-level items
  let items;

  if (contentPath === '' || contentPath === '/') {
    // Root level - return all root-level items
    items = Object.entries(contentDB)
      .filter(([path]) => {
        if (path === '/') return false;
        const pathParts = path.split('/').filter(p => p);
        return pathParts.length === 1;
      })
      .map(([_path, content]) => ({
        '@id': content['@id'],
        '@type': content['@type'],
        'id': content.id,
        'title': content.title,
        'description': content.description || '',
        'review_state': content.review_state || 'published',
        'UID': content.UID,
        'is_folderish': content.is_folderish || false,
      }));
  } else {
    // Get parent folder's contents (siblings of this content)
    const pathParts = contentPath.split('/').filter(p => p);
    const parentPath = pathParts.length > 1
      ? '/' + pathParts.slice(0, -1).join('/')
      : '/';

    items = Object.entries(contentDB)
      .filter(([itemPath]) => {
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
      .map(([_path, content]) => ({
        '@id': content['@id'],
        '@type': content['@type'],
        'id': content.id,
        'title': content.title,
        'description': content.description || '',
        'review_state': content.review_state || 'published',
        'UID': content.UID,
        'is_folderish': content.is_folderish || false,
      }));
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
app.post('{*path}/@lock', (req, res) => {
  res.json({
    locked: true,
    stealable: true,
    creator: 'admin',
    time: new Date().toISOString(),
    timeout: 600
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
app.get('{*path}', (req, res, next) => {
  // Only handle API requests (with ++api++ prefix)
  // Frontend requests should be handled by static file middleware
  if (!req.isApiRequest) {
    return next();
  }

  const path = req.path;
  const cleanPath = path.replace('/++api++', '');
  // Reload content from disk to pick up changes during development
  const content = getContent(cleanPath);

  if (content) {
    // Filter actions based on authentication
    const authenticated = isAuthenticated(req);
    const filteredContent = filterActionsForAuth(content, authenticated);

    if (process.env.DEBUG) {
      console.log(`[DEBUG] Serving API content for ${cleanPath} (auth: ${authenticated})`);
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
app.patch('{*path}', (req, res) => {
  const path = req.path;
  const cleanPath = path.replace('/++api++', '');

  // Reload content from disk to pick up changes during development
  const content = getContent(cleanPath);

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
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Mock Plone API server running on http://localhost:${PORT}`);
  console.log(`Mock frontend server also running on http://localhost:${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Content endpoints available:`);
  Object.keys(contentDB).forEach((path) => {
    console.log(`  - http://localhost:${PORT}${path}`);
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
