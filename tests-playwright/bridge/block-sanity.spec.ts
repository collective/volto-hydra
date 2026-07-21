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
import { slateFieldsNeverEditable } from '../helpers/field-coverage';
import { axeCheckBlock, formatViolations } from '../helpers/axe-sanity';
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
  allowedBlocksViolation?: boolean;
  parentType?: string;
  allowed?: string[];
}

// Read discovered blocks (written by globalSetup)
const discoveredPath = path.resolve(__dirname, '../../.discovered-blocks.json');
let discoveredBlocks: DiscoveredBlock[] = [];
if (fs.existsSync(discoveredPath)) {
  discoveredBlocks = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
}

// Synthetic conversion-test blocks (dnd-convert.spec.ts) are drag/paste fixtures
// with no editable fields and are only rendered by the mock test frontend — they
// aren't part of the cross-frontend render contract, so exclude them from sanity.
//
// The example listing-variant blocks (example-listings.spec.ts) expand via a
// per-frontend fetcher registration and have no inline-editable fields; the RSS
// one fetches an external feed that only resolves against the mock. They're
// covered by their own integration spec (admin-mock), not this render contract.
const NON_CONTRACT_BLOCKS = new Set(['relatedItemsListing', 'searchShortcuts', 'rssFeed']);
discoveredBlocks = discoveredBlocks.filter(
  (b) => !b.blockType.startsWith('conv') && !NON_CONTRACT_BLOCKS.has(b.blockType),
);

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
    // A block placed in a container that doesn't allow its @type — it can't be
    // reordered within its container (the chevron / drag walks it OUT to the
    // nearest ancestor that accepts the type). Fails as its own test rather
    // than blocking the suite.
    if (block.allowedBlocksViolation) {
      test(`${block.blockType} block [${block.blockId}] is allowed in its container`, () => {
        throw new Error(
          `Block "${block.blockType}" [${block.blockId}] on ${block.pagePath} is placed in a ` +
            `${block.parentType} container that doesn't allow its @type ` +
            `(allowed: [${(block.allowed || []).join(', ')}]). Such a block can't be reordered ` +
            `within its container — the mobile chevron / drag walks it OUT to the nearest ` +
            `ancestor that accepts the type, so it "escapes". Widen the container's allowedBlocks ` +
            `(if the placement is intended) or move/convert the block.`,
        );
      });
      continue;
    }
    // Content/schema shape mismatch (e.g. a field declared slate but holding a
    // string) — fails as its own test rather than blocking the suite.
    if (block.shapeIssue || block.slateIssue) {
      const kind = block.shapeIssue ? 'data shape' : 'slate structure';
      // Include pagePath + field: a blockId can repeat across pages, and a block
      // can have per-field shape/slate issues — without them, two entries would
      // collide into a "duplicate test title" error and abort the whole run.
      const where = `${block.pagePath || '?'}${block.field ? `.${block.field}` : ''}`;
      test(`${block.blockType} block [${block.blockId}] on ${where} has valid ${kind}`, () => {
        throw new Error(
          `Block "${block.blockType}" [${block.blockId}] on ${block.pagePath}` +
            (block.field ? ` field "${block.field}"` : '') +
            ` has ${kind} that does not match its schema:\n` +
            (block.issues || []).map((m) => `  - ${m}`).join('\n'),
        );
      });
      continue;
    }
    // A field present in stored data but not declared in the block schema — one
    // test per (blockType, field) so each missing field is reported once. It
    // can't be edited in the sidebar until the schema declares it.
    if (block.undeclaredField) {
      test(`${block.blockType} block declares field "${block.field}" in its schema`, () => {
        throw new Error(
          `Block "${block.blockType}" stores field "${block.field}" (e.g. on ` +
            `${block.pagePath}) but its schema does not declare it — the field can't be ` +
            `edited in the sidebar. Add it to the block schema, or remove the stray data.`,
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
      // waitForIframeReady only confirms the DOM mounted; verifyBlockRendering
      // reads __hydraBridge.blockPathMap, which is only populated once the
      // bridge has received INITIAL_DATA. Without this wait the render check
      // races bridge init and flakily throws "blockPathMap not available".
      await helper.waitForBridgeConnected();

      const iframe = helper.getIframe();

      await verifyBlockRendering(page, iframe, block.blockId, block.blockData, {
        isListing: block.isListing,
        // Sub-block iteration uses the bridge's blockPathMap (canonical,
        // schema-resolved) rather than a shape heuristic on blockData.
        checkSubBlocks: true,
        // Skip data-edit-text clicks for discovered content — we just want rendering + annotation checks
        checkEditTextClicks: false,
      });

      // Optional per-block accessibility pass (axe-core). Off by default; opt in
      // with SANITY_AXE=1. Runs axe scoped to just this block — blocking =
      // serious/critical WCAG A/AA that's block-level; advisory (moderate/minor
      // or page-context rules) is logged but doesn't fail.
      if (process.env.SANITY_AXE) {
        const { blocking, advisory } = await axeCheckBlock(iframe, block.blockId);
        if (advisory.length > 0) {
          console.log(
            `[axe] ${label}: ${advisory.length} advisory finding(s)\n${formatViolations(advisory)}`,
          );
        }
        expect(
          blocking,
          `${label} has ${blocking.length} serious/critical a11y violation(s):\n${formatViolations(blocking)}`,
        ).toEqual([]);
      }
    });
  }

  // Aggregate check: every schema-declared slate field must have its
  // [data-edit-text] edit container in AT LEAST ONE discovered example of its
  // block type. The per-example render checks above record coverage instead of
  // failing individually, because a field can be gated by an optional synced
  // element (e.g. a card's `description` behind the grid's `copy` element) and
  // legitimately not render in every example. This runs last (defined after the
  // per-block loop; block-sanity is serial) so coverage is fully accumulated.
  test('every slate field is editable in at least one example', () => {
    const never = slateFieldsNeverEditable();
    expect(
      never,
      `Slate fields with NO [data-edit-text] container in ANY discovered example ` +
        `(each is uneditable everywhere it appears):\n` +
        never
          .map((n) => `  - ${n.blockType}.${n.field}\n      e.g. ${n.example}`)
          .join('\n'),
    ).toEqual([]);
  });
});
