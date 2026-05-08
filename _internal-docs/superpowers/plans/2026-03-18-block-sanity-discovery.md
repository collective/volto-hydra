# Block Sanity Discovery Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generic Playwright test that crawls any Plone API, discovers one example of each block type, and runs edit-mode sanity checks (`verifyBlockRendering`) on each — so any frontend developer can validate their block implementations against real content.

**Architecture:** A discovery module fetches `/@search` from the API to list all pages, then fetches each page to extract blocks. It deduplicates by `@type`, keeping the first example of each. Results are written to a JSON file during `globalSetup`, then the spec reads them synchronously to parametrize one test per block type. Each test loads the page via `?api_path=` in mock-parent.html and runs `verifyBlockRendering`.

**Tech Stack:** Playwright, TypeScript, Plone REST API (`/@search`, content endpoints), existing `BlockVerificationHelper`, `mock-parent.html` with `?api_path=`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `tests-playwright/helpers/discover-blocks.ts` | **New.** Crawls any Plone API, extracts one example of each block `@type` from page content. Handles nested/container blocks. Exports `discoverBlocks()` and types. |
| `tests-playwright/global-setup.ts` | **Modify.** After health checks, run discovery and write `.discovered-blocks.json`. |
| `tests-playwright/bridge/block-sanity.spec.ts` | **New.** Reads discovered blocks, parametrizes one test per block type using `verifyBlockRendering`. |
| `.gitignore` | **Modify.** Add `.discovered-blocks.json`. |

---

### Task 1: Create the block discovery module

**Files:**
- Create: `tests-playwright/helpers/discover-blocks.ts`

This module crawls a Plone API to find one example of each block type. It:
1. Fetches `/@search` (no depth filter) to get all content paths
2. Fetches each page's full content (with blocks)
3. Recursively extracts all blocks from the page (including nested blocks inside containers like `section`, `gridBlock`, `columns`, `accordion`)
4. Deduplicates by `@type`, keeping the first example found
5. Stops fetching pages early once it's gone through all available or hit `maxPages`

- [ ] **Step 1: Create the discovery module**

```typescript
// tests-playwright/helpers/discover-blocks.ts

/**
 * Crawls a Plone REST API to discover one example of each block @type.
 *
 * Used by globalSetup to write .discovered-blocks.json, which the
 * block-sanity spec reads at module load time to parametrize tests.
 *
 * Works against any Plone API (mock or real) — no filesystem access needed.
 */

export interface DiscoveredBlock {
  /** The block's @type (e.g. "hero_block", "features", "slate") */
  blockType: string;
  /** The block's ID (key in the blocks dict) */
  blockId: string;
  /** The API path of the page containing this block */
  pagePath: string;
  /** The full block data object */
  blockData: Record<string, unknown>;
  /** Whether this is a listing block (multiple elements share same data-block-uid) */
  isListing: boolean;
}

/**
 * Recursively extract all blocks from a content object.
 * Handles nested containers: section, gridBlock, columns, accordion, etc.
 * Returns flat array of { blockId, blockType, blockData }.
 */
function extractBlocks(
  blocks: Record<string, any>,
  layout?: string[],
): { blockId: string; blockType: string; blockData: Record<string, unknown> }[] {
  const result: { blockId: string; blockType: string; blockData: Record<string, unknown> }[] = [];
  const blockIds = layout || Object.keys(blocks);

  for (const blockId of blockIds) {
    const block = blocks[blockId];
    if (!block || typeof block !== 'object') continue;

    const blockType = block['@type'] as string;
    if (!blockType) continue;

    result.push({ blockId, blockType, blockData: block });

    // Recurse into nested blocks (containers)
    if (block.blocks && typeof block.blocks === 'object') {
      const nestedLayout = block.blocks_layout?.items;
      result.push(...extractBlocks(block.blocks, nestedLayout));
    }

    // Handle object_list style arrays (accordion panels, slider slides, etc.)
    for (const [key, value] of Object.entries(block)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && item.blocks) {
            result.push(...extractBlocks(item.blocks, item.blocks_layout?.items));
          }
        }
      }
    }
  }

  return result;
}

/**
 * Discover one example of each block type from a Plone API.
 *
 * @param apiUrl - Base URL of the Plone API (e.g. "http://localhost:8888")
 * @param maxPages - Maximum number of pages to fetch (default 50)
 * @returns Array of DiscoveredBlock, one per unique @type
 */
export async function discoverBlocks(
  apiUrl: string,
  maxPages: number = 50,
): Promise<DiscoveredBlock[]> {
  const seen = new Map<string, DiscoveredBlock>();

  // Step 1: Get all content paths via @search (b_size=9999 to avoid pagination)
  const searchUrl = `${apiUrl}/@search?b_size=9999`;
  console.log(`[DISCOVER] Fetching content list from ${searchUrl}`);
  const searchResp = await fetch(searchUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!searchResp.ok) {
    throw new Error(`Failed to fetch @search: ${searchResp.status} ${searchResp.statusText}`);
  }
  const searchData = await searchResp.json();
  const items: { '@id': string; '@type': string }[] = searchData.items || [];
  console.log(`[DISCOVER] Found ${items.length} content items`);

  // Filter to page-like types that have blocks
  const pageTypes = new Set(['Document', 'Folder', 'Plone Site', 'News Item', 'Event']);
  const pages = items.filter(item => pageTypes.has(item['@type']));
  console.log(`[DISCOVER] ${pages.length} page-like items to scan`);

  // Step 2: Fetch each page and extract blocks
  let fetched = 0;
  for (const item of pages) {
    if (fetched >= maxPages) break;

    // Extract path from @id (strip the API base URL)
    const itemUrl = item['@id'];
    const pagePath = new URL(itemUrl).pathname;

    try {
      const contentUrl = `${apiUrl}${pagePath}`;
      const resp = await fetch(contentUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) continue;

      const content = await resp.json();
      fetched++;

      if (!content.blocks || !content.blocks_layout?.items) continue;

      const blocks = extractBlocks(content.blocks, content.blocks_layout.items);

      for (const { blockId, blockType, blockData } of blocks) {
        if (seen.has(blockType)) continue;

        // Skip metadata block types that don't render visually
        const skipTypes = new Set(['title', 'description']);
        if (skipTypes.has(blockType)) continue;

        seen.set(blockType, {
          blockType,
          blockId,
          pagePath,
          blockData,
          isListing: blockType === 'listing',
        });

        console.log(`[DISCOVER] Found ${blockType} block "${blockId}" on ${pagePath}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[DISCOVER] Skipping ${pagePath}: ${msg}`);
    }
  }

  const result = Array.from(seen.values());
  console.log(`[DISCOVER] Discovered ${result.length} unique block types from ${fetched} pages`);
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add tests-playwright/helpers/discover-blocks.ts
git commit -m "feat: add block discovery module for API-driven block sanity tests"
```

---

### Task 2: Integrate discovery into globalSetup

**Files:**
- Modify: `tests-playwright/global-setup.ts`
- Modify: `.gitignore`

Run discovery before health checks (since `SKIP_VOLTO_CHECK` causes early return), write results to `.discovered-blocks.json` in the project root. The discovery is opt-in — only runs when `DISCOVER_BLOCKS_API` env var is set (pointing to the API URL). This keeps existing test runs unaffected.

- [ ] **Step 1: Add `.discovered-blocks.json` to `.gitignore`**

Append to `.gitignore`:
```
.discovered-blocks.json
```

- [ ] **Step 2: Add discovery to global-setup.ts**

Add the imports at the top of the file, and add the discovery block **at the start** of the `globalSetup` function (before the `SKIP_VOLTO_CHECK` early return, since bridge-only CI jobs skip Volto but still need discovery):

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { discoverBlocks } from './helpers/discover-blocks';

async function globalSetup() {
  // Run block discovery if configured (before health checks — SKIP_VOLTO_CHECK
  // causes early return but discovery still needs to run for bridge tests)
  const discoverApi = process.env.DISCOVER_BLOCKS_API;
  if (discoverApi) {
    const maxPages = parseInt(process.env.DISCOVER_MAX_PAGES || '50', 10);
    console.log(`[SETUP] Discovering blocks from ${discoverApi} (max ${maxPages} pages)...`);
    const blocks = await discoverBlocks(discoverApi, maxPages);
    const outPath = path.resolve(__dirname, '../.discovered-blocks.json');
    fs.writeFileSync(outPath, JSON.stringify(blocks, null, 2));
    console.log(`[SETUP] Wrote ${blocks.length} discovered blocks to ${outPath}`);
  }

  // Bridge-only CI jobs don't run Volto — skip the health check
  if (process.env.SKIP_VOLTO_CHECK === 'true') {
    // ... existing early return ...
  }
  // ... rest of existing health check code ...
}
```

- [ ] **Step 3: Commit**

```bash
git add tests-playwright/global-setup.ts .gitignore
git commit -m "feat: run block discovery in globalSetup when DISCOVER_BLOCKS_API is set"
```

---

### Task 3: Create the block sanity spec

**Files:**
- Create: `tests-playwright/bridge/block-sanity.spec.ts`

This spec reads `.discovered-blocks.json` at module load time (like pytest parametrize collection), then generates one test per block type. Each test uses `?api_path=` to load the full page from the API via mock-parent.html, then runs `verifyBlockRendering` on the specific block.

- [ ] **Step 1: Create the spec**

```typescript
// tests-playwright/bridge/block-sanity.spec.ts

/**
 * Auto-discovered block sanity tests.
 *
 * Reads .discovered-blocks.json (written by globalSetup) and generates
 * one test per block @type. Each test loads the page containing the block
 * via mock-parent's ?api_path= and runs verifyBlockRendering.
 *
 * Run with:
 *   DISCOVER_BLOCKS_API=http://localhost:8888 pnpm exec playwright test block-sanity
 *
 * Works against any Plone API — mock or remote.
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { verifyBlockRendering } from '../helpers/BlockVerificationHelper';
import { getFrontendUrl } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';
import type { DiscoveredBlock } from '../helpers/discover-blocks';

// Read discovered blocks (written by globalSetup)
const discoveredPath = path.resolve(__dirname, '../../.discovered-blocks.json');
let discoveredBlocks: DiscoveredBlock[] = [];
if (fs.existsSync(discoveredPath)) {
  discoveredBlocks = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
}

// Skip entire file if no discovered blocks
base.beforeEach(async ({}, testInfo) => {
  if (discoveredBlocks.length === 0) {
    testInfo.skip(true, 'No .discovered-blocks.json found — run with DISCOVER_BLOCKS_API=<url>');
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
    test(`${block.blockType} block renders and has edit annotations`, async ({ page, helper }, testInfo) => {
      const frontendUrl = getFrontendUrl(testInfo.project.name);
      const frontend = frontendUrl ? `&frontend=${encodeURIComponent(frontendUrl)}` : '';

      // Use api_path to load the full page content from the API
      // The mock-parent fetches the page JSON and sends it via the bridge protocol
      const apiOrigin = process.env.DISCOVER_BLOCKS_API || 'http://localhost:8888';
      const apiPath = `${apiOrigin}${block.pagePath}`;
      await page.goto(
        `http://localhost:8889/mock-parent.html?api_path=${encodeURIComponent(apiPath)}${frontend}`,
      );
      await helper.waitForIframeReady();

      const iframe = helper.getIframe();

      await verifyBlockRendering(page, iframe, block.blockId, block.blockData, {
        isListing: block.isListing,
        // Skip data-edit-text clicks for discovered content — we just want rendering + annotation checks
        checkEditTextClicks: false,
      });
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it works**

Run against the mock frontend (uses hydra's test content on port 8888):
```bash
cd volto-hydra
DISCOVER_BLOCKS_API=http://localhost:8888 pnpm exec playwright test block-sanity --project=mock
```

Or against a specific frontend like react:
```bash
DISCOVER_BLOCKS_API=http://localhost:8888 pnpm exec playwright test block-sanity --project=react
```

- [ ] **Step 3: Commit**

```bash
git add tests-playwright/bridge/block-sanity.spec.ts
git commit -m "feat: add auto-discovered block sanity tests via API crawl"
```

---

### Task 4: Manual integration test

- [ ] **Step 1: Start the mock API with PretaGov content**

From the `frontend/` directory:
```bash
pnpm mock:api
```

- [ ] **Step 2: Run discovery + tests**

```bash
cd volto-hydra
DISCOVER_BLOCKS_API=http://localhost:8889 pnpm exec playwright test block-sanity --project=react
```

- [ ] **Step 3: Verify test report**

```bash
pnpm exec playwright show-report
```

Check that each block type appears as a separate test case (hero_block, features, stats, clients, team, teaser, slate, etc.) and review any failures for missing edit annotations.

---

## Usage Summary

For any frontend developer:

```bash
# 1. Start your API (mock or real Plone)
# 2. Start the test servers
# 3. Run:
DISCOVER_BLOCKS_API=http://your-api:8080 pnpm exec playwright test block-sanity
```

The test automatically discovers what block types exist in your content and validates each one renders correctly with proper edit annotations.
