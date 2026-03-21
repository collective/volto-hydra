/**
 * Test frontend server — serves the vanilla JS test frontend + hydra.js.
 * Also starts the mock Plone API on a separate port.
 *
 * Port 8888: Mock Plone API (REST endpoints, content from disk)
 * Port 8889: Test frontend (mock-parent.html, renderer.js, hydra.js)
 *
 * Run directly: node mock-api-server.js
 * Or started automatically by Playwright config webServer
 */

const path = require('path');
const express = require('express');

// Start the mock Plone API (imports and initializes on require)
const { app: apiApp, contentDirMap } = require('./mock-plone-api');

const API_PORT = process.env.PORT || 8888;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 8889;
const FRONTEND_DIR = path.join(__dirname, 'test-frontend');

// ── Test frontend server ──────────────────────────────────────────────────

const frontend = express();

// Serve the real hydra.js from packages/hydra-js
frontend.get('/hydra.js', (req, res) => {
  const hydraJsPath = path.join(__dirname, '../../packages/hydra-js/hydra.js');
  res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(hydraJsPath);
});

// Serve buildBlockPathMap utility (Volto-free, used by mock-parent.html)
frontend.get('/build-block-path-map.js', (req, res) => {
  const filePath = path.join(__dirname, '../../packages/hydra-js/buildBlockPathMap.js');
  res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  res.sendFile(filePath);
});

// Serve shared block schemas (used by test frontend via import)
frontend.get('/shared-block-schemas.js', (req, res) => {
  const filePath = path.join(__dirname, 'shared-block-schemas.js');
  res.setHeader('Content-Type', 'text/javascript; charset=UTF-8');
  res.sendFile(filePath);
});

// Serve frontend static files
frontend.use(express.static(FRONTEND_DIR, {
  setHeaders: (res) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  }
}));

// SPA fallback
frontend.get('*', (req, res) => {
  if (req.isApiRequest) {
    return res.status(404).json({ error: { type: 'NotFound' } });
  }
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Server startup ────────────────────────────────────────────────────────

let apiServer, frontendServer;
if (require.main === module) {
  apiServer = apiApp.listen(API_PORT, () => {
    console.log(`Mock Plone API running on http://localhost:${API_PORT}`);
    console.log(`Health: http://localhost:${API_PORT}/health`);
  });

  frontendServer = frontend.listen(FRONTEND_PORT, () => {
    console.log(`Test frontend running on http://localhost:${FRONTEND_PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down');
    apiServer.close();
    frontendServer.close(() => process.exit(0));
  });
}

module.exports = { app: apiApp, frontend, apiServer, frontendServer };
