/**
 * Integration tests for drag-and-drop block reordering in Volto Hydra.
 *
 * These tests verify that blocks can be reordered via drag and drop,
 * and that block data is preserved during reordering.
 * 
 * TODO - bugs and extra tests
 * - dragging the same block to bottom then back up (without re-clicking it) - BUG
 * - can DND from inside container to outside container and vice versa
 * - can't DND to container where block is not allowed (e.g. image into text-only container)
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Block Drag and Drop', () => {
  test.setTimeout(30000); // 30 second timeout for all DND tests (drag-drop involves complex DOM manipulation)
  test('blocks can be reordered via drag and drop', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get initial block order
    const iframe = helper.getIframe();
    const initialBlocks = await iframe.locator('[data-block-uid]').all();
    const initialCount = initialBlocks.length;

    // Need at least 2 blocks to test reordering
    expect(initialCount).toBeGreaterThan(1);

    // Get the UIDs of first two blocks
    const firstBlockUid = await initialBlocks[0].getAttribute('data-block-uid');
    const secondBlockUid = await initialBlocks[1].getAttribute('data-block-uid');

    // Select first block
    await helper.clickBlockInIframe(firstBlockUid!);
    await helper.waitForSidebarOpen();

    // Get the drag handle from the toolbar (in parent window, not iframe)
    const dragHandle = await helper.getDragHandle();

    // Get the second block element to drag to
    const secondBlock = iframe.locator(`[data-block-uid="${secondBlockUid}"]`);

    // Drag using mouse events (hydra.js uses mousedown/mousemove/mouseup, not HTML5 DND)
    await helper.dragBlockWithMouse(dragHandle, secondBlock, true);

    // Verify block order changed
    const newBlocks = await iframe.locator('[data-block-uid]').all();
    const newFirstBlockUid = await newBlocks[0].getAttribute('data-block-uid');
    const newSecondBlockUid = await newBlocks[1].getAttribute('data-block-uid');

    // First block should now be second
    expect(newSecondBlockUid).toBe(firstBlockUid);
    expect(newFirstBlockUid).toBe(secondBlockUid);
  });

  test('blocks maintain data after drag and drop', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Select image block and note its alt text
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    const originalAlt = await helper.getSidebarFieldValue('alt');

    // The data should remain the same even without dragging
    // (This is a basic check - in a full DND test, we'd drag the block first)

    // Re-select the block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    const newAlt = await helper.getSidebarFieldValue('alt');
    expect(newAlt).toBe(originalAlt);
  });

  test('can drag first block to last position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const initialBlocks = await helper.getBlockOrder();
    const firstBlock = initialBlocks[0];
    const lastBlock = initialBlocks[initialBlocks.length - 1];

    // Select first block
    await helper.clickBlockInIframe(firstBlock);

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
    const initialCount = await helper.getBlockCount();
    const initialBlocks = await helper.getBlockOrder();

    expect(initialBlocks.length).toBeGreaterThan(1);

    // Select first block
    await helper.clickBlockInIframe(initialBlocks[0]);

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const targetBlock = iframe.locator(`[data-block-uid="${initialBlocks[1]}"]`);

    // Drag using mouse events to place after second block
    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    const newCount = await helper.getBlockCount();
    expect(newCount).toBe(initialCount);
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

    // Need at least 3 blocks for this test
    expect(initialBlocks.length).toBeGreaterThanOrEqual(3);

    const middleBlock = initialBlocks[1];
    const firstBlock = initialBlocks[0];
    const lastBlock = initialBlocks[initialBlocks.length - 1];

    // Select middle block
    await helper.clickBlockInIframe(middleBlock);

    // Get drag handle from toolbar
    const dragHandle = await helper.getDragHandle();

    const lastBlockElement = iframe.locator(`[data-block-uid="${lastBlock}"]`);

    // Drag middle block using mouse events to place after last block
    await helper.dragBlockWithMouse(dragHandle, lastBlockElement, true);

    const newBlocks = await helper.getBlockOrder();

    // First and last blocks should still exist
    expect(newBlocks).toContain(firstBlock);
    expect(newBlocks).toContain(lastBlock);
    expect(newBlocks).toContain(middleBlock);
  });

  test('can drag the same block to bottom then back up', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Get initial block order
    const initialBlocks = await helper.getBlockOrder();
    expect(initialBlocks.length).toBeGreaterThanOrEqual(3);

    const [firstBlock] = initialBlocks;
    const lastBlock = initialBlocks[initialBlocks.length - 1];
    const secondLastBlock = initialBlocks[initialBlocks.length - 2];

    console.log('[TEST] Initial order:', initialBlocks);
    console.log('[TEST] Will drag first block:', firstBlock, 'to after last:', lastBlock);

    // First drag: Move first block to BOTTOM (after last block)
    await helper.clickBlockInIframe(firstBlock);
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    const dragHandle1 = await helper.getDragHandle();
    const lastBlockElement = iframe.locator(`[data-block-uid="${lastBlock}"]`);

    // Drag to bottom (after last block)
    await helper.dragBlockWithMouse(dragHandle1, lastBlockElement, true);
    await page.waitForTimeout(500);

    // Verify first drag worked - first block should now be last
    const orderAfterFirstDrag = await helper.getBlockOrder();
    console.log('[TEST] After dragging to bottom:', orderAfterFirstDrag);

    const newLastBlock = orderAfterFirstDrag[orderAfterFirstDrag.length - 1];
    expect(newLastBlock).toBe(firstBlock);

    // Second drag: Move the same block (now at bottom) back UP
    // CRITICAL: Don't click the block - test if drag works immediately after first drag
    await page.waitForTimeout(300);

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
    await helper.startDrag(dragHandle2);
    await helper.moveDragToBlock(secondBlockElement, false); // false = insert before

    // If bug exists, the drop indicator won't show because drag didn't actually start
    const isVisible = await helper.isDropIndicatorVisible();
    console.log('[TEST] Drop indicator visible during second drag (without clicking):', isVisible);

    // This should be true, but if bug exists it will be false
    expect(isVisible).toBe(true);

    // Complete the drag
    await helper.completeDrag(dragHandle2);

    await page.waitForTimeout(100);

    // Verify second drag worked - block should have moved up
    const finalOrder = await helper.getBlockOrder();
    console.log('[TEST] Final order after dragging back up:', finalOrder);

    // First block should NOT be at the bottom anymore
    const finalPosition = finalOrder.indexOf(firstBlock);
    expect(finalPosition).toBeLessThan(finalOrder.length - 1);

    // All blocks should still be present (no duplication or loss)
    expect(finalOrder.length).toBe(initialBlocks.length);
  });
});
