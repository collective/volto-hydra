/**
 * Global setup for Playwright tests
 * Verifies servers are healthy before running tests
 */

async function globalSetup() {
  const maxRetries = 60; // 60 retries * 5 seconds = 5 minutes max wait
  const retryDelay = 5000; // 5 seconds between retries

  // In production mode (USE_PREBUILT), check SSR server directly
  // In dev mode, check webpack-dev-server health endpoint
  const usePrebuilt = process.env.USE_PREBUILT === 'true';
  const healthUrl = usePrebuilt
    ? 'http://localhost:3001'
    : 'http://localhost:3002/health';
  const serverType = usePrebuilt ? 'production server' : 'webpack compilation';

  console.log(`[SETUP] Checking Volto ${serverType} status...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(healthUrl);
      const text = await response.text();

      if (usePrebuilt) {
        // For production server, any 200 response means ready
        if (response.status === 200) {
          console.log('[SETUP] ✓ Volto production server ready');
          return;
        }
      } else {
        // For dev server, check health endpoint status
        if (response.status === 200 && text === 'OK') {
          console.log('[SETUP] ✓ Volto webpack compilation successful');
          return;
        } else if (response.status === 503) {
          console.log(`[SETUP] Waiting for compilation... (${text.trim()})`);
        } else if (response.status === 500) {
          console.error(`[SETUP] ✗ Compilation failed: ${text}`);
          throw new Error(`Webpack compilation failed: ${text}`);
        }
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`[SETUP] Waiting for Volto ${serverType} to start...`);
      } else {
        throw error;
      }
    }

    // Wait before next retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error(
    `Timeout waiting for Volto ${serverType} to complete. Check ${healthUrl}`,
  );
}

export default globalSetup;
