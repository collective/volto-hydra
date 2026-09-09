/**
 * Selecting a block whose body is an IFRAME.
 *
 * Hydra selects blocks with a capture-phase click listener on the PAGE's
 * document. A click inside a nested browsing context never reaches that
 * document — no bubbling, no capture — so a block whose body is an iframe
 * cannot be selected by clicking the thing itself: the author's click
 * disappears into the embed.
 *
 * That is not a rare shape. An embedded video is an iframe, so is a map, so is
 * the PDF preview (pdfjs-viewer-element is PDF.js in an iframe), so is anything
 * from the embed block. On the NSW frontend none of them can be selected on the
 * canvas. It surfaced as a doc-video recording that clicked a PDF block five
 * different ways and got either an outline with no toolbar or no selection at
 * all.
 *
 * The fixture uses two real blocks rather than hand-made markup: the VIDEO
 * block, which the test frontend renders as a bare iframe, and the MAPS block,
 * which it renders through a custom element holding the iframe in a shadow root
 * (see `defineMapEmbedElement` in the test frontend's renderer, and
 * docs/examples/maps.md). Nothing here needs an embed to LOAD: the iframe
 * element swallows the click whether or not the provider answers, so the tests
 * carry no network dependency.
 */
import { test, expect } from './fixtures';
import { URLS } from '../ports';

const PAGE = '/_test_data/iframe-block-page';
const BLOCK = 'video-embed-1';
// A MAPS block: the test frontend renders it as an iframe inside a custom
// element's shadow root, which is a real PDF preview's shape.
const SHADOW_BLOCK = 'maps-embed-1';

const selectedUid = (helper: any) =>
  helper
    .getIframe()
    .locator('body')
    .evaluate(
      (node: HTMLElement) =>
        (node.ownerDocument.defaultView as any).__hydraBridge?.selectedBlockUid,
    );

test.describe('a block whose body is an iframe', () => {
  test.beforeEach(async ({ page, helper }) => {
    await page.goto(
      `${URLS.testFrontend}/mock-parent.html?api_path=${encodeURIComponent(
        `${URLS.mockApi}${PAGE}`,
      )}`,
    );
    await helper
      .getIframe()
      .locator(`[data-block-uid="${BLOCK}"] iframe`)
      .waitFor({ state: 'attached', timeout: 10000 });
  });

  test('is selected by clicking it', async ({ helper }) => {
    // The middle of the block is the middle of the iframe — exactly where an
    // author clicks a video, a map or a PDF preview.
    await helper.getIframe().locator(`[data-block-uid="${BLOCK}"]`).click();

    await expect.poll(() => selectedUid(helper), { timeout: 5000 }).toBe(BLOCK);
  });

  test('tells the admin its content is an embed, so the toolbar can stay put', async ({
    helper,
    page,
  }) => {
    // The toolbar starts faded and un-fades on MOUSE_ACTIVITY — mousedown and
    // mousemove in the frontend's document. A block whose content is an embed
    // reports neither while the author uses it: the events belong to the embed.
    // Fading is right for ordinary blocks (the toolbar sits over content the
    // author is reading); for an embed it hides the controls seconds into the
    // interaction and nothing brings them back.
    //
    // The bridge is the only side that can see an embed, so it says so.
    await helper.getIframe().locator(`[data-block-uid="${BLOCK}"]`).click();

    await expect
      .poll(
        () =>
          page.evaluate(
            (uid) => (window as any).mockParent.blockSelectedByUid?.[uid]?.hasEmbed,
            BLOCK,
          ),
        { timeout: 5000 },
      )
      .toBe(true);
  });

  test('is still selectable by its own box, as it always was', async ({ helper }) => {
    // The half that works today: a click landing on the block's box rather than
    // the embed. Pinned so a fix for the case above cannot take it away.
    await helper
      .getIframe()
      .locator(`[data-block-uid="${BLOCK}"]`)
      .click({ position: { x: 2, y: 2 } });

    await expect.poll(() => selectedUid(helper), { timeout: 5000 }).toBe(BLOCK);
  });
});

test.describe('a block whose embed is inside a shadow root', () => {
  // The maps block. The test frontend renders it through `<map-embed>`, a
  // custom element that builds its iframe in a shadow root — the shape of
  // `<pdfjs-viewer-element>` and of every consent-gated third-party embed, and
  // the reason the PDF preview could not be selected on the NSW frontend.
  //
  // It is a real, registered block type carrying real content, so every other
  // frontend's block sanity is happy with the fixture page. An invented @type
  // was not: shared content is served to all of them.
  test.beforeEach(async ({ page, helper }) => {
    await page.goto(
      `${URLS.testFrontend}/mock-parent.html?api_path=${encodeURIComponent(
        `${URLS.mockApi}${PAGE}`,
      )}`,
    );
    await helper
      .getIframe()
      .locator(`[data-block-uid="${SHADOW_BLOCK}"] map-embed`)
      .waitFor({ state: 'attached', timeout: 10000 });
  });

  test('is selected by clicking it', async ({ helper }) => {
    // The shadow boundary is why this needs its own case: document.activeElement
    // reports the HOST, not the iframe inside it, and the iframe's closest()
    // cannot reach back out to the block. Focus landing on the host is both the
    // signal and the only way back to the block.
    await helper.getIframe().locator(`[data-block-uid="${SHADOW_BLOCK}"]`).click();

    await expect.poll(() => selectedUid(helper), { timeout: 5000 }).toBe(SHADOW_BLOCK);
  });

  test('reports its embed to the admin, through the shadow root', async ({
    helper,
    page,
  }) => {
    await helper.getIframe().locator(`[data-block-uid="${SHADOW_BLOCK}"]`).click();

    await expect
      .poll(
        () =>
          page.evaluate(
            (uid) => (window as any).mockParent.blockSelectedByUid?.[uid]?.hasEmbed,
            SHADOW_BLOCK,
          ),
        { timeout: 5000 },
      )
      .toBe(true);
  });
});
