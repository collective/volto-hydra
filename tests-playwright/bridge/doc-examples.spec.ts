/**
 * Parameterized tests for doc example components.
 *
 * Verifies that each block type renders correctly via the hydra.js bridge.
 * Uses the mock parent to send fixture data to React/Svelte frontends,
 * testing the full bridge protocol (INIT → INITIAL_DATA → render).
 *
 * Two test sections:
 * 1. "Doc example blocks" — renders handcrafted fixture data (examples.json)
 * 2. "Doc page content" — loads actual doc page data.json files and verifies
 *    the example frontend can render the real page blocks without errors.
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { getFrontendUrl } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

// Doc-example tests only run on doc-example frontends (react, svelte, vue)
// which load schemas from block-definitions.json. Mock and nuxt use
// sharedBlocksConfig which is for other tests.
base.beforeEach(({}, testInfo) => {
  const project = testInfo.project.name;
  if (project === 'mock' || project === 'nuxt') {
    testInfo.skip(true, `Doc-examples only run on doc-example frontends (not ${project})`);
  }
});

interface SubBlock {
  id: string;
  data: Record<string, unknown>;
}

// Load block-definitions.json to build a schema-aware map of object_list fields.
// Maps blockType → fieldName → idField (the item property used as data-block-uid).
const blockDefs = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../docs/blocks/block-definitions.json'), 'utf-8'),
);

/** Map of blockType → (fieldName → idField) for every object_list field in the schema. */
const objectListFields: Map<string, Map<string, string>> = new Map();
for (const pageDef of Object.values(blockDefs) as Record<string, unknown>[]) {
  const blocks = (pageDef as Record<string, unknown>).blocks as Record<string, unknown> | undefined;
  if (!blocks) continue;
  for (const [blockType, blockDef] of Object.entries(blocks)) {
    const props = (blockDef as Record<string, unknown>)?.blockSchema as Record<string, unknown> | undefined;
    if (!props?.properties) continue;
    for (const [fieldName, fieldDef] of Object.entries(props.properties as Record<string, unknown>)) {
      if ((fieldDef as Record<string, unknown>)?.widget === 'object_list') {
        if (!objectListFields.has(blockType)) objectListFields.set(blockType, new Map());
        const idField = ((fieldDef as Record<string, unknown>).idField as string | undefined) || '@id';
        objectListFields.get(blockType)!.set(fieldName, idField);
      }
    }
  }
}

/**
 * Recursively collect all sub-blocks (id + data) from block data.
 *
 * Uses block-definitions.json schema to identify object_list fields and their
 * idField (the item property used as data-block-uid). Falls back to a
 * heuristic (@id + @type/blocks/blocks_layout) for blocks not in the schema.
 */
function getSubBlocks(obj: Record<string, unknown>, blockType?: string): SubBlock[] {
  const result: SubBlock[] = [];
  const knownListFields = blockType ? (objectListFields.get(blockType) || new Map<string, string>()) : new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'blocks' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Shared blocks dict: keys are block IDs
      for (const [subId, subBlock] of Object.entries(value as Record<string, unknown>)) {
        if (subBlock && typeof subBlock === 'object' && !Array.isArray(subBlock)) {
          const subData = subBlock as Record<string, unknown>;
          result.push({ id: subId, data: subData });
          result.push(...getSubBlocks(subData, subData['@type'] as string | undefined));
        }
      }
    } else if (Array.isArray(value)) {
      const idField = knownListFields.get(key);
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          if (idField) {
            // Schema-defined object_list: use the declared idField
            const id = rec[idField] as string | undefined;
            if (id) {
              result.push({ id, data: rec });
              result.push(...getSubBlocks(rec, rec['@type'] as string | undefined));
            }
          } else {
            // Fallback heuristic: @id + (@type or blocks or blocks_layout)
            const id = rec['@id'] as string | undefined;
            const isSubBlock = id && (rec['@type'] || rec['blocks'] || rec['blocks_layout']);
            if (isSubBlock) {
              result.push({ id, data: rec });
            }
            result.push(...getSubBlocks(rec, rec['@type'] as string | undefined));
          }
        }
      }
    } else if (value && typeof value === 'object') {
      result.push(...getSubBlocks(value as Record<string, unknown>));
    }
  }
  return result;
}

// Load examples.json to get block data for sub-block checks
const examplesJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/test-frontend/examples.json'), 'utf-8'),
);

/**
 * Click each [data-edit-text] element in the block and verify no
 * "Missing data-node-id attributes" warning appears in the iframe.
 *
 * This catches blocks that put data-edit-text on Slate-rendered content
 * but don't add data-node-id attributes on the individual nodes — the bridge
 * cannot sync the cursor position and shows a developer warning overlay.
 */
async function checkDataEditTextClicks(
  page: import('@playwright/test').Page,
  iframe: import('@playwright/test').FrameLocator,
  block: import('@playwright/test').Locator,
) {
  const editTextEls = block.locator('[data-edit-text]');
  const count = await editTextEls.count();
  if (count === 0) return;

  for (let i = 0; i < count; i++) {
    const el = editTextEls.nth(i);
    if (!await el.isVisible()) continue;

    await el.click();
    await page.waitForTimeout(300);

    const warning = iframe.locator('#hydra-dev-warning');
    await expect(
      warning,
      `Clicking [data-edit-text] #${i} should not trigger "Missing data-node-id attributes" warning`,
    ).not.toBeVisible();

    // Dismiss overlay if it somehow appeared (don't pollute subsequent checks)
    if (await warning.isVisible()) {
      await iframe.locator('#hydra-warning-close').click();
    }

    await page.keyboard.press('Escape');
    break; // One click per block is sufficient
  }
}

/**
 * Check edit annotations on a rendered block:
 * - All <a href> links must have data-edit-link (except in-page anchors)
 * - All <img> must have data-edit-media
 * - Simple string fields in block data (title, heading, etc.) that appear in the DOM
 *   must have a data-edit-text ancestor
 */
async function checkEditAnnotations(
  block: import('@playwright/test').Locator,
  blockData: Record<string, unknown> | undefined,
) {
  // All content links must have data-edit-link or data-linkable-allow.
  // Exclude links inside [data-edit-text] — those are inside rich text (slate) and
  // are managed by the rich text editor, not by a separate link field picker.
  const linksWithout = await block.locator('a[href]').evaluateAll(
    (els: Element[]) => (els as HTMLAnchorElement[])
      .filter(el => !el.getAttribute('href')!.startsWith('#'))
      .filter(el => !el.closest('[data-edit-text]'))
      .filter(el => !el.hasAttribute('data-edit-link') && !el.hasAttribute('data-linkable-allow'))
      .map(el => el.getAttribute('href')),
  );
  expect(linksWithout, 'All content links should have data-edit-link or data-linkable-allow').toEqual([]);

  // No link href should point to the API URL — links must use frontend-relative paths
  const apiLinks = await block.locator('a[href]').evaluateAll(
    (els: Element[]) => (els as HTMLAnchorElement[])
      .map(el => el.getAttribute('href'))
      .filter(h => h?.includes('localhost:8888')),
  );
  expect(apiLinks, 'No links should point to the API URL').toEqual([]);

  // All images must have data-edit-media
  const imagesWithout = await block.locator('img').evaluateAll(
    (els: Element[]) => (els as HTMLImageElement[])
      .filter(el => !el.hasAttribute('data-edit-media'))
      .map(el => el.getAttribute('src')),
  );
  expect(imagesWithout, 'All images should have data-edit-media').toEqual([]);

  // Simple string fields in block data must appear with data-edit-text
  if (blockData) {
    const TEXT_FIELDS = ['title', 'heading', 'description', 'head_title', 'label'];
    for (const field of TEXT_FIELDS) {
      const value = blockData[field];
      if (typeof value !== 'string' || !value) continue;
      const hasEditText = await block.evaluate(
        (el, v) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            if (node.textContent?.includes(v)) {
              return !!(node.parentElement?.closest('[data-edit-text]'));
            }
          }
          return true; // text not found in DOM — skip
        },
        value,
      );
      expect(hasEditText, `"${value}" (${field}) should be inside [data-edit-text]`).toBe(true);
    }
  }
}

const test = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    const frontendUrl = getFrontendUrl(testInfo.project.name);
    const frontend = frontendUrl ? `&frontend=${encodeURIComponent(frontendUrl)}` : '';
    await page.goto(
      `http://localhost:8888/mock-parent.html?content=examples${frontend}`,
    );
    await helper.waitForIframeReady();
    await use(helper);
  },
});

/**
 * Block examples to test. Each entry describes a block in the examples fixture.
 */
const examples = [
  {
    type: 'hero',
    blockId: 'ex-hero',
    expectedText: 'Welcome to Our Site',
  },
  {
    type: 'slate',
    blockId: 'ex-slate',
    expectedText: 'Welcome',
  },
  {
    type: 'image',
    blockId: 'ex-image',
    expectedText: null,
  },
  {
    type: 'teaser',
    blockId: 'ex-teaser',
    expectedText: 'Custom Title',
  },
  {
    type: 'table',
    blockId: 'ex-table',
    expectedText: 'Name',
  },
  {
    type: 'columns',
    blockId: 'ex-columns',
    expectedText: 'Design',
  },
  {
    type: 'accordion',
    blockId: 'ex-accordion',
    expectedText: 'Frequently Asked Questions',
  },
  {
    type: 'slider',
    blockId: 'ex-slider',
    expectedText: 'Product Launch 2025',
  },
  {
    type: 'listing',
    blockId: 'ex-listing',
    expectedText: null,
    isListing: true,
  },
  {
    type: 'search',
    blockId: 'ex-search',
    expectedText: 'Filter by',
  },
  {
    type: 'form',
    blockId: 'ex-form',
    expectedText: 'Contact Us',
  },
  {
    type: 'introduction',
    blockId: 'ex-introduction',
    expectedText: null,
  },
  {
    type: 'heading',
    blockId: 'ex-heading',
    expectedText: 'Getting Started',
  },
  {
    type: 'separator',
    blockId: 'ex-separator',
    expectedText: null,
  },
  {
    type: 'button',
    blockId: 'ex-button',
    expectedText: 'Learn More',
  },
  {
    type: 'highlight',
    blockId: 'ex-highlight',
    expectedText: 'Featured Content',
  },
  {
    type: 'video',
    blockId: 'ex-video',
    expectedText: null,
  },
  {
    type: 'toc',
    blockId: 'ex-toc',
    expectedText: 'Getting Started',
  },
];

test.describe('Doc example blocks', () => {
  for (const example of examples) {
    test(`${example.type} block renders`, async ({ helper, page }) => {
      const iframe = helper.getIframe();

      // Listing blocks: expandListingBlocks sets @uid=parentId on all items,
      // so multiple elements share the same data-block-uid. Use .first() for
      // the container and verify child items rendered.
      if (example.isListing) {
        // Expanded listing items all share the parent's data-block-uid.
        // Verify at least 2 elements rendered (i.e. items were fetched and expanded).
        const items = iframe.locator(`[data-block-uid="${example.blockId}"]`);
        await expect(items.first()).toBeVisible({ timeout: 15000 });
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(2);
        await checkEditAnnotations(items.first(), examplesJson.blocks?.[example.blockId]);
        return;
      }

      // Wait for block to render in iframe
      const block = iframe.locator(`[data-block-uid="${example.blockId}"]`);
      await expect(block).toBeVisible({ timeout: 15000 });

      // Verify expected text content renders
      if (example.expectedText) {
        await expect(block).toContainText(example.expectedText);
      }

      // Verify edit annotations and that no links point to the API URL
      const blockData = examplesJson.blocks?.[example.blockId];
      await checkEditAnnotations(block, blockData);

      // Verify sub-blocks first (before clicking, which may toggle interactive
      // containers like accordions closed).
      if (blockData) {
        const subBlocks = getSubBlocks(blockData, blockData['@type'] as string);
        let anyVisible = false;
        for (const { id, data } of subBlocks) {
          const loc = iframe.locator(`[data-block-uid="${id}"]`).first();
          await expect(loc).toBeAttached({ timeout: 5000 });
          if (await loc.isVisible()) {
            anyVisible = true;
            await checkEditAnnotations(loc, data);
          }
        }
        if (subBlocks.length > 0) {
          expect(anyVisible).toBe(true);
        }
      }

      // Click each data-edit-text and verify no "Missing data-node-id" warning appears
      await checkDataEditTextClicks(page, iframe, block);
    });
  }
});

// --- Doc page content tests ---
// Extract real block instances from each doc page's data.json and verify
// the example frontend can render them one at a time (not the whole page).

const TEMPLATE_ID = 'resolveuid/tpl-block-reference-layout';

/** Map of markdown filename → { content UID, target block @type, hasEditableFields } */
const DOC_PAGES: Record<string, { uid: string; blockType: string; editable: boolean }> = {
  'accordion.md': { uid: 'f8cd4a2d8d7c4703b4e41d2093b21aed', blockType: 'accordion', editable: true },
  'button.md': { uid: '405582582e70493c96a6c549444a1eaa', blockType: '__button', editable: true },
  'columns.md': { uid: '99c70917b6894af08dd306fdbc0eff6a', blockType: 'gridBlock', editable: false },
  'form.md': { uid: '13de82575e16493fbc54514e548a9f3c', blockType: 'form', editable: false },
  'heading.md': { uid: '2f69aa417e894fd3bf23d393287b369e', blockType: 'heading', editable: true },
  'highlight.md': { uid: '8416628543f146ff9a18d281c03e2399', blockType: 'highlight', editable: true },
  'image.md': { uid: '40a436ad604f4f80aeafe0977806760a', blockType: 'image', editable: true },
  'introduction.md': { uid: '00cef5f245a342958288ace545e3c097', blockType: 'introduction', editable: true },
  'listing.md': { uid: '6bd32a3367ea4254b295db642655b9d3', blockType: 'listing', editable: false },
  'search.md': { uid: '928010d84e5d4df2b2282f3e179d6b1a', blockType: 'search', editable: false },
  'separator.md': { uid: '546e82cce6c842d0a4046a0131539bd2', blockType: 'separator', editable: false },
  'slate.md': { uid: '2508797173824f0e9f82bb2e7cfe922d', blockType: 'slate', editable: true },
  'table.md': { uid: '102f648399914851951ffa3fefc8665c', blockType: 'slateTable', editable: true },
  'teaser.md': { uid: 'bd2b39d2745847db82ed197a4eb1effc', blockType: 'teaser', editable: true },
  'toc.md': { uid: '3906609d0456404ca7146f6aa1f12f32', blockType: 'toc', editable: false },
  'video.md': { uid: '6d37dd19ef754344aaa254fa288e44b4', blockType: 'video', editable: false },
};

const CONTENT_DIR = path.resolve(__dirname, '../../docs/content/content/content');

interface DocBlock {
  name: string;
  blockId: string;
  blockType: string;
  editable: boolean;
  blockData: Record<string, unknown>;
}

/**
 * Read each data.json, extract individual blocks of the target type.
 * Returns one test entry per block instance found.
 */
function getDocBlocks(): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const [mdFile, { uid, blockType, editable }] of Object.entries(DOC_PAGES)) {
    const jsonPath = path.join(CONTENT_DIR, uid, 'data.json');
    if (!fs.existsSync(jsonPath)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const name = mdFile.replace('.md', '');

    // Find blocks of the target type (skip template blocks)
    const layout = data.blocks_layout?.items || [];
    let index = 0;
    for (const blockId of layout) {
      const block = data.blocks?.[blockId];
      if (!block) continue;
      if (block.templateId === TEMPLATE_ID) continue;
      if (block['@type'] !== blockType) continue;

      blocks.push({
        name: index === 0 ? name : `${name}-${index}`,
        blockId,
        blockType,
        editable,
        blockData: block,
      });
      index++;
    }
  }
  return blocks;
}

const docBlocks = getDocBlocks();

/**
 * For doc block tests, each test builds a minimal content object with just
 * the target block, sends it to the frontend, and verifies it renders.
 */
const docBlockTest = base.extend<{ helper: AdminUIHelper }>({
  helper: async ({ page }, use, testInfo) => {
    const helper = new AdminUIHelper(page);
    const frontendUrl = getFrontendUrl(testInfo.project.name);
    // Navigate to mock parent with the 'docblock' content name.
    // We intercept the fetch to /docblock.json to serve the block data.
    await use(helper);
  },
});

docBlockTest.describe('Doc page blocks render', () => {
  for (const docBlock of docBlocks) {
    docBlockTest(`${docBlock.name} (${docBlock.blockType}) renders`, async ({ page, helper }, testInfo) => {
      const frontendUrl = getFrontendUrl(testInfo.project.name);
      const frontend = frontendUrl ? `&frontend=${encodeURIComponent(frontendUrl)}` : '';

      // Build minimal content with just this one block
      const contentData = {
        '@id': '/test-doc-block',
        title: `Test ${docBlock.blockType}`,
        blocks: {
          [docBlock.blockId]: docBlock.blockData,
        },
        blocks_layout: {
          items: [docBlock.blockId],
        },
      };

      // Intercept the content fetch to serve our single-block content
      await page.route('**/docblock.json', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(contentData),
        });
      });

      await page.goto(
        `http://localhost:8888/mock-parent.html?content=docblock${frontend}`,
      );
      await helper.waitForIframeReady();

      const iframe = helper.getIframe();

      // Listing blocks: expandListingBlocks sets @uid=parentId on all items,
      // so multiple elements share the same data-block-uid. Use .first().
      const isListing = docBlock.blockType === 'listing';
      const blockLocator = iframe.locator(`[data-block-uid="${docBlock.blockId}"]`);
      const block = isListing ? blockLocator.first() : blockLocator;
      await expect(block).toBeVisible({ timeout: 15000 });

      // Verify no "Unknown block" error for this block
      await expect(block).not.toContainText('Unknown block');

      // Verify editable fields are present (data-edit-text, data-edit-media, data-edit-link)
      // Check both the block element itself and its descendants
      if (docBlock.editable) {
        const hasEditAttr = await block.evaluate((el) => {
          const selectors = ['[data-edit-text]', '[data-edit-media]', '[data-edit-link]'];
          for (const sel of selectors) {
            if (el.matches(sel) || el.querySelector(sel)) return true;
          }
          return false;
        });
        expect(hasEditAttr).toBe(true);
      }

      // Click each data-edit-text and verify no "Missing data-node-id" warning appears
      await checkDataEditTextClicks(page, iframe, block);
    });
  }
});
