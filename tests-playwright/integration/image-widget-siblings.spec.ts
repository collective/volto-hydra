/**
 * ImageWidget sibling preservation on save.
 *
 * Bug reproducer. When a block schema declares an `image` field with
 * `widget: 'image'`, Hydra's ImageWidget storage convention is:
 *
 *   block.image        = "<url string>"
 *   block.image_field  = "image"                 (sibling)
 *   block.image_scales = { image: [...scales] }  (sibling)
 *
 * The two sibling fields carry the brain metadata needed for the frontend
 * to build srcset URLs from Plone's standard scale set. Without them, the
 * frontend has only an opaque URL and can't do responsive image loading.
 *
 * On pretagovsite-frontend.fly.dev we observed homepage hero saves landing
 * with `block.image` = string URL but BOTH siblings missing. This test
 * isolates the question: does the save path drop the siblings?
 *
 * Fixture page:
 *   /_test_data/image-widget-siblings-test
 * has a hero block already populated with image + image_field + image_scales.
 * We open it in admin, click Save with no changes, capture the PATCH body
 * the bridge sends to the API, and assert all three fields are present in
 * the persisted block payload.
 *
 * Expected: test FAILS today on the prod-symptom case → bug confirmed →
 * proceed to fix Hydra's save path. When fixed, this test should pass.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const FIXTURE_PATH = '/_test_data/image-widget-siblings-test';
const BLOCK_UID = 'block-hero-with-siblings';

test.describe('ImageWidget sibling preservation', () => {
  test('PATCH on save preserves image_field and image_scales siblings (no changes)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    // Capture every PATCH the admin sends to the API. The hydra bridge
    // batches form data and PATCHes the content path on save.
    const contentPatches: Array<{ url: string; body: any }> = [];
    page.on('request', (req) => {
      if (req.method() !== 'PATCH') return;
      if (!req.url().startsWith('http://localhost:8888')) return;
      let body: any = null;
      try { body = req.postDataJSON(); } catch { /* not JSON */ }
      if (!body) return;
      contentPatches.push({ url: req.url(), body });
    });

    await helper.login();
    await helper.navigateToEdit(FIXTURE_PATH);

    // No edits — we're testing the idempotent round-trip. If save drops the
    // siblings, that proves the save path is the bug (not user input).
    await helper.saveContent();

    // We expect at least one PATCH targeting the fixture path.
    const fixturePatches = contentPatches.filter((r) =>
      r.url.includes(FIXTURE_PATH)
    );
    expect(
      fixturePatches.length,
      `expected ≥1 PATCH to ${FIXTURE_PATH}; captured PATCHes: ${
        JSON.stringify(contentPatches.map((p) => p.url))
      }`,
    ).toBeGreaterThanOrEqual(1);

    // Most recent PATCH is the save we just triggered.
    const lastPatch = fixturePatches[fixturePatches.length - 1];
    const block = lastPatch.body?.blocks?.[BLOCK_UID];

    expect(
      block,
      `PATCH body must include the hero block ${BLOCK_UID}; got blocks=${
        JSON.stringify(Object.keys(lastPatch.body?.blocks || {}))
      }`,
    ).toBeTruthy();

    // The image URL itself MUST survive (basic sanity).
    expect(block.image, 'block.image (URL string) must be in PATCH').toBeTruthy();
    expect(typeof block.image, 'block.image expected to be a string per ImageWidget convention')
      .toBe('string');

    // The two sibling fields are the question. These are what carry the
    // brain metadata for responsive image loading. If either is missing,
    // the saved data is unusable for srcset construction.
    expect(
      block.image_field,
      `block.image_field sibling must survive save; got ${JSON.stringify(block.image_field)}`,
    ).toBe('image');
    expect(
      block.image_scales,
      `block.image_scales sibling must survive save; got ${JSON.stringify(block.image_scales)}`,
    ).toBeTruthy();
    expect(
      block.image_scales?.image?.[0]?.scales,
      'image_scales[image][0].scales (the actual scales map) must survive save',
    ).toBeTruthy();
  });
});
