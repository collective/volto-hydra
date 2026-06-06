/**
 * Integration coverage for the Url helper shadow that flattens
 * iframe-frontend URLs when the editor pastes them into a link widget.
 * Verifies the value that actually hits the mock API in the save
 * PATCH — not just the helper's pure-function output.
 *
 * Both scenarios use off-host origins registered on a single saved
 * frontend entry as `Name|EditURL|PublishURL`. Neither origin is the
 * Volto admin (publicURL) or the mock API (apiPath), so the ONLY reason
 * flattenToAppURL strips them is the Hydra shadow's getKnownFrontendUrls
 * lookup. Stock Volto would not flatten either; with the shadow loaded,
 * both get flattened to a /path that addAppURL then re-prefixes with
 * apiPath.
 *
 *   1. Editor pastes a URL from the edit origin of a saved frontend.
 *   2. Editor pastes a URL from the publish origin of the same saved
 *      frontend (publish ≠ edit). This is the case Volto's stock helper
 *      can't handle.
 *
 * Deliberately not testing publicURL flattening here — that's Volto's
 * own behavior and depends on RAZZLE_PUBLIC_URL being set in prod,
 * which isn't always true in CI. The shadow is what this PR adds.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { PORTS, URLS } from '../ports';

// Two distinct off-host origins. The test registers both as iframe-frontend
// URLs on a single saved entry (edit + publish). Neither is the Volto admin
// (publicURL) or the mock API (apiPath) — so the ONLY reason flattenToAppURL
// strips them is the Hydra shadow's getKnownFrontendUrls lookup. Stock Volto
// would not flatten either; with the shadow loaded, both get flattened.
//
// Using non-routable hosts on purpose: the test never fetches these URLs,
// it just verifies the link widget's save round-trip strips them from the
// stored slate node.
const EDIT_ORIGIN = 'http://edit.published.example.test';
const PUBLISH_ORIGIN = 'http://www.published.example.test';

test.describe('Url flatten on save (link widget)', () => {
  test.beforeEach(async ({ page }) => {
    // One saved frontend entry with BOTH a distinct edit URL and a publish
    // URL. saved_urls cookie is port-namespaced by Hydra's cookieNames.
    await page.context().addCookies([
      {
        name: `saved_urls_${PORTS.voltoSsr}`,
        value: `Pub|${EDIT_ORIGIN}|${PUBLISH_ORIGIN}`,
        url: URLS.voltoSsr,
      },
    ]);
  });

  const runLinkFlattenTest = async (
    page: import('@playwright/test').Page,
    pastedUrl: string,
    expectedPath: string,
  ) => {
    const helper = new AdminUIHelper(page);
    await helper.login();

    // Capture every PATCH that updates the test-page content. The slate
    // node's `data.url` in the body is what proves the shadow works —
    // the iframe's rendered href reflects frontend-side rendering choices
    // and isn't a reliable signal of what was saved.
    const patchBodies: any[] = [];
    page.on('request', (req) => {
      if (
        req.method() === 'PATCH' &&
        req.url().includes('/_test_data/test-page')
      ) {
        try {
          patchBodies.push(JSON.parse(req.postData() || '{}'));
        } catch {
          // Ignore non-JSON bodies; we only care about content updates.
        }
      }
    });

    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    await helper.editBlockTextInIframe(blockId, 'Click here');

    const editor = await helper.getEditorLocator(blockId);
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    const linkInput = await helper.getLinkEditorUrlInput();
    await linkInput.fill(pastedUrl);
    await linkInput.press('Enter');

    // Wait for the link to actually appear in the iframe DOM before
    // saving — otherwise the PATCH may not yet include the link.
    await expect(async () => {
      const blockHtml = await editor.innerHTML();
      expect(blockHtml).toContain('<a ');
      expect(blockHtml).toContain(expectedPath);
    }).toPass({ timeout: 5000 });

    await helper.saveContent();

    expect(
      patchBodies,
      'expected at least one PATCH to the content endpoint',
    ).not.toHaveLength(0);

    const lastPatch = patchBodies[patchBodies.length - 1];
    const blockData = lastPatch.blocks?.[blockId];
    expect(blockData, `block ${blockId} should be in PATCH body`).toBeDefined();

    // The serialised slate node's data.url must be the apiPath-prefixed
    // form — never the pasted iframe-frontend origin. With Volto's stock
    // helpers, both EDIT_ORIGIN and PUBLISH_ORIGIN survive verbatim
    // (isInternalURL doesn't recognise them); with the Hydra shadow
    // loaded, they get stripped to /path then re-prefixed with apiPath.
    const serialised = JSON.stringify(blockData);
    expect(
      serialised,
      'serialised slate must NOT contain the pasted edit origin',
    ).not.toContain(EDIT_ORIGIN);
    expect(
      serialised,
      'serialised slate must NOT contain the pasted publish origin',
    ).not.toContain(PUBLISH_ORIGIN);
    expect(
      serialised,
      'serialised slate must contain the API-prefixed flattened path',
    ).toContain(`${URLS.mockApi}${expectedPath}`);
  };

  test('edit-origin URL (saved frontend) is flattened in the saved PATCH', async ({ page }) => {
    await runLinkFlattenTest(
      page,
      `${EDIT_ORIGIN}/_test_data/another-page`,
      '/_test_data/another-page',
    );
  });

  test('publish-origin URL (different host than edit) is flattened in the saved PATCH', async ({ page }) => {
    await runLinkFlattenTest(
      page,
      `${PUBLISH_ORIGIN}/_test_data/another-page`,
      '/_test_data/another-page',
    );
  });
});
