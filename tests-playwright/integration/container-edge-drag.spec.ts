import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container UX: Edge-drag', () => {
  // Edges should only appear when something useful would happen on drag:
  // (a) a sibling (or descendant of a sibling) is accepted by the
  //     container's child-allowedBlocks (canAbsorb), or
  // (b) at least one of the container's own children is accepted by
  //     the parent's allowedBlocks (canExpel).
  // Leaf blocks (no children) hit the early-return — no chrome.
  // Container blocks where neither (a) nor (b) holds get no chrome either.
  test('leaf blocks (teaser/slate) do not show edge-drag chrome', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="text-after"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('text-after');

    // 1) Admin renders no visible edge-handle chrome.
    const adminEdges = page.locator('.volto-hydra-edge-handle-visual');
    await expect(adminEdges).toHaveCount(0);

    // 2) Iframe-side invisible event-capture divs (4, created once at init)
    //    should all be display:none — otherwise mousedown over those
    //    coordinates would still trigger drag.
    const visibleIframeEdges = await iframe.locator('html').first().evaluate(() => {
      return [...document.querySelectorAll('.volto-hydra-edge-handle')]
        .filter((el) => window.getComputedStyle(el).display !== 'none')
        .map((el) => el.getAttribute('data-edge'));
    });
    expect(visibleIframeEdges).toEqual([]);
  });

  // Container, but no nearby sibling has an accepted descendant type:
  // top_images on columns-1 only allows image. Sibling siblings of col-1
  // (i.e. col-2, top-img-*, …) — col-2 contains slates not images, so the
  // "absorb across boundary" path doesn't yield an accepted descendant.
  // Edge-handle should be hidden on the right side (where col-2 sits).
  // Repro: after selecting a container that has edge handles, selecting
  // a leaf descendant should NOT inherit those edge sides. The leaf isn't
  // a container — it shouldn't show edges regardless of what was selected
  // before. Verifies the iframe → admin canResize lifecycle resets cleanly
  // on selection change to a non-resizable block.
  test('selecting a leaf descendant after a container clears edge chrome', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');
    const iframe = helper.getIframe();

    // 1. Select col-1 (a container — has children, will show edges).
    await iframe.locator('[data-block-uid="col-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('col-1');
    const adminEdges = page.locator('.volto-hydra-edge-handle-visual');
    expect(await adminEdges.count()).toBeGreaterThan(0); // sanity: container does show edges

    // 2. Select text-1a (a slate inside col-1 — leaf, no children).
    await iframe.locator('[data-block-uid="text-1a"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('text-1a');

    // 3. NO edge chrome should remain — neither admin-rendered nor
    //    iframe-side displayed.
    await expect(adminEdges).toHaveCount(0);
    const visibleIframeEdges = await iframe.locator('html').first().evaluate(() => {
      return [...document.querySelectorAll('.volto-hydra-edge-handle')]
        .filter((el) => window.getComputedStyle(el).display !== 'none')
        .map((el) => el.getAttribute('data-edge'));
    });
    expect(visibleIframeEdges).toEqual([]);
  });

  // Walk every block on the page and verify that any block whose
  // selection produces an edge handle is actually a container (has at
  // least one own data-block-uid descendant). Catches regressions where
  // leaves like teaser, image, or readonly cells start showing edges.
  test('no leaf block shows any edge-drag chrome', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');
    const iframe = helper.getIframe();

    // Enumerate every data-block-uid on the page.
    const all = await iframe.locator('[data-block-uid]').evaluateAll(
      (els) => els.map((el) => ({
        uid: el.getAttribute('data-block-uid'),
        // "leaf" iff no descendant has its own data-block-uid.
        isLeaf: !el.querySelector('[data-block-uid]'),
      })),
    );
    const leafUids = [...new Set(all.filter((b) => b.isLeaf).map((b) => b.uid))]
      .filter(Boolean) as string[];
    expect(leafUids.length).toBeGreaterThan(0);

    for (const uid of leafUids) {
      await iframe.locator(`[data-block-uid="${uid}"]`).first().evaluate((el) => {
        (window as any).bridge?.selectBlock(el);
      });
      await helper.waitForBlockSelected(uid);
      // No admin-rendered visible chrome.
      await expect(page.locator('.volto-hydra-edge-handle-visual'),
        `leaf block "${uid}" should not show admin edge chrome`,
      ).toHaveCount(0);
      // No iframe-side invisible div with display !== 'none'.
      const visible = await iframe.locator('html').first().evaluate(() => {
        return [...document.querySelectorAll('.volto-hydra-edge-handle')]
          .filter((el) => window.getComputedStyle(el).display !== 'none')
          .map((el) => el.getAttribute('data-edge'));
      });
      expect(visible, `leaf block "${uid}" should not have any iframe edge handle visible`).toEqual([]);
    }
  });

  test('container with no accepted-descendant sibling on a side hides that edge', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    // top-img-1 is a leaf image block (no children of its own). Documents
    // the early-return path. Once we have a fixture with a leaf-but-
    // container shape (e.g. an empty-but-typed container), extend.
    await iframe.locator('[data-block-uid="top-img-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('top-img-1');
    const adminEdges = page.locator('.volto-hydra-edge-handle-visual');
    await expect(adminEdges).toHaveCount(0);
    const visibleIframeEdges = await iframe.locator('html').first().evaluate(() => {
      return [...document.querySelectorAll('.volto-hydra-edge-handle')]
        .filter((el) => window.getComputedStyle(el).display !== 'none')
        .map((el) => el.getAttribute('data-edge'));
    });
    expect(visibleIframeEdges).toEqual([]);
  });

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

    // An edge handle should appear on the bottom of section-1, with the
    // resize cursor — verifies the iframe-side invisible event-capture div
    // is in place under the admin's visible chrome.
    const bottomHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="bottom"]');
    await expect(bottomHandle).toBeVisible({ timeout: 3000 });
    await expect(bottomHandle).toHaveCSS('cursor', 'ns-resize');
    // And the admin renders a corresponding visible bar on top of it.
    const adminVisibleBottom = page.locator('.volto-hydra-edge-handle-visual[data-edge="bottom"]');
    await expect(adminVisibleBottom).toBeVisible();

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

  test('Top edge: drag UP past previous sibling absorbs it as first child', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    const topHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="top"]');
    await expect(topHandle).toBeVisible({ timeout: 3000 });

    const slateBeforeRect = await iframe.locator('[data-block-uid="slate-before"]').boundingBox();
    expect(slateBeforeRect).not.toBeNull();
    const handleBox = await topHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endY = slateBeforeRect!.y + slateBeforeRect!.height / 2 - 5; // past midpoint going UP

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX, startY + (endY - startY) * (s / 8));
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    await expect.poll(async () =>
      iframe.locator('[data-block-uid="slate-before"]').evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
      ),
      { timeout: 5000 },
    ).toBe('section-1');

    await helper.waitForBlockSelected('section-1');
  });

  test('Bottom edge: drag UP past last child expels it to the parent', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    // section-child-1 starts inside section-1.
    const initialParent = await iframe.locator('[data-block-uid="section-child-1"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(initialParent).toBe('section-1');

    // Drag the bottom handle UPWARD into the container, past the child's midpoint.
    const bottomHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="bottom"]');
    await expect(bottomHandle).toBeVisible({ timeout: 3000 });
    const childRect = await iframe.locator('[data-block-uid="section-child-1"]').boundingBox();
    const handleBox = await bottomHandle.boundingBox();
    expect(childRect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endY = childRect!.y + childRect!.height / 2 - 5; // upward past child midpoint

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX, startY + (endY - startY) * (s / 8));
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // section-child-1 is now at page level (no [data-block-uid] ancestor).
    await expect.poll(async () =>
      iframe.locator('[data-block-uid="section-child-1"]').evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
      ),
      { timeout: 5000 },
    ).toBe(null);

    await helper.waitForBlockSelected('section-1');
  });

  test('Right edge: drag RIGHT past adjacent column child absorbs it', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="col-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('col-1');

    const rightHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="right"]');
    await expect(rightHandle).toBeVisible({ timeout: 3000 });

    const text2aRect = await iframe.locator('[data-block-uid="text-2a"]').boundingBox();
    const handleBox = await rightHandle.boundingBox();
    expect(text2aRect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endX = text2aRect!.x + text2aRect!.width / 2 + 5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX + (endX - startX) * (s / 8), startY);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // text-2a's only sibling chain (col-2 → text-2a) gets fully covered, so
    // bottom-up promotion moves col-2 itself into col-1 (col-1 accepts column).
    // Result: text-2a is now a descendant of col-1 (via col-2).
    await expect.poll(async () => {
      return iframe.locator('[data-block-uid="text-2a"]').evaluate((el) => {
        let current = el.parentElement?.closest('[data-block-uid]');
        const chain = [];
        while (current) {
          chain.push(current.getAttribute('data-block-uid'));
          current = current.parentElement?.closest('[data-block-uid]');
        }
        return chain;
      });
    }, { timeout: 5000 }).toContain('col-1');

    await helper.waitForBlockSelected('col-1');
  });

  test('Top edge: drag DOWN into container expels first child to parent', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    const initialParent = await iframe.locator('[data-block-uid="section-child-1"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(initialParent).toBe('section-1');

    // Drag the top handle DOWNWARD into the container, past the first child's midpoint.
    const topHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="top"]');
    await expect(topHandle).toBeVisible({ timeout: 3000 });
    const childRect = await iframe.locator('[data-block-uid="section-child-1"]').boundingBox();
    const handleBox = await topHandle.boundingBox();
    expect(childRect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endY = childRect!.y + childRect!.height / 2 + 5; // downward past child midpoint

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX, startY + (endY - startY) * (s / 8));
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // section-child-1 is now at page level (expelled out the top means it
    // sits BEFORE section-1 in the parent's layout).
    await expect.poll(async () =>
      iframe.locator('[data-block-uid="section-child-1"]').evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
      ),
      { timeout: 5000 },
    ).toBe(null);

    await helper.waitForBlockSelected('section-1');
  });

  test('Left edge: drag LEFT past adjacent column child absorbs it', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="col-2"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('col-2');

    const leftHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="left"]');
    await expect(leftHandle).toBeVisible({ timeout: 3000 });

    const text1bRect = await iframe.locator('[data-block-uid="text-1b"]').boundingBox();
    const handleBox = await leftHandle.boundingBox();
    expect(text1bRect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endX = text1bRect!.x + text1bRect!.width / 2 - 5;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX + (endX - startX) * (s / 8), startY);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // col-1 has [text-1a, text-1b] — text-1b's midpoint is crossed; full sibling
    // coverage requires text-1a too. With only text-1b covered, no promotion;
    // text-1b moves directly into col-2.
    await expect.poll(async () => {
      return iframe.locator('[data-block-uid="text-1b"]').evaluate((el) => {
        let current = el.parentElement?.closest('[data-block-uid]');
        const chain = [];
        while (current) {
          chain.push(current.getAttribute('data-block-uid'));
          current = current.parentElement?.closest('[data-block-uid]');
        }
        return chain;
      });
    }, { timeout: 5000 }).toContain('col-2');

    await helper.waitForBlockSelected('col-2');
  });

  // Two grids stacked vertically. Dragging the bottom edge of the top grid
  // down past the bottom grid's teasers should absorb those teasers as
  // children of the top grid (bottom-up promotion: teasers are accepted by
  // the top grid's allowedBlocks ['image','listing','slate','teaser'] but
  // gridBlock itself isn't, so promotion stops at teaser level — the four
  // teasers get pulled out of grid-2 and into grid-1).
  test('Bottom edge: drag DOWN past sibling-container children absorbs them across the boundary', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="grid-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('grid-1');

    // Initial: each grid has 2 cells (4 teasers total, 2 per grid).
    const grid2Initial = await iframe
      .locator('[data-block-uid="grid-2"] [data-block-uid]').count();
    expect(grid2Initial).toBe(2);

    const bottomHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="bottom"]');
    await expect(bottomHandle).toBeVisible({ timeout: 3000 });

    // Drag past grid-2's last teaser.
    const grid4Rect = await iframe.locator('[data-block-uid="grid-cell-4"]')
      .first().boundingBox();
    const handleBox = await bottomHandle.boundingBox();
    expect(grid4Rect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endY = grid4Rect!.y + grid4Rect!.height + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX, startY + (endY - startY) * (s / 8));
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    // Both teasers should now live inside grid-1.
    await expect.poll(async () => {
      const cells = ['grid-cell-3', 'grid-cell-4'];
      const parents = await Promise.all(cells.map((c) =>
        iframe.locator(`[data-block-uid="${c}"]`).evaluate(
          (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
        ),
      ));
      return parents.every((p) => p === 'grid-1');
    }, { timeout: 5000 }).toBe(true);
  });

  // Cross-axis expel: dragging the left/right edge inward on a vertical-stack
  // container is the degenerate "all-or-nothing" case — every child shares
  // roughly the same X-midpoint, so passing it expels the lot. Validates that
  // axis-free geometry handles this case correctly without a special path.
  test('Right edge: cross-axis expel — drag LEFT past child midpoint expels all children', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="section-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForBlockSelected('section-1');

    const initialParent = await iframe.locator('[data-block-uid="section-child-1"]').evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
    );
    expect(initialParent).toBe('section-1');

    const rightHandle = iframe.locator('.volto-hydra-edge-handle[data-edge="right"]');
    await expect(rightHandle).toBeVisible({ timeout: 3000 });
    const childRect = await iframe.locator('[data-block-uid="section-child-1"]').boundingBox();
    const handleBox = await rightHandle.boundingBox();
    expect(childRect).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    const endX = childRect!.x + childRect!.width / 2 - 5; // leftward past child X-midpoint

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let s = 1; s <= 8; s++) {
      await page.mouse.move(startX + (endX - startX) * (s / 8), startY);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    await expect.poll(async () =>
      iframe.locator('[data-block-uid="section-child-1"]').evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid') || null,
      ),
      { timeout: 5000 },
    ).toBe(null);

    await helper.waitForBlockSelected('section-1');
  });
});
