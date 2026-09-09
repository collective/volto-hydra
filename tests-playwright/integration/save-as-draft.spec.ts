/**
 * Autosaved drafts.
 *
 * Volto autosaves the form to localStorage as you type and offers it back if
 * you return to a page you left mid-edit. Hydra's shadow of Form had dropped
 * the feature entirely — close the tab, lose the work.
 *
 * Restoring it needed one change, not a straight re-add: core drafts the PAGE
 * SCHEMA's fields, and in hydra almost everything an author does lives in
 * `blocks` / `blocks_layout`, which are not schema properties. Drafting only
 * the schema fields would hand back a title and silently drop every block —
 * worse than offering nothing. So the shadowed HOC drafts the blocks too, and
 * this test is about exactly that: block work, not the title.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('save as draft', () => {
  test('block work left unsaved is offered back', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const title = iframe.locator('#page-title');
    await expect(title).toBeVisible({ timeout: 15000 });

    // Type into a BLOCK on the canvas, and do not save.
    const block = iframe.locator('[data-block-uid="block-1-uuid"]').first();
    await expect(block).toBeVisible({ timeout: 10000 });
    await block.click();
    await page.keyboard.type(' drafted');

    // The draft is debounced; wait for it to reach storage rather than guess.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Object.keys(window.localStorage).some((k) => {
              const v = window.localStorage.getItem(k) || '';
              return v.includes('drafted') && v.includes('blocks');
            }),
          ),
        { timeout: 15000 },
      )
      .toBe(true);

    // Leave without saving, then come back.
    await helper.navigateToEdit('/test-page');

    // The editor offers the autosaved work back.
    await expect(
      page.getByText(/Autosaved content found|autosaved content/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
