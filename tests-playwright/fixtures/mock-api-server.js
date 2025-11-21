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
 * No authentication required for test mock server
 * All requests are allowed
 */

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

  // Load test content from file
  const contentPath = path.join(__dirname, 'api', 'content.json');
  if (fs.existsSync(contentPath)) {
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    const urlPath = new URL(content['@id']).pathname;
    contentDB[urlPath] = content;
    console.log(`Loaded content: ${urlPath}`);
  }
}

// Initialize on startup
loadInitialContent();

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
  const content = contentDB[cleanPath];

  if (content) {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] Serving API content for ${cleanPath}`);
      console.log(`[DEBUG] Query params:`, req.query);
      console.log(`[DEBUG] Response preview:`, JSON.stringify(content).substring(0, 500));
    }
    res.json(content);
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
 * Update content
 */
app.patch('*', (req, res) => {
  const path = req.path;
  const cleanPath = path.replace('/++api++', '');

  const content = contentDB[cleanPath];

  if (content) {
    // Merge updates
    Object.assign(content, req.body);
    contentDB[cleanPath] = content;
    res.json(content);
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
