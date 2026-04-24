/**
 * Auto-discovered page integrity tests.
 *
 * Walks the unique set of pages referenced by .discovered-blocks.json and
 * runs verifyPageIntegrity against each — catches broken images and
 * off-site backend-origin links in any block on the page (not just the
 * best-of-type instance the block-sanity spec exercises).
 *
 * Uses the direct frontend URL (getFrontendUrl for the project) rather
 * than the mock-parent iframe, because verifyPageIntegrity uses
 * `page.evaluate` / `document.querySelectorAll`.
 */
import { test, expect } from '@playwright/test';
import { verifyPageIntegrity } from '../helpers/PageIntegrityHelper';
import { getFrontendUrl } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DiscoveredBlock {
  pagePath: string;
}

const discoveredPath = path.resolve(__dirname, '../../.discovered-blocks.json');
let uniquePages: string[] = [];
if (fs.existsSync(discoveredPath)) {
  const all: DiscoveredBlock[] = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
  uniquePages = Array.from(new Set(all.map((b) => b.pagePath)));
}

test.describe('Page integrity (auto-discovered)', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (uniquePages.length === 0) {
      testInfo.skip(true, 'No .discovered-blocks.json found — run with DISCOVER_BLOCKS_API=<url>');
    }
  });

  for (const pagePath of uniquePages) {
    test(`${pagePath}`, async ({ page }, testInfo) => {
      const frontendUrl = process.env.FRONTEND_URL || getFrontendUrl(testInfo.project.name);
      testInfo.skip(!frontendUrl, `No frontend URL configured for project ${testInfo.project.name}`);

      await page.goto(`${frontendUrl}${pagePath}`, { timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await verifyPageIntegrity(page);
    });
  }
});
