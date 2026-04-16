/**
 * Global setup for Playwright tests
 * Verifies servers are healthy before running tests
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from '@playwright/test';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { discoverBlocks } = require('./helpers/discover-blocks.cjs');

/**
 * Fetch the frontend's registered blocksConfig by loading mock-parent in a
 * headless browser and asking its bridge helper. Optional — if MOCK_PARENT_URL
 * and FRONTEND_URL aren't set, discovery runs without schemas (type-only
 * discovery, skipping the widget-shape validation).
 */
async function fetchBlocksConfig(
  mockParentUrl: string,
  frontendUrl: string,
  apiUrl: string,
): Promise<{ blocksConfig: Record<string, any>; frontendKeys: string[] }> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const url = `${mockParentUrl}?api_path=${encodeURIComponent(`${apiUrl}/`)}&frontend=${encodeURIComponent(frontendUrl)}`;
    await page.goto(url, { timeout: 60000, waitUntil: 'load' });
    for (let i = 0; i < 75; i++) {
      const result = await page.evaluate(() => {
        const mp = (window as any).mockParent;
        const c = mp?.getBlocksConfig?.();
        const fk = mp?.getFrontendBlockKeys?.() || [];
        // Wait past mock-parent's own baseline (~10 types) for the frontend's INIT to land
        return c && Object.keys(c).length > 10 ? { blocksConfig: c, frontendKeys: fk } : null;
      });
      if (result) return result;
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (err) {
    console.warn(`[SETUP] Failed to fetch blocksConfig: ${err}`);
  } finally {
    await browser.close();
  }
  return { blocksConfig: {}, frontendKeys: [] };
}

async function globalSetup() {
  // Run block discovery if configured (before health checks — SKIP_VOLTO_CHECK
  // causes early return but discovery still needs to run for bridge tests)
  const discoverApi = process.env.DISCOVER_BLOCKS_API;
  if (discoverApi) {
    const maxPages = process.env.DISCOVER_MAX_PAGES
      ? parseInt(process.env.DISCOVER_MAX_PAGES, 10)
      : Infinity;
    const maxLabel = Number.isFinite(maxPages) ? `max ${maxPages} pages` : 'all pages';

    // Fetch blocksConfig from the frontend so discovery can validate widget
    // data shapes, and the frontend-only key set so discovery can flag
    // registered-but-unused types without false positives from mock-parent's
    // own test baseline. Optional — skipped when MOCK_PARENT_URL/FRONTEND_URL
    // aren't set.
    let blocksConfig: Record<string, any> = {};
    let frontendKeys: string[] = [];
    if (process.env.MOCK_PARENT_URL && process.env.FRONTEND_URL) {
      console.log(`[SETUP] Fetching blocksConfig via ${process.env.MOCK_PARENT_URL}...`);
      ({ blocksConfig, frontendKeys } = await fetchBlocksConfig(
        process.env.MOCK_PARENT_URL,
        process.env.FRONTEND_URL,
        discoverApi,
      ));
      console.log(
        `[SETUP] Got ${Object.keys(blocksConfig).length} block schemas from frontend ` +
          `(${frontendKeys.length} registered by frontend, rest baseline)`,
      );
    }

    console.log(`[SETUP] Discovering blocks from ${discoverApi} (${maxLabel})...`);
    const blocks = await discoverBlocks(discoverApi, maxPages, blocksConfig, frontendKeys);
    const outPath = path.resolve(__dirname, '../.discovered-blocks.json');
    fs.writeFileSync(outPath, JSON.stringify(blocks, null, 2));
    console.log(`[SETUP] Wrote ${blocks.length} discovered blocks to ${outPath}`);
  }

  // Bridge-only CI jobs don't run Volto — skip the health check
  if (process.env.SKIP_VOLTO_CHECK === 'true') {
    console.log('[SETUP] Skipping Volto health check (SKIP_VOLTO_CHECK=true)');
    return;
  }

  const maxRetries = 60; // 60 retries * 5 seconds = 5 minutes max wait
  const retryDelay = 5000; // 5 seconds between retries

  // In production mode (USE_PREBUILT), check SSR server directly
  // In dev mode, check webpack-dev-server health endpoint
  // Consumers running Volto on non-default ports (e.g. parallel test stacks)
  // can override with VOLTO_HEALTH_URL.
  const usePrebuilt = process.env.USE_PREBUILT === 'true';
  const defaultHealthUrl = usePrebuilt
    ? 'http://localhost:3001'
    : 'http://localhost:3002/health';
  const healthUrl = process.env.VOLTO_HEALTH_URL || defaultHealthUrl;
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
