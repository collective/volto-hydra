import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container UX: Edge-drag', () => {
  test('Drag container bottom edge to absorb next sibling', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();

    // Select section-1 (contains section-child-1). section accepts any type
    // so the slate sibling below can be absorbed.
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    // An edge handle should appear on the bottom of section-1.
    const bottomHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="bottom"]');
    await expect(bottomHandle).toBeVisible({ timeout: 3000 });

    // Starting positions — slate-after is section-1's next sibling at page level.
    const sectionRect = await iframe.locator('[data-block-uid="section-1"]').boundingBox();
    const slateAfterRect = await iframe.locator('[data-block-uid="slate-after"]').boundingBox();
    expect(sectionRect).not.toBeNull();
    expect(slateAfterRect).not.toBeNull();

    // Initially slate-after's parent is the page (no data-block-uid ancestor).
    const initialParent = await iframe.locator('[data-block-uid="slate-after"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(initialParent).toBeNull();

    // Drag the bottom handle down past slate-after's midpoint.
    const handleBox = await bottomHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    // Target Y = 5px past slate-after's midpoint in viewport coords.
    // iframe boundingBox y values are already in page-absolute coords via Playwright.
    const endY = slateAfterRect!.y + slateAfterRect!.height / 2 + 5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Stepped mousemove so the drag handler gets intermediate events.
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(startX, startY + (endY - startY) * (step / 8));
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // After release: slate-after is now a child of section-1.
    await expect.poll(async () =>
      iframe.locator('[data-block-uid="slate-after"]').evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
      ),
      { timeout: 5000 },
    ).toBe('section-1');

    // Selection stays on the container the user was adjusting (section-1),
    // not on the absorbed sibling — they were resizing the boundary, not
    // selecting a new block.
    await helper.waitForBlockSelected('section-1');
  });

  test('Auto-scrolls and absorbs blocks below the viewport', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-scroll-test-page');

    const iframe = helper.getIframe();

    // Select section-1 (near top). The page has 15 filler slates below it
    // — most are off-screen, so dragging the edge to absorb them requires
    // the iframe to auto-scroll while the cursor is held near the bottom.
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    // Capture iframe scroll position before drag.
    const initialScrollY = await iframe.locator('body').evaluate(() => window.scrollY);

    const bottomHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="bottom"]');
    await expect(bottomHandle).toBeVisible({ timeout: 3000 });
    const handleBox = await bottomHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;

    // filler-10 is well below the initial viewport. Drag toward the bottom
    // edge of the iframe and hold there — auto-scroll should bring more
    // blocks into view, each absorbed in turn.
    const iframeBox = await page.locator('#previewIframe').boundingBox();
    expect(iframeBox).not.toBeNull();
    const dragTargetY = iframeBox!.y + iframeBox!.height - 30; // ~30px from iframe bottom

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move toward the bottom-edge auto-scroll zone.
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(startX, startY + (dragTargetY - startY) * (step / 8));
      await page.waitForTimeout(30);
    }
    // Hold position near the bottom edge — auto-scroll should fire repeatedly.
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(startX, dragTargetY);
      await page.waitForTimeout(60);
    }
    await page.mouse.up();

    // The iframe scrolled.
    const finalScrollY = await iframe.locator('body').evaluate(() => window.scrollY);
    expect(finalScrollY).toBeGreaterThan(initialScrollY);

    // Several fillers were absorbed into section-1. We don't assert exact
    // count (depends on viewport height vs page height), but at least the
    // first few should be inside.
    const filler01Parent = await iframe.locator('[data-block-uid="filler-01"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(filler01Parent).toBe('section-1');

    // Selection still pinned to section-1.
    await helper.waitForBlockSelected('section-1');
  });
});
