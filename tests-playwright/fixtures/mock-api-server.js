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

// In-memory content database
const contentDB = {};

// Create a valid JWT format token (header.payload.signature)
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"sub":"admin","exp":Math.floor(Date.now()/1000) + 86400} (expires in 24 hours)
const header = Buffer.from(JSON.stringify({"alg":"HS256","typ":"JWT"})).toString('base64').replace(/=/g, '');
const payload = Buffer.from(JSON.stringify({"sub":"admin","exp":Math.floor(Date.now()/1000) + 86400})).toString('base64').replace(/=/g, '');
const signature = 'fake-signature';
const AUTH_TOKEN = `${header}.${payload}.${signature}`;

// Middleware
app.use(cors());
app.use(express.json());

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

// Load initial content from fixtures
function loadInitialContent() {
  // Add site root content
  contentDB['/'] = {
    '@id': 'http://localhost:8888/',
    '@type': 'Plone Site',
    'id': 'Plone',
    'title': 'Plone Site',
    'description': '',
    'items': [],
    'items_total': 0,
    '@components': {
      'actions': {
        '@id': 'http://localhost:8888/@actions',
        'document_actions': [],
        'object': [],
        'object_buttons': [],
        'portal_tabs': [],
        'site_actions': [],
        'user': []
      },
      'breadcrumbs': {
        '@id': 'http://localhost:8888/@breadcrumbs',
        'items': [],
        'root': 'http://localhost:8888'
      },
      'navigation': {
        '@id': 'http://localhost:8888/@navigation',
        'items': []
      },
      'workflow': {
        '@id': 'http://localhost:8888/@workflow'
      }
    }
  };
  console.log('Loaded content: /');

  // Load all JSON files from api directory (except schema files)
  const apiDir = path.join(__dirname, 'api');
  if (fs.existsSync(apiDir)) {
    const files = fs.readdirSync(apiDir);
    files.forEach((file) => {
      if (file.endsWith('.json') && !file.startsWith('schema-')) {
        const filePath = path.join(apiDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const urlPath = new URL(content['@id']).pathname;
        contentDB[urlPath] = content;
        console.log(`Loaded content: ${urlPath}`);
      }
    });
  }
}

// Initialize on startup
loadInitialContent();

/**
 * Get content for a path, reloading from disk to pick up changes during development.
 * Falls back to cached contentDB if no file exists.
 */
function getContent(urlPath) {
  // Check if there's a JSON file for this path in the api directory
  const apiDir = path.join(__dirname, 'api');
  if (fs.existsSync(apiDir)) {
    const files = fs.readdirSync(apiDir);
    for (const file of files) {
      if (file.endsWith('.json') && !file.startsWith('schema-')) {
        const filePath = path.join(apiDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const contentPath = new URL(content['@id']).pathname;
        if (contentPath === urlPath) {
          return content;
        }
      }
    }
  }
  // Fall back to cached contentDB
  return contentDB[urlPath];
}

/**
 * POST /@login-renew
 * Renew/validate existing JWT token
 */
app.post('/@login-renew', (req, res) => {
  if (process.env.DEBUG) {
    console.log('Token renewal requested');
  }

  // Return the same token and user info
  res.json({
    token: AUTH_TOKEN,
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
 * Authenticate and return JWT token with user info
 */
app.post('/@login', (req, res) => {
  const { login, password } = req.body;

  if (process.env.DEBUG) {
    console.log(`Login attempt - username: ${login}, password: ${password ? '***' : 'missing'}`);
  }

  if (login && password) {
    const response = {
      token: AUTH_TOKEN,
      user: {
        '@id': 'http://localhost:8888/@users/admin',
        id: 'admin',
        fullname: 'Admin User',
        email: 'admin@example.com',
        roles: ['Manager', 'Authenticated'],
      },
    };

    if (process.env.DEBUG) {
      console.log(`Login successful, returning token: ${AUTH_TOKEN.substring(0, 20)}...`);
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
 * GET /@search or /:path/@search
 * Search for content (used by ObjectBrowser)
 * Supports path.depth parameter to get children of a specific path
 */
app.get('*/@search', (req, res) => {
  const searchPath = req.path.replace('/@search', '');
  const pathDepth = req.query['path.depth'];

  let items;

  if (pathDepth === '1') {
    // Get immediate children of the search path
    // For site root (/), return all root-level items
    // For other paths, return their children (if any)
    if (searchPath === '' || searchPath === '/') {
      // Root level - return all items that are direct children of root
      items = Object.entries(contentDB)
        .filter(([path]) => {
          if (path === '/') return false; // Exclude site root itself
          const pathParts = path.split('/').filter(p => p);
          return pathParts.length === 1; // Only root-level items
        })
        .map(([path, content]) => ({
          '@id': content['@id'],
          '@type': content['@type'],
          'id': content.id,
          'title': content.title,
          'description': content.description || '',
          'review_state': content.review_state || 'published',
          'UID': content.UID,
        }));
    } else {
      // Specific path - return its children
      // For Documents (non-folderish items), this will be empty
      const searchContent = contentDB[searchPath];
      if (searchContent && searchContent.is_folderish) {
        // Return children if folder
        items = Object.entries(contentDB)
          .filter(([path]) => {
            if (path === searchPath) return false;
            return path.startsWith(searchPath + '/');
          })
          .map(([path, content]) => ({
            '@id': content['@id'],
            '@type': content['@type'],
            'title': content.title,
            'description': content.description || '',
            'review_state': content.review_state || 'published',
            'UID': content.UID,
          }));
      } else {
        // Non-folder or not found - return empty
        items = [];
      }
    }
  } else {
    // No depth filter - return all content items
    items = Object.entries(contentDB)
      .filter(([path]) => path !== '/')
      .map(([path, content]) => ({
        '@id': content['@id'],
        '@type': content['@type'],
        'title': content.title,
        'description': content.description || '',
        'review_state': content.review_state || 'published',
        'UID': content.UID,
      }));
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
app.patch('*', (req, res) => {
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
app.get('*', (req, res) => {
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
