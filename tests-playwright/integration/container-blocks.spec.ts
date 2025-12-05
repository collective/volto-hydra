/**
 * Integration tests for container block management in Volto Hydra.
 *
 * Tests nested block selection, container hierarchy detection,
 * and add/delete operations within containers.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Container Block Detection', () => {
  test('clicking nested block selects it', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    // Login and navigate to container test page
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify the page has the columns structure
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    await expect(columnsBlock).toBeVisible();

    // Click on a nested content block (text-1a inside col-1 inside columns-1)
    await helper.clickBlockInIframe('text-1a');

    // Verify text-1a is selected (toolbar visible)
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe('text-1a');
    expect(hasToolbar).toBe(true);
  });

  test('nested blocks have correct hierarchy in DOM', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify 3-level structure:
    // Level 1: columns-1 (page-level container)
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    await expect(columnsBlock).toBeVisible();

    // Level 2: col-1, col-2 (columns inside columns block)
    const col1 = columnsBlock.locator('[data-block-uid="col-1"]');
    const col2 = columnsBlock.locator('[data-block-uid="col-2"]');
    await expect(col1).toBeVisible();
    await expect(col2).toBeVisible();

    // Level 3: text-1a, text-1b inside col-1
    const text1a = col1.locator('[data-block-uid="text-1a"]');
    const text1b = col1.locator('[data-block-uid="text-1b"]');
    await expect(text1a).toBeVisible();
    await expect(text1b).toBeVisible();

    // Level 3: text-2a inside col-2
    const text2a = col2.locator('[data-block-uid="text-2a"]');
    await expect(text2a).toBeVisible();

    // Verify data-block-add attributes for direction hints
    await expect(col1).toHaveAttribute('data-block-add', 'right');
    await expect(col2).toHaveAttribute('data-block-add', 'right');
    await expect(text1a).toHaveAttribute('data-block-add', 'bottom');
    await expect(text1b).toHaveAttribute('data-block-add', 'bottom');
  });

  test('clicking deeply nested block shows its settings in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Click on text-1a (deepest level - inside col-1 inside columns-1)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Sidebar should show slate block settings (since text-1a is a slate block)
    const sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();

    // Slate blocks don't have url/alt fields like images
    const hasUrlField = await helper.hasSidebarField('url');
    expect(hasUrlField).toBe(false);
  });

  test('container structure renders correctly in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify the columns container is visible
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    await expect(columnsBlock).toBeVisible();

    // Verify nested column blocks are visible
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const col2 = iframe.locator('[data-block-uid="col-2"]');
    await expect(col1).toBeVisible();
    await expect(col2).toBeVisible();

    // Verify deeply nested content blocks are visible
    const text1a = iframe.locator('[data-block-uid="text-1a"]');
    const text1b = iframe.locator('[data-block-uid="text-1b"]');
    const text2a = iframe.locator('[data-block-uid="text-2a"]');
    await expect(text1a).toBeVisible();
    await expect(text1b).toBeVisible();
    await expect(text2a).toBeVisible();
  });


  test('can switch selection between nested and page-level blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // First select a nested block
    await helper.clickBlockInIframe('text-1a');
    expect((await helper.isBlockSelectedInIframe('text-1a')).ok).toBe(true);

    // Then select a page-level block
    await helper.clickBlockInIframe('text-after');
    expect((await helper.isBlockSelectedInIframe('text-after')).ok).toBe(true);
    expect((await helper.isBlockSelectedInIframe('text-1a')).ok).toBe(false);

    // And back to a different nested block
    await helper.clickBlockInIframe('text-2a');
    expect((await helper.isBlockSelectedInIframe('text-2a')).ok).toBe(true);
    expect((await helper.isBlockSelectedInIframe('text-after')).ok).toBe(false);
  });
});

// Note: Container hierarchy (parentUid) is determined from blockPathMap on the admin side,
// not sent in BLOCK_SELECTED messages. The admin has full formData + blocksConfig,
// so it can derive parent relationships from blockPathMap[blockUid].parentId.

test.describe('Adding Blocks to Containers', () => {
  test('clicking add on nested block shows container-filtered block chooser', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a nested content block inside col-1
    await helper.clickBlockInIframe('text-1a');

    // Click the add button
    await helper.clickAddBlockButton();

    // Verify block chooser appears
    expect(await helper.isBlockChooserVisible()).toBe(true);

    // Column's allowedBlocks is ['slate', 'image'] - these should be visible
    expect(await helper.isBlockTypeVisible('slate')).toBe(true);
    expect(await helper.isBlockTypeVisible('image')).toBe(true);

    // Page-level blocks like 'hero' and 'columns' should NOT be visible
    // because we're adding inside a column container
    expect(await helper.isBlockTypeVisible('hero')).toBe(false);
    expect(await helper.isBlockTypeVisible('columns')).toBe(false);
  });

  test('adding block inside container inserts into container, not page', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial blocks in col-1 (should be 2: text-1a, text-1b)
    const initialCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(initialCol1Blocks).toBe(2);

    // Count initial page-level blocks
    const initialPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();

    // Select text-1a and add a new block after it
    await helper.clickBlockInIframe('text-1a');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    // col-1 should now have 3 blocks
    const finalCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(finalCol1Blocks).toBe(3);

    // Page-level blocks should be unchanged
    const finalPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();
    expect(finalPageBlocks).toBe(initialPageBlocks);
  });

  test('adding block inside implicit container (gridBlock) works', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial blocks in grid-1 (should be 2: grid-cell-1, grid-cell-2)
    const initialGridBlocks = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .count();
    expect(initialGridBlocks).toBe(2);

    // Count initial page-level blocks
    const initialPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();

    // Select grid-cell-1 and add a new block after it
    await helper.clickBlockInIframe('grid-cell-1');
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    // grid-1 should now have 3 blocks
    const finalGridBlocks = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .count();
    expect(finalGridBlocks).toBe(3);

    // Page-level blocks should be unchanged
    const finalPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();
    expect(finalPageBlocks).toBe(initialPageBlocks);
  });

  test('pressing Enter in nested block adds new block to container, not page', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial blocks in col-1 (should be 2: text-1a, text-1b)
    const initialCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(initialCol1Blocks).toBe(2);

    // Count initial page-level blocks
    const initialPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();

    // Click on text-1a to edit it and get the editor
    const editor = await helper.enterEditMode('text-1a');

    // Move cursor to end and press Enter to split/add new block
    await helper.moveCursorToEnd(editor);
    await page.keyboard.press('Enter');

    // Wait for the new block to appear
    await page.waitForTimeout(500);

    // col-1 should now have 3 blocks (text-1a was split, creating a new block)
    const finalCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(finalCol1Blocks).toBe(3);

    // Page-level blocks should be unchanged - the new block should be in the container
    const finalPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();
    expect(finalPageBlocks).toBe(initialPageBlocks);
  });
});

test.describe('Add Button Direction', () => {
  test('add button appears to right for blocks with data-block-add="right"', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // col-1 has data-block-add="right" attribute
    await helper.clickBlockInIframe('col-1');

    // Verify add button is positioned to the right of the block
    const positioning = await helper.verifyBlockUIPositioning('col-1');
    expect(positioning.addButtonDirection).toBe('right');
  });

  test('add button appears below for blocks with data-block-add="bottom"', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // text-1a has data-block-add="bottom" attribute
    await helper.clickBlockInIframe('text-1a');

    // Verify add button is positioned below the block
    const positioning = await helper.verifyBlockUIPositioning('text-1a');
    expect(positioning.addButtonDirection).toBe('bottom');
  });

  test('add button direction is inferred from nesting depth when no attribute', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // grid-cell-1 has NO data-block-add attribute
    // It's nested at depth 1 (inside grid-1), so direction should be inferred as 'right'
    await helper.clickBlockInIframe('grid-cell-1');

    // Verify add button is positioned to the right (inferred from depth 1)
    const positioning = await helper.verifyBlockUIPositioning('grid-cell-1');
    expect(positioning.addButtonDirection).toBe('right');
  });
});

test.describe('Deleting Blocks from Containers', () => {
  test('deleting nested block removes from container, not page', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial blocks in col-1 (should be 2: text-1a, text-1b)
    const initialCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(initialCol1Blocks).toBe(2);

    // Count initial page-level blocks
    const initialPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();

    // Select text-1b and delete it via toolbar menu
    await helper.clickBlockInIframe('text-1b');
    await helper.openQuantaToolbarMenu('text-1b');
    await helper.clickQuantaToolbarMenuOption('text-1b', 'Remove');
    await helper.waitForBlockToDisappear('text-1b');

    // col-1 should now have 1 block
    const finalCol1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(finalCol1Blocks).toBe(1);

    // Page-level blocks should be unchanged
    const finalPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();
    expect(finalPageBlocks).toBe(initialPageBlocks);
  });
});

test.describe('Hierarchical Sidebar', () => {
  test('sticky headers remain visible when scrolling sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Select the image block which has lots of fields that require scrolling
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get the sidebar content wrapper
    const sidebarContent = page.locator('.sidebar-content-wrapper');

    // Get all sticky headers
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    const headerCount = await stickyHeaders.count();

    // Should have at least 2 headers (Page + current block)
    expect(headerCount).toBeGreaterThanOrEqual(2);

    // Scroll to bottom of sidebar
    await sidebarContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(100);

    // Get the scroll container bounds
    const containerBounds = await sidebarContent.boundingBox();
    expect(containerBounds).toBeTruthy();

    // Verify all sticky headers are within the visible scroll viewport
    // Each header should be positioned within the container's visible area
    for (let i = 0; i < headerCount; i++) {
      const header = stickyHeaders.nth(i);
      const headerBounds = await header.boundingBox();
      expect(headerBounds).toBeTruthy();

      // Header should be within the container's visible area (not scrolled out)
      // boundingBox uses y for top position
      const isWithinContainer =
        headerBounds!.y >= containerBounds!.y &&
        headerBounds!.y < containerBounds!.y + containerBounds!.height;

      expect(
        isWithinContainer,
        `Header ${i} should be visible within scroll container. ` +
          `Header y: ${headerBounds!.y}, Container y: ${containerBounds!.y}, ` +
          `Container height: ${containerBounds!.height}`,
      ).toBe(true);
    }

    // Verify headers are stacked (each header's y position should be >= previous)
    let previousY = containerBounds!.y;
    for (let i = 0; i < headerCount; i++) {
      const header = stickyHeaders.nth(i);
      const headerBounds = await header.boundingBox();

      expect(
        headerBounds!.y >= previousY,
        `Header ${i} should be below or at previous header position`,
      ).toBe(true);

      previousY = headerBounds!.y + headerBounds!.height;
    }
  });

  test('child blocks widget not shown for non-container blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a leaf block (text-1a is a slate block with no children)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();

    // Wait for sidebar to fully render
    await page.waitForTimeout(300);

    // The child blocks widget should NOT be visible for non-container blocks
    const childBlocksWidget = page.locator('#sidebar-order .child-blocks-widget');

    // Child blocks widget should NOT be visible for slate blocks (no container fields)
    await expect(childBlocksWidget).not.toBeVisible();
  });

  test('child blocks widget shown for container blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a container block (col-1 is a column with child blocks)
    await helper.clickBlockInIframe('col-1');
    await helper.waitForSidebarOpen();

    // Wait for sidebar to fully render
    await page.waitForTimeout(300);

    // The child blocks widget should be visible for container blocks
    const childBlocksWidget = page.locator('#sidebar-order .child-blocks-widget');
    await expect(childBlocksWidget).toBeVisible();

    // Should show the child blocks (text-1a, text-1b)
    const childItems = page.locator('#sidebar-order .child-block-item');
    const itemCount = await childItems.count();
    expect(itemCount).toBe(2);
  });

  test('clicking arrow on headers navigates up to parent', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a deeply nested block (text-1a inside col-1 inside columns-1)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    // Should see: Page, Columns, Column, Text (4 headers)
    let headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBeGreaterThanOrEqual(4);

    // Step 1: Click current "Text" header arrow to go up to Column
    let currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"] .parent-nav',
    );
    await expect(currentHeader).toContainText(/text/i);
    await currentHeader.click();
    await page.waitForTimeout(300);

    // Column is now current, Text header is gone
    currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"]',
    );
    await expect(currentHeader).toContainText(/column/i);
    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(3); // Page, Columns, Column

    // Step 2: Click current "Column" header arrow to go up to Columns
    const columnHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"] .parent-nav',
    );
    await columnHeader.click();
    await page.waitForTimeout(300);

    // Columns is now current, Column header is gone
    currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"]',
    );
    await expect(currentHeader).toContainText(/columns/i);
    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(2); // Page, Columns

    // Step 3: Click current "Columns" header arrow to deselect
    const columnsHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"] .parent-nav',
    );
    await columnsHeader.click();
    await page.waitForTimeout(300);

    // No block selected, only Page header shown
    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(1); // Only Page
  });

  test('clicking block arrow to deselect hides selection outline and add button', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a top-level block (columns-1)
    await helper.clickBlockInIframe('columns-1');
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    // Verify selection UI is visible
    const selectionOutline = page.locator('.volto-hydra-block-outline');
    const addButton = page.locator('.volto-hydra-add-button');

    await expect(selectionOutline).toBeVisible();
    await expect(addButton).toBeVisible();

    // Click current block's arrow to deselect (Columns has no parent)
    const currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"] .parent-nav',
    );
    await currentHeader.click();
    await page.waitForTimeout(300);

    // Verify all selection UI is hidden
    await expect(selectionOutline).not.toBeVisible();
    await expect(addButton).not.toBeVisible();
  });

  test('clicking close button in Page header collapses sidebar', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');
    await helper.waitForSidebarOpen();

    // Verify sidebar is visible and expanded
    const sidebarContainer = page.locator('.sidebar-container');
    await expect(sidebarContainer).toBeVisible();
    await expect(sidebarContainer).not.toHaveClass(/collapsed/);

    // Click the close button in Page header
    const closeButton = page.locator('.sidebar-close-button');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Wait for sidebar to collapse
    await page.waitForTimeout(300);

    // Verify sidebar is collapsed
    await expect(sidebarContainer).toHaveClass(/collapsed/);
  });

  test('toolbar position updates after sidebar toggle', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');
    await helper.waitForSidebarOpen();

    // Select a block to show toolbar
    await helper.clickBlockInIframe('text-after');
    await page.waitForTimeout(300);

    // Verify block is properly selected with correct positioning
    const initialResult = await helper.isBlockSelectedInIframe('text-after');
    expect(initialResult.ok, `Initial selection failed: ${initialResult.reason}`).toBe(true);

    // Close sidebar
    const closeButton = page.locator('.sidebar-close-button');
    await closeButton.click();
    await page.waitForTimeout(500); // Wait for resize

    // Verify positioning is still correct after sidebar close
    const afterCloseResult = await helper.isBlockSelectedInIframe('text-after');
    expect(
      afterCloseResult.ok,
      `After sidebar close: ${afterCloseResult.reason}`,
    ).toBe(true);

    // Re-open sidebar
    const triggerButton = page.locator('.sidebar-container .trigger');
    await triggerButton.click();
    await page.waitForTimeout(500); // Wait for resize

    // Verify positioning is still correct after sidebar reopen
    const afterReopenResult = await helper.isBlockSelectedInIframe('text-after');
    expect(
      afterReopenResult.ok,
      `After sidebar reopen: ${afterReopenResult.reason}`,
    ).toBe(true);
  });
});

test.describe('Empty Block Behavior', () => {
  // Note: We use gridBlock for empty block tests because it doesn't have a defaultBlock.
  // The column block has defaultBlock: 'slate', so it creates slate blocks instead of empty.

  test('container with defaultBlock creates that type when emptied', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // The column block has defaultBlock: 'slate', so when we delete all blocks,
    // it should create a slate block, not an empty block.

    // First delete text-1b from col-1
    await helper.clickBlockInIframe('text-1b');
    await helper.openQuantaToolbarMenu('text-1b');
    await helper.clickQuantaToolbarMenuOption('text-1b', 'Remove');
    await helper.waitForBlockToDisappear('text-1b');

    // Now delete text-1a (the last block in col-1)
    await helper.clickBlockInIframe('text-1a');
    await helper.openQuantaToolbarMenu('text-1a');
    await helper.clickQuantaToolbarMenuOption('text-1a', 'Remove');
    await helper.waitForBlockToDisappear('text-1a');

    // col-1 should now have 1 block (the default slate block, not empty)
    const col1Blocks = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    expect(col1Blocks).toBe(1);

    // The block should be of type 'slate' (the defaultBlock), not 'empty'
    const blockType = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .first()
      .getAttribute('data-block-type');
    expect(blockType).toBe('slate');
  });

  test('container with single allowedBlock creates that type when emptied', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // The columns block has allowedBlocks: ['column'] with no defaultBlock,
    // so when we delete all columns, it should create a 'column' block
    // (the single allowed type) instead of 'empty'.

    // First delete col-2 from columns-1
    await helper.clickBlockInIframe('col-2');
    await helper.openQuantaToolbarMenu('col-2');
    await helper.clickQuantaToolbarMenuOption('col-2', 'Remove');
    await helper.waitForBlockToDisappear('col-2');

    // Now delete col-1 (the last column in columns-1)
    await helper.clickBlockInIframe('col-1');
    await helper.openQuantaToolbarMenu('col-1');
    await helper.clickQuantaToolbarMenuOption('col-1', 'Remove');
    await helper.waitForBlockToDisappear('col-1');

    // columns-1 should now have 1 block (a column block, not empty)
    const columnBlocks = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(columnBlocks).toBe(1);

    // The block should be of type 'column' (the single allowed type), not 'empty'
    const blockType = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .first()
      .getAttribute('data-block-type');
    expect(blockType).toBe('column');
  });

  test('deleting last block from container creates empty block', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // First delete grid-cell-2 from grid-1
    await helper.clickBlockInIframe('grid-cell-2');
    await helper.openQuantaToolbarMenu('grid-cell-2');
    await helper.clickQuantaToolbarMenuOption('grid-cell-2', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-2');

    // Now delete grid-cell-1 (the last block in grid-1)
    await helper.clickBlockInIframe('grid-cell-1');
    await helper.openQuantaToolbarMenu('grid-cell-1');
    await helper.clickQuantaToolbarMenuOption('grid-cell-1', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-1');

    // grid-1 should now have 1 empty block
    const gridBlocks = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .count();
    expect(gridBlocks).toBe(1);

    // The block should be of type 'empty'
    const emptyBlock = iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first();
    const blockType = await emptyBlock.getAttribute('data-block-type');
    expect(blockType).toBe('empty');

    // Empty block should have visible dashed border styling (injected by hydra.js)
    const borderStyle = await emptyBlock.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderStyle;
    });
    expect(borderStyle).toBe('dashed');

    // Empty block should have the "+" indicator (::after pseudo-element)
    const pseudoContent = await emptyBlock.evaluate((el) => {
      const style = window.getComputedStyle(el, '::after');
      return style.content;
    });
    // CSS content property wraps the value in quotes, so we check for '"+"'
    expect(pseudoContent).toBe('"+"');
  });

  test('clicking empty block opens block chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Delete both blocks from grid-1 to create empty block
    await helper.clickBlockInIframe('grid-cell-2');
    await helper.openQuantaToolbarMenu('grid-cell-2');
    await helper.clickQuantaToolbarMenuOption('grid-cell-2', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-2');

    await helper.clickBlockInIframe('grid-cell-1');
    await helper.openQuantaToolbarMenu('grid-cell-1');
    await helper.clickQuantaToolbarMenuOption('grid-cell-1', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-1');

    // Get the empty block's ID
    const emptyBlockId = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first()
      .getAttribute('data-block-uid');

    // Click the empty block
    await helper.clickBlockInIframe(emptyBlockId!);

    // Block chooser should open automatically
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });
  });

  test('selecting block type replaces empty block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Delete both blocks from grid-1 to create empty block
    await helper.clickBlockInIframe('grid-cell-2');
    await helper.openQuantaToolbarMenu('grid-cell-2');
    await helper.clickQuantaToolbarMenuOption('grid-cell-2', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-2');

    await helper.clickBlockInIframe('grid-cell-1');
    await helper.openQuantaToolbarMenu('grid-cell-1');
    await helper.clickQuantaToolbarMenuOption('grid-cell-1', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-1');

    // Get the empty block's ID
    const emptyBlockId = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first()
      .getAttribute('data-block-uid');

    // Click the empty block to open chooser
    await helper.clickBlockInIframe(emptyBlockId!);

    // Wait for block chooser
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Select slate block type - use text content since title attribute may vary
    await blockChooser.getByRole('button', { name: 'Text' }).click();

    // Wait for re-render
    await page.waitForTimeout(500);

    // The block should now be slate type, not empty
    const blockType = await iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first()
      .getAttribute('data-block-type');
    expect(blockType).toBe('slate');
  });
});
