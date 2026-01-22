/**
 * Integration tests for drag-and-drop block reordering in Volto Hydra.
 *
 * These tests verify that blocks can be reordered via drag and drop,
 * and that block data is preserved during reordering.
 * 
 * TODO - bugs and extra tests
 * - dragging the same block to bottom then back up (without re-clicking it) - BUG
 * - sometimes a drop marker isn't cleaned up - how to reproduce?
 * - can DND from inside container to outside container and vice versa
 * - can't DND to container where block is not allowed (e.g. image into text-only container)
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Block Drag and Drop', () => {
  test.setTimeout(60000); // 60 second timeout for all DND tests (variable scroll speed + DOM manipulation)

  test('blocks can be reordered via drag and drop', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial block order (deduplicated - handles multi-element blocks)
    const initialOrder = await helper.getBlockOrder();
    console.log('[TEST] Initial order:', initialOrder);

    // Need at least 2 blocks to test reordering
    expect(initialOrder.length).toBeGreaterThan(1);

    // Get the UIDs of first two blocks
    const firstBlockUid = initialOrder[0];
    const secondBlockUid = initialOrder[1];
    console.log('[TEST] Dragging', firstBlockUid, 'to after', secondBlockUid);

    // Select first block
    await helper.clickBlockInIframe(firstBlockUid);
    await helper.waitForSidebarOpen();

    // Get the drag handle from the toolbar (in parent window, not iframe)
    const dragHandle = await helper.getDragHandle();

    // Get the second block element to drag to
    const secondBlock = iframe.locator(`[data-block-uid="${secondBlockUid}"]`);

    // Drag using mouse events (hydra.js uses mousedown/mousemove/mouseup, not HTML5 DND)
    await helper.dragBlockWithMouse(dragHandle, secondBlock, true);

    // Verify block order changed
    const newOrder = await helper.getBlockOrder();
    console.log('[TEST] New order:', newOrder);

    // First block should now be second
    expect(newOrder[1]).toBe(firstBlockUid);
    expect(newOrder[0]).toBe(secondBlockUid);
  });

  test('can drag first block to last position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const initialBlocks = await helper.getBlockOrder();
    const firstBlock = initialBlocks[0];
    const lastBlock = initialBlocks[initialBlocks.length - 1];
    console.log('[TEST] Dragging first block:', firstBlock, 'to after last:', lastBlock);

    // Select first block
    await helper.clickBlockInIframe(firstBlock);
    await helper.waitForSidebarOpen();

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const lastBlockElement = iframe.locator(`[data-block-uid="${lastBlock}"]`);

    // Drag using mouse events to place after the last block
    await helper.dragBlockWithMouse(dragHandle, lastBlockElement, true);

    const newBlocks = await helper.getBlockOrder();
    // First block should now be at the end
    expect(newBlocks[newBlocks.length - 1]).toBe(firstBlock);
    expect(newBlocks[0]).not.toBe(firstBlock);
  });

  test('can drag last block to first position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    
    const iframe = helper.getIframe();
    const initialBlocks = await helper.getBlockOrder();
    const lastBlock = initialBlocks[initialBlocks.length - 1];
    const firstBlock = initialBlocks[0];

    // Select last block
    await helper.clickBlockInIframe(lastBlock);

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const firstBlockElement = iframe.locator(`[data-block-uid="${firstBlock}"]`);

    // Drag using mouse events to place before the first block
    await helper.dragBlockWithMouse(dragHandle, firstBlockElement, false);

    const newBlocks = await helper.getBlockOrder();
    // Last block should now be at the start
    expect(newBlocks[0]).toBe(lastBlock);
    expect(newBlocks[newBlocks.length - 1]).not.toBe(lastBlock);
  });

  test('block count remains the same after drag and drop', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    // Blocks already stabilized by navigateToEdit
    const initialBlocks = await helper.getBlockOrder();
    const initialCount = initialBlocks.length;

    expect(initialBlocks.length).toBeGreaterThan(1);

    // Select first block
    await helper.clickBlockInIframe(initialBlocks[0]);

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const targetBlock = iframe.locator(`[data-block-uid="${initialBlocks[1]}"]`);

    // Drag using mouse events to place after second block
    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    // Wait for count to stabilize after re-render
    await expect(async () => {
      const newCount = await helper.getBlockCount();
      expect(newCount).toBe(initialCount);
    }).toPass({ timeout: 5000 });
  });

  test('dragging does not duplicate blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    
    const iframe = helper.getIframe();
    const initialBlocks = await helper.getBlockOrder();
    const uniqueInitialBlocks = new Set(initialBlocks);

    expect(initialBlocks.length).toBeGreaterThan(1);

    // Select first block
    await helper.clickBlockInIframe(initialBlocks[0]);

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const targetBlock = iframe.locator(`[data-block-uid="${initialBlocks[1]}"]`);

    // Drag using mouse events to verify no duplication
    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    // Wait for block count to stabilize after re-render
    await helper.waitForBlockCountToBe(initialBlocks.length);

    const newBlocks = await helper.getBlockOrder();
    const uniqueNewBlocks = new Set(newBlocks);

    // Should have same number of unique blocks
    expect(uniqueNewBlocks.size).toBe(uniqueInitialBlocks.size);

    // All original blocks should still be present
    for (const blockId of initialBlocks) {
      expect(newBlocks).toContain(blockId);
    }
  });

  test('dragging middle block to different position preserves other blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    
    const iframe = helper.getIframe();
    const initialBlocks = await helper.getBlockOrder();

    // Need at least 4 blocks for this test (use block at index 2 to avoid image block)
    expect(initialBlocks.length).toBeGreaterThanOrEqual(4);

    // Use block at index 2 (block-3-uuid, a slate block) instead of index 1 (image block)
    // Image blocks can have loading timing issues that make toolbar positioning flaky
    const middleBlock = initialBlocks[2];
    const firstBlock = initialBlocks[0];
    const lastBlock = initialBlocks[initialBlocks.length - 1];
    console.log('[TEST] Dragging middle block:', middleBlock, 'first:', firstBlock, 'last:', lastBlock);

    // Select middle block
    await helper.clickBlockInIframe(middleBlock);
    await helper.waitForSidebarOpen();

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const lastBlockElement = iframe.locator(`[data-block-uid="${lastBlock}"]`);

    // Drag middle block using mouse events to place after last block
    await helper.dragBlockWithMouse(dragHandle, lastBlockElement, true);

    const newBlocks = await helper.getBlockOrder();
    console.log('[TEST] Final order:', newBlocks);

    // First and last blocks should still exist
    expect(newBlocks).toContain(firstBlock);
    expect(newBlocks).toContain(lastBlock);
    expect(newBlocks).toContain(middleBlock);
  });

  test('auto-scroll: can drag block to bottom then back up', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial block order (blocks already stabilized by navigateToEdit)
    const initialBlocks = await helper.getBlockOrder();
    expect(initialBlocks.length).toBeGreaterThanOrEqual(3);

    const [firstBlock] = initialBlocks;
    const lastBlock = initialBlocks[initialBlocks.length - 1];

    console.log('[TEST] Initial order:', initialBlocks);
    console.log('[TEST] Will drag first block:', firstBlock, 'to after last:', lastBlock);

    // First drag: Move first block to BOTTOM (after last block)
    await helper.clickBlockInIframe(firstBlock);
    await helper.waitForSidebarOpen();

    const dragHandle1 = await helper.getDragHandle();
    const lastBlockElement = iframe.locator(`[data-block-uid="${lastBlock}"]`);

    // Drag to bottom (after last block) - use testAutoScroll to explicitly test auto-scroll feature
    await helper.dragBlockWithMouse(dragHandle1, lastBlockElement, true, { testAutoScroll: true });

    // Wait for all blocks to re-render before checking order
    await helper.waitForBlockCountToBe(initialBlocks.length);

    // Verify first drag worked - first block should now be last
    const orderAfterFirstDrag = await helper.getBlockOrder();
    console.log('[TEST] After dragging to bottom:', orderAfterFirstDrag);

    const newLastBlock = orderAfterFirstDrag[orderAfterFirstDrag.length - 1];
    expect(newLastBlock).toBe(firstBlock);

    // Wait for toolbar and drag handle to reposition for the block's new location
    await helper.waitForBlockSelected(firstBlock);
    await helper.waitForSidebarOpen();

    // Second drag: Move the same block (now at bottom) back UP
    // CRITICAL: Don't click the block - test if drag works immediately after first drag
    console.log('[TEST] Now dragging back up WITHOUT clicking block again');

    // BUG: After first drag completes, trying to drag again without clicking
    // the block should work, but it doesn't - the drag handle is non-functional
    // until you click the block again to "reset" the toolbar

    // DON'T click the block again - just try to get the drag handle
    // (In real usage, the block is still selected and toolbar is still visible)
    const dragHandle2 = await helper.getDragHandle();
    const secondBlock = orderAfterFirstDrag[1]; // Get what's now at position 1
    const secondBlockElement = iframe.locator(`[data-block-uid="${secondBlock}"]`);

    // Try to drag immediately after first drag (without clicking to reset)
    // Use testAutoScroll to explicitly test auto-scroll feature
    await helper.dragBlockWithMouse(dragHandle2, secondBlockElement, false, { testAutoScroll: true }); // false = insert before

    // Wait for all blocks to re-render
    await helper.waitForBlockCountToBe(initialBlocks.length);

    // Verify second drag worked - block should have moved up
    const finalOrder = await helper.getBlockOrder();
    console.log('[TEST] Final order after dragging back up:', finalOrder);

    // First block should NOT be at the bottom anymore
    const finalPosition = finalOrder.indexOf(firstBlock);
    expect(finalPosition).toBeLessThan(finalOrder.length - 1);

    // All blocks should still be present (no duplication or loss)
    expect(finalOrder.length).toBe(initialBlocks.length);
  });

  test('drop marker shows when overshooting past top of page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial block order
    const initialBlocks = await helper.getBlockOrder();
    expect(initialBlocks.length).toBeGreaterThanOrEqual(2);

    const lastBlock = initialBlocks[initialBlocks.length - 1];

    // Click the last block and start dragging
    await helper.clickBlockInIframe(lastBlock);
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    // Start the drag
    const startPos = await helper.getToolbarDragIconCenterInPageCoords();
    await page.mouse.move(startPos.x, startPos.y);
    await page.mouse.down();
    await helper.verifyDragShadowVisible();

    // Move mouse to above the page content (overshoot the top)
    // The drop indicator should still show targeting the first block
    await page.mouse.move(startPos.x, 10, { steps: 10 }); // Move to near top of viewport

    // Verify drop indicator is visible even when overshooting
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).toBeVisible({ timeout: 2000 });

    // Clean up - release the drag
    await page.mouse.up();
  });

  test('footer blocks can be reordered via drag and drop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'nuxt', 'Skipping on nuxt - no footer_blocks configured');

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial footer block order
    const initialFooterBlocks = await helper.getBlockOrder('footer');
    console.log('[TEST] Initial footer blocks:', initialFooterBlocks);

    // Need at least 2 footer blocks to test reordering
    expect(initialFooterBlocks.length).toBeGreaterThanOrEqual(2);

    const firstFooterBlock = initialFooterBlocks[0];
    const secondFooterBlock = initialFooterBlocks[1];

    // Select first footer block
    await helper.clickBlockInIframe(firstFooterBlock);
    await helper.waitForSidebarOpen();

    // Get the drag handle from the toolbar
    const dragHandle = await helper.getDragHandle();

    // Get the second footer block element to drag to
    const secondBlock = iframe.locator(`[data-block-uid="${secondFooterBlock}"]`);

    // Drag using mouse events
    await helper.dragBlockWithMouse(dragHandle, secondBlock, true);

    // Verify block order changed
    const newFooterBlocks = await helper.getBlockOrder('footer');
    console.log('[TEST] New footer blocks:', newFooterBlocks);

    // First block should now be second
    expect(newFooterBlocks[1]).toBe(firstFooterBlock);
    expect(newFooterBlocks[0]).toBe(secondFooterBlock);
  });

  test('can drag content block to footer and back', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'nuxt', 'Skipping on nuxt - no footer_blocks configured');

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial content and footer blocks
    const initialContentBlocks = await helper.getBlockOrder('main');
    const initialFooterBlocks = await helper.getBlockOrder('footer');
    console.log('[TEST] Initial content blocks:', initialContentBlocks);
    console.log('[TEST] Initial footer blocks:', initialFooterBlocks);

    expect(initialContentBlocks.length).toBeGreaterThan(0);
    expect(initialFooterBlocks.length).toBeGreaterThan(0);

    // Use a slate block from content (not image to avoid timing issues)
    // block-3-uuid is a slate block at index 2
    const contentBlock = initialContentBlocks[2]; // block-3-uuid
    const firstFooterBlock = initialFooterBlocks[0];

    // Step 1: Drag content block to footer
    console.log('[TEST] Dragging content block:', contentBlock, 'to footer after:', firstFooterBlock);
    await helper.clickBlockInIframe(contentBlock);
    await helper.waitForSidebarOpen();

    const dragHandle1 = await helper.getDragHandle();
    const footerTarget = iframe.locator(`[data-block-uid="${firstFooterBlock}"]`);
    await helper.dragBlockWithMouse(dragHandle1, footerTarget, true);

    // Verify block moved to footer
    await expect(async () => {
      const newContentBlocks = await helper.getBlockOrder('main');
      const newFooterBlocks = await helper.getBlockOrder('footer');
      expect(newContentBlocks).not.toContain(contentBlock);
      expect(newFooterBlocks).toContain(contentBlock);
    }).toPass({ timeout: 5000 });

    const afterDragToFooter = await helper.getBlockOrder('footer');
    console.log('[TEST] Footer after drag from content:', afterDragToFooter);
    expect(afterDragToFooter).toContain(contentBlock);

    // Wait for toolbar to reposition
    await helper.waitForBlockSelected(contentBlock);
    await helper.waitForSidebarOpen();

    // Step 2: Drag the same block back to content
    console.log('[TEST] Dragging block back to content');
    const contentTarget = iframe.locator(`[data-block-uid="${initialContentBlocks[0]}"]`);
    const dragHandle2 = await helper.getDragHandle();
    await helper.dragBlockWithMouse(dragHandle2, contentTarget, false);

    // Verify block moved back to content
    await expect(async () => {
      const finalContentBlocks = await helper.getBlockOrder('main');
      const finalFooterBlocks = await helper.getBlockOrder('footer');
      expect(finalContentBlocks).toContain(contentBlock);
      expect(finalFooterBlocks).not.toContain(contentBlock);
    }).toPass({ timeout: 5000 });

    const finalContentBlocks = await helper.getBlockOrder('main');
    const finalFooterBlocks = await helper.getBlockOrder('footer');
    console.log('[TEST] Final content blocks:', finalContentBlocks);
    console.log('[TEST] Final footer blocks:', finalFooterBlocks);

    // Block should be in content, not footer
    expect(finalContentBlocks).toContain(contentBlock);
    expect(finalFooterBlocks).not.toContain(contentBlock);

    // Total block count should remain the same
    expect(finalContentBlocks.length + finalFooterBlocks.length).toBe(
      initialContentBlocks.length + initialFooterBlocks.length
    );
  });
});
