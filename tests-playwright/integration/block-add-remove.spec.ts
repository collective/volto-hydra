/**
 * Integration tests for adding and removing blocks in Volto Hydra.
 *
 * These are CRITICAL tests for core CMS functionality - the ability to actually
 * add new blocks to a page and remove existing ones.
 *
 * IMPORTANT: These tests verify that blocks are ACTUALLY added/removed, not just
 * that UI elements appear. They check:
 * - Block appears in iframe
 * - Block count changes
 * - Changes sync with Admin UI
 * TODO: Extra tests
 * - / short cut to add block
 * - enter on any block adds new block below
 * - enter on 2nd last field goes to next field
 * - removing last block adds new blank block
 * 
 * Container tests
 * - empty container shows add block
 * - empty container shows only allowed block type
 * - add appears in direction block will be added
 * - can add another block in a container
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Adding Blocks', () => {
  test('clicking Add button opens block chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on a block to select it and show Quanta toolbar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click the Add button
    await helper.clickAddBlockButton();

    // Verify block chooser appears
    const chooserVisible = await helper.isBlockChooserVisible();
    expect(chooserVisible).toBe(true);
  });

  test('can add a Slate/Text block to the page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get initial block count
    const initialCount = await helper.getBlockCount();
    expect(initialCount).toBe(3); // test-page has 3 blocks

    // Select a block and click Add
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();

    // Select Slate block type
    await helper.selectBlockType('slate');

    // Wait for block to be added
    await helper.waitForBlockCountToBe(initialCount + 1);

    // Verify block count increased
    const newCount = await helper.getBlockCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('can add an Image block to the page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();

    // Select a block and add an Image block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('image');

    await helper.waitForBlockCountToBe(initialCount + 1);

    // Verify block was added
    const newCount = await helper.getBlockCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('new block appears in iframe immediately', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get current block IDs
    const initialBlocks = await helper.getBlockOrder();

    // Add a new block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    await helper.waitForBlockCountToBe(initialBlocks.length + 1);

    // Get new block IDs
    const newBlocks = await helper.getBlockOrder();

    // Should have one more block
    expect(newBlocks.length).toBe(initialBlocks.length + 1);

    // Find the new block ID (the one that's not in initialBlocks)
    const newBlockId = newBlocks.find(id => !initialBlocks.includes(id));
    expect(newBlockId).toBeDefined();

    // Verify the new block exists in iframe
    const exists = await helper.blockExists(newBlockId!);
    expect(exists).toBe(true);
  });

  test('can add multiple blocks in succession', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();

    // Add first block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');
    await helper.waitForBlockCountToBe(initialCount + 1);

    const countAfterFirst = await helper.getBlockCount();
    expect(countAfterFirst).toBe(initialCount + 1);

    // Wait for iframe to stabilize after adding block
    await page.waitForTimeout(500);

    // Add second block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('image');
    await helper.waitForBlockCountToBe(initialCount + 2);

    const countAfterSecond = await helper.getBlockCount();
    expect(countAfterSecond).toBe(initialCount + 2);

    // Wait for iframe to stabilize after adding block
    await page.waitForTimeout(500);

    // Add third block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');
    await helper.waitForBlockCountToBe(initialCount + 3);

    const finalCount = await helper.getBlockCount();
    expect(finalCount).toBe(initialCount + 3);
  });

  test('new block appears in correct position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get initial block order
    const initialBlocks = await helper.getBlockOrder();

    // Click on the second block (index 1)
    await helper.clickBlockInIframe(initialBlocks[1]);
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    await helper.waitForBlockCountToBe(initialBlocks.length + 1);

    // Get new block order
    const newBlocks = await helper.getBlockOrder();

    // New block should be inserted after the selected block
    // So it should be at position 2 (index 2) if we selected block at index 1
    expect(newBlocks.length).toBe(initialBlocks.length + 1);

    // The first two blocks should be the same
    expect(newBlocks[0]).toBe(initialBlocks[0]);
    expect(newBlocks[1]).toBe(initialBlocks[1]);

    // Position 2 should be a new block
    const newBlockId = newBlocks[2];
    expect(initialBlocks).not.toContain(newBlockId);
  });

  test('block chooser shows common block types', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on a block to select it
    await helper.clickBlockInIframe('block-1-uuid');

    // Click the Add button
    await helper.clickAddBlockButton();

    // Verify block chooser appears
    const chooserVisible = await helper.isBlockChooserVisible();
    expect(chooserVisible).toBe(true);

    // Verify common block types are present - at minimum, Slate/Text and Image blocks should be available
    expect(await helper.isBlockTypeVisible('slate')).toBe(true);
    expect(await helper.isBlockTypeVisible('image')).toBe(true);
  });
});

test.describe('Removing Blocks', () => {
  test('clicking Remove from menu deletes block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();
    const blockIdToRemove = 'block-1-uuid';

    // Verify block exists
    expect(await helper.blockExists(blockIdToRemove)).toBe(true);

    // Select block, open menu, and click Remove
    await helper.clickBlockInIframe(blockIdToRemove);
    await helper.openQuantaToolbarMenu(blockIdToRemove);
    await helper.clickQuantaToolbarMenuOption(blockIdToRemove, 'Remove');

    // Wait for block to be removed
    await helper.waitForBlockCountToBe(initialCount - 1);

    // Verify block count decreased
    const newCount = await helper.getBlockCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('block disappears from iframe after removal', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockIdToRemove = 'block-2-uuid';

    // Verify block exists initially
    expect(await helper.blockExists(blockIdToRemove)).toBe(true);

    // Remove the block
    await helper.clickBlockInIframe(blockIdToRemove);
    await helper.openQuantaToolbarMenu(blockIdToRemove);
    await helper.clickQuantaToolbarMenuOption(blockIdToRemove, 'Remove');

    // Wait for block to disappear
    await helper.waitForBlockToDisappear(blockIdToRemove);

    // Verify block no longer exists
    expect(await helper.blockExists(blockIdToRemove)).toBe(false);
  });

  test('removing block updates blocks_layout', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get initial block order
    const initialBlocks = await helper.getBlockOrder();
    expect(initialBlocks.length).toBe(3);

    // Remove the middle block
    const blockToRemove = initialBlocks[1];
    await helper.clickBlockInIframe(blockToRemove);
    await helper.openQuantaToolbarMenu(blockToRemove);
    await helper.clickQuantaToolbarMenuOption(blockToRemove, 'Remove');

    await helper.waitForBlockCountToBe(2);

    // Get new block order
    const newBlocks = await helper.getBlockOrder();

    // Should have one less block
    expect(newBlocks.length).toBe(2);

    // Removed block should not be in the list
    expect(newBlocks).not.toContain(blockToRemove);

    // Other blocks should still be there
    expect(newBlocks).toContain(initialBlocks[0]);
    expect(newBlocks).toContain(initialBlocks[2]);
  });

  test('removing middle block preserves order of remaining blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialBlocks = await helper.getBlockOrder();
    const [first, middle, last] = initialBlocks;

    // Remove middle block
    await helper.clickBlockInIframe(middle);
    await helper.openQuantaToolbarMenu(middle);
    await helper.clickQuantaToolbarMenuOption(middle, 'Remove');

    await helper.waitForBlockCountToBe(2);

    const newBlocks = await helper.getBlockOrder();

    // Order should be preserved: first, last (middle removed)
    expect(newBlocks).toEqual([first, last]);
  });

  test('can remove multiple blocks sequentially', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();
    const initialBlocks = await helper.getBlockOrder();

    // Remove first block
    await helper.clickBlockInIframe(initialBlocks[0]);
    await helper.openQuantaToolbarMenu(initialBlocks[0]);
    await helper.clickQuantaToolbarMenuOption(initialBlocks[0], 'Remove');

    // Wait for the block to actually disappear
    await helper.waitForBlockToDisappear(initialBlocks[0]);

    const countAfterFirst = await helper.getBlockCount();
    expect(countAfterFirst).toBe(initialCount - 1);

    // Wait for iframe to stabilize after removing block
    await page.waitForTimeout(500);

    // Remove another block (what was originally the second block)
    const remainingBlocks = await helper.getBlockOrder();
    await helper.clickBlockInIframe(remainingBlocks[0]);
    await helper.openQuantaToolbarMenu(remainingBlocks[0]);
    await helper.clickQuantaToolbarMenuOption(remainingBlocks[0], 'Remove');

    const finalCount = await helper.getBlockCount();
    expect(finalCount).toBe(initialCount - 2);
  });
});

test.describe('Add and Remove Combined', () => {
  test('can add a block then immediately remove it', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();
    const initialBlocks = await helper.getBlockOrder();

    // Add a block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');
    await helper.waitForBlockCountToBe(initialCount + 1);

    // Verify it was added
    const countAfterAdd = await helper.getBlockCount();
    expect(countAfterAdd).toBe(initialCount + 1);

    // Find the new block ID
    const blocksAfterAdd = await helper.getBlockOrder();
    const newBlockId = blocksAfterAdd.find(id => !initialBlocks.includes(id));
    expect(newBlockId).toBeDefined();

    // Now remove the newly added block
    await helper.clickBlockInIframe(newBlockId!);
    await helper.openQuantaToolbarMenu(newBlockId!);
    await helper.clickQuantaToolbarMenuOption(newBlockId!, 'Remove');
    await helper.waitForBlockCountToBe(initialCount);

    // Should be back to original count
    const finalCount = await helper.getBlockCount();
    expect(finalCount).toBe(initialCount);

    // Block should no longer exist
    expect(await helper.blockExists(newBlockId!)).toBe(false);
  });

  test('can remove a block then add a new one', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialCount = await helper.getBlockCount();

    // Remove a block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.openQuantaToolbarMenu('block-2-uuid');
    await helper.clickQuantaToolbarMenuOption('block-2-uuid', 'Remove');
    await helper.waitForBlockCountToBe(initialCount - 1);

    const countAfterRemove = await helper.getBlockCount();
    expect(countAfterRemove).toBe(initialCount - 1);

    // Add a new block
    const remainingBlocks = await helper.getBlockOrder();
    await helper.clickBlockInIframe(remainingBlocks[0]);
    await helper.clickAddBlockButton();
    await helper.selectBlockType('image');
    await helper.waitForBlockCountToBe(initialCount);

    // Should be back to original count
    const finalCount = await helper.getBlockCount();
    expect(finalCount).toBe(initialCount);
  });
});
