/**
 * Reusable block verification helpers for testing rendered blocks.
 *
 * Verifies edit annotations (data-edit-link, data-edit-media, data-edit-text),
 * sub-block rendering, and data-node-id compliance.
 *
 * Accepts blocksConfig in the same format frontends pass to initBridge():
 *   { hero: { blockSchema: { properties: { ... } } }, slider: { ... } }
 */
import { expect } from '@playwright/test';
import type { Page, FrameLocator, Locator } from '@playwright/test';

export interface SubBlock {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Build a map of blockType → (fieldName → idField) for every object_list
 * field in the blocksConfig. Used by getSubBlocks to identify which array
 * fields contain sub-blocks and what property to use as the block UID.
 */
export function buildObjectListFieldsMap(
  blocksConfig: Record<string, { blockSchema?: { properties?: Record<string, any> } }>,
): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>();
  for (const [blockType, blockDef] of Object.entries(blocksConfig)) {
    const props = blockDef?.blockSchema?.properties;
    if (!props) continue;
    for (const [fieldName, fieldDef] of Object.entries(props)) {
      if ((fieldDef as Record<string, unknown>)?.widget === 'object_list') {
        if (!map.has(blockType)) map.set(blockType, new Map());
        const idField = ((fieldDef as Record<string, unknown>).idField as string | undefined) || '@id';
        map.get(blockType)!.set(fieldName, idField);
      }
    }
  }
  return map;
}

/**
 * Recursively collect all sub-blocks (id + data) from block data.
 *
 * Uses the objectListFields map to identify object_list fields and their
 * idField (the item property used as data-block-uid). Falls back to a
 * heuristic (@id + @type/blocks/blocks_layout) for blocks not in the map.
 */
export function getSubBlocks(
  obj: Record<string, unknown>,
  blockType?: string,
  objectListFields?: Map<string, Map<string, string>>,
): SubBlock[] {
  const result: SubBlock[] = [];
  const knownListFields = (blockType && objectListFields?.get(blockType)) || new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'blocks' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Shared blocks dict: keys are block IDs
      for (const [subId, subBlock] of Object.entries(value as Record<string, unknown>)) {
        if (subBlock && typeof subBlock === 'object' && !Array.isArray(subBlock)) {
          const subData = subBlock as Record<string, unknown>;
          result.push({ id: subId, data: subData });
          result.push(...getSubBlocks(subData, subData['@type'] as string | undefined, objectListFields));
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
              result.push(...getSubBlocks(rec, rec['@type'] as string | undefined, objectListFields));
            }
          } else {
            // Fallback heuristic: @id + (@type or blocks or blocks_layout)
            const id = rec['@id'] as string | undefined;
            const isSubBlock = id && (rec['@type'] || rec['blocks'] || rec['blocks_layout']);
            if (isSubBlock) {
              result.push({ id, data: rec });
            }
            result.push(...getSubBlocks(rec, rec['@type'] as string | undefined, objectListFields));
          }
        }
      }
    } else if (value && typeof value === 'object') {
      result.push(...getSubBlocks(value as Record<string, unknown>, undefined, objectListFields));
    }
  }
  return result;
}

/**
 * Click each [data-edit-text] element in the block and verify no
 * "Missing data-node-id attributes" warning appears in the iframe.
 *
 * This catches blocks that put data-edit-text on Slate-rendered content
 * but don't add data-node-id attributes on the individual nodes — the bridge
 * cannot sync the cursor position and shows a developer warning overlay.
 */
export async function checkDataEditTextClicks(
  page: Page,
  iframe: FrameLocator,
  block: Locator,
): Promise<void> {
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
export async function checkEditAnnotations(
  block: Locator,
  blockData: Record<string, unknown> | undefined,
): Promise<void> {
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

  // Links must point to the same origin as the page, or be relative.
  // Catches links that accidentally point to the API instead of the frontend.
  const offSiteLinks = await block.locator('a[href]').evaluateAll(
    (els: Element[]) => {
      const pageOrigin = window.location.origin;
      return (els as HTMLAnchorElement[])
        .map(el => el.getAttribute('href'))
        .filter(h => {
          if (!h || h.startsWith('#') || h.startsWith('/')) return false;
          try {
            const linkOrigin = new URL(h, pageOrigin).origin;
            return linkOrigin !== pageOrigin && linkOrigin.includes('localhost');
          } catch { return false; }
        });
    },
  );
  expect(offSiteLinks, 'Links should not point to a different localhost service (e.g. the API)').toEqual([]);

  // All images must have data-edit-media
  const imagesWithout = await block.locator('img').evaluateAll(
    (els: Element[]) => (els as HTMLImageElement[])
      .filter(el => !el.hasAttribute('data-edit-media'))
      .map(el => el.getAttribute('src')),
  );
  expect(imagesWithout, 'All images should have data-edit-media').toEqual([]);

  // All images must have a non-empty src and not be broken (naturalWidth > 0)
  const brokenImages = await block.locator('img').evaluateAll(
    (els: Element[]) => (els as HTMLImageElement[])
      .filter(el => {
        const src = el.getAttribute('src') || '';
        if (!src) return true;  // empty src
        if (el.complete && el.naturalWidth === 0) return true;  // loaded but broken
        return false;
      })
      .map(el => el.getAttribute('src') || '(empty)'),
  );
  expect(brokenImages, 'All images should have valid src and load successfully').toEqual([]);

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

export interface VerifyBlockRenderingOptions {
  expectedText?: string | null;
  isListing?: boolean;
  checkSubBlocks?: boolean;
  checkEditTextClicks?: boolean;
  blocksConfig?: Record<string, any>;
}

/**
 * Full block rendering verification: locate block, check text, check edit
 * annotations, verify sub-blocks, and click data-edit-text elements.
 */
export async function verifyBlockRendering(
  page: Page,
  iframe: FrameLocator,
  blockId: string,
  blockData: Record<string, unknown> | undefined,
  options: VerifyBlockRenderingOptions = {},
): Promise<void> {
  const {
    expectedText,
    isListing = false,
    checkSubBlocks = true,
    checkEditTextClicks: doEditTextClicks = true,
    blocksConfig,
  } = options;

  const objectListFields = blocksConfig ? buildObjectListFieldsMap(blocksConfig) : undefined;

  // Listing blocks: expandListingBlocks sets @uid=parentId on all items,
  // so multiple elements share the same data-block-uid.
  if (isListing) {
    const items = iframe.locator(`[data-block-uid="${blockId}"]`);
    await expect(items.first()).toBeVisible({ timeout: 15000 });
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await checkEditAnnotations(items.first(), blockData);
    return;
  }

  // Wait for block to render in iframe
  const block = iframe.locator(`[data-block-uid="${blockId}"]`);
  await expect(block).toBeVisible({ timeout: 15000 });

  // Verify expected text content renders
  if (expectedText) {
    await expect(block).toContainText(expectedText);
  }

  // Verify edit annotations
  await checkEditAnnotations(block, blockData);

  // Verify sub-blocks (before clicking, which may toggle interactive
  // containers like accordions closed).
  if (checkSubBlocks && blockData) {
    const subBlocks = getSubBlocks(blockData, blockData['@type'] as string, objectListFields);
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
  if (doEditTextClicks) {
    await checkDataEditTextClicks(page, iframe, block);
  }
}
