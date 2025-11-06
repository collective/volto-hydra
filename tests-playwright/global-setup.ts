/**
 * Global setup for Playwright tests.
 * Starts the mock API and frontend servers before all tests run.
 */
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting test servers...');

  // Enable DEBUG mode for request logging
  process.env.DEBUG = '1';

  // Start combined mock API + frontend server (port 8888)
  // This server handles both API requests (with ++api++ prefix) and frontend requests
  console.log('Starting combined mock API + frontend server...');
  const mockApiModule = await import('./fixtures/mock-api-server.js');
  const apiServer = mockApiModule.default;
  console.log('✓ Mock API + frontend server started on http://localhost:8888');

  // Store HTTP server instance for teardown
  (global as any).__MOCK_API_SERVER__ = apiServer;

  console.log('All test servers ready!');
}

export default globalSetup;
