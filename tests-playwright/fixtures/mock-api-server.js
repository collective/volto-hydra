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

// ── Server startup ────────────────────────────────────────────────────────
// Test frontend is now a separate Vite dev server (tests-playwright/fixtures/test-frontend/)

let apiServer;
if (require.main === module) {
  apiServer = apiApp.listen(API_PORT, () => {
    console.log(`Mock Plone API running on http://localhost:${API_PORT}`);
    console.log(`Health: http://localhost:${API_PORT}/health`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down');
    apiServer.close(() => process.exit(0));
  });
}

module.exports = { app: apiApp, apiServer };
