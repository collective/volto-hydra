/**
 * Integration test for `disallowDescendantBlocks` — end-to-end through the real
 * admin: the block chooser opened INSIDE a columns cell must not offer the
 * disallowed type, even though the cell's section would allow it elsewhere.
 *
 * Fixture: /disallow-columns-page. The `columns` block declares
 * `disallowDescendantBlocks: ['columns']` (shared-block-schemas), and a `column`
 * cell otherwise allows `columns` — so the chooser inside the cell proves the
 * ancestor restriction is applied to the resolved allowedSiblingTypes the admin
 * add-path reads.
 *
 * The other two guarantees are covered deterministically by unit tests rather
 * than flaky admin interactions:
 *   - subtree-scoping (columns still allowed OUTSIDE a columns block) —
 *     regions.test.js "sibling subtree unaffected" / "no declaration".
 *   - DnD rejection (dropping columns into a cell is refused) —
 *     blockPath.regions.test.js moveBlockBetweenContainers rejection test, which
 *     is the exact validation a drag runs. (An admin drag with a *container*
 *     source is unreliable: selecting a columns block lands on a child, so
 *     waitForBlockSelectedInAdmin on the container times out.)
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('disallowDescendantBlocks', () => {
  test('the add chooser inside a columns cell omits the disallowed type', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/disallow-columns-page');
    await helper.waitForIframeReady();

    // Select a block inside the cell, then open the add-block chooser for the
    // cell's region.
    await helper.clickBlockInIframe('inner-1');
    await helper.waitForBlockSelectedInAdmin('inner-1');
    await helper.clickAddBlockButton();
    expect(await helper.isBlockChooserVisible()).toBe(true);

    const chooser = page.locator('.blocks-chooser').first();
    // slate IS still offered (chooser works, cell allows it) …
    await expect(chooser.locator('button.slate')).not.toHaveCount(0);
    // … but columns is filtered out by the columns ancestor's disallow set.
    await expect(chooser.locator('button.columns')).toHaveCount(0);
  });
});
