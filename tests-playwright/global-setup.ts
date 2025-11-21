/**
 * Global setup for Playwright tests
 * Verifies servers are healthy before running tests
 */

async function globalSetup() {
  // Check Volto webpack health (even when reusing existing server)
  const maxRetries = 60; // 60 retries * 5 seconds = 5 minutes max wait
  const retryDelay = 5000; // 5 seconds between retries

  console.log('[SETUP] Checking Volto webpack compilation status...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3002/health');
      const text = await response.text();

      if (response.status === 200 && text === 'OK') {
        console.log('[SETUP] ✓ Volto webpack compilation successful');
        return;
      } else if (response.status === 503) {
        console.log(`[SETUP] Waiting for compilation... (${text.trim()})`);
      } else if (response.status === 500) {
        console.error(`[SETUP] ✗ Compilation failed: ${text}`);
        throw new Error(`Webpack compilation failed: ${text}`);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log('[SETUP] Waiting for Volto server to start...');
      } else {
        throw error;
      }
    }

    // Wait before next retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error(
    'Timeout waiting for Volto webpack compilation to complete. Check http://localhost:3002/health',
  );
}

export default globalSetup;
