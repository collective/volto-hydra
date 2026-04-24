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
  });
});
