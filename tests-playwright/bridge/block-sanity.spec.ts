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
 *   CONTAINMENT_EXEMPT_SLOTS
 *                        - comma-separated template slot ids where a block may
 *                          sit outside its container's allowedBlocks on purpose
 *                          (e.g. a docs site's component showcase slot). See
 *                          readContainmentRules in helpers/discover-blocks.cjs.
 *
 * Works against any Plone API — mock or remote.
 */
import { test as base, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { verifyBlockRendering } from '../helpers/BlockVerificationHelper';
import { fieldsNeverEditable } from '../helpers/field-coverage';
import { axeCheckPage, formatViolations } from '../helpers/axe-sanity';
import { getFrontendUrl } from './fixtures';
import { URLS } from '../ports';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { requireEnvironment } from '../helpers/preconditions';
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
  // Set by discovery for a locked block found on its own template document.
  // The instance to unlock is read from the bridge at runtime — see below.
  needsUnlock?: boolean;
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
  // Scope BEFORE environment: a project this spec doesn't cover is a decision,
  // and no CI change would make it run — so it skips even on CI. Discovery
  // missing is the opposite, hence requireEnvironment below.
  if (!SANITY_PROJECTS.has(testInfo.project.name)) {
    testInfo.skip(true, `block-sanity only runs on mock/nuxt/nextjs (skipping ${testInfo.project.name})`);
  }
  requireEnvironment(
    testInfo,
    discoveredBlocks.length > 0,
    'no .discovered-blocks.json — discovery needs DISCOVER_BLOCKS_API=<mock api url> in this job',
  );
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
      test(`${block.blockType} block has an editable content example to render`, () => {
        throw new Error(
          `Block @type "${block.blockType}" is registered in the frontend but no EDITABLE content ` +
            `example exists to run its render test. Add a fixture (a page with a populated ` +
            `instance), or mark the type restricted if it only belongs inside a parent container.\n\n` +
            `Locked instances don't count: a /templates/* definition, or a block flagged ` +
            `readOnly/fixed, cannot be edited by an author, so the editing checks would be ` +
            `asserting the opposite of what that block is for.`,
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

      // Site chrome (a footer, a global announcement) is authored on its
      // template's own document, where its blocks are locked until the template
      // is unlocked — the gesture that says "this changes everywhere", and the
      // one an author makes before editing it anywhere. Unlocking is a single
      // message; the admin's toggle sends the same one.
      //
      // The instance id comes from the BRIDGE, not from discovery. It identifies
      // one application of a template and the merge mints it
      // (`const instanceId = uuidGenerator()`), so stored content cannot say what
      // it will be; deriving it offline worked only for the deterministic cases
      // and failed as "stayed locked" for the rest. Reading it here also makes
      // "locked with nothing able to unlock it" a legible failure instead of a
      // silent mismatch.
      if (block.needsUnlock) {
        const frame = page.frames().find((f) => f !== page.mainFrame())!;
        const instanceId = await frame.evaluate((uid) => {
          const bridge = (window as any).__hydraBridge;
          let found: string | null = null;
          const walk = (blocks: Record<string, any>) => {
            for (const [id, b] of Object.entries(blocks || {})) {
              if (!b || typeof b !== 'object') continue;
              if (id === uid) found = b.templateInstanceId ?? null;
              for (const [key, value] of Object.entries<any>(b)) {
                if (key === 'blocks' && value && typeof value === 'object') walk(value);
                else if (value && typeof value === 'object' && value.blocks) walk(value.blocks);
              }
            }
          };
          walk(bridge?.formData?.blocks || {});
          return found;
        }, block.blockId);

        expect(
          instanceId,
          `${block.blockType} block "${block.blockId}" is readOnly with no templateInstanceId — ` +
            `nothing can unlock it, so it is uneditable everywhere`,
        ).toBeTruthy();

        await page.evaluate((id) => {
          (document.getElementById('previewIframe') as HTMLIFrameElement)
            .contentWindow!.postMessage(
              { type: 'TEMPLATE_EDIT_MODE', instanceIds: [id] },
              '*',
            );
        }, instanceId);

        await expect
          .poll(
            () =>
              frame.evaluate(
                (uid) => !(window as any).__hydraBridge?.isBlockReadonly(uid),
                block.blockId,
              ),
            { message: `${block.blockType} stayed locked after unlocking instance ${instanceId}` },
          )
          .toBe(true);
      }

      const iframe = helper.getIframe();

      await verifyBlockRendering(page, iframe, block.blockId, block.blockData, {
        isListing: block.isListing,
        // Sub-block iteration uses the bridge's blockPathMap (canonical,
        // schema-resolved) rather than a shape heuristic on blockData.
        checkSubBlocks: true,
        // Click the block's first editable field and require that it actually
        // becomes editable. Annotation presence alone is not the contract an
        // author experiences: a component whose own JS reveals or rebuilds its
        // DOM can carry every annotation and still be impossible to type into.
        checkEditTextClicks: true,
      });

      // Accessibility pass (axe-core) over the WHOLE rendered fixture page —
      // not scoped to this one block — so document-outline rules (heading-order)
      // are judged in context. serious/critical WCAG A/AA violations (incl.
      // heading-order) BLOCK; advisory (moderate/minor, best-practice-only, or
      // page-SHELL rules a minimal fixture can't be judged on) is logged only.
      // OPT-IN: off by default (the mock fixtures aren't a11y-clean and their
      // cosmetics aren't what block-sanity guards — real-site a11y is enforced
      // elsewhere). Run the a11y pass with SANITY_AXE=1.
      //
      // Some doc pages deliberately render MULTIPLE instances of a layout-chrome
      // component (header/masthead/main-nav) as structural-parity examples. That
      // duplication trips axe's duplicate-id / one-landmark rules — but the
      // chrome's a11y is already proven by the SINGLE live instance on every
      // other page (the layout renders it everywhere), so axe is skipped on the
      // example page rather than exempting a pile of rules there.
      const AXE_SKIP_PAGES = ['/components/header'];
      const axeSkipped = AXE_SKIP_PAGES.some((p) =>
        (block.pagePath || '').startsWith(p),
      );
      if (process.env.SANITY_AXE && !axeSkipped) {
        const { blocking, advisory } = await axeCheckPage(iframe);
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

  // Aggregate check: every schema-declared canvas-editable field — slate/textarea
  // (data-edit-text), media (data-edit-media) and link (data-edit-link) — must
  // expose its edit annotation in AT LEAST ONE discovered example of its block
  // type. The per-example render checks above record coverage instead of failing
  // individually, because a field can be gated by an optional synced element
  // (e.g. a card's `description` behind the grid's `copy` element) or empty in a
  // given example and legitimately not render there. Bare text/string fields
  // (e.g. an image block's sidebar-only `alt`) are excluded — they carry no
  // canvas annotation. This runs last (defined after the per-block loop;
  // block-sanity is serial) so coverage is fully accumulated.
  // Was the "registered type has no content example" check even RUN?
  //
  // discoverBlocks builds its required set only when frontendKeys is non-empty
  // — i.e. when a frontend's INIT schemas were fetched via MOCK_PARENT_URL. CI
  // does not set it, so every CI run has skipped that check while reporting
  // green. With schemas, it flags types that nothing renders anywhere.
  //
  // A skipped check and a passing check look identical from a green tick, which
  // is the failure this repo keeps finding in its own gates (see #306). So the
  // skip is now stated out loud: opt out deliberately with
  // BLOCK_SANITY_NO_EXAMPLE_COVERAGE=1 when running a schema-less sweep.
  test('example coverage was actually measured', () => {
    const covPath = path.resolve(__dirname, '../../.discovered-coverage.json');
    const cov = fs.existsSync(covPath)
      ? JSON.parse(fs.readFileSync(covPath, 'utf-8'))
      : { measured: false, possible: Boolean(process.env.FRONTEND_URL), frontendKeys: 0 };

    if (process.env.BLOCK_SANITY_NO_EXAMPLE_COVERAGE === '1' || cov.possible === false) {
      // No example frontend in this job (bridge-only sweep), or the skip was
      // declared deliberately. Either way the fact is recorded rather than
      // implied by a green tick.
      test.info().annotations.push({
        type: 'coverage',
        description: cov.possible === false
          ? 'example coverage impossible: no frontend (FRONTEND_URL unset)'
          : 'example coverage deliberately not measured',
      });
      return;
    }

    expect(
      cov.measured,
      'Example coverage was NOT measured even though a frontend was available: discovery ' +
        'received 0 schemas from it, so ' +
        '"registered block type has no content example" was never checked. Set ' +
        'MOCK_PARENT_URL + FRONTEND_URL so globalSetup can fetch the frontend INIT, ' +
        'or set BLOCK_SANITY_NO_EXAMPLE_COVERAGE=1 to say the skip is intended.',
    ).toBe(true);
  });

  test('every canvas-editable field is editable in at least one example', () => {
    const never = fieldsNeverEditable();
    expect(
      never,
      `Canvas-editable fields with NO edit annotation in ANY discovered example ` +
        `(each is uneditable everywhere it appears):\n` +
        never
          .map((n) => `  - ${n.blockType}.${n.field} (${n.kind})\n      e.g. ${n.example}`)
          .join('\n'),
    ).toEqual([]);
  });
});
