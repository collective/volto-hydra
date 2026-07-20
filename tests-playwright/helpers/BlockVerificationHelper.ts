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
import { recordSlateFieldContainer } from './field-coverage';

export interface SubBlock {
  id: string;
  data: Record<string, unknown>;
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

  // data-linkable-allow on a real navigation link (<a href>) means the
  // click triggers a full page-navigation that tears down the editor —
  // an editable annotation underneath would never get a chance to fire.
  // On a non-navigation element (button with @click, tab toggle, etc.)
  // the click runs an in-page handler; inline editing still works
  // because contenteditable is set on block selection (not on click),
  // so click positions the cursor in the field while the handler runs
  // its action. Only the <a href> case is a genuine contradiction.
  const trappedAnnotations = await block.locator('a[href][data-linkable-allow] [data-edit-text], a[href][data-linkable-allow] [data-edit-link], a[href][data-linkable-allow] [data-edit-media]').evaluateAll(
    (els: Element[]) => els.map((el) => {
      const which =
        (el.hasAttribute('data-edit-text') && 'data-edit-text') ||
        (el.hasAttribute('data-edit-link') && 'data-edit-link') ||
        'data-edit-media';
      const field = el.getAttribute(which) || '';
      return `${which}="${field}" on <${el.tagName.toLowerCase()}>`;
    }),
  );
  expect(
    trappedAnnotations,
    'Editable annotations (data-edit-text/link/media) cannot live inside <a href data-linkable-allow> — full-page navigation tears down the editor before editing can happen',
  ).toEqual([]);

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
  // Decorative images (aria-hidden) are chrome, not editable content — e.g. a
  // card's "→" arrow icon — so they don't carry data-edit-media.
  const imagesWithout = await block.locator('img').evaluateAll(
    (els: Element[]) => (els as HTMLImageElement[])
      .filter(el => !el.hasAttribute('data-edit-media') && el.getAttribute('aria-hidden') !== 'true')
      .map(el => el.getAttribute('src')),
  );
  expect(imagesWithout, 'All non-decorative images should have data-edit-media').toEqual([]);

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

  // Any inline-text field the renderer displays must sit inside [data-edit-text]
  // so the editor can target it. Drive this off the block schema: only plain
  // text widgets qualify. Choice/select/object_browser/icon/file/slate fields are
  // NOT inline text and would false-positive on coincidental text — e.g. a
  // Choice `colour: "white"`, or `type: "info"` matching the material-icon
  // ligature "info" rendered for the alert. Without a schema we cannot tell
  // which fields are editable text, so skip rather than guess.
  if (blockData) {
    const blockUid = await block.getAttribute('data-block-uid');
    const schema = blockUid
      ? await block.evaluate(
          (_el, uid) => (window as any).__hydraBridge?.getBlockSchema?.(uid) || null,
          blockUid,
        )
      : null;
    const props = schema?.properties as Record<string, any> | undefined;
    const isInlineTextField = (field: string): boolean => {
      const p = props?.[field];
      if (!p) return false; // not a schema field → not editable inline text
      if (p.factory === 'Choice' || p.choices) return false; // dropdown, not text
      const w = p.widget;
      if (w && w !== 'text' && w !== 'textarea') return false; // select/icon/object_browser/file/slate/…
      return p.type === undefined || p.type === 'string';
    };
    for (const [field, value] of Object.entries(blockData)) {
      if (field.startsWith('@')) continue;
      if (typeof value !== 'string' || !value) continue;
      if (!isInlineTextField(field)) continue;
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
 * An empty text node (`{ text: '' }`, ignoring node-id metadata). Slate inserts
 * these at inline boundaries — before a leading `<strong>`, between adjacent
 * links, after a trailing inline — as normalization.
 */
function isEmptyTextNode(n: unknown): boolean {
  if (!n || typeof n !== 'object' || Array.isArray(n)) return false;
  const o = n as Record<string, unknown>;
  if (o.text !== '') return false;
  return Object.keys(o).every((k) => k === 'text' || k === 'nodeId' || k === 'data-node-id');
}

/**
 * Compare two slate trees for structural equality (types + text), ignoring
 * nodeId metadata and inline mark ordering. Used to verify that the DOM
 * round-trips back to the same Slate value via readSlateValueFromDOM.
 *
 * Empty text nodes are ignored on both sides: they are slate's inline-boundary
 * normalization, which `readSlateValueFromDOM` produces (and hydra re-adds on
 * load) but the renderer emits none of. So a stored value that hasn't been
 * normalized — e.g. a `<p>` whose first child is a `<strong>`, stored as
 * `[{strong}, …]` — round-trips to the same tree once these artifacts drop out.
 * Any real (non-empty) text or structural difference is still caught, since only
 * `{ text: '' }` nodes are removed.
 */
function slateEqualIgnoringIds(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    const fa = a.filter((n) => !isEmptyTextNode(n));
    const fb = b.filter((n) => !isEmptyTextNode(n));
    if (fa.length !== fb.length) return false;
    return fa.every((item, i) => slateEqualIgnoringIds(item, fb[i]));
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

  // Prefer the live schema from the bridge (built from the blockPathMap's
  // _schemas, already resolved via schemaEnhancers) when a caller didn't
  // pass one explicitly. This avoids persisting blocksConfig to disk just
  // to drive annotation checks in the spec.
  if (!blockSchema?.properties) {
    const blockUid = await block.getAttribute('data-block-uid');
    if (blockUid) {
      const bridgeSchema = await block.evaluate(
        (_el, uid) => (window as any).__hydraBridge?.getBlockSchema?.(uid) || null,
        blockUid,
      );
      if (bridgeSchema?.properties) blockSchema = bridgeSchema;
    }
  }

  // Every schema-declared slate field needs a [data-edit-text="<field>"]
  // container in the rendered DOM — even when the field's value is null or
  // empty (the placeholder is where the editor will insert new content).
  // Without a schema, fall back to detecting slate shapes in populated data.
  let slateFields: string[];
  let slateHasValue: (field: string) => boolean;
  if (blockSchema?.properties) {
    slateFields = Object.entries(blockSchema.properties)
      .filter(([, prop]) => (prop as Record<string, unknown>)?.widget === 'slate')
      .map(([field]) => field);
    slateHasValue = (field) => {
      const v = blockData[field];
      return Array.isArray(v) && v.length > 0;
    };
  } else {
    slateFields = findSlateFields(blockData);
    slateHasValue = () => true;
  }

  const blockType = (blockData?.['@type'] as string | undefined) ?? '(unknown)';
  const coverageUid = (await block.getAttribute('data-block-uid')) ?? '(no uid)';
  for (const field of slateFields) {
    // Accept either a descendant [data-edit-text="<field>"] OR the block
    // element itself carrying the attribute (renderers are free to collapse
    // the block wrapper and the edit-text container onto one element).
    const blockHasAttr = (await block.getAttribute('data-edit-text')) === field;
    const container = blockHasAttr ? block : block.locator(`[data-edit-text="${field}"]`).first();
    const hasContainer = (await container.count()) > 0;

    // Record editability rather than failing per-instance: a slate field only
    // needs its edit container in ONE example of a block type. Some fields are
    // gated by an optional synced element (e.g. a card's `description` behind
    // the grid's `copy` element) and legitimately don't render in every
    // example. A final aggregate test (slateFieldsNeverEditable) fails only if
    // a field is never editable in ANY example. On a miss, capture which
    // data-edit-text values ARE present for the aggregate's diagnostic.
    if (!hasContainer) {
      const context = await block.evaluate((el) => {
        const outer = (el.outerHTML || '').slice(0, 200);
        const self = el.getAttribute('data-edit-text');
        const descendants = Array.from(el.querySelectorAll('[data-edit-text]'))
          .map((d) => `${d.tagName.toLowerCase()}[data-edit-text="${d.getAttribute('data-edit-text')}"]`);
        return { outer, self, descendants };
      });
      recordSlateFieldContainer(
        blockType,
        field,
        false,
        `[${coverageUid}] own data-edit-text: ${context.self ?? '(none)'}; ` +
          `descendants: ${context.descendants.length ? context.descendants.join(', ') : '(none)'}; ` +
          `html: ${context.outer}`,
      );
      continue;
    }
    recordSlateFieldContainer(blockType, field, true, `[${coverageUid}]`);

    // Empty/null slate fields have the edit-text container (checked above) but
    // nothing to round-trip — the renderer has no source value to mirror into
    // the DOM.
    if (!slateHasValue(field)) continue;

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
}

/**
 * Schema-INDEPENDENT coverage check: every block/field the frontend actually
 * renders as editable must be known to the bridge's blockPathMap.
 *
 * `checkSubBlocks` walks the OTHER direction (pathMap → DOM: "is every block
 * the pathMap knows about rendered?"). That direction is blind to an
 * incomplete schema: if a frontend registers e.g. `slateTable` with an empty
 * schema, buildBlockPathMap can't see `table → rows → cells`, so the cells are
 * simply ABSENT from the pathMap — yet the frontend still renders them from
 * data. pathMap → DOM then iterates nothing and passes, while the cells are
 * un-selectable / un-editable / un-navigable (no pathInfo → parentAddMode
 * undefined, field type unresolved). That is precisely how an incomplete
 * schema slipped through to a silent table-navigation failure.
 *
 * This check closes the gap by walking DOM → pathMap: for the rendered block
 * subtree, assert every nested `[data-block-uid]` has a pathMap entry. It needs
 * no blocksConfig — it reads the live bridge — so it runs in CI unconditionally
 * (unlike the schema-driven discovery checks, which are gated on MOCK_PARENT_URL
 * and traverse schema-first, so they can't see missing nested structure).
 *
 * Scope, to stay false-positive-free:
 *  - Only rendered `[data-block-uid]`s are checked (a concrete "this is an
 *    editable block" signal). We deliberately do NOT flag unresolved
 *    `data-edit-*` fields: page-level fields (`/title`) and listing-projected
 *    block fields (a teaser inside a grid) legitimately render edit
 *    annotations that aren't in THIS block's editable pathMap.
 *  - Read-only subtrees (`data-block-readonly` — listing results, teasers) are
 *    skipped: their inner markup is projected content, not editable blocks.
 *  - Items that reuse the parent's uid (listing expansion) are skipped.
 */
export async function verifyPathMapCoverage(
  iframe: FrameLocator,
  blockId: string,
): Promise<void> {
  const block = iframe.locator(`[data-block-uid="${blockId}"]`).first();
  const orphans = await block.evaluate((el, parentUid) => {
    const b = (window as any).__hydraBridge;
    // No bridge (e.g. a pure render harness) → nothing to assert against.
    if (!b?.blockPathMap) return null;
    const pathMap = b.blockPathMap;

    // Dynamic-container block types render interactive `data-block-uid`
    // children that are intentionally NOT part of the editable pathMap:
    // `search` (facets widget + results listing) and `listing`/
    // `contextNavigation` (async-fetched results). Those are a different
    // editability model, not the static-nested-editable-block class this
    // guardrail targets — skip them wholesale to stay false-positive-free.
    const DYNAMIC = new Set(['search', 'listing', 'contextNavigation']);
    if (DYNAMIC.has(pathMap[parentUid]?.blockType)) return [];

    const found: string[] = [];
    el.querySelectorAll('[data-block-uid]').forEach((child: Element) => {
      const uid = child.getAttribute('data-block-uid');
      // Skip self, listing-expanded items reusing the parent uid, and read-only
      // (projected) subtrees.
      if (!uid || uid === parentUid) return;
      if (child.closest('[data-block-readonly]')) return;
      if (!pathMap[uid]) found.push(uid);
    });
    return Array.from(new Set(found));
  }, blockId);

  if (orphans === null) return; // no bridge

  expect(
    orphans,
    `Blocks rendered inside "${blockId}" but ABSENT from the pathMap — they can't be ` +
      `selected, edited, moved or navigated. This means their container field isn't ` +
      `declared (or is incompletely declared) in the frontend's block schema, so ` +
      `buildBlockPathMap never descended into it: ${orphans.join(', ')}`,
  ).toEqual([]);
}

/**
 * Full block rendering verification: locate block, check text, check edit
 * annotations, verify sub-blocks, and click data-edit-text elements.
 *
 * Schema + sub-block discovery come from the bridge's blockPathMap inside
 * the iframe — no blocksConfig plumbing needed. Callers must render the
 * block through an iframe with `initBridge()` already run.
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
  } = options;

  // Listing blocks: expandListingBlocks sets @uid=parentId on all items,
  // so multiple elements share the same data-block-uid. The frontend
  // resolves items async (fetch + render), so we have to wait for the
  // count to STABILISE rather than reading it once — otherwise we race
  // the next item's render and assert on a stale snapshot. Two
  // consecutive same-value reads = stable.
  if (isListing) {
    const items = iframe.locator(`[data-block-uid="${blockId}"]`);
    await expect(items.first()).toBeVisible({ timeout: 15000 });
    let prev = -1;
    await expect.poll(async () => {
      const n = await items.count();
      const stable = n === prev && n >= 2;
      prev = n;
      return stable;
    }, { timeout: 15000, intervals: [200, 400, 800] }).toBe(true);
    await checkEditAnnotations(items.first(), blockData);
    return;
  }

  // Wait for block to render in iframe.
  //
  // Some blocks have no fields of their own — they only project page-level
  // metadata (title, description, leadimage, etc.). When that metadata is
  // empty the frontend may legitimately omit the wrapper rather than
  // render a zero-height invisible div. Detect this from blockData shape:
  // a block whose only keys are @type plus template-system fields has no
  // own content, so its render depends entirely on page-level data and
  // "absent on empty data" is a correct outcome, not a renderer bug.
  const TEMPLATE_SYSTEM_KEYS = new Set([
    '@type',
    'fixed',
    'readOnly',
    'templateId',
    'templateInstanceId',
    'slotId',
  ]);
  const isFieldlessBlock = blockData
    && Object.keys(blockData).every((k) => TEMPLATE_SYSTEM_KEYS.has(k));

  const block = iframe.locator(`[data-block-uid="${blockId}"]`);
  if (isFieldlessBlock && (await block.count()) === 0) {
    return; // metadata-projection block legitimately rendered nothing
  }
  await expect(block.first()).toBeVisible({ timeout: 15000 });

  // A data-block-uid may match several elements. That is legitimate for a
  // listing/container block whose expanded items carry the parent uid
  // (expandListingBlocks — see listing-links.tsx), but ONLY when the matches are
  // contiguous: the container element contains all the rest. The same block
  // rendered twice in separate DOM subtrees is a real bug. Discovery flags the
  // literal `listing` type (handled above); this covers the container blocks
  // that hold one (footer/tags/linkList, search results).
  if ((await block.count()) > 1) {
    const contiguous = await block.first().evaluate(
      (first, uid) =>
        Array.from(document.querySelectorAll(`[data-block-uid="${uid}"]`)).every(
          (el) => el === first || first.contains(el),
        ),
      blockId,
    );
    expect(
      contiguous,
      `data-block-uid="${blockId}" appears on unrelated elements (a block rendered twice); a shared uid is only valid for a listing/container whose items nest inside it`,
    ).toBe(true);
    await checkEditAnnotations(block.first(), blockData);
    return;
  }

  // Verify expected text content renders
  if (expectedText) {
    await expect(block).toContainText(expectedText);
  }

  // Verify edit annotations
  await checkEditAnnotations(block, blockData);

  // Schema-driven slate check — checkSlateAnnotations pulls the schema
  // from the bridge itself (authoritative, schemaEnhancer-resolved).
  await checkSlateAnnotations(block, blockData);

  // Schema-INDEPENDENT coverage: every rendered nested block + editable field
  // must be known to the pathMap. Catches incomplete frontend schemas that the
  // schema-driven checks (disabled in CI, and blind to gaps they have no
  // schema path into) can't — e.g. a slateTable whose cells render but are
  // absent from the pathMap. Runs off the live bridge, so it needs no config.
  await verifyPathMapCoverage(iframe, blockId);

  // Verify sub-blocks (before clicking, which may toggle interactive
  // containers like accordions closed). Sub-blocks come from the bridge's
  // blockPathMap — canonical nested-block tree with schema-driven
  // container traversal (blocks_layout and object_list handled uniformly).
  if (checkSubBlocks && blockData) {
    const subBlocks = await block.evaluate((_el, parentUid) => {
      const b = (window as any).__hydraBridge;
      if (!b?.blockPathMap) {
        throw new Error(
          'verifyBlockRendering: __hydraBridge.blockPathMap not available — ' +
            'the block must be rendered inside an iframe with initBridge() run.',
        );
      }
      const pathMap = b.blockPathMap;
      const isDescendant = (uid: string): boolean => {
        let cur = pathMap[uid]?.parentId;
        while (cur) {
          if (cur === parentUid) return true;
          cur = pathMap[cur]?.parentId;
        }
        return false;
      };
      return Object.keys(pathMap)
        .filter((k) => !k.startsWith('_') && isDescendant(k))
        .map((uid) => ({ id: uid, data: b.getBlockData?.(uid) || null }))
        .filter((s: { id: string; data: unknown }) => !!s.data && typeof s.data === 'object');
    }, blockId) as SubBlock[];

    let anyVisible = false;
    for (const { id, data } of subBlocks) {
      const loc = iframe.locator(`[data-block-uid="${id}"]`).first();
      await expect(loc).toBeAttached({ timeout: 5000 });
      if (await loc.isVisible()) {
        anyVisible = true;
        await checkEditAnnotations(loc, data);
        await checkSlateAnnotations(loc, data);
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
