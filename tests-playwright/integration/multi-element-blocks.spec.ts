/**
 * Integration tests for multi-element block support in Volto Hydra.
 *
 * Multi-element blocks are blocks that render as multiple DOM elements
 * (e.g., a listing block rendering multiple teaser cards from a query).
 * All elements share the same data-block-uid attribute.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Multi-element blocks', () => {
  const listingBlockId = 'block-9-listing';

  test('clicking any element selects block with combined bounding box', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = page.frameLocator('iframe');

    // Verify multiple elements have the same block UID (expanded from search results)
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    await expect(elements.first()).toBeVisible({ timeout: 5000 });
    const count = await elements.count();
    console.log('Listing element count:', count);
    expect(count).toBeGreaterThan(1); // Should have multiple items from search

    // Click on the second element
    await elements.nth(1).click();

    // Wait for quanta toolbar to appear
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Wait for elements to be stable after click (may re-render)
    await expect(elements.first()).toBeVisible({ timeout: 5000 });
    const newCount = await elements.count();
    expect(newCount).toBeGreaterThan(1);

    // Get bounding boxes of all elements
    const boxes = await elements.evaluateAll((els) => {
      return els.map(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      });
    });

    // Verify we got boxes (elements may have re-rendered)
    expect(boxes.length).toBeGreaterThan(0);

    // Calculate expected combined bounding box
    const expectedLeft = Math.min(...boxes.map(b => b.left));
    const expectedRight = Math.max(...boxes.map(b => b.right));
    const expectedTop = Math.min(...boxes.map(b => b.top));
    const expectedBottom = Math.max(...boxes.map(b => b.bottom));
    const expectedWidth = expectedRight - expectedLeft;
    const expectedHeight = expectedBottom - expectedTop;
    const singleElementHeight = boxes[0].height;

    // Key assertion: combined bounding box should be taller than single element
    console.log(`Single element height: ${singleElementHeight}, Expected total height: ${expectedHeight}`);
    expect(expectedHeight).toBeGreaterThan(singleElementHeight * 1.5);

    // Verify selection outline has correct dimensions
    const selectionOutline = page.locator('.volto-hydra-block-outline');
    await expect(selectionOutline).toBeVisible({ timeout: 5000 });
    const selectionRect = await selectionOutline.boundingBox();
    console.log('Selection rect:', selectionRect);
    expect(selectionRect!.height).toBeGreaterThan(singleElementHeight * 1.5);
  });

  test('listing block renders multiple teaser elements from query', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = page.frameLocator('iframe');

    // Verify multiple elements have the same block UID
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    await expect(elements.first()).toBeVisible({ timeout: 5000 });
    const count = await elements.count();
    console.log('Listing element count:', count);
    expect(count).toBeGreaterThan(1);

    // Verify elements are teasers with content from search results
    // The mock API returns Document pages like "Accordion Test Page", "Another Page", etc.
    const firstTeaser = elements.first();
    await expect(firstTeaser).toHaveClass(/teaser-block/);

    // Verify at least one teaser has expected content from mock data
    const hasAccordionPage = await elements.filter({ hasText: 'Accordion Test Page' }).count();
    const hasAnotherPage = await elements.filter({ hasText: 'Another Page' }).count();
    expect(hasAccordionPage + hasAnotherPage).toBeGreaterThan(0);
  });

  test('multi-element block can be dragged to new position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial element count (dynamic from search results)
    // Wait for stable total block count to avoid nuxt hydration issues
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    await expect(elements.first()).toBeVisible({ timeout: 5000 });
    await helper.getStableBlockCount(); // Wait for page to stabilize
    const initialCount = await elements.count();
    console.log('Initial listing element count:', initialCount);
    expect(initialCount).toBeGreaterThan(0);

    // Select the listing block
    await helper.clickBlockInIframe(listingBlockId);
    await helper.waitForSidebarOpen();

    // Verify selection rect has correct dimensions BEFORE drag
    const selectionOutline = page.locator('.volto-hydra-block-outline');
    await expect(selectionOutline).toBeVisible({ timeout: 5000 });
    const rectBefore = await selectionOutline.boundingBox();
    console.log('Selection rect before DnD:', rectBefore);
    expect(rectBefore!.width).toBeGreaterThan(100);

    // Get the drag handle
    const dragHandle = await helper.getDragHandle();

    // Target: first slate block
    const targetBlock = iframe.locator('[data-block-uid="block-1-uuid"]');

    // Drag listing block to after the first slate block
    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    // Wait for re-render - same number of elements should exist
    await expect(elements).toHaveCount(initialCount);

    // KEY ASSERTION: Verify selection rect has correct dimensions AFTER drag
    await page.waitForTimeout(500); // Wait for selection to update
    await expect(selectionOutline).toBeVisible({ timeout: 5000 });
    const rectAfter = await selectionOutline.boundingBox();
    console.log('Selection rect after DnD:', rectAfter);
    expect(rectAfter!.width).toBeGreaterThan(100);  // Should not be a thin line

    // Verify by DOM order: all listing elements should come after block-1-uuid
    // Use main selector for broader compatibility (test frontend uses #content, Nuxt uses main)
    const allBlockUids = await iframe.locator('main [data-block-uid], #content [data-block-uid]').evaluateAll((els) => {
      return els.map(el => el.getAttribute('data-block-uid'));
    });
    console.log('Block order after drag:', allBlockUids);

    const targetIndex = allBlockUids.indexOf('block-1-uuid');
    const firstListingIndex = allBlockUids.indexOf(listingBlockId);

    // Listing elements should be after block-1-uuid
    expect(firstListingIndex).toBeGreaterThan(targetIndex);
  });

  test('selection rect updates when any element resizes', async ({ page }) => {
    // Tests that ResizeObserver detects changes in ALL elements, not just the first
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Select the listing block
    await helper.clickBlockInIframe(listingBlockId);
    await helper.waitForBlockSelected(listingBlockId);

    // Get initial selection rect from the block outline
    const selectionOutline = page.locator('.volto-hydra-block-outline');
    await expect(selectionOutline).toBeVisible({ timeout: 5000 });
    const initialRect = await selectionOutline.boundingBox();
    console.log('Initial selection rect:', initialRect);

    // Get listing elements and resize a non-first one
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    const count = await elements.count();
    expect(count).toBeGreaterThan(2);

    // Resize the THIRD element (non-first) by adding content
    const thirdElement = elements.nth(2);
    await thirdElement.evaluate((el) => {
      const extraContent = document.createElement('div');
      extraContent.style.height = '300px';
      extraContent.style.background = '#eee';
      extraContent.textContent = 'Extra content to force resize';
      el.appendChild(extraContent);
    });

    // Wait for ResizeObserver to fire and update the selection rect
    await page.waitForTimeout(500);

    // Get new selection rect
    const newRect = await selectionOutline.boundingBox();

    // KEY ASSERTION: Selection height should have increased by ~300px
    // This will fail if ResizeObserver only watches the first element
    expect(newRect!.height).toBeGreaterThan(initialRect!.height + 200);
  });

  test('clicking listing item inside grid selects the listing block', async ({ page }) => {
    // Tests that clicking a teaser from an expanded listing inside a grid
    // correctly selects the listing block (listing-in-grid), not the grid
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for grid to be visible
    const grid = iframe.locator('[data-block-uid="block-8-grid"]');
    await expect(grid).toBeVisible({ timeout: 5000 });

    // Find the listing items inside the grid (they have data-block-uid="listing-in-grid")
    const listingItems = iframe.locator('[data-block-uid="listing-in-grid"]');
    const count = await listingItems.count();
    console.log('Found listing items in grid:', count);
    expect(count).toBeGreaterThan(0);

    // Click on one of the listing items
    await listingItems.first().click();

    // Wait for toolbar to appear
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // KEY ASSERTION: The listing block should be selected, not the grid
    await helper.waitForBlockSelected('listing-in-grid');

    // Verify sidebar shows listing block selected (breadcrumb shows "« Listing")
    await helper.waitForSidebarOpen();
    const listingBreadcrumb = page.locator('.sidebar-section-header', { hasText: 'Listing' });
    await expect(listingBreadcrumb).toBeVisible({ timeout: 5000 });
  });

  test('scroll into view considers all elements bounding box', async ({ page }) => {
    // Tests that scroll-into-view uses combined bounding box, not just first element
    // Listing block is at bottom of page, not visible on initial load
    const helper = new AdminUIHelper(page);

    // Use a small viewport so listing block is definitely off-screen
    await page.setViewportSize({ width: 1280, height: 400 });

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    await expect(elements.first()).toBeVisible({ timeout: 5000 });

    // Get the last element of the listing (should be off-screen)
    const count = await elements.count();
    const lastElement = elements.nth(count - 1);
    const viewportHeight = page.viewportSize()?.height || 400;

    // Verify last listing element is NOT visible initially (page loads at top)
    const lastElementRectBefore = await lastElement.boundingBox();
    console.log('Last element Y before selection:', lastElementRectBefore?.y, 'viewport:', viewportHeight);
    expect(lastElementRectBefore!.y).toBeGreaterThan(viewportHeight);

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click the parent arrow to go to page level
    const parentArrow = page.locator('.sidebar-section-header .parent-nav');
    await expect(parentArrow).toBeVisible({ timeout: 5000 });
    await parentArrow.click();

    // Wait for ChildBlocksWidget to show page-level blocks
    const childBlocksWidget = page.locator('#sidebar-order .child-blocks-widget');
    await expect(childBlocksWidget).toBeVisible({ timeout: 5000 });

    // Click the Listing block item in the sidebar - this selects without scrolling first
    const listingBlockItem = childBlocksWidget.locator('.child-block-item', { hasText: 'Listing' });
    await expect(listingBlockItem).toBeVisible({ timeout: 5000 });
    await listingBlockItem.click();

    // Wait for block to be selected and scroll animation
    await helper.waitForBlockSelected(listingBlockId);
    await page.waitForTimeout(300);

    // Get first element position after selection (should be scrolled into view)
    const firstElementRectAfter = await elements.first().boundingBox();
    console.log('First element Y after selection:', firstElementRectAfter?.y);

    // KEY ASSERTION: First element should be visible after selecting
    // The block should be scrolled so at least the first element is in view
    // Allow small tolerance for floating point rounding (-1px)
    expect(firstElementRectAfter!.y).toBeLessThan(viewportHeight);
    expect(firstElementRectAfter!.y).toBeGreaterThanOrEqual(-1);
  });

  test('grid block paging works in view mode', async ({ page }) => {
    // Simple test: load page in view mode (not edit) and verify paging works
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToView('/test-page');

    const iframe = helper.getIframe();

    // Wait for grid block
    const grid = iframe.locator('[data-block-uid="block-8-grid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });

    // Check paging controls exist
    const pagingNav = grid.locator('.grid-paging');
    await expect(pagingNav).toBeVisible({ timeout: 5000 });

    // Verify page 1 is current
    const currentPage = pagingNav.locator('.paging-page.current');
    await expect(currentPage).toHaveText('1');

    // Count items on page 1 (should be 6 with pageSize=6)
    const items = grid.locator('.grid-cell');
    const count = await items.count();
    console.log('Page 1 items:', count);
    expect(count).toBe(6);

    // Click next page
    await pagingNav.locator('.paging-next').click();

    // Wait for page 2 - iframe reloads with new URL
    const gridAfterNav = iframe.locator('[data-block-uid="block-8-grid"]');
    const pagingNavAfterNav = gridAfterNav.locator('.grid-paging');
    await expect(pagingNavAfterNav.locator('.paging-page.current')).toHaveText('2', { timeout: 10000 });

    // Count items on page 2 (should be remaining items: 10 total - 6 = 4)
    const page2Items = iframe.locator('[data-block-uid="block-8-grid"] .grid-cell');
    const page2Count = await page2Items.count();
    console.log('Page 2 items:', page2Count);
    expect(page2Count).toBe(4);
  });

  test('grid block shows paging controls and navigates between pages', async ({ page }) => {
    // Tests that grid blocks with many items show paging controls
    // and clicking page links changes the displayed items (in edit mode)
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for grid block to be visible
    const grid = iframe.locator('[data-block-uid="block-8-grid"]');
    await expect(grid).toBeVisible({ timeout: 5000 });

    // Check if paging controls exist within the grid block
    const pagingNav = grid.locator('.grid-paging');
    await expect(pagingNav).toBeVisible({ timeout: 5000 });
    console.log('Grid has paging: true');

    // Get the current page indicator within the grid's paging
    const currentPage = pagingNav.locator('.paging-page.current');
    await expect(currentPage).toBeVisible({ timeout: 5000 });
    const currentPageText = await currentPage.textContent();
    console.log('Current page:', currentPageText);
    expect(currentPageText).toBe('1');

    // Get initial items in grid - should be up to 6 items on page 1 (pageSize is 6)
    const initialItems = iframe.locator('[data-block-uid="block-8-grid"] .grid-cell');
    const initialCount = await initialItems.count();
    console.log('Initial items count:', initialCount);
    expect(initialCount).toBeLessThanOrEqual(6);
    expect(initialCount).toBeGreaterThan(0);

    // Get first item's text to verify it changes after paging
    const firstItemText = await initialItems.first().textContent();
    console.log('First item text on page 1:', firstItemText?.substring(0, 50));

    // Click next page within the grid's paging (no need to select block first)
    const nextLink = pagingNav.locator('.paging-next');
    await expect(nextLink).toBeVisible({ timeout: 5000 });

    // Click to navigate - this will reload the iframe
    await nextLink.click();

    // Wait for iframe to reload by waiting for the grid's page indicator to change
    const gridAfterNav = iframe.locator('[data-block-uid="block-8-grid"]');
    const pagingNavAfterNav = gridAfterNav.locator('.grid-paging');
    await expect(pagingNavAfterNav.locator('.paging-page.current')).toHaveText('2', { timeout: 15000 });

    // Verify we're on page 2
    const newCurrentPage = pagingNavAfterNav.locator('.paging-page.current');
    const newPageText = await newCurrentPage.textContent();
    console.log('New current page:', newPageText);
    expect(newPageText).toBe('2');

    // Verify items exist on page 2
    const page2Items = iframe.locator('[data-block-uid="block-8-grid"] .grid-cell');
    const page2Count = await page2Items.count();
    console.log('Page 2 items count:', page2Count);
    expect(page2Count).toBeGreaterThan(0);

    // First item text should be different from page 1
    const page2FirstText = await page2Items.first().textContent();
    console.log('First item text on page 2:', page2FirstText?.substring(0, 50));
    expect(page2FirstText).not.toBe(firstItemText);
  });

  test('drop indicator does not appear between elements with same UID', async ({ page }) => {
    // Tests that when dragging a block over a multi-element block,
    // the drop indicator only shows at the boundaries (before first / after last),
    // never between individual elements of the same block
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get the listing block elements (multi-element)
    const elements = iframe.locator(`[data-block-uid="${listingBlockId}"]`);
    await expect(elements.first()).toBeVisible({ timeout: 5000 });
    const count = await elements.count();
    console.log('Listing element count:', count);
    expect(count).toBeGreaterThan(2); // Need at least 3 elements to test middle

    // Select a top-level block to drag (avoid nested blocks which have sidebar nav issues)
    await helper.clickBlockInIframe('block-7-filled-teaser');
    await helper.waitForBlockSelected('block-7-filled-teaser');

    // Get the drag handle and target (second listing element - middle of multi-element block)
    const dragHandle = await helper.getDragHandle();
    const targetElement = elements.nth(1);

    // Drag to target but don't drop - allows us to inspect indicator position
    await helper.dragBlockWithMouseNoDrop(dragHandle, targetElement, true);

    // Check the drop indicator position
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).toBeVisible({ timeout: 2000 });

    const indicatorRect = await dropIndicator.boundingBox();
    console.log('Indicator rect:', indicatorRect);

    // Get first and last element positions to determine valid indicator positions
    const firstRect = await elements.first().boundingBox();
    const lastRect = await elements.nth(count - 1).boundingBox();
    console.log('First element top:', firstRect!.y);
    console.log('Last element bottom:', lastRect!.y + lastRect!.height);

    // KEY ASSERTION: Indicator should be at the boundary of the multi-element block,
    // not between individual elements
    // Valid positions: above first element OR below last element
    const indicatorTop = indicatorRect!.y;
    const isAboveFirst = indicatorTop < firstRect!.y;
    const isBelowLast = indicatorTop > lastRect!.y + lastRect!.height - 10;
    const isBetweenElements = indicatorTop > firstRect!.y + 10 && indicatorTop < lastRect!.y + lastRect!.height - 10;

    console.log('Indicator position:', { isAboveFirst, isBelowLast, isBetweenElements, indicatorTop });

    // Fail if indicator is between elements (not at boundaries)
    expect(isBetweenElements).toBe(false);

    // Release mouse to clean up
    await page.mouse.up();
  });
});
