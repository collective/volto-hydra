import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * A block whose fields are rendered somewhere else, in two DIFFERENT places.
 *
 * Component libraries impose this shape: the chrome is built in JavaScript,
 * outside the block's markup, and hidden until its own trigger is pressed —
 * while the block's own element, a bar of triggers, stays on screen. Selecting
 * the block reveals nothing, because it was never the thing that was hidden.
 *
 * `data-block-selector="uid"` cannot serve it either: one handle is one click,
 * so whichever place it opened, the fields in the other stayed unreachable. The
 * handle has to name the FIELD — `data-block-selector="uid#alpha"` — and the
 * bridge opens the place the sidebar is actually in.
 *
 * The `twoPlaces` fixture block is that shape at its smallest: two fields, two
 * hidden panels, two triggers (see renderTwoPlacesBlock).
 */
test.describe('Field reveal', () => {
  const ALPHA = '#two-places-alpha-split-1';
  const BETA = '#two-places-beta-split-1';

  /** Put the cursor in a sidebar field, the way an author reaching for it does. */
  async function focusSidebarField(page, field: string) {
    const control = page
      .locator(`#sidebar-properties .field-wrapper-${field} input, ` +
               `#sidebar-properties .field-wrapper-${field} textarea`)
      .first();
    await control.waitFor({ state: 'visible', timeout: 15000 });
    await control.click();
  }

  test('the sidebar field opens the place THAT field is edited', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/two-places-test-page');

    const iframe = helper.getIframe();
    const alpha = iframe.locator(ALPHA);
    const beta = iframe.locator(BETA);

    // Both places start closed, and the block itself is on screen the whole
    // time — which is why asking about the block would reveal nothing.
    await expect(iframe.locator('.two-places-bar')).toBeVisible({ timeout: 15000 });
    await expect(alpha).toBeHidden();
    await expect(beta).toBeHidden();

    await page.evaluate((uid) => {
      (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(
        { type: 'SELECT_BLOCK', uid }, '*');
    }, 'split-1');
    await expect(page.locator('#sidebar-properties')).toContainText('Alpha', { timeout: 15000 });

    // Selecting the block alone leaves both shut: nothing about the selection
    // says which of the two the author means.
    await expect(alpha, 'selection alone opens neither place').toBeHidden();
    await expect(beta).toBeHidden();

    await focusSidebarField(page, 'alpha');

    // The discriminating assertion, and the whole reason the handle names a
    // field: the place holding THAT field opened, and only that one.
    await expect(alpha, "the field's own place opened").toBeVisible({ timeout: 10000 });
    await expect(beta, 'and the other stayed shut').toBeHidden();
  });

  test('the other field opens the other place', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/two-places-test-page');

    const iframe = helper.getIframe();
    await expect(iframe.locator('.two-places-bar')).toBeVisible({ timeout: 15000 });

    await page.evaluate((uid) => {
      (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(
        { type: 'SELECT_BLOCK', uid }, '*');
    }, 'split-1');
    await expect(page.locator('#sidebar-properties')).toContainText('Beta', { timeout: 15000 });

    await focusSidebarField(page, 'beta');

    await expect(iframe.locator(BETA)).toBeVisible({ timeout: 10000 });
    await expect(iframe.locator(ALPHA), 'the first place was never asked for').toBeHidden();
  });

  test('a field already on screen is left alone', async ({ page }) => {
    // The reveal is a no-op when there is nothing to reveal — which is what
    // makes it safe to send on every sidebar focus. Here the title block's own
    // field is plainly visible, and focusing it must not go clicking triggers.
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/two-places-test-page');

    const iframe = helper.getIframe();
    await expect(iframe.locator('.two-places-bar')).toBeVisible({ timeout: 15000 });

    await page.evaluate((uid) => {
      (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(
        { type: 'SELECT_BLOCK', uid }, '*');
    }, 'title-block');

    await expect(iframe.locator(ALPHA), 'nothing was opened').toBeHidden();
    await expect(iframe.locator(BETA)).toBeHidden();
  });
});
