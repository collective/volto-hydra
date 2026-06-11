/**
 * Tests that Hydra does NOT silently mutate host-page CSS.
 *
 * Regression coverage for the "Hydra is messing with css like position when
 * it should never do that" bug. The bridge was setting `position: relative`
 * on every `[data-edit-media]` and `[data-edit-link]` host element through
 * its injected stylesheet, just to anchor a `:hover::after` dashed border.
 * That mutation applied to EVERY matching element on every page load and
 * could silently break any frontend layout that relies on a different
 * position value.
 *
 * Note: `ensureElementsHaveMinSize` (which DOES write inline min-width /
 * min-height) is intentionally left in place — it only fires for truly
 * zero-sized elements (e.g., an empty `<img>` with no src) where the
 * frontend has already failed to give the user a clickable target. The
 * second test below asserts that a non-zero-sized image (the hero image)
 * is NOT touched, which is the contract: Hydra rescues zero-size cases,
 * Hydra does not edit working layouts.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const HERO_MEDIA = '[data-block-uid="block-4-hero"] [data-edit-media="image"]';
const HERO_LINK = '[data-block-uid="block-4-hero"] [data-edit-link="buttonLink"]';

test.describe('Hydra must not mutate host-page CSS', () => {
  test('host [data-edit-media] keeps the frontend computed `position` (no forced relative)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const heroImage = iframe.locator(HERO_MEDIA);
    await expect(heroImage).toBeVisible();

    // The test frontend renders the hero image with NO position style — so
    // its computed position must be the browser default (`static`). If Hydra
    // is forcing position:relative through its injected stylesheet, this
    // assertion fails — which is what we want it to do until the bridge is
    // fixed to use `outline` (or some other non-mutating affordance).
    const computedPosition = await heroImage.evaluate(
      (el) => window.getComputedStyle(el).position,
    );
    expect(computedPosition).toBe('static');
  });

  test('working-size host [data-edit-media] is NOT touched by ensureElementsHaveMinSize', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const heroImage = iframe.locator(HERO_MEDIA);
    await expect(heroImage).toBeVisible();

    // The hero image renders at non-zero size (it has a src). The contract:
    // Hydra's ensureElementsHaveMinSize rescues ONLY truly zero-sized
    // elements; it must leave working ones alone. So the hero image must
    // have nothing in its inline style.minWidth / style.minHeight.
    //
    // The empty-image rescue path is exercised separately by the existing
    // container-blocks test ("an empty image block gets a minimum size...").
    const inlineMinWidth = await heroImage.evaluate(
      (el) => (el as HTMLElement).style.minWidth,
    );
    const inlineMinHeight = await heroImage.evaluate(
      (el) => (el as HTMLElement).style.minHeight,
    );
    expect(inlineMinWidth).toBe('');
    expect(inlineMinHeight).toBe('');
  });

  test('host [data-edit-link] keeps the frontend computed `position` (no forced relative)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const heroLink = iframe.locator(HERO_LINK);
    await expect(heroLink.first()).toBeVisible();

    const computedPosition = await heroLink.first().evaluate(
      (el) => window.getComputedStyle(el).position,
    );
    expect(computedPosition).toBe('static');
  });

  test('host empty [data-edit-text] keeps the frontend computed `position` (no forced relative)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // The hero buttonText field has no schema-defined placeholder, so it
    // exercises the universal-fallback path. Clear it so it's data-empty.
    const buttonField = iframe.locator(
      '[data-block-uid="block-4-hero"] [data-edit-text="buttonText"]',
    );
    await expect(buttonField).toBeVisible();
    await buttonField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // Click another block to blur so updateEmptyState applies data-empty.
    await helper.clickBlockInIframe('block-1-uuid');
    await expect(buttonField).toHaveAttribute('data-empty', '', { timeout: 5000 });

    // Even in the data-empty state, the host element's `position` must NOT
    // be forced to `relative` by the bridge. The frontend's natural styling
    // (no position set) should give `static`.
    const computedPosition = await buttonField.evaluate(
      (el) => window.getComputedStyle(el).position,
    );
    expect(computedPosition).toBe('static');
  });
});
