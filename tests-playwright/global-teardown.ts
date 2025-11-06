/**
 * Global teardown for Playwright tests.
 * Stops the combined mock API + frontend server after all tests complete.
 */
import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const apiServer = (global as any).__MOCK_API_SERVER__;

  // Stop combined API + frontend server
  if (apiServer) {
    console.log('Stopping mock API + frontend server...');
    await new Promise<void>((resolve) => {
      apiServer.close(() => {
        console.log('✓ Mock API + frontend server stopped');
        resolve();
      });
    });
  }
}

export default globalTeardown;
