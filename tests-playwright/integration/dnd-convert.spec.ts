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
  // The toy conversion graph (convSource/convTargetA/convTargetB + convBox*)
  // lives only in the MOCK frontend's shared-block-schemas.js. On admin-nuxt /
  // admin-nextjs / admin-f7 those blocks aren't registered, so run mock-only.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'admin-mock',
      'mock-only synthetic conversion blocks',
    );
  });

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
    // and src-1 is no longer a convSource.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(3);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(0);
  });

  test('multi-selected blocks each auto-convert into a single-option container', async ({ page }) => {
    // The multi-block auto-only rule (a batch drops only where every block has
    // exactly one convertible option) is unit-covered by acceptableAt; here we
    // check the end-to-end auto path: two convSource blocks → two convTargetA.
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);

    // Select src-1 + src-2 (two adjacent convSource blocks).
    await helper.clickBlockInIframe('src-1');
    await helper.waitForIframeBlockHandle('src-1');
    await page.keyboard.press('Shift+ArrowDown');
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).toBeVisible({ timeout: 3000 });

    // Drag both between box-1's children → each auto-converts (single option).
    const target = iframe.locator('[data-block-uid="a-1"]').first();
    await helper.dragBlockWithMouse(dragHandle, target, true);

    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(4);
    await expect(iframe.locator('[data-conv-type="convSource"]')).toHaveCount(0);
  });

  test('drag into a container with multiple convert-targets opens the chooser and commits atomically', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    // Drop the convSource between convBoxMulti's two children (options: A or B).
    await helper.dragBlockAfterNoReorderAssert('src-1', 'b-1');

    // Ask-first: the chooser appears and NOTHING has moved/converted yet.
    await expect(page.locator('.blocks-chooser')).toBeVisible();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(0);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(1);

    // Choose Conv Target B → convert + move happen together.
    await page.locator('.blocks-chooser').getByText('Conv Target B', { exact: false }).click();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(1);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(0);

    // One undo reverts BOTH the move and the conversion (single step).
    await page.locator('#toolbar-body .undo').click();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(0);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(1);
  });

  test('pasting a block into a restricted container auto-converts it', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);

    // Copy the convSource (a non-editable block → selecting it IS block mode).
    await helper.clickBlockInIframe('src-1');
    await helper.waitForIframeBlockHandle('src-1');
    await page.keyboard.press('ControlOrMeta+c');
    await expect(page.locator('#toolbar-paste-blocks')).toBeVisible({ timeout: 3000 });

    // Select a block inside box-1 and paste after it → auto-convert into the box.
    await helper.clickBlockInIframe('a-1');
    await helper.waitForIframeBlockHandle('a-1');
    await page.keyboard.press('ControlOrMeta+v');

    // box-1 gains a third convTargetA (the pasted convSource converted); the
    // original src-1 (a copy) remains a convSource at page level.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(3);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(1);
  });

  test('pasting a single block with multiple convert-targets opens the chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    // Copy the convSource, then paste inside convBoxMulti (accepts A or B).
    await helper.clickBlockInIframe('src-1');
    await helper.waitForIframeBlockHandle('src-1');
    await page.keyboard.press('ControlOrMeta+c');
    await expect(page.locator('#toolbar-paste-blocks')).toBeVisible({ timeout: 3000 });
    await helper.clickBlockInIframe('b-1');
    await helper.waitForIframeBlockHandle('b-1');
    await page.keyboard.press('ControlOrMeta+v');

    // Ask-first: two options → chooser appears, nothing inserted yet.
    await expect(page.locator('.blocks-chooser')).toBeVisible();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(0);

    // Pick Conv Target B → the pasted block is inserted, converted to B.
    await page.locator('.blocks-chooser').getByText('Conv Target B', { exact: false }).click();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(1);
  });

  test('cut then paste converts into a restricted container (the mobile move path)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);

    // Cut the convSource (mobile has no drag-convert → cut/paste is the move
    // path). Cut removes the block immediately and holds it in the clipboard.
    await helper.clickBlockInIframe('src-1');
    await helper.waitForIframeBlockHandle('src-1');
    await page.keyboard.press('ControlOrMeta+x');
    await expect.poll(async () => helper.blockExists('src-1')).toBe(false);

    // Select a block inside box-1 and paste after it → the moved block auto-converts.
    await helper.clickBlockInIframe('a-1');
    await helper.waitForIframeBlockHandle('a-1');
    await expect(page.locator('#toolbar-paste-blocks')).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('ControlOrMeta+v');

    // box-1 gains a third convTargetA; src-1 (moved, not copied) is now that
    // converted block — no longer a convSource.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(3);
    await expect(
      iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]'),
    ).toHaveCount(0);
  });

  test('a block that cannot convert is rejected by a restricted container', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);

    // alien-1 has no fieldMappings → not convertible to convTargetA, so box-1
    // (allowedBlocks: [convTargetA]) must not accept it.
    await helper.dragBlockAfterNoReorderAssert('alien-1', 'a-1');

    // box-1 unchanged: still exactly 2 convTargetA, and no alien inside it.
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convTargetA"]'),
    ).toHaveCount(2);
    await expect(
      iframe.locator('[data-block-uid="box-1"] [data-conv-type="convAlien"]'),
    ).toHaveCount(0);
    expect(await helper.blockExists('alien-1')).toBe(true);
  });

  test('cancelling the convert chooser leaves the block where it was', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/dnd-convert-page');
    const iframe = helper.getIframe();

    await helper.dragBlockAfterNoReorderAssert('src-1', 'b-1');
    await expect(page.locator('.blocks-chooser')).toBeVisible();

    // Dismiss (outside click) → no-op: nothing moved or converted.
    await page.mouse.click(5, 5);
    await expect(page.locator('.blocks-chooser')).toBeHidden();
    await expect(
      iframe.locator('[data-block-uid="boxm-1"] [data-conv-type="convTargetB"]'),
    ).toHaveCount(0);
    await expect(iframe.locator('[data-block-uid="src-1"] [data-conv-type="convSource"]')).toHaveCount(1);
    expect(await helper.blockExists('src-1')).toBe(true);
  });
});
