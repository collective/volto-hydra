/**
 * Integration coverage for the Url helper shadow that flattens
 * iframe-frontend URLs (admin / publish) when the editor pastes them
 * into a link widget. Verifies the value that actually hits the mock
 * API in the save PATCH — not just the helper's pure-function output.
 *
 * Two scenarios are exercised, both expecting the SAME outcome:
 *
 *   1. Editor pastes a URL from the admin origin
 *      (`settings.publicURL`, http://localhost:3001/...).
 *      Stock Volto already handles this — the test is a control to
 *      prove the harness/save plumbing works.
 *
 *   2. Editor pastes a URL from a registered "publish URL" frontend
 *      that lives at a different origin than the edit frontend.
 *      Stock Volto stores this verbatim (absolute, with publish-origin
 *      prefix) → breaks resolveuid. With the Hydra shadow loaded, the
 *      pasted URL should be flattened to a /path and saved as the
 *      API-prefixed form.
 *
 * The publish-origin URL is set via the saved-URLs cookie BEFORE the
 * edit page loads, so getKnownFrontendUrls picks it up.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { PORTS, URLS } from '../ports';

const PUBLISH_ORIGIN = 'http://www.published.example.com';

test.describe('Url flatten on save (link widget)', () => {
  test.beforeEach(async ({ page }) => {
    // Register a frontend with a publish URL distinct from the edit URL.
    // saved_urls cookie is port-namespaced; voltoSsr is what the browser sees.
    await page.context().addCookies([
      {
        name: `saved_urls_${PORTS.voltoSsr}`,
        value: `Pub|${URLS.testFrontend}|${PUBLISH_ORIGIN}`,
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
    // form — never the pasted origin. With Volto's stock helpers the
    // publish-origin URL survives verbatim (no flatten because
    // isInternalURL doesn't recognise it); with the Hydra shadow loaded,
    // it gets stripped to /path then re-prefixed with apiPath.
    const serialised = JSON.stringify(blockData);
    expect(
      serialised,
      'serialised slate must NOT contain the pasted publish origin',
    ).not.toContain(PUBLISH_ORIGIN);
    expect(
      serialised,
      'serialised slate must NOT contain the admin origin',
    ).not.toContain(URLS.voltoSsr);
    expect(
      serialised,
      'serialised slate must contain the API-prefixed flattened path',
    ).toContain(`${URLS.mockApi}${expectedPath}`);
  };

  test('admin-origin URL is flattened in the saved PATCH', async ({ page }) => {
    await runLinkFlattenTest(
      page,
      `${URLS.voltoSsr}/_test_data/another-page`,
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
