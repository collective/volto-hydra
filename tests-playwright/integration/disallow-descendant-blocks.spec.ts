/**
 * Integration tests for `disallowDescendantBlocks` — an ancestor forbids block
 * types in its whole subtree. End-to-end through the real admin, exercising the
 * consumers that read the resolved allowedSiblingTypes:
 *   - the block chooser (add), and
 *   - drag-and-drop validation.
 *
 * Fixture: /disallow-columns-page. The `columns` block declares
 * `disallowDescendantBlocks: ['columns']`; a `column` cell otherwise allows
 * `columns` (shared-block-schemas). So:
 *   - columns must NOT be offered / droppable anywhere inside a columns block,
 *   - but columns stays addable at the page level (the restriction is scoped to
 *     the subtree, not global).
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

  test('columns is still offered at the page level (restriction is subtree-scoped)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/disallow-columns-page');
    await helper.waitForIframeReady();

    // Select a top-level block and open the page-region chooser.
    await helper.clickBlockInIframe('src-cols');
    await helper.waitForBlockSelectedInAdmin('src-cols');
    await helper.clickAddBlockButton();
    expect(await helper.isBlockChooserVisible()).toBe(true);

    // No disallowing ancestor at the page level → columns IS offered.
    await expect(
      page.locator('.blocks-chooser').first().locator('button.columns'),
    ).not.toHaveCount(0);
  });

  test('dragging a columns block into a columns cell is rejected (DnD)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/disallow-columns-page');
    const iframe = helper.getIframe();
    await helper.waitForIframeReady();

    // The cell starts with only its inner slate — no columns inside.
    await expect(
      iframe.locator('[data-block-uid="cell"] [data-block-uid="src-cols"]'),
    ).toHaveCount(0);

    // Drag the top-level `src-cols` columns into the cell (after inner-1). The
    // cell's allowedSiblingTypes exclude columns (ancestor disallow), so the
    // move must be rejected.
    await helper.dragBlockAfterNoReorderAssert('src-cols', 'inner-1');

    // Cell unchanged (still no columns inside), and src-cols still exists at the
    // page level rather than having moved into the cell/outer.
    await expect(
      iframe.locator('[data-block-uid="cell"] [data-block-uid="src-cols"]'),
    ).toHaveCount(0);
    await expect(
      iframe.locator('[data-block-uid="outer"] [data-block-uid="src-cols"]'),
    ).toHaveCount(0);
    expect(await helper.blockExists('src-cols')).toBe(true);
  });
});
