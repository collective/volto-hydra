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

/**
 * Detect slate-shaped field values in block data: non-empty arrays of
 * objects where the first item has a `children` array (slate node shape).
 */
function findSlateFields(
  blockData: Record<string, unknown>,
): string[] {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(blockData)) {
    if (key.startsWith('@') || key === 'blocks' || key === 'blocks_layout') continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    const first = value[0] as Record<string, unknown> | undefined;
    if (first && typeof first === 'object' && Array.isArray(first.children)) {
      fields.push(key);
    }
  }
  return fields;
}

/**
 * Compare two slate trees for structural equality (types + text), ignoring
 * nodeId metadata and inline mark ordering. Used to verify that the DOM
 * round-trips back to the same Slate value via readSlateValueFromDOM.
 */
function slateEqualIgnoringIds(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => slateEqualIgnoringIds(item, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const SKIP = new Set(['nodeId', 'data-node-id']);
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)].filter(k => !SKIP.has(k)));
    for (const k of keys) {
      if (!slateEqualIgnoringIds(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Schema-driven (with shape-based fallback) slate annotation check.
 *
 * For every slate field — either declared as `widget: 'slate'` in the block
 * schema or detected by value shape (array of `{children: [...]}`) — round-trip
 * the rendered DOM back to a Slate value using Bridge.readSlateValueFromDOM
 * and compare against blockData[field]. A mismatch means the renderer
 * isn't emitting the data-node-id attributes the bridge needs to anchor
 * text nodes, so cursor sync will fail during editing.
 *
 * This is strictly stronger than counting [data-node-id] descendants —
 * it fails when any slate node is missing an id, not just when all are.
 */
export async function checkSlateAnnotations(
  block: Locator,
  blockData: Record<string, unknown> | undefined,
  blockSchema?: { properties?: Record<string, any> },
): Promise<void> {
  if (!blockData) return;

  let slateFields: string[];
  if (blockSchema?.properties) {
    slateFields = Object.entries(blockSchema.properties)
      .filter(([, prop]) => (prop as Record<string, unknown>)?.widget === 'slate')
      .map(([field]) => field)
      .filter((field) => {
        const v = blockData[field];
        return Array.isArray(v) && v.length > 0;
      });
  } else {
    slateFields = findSlateFields(blockData);
  }

  for (const field of slateFields) {
    // Accept either a descendant [data-edit-text="<field>"] OR the block
    // element itself carrying the attribute (renderers are free to collapse
    // the block wrapper and the edit-text container onto one element).
    const blockHasAttr = (await block.getAttribute('data-edit-text')) === field;
    const container = blockHasAttr ? block : block.locator(`[data-edit-text="${field}"]`).first();
    if (!(await container.count())) {
      // Build a diagnostic showing what data-edit-text values ARE present in
      // the block — usually it's a typo or a misplaced attribute.
      const context = await block.evaluate((el) => {
        const outer = (el.outerHTML || '').slice(0, 200);
        const self = el.getAttribute('data-edit-text');
        const descendants = Array.from(el.querySelectorAll('[data-edit-text]'))
          .map((d) => `${d.tagName.toLowerCase()}[data-edit-text="${d.getAttribute('data-edit-text')}"]`);
        return { outer, self, descendants };
      });
      throw new Error(
        `Slate field "${field}": no [data-edit-text="${field}"] container found.\n` +
          `  block element's own data-edit-text: ${context.self ?? '(none)'}\n` +
          `  descendants with data-edit-text: ${context.descendants.length ? context.descendants.join(', ') : '(none)'}\n` +
          `  block outerHTML (truncated): ${context.outer}`,
      );
    }

    // Round-trip via the bridge's own DOM→Slate reader. The bridge already
    // walked its formData with addNodeIds — use bridge.getBlockData(uid)[field]
    // as the existingValue so domNodeToSlate's metadata lookup finds the ids
    // that match the DOM (otherwise `type` drops out of the round-tripped
    // result). Wait for bridge + data-node-id on the DOM before reading.
    const blockUid = await block.getAttribute('data-block-uid');
    const domValue = await container.evaluate(async (el, args) => {
      const { uid, fieldName } = args as { uid: string | null; fieldName: string };
      const hasId = (root: Element) =>
        root.hasAttribute('data-node-id') || !!root.querySelector('[data-node-id]');
      for (let i = 0; i < 50; i++) {
        const b = (window as any).__hydraBridge;
        if (b?.readSlateValueFromDOM && b?.getBlockData && hasId(el)) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      const bridge = (window as any).__hydraBridge;
      if (!bridge?.readSlateValueFromDOM) return { error: 'bridge not available on window.__hydraBridge after 5s' };
      if (!hasId(el)) return { error: 'no data-node-id rendered after 5s — renderer is not forwarding node ids' };
      const existingValue = uid ? bridge.getBlockData(uid)?.[fieldName] : undefined;
      if (!existingValue) return { error: `bridge.getBlockData(${uid})?.${fieldName} is missing — bridge hasn't delivered data or block is nested outside the bridge's map` };
      try {
        return { value: bridge.readSlateValueFromDOM(el, existingValue) };
      } catch (e: any) {
        return { error: `readSlateValueFromDOM threw: ${e?.message || String(e)}` };
      }
    }, { uid: blockUid, fieldName: field });
    const existing = blockData[field];

    if ((domValue as any).error) {
      const dom = await container.evaluate((el) => (el.outerHTML || '').slice(0, 200));
      throw new Error(
        `Slate field "${field}" round-trip failed: ${(domValue as any).error}\n` +
          `  container outerHTML (truncated): ${dom}`,
      );
    }
    if (!slateEqualIgnoringIds((domValue as any).value, existing)) {
      const dom = await container.evaluate((el) => (el.outerHTML || '').slice(0, 300));
      throw new Error(
        `Slate field "${field}" DOM does not round-trip to the same Slate value.\n` +
          `  Diff (first 400 chars each):\n` +
          `    Got:      ${JSON.stringify((domValue as any).value).slice(0, 400)}\n` +
          `    Expected: ${JSON.stringify(existing).slice(0, 400)}\n` +
          `  container outerHTML (truncated): ${dom}\n` +
          `  Likely causes: renderer missing data-node-id on some nodes; stray whitespace in template between sibling slate nodes; renderer emitting wrong element tag.`,
      );
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

  // Schema-driven slate check (no-op if schema or data not supplied)
  const blockType = blockData?.['@type'] as string | undefined;
  const blockSchema = blockType ? blocksConfig?.[blockType]?.blockSchema : undefined;
  await checkSlateAnnotations(block, blockData, blockSchema);

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
        const subType = data?.['@type'] as string | undefined;
        const subSchema = subType ? blocksConfig?.[subType]?.blockSchema : undefined;
        await checkSlateAnnotations(loc, data, subSchema);
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
