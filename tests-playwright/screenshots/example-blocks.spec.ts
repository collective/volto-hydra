/**
 * Per-block example-page screenshot capture.
 *
 * For each docs/examples/<slug>.md page, opens /docs/examples/<slug>/edit,
 * selects the block instance that the page is showcasing, and writes a
 * full-page screenshot into docs/examples/_images/<slug>-edit.png.
 *
 * The example .md files carry no image reference — the screenshot is
 * Plone-only; it documents the live editor, not the Sphinx build. On the
 * next `node docs/sync.mjs`, sync discovers docs/examples/_images/*.png
 * directly, materialises a Plone Image at /docs/images/<slug>-edit
 * (Phase 5), and injects an `image` block into the example page's Plone
 * content just below its title (Phase 5b). The synced Image content +
 * blob are committed; the docs/examples/_images/ originals are git-
 * ignored regenerable staging files.
 *
 * Run with:
 *   pnpm exec playwright test --project=screenshots-nuxt \
 *     tests-playwright/screenshots/example-blocks.spec.ts
 *
 * Manual / on-demand. Same project as the editor-guide screenshots so we
 * get the 1440x900 viewport + Nuxt iframe for a polished render.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { URL } from '../ports';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'examples', '_images');
const EXAMPLES_CONTENT_DIR = path.join(
  REPO_ROOT,
  'docs',
  'content',
  'content',
  'content',
  'docs',
  'examples',
);

fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Each entry: docs/examples/<slug>.md gets a screenshot of the first
 * block whose @type matches `blockType` on /docs/examples/<slug>. Pages
 * whose data.json contains no live instance of their headline block
 * (columns, contextNavigation, hero, slider, …) are omitted; those
 * pages document the block via codeExample fences only.
 */
const EXAMPLES: Array<{ slug: string; blockType: string }> = [
  { slug: 'accordion', blockType: 'accordion' },
  { slug: 'button', blockType: 'button' },
  { slug: 'form', blockType: 'form' },
  { slug: 'highlight', blockType: 'highlight' },
  { slug: 'image-block', blockType: 'image' },
  { slug: 'introduction', blockType: 'introduction' },
  { slug: 'listing', blockType: 'listing' },
  { slug: 'maps', blockType: 'maps' },
  { slug: 'search', blockType: 'search' },
  { slug: 'separator', blockType: 'separator' },
  { slug: 'slate', blockType: 'slate' },
  { slug: 'table', blockType: 'slateTable' },
  { slug: 'teaser', blockType: 'teaser' },
  { slug: 'toc', blockType: 'toc' },
  { slug: 'video', blockType: 'video' },
];

/**
 * Find the first block UID on the page whose @type matches `blockType`.
 * Reads the same data.json the mock-api serves (mount-point `/` ->
 * docs/content/content/content), so the UID is what the iframe will
 * render.
 *
 * Skips the `editor-screenshot` block: sync.mjs Phase 5b injects one
 * `@type: image` block (the page's own editor screenshot) into every
 * example page, and it would otherwise shadow the real `image` example
 * block when blockType==='image'.
 */
function firstBlockUidOfType(slug: string, blockType: string): string {
  const dataPath = path.join(EXAMPLES_CONTENT_DIR, slug, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const items: string[] = data.blocks_layout?.items || [];
  for (const uid of items) {
    if (uid === 'editor-screenshot') continue;
    if (data.blocks?.[uid]?.['@type'] === blockType) return uid;
  }
  throw new Error(
    `No block of @type=${blockType} found in ${dataPath}; ` +
      `update EXAMPLES or the example fixture.`,
  );
}

test.describe('docs/examples/* screenshots', () => {
  // Example pages are heavy — codeExample blocks, nested listings, the
  // cnav force-rule — so allow more than the default per-test budget.
  test.setTimeout(90_000);

  for (const { slug, blockType } of EXAMPLES) {
    test(`${slug} — ${blockType} block selected`, async ({ page }) => {
      // contentPrefix='' so navigateToEdit hits /docs/examples/<slug>/edit
      // directly (not /_test_data/...).
      const helper = new AdminUIHelper(page, URL.voltoSsr, '');
      await helper.login();
      await helper.navigateToEdit(`/docs/examples/${slug}`);

      const uid = firstBlockUidOfType(slug, blockType);
      const iframe = helper.getIframe();
      const blockEl = iframe.locator(`[data-block-uid="${uid}"]`).first();
      await blockEl.waitFor({ state: 'attached', timeout: 15000 });

      // Pick which editable element to click. `.locator` descends to any
      // depth. When the container holds *restricted* child blocks — form
      // fields, search facets: block types that only exist inside their
      // parent — prefer the first editable that belongs to one of those
      // children. Editing the restricted child is the point of the
      // example (a bare form/search block has little to show), and the
      // container's own editable (a form's `data-edit-text="title"`) sits
      // first in DOM order and would otherwise win. The renderer marks
      // each restricted typed child with `data-block-type`; regular
      // blocks carry only `data-block-uid`. Otherwise click the first
      // editable; with no editable at all (e.g. separator) select the
      // block itself via the bridge.
      const editSel = '[data-edit-text], [data-edit-link], [data-edit-media]';
      const pick = await blockEl.evaluate((root, sel) => {
        const all = Array.from(root.querySelectorAll(sel));
        let fallback = -1;
        for (let i = 0; i < all.length; i++) {
          const owner = all[i].closest('[data-block-uid]');
          if (!owner) continue;
          if (fallback === -1) fallback = i;
          if (owner !== root && owner.hasAttribute('data-block-type')) {
            return {
              index: i,
              uid: owner.getAttribute('data-block-uid'),
              restricted: true,
            };
          }
        }
        if (fallback === -1) return null;
        return {
          index: fallback,
          uid: all[fallback]
            .closest('[data-block-uid]')
            ?.getAttribute('data-block-uid'),
          restricted: false,
        };
      }, editSel);

      let selectedUid = uid;
      if (pick) {
        if (pick.restricted && !pick.uid) {
          throw new Error(
            `${slug}: restricted child block is missing a data-block-uid`,
          );
        }
        selectedUid = pick.uid || uid;
        const editable = blockEl.locator(editSel).nth(pick.index);
        await editable.scrollIntoViewIfNeeded();
        await editable.click();
      } else {
        await blockEl.evaluate((el) => {
          (window as any).bridge?.selectBlock(el);
        });
      }
      await helper.waitForBlockSelectedInAdmin(selectedUid);

      // Give the block's form a chance to portal into #sidebar-properties
      // before we snap. Some block types render their UI via
      // ChildBlocksWidget rather than flat fields, so accept any populated
      // child element; a few (separator) have no sidebar form at all.
      const blockForm = page.locator('#sidebar-properties');
      for (let i = 0; i < 25; i++) {
        if ((await blockForm.locator('*').count()) > 0) break;
        await page.waitForTimeout(100);
      }

      // Scroll the block form into view inside the sidebar — page metadata
      // sits above it and on tall content pushes it below the fold.
      if (await blockForm.count()) {
        await blockForm.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      }

      // Allow selection chrome + any final layout shifts to settle.
      await page.waitForTimeout(300);

      // hydra.js paints red diagnostic overlays in the iframe when
      // something is wrong: #hydra-bridge-diagnostic (bridge couldn't
      // reach the admin) and #hydra-dev-warning (e.g. a Slate field with
      // no data-node-id — selection sync broken). Either means the
      // screenshot would ship a broken-looking editor, so fail loudly
      // rather than capture it.
      const diagnostic = helper
        .getIframe()
        .locator('#hydra-bridge-diagnostic, #hydra-dev-warning');
      await expect(
        diagnostic,
        'hydra.js diagnostic overlay present (bridge-not-connected or ' +
          'missing data-node-id) — fix the underlying issue, do not ship ' +
          'this screenshot.',
      ).toHaveCount(0);

      // The Quanta toolbar starts every block selection faded to
      // opacity:0 and only un-fades on pointer activity over the iframe
      // (SyncedSlateToolbar `isFaded`); selecting a block leaves none —
      // bridge.selectBlock fires no pointer events, and a programmatic
      // click's MOUSE_ACTIVITY is overridden by the block-change reset.
      //
      // Re-emit hydra's MOUSE_ACTIVITY by dispatching a `mousemove` on
      // the frontend document — the exact event hydra's reporter listens
      // for. A real Playwright mouse move is no good: blocks like `video`
      // fill themselves with a cross-origin embed <iframe> that swallows
      // the pointer event before hydra's document-level listener sees it.
      // hydra throttles MOUSE_ACTIVITY to 1/sec (hydra.js
      // setupMouseActivityReporter), so dispatch on every poll iteration
      // until one clears the throttle and the toolbar is fully painted.
      // isVisible()/toBeVisible() do NOT detect opacity, so without this
      // assertion a faded toolbar would silently ship a screenshot with
      // no toolbar.
      const toolbar = page.locator('.quanta-toolbar').first();
      await expect(toolbar).toBeAttached();
      const selectedBlockLoc = iframe
        .locator(`[data-block-uid="${selectedUid}"]`)
        .first();
      await expect
        .poll(
          async () => {
            await selectedBlockLoc.evaluate((blockEl) => {
              const r = blockEl.getBoundingClientRect();
              blockEl.ownerDocument.dispatchEvent(
                new MouseEvent('mousemove', {
                  bubbles: true,
                  clientX: r.x + r.width / 2,
                  clientY: r.y + Math.min(60, r.height / 2),
                }),
              );
            });
            return toolbar.evaluate((el) => getComputedStyle(el).opacity);
          },
          {
            message:
              'Quanta toolbar stayed faded — the docs screenshot would ' +
              'have no toolbar.',
            timeout: 8000,
            intervals: [500],
          },
        )
        .toBe('1');

      const file = path.join(OUT_DIR, `${slug}-edit.png`);
      await page.screenshot({ path: file, fullPage: false });
      expect(fs.existsSync(file)).toBe(true);
      console.log(
        `[screenshot] ${slug} -> ${path.relative(process.cwd(), file)}`,
      );
    });
  }
});
