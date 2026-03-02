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
    expectedText: 'Hydra bridges your frontend',
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
    expectedText: 'Table of Contents',
  },
];

test.describe('Doc example blocks', () => {
  for (const example of examples) {
    test(`${example.type} block renders`, async ({ helper }) => {
      const iframe = helper.getIframe();

      // Listing blocks: expandListingBlocks sets @uid=parentId on all items,
      // so multiple elements share the same data-block-uid. Use .first() for
      // the container and verify child items rendered.
      if (example.isListing) {
        const block = iframe.locator(`[data-block-uid="${example.blockId}"]`).first();
        await expect(block).toBeVisible({ timeout: 15000 });
        // Verify at least one listing item rendered (summary or default variation)
        const items = iframe.locator(`[data-block-uid="${example.blockId}"].listing-item`);
        await expect(items.first()).toBeVisible({ timeout: 15000 });
        return;
      }

      // Wait for block to render in iframe
      const block = iframe.locator(`[data-block-uid="${example.blockId}"]`);
      await expect(block).toBeVisible({ timeout: 15000 });

      // Verify expected text content renders
      if (example.expectedText) {
        await expect(block).toContainText(example.expectedText);
      }
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
    });
  }
});
