/**
 * Drag / paste into a spot via conversion.
 *
 * Fixtures (dnd-convert-page): convSource (page-level, draggable) converts to
 * convTargetA and convTargetB. convBox accepts only convTargetA (single option
 * → auto-convert); convBoxMulti accepts convTargetA + convTargetB (two options
 * → chooser popup). Toy blocks render `<p data-conv-type="...">`.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('DnD / paste via conversion', () => {
  test('drag into a container that only accepts a convert-target auto-converts it', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    // Before: box-1 holds two convTargetA (a-1, a-2); src-1 is a convSource at page level.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);

    // Drop the convSource BETWEEN the box's two children (a clearly interior
    // position, away from the container's padded edges).
    await helper.dragBlockAfter('src-1', 'a-1');

    // After: the dropped convSource was auto-converted → box-1 has THREE convTargetA,
    // and no convSource survives anywhere.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(3);
    await expect(iframe.locator('[data-conv-type="convSource"]')).toHaveCount(0);
  });
});
