/**
 * Auto-discovered block sanity tests.
 *
 * Reads .discovered-blocks.json (written by globalSetup) and generates
 * one test per block @type. Each test loads the page containing the block
 * via mock-parent's ?api_path= and runs verifyBlockRendering.
 *
 * Run with:
 *   DISCOVER_BLOCKS_API=<mock-api-url> pnpm exec playwright test block-sanity
 *
 * Env vars:
 *   DISCOVER_BLOCKS_API  - Plone API URL for discovery and content fetching
 *   MOCK_PARENT_URL      - URL of mock-parent.html (defaults to test-frontend port)
 *
 * Works against any Plone API — mock or remote.
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { verifyBlockRendering } from '../helpers/BlockVerificationHelper';
import { getFrontendUrl } from './fixtures';
import { URLS } from '../ports';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
interface DiscoveredBlock {
  blockType: string;
  variation?: string;
  kind?: 'rich' | 'simple';
  blockId: string;
  pagePath: string;
  blockData: Record<string, unknown>;
  isListing: boolean;
  // Set by discovery for content/schema problems that become a failing test
  // rather than blocking the whole suite in globalSetup.
  unregistered?: boolean;
  occurrenceCount?: number;
  shapeIssue?: boolean;
  slateIssue?: boolean;
  field?: string;
  issues?: string[];
  noExample?: boolean;
}

// Read discovered blocks (written by globalSetup)
const discoveredPath = path.resolve(__dirname, '../../.discovered-blocks.json');
let discoveredBlocks: DiscoveredBlock[] = [];
if (fs.existsSync(discoveredPath)) {
  discoveredBlocks = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
}

// Block sanity is the cross-cutting render contract. We only enforce it on
// the three frontends that ship full block coverage and are the canonical
// references for downstream consumers — the mock test frontend (the spec's
// own ground truth), Nuxt, and Next.js. Other example frontends (react,
// svelte, vue, f7) intentionally skip block-sanity so missing block types or
// in-flight renderer changes don't gate the suite.
const SANITY_PROJECTS = new Set(['mock', 'nuxt', 'nextjs']);

base.beforeEach(async ({}, testInfo) => {
  if (discoveredBlocks.length === 0) {
    testInfo.skip(true, 'No .discovered-blocks.json found — run with DISCOVER_BLOCKS_API=<url>');
  }
  if (!SANITY_PROJECTS.has(testInfo.project.name)) {
    testInfo.skip(true, `block-sanity only runs on mock/nuxt/nextjs (skipping ${testInfo.project.name})`);
  }
});

const test = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    await use(helper);
  },
});

test.describe('Block sanity (auto-discovered)', () => {
  for (const block of discoveredBlocks) {
    // A block @type used in content but not registered in the frontend's
    // blocksConfig fails as its own test (it renders as "Not implemented
    // Block") rather than blocking the whole suite.
    if (block.unregistered) {
      test(`${block.blockType} block @type is registered in the frontend`, () => {
        throw new Error(
          `Block @type "${block.blockType}" is used in content (${block.occurrenceCount} ` +
            `occurrence(s), e.g. ${block.pagePath}) but is not registered in the frontend's ` +
            `blocksConfig, so it renders as "Not implemented Block". Register its schema ` +
            `(customBlocks) or migrate the content to an existing type.`,
        );
      });
      continue;
    }
    // A frontend-registered type with no content example — fails as its own
    // test (nothing to render) rather than blocking the suite.
    if (block.noExample) {
      test(`${block.blockType} block has a content example to render`, () => {
        throw new Error(
          `Block @type "${block.blockType}" is registered in the frontend but no content ` +
            `example exists to run its render test. Add a fixture (a page with a populated ` +
            `instance), or mark the type restricted if it only belongs inside a parent container.`,
        );
      });
      continue;
    }
    // Content/schema shape mismatch (e.g. a field declared slate but holding a
    // string) — fails as its own test rather than blocking the suite.
    if (block.shapeIssue || block.slateIssue) {
      const kind = block.shapeIssue ? 'data shape' : 'slate structure';
      test(`${block.blockType} block [${block.blockId}] has valid ${kind}`, () => {
        throw new Error(
          `Block "${block.blockType}" [${block.blockId}] on ${block.pagePath}` +
            (block.field ? ` field "${block.field}"` : '') +
            ` has ${kind} that does not match its schema:\n` +
            (block.issues || []).map((m) => `  - ${m}`).join('\n'),
        );
      });
      continue;
    }
    const labelVariation = block.variation && block.variation !== 'default'
      ? ` (${block.variation})`
      : '';
    const labelKind = block.kind ? ` [${block.kind}]` : '';
    const label = `${block.blockType}${labelVariation}${labelKind}`;
    test(`${label} block renders and has edit annotations`, async ({ page, helper }, testInfo) => {
      const frontendUrl = process.env.FRONTEND_URL || getFrontendUrl(testInfo.project.name);
      const frontend = frontendUrl ? `&frontend=${encodeURIComponent(frontendUrl)}` : '';

      // Use api_path to load the full page content from the API
      // The mock-parent fetches the page JSON and sends it via the bridge protocol
      const apiOrigin = process.env.DISCOVER_BLOCKS_API || URLS.mockApi;
      const mockParentUrl = process.env.MOCK_PARENT_URL || `${URLS.testFrontend}/mock-parent.html`;
      const apiPath = `${apiOrigin}${block.pagePath}`;
      await page.goto(
        `${mockParentUrl}?api_path=${encodeURIComponent(apiPath)}${frontend}`,
      );
      await helper.waitForIframeReady();

      const iframe = helper.getIframe();

      await verifyBlockRendering(page, iframe, block.blockId, block.blockData, {
        isListing: block.isListing,
        // Sub-block iteration uses the bridge's blockPathMap (canonical,
        // schema-resolved) rather than a shape heuristic on blockData.
        checkSubBlocks: true,
        // Skip data-edit-text clicks for discovered content — we just want rendering + annotation checks
        checkEditTextClicks: false,
      });
    });
  }
});
