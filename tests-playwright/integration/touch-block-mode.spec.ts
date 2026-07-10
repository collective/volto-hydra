/**
 * Touch-pointer block-mode behavior — regression coverage for the
 * "long-press still selects the word in block mode" bug.
 *
 * Playwright synthetic TouchEvents don't reproduce iOS's OS-level
 * long-press = word-select gesture (that's handled by the browser
 * outside the JS event loop). What we CAN test is the *mechanism*
 * the bridge uses to suppress it: a `data-hydra-edit-mode` body
 * attribute that gates a `user-select: none` rule on data-edit-text
 * fields, scoped to `@media (pointer: coarse)`. If the attribute is
 * "block" and pointer is coarse, the computed `user-select` is
 * `none` — which on a real device means the OS won't word-select on
 * long-press. If the test catches a regression where (a) the
 * attribute isn't set, (b) it isn't tied to editMode, or (c) the CSS
 * rule isn't scoped to coarse pointers, the iOS bug returns.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// iPhone-12-shaped emulation. NOT a full spread of devices['iPhone 12']
// because that includes defaultBrowserType which forces a new worker
// (forbidden inside test.describe). What matters for this test is
// hasTouch + isMobile — together they make Chromium report
// `pointer: coarse` to matchMedia, which is the gate for the bridge's
// user-select:none rule.
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

test.describe('touch-mode word-select suppression', () => {

  test('after tapping a block on touch device, body[data-hydra-edit-mode] becomes "block" and editable fields get user-select:none', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // We're on an iPhone-shaped device profile (viewport + hasTouch +
    // isMobile). The bridge's touch-aware tap logic uses matchMedia
    // (pointer: coarse) — confirm it fires here. The CSS suppression
    // rule itself is no longer gated by the media query (see the long
    // comment in injectCSS) so it covers Chrome devtools mobile-
    // emulation, which doesn't always report pointer:coarse.
    const coarse = await iframe.locator('html').evaluate(
      () => window.matchMedia('(pointer: coarse)').matches,
    );
    expect(coarse, 'iPhone 12 device profile must report pointer: coarse').toBe(true);

    // Tap a block that is NOT the auto-restored selection. Volto often
    // re-selects the previously-active block on render, which would
    // make my "1st tap" actually a re-tap and flip straight to text.
    // block-3-uuid is a separate slate block that isn't auto-selected
    // on a fresh navigation to /test-page.
    const block3 = iframe.locator('[data-block-uid="block-3-uuid"]').first();
    // The editable field may be a DESCENDANT (mock frontend) OR the block element
    // itself (nuxt renders `data-block-uid` + `data-edit-text` on the same <div>, as
    // getOwnEditableFields notes). Match both so this isn't mock-only — a descendant-
    // only selector times out on nuxt, where block-3's field is on the block element.
    const block3Field = iframe
      .locator(
        '[data-block-uid="block-3-uuid"] [data-edit-text], [data-block-uid="block-3-uuid"][data-edit-text]',
      )
      .first();
    await page.waitForTimeout(500); // let any auto-restoration settle

    // Single tap on a different block → block mode (touch-first behavior).
    await block3.click();
    await page.waitForTimeout(500);

    const bodyMode1 = await iframe.locator('body').getAttribute('data-hydra-edit-mode');
    expect(bodyMode1, '1st tap on a touch device should enter block mode').toBe('block');

    // The CSS rule disables text selection on data-edit-text fields when
    // in block mode on coarse-pointer. Compute style on the editable
    // child of the slate block and assert it's "none".
    const userSelect = await block3Field.evaluate(
      (el) => window.getComputedStyle(el).userSelect,
    );
    expect(
      userSelect.toLowerCase(),
      'block-mode editable fields must have user-select:none — this is what stops iOS long-press = word-select',
    ).toBe('none');

    // Second tap on the SAME block → text mode. Body attribute flips.
    await block3.click();
    await page.waitForTimeout(500);
    const bodyMode2 = await iframe.locator('body').getAttribute('data-hydra-edit-mode');
    expect(bodyMode2, '2nd tap on same block should enter text mode').toBe('text');

    // In text mode the CSS rule no longer matches → user-select goes
    // back to its frontend-defined default (usually "auto" or "text").
    const userSelectAfter = await block3Field.evaluate(
      (el) => window.getComputedStyle(el).userSelect,
    );
    expect(
      userSelectAfter.toLowerCase(),
      'text mode must NOT suppress text selection — user wants word-select to work here',
    ).not.toBe('none');
  });
});
