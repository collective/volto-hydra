import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Regression test for the editor crash
 *   "Cannot assign to read only property 'download' of object '#<Object>'"
 * surfaced through react-beautiful-dnd's error boundary as
 *   "Sorry, something went wrong with your request".
 *
 * Root cause: flattenScales (helpers/Url/Url) mutated `scales[key].download`
 * in place on the FROZEN Redux image data — it is the only `.download =`
 * writer in Volto. The admin component that feeds it frozen scales is the
 * Image block sidebar (Blocks/Image/ImageSidebar.jsx), which renders
 * `<Image item={{ image_scales }} />` whenever the block data carries an
 * `image_scales` object with a `scales` dict (the shape real Plone serializes
 * for an `@type: image` block — see fixtures/content/image-scales-test).
 *
 * RED on the buggy in-place mutation -> crash on block selection.
 * GREEN once flattenScales builds a new scales object instead of mutating.
 */
test.describe('image block sidebar — frozen image_scales', () => {
  test('selecting an image block does not throw read-only download', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`));

    const helper = new AdminUIHelper(page);
    await helper.login();
    // fixtures/content is mounted at /_test_data by the mock-api server's
    // default CONTENT_MOUNTS; navigateToEdit prepends that contentPrefix.
    await helper.navigateToEdit('/image-scales-test');

    // Raw click — NOT clickBlockInIframe — on purpose. Selecting the image
    // block renders ImageSidebar -> <Image item> -> flattenScales on the
    // frozen image_scales. On the buggy code that throws and App's error
    // boundary recreates the whole tree, so the selection handle never
    // appears; clickBlockInIframe would then fail with an opaque handle
    // timeout instead of the read-only assertion below. The click alone is
    // enough to trigger the sidebar render and the crash.
    const block = helper
      .getIframe()
      .locator('[data-block-uid="image-block-1"]')
      .first();
    await block.waitFor({ state: 'attached', timeout: 10000 });
    await block.scrollIntoViewIfNeeded();
    await block.click();
    await page.waitForTimeout(1000);

    const downloadErrors = errors.filter((e) =>
      /read[- ]only property '?download'?/i.test(e),
    );
    expect(
      downloadErrors,
      `read-only download crash reproduced:\n${downloadErrors.join('\n')}`,
    ).toEqual([]);
  });
});
