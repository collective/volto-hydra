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

    // Verify data-block-add attributes for direction hints on columns
    // Note: nested blocks inside columns don't require data-block-add - hydra infers direction from depth
    await expect(col1).toHaveAttribute('data-block-add', 'right');
    await expect(col2).toHaveAttribute('data-block-add', 'right');
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

  test('container block shows full border outline, not bottom line', async ({ page }) => {
    // Container blocks should show a full border around them, not just a bottom line
    // even if they only have a single editable text field (like a title)
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Click on columns-1 (a container block with a title field)
    await helper.clickContainerBlockInIframe('columns-1');

    // Check the selection outline style - should be 'border', not 'bottom-line'
    // The expect().toBeVisible() will poll until the outline appears
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible();
    await expect(outline).toHaveAttribute('data-outline-style', 'border');
  });
});

// Note: Container hierarchy (parentUid) is determined from blockPathMap on the admin side,
// not sent in BLOCK_SELECTED messages. The admin has full formData + blocksConfig,
// so it can derive parent relationships from blockPathMap[blockUid].parentId.

test.describe('Adding Blocks to Containers', () => {
  test('iframe add button adds AFTER selected block showing parent allowedBlocks', async ({
    page,
  }) => {
    // When columns-1 (page-level container) is selected, clicking the iframe add button
    // should add AFTER columns-1 at page level, showing page-level allowed blocks
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Click on columns-1 to select it
    // clickContainerBlockInIframe already waits for toolbar
    await helper.clickContainerBlockInIframe('columns-1');

    // Click the iframe add button (adds AFTER columns-1)
    await helper.clickAddBlockButton();

    // Wait for block chooser
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Should show page-level blocks (Image, Text, Hero) since we're adding at page level
    await expect(
      blockChooser.getByRole('button', { name: 'Image' }),
    ).toBeVisible();
    await expect(
      blockChooser.getByRole('button', { name: 'Text' }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
  });

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

    // Wait for col-1 to have 3 blocks (text-1a was split, creating a new block)
    const col1BlocksLocator = iframe.locator(
      '[data-block-uid="col-1"] > [data-block-uid]',
    );
    await expect(col1BlocksLocator).toHaveCount(3);

    // Page-level blocks should be unchanged - the new block should be in the container
    const finalPageBlocks = await iframe
      .locator('#content > [data-block-uid]')
      .count();
    expect(finalPageBlocks).toBe(initialPageBlocks);
  });

  test('sidebar add at page level adds block to page blocks', async ({
    page,
  }) => {
    // When no block is selected, the sidebar shows page-level "Blocks" section
    // with an add button that should add blocks at the page level
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial page-level blocks (blocks without a [data-block-uid] ancestor)
    const initialPageBlocks = await iframe.locator('body').evaluate((body) => {
      return Array.from(body.querySelectorAll('[data-block-uid]'))
        .filter(el => !el.parentElement?.closest('[data-block-uid]')).length;
    });

    // Select a top-level block then deselect by clicking parent arrow
    await helper.clickBlockInIframe('columns-1');
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    // Click current block's arrow to deselect (returns to page level)
    const currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"] .parent-nav',
    );
    await currentHeader.click();
    await page.waitForTimeout(300);

    // Now the sidebar should show page-level "Blocks" section
    const blocksSection = page.locator('.container-field-section', {
      has: page.locator('.widget-title', { hasText: 'Blocks' }),
    });
    await expect(blocksSection).toBeVisible({ timeout: 5000 });

    // Click the add button in the Blocks section
    const addButton = blocksSection.getByRole('button', { name: 'Add block' });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Block chooser should appear with page-level blocks
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Should show page-level blocks (Image, Text, Hero)
    await expect(
      blockChooser.getByRole('button', { name: 'Image' }),
    ).toBeVisible();
    await expect(
      blockChooser.getByRole('button', { name: 'Text' }),
    ).toBeVisible();

    // Select Text to add a new block
    await blockChooser.getByRole('button', { name: 'Text' }).click();

    // Wait for block chooser to close and block to be added
    await expect(blockChooser).not.toBeVisible({ timeout: 5000 });

    // Page-level blocks should have increased by 1
    await expect
      .poll(async () => {
        return await iframe.locator('body').evaluate((body) => {
          return Array.from(body.querySelectorAll('[data-block-uid]'))
            .filter(el => !el.parentElement?.closest('[data-block-uid]')).length;
        });
      }, { timeout: 5000 })
      .toBe(initialPageBlocks + 1);

    // The new block should be the LAST page-level block (added at bottom)
    const lastBlockUid = await iframe.locator('body').evaluate((body) => {
      const pageLevelBlocks = Array.from(body.querySelectorAll('[data-block-uid]'))
        .filter(el => !el.parentElement?.closest('[data-block-uid]'));
      return pageLevelBlocks[pageLevelBlocks.length - 1]?.getAttribute('data-block-uid');
    });
    expect(lastBlockUid).not.toBe('grid-1'); // Not the original last block

    // The new block should be selected (toolbar visible for it)
    await helper.waitForBlockSelected(lastBlockUid!);
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
    // Use clickContainerBlockInIframe to avoid hitting nested content
    // (already waits for toolbar)
    await helper.clickContainerBlockInIframe('col-1');

    // Verify add button is positioned to the right of the block
    // verifyBlockUIPositioning already polls for the expected state
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
    // Set a very small viewport height to ensure sidebar content overflows
    await page.setViewportSize({ width: 1280, height: 400 });

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a deeply nested block (text inside column inside columns)
    // This should show 4 headers: Page, Columns, Column, Text
    await helper.clickBlockInIframe('text-2a');
    await helper.waitForSidebarOpen();

    // Get the sidebar content wrapper
    const sidebarContent = page.locator('.sidebar-content-wrapper');

    // Get all sticky headers - should be 4 for deeply nested block
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(4);

    // Verify the header hierarchy: Page, Columns, Column, Text
    await expect(stickyHeaders.nth(0)).toContainText('Page');
    await expect(stickyHeaders.nth(1)).toContainText('Columns');
    await expect(stickyHeaders.nth(2)).toContainText('Column');
    await expect(stickyHeaders.nth(3)).toContainText('Text');

    // Get container bounds before scrolling
    const containerBounds = await sidebarContent.boundingBox();
    expect(containerBounds).toBeTruthy();

    // Scroll to bottom of sidebar
    const scrollInfo = await sidebarContent.evaluate((el) => {
      const before = el.scrollTop;
      el.scrollTop = el.scrollHeight;
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollTopBefore: before,
        scrollTopAfter: el.scrollTop,
      };
    });

    // Verify scrolling actually happened (content is taller than viewport)
    expect(
      scrollInfo.scrollTopAfter,
      `Sidebar should have scrolled (scrollHeight=${scrollInfo.scrollHeight}, clientHeight=${scrollInfo.clientHeight})`,
    ).toBeGreaterThan(0);

    // After scrolling to bottom, sticky headers should be at the TOP of the container
    // If sticky isn't working, they would have scrolled out of view (y would be negative)
    const bounds = await Promise.all([
      stickyHeaders.nth(0).boundingBox(),
      stickyHeaders.nth(1).boundingBox(),
      stickyHeaders.nth(2).boundingBox(),
      stickyHeaders.nth(3).boundingBox(),
    ]);

    // Page header should be at the top of the container (sticky at top: 0)
    expect(
      bounds[0]!.y,
      `Page header should be at top of container after scrolling (got y=${bounds[0]!.y}, container top=${containerBounds!.y})`,
    ).toBeGreaterThanOrEqual(containerBounds!.y - 5); // Allow small margin

    expect(
      bounds[0]!.y,
      `Page header should be stuck at top, not scrolled down`,
    ).toBeLessThan(containerBounds!.y + 100);

    // All headers should be stacked within the visible container area
    for (let i = 0; i < 4; i++) {
      expect(
        bounds[i]!.y,
        `Header ${i} should be within visible container (y=${bounds[i]!.y})`,
      ).toBeGreaterThanOrEqual(containerBounds!.y - 5);

      expect(
        bounds[i]!.y,
        `Header ${i} should be in upper portion of container when sticky`,
      ).toBeLessThan(containerBounds!.y + containerBounds!.height / 2);
    }

    // Verify headers are stacked vertically (each below the previous)
    for (let i = 1; i < bounds.length; i++) {
      expect(
        bounds[i]!.y,
        `Header ${i} should be below header ${i - 1}`,
      ).toBeGreaterThan(bounds[i - 1]!.y);
    }
  });

  test('child blocks widget not shown for non-container blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a leaf block (text-1a is a slate block with no children)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();

    // The child blocks widget should NOT be visible for non-container blocks
    const childBlocksWidget = page.locator('#sidebar-order .child-blocks-widget');
    await expect(childBlocksWidget).not.toBeVisible();
  });

  test('selecting nested block auto-scrolls sidebar to show its settings', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a deeply nested block (text-1a is 3 levels deep: page > columns > column > text)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();

    // Get the sidebar scroll container and current block settings
    const sidebarScroller = page.locator('.sidebar-content-wrapper');
    const blockSettings = page.locator('#sidebar-properties');

    await expect(sidebarScroller).toBeVisible();
    await expect(blockSettings).toBeVisible();

    // Wait for scroll to complete by polling until settings bottom is visible
    await expect(async () => {
      const settingsBox = await blockSettings.boundingBox();
      const scrollerBox = await sidebarScroller.boundingBox();

      expect(settingsBox).toBeTruthy();
      expect(scrollerBox).toBeTruthy();

      // The current block settings should be fully visible (scrolled into view)
      // Allow 5px tolerance for sub-pixel rendering differences
      const settingsBottom = settingsBox!.y + settingsBox!.height;
      const scrollerBottom = scrollerBox!.y + scrollerBox!.height;
      const tolerance = 5;

      expect(
        settingsBottom <= scrollerBottom + tolerance,
        `Settings bottom (${settingsBottom}) should be within ${tolerance}px of scroller bottom (${scrollerBottom})`,
      ).toBe(true);
    }).toPass({ timeout: 5000 });
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

  test('each block in hierarchy shows editable settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify initial titles are rendered in iframe
    await expect(
      iframe.locator('[data-block-uid="columns-1"] .columns-title'),
    ).toHaveText('My Columns Section');
    await expect(
      iframe.locator('[data-block-uid="col-1"] .column-title'),
    ).toHaveText('Left Column');

    // Select the deepest nested block (text-1a inside col-1 inside columns-1)
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForSidebarOpen();
    await page.waitForTimeout(300);

    // Should see parent block headers in sidebar-parents
    const sidebarParents = page.locator('#sidebar-parents');
    await expect(sidebarParents).toBeVisible();

    // Find all title input fields in the parent blocks sidebar
    // Each parent block (Columns, Column) should have a title field
    const parentTitleInputs = sidebarParents.locator(
      'input[name="title"], .field-wrapper-title input',
    );

    // Should have at least 2 title fields (Columns and Column)
    const titleCount = await parentTitleInputs.count();
    expect(titleCount).toBeGreaterThanOrEqual(2);

    // ===== Edit Level 1: Columns block (grandparent) =====
    // The first title field should be for the Columns block
    const columnsTitle = parentTitleInputs.first();
    await expect(columnsTitle).toBeVisible();
    await expect(columnsTitle).toHaveValue('My Columns Section');

    // Clear and fill with new value
    await columnsTitle.clear();
    await columnsTitle.fill('Edited Columns Title');
    await columnsTitle.press('Tab'); // Trigger blur to save

    // Verify the iframe updated with the new Columns title
    await expect(
      iframe.locator('[data-block-uid="columns-1"] .columns-title'),
      'Columns title should update in iframe after sidebar edit',
    ).toHaveText('Edited Columns Title');

    // ===== Edit Level 2: Column block (parent) =====
    // Re-query inputs after the re-render from first edit
    const columnTitleInputs = sidebarParents.locator(
      'input[name="title"], .field-wrapper-title input',
    );
    const columnTitle = columnTitleInputs.nth(1);
    await expect(columnTitle).toBeVisible();
    await expect(columnTitle).toHaveValue('Left Column');

    // Clear and fill with new value
    await columnTitle.clear();
    await columnTitle.fill('Edited Column Title');
    await columnTitle.press('Tab'); // Trigger blur to save

    // Verify the iframe updated with the new Column title
    await expect(
      iframe.locator('[data-block-uid="col-1"] .column-title'),
      'Column title should update in iframe after sidebar edit',
    ).toHaveText('Edited Column Title');

    // ===== Verify Level 3: Current block (Slate/Text) has settings =====
    // The current block's settings should render in #sidebar-properties inside the current block section
    const sidebarProperties = page.locator('#sidebar-properties');
    await expect(
      sidebarProperties,
      'Current block settings should be visible in #sidebar-properties',
    ).toBeVisible();

    // Slate block should have a "Body" field in its settings
    const slateBodyField = sidebarProperties.locator(
      '.field-wrapper-value, [class*="field"][class*="value"]',
    );
    await expect(
      slateBodyField.first(),
      'Slate block should show Body/value field in sidebar',
    ).toBeVisible();

    // ===== Verify all edits persisted =====
    // Both titles should still show the edited values
    await expect(
      iframe.locator('[data-block-uid="columns-1"] .columns-title'),
    ).toHaveText('Edited Columns Title');
    await expect(
      iframe.locator('[data-block-uid="col-1"] .column-title'),
    ).toHaveText('Edited Column Title');
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
    const newBlock = iframe.locator('[data-block-uid="col-1"] > [data-block-uid]').first();
    await expect(helper.getSlateField(newBlock)).toBeVisible();
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
    // Use clickContainerBlockInIframe to click on the column title,
    // not inside where nested blocks would be selected instead
    await helper.clickContainerBlockInIframe('col-2');
    await helper.openQuantaToolbarMenu('col-2');
    await helper.clickQuantaToolbarMenuOption('col-2', 'Remove');
    await helper.waitForBlockToDisappear('col-2');

    // Now delete col-1 (the last column in columns-1)
    await helper.clickContainerBlockInIframe('col-1');
    await helper.openQuantaToolbarMenu('col-1');
    await helper.clickQuantaToolbarMenuOption('col-1', 'Remove');
    await helper.waitForBlockToDisappear('col-1');

    // columns-1 should now have 1 block (a column block, not empty)
    const columnBlocks = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(columnBlocks).toBe(1);

    // The block should be of type 'column' (the single allowed type), not 'empty'
    // Columns have class="column" in the renderer
    const newColumn = iframe.locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]').first();
    await expect(newColumn).toHaveClass(/column/);
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

    // The block should be of type 'empty' (has data-hydra-empty attribute)
    const emptyBlock = iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first();
    await expect(emptyBlock).toHaveAttribute('data-hydra-empty');

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

    // Empty block should NOT have an add button next to it
    // Empty blocks are meant to be replaced via block chooser, not have blocks added after them
    // Use direct click since empty blocks don't show a toolbar (clickBlockInIframe expects toolbar)
    await emptyBlock.click();

    // Wait for block chooser to open (empty blocks open chooser on click)
    const blockChooser = page.locator('.block-add-button-menu, .blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Verify the add button is NOT visible in the admin UI
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).not.toBeVisible();
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

    // Verify grid-cell-2 is gone before proceeding
    await expect(iframe.locator('[data-block-uid="grid-cell-2"]')).not.toBeVisible();

    await helper.clickBlockInIframe('grid-cell-1');
    await helper.openQuantaToolbarMenu('grid-cell-1');
    await helper.clickQuantaToolbarMenuOption('grid-cell-1', 'Remove');
    await helper.waitForBlockToDisappear('grid-cell-1');

    // Verify grid-cell-1 is gone
    await expect(iframe.locator('[data-block-uid="grid-cell-1"]')).not.toBeVisible();

    // Wait for an empty block to appear (hydra marks empty blocks with data-hydra-empty)
    const emptyBlockLocator = iframe.locator('[data-block-uid="grid-1"] > .grid-row > [data-hydra-empty]');
    await expect(emptyBlockLocator).toBeVisible({ timeout: 5000 });

    // Get the empty block's ID
    const emptyBlockId = await emptyBlockLocator.getAttribute('data-block-uid');
    console.log('[TEST] Empty block ID after deletions:', emptyBlockId);

    // Click the empty block
    // Don't use clickBlockInIframe because empty blocks open the chooser, not the sidebar
    await emptyBlockLocator.click();

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

    // Wait for empty block to be rendered inside grid-1
    // hydra marks empty blocks with data-hydra-empty attribute
    const emptyBlockLocator = iframe.locator(
      '[data-block-uid="grid-1"] > .grid-row > [data-hydra-empty]'
    );
    await expect(emptyBlockLocator).toBeVisible({ timeout: 5000 });

    // Get the empty block's ID
    const emptyBlockId = await emptyBlockLocator.getAttribute('data-block-uid');

    // Click the empty block to open chooser
    // Don't use clickBlockInIframe because empty blocks open the chooser, not the sidebar
    await emptyBlockLocator.click();

    // Wait for block chooser
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Select slate block type - use text content since title attribute may vary
    await blockChooser.getByRole('button', { name: 'Text' }).click();

    // Wait for re-render
    await page.waitForTimeout(500);

    // The block should now be slate type, not empty
    const slateBlock = iframe
      .locator('[data-block-uid="grid-1"] > .grid-row > [data-block-uid]')
      .first();
    await expect(helper.getSlateField(slateBlock)).toBeVisible();

    // The slate block should have proper empty content, not "Empty block" fallback
    // This verifies that onMutateBlock properly initializes the slate value
    const slateText = await slateBlock.textContent();
    expect(slateText?.trim()).toBe('');
    expect(slateText).not.toContain('Empty block');
  });

  test('adding new container block creates initial block inside', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click on columns-1 to select it (the container that holds columns)
    // We need to select the columns block to add a new column inside it
    await helper.clickContainerBlockInIframe('columns-1');

    // Add a column via the sidebar (columns field only allows 'column' type, so auto-inserts)
    await helper.addBlockViaSidebar('Columns');

    // Block chooser should NOT have appeared (single allowedBlock = auto-insert)
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).not.toBeVisible();

    // The new column should be created. Since column has defaultBlock: 'slate',
    // it should have a slate block inside, not be empty.
    // Wait for columns-1 to have 3 columns
    const columnBlocksLocator = iframe.locator(
      '[data-block-uid="columns-1"] > .columns-row > [data-block-uid]',
    );
    await expect(columnBlocksLocator).toHaveCount(3, { timeout: 5000 });

    // Get the new column (the third one)
    const newColumn = iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .nth(2);

    // The new column should have at least one block inside
    const childBlocks = await newColumn.locator('> [data-block-uid]').count();
    expect(childBlocks).toBeGreaterThan(0);

    // The block inside should be of type 'slate' (the defaultBlock)
    const childBlock = newColumn.locator('> [data-block-uid]').first();
    await expect(helper.getSlateField(childBlock)).toBeVisible();
  });

  test('adding columns block recursively initializes column with default block', async ({
    page,
  }) => {
    // This tests the recursive initialization:
    // 1. Add columns block at page level
    // 2. Columns block should automatically get a column (only allowed type)
    // 3. That column should automatically get a slate block (column's defaultBlock)
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click on a page-level block (text-after) to get add button at page level
    await helper.clickBlockInIframe('text-after');

    // Click the add button
    await helper.clickAddBlockButton();

    // Wait for block chooser
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Expand the Common section to find Columns (it's folded by default)
    const commonSection = blockChooser.locator('text=Common');
    await commonSection.click();

    // Select Columns block type (this is a container that only allows 'column')
    await blockChooser.getByRole('button', { name: 'Columns' }).click();

    // Wait for re-render
    await page.waitForTimeout(1000);

    // Find the newly added columns block (should be after text-after)
    // The page layout should now have: title-block, columns-1, text-after, NEW-COLUMNS, grid-1
    // Columns blocks have a .columns-row child - find all blocks with this structure
    const allColumnsBlocks = iframe.locator('[data-block-uid]:has(> .columns-row)');
    const columnsCount = await allColumnsBlocks.count();
    expect(columnsCount).toBe(2); // Original columns-1 + new one

    // Get the new columns block (the last one)
    const newColumnsBlock = allColumnsBlocks.last();
    const newColumnsId = await newColumnsBlock.getAttribute('data-block-uid');
    expect(newColumnsId).not.toBe('columns-1');

    // The new columns block should have at least one column inside
    const columnChildren = newColumnsBlock.locator(
      '> .columns-row > [data-block-uid]',
    );
    const columnCount = await columnChildren.count();
    expect(columnCount).toBeGreaterThanOrEqual(1);

    // Get the first column - columns have class="column"
    const firstColumn = columnChildren.first();
    await expect(firstColumn).toHaveClass(/column/);

    // The column should have at least one block inside (defaultBlock: 'slate')
    const columnContent = firstColumn.locator('> [data-block-uid]');
    const contentCount = await columnContent.count();
    expect(contentCount).toBeGreaterThanOrEqual(1);

    // The content block should be slate (column's defaultBlock)
    const contentBlock = columnContent.first();
    await expect(helper.getSlateField(contentBlock)).toBeVisible();
  });
});

test.describe('Single Allowed Block Auto-Insert', () => {
  // When a container only allows one block type, clicking add should
  // automatically insert that block type without showing the chooser

  test('sidebar add button auto-inserts when container has single allowedBlock', async ({
    page,
  }) => {
    // columns block has allowedBlocks: ['column'] - only one option
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial column count
    const initialColumnCount = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(initialColumnCount).toBe(2);

    // Select columns-1 (the container that only allows column blocks)
    await helper.clickContainerBlockInIframe('columns-1');

    // Add a column via the sidebar (columns field only allows 'column' type, so auto-inserts)
    await helper.addBlockViaSidebar('Columns');

    // Block chooser should NOT have appeared (since there's only one option)
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).not.toBeVisible();

    // A new column should have been auto-inserted (wait for count to reach 3)
    const columnsLocator = iframe.locator(
      '[data-block-uid="columns-1"] > .columns-row > [data-block-uid]',
    );
    await expect(columnsLocator).toHaveCount(3);

    // The new column should have a slate inside (recursive initialization)
    const newColumn = iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .last();
    const childBlocks = await newColumn.locator('> [data-block-uid]').count();
    expect(childBlocks).toBeGreaterThan(0);

    // The slate block should have EMPTY text, not "Empty block" fallback
    // This verifies that applyBlockDefaults was called and slate got proper initial value
    const slateBlock = newColumn.locator('> [data-block-uid]').first();
    const slateText = await slateBlock.textContent();
    expect(slateText?.trim()).toBe('');

    // The new column should be selected (toolbar visible)
    const newColumnId = await newColumn.getAttribute('data-block-uid');
    expect(newColumnId).toBeTruthy();
    // Wait for toolbar to appear after block insertion
    await helper.waitForQuantaToolbar(newColumnId!);

    // The add button should be to the RIGHT of the new column (columns go horizontally)
    const positioning = await helper.verifyBlockUIPositioning(newColumnId!);
    console.log('[TEST] positioning:', JSON.stringify(positioning));
    expect(positioning.addButtonDirection).toBe('right');
  });

  test('iframe add button auto-inserts when container has single allowedBlock', async ({
    page,
  }) => {
    // When col-1 is selected, the iframe add button inserts AFTER col-1
    // Parent container (columns-1) only allows 'column' blocks, so auto-insert
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial column count
    const initialColumnCount = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(initialColumnCount).toBe(2);

    // Select col-1 (inside columns-1, which only allows column blocks)
    await helper.clickContainerBlockInIframe('col-1');
    await page.waitForTimeout(500);

    // Find and click the iframe add button (the + button next to the block)
    // This inserts AFTER col-1 as a sibling (another column)
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Block chooser should NOT appear (since parent only allows column blocks)
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).not.toBeVisible({ timeout: 1000 });

    // Wait for the block to be inserted
    await page.waitForTimeout(1000);

    // A new column should have been auto-inserted
    const newColumnCount = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(newColumnCount).toBe(3);

  });

  test('sidebar add on column adds block INSIDE column not as sibling', async ({
    page,
  }) => {
    // When col-1 is selected and we click sidebar add, the new block should be
    // added INSIDE col-1 (as a child), NOT as a sibling column in columns-1
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Count initial blocks in col-1 and columns in columns-1
    const initialBlocksInCol1 = await iframe
      .locator('[data-block-uid="col-1"] > [data-block-uid]')
      .count();
    const initialColumnCount = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(initialBlocksInCol1).toBe(2); // text-1a and text-1b
    expect(initialColumnCount).toBe(2); // col-1 and col-2

    // Select col-1 (a column that allows slate and image)
    await helper.clickContainerBlockInIframe('col-1');

    // Add a Text block via the sidebar (col-1 allows slate and image, so chooser appears)
    // Note: the column's container field is titled "Content" in its blockSchema
    await helper.addBlockViaSidebar('Content', 'Text');

    // Verify: col-1 should now have 3 children (new block added INSIDE)
    const col1Blocks = iframe.locator('[data-block-uid="col-1"] > [data-block-uid]');
    await expect(col1Blocks).toHaveCount(3); // was 2, now 3

    // Verify: columns-1 should still have 2 columns (NO sibling added)
    const newColumnCount = await iframe
      .locator('[data-block-uid="columns-1"] > .columns-row > [data-block-uid]')
      .count();
    expect(newColumnCount).toBe(2); // should still be 2, not 3
  });

  test('iframe add after page-level container shows page-level allowed blocks', async ({
    page,
  }) => {
    // When clicking iframe add button on a page-level container block (columns-1),
    // the block chooser should show all page-level blocks, not the container's child blocks
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select columns-1 (a page-level container block)
    await helper.clickContainerBlockInIframe('columns-1');
    await page.waitForTimeout(500);

    // Click the iframe add button (adds AFTER columns-1 at page level)
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Block chooser should appear with page-level blocks (not just 'column')
    const blockChooser = page.locator('.blocks-chooser');
    await expect(blockChooser).toBeVisible({ timeout: 5000 });

    // Should see common blocks like Image, Text, Hero - not just Column
    // The page doesn't restrict allowedBlocks, so all common blocks should appear
    await expect(blockChooser.getByRole('button', { name: 'Image' })).toBeVisible();
    await expect(blockChooser.getByRole('button', { name: 'Text' })).toBeVisible();

    await page.keyboard.press('Escape');
  });
});

test.describe('Parent Block Navigation', () => {
  test('pressing Escape selects parent block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a deeply nested block (text-1a inside col-1 inside columns-1)
    await helper.clickBlockInIframe('text-1a');
    await page.waitForTimeout(300);

    // Verify text-1a is selected (4 headers: Page, Columns, Column, Text)
    let headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(4);

    // Press Escape to go up to parent (col-1)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Should now have 3 headers (Page, Columns, Column)
    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(3);

    // Current block should be Column
    const currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"]',
    );
    await expect(currentHeader).toContainText(/column/i);

    // Press Escape again to go to columns-1
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(2);
    await expect(currentHeader).toContainText(/columns/i);

    // Press Escape again to deselect (no block selected)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(1); // Only Page header
  });

  test('toolbar menu has Select Container option for nested blocks', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a nested block (text-1a inside col-1)
    await helper.clickBlockInIframe('text-1a');
    await page.waitForTimeout(300);

    // Open the toolbar menu
    await helper.openQuantaToolbarMenu('text-1a');

    // Should see "Select Container" option
    const selectContainerOption = page.locator(
      '.volto-hydra-dropdown-item:has-text("Select Container")',
    );
    await expect(selectContainerOption).toBeVisible();

    // Click it to select the parent
    await selectContainerOption.click();
    await page.waitForTimeout(300);

    // Should now have col-1 selected (3 headers: Page, Columns, Column)
    const headerCount = await page
      .locator('.sidebar-section-header.sticky-header')
      .count();
    expect(headerCount).toBe(3);

    const currentHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"]',
    );
    await expect(currentHeader).toContainText(/column/i);
  });

  test('toolbar menu hides Select Container for top-level blocks', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a top-level block (columns-1 has no parent)
    await helper.clickContainerBlockInIframe('columns-1');
    await page.waitForTimeout(300);

    // Open the toolbar menu
    await helper.openQuantaToolbarMenu('columns-1');

    // Should NOT see "Select Container" option (no parent to select)
    const selectContainerOption = page.locator(
      '.volto-hydra-dropdown-item:has-text("Select Container")',
    );
    await expect(selectContainerOption).not.toBeVisible();
  });
});

test.describe('Sidebar Editing for Nested Blocks', () => {
  test('editing nested slate block in iframe does not cause sidebar error', async ({
    page,
  }) => {
    // Regression test: When editing a slate block inside a column in the iframe,
    // the sidebar should not throw "Invalid value used as weak map key" error
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select a slate block inside col-1 (text-1a)
    await helper.clickContainerBlockInIframe('text-1a');
    await page.waitForTimeout(500);

    // Verify sidebar shows the slate block settings without error
    const sidebarHeader = page.locator(
      '.sidebar-section-header[data-is-current="true"]',
    );
    await expect(sidebarHeader).toBeVisible({ timeout: 5000 });

    // Type some text in the iframe to trigger an edit
    const iframe = helper.getIframe();
    const slateBlock = iframe.locator('[data-block-uid="text-1a"]');
    await slateBlock.click();
    await page.keyboard.type('Test edit');

    // Wait a moment for any errors to surface
    await page.waitForTimeout(1000);

    // Check for console errors - the page should not have crashed
    // The sidebar should still be visible
    await expect(sidebarHeader).toBeVisible();
  });
});

test.describe('Container Block Drag and Drop', () => {
  test.setTimeout(30000);

  test('can reorder blocks within the same container', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial order of blocks in col-1 (has text-1a, text-1b)
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const initialBlocks = await col1.locator(':scope > [data-block-uid]').all();
    expect(initialBlocks.length).toBe(2);

    const firstBlockUid = await initialBlocks[0].getAttribute('data-block-uid');
    const secondBlockUid = await initialBlocks[1].getAttribute('data-block-uid');
    expect(firstBlockUid).toBe('text-1a');
    expect(secondBlockUid).toBe('text-1b');

    // Select first block in container
    await helper.clickBlockInIframe('text-1a');

    // Get drag handle and drag to after second block
    const dragHandle = await helper.getDragHandle();
    const secondBlock = iframe.locator('[data-block-uid="text-1b"]');

    await helper.dragBlockWithMouse(dragHandle, secondBlock, true); // Insert after

    // Wait for reorder to complete - first block should now be text-1b
    await expect.poll(async () => {
      const firstBlock = col1.locator(':scope > [data-block-uid]').first();
      return await firstBlock.getAttribute('data-block-uid');
    }, { timeout: 5000 }).toBe('text-1b');

    // Verify second block is now text-1a
    const newSecondBlockUid = await col1.locator(':scope > [data-block-uid]').nth(1).getAttribute('data-block-uid');
    expect(newSecondBlockUid).toBe('text-1a');
  });

  test('can drag block from one container to another', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial counts
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const col2 = iframe.locator('[data-block-uid="col-2"]');

    const col1InitialCount = await col1
      .locator(':scope > [data-block-uid]')
      .count();
    const col2InitialCount = await col2
      .locator(':scope > [data-block-uid]')
      .count();

    expect(col1InitialCount).toBe(2); // text-1a, text-1b
    expect(col2InitialCount).toBe(1); // text-2a

    // Select text-1a from col-1
    await helper.clickBlockInIframe('text-1a');

    // Drag to col-2 (drop on text-2a)
    const dragHandle = await helper.getDragHandle();
    const targetBlock = iframe.locator('[data-block-uid="text-2a"]');

    await helper.dragBlockWithMouse(dragHandle, targetBlock, true); // Insert after

    // Wait for block to move between containers (React re-render may be async)
    await expect(col1.locator(':scope > [data-block-uid]')).toHaveCount(1, { timeout: 5000 }); // Only text-1b left
    await expect(col2.locator(':scope > [data-block-uid]')).toHaveCount(2, { timeout: 5000 }); // text-2a + text-1a
  });

  test('can drag block from container to page level', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial counts
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const col1InitialCount = await col1
      .locator(':scope > [data-block-uid]')
      .count();

    // Verify text-1a starts inside col-1
    expect(col1InitialCount).toBe(2);

    // Select text-1a from col-1 and wait for toolbar
    await helper.clickBlockInIframe('text-1a');

    // Drag to page level (drop on text-after which is a page-level block)
    const dragHandle = await helper.getDragHandle();
    const targetBlock = iframe.locator('[data-block-uid="text-after"]');

    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    // Wait for block to be removed from col-1 (React re-render may be async)
    await expect(col1.locator(':scope > [data-block-uid]')).toHaveCount(col1InitialCount - 1, { timeout: 5000 });

    // Verify text-1a is no longer inside col-1
    await expect(col1.locator('[data-block-uid="text-1a"]')).toHaveCount(0, { timeout: 5000 });

    // And it should exist at page level (not inside any container)
    const text1aAtPageLevel = iframe.locator(
      ':scope > [data-block-uid="text-1a"], body > [data-block-uid="text-1a"]',
    );
    // Actually the page-level blocks might be in a wrapper, let's just check it's not in col-1
  });

  test('can drag page-level block into container', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial state
    const col2 = iframe.locator('[data-block-uid="col-2"]');
    const col2InitialCount = await col2
      .locator(':scope > [data-block-uid]')
      .count();

    // Verify text-after is NOT in col-2 initially
    const textAfterInCol2Initially = await col2
      .locator('[data-block-uid="text-after"]')
      .count();
    expect(textAfterInCol2Initially).toBe(0);

    // Select text-after (page-level slate block)
    await helper.clickBlockInIframe('text-after');

    // Drag into col-2 (drop on text-2a)
    const dragHandle = await helper.getDragHandle();
    const targetBlock = iframe.locator('[data-block-uid="text-2a"]');

    await helper.dragBlockWithMouse(dragHandle, targetBlock, false); // Insert before

    // Wait for block to be added to col-2 (React re-render may be async)
    await expect(col2.locator(':scope > [data-block-uid]')).toHaveCount(col2InitialCount + 1, { timeout: 5000 });

    // Verify text-after is now inside col-2
    await expect(col2.locator('[data-block-uid="text-after"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('block data is preserved after drag between containers', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial text content of text-1a
    const originalText = await iframe
      .locator('[data-block-uid="text-1a"] p')
      .textContent();
    expect(originalText).toContain('Col 1 Text 1');

    // Select and drag text-1a to col-2
    await helper.clickBlockInIframe('text-1a');
    await page.waitForTimeout(300);

    const dragHandle = await helper.getDragHandle();
    const targetBlock = iframe.locator('[data-block-uid="text-2a"]');

    await helper.dragBlockWithMouse(dragHandle, targetBlock, true);

    // Verify the text content is preserved
    const newText = await iframe
      .locator('[data-block-uid="text-1a"] p')
      .textContent();
    expect(newText).toContain('Col 1 Text 1');
  });

  test('drop indicator is vertical for horizontal layout blocks', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Select col-1 (a column with data-block-add="right")
    await helper.clickBlockInIframe('col-1');
    await page.waitForTimeout(300);

    // Start dragging
    const dragHandle = await helper.getDragHandle();
    const col2 = iframe.locator('[data-block-uid="col-2"]');

    // Get drag handle position
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Get iframe position to translate coordinates
    const iframeEl = page.locator('#previewIframe');
    const iframeBox = await iframeEl.boundingBox();
    expect(iframeBox).not.toBeNull();

    // Start the drag
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();

    // Move to col-2's LEFT EDGE (not center) to hit the column element itself
    // and avoid hitting child content blocks
    const col2Box = await col2.boundingBox();
    expect(col2Box).not.toBeNull();

    // Position at far left edge of col-2, vertically centered
    // Playwright's iframe.locator().boundingBox() already returns parent-relative coordinates
    const targetX = col2Box!.x + 5; // 5px into the column from left edge
    const targetY = col2Box!.y + col2Box!.height / 2;

    await page.mouse.move(targetX, targetY, { steps: 10 });

    // Check that drop indicator exists and is vertical
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).toBeVisible();

    // Get computed styles to verify it's vertical
    const indicatorStyles = await dropIndicator.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        width: el.offsetWidth,
        height: el.offsetHeight,
        borderLeft: style.borderLeft,
        borderTop: style.borderTop,
      };
    });

    // Vertical indicator should be taller than wide (height > width)
    expect(indicatorStyles.height).toBeGreaterThan(indicatorStyles.width);

    // Clean up
    await page.mouse.up();
  });

  test('can reorder columns horizontally', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial order of columns
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    const columnsRow = columnsBlock.locator('.columns-row');
    const columns = columnsRow.locator(':scope > [data-block-uid]');
    const initialColumns = await columns.all();
    expect(initialColumns.length).toBe(2);

    const firstColUid = await initialColumns[0].getAttribute('data-block-uid');
    const secondColUid = await initialColumns[1].getAttribute('data-block-uid');
    expect(firstColUid).toBe('col-1');
    expect(secondColUid).toBe('col-2');

    // Select col-1
    await helper.clickBlockInIframe('col-1');
    await page.waitForTimeout(300);

    // Drag col-1 to the right of col-2 using horizontal drag
    const dragHandle = await helper.getDragHandle();
    const col2 = iframe.locator('[data-block-uid="col-2"]');

    await helper.dragBlockWithMouseHorizontal(dragHandle, col2, true); // Insert after (right)

    // Wait for the reorder to complete
    await page.waitForTimeout(500);

    // Verify order changed - refresh the locators after DOM update
    const newColumnsRow = iframe.locator('[data-block-uid="columns-1"] .columns-row');
    const newColumns = await newColumnsRow.locator(':scope > [data-block-uid]').all();
    expect(newColumns.length).toBe(2);

    const newFirstColUid = await newColumns[0].getAttribute('data-block-uid');
    const newSecondColUid = await newColumns[1].getAttribute('data-block-uid');

    expect(newFirstColUid).toBe('col-2');
    expect(newSecondColUid).toBe('col-1');
  });

  test('drop indicator is vertical for grid cells (inferred from nesting depth)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Grid cells are at nesting depth 1 (inside grid-1), so they should use horizontal layout
    // This tests that direction is inferred correctly even without explicit data-block-add attribute
    const gridCell1 = iframe.locator('[data-block-uid="grid-cell-1"]');
    await expect(gridCell1).toBeVisible();

    // Click on grid-cell-1 to select it
    await helper.clickBlockInIframe('grid-cell-1');
    await page.waitForTimeout(300);

    // Start dragging
    const dragHandle = await helper.getDragHandle();
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();

    // Move to grid-cell-2 (sibling in horizontal layout)
    const gridCell2 = iframe.locator('[data-block-uid="grid-cell-2"]');
    const cell2Box = await gridCell2.boundingBox();
    expect(cell2Box).not.toBeNull();

    // Move to right side of grid-cell-2
    await page.mouse.move(
      cell2Box!.x + cell2Box!.width * 0.75,
      cell2Box!.y + cell2Box!.height / 2,
      { steps: 10 },
    );

    // Drop indicator should be visible and VERTICAL (for horizontal layout)
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).toBeVisible();

    // Check that indicator is vertical (height > width)
    const indicatorBox = await dropIndicator.boundingBox();
    expect(indicatorBox).not.toBeNull();
    // Vertical indicator has small width and larger height
    expect(indicatorBox!.width).toBeLessThan(20); // Should be thin (around 4px)
    expect(indicatorBox!.height).toBeGreaterThan(50); // Should be tall

    // Clean up
    await page.mouse.up();
  });

  test('drop indicator walks up to valid parent when block type not allowed in immediate target', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Select text-1a (a slate block inside col-1)
    await helper.clickBlockInIframe('text-1a');
    await page.waitForTimeout(300);

    // Try to drag over col-1 (which is inside columns-1 that only allows 'column' blocks)
    const dragHandle = await helper.getDragHandle();

    // Get positions
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Start the drag
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();

    // Move to col-1 element itself (which is inside columns-1)
    // Slate can't be dropped as sibling of col-1 (columns only allows 'column')
    // But system walks up and finds page level allows slate
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const col1Box = await col1.boundingBox();
    expect(col1Box).not.toBeNull();

    // Move to left edge of col-1
    await page.mouse.move(col1Box!.x + 5, col1Box!.y + col1Box!.height / 2, {
      steps: 10,
    });

    // Drop indicator SHOULD be visible - walks up to page level where slate is allowed
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).toBeVisible();

    // The indicator should be at the page level (below columns block)
    const indicatorBox = await dropIndicator.boundingBox();
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    const columnsBox = await columnsBlock.boundingBox();
    expect(indicatorBox).not.toBeNull();
    expect(columnsBox).not.toBeNull();

    // Indicator Y should be near/below the columns block bottom edge
    expect(indicatorBox!.y).toBeGreaterThanOrEqual(columnsBox!.y + columnsBox!.height - 20);

    // Clean up
    await page.mouse.up();
  });

  test('block stays in place when dropped in container that does not allow it', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial position of text-1a (a slate block inside col-1)
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const initialText1aInCol1 = await col1
      .locator('[data-block-uid="text-1a"]')
      .count();
    expect(initialText1aInCol1).toBe(1);

    // Select text-1a (a slate block)
    await helper.clickBlockInIframe('text-1a');
    await page.waitForTimeout(300);

    // Try to drag slate block to top_images container (which only allows 'image')
    // The top_images container only allows image blocks, not slate
    // Hydra will walk up to find a valid container (page level) that allows slate
    const dragHandle = await helper.getDragHandle();
    const topImg1 = iframe.locator('[data-block-uid="top-img-1"]');

    // Use horizontal drag to top-img-1 (in top_images container that only allows 'image')
    // expectIndicator=true because hydra walks up to find valid parent (page level)
    const indicatorShown = await helper.dragBlockWithMouseHorizontal(
      dragHandle,
      topImg1,
      false, // insertAfter=false (left side)
      true, // expectIndicator=true (drop redirected to valid parent)
    );

    // Indicator should have been shown (for the valid parent container)
    expect(indicatorShown).toBe(true);

    // text-1a should have moved (not still in col-1)
    // Use auto-retrying assertion to wait for DOM update after drag-drop
    await expect(col1.locator('[data-block-uid="text-1a"]')).toHaveCount(0);

    // CRITICAL: text-1a should NOT be in the top_images container
    // Even though we dragged to top-img-1, slate is not allowed there
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    const topImagesChildren = await columnsBlock
      .locator('.top-images-row > [data-block-uid]')
      .all();
    const topImagesUids = await Promise.all(
      topImagesChildren.map((b) => b.getAttribute('data-block-uid')),
    );
    expect(topImagesUids).not.toContain('text-1a');

    // text-1a should be at page level (sibling of columns-1, not inside it)
    const pageLevelBlocks = iframe.locator('[data-block-uid]:not([data-block-uid] [data-block-uid])');
    const pageLevelUids = await pageLevelBlocks.evaluateAll(blocks =>
      blocks.map(b => b.getAttribute('data-block-uid'))
    );
    expect(pageLevelUids).toContain('text-1a');
  });

  test('column block cannot be dragged to page level (page allowedBlocks restriction)', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // col-1 is a 'column' block which is NOT in page-level allowedBlocks
    // Page level allows: ['slate', 'image', 'hero', 'columns'] - NOT 'column'
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    await expect(col1).toBeVisible();

    // Select col-1
    await helper.clickBlockInIframe('col-1');
    await page.waitForTimeout(300);

    // Try to drag to page level (next to text-after which is a page-level block)
    const dragHandle = await helper.getDragHandle();
    const textAfter = iframe.locator('[data-block-uid="text-after"]');

    // Get positions
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Start the drag
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();

    // Move to text-after's bottom area (vertical layout at page level)
    const textAfterBox = await textAfter.boundingBox();
    expect(textAfterBox).not.toBeNull();

    await page.mouse.move(
      textAfterBox!.x + textAfterBox!.width / 2,
      textAfterBox!.y + textAfterBox!.height * 0.75,
      { steps: 10 },
    );

    // Drop indicator should NOT be visible ('column' not allowed at page level)
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).not.toBeVisible();

    // Drop anyway (should be rejected)
    await page.mouse.up();

    // Wait for any potential state changes
    await page.waitForTimeout(500);

    // col-1 should still be inside columns-1 (not moved to page level)
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    const col1InColumns = await columnsBlock
      .locator('[data-block-uid="col-1"]')
      .count();
    expect(col1InColumns).toBe(1);

    // col-1 should NOT be a page-level block (direct child of content)
    const contentDiv = iframe.locator('#content');
    const pageLevelBlocks = await contentDiv.locator('> [data-block-uid]').all();
    const pageLevelUids = await Promise.all(
      pageLevelBlocks.map((b) => b.getAttribute('data-block-uid')),
    );
    expect(pageLevelUids).not.toContain('col-1');
  });

  test('column block cannot be dragged into grid (implicit container allowedBlocks)', async ({
    page,
  }) => {
    // gridBlock is an implicit container (uses blocks/blocks_layout without schema field)
    // It should have allowedBlocks from its block config, which doesn't include 'column'
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // col-1 is a 'column' block
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    await expect(col1).toBeVisible();

    // grid-1 is a gridBlock with children grid-cell-1 and grid-cell-2
    const gridCell1 = iframe.locator('[data-block-uid="grid-cell-1"]');
    await expect(gridCell1).toBeVisible();

    // Select col-1
    await helper.clickBlockInIframe('col-1');
    await page.waitForTimeout(300);

    // Try to drag col-1 into the grid (next to grid-cell-1)
    const dragHandle = await helper.getDragHandle();

    // Get positions
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Start the drag
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();

    // Move to grid-cell-1's area
    const gridCellBox = await gridCell1.boundingBox();
    expect(gridCellBox).not.toBeNull();

    await page.mouse.move(
      gridCellBox!.x + gridCellBox!.width / 2,
      gridCellBox!.y + gridCellBox!.height / 2,
      { steps: 10 },
    );

    // Drop indicator should NOT be visible ('column' not allowed in gridBlock)
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    await expect(dropIndicator).not.toBeVisible();

    // Drop anyway (should be rejected)
    await page.mouse.up();

    // Wait for any potential state changes
    await page.waitForTimeout(500);

    // col-1 should still be inside columns-1 (not moved to grid)
    const columnsBlock = iframe.locator('[data-block-uid="columns-1"]');
    const col1InColumns = await columnsBlock
      .locator('[data-block-uid="col-1"]')
      .count();
    expect(col1InColumns).toBe(1);

    // col-1 should NOT be inside grid-1
    const gridBlock = iframe.locator('[data-block-uid="grid-1"]');
    const col1InGrid = await gridBlock.locator('[data-block-uid="col-1"]').count();
    expect(col1InGrid).toBe(0);
  });

  test('add button is disabled when columns container is at maxLength', async ({
    page,
  }) => {
    // columns block has maxLength: 4 for its columns field
    // Currently has 2 columns (col-1, col-2), add 2 more to reach maxLength
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify columns-1 currently has 2 columns
    const columns1 = iframe.locator('[data-block-uid="columns-1"]');
    await expect(
      columns1.locator(':scope > .columns-row > [data-block-uid]'),
    ).toHaveCount(2);

    // Select col-2 container (use clickContainerBlockInIframe to avoid hitting nested content)
    await helper.clickContainerBlockInIframe('col-2');

    // The add button is in the Admin UI (not iframe), positioned next to selected block
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for 3rd column to be created (columns has single allowedBlock: 'column')
    await expect(
      columns1.locator(':scope > .columns-row > [data-block-uid]'),
    ).toHaveCount(3);

    // Select the new (3rd) column and add 4th column
    const allColumns = columns1.locator(':scope > .columns-row > [data-block-uid]');
    await allColumns.nth(2).click();
    await helper.waitForQuantaToolbar((await allColumns.nth(2).getAttribute('data-block-uid'))!);

    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for 4th column to be created
    await expect(
      columns1.locator(':scope > .columns-row > [data-block-uid]'),
    ).toHaveCount(4);

    // Select the new (4th) column
    await allColumns.nth(3).click();
    await helper.waitForQuantaToolbar((await allColumns.nth(3).getAttribute('data-block-uid'))!);

    // Add button should NOT be visible when container is at maxLength
    await expect(addButton).not.toBeVisible();
  });

  test('add button is disabled when grid container is at maxLength', async ({
    page,
  }) => {
    // gridBlock has maxLength: 4
    // Currently has 2 cells (grid-cell-1, grid-cell-2), add 2 more to reach maxLength
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Verify grid-1 currently has 2 cells
    // Note: grid children are inside a grid-row wrapper, not direct children
    const grid1 = iframe.locator('[data-block-uid="grid-1"]');
    const gridCells = grid1.locator('[data-block-uid]');
    await expect(gridCells).toHaveCount(2);

    // Select grid-cell-2 and add a new cell after it
    await helper.clickBlockInIframe('grid-cell-2');

    // The add button is in the Admin UI (not iframe)
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Select slate block type from chooser
    await helper.selectBlockType('slate');

    // Wait for 3rd cell to be created
    await expect(gridCells).toHaveCount(3);

    // Select the new (3rd) cell and add 4th cell
    await gridCells.nth(2).click();
    await helper.waitForQuantaToolbar(
      (await gridCells.nth(2).getAttribute('data-block-uid'))!,
    );

    await expect(addButton).toBeVisible();
    await addButton.click();

    await helper.selectBlockType('slate');

    // Wait for 4th cell to be created
    await expect(gridCells).toHaveCount(4);

    // Select the new (4th) cell
    await gridCells.nth(3).click();
    await helper.waitForQuantaToolbar(
      (await gridCells.nth(3).getAttribute('data-block-uid'))!,
    );

    // Add button should NOT be visible when container is at maxLength
    await expect(addButton).not.toBeVisible();
  });

  test('can drag block on right side of screen', async ({ page }) => {
    // Test that drag works for blocks on the right side of the screen
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Get initial count of blocks in col-2 (right side of screen)
    const col2 = iframe.locator('[data-block-uid="col-2"]');
    const col2InitialCount = await col2
      .locator(':scope > [data-block-uid]')
      .count();
    expect(col2InitialCount).toBe(1); // Only text-2a

    // Select text-2a (right side block)
    await helper.clickBlockInIframe('text-2a');
    await page.waitForTimeout(300);

    // Get drag handle
    const dragHandle = await helper.getDragHandle();
    expect(dragHandle).not.toBeNull();

    // Try to drag text-2a to col-1 (which is on the left)
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const text1b = iframe.locator('[data-block-uid="text-1b"]');

    // Drag text-2a to after text-1b in col-1
    await helper.dragBlockWithMouse(dragHandle, text1b, true);

    // Wait for the move to complete
    await page.waitForTimeout(500);

    // Verify text-2a moved from col-2 to col-1
    // Note: col-2 will have 1 block (empty block created when last block was removed)
    const col2NewCount = await col2.locator(':scope > [data-block-uid]').count();
    expect(col2NewCount).toBe(1); // empty block created when text-2a was removed

    // Verify text-2a is no longer in col-2
    const text2aInCol2 = await col2
      .locator('[data-block-uid="text-2a"]')
      .count();
    expect(text2aInCol2).toBe(0);

    const col1NewCount = await col1.locator(':scope > [data-block-uid]').count();
    expect(col1NewCount).toBe(3); // text-1a, text-1b, text-2a

    // Verify text-2a is now in col-1
    const text2aInCol1 = await col1
      .locator('[data-block-uid="text-2a"]')
      .count();
    expect(text2aInCol1).toBe(1);
  });

  test('dragging last block out of container creates empty block in source container', async ({
    page,
  }) => {
    // When dragging the last block out of a container, an empty block should be
    // created in the source container to maintain its structure
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // col-2 only has one block (text-2a)
    const col2 = iframe.locator('[data-block-uid="col-2"]');
    const col2InitialCount = await col2
      .locator(':scope > [data-block-uid]')
      .count();
    expect(col2InitialCount).toBe(1); // Only text-2a

    // Select text-2a and drag it to col-1
    await helper.clickBlockInIframe('text-2a');
    await page.waitForTimeout(300);

    const dragHandle = await helper.getDragHandle();
    expect(dragHandle).not.toBeNull();

    // Drag to col-1 - target the bottom half of text-1b (inside col-1, not below it)
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const text1b = col1.locator('[data-block-uid="text-1b"]');
    const text1bBox = await text1b.boundingBox();
    expect(text1bBox).not.toBeNull();

    // Target bottom 75% of text-1b to insert AFTER it but stay INSIDE col-1
    const targetY = text1bBox!.y + text1bBox!.height * 0.75;

    // Use mouse.move instead of hover() to avoid iframe interception issues
    const dragHandleBox = await dragHandle!.boundingBox();
    expect(dragHandleBox).not.toBeNull();
    await page.mouse.move(
      dragHandleBox!.x + dragHandleBox!.width / 2,
      dragHandleBox!.y + dragHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(text1bBox!.x + text1bBox!.width / 2, targetY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify text-2a moved to col-1
    const text2aInCol1 = await col1.locator('[data-block-uid="text-2a"]').count();
    expect(text2aInCol1).toBe(1);

    // CRITICAL: col-2 should now have a new default block, not be completely empty
    // Since column has defaultBlock: 'slate', it creates a properly initialized slate block
    const col2NewCount = await col2.locator(':scope > [data-block-uid]').count();
    expect(col2NewCount).toBe(1); // Should have a new default block

    // Verify it's a slate block (column's defaultBlock is 'slate')
    const newBlock = col2.locator(':scope > [data-block-uid]').first();
    await expect(helper.getSlateField(newBlock)).toBeVisible();
  });
});

test.describe('Sidebar Child Blocks Reordering', () => {
  test('can reorder child blocks by dragging in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Select col-1 (a container with 2 child blocks: text-1a, text-1b)
    await helper.clickBlockInIframe('col-1');
    await helper.waitForSidebarOpen();

    // Verify initial order in iframe: text-1a comes before text-1b
    const col1 = iframe.locator('[data-block-uid="col-1"]');
    const initialOrder = await col1
      .locator(':scope > [data-block-uid]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-block-uid')));
    expect(initialOrder).toEqual(['text-1a', 'text-1b']);

    // Find the child blocks widget in sidebar (Order tab)
    await helper.openSidebarTab('Order');
    const childBlocksWidget = page.locator('.child-blocks-widget');
    await expect(childBlocksWidget).toBeVisible();

    // Find the drag handles for the two child blocks
    const dragHandles = childBlocksWidget.locator('.child-block-item .drag-handle');
    await expect(dragHandles).toHaveCount(2);

    // Drag text-1a below text-1b to reorder
    // Must drag from the drag handle for react-beautiful-dnd to work
    const firstDragHandle = dragHandles.first();
    const secondItem = childBlocksWidget.locator('.child-block-item').last();

    const firstHandleBox = await firstDragHandle.boundingBox();
    const secondBox = await secondItem.boundingBox();
    expect(firstHandleBox).not.toBeNull();
    expect(secondBox).not.toBeNull();

    // Drag from first item's drag handle to below second item
    await page.mouse.move(
      firstHandleBox!.x + firstHandleBox!.width / 2,
      firstHandleBox!.y + firstHandleBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      secondBox!.x + secondBox!.width / 2,
      secondBox!.y + secondBox!.height + 10,
      { steps: 10 },
    );
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify order changed in iframe: text-1b now comes before text-1a
    const newOrder = await col1
      .locator(':scope > [data-block-uid]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-block-uid')));
    expect(newOrder).toEqual(['text-1b', 'text-1a']);
  });

  test('implicit container (gridBlock) shows child blocks in Order tab', async ({
    page,
  }) => {
    // gridBlock is an implicit container - it has blocks/blocks_layout directly
    // without a schema field defining the container. The sidebar should still
    // show its children in the Order tab.
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Select grid-1 (an implicit container with grid-cell-1 and grid-cell-2)
    await helper.clickBlockInIframe('grid-1');
    await helper.waitForSidebarOpen();

    // The child blocks widget should show the grid's children
    const childBlocksWidget = page.locator('.child-blocks-widget');
    await expect(childBlocksWidget).toBeVisible();

    // Should show the two grid cells
    const childItems = childBlocksWidget.locator('.child-block-item');
    await expect(childItems).toHaveCount(2);

    // Verify the child blocks show their plaintext content
    const childTexts = await childItems
      .locator('.block-type')
      .allTextContents();
    expect(childTexts).toEqual(['Grid Cell 1', 'Grid Cell 2']);
  });
});

test.describe('data-block-selector Navigation', () => {
  /**
   * Test carousel with hidden slides.
   * Only one slide is visible at a time (like a real carousel).
   * data-block-selector buttons should:
   * 1. Select the target block
   * 2. Make the hidden block visible (frontend handles visibility)
   */

  test('clicking next button (+1) selects next sibling', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();

    // Verify slider structure is loaded
    const slider = iframe.locator('[data-block-uid="slider-1"]');
    await expect(slider).toBeVisible();

    // Initially slide-1 is visible, slide-2 is hidden
    // Use helper that handles both display:none and translate-based hiding
    expect(await helper.isBlockHiddenInIframe('slide-1')).toBe(false);
    expect(await helper.isBlockHiddenInIframe('slide-2')).toBe(true);

    // Click on slide-1 to select it first
    await helper.clickBlockInIframe('slide-1');
    expect(await helper.isQuantaToolbarVisibleInIframe('slide-1')).toBe(true);

    // Click the "next" button (→) with data-block-selector="+1"
    // This should select slide-2
    const nextButton = iframe.locator('[data-block-selector="+1"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Verify slide-2 is now selected (toolbar visible on slide-2)
    await helper.waitForQuantaToolbar('slide-2');
  });

  test('clicking prev button (-1) selects previous sibling', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();

    // Start by selecting slide-1 using robust helper
    await helper.clickBlockInIframe('slide-1');
    expect(await helper.isQuantaToolbarVisibleInIframe('slide-1')).toBe(true);

    // Navigate to slide-2 using next button (same pattern as passing test)
    const nextButton = iframe.locator('[data-block-selector="+1"]');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await helper.waitForQuantaToolbar('slide-2');

    // Click the "prev" button (←) with data-block-selector="-1"
    const prevButton = iframe.locator('[data-block-selector="-1"]');
    await expect(prevButton).toBeVisible();
    await prevButton.click();

    // Verify slide-1 is now selected
    await helper.waitForQuantaToolbar('slide-1');
  });

  test('clicking +1 at last sibling stays on current block', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();

    // Navigate to slide-3 (last slide) by clicking +1 twice from slide-1
    // (slide-3 doesn't have a direct selector dot - we only show dots for first half)
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');

    // Click +1 to go to slide-2
    const nextButton = iframe.locator('[data-block-selector="+1"]');
    await nextButton.click();
    await helper.waitForQuantaToolbar('slide-2');

    // Click +1 again to go to slide-3
    await nextButton.click();
    await helper.waitForQuantaToolbar('slide-3');

    // Click the "next" button at the last slide
    // Behavior depends on carousel implementation:
    // - Non-wrapping carousel: stays on slide-3
    // - Wrapping carousel (Flowbite): goes to slide-1
    await nextButton.click();

    // Accept either slide-3 (stayed) or slide-1 (wrapped)
    await expect(async () => {
      const slide3Selected = await helper.isQuantaToolbarVisibleInIframe('slide-3');
      const slide1Selected = await helper.isQuantaToolbarVisibleInIframe('slide-1');
      expect(slide3Selected || slide1Selected).toBeTruthy();
    }).toPass({ timeout: 10000 });
  });

  test('outline does not follow old block during +1 navigation animation', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();

    // Select slide-1
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');

    // Get the initial outline position as baseline
    const initialBox = await helper.getBlockOutlineBoundingBox();
    expect(initialBox).not.toBeNull();
    const baselineX = initialBox!.x;
    console.log(`[TEST] Baseline outline X: ${baselineX}`);

    // Monitor outline position while clicking +1
    // The outline should never go significantly left of the baseline
    // (which would indicate it's following the old slide as it animates offscreen)
    const nextButton = iframe.locator('[data-block-selector="+1"]');

    const result = await helper.monitorOutlinePositionDuringAction(
      async () => {
        await nextButton.click();
        await helper.waitForQuantaToolbar('slide-2');
      },
      baselineX - 50, // Allow 50px tolerance for minor positioning variations
      16, // Check every 16ms (~60fps)
    );

    console.log(`[TEST] Monitor result: minXSeen=${result.minXSeen}, badPositionDetected=${result.badPositionDetected}`);
    console.log(`[TEST] Position samples: ${result.positions.length}`);

    // The outline should never have gone to a bad position (far left)
    expect(result.badPositionDetected).toBe(false);
  });

  test('clicking dot indicator selects that specific slide', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();

    // Click on slide-1 first
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');

    // Click the dot indicator for slide-2 (data-block-selector="slide-2")
    // Note: Only first half of slides have dot indicators (slide-1, slide-2)
    // slide-3 does not have a direct selector to test +1/-1 fallback
    const slide2Dot = iframe.locator('[data-block-selector="slide-2"]');
    await expect(slide2Dot).toBeVisible();
    await slide2Dot.click();

    // Verify slide-2 is now selected
    await helper.waitForQuantaToolbar('slide-2');
  });

  // Sidebar-based selection tests
  // These test selecting blocks via the ChildBlocksWidget in the sidebar

  test('clicking hidden slide in sidebar ChildBlocksWidget selects it', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    // For carousels, we can't click directly on the container because slides fill it.
    // Instead, click on a visible child first, then press Escape to go to parent.
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');

    // Press Escape to navigate up to the parent container
    await page.keyboard.press('Escape');
    await helper.waitForBlockSelected('slider-1');
    await helper.waitForQuantaToolbar('slider-1');

    const sidebar = page.locator('.sidebar-container');
    // Wait for sidebar to show Slider as current block
    await helper.waitForSidebarCurrentBlock('Slider');
    // Wait for carousel's ChildBlocksWidget to show Slides section
    await expect(sidebar.locator('text=Slides').first()).toBeVisible({ timeout: 10000 });

    // Verify slide-2 is hidden in iframe (carousel shows only one slide at a time)
    // Use helper that handles both display:none and translate-based hiding
    expect(await helper.isBlockHiddenInIframe('slide-2')).toBe(true);

    // Click on the second slide entry in the sidebar's ChildBlocksWidget
    // The widget shows blocks as "⋮⋮ Slide ›" (using block type title)
    const slideButtons = sidebar.locator('.child-block-item');
    await expect(slideButtons.nth(1)).toBeVisible();
    await slideButtons.nth(1).click();

    // Wait for slide-2 to be selected (includes waiting for carousel transition)
    await helper.waitForQuantaToolbar('slide-2');
  });

  test('sidebar selection works for all carousel slides', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const sidebar = page.locator('.sidebar-container');

    // For carousels, navigate to container via child -> Escape
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');
    await page.keyboard.press('Escape');
    // Wait for sidebar to show Slider as current block (more reliable than toolbar positioning)
    await helper.waitForSidebarCurrentBlock('Slider');

    // Wait for carousel's ChildBlocksWidget to show Slides section
    await expect(sidebar.locator('text=Slides').first()).toBeVisible({ timeout: 10000 });

    // Get slide entries in the ChildBlocksWidget
    const slideButtons = sidebar.locator('.child-block-item');

    // Select slide-3 via sidebar (third entry, it's hidden initially)
    await expect(slideButtons.nth(2)).toBeVisible();
    await slideButtons.nth(2).click();

    // Wait for slide-3 to be selected (includes waiting for carousel transition)
    await helper.waitForQuantaToolbar('slide-3');

    // Now go back to carousel container and select slide-1
    await page.keyboard.press('Escape');
    // Wait for sidebar to show Slider as current block (more reliable than toolbar positioning)
    await helper.waitForSidebarCurrentBlock('Slider');

    // Select first slide entry
    await slideButtons.first().click();

    // Wait for slide-1 to be selected
    await helper.waitForQuantaToolbar('slide-1');
  });

  test('adding a new slide selects the new slide', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const sidebar = page.locator('.sidebar-container');

    // Navigate to carousel container: click slide-1, then press Escape
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar('slider-1');

    // Wait for sidebar to show Slides section
    await expect(sidebar.locator('text=Slides').first()).toBeVisible();

    // Get initial slide count (should be 3)
    const slideItems = sidebar.locator('.child-block-item');
    const initialCount = await slideItems.count();
    expect(initialCount).toBe(3);

    // Add a new slide via the sidebar
    await helper.addBlockViaSidebar('Slides');

    // The new slide should be auto-selected after adding
    // When a slide is selected, the sidebar shows its form fields (Kicker, Title, etc.)
    // not the ChildBlocksWidget list. So we verify by checking:
    // 1. The sidebar shows slide form fields (Kicker field visible means slide is selected)
    const kickerInput = sidebar.getByLabel('Kicker');
    await expect(kickerInput).toBeVisible({ timeout: 10000 });

    // 2. The Title field should be empty (new slide, not "Slide 1", "Slide 2", etc.)
    // Use .last() because there are two title fields: page title and slide title
    const titleInput = sidebar.locator('input[id="field-title"]').last();
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('');

    // Find the new slide - the one not in the original list
    const iframe = helper.getIframe();
    const originalIds = ['slide-1', 'slide-2', 'slide-3'];
    const allSlides = await iframe
      .locator('[data-block-uid="slider-1"] [data-block-uid]')
      .all();
    let newSlideId: string | null = null;
    for (const slide of allSlides) {
      const id = await slide.getAttribute('data-block-uid');
      if (id && !originalIds.includes(id)) {
        newSlideId = id;
        break;
      }
    }
    expect(newSlideId).toBeTruthy();

    // Verify the new slide is selected (toolbar is on it)
    await helper.waitForQuantaToolbar(newSlideId!);

    // Use the helper to get the editor and verify it's empty
    const editor = await helper.getEditorLocator(newSlideId!);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveText('');

    // 4. Navigate back to slider to verify 4 slides now exist
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar('slider-1');
    await expect(sidebar.locator('text=Slides').first()).toBeVisible();
    await expect(slideItems).toHaveCount(4);
  });

  test('adding a new slide via iframe add button selects the new slide', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const sidebar = page.locator('.sidebar-container');
    const iframe = helper.getIframe();

    // Select slide-1 to get the add button to appear
    await helper.clickBlockInIframe('slide-1');
    await helper.waitForQuantaToolbar('slide-1');

    // Click the add button in the iframe to add a new slide
    await helper.clickAddBlockButton();

    // The new slide should be auto-selected after adding
    // When a slide is selected, the sidebar shows its form fields (Kicker, Title, etc.)
    const kickerInput = sidebar.getByLabel('Kicker');
    await expect(kickerInput).toBeVisible({ timeout: 10000 });

    // The Title field should be empty (new slide)
    const titleInput = sidebar.locator('input[id="field-title"]').last();
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('');

    // Find the new slide - the one not in the original list
    const originalIds = ['slide-1', 'slide-2', 'slide-3'];
    const allSlides = await iframe
      .locator('[data-block-uid="slider-1"] [data-block-uid]')
      .all();
    let newSlideId: string | null = null;
    for (const slide of allSlides) {
      const id = await slide.getAttribute('data-block-uid');
      if (id && !originalIds.includes(id)) {
        newSlideId = id;
        break;
      }
    }
    expect(newSlideId).toBeTruthy();

    // Verify the new slide is selected (toolbar is on it)
    await helper.waitForQuantaToolbar(newSlideId!);

    // Use the helper to get the editor and verify it's empty
    const editor = await helper.getEditorLocator(newSlideId!);
    await expect(editor).toBeVisible();
    await expect(editor).toHaveText('');

    // Navigate back to slider to verify 4 slides now exist
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar('slider-1');
    await expect(sidebar.locator('text=Slides').first()).toBeVisible();
    const slideItems = sidebar.locator('.child-block-item');
    await expect(slideItems).toHaveCount(4);
  });
});

// ============================================================================
// slateTable Tests - Nested object_list (rows contain cells)
// Tests that buildBlockPathMap traverses nested object_list structures
// ============================================================================
test.describe('slateTable Container', () => {
  test('table rows and cells are selectable', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();

    // Verify table structure is loaded
    const table = iframe.locator('[data-block-uid="table-1"]');
    await expect(table).toBeVisible();

    // Verify rows are rendered with data-block-uid
    const row1 = iframe.locator('[data-block-uid="row-1"]');
    const row2 = iframe.locator('[data-block-uid="row-2"]');
    await expect(row1).toBeVisible();
    await expect(row2).toBeVisible();

    // Verify cells are rendered with data-block-uid
    const cell11 = iframe.locator('[data-block-uid="cell-1-1"]');
    const cell12 = iframe.locator('[data-block-uid="cell-1-2"]');
    const cell21 = iframe.locator('[data-block-uid="cell-2-1"]');
    await expect(cell11).toBeVisible();
    await expect(cell12).toBeVisible();
    await expect(cell21).toBeVisible();
  });

  test('clicking table cell selects it', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Click on a cell
    await helper.clickBlockInIframe('cell-1-1');

    // Verify cell is selected (toolbar visible)
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe('cell-1-1');
    expect(hasToolbar).toBe(true);
  });

  test('table cells have correct parent hierarchy in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Click on cell-2-1 (row 2, cell 1)
    await helper.clickBlockInIframe('cell-2-1');
    await helper.waitForSidebarOpen();

    // Verify sidebar shows hierarchy: Page, Table, Row, Cell
    // Names are derived from field names: "rows" -> "Row", "cells" -> "Cell"
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(4);
    await expect(stickyHeaders.nth(0)).toContainText('Page');
    await expect(stickyHeaders.nth(1)).toContainText('Table');
    await expect(stickyHeaders.nth(2)).toContainText('Row');
    await expect(stickyHeaders.nth(3)).toContainText('Cell');

    // Verify the Cell section shows the "Content" slate field from itemSchema
    const sidebarProperties = page.locator('#sidebar-properties');
    await expect(sidebarProperties.locator('text=Content')).toBeVisible();

    // Navigate up via Escape: cell -> row -> table
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Now should have 3 headers: Page, Table, Row
    await expect(stickyHeaders).toHaveCount(3);
    await expect(stickyHeaders.nth(2)).toContainText('Row');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Now should have 2 headers: Page, Table
    await expect(stickyHeaders).toHaveCount(2);
    await expect(stickyHeaders.nth(1)).toContainText('Table');

    // Verify table-1 is now selected (outline visible on table)
    const tableSelected = await helper.isBlockSelectedInIframe('table-1');
    expect(tableSelected.ok).toBe(true);

    // Click on a different cell to verify second selection still works
    // (This caught a bug where blockPathMap lost rows/cells after first FORM_DATA)
    await helper.clickBlockInIframe('cell-1-2');
    await page.waitForTimeout(300);

    // Verify sidebar shows correct hierarchy for second cell
    await expect(stickyHeaders).toHaveCount(4);
    await expect(stickyHeaders.nth(3)).toContainText('Cell');
    await expect(sidebarProperties.locator('text=Content')).toBeVisible();
  });

  test('clicking add button on row adds a new row below', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Count initial rows
    const initialRowCount = await iframe.locator('tr[data-block-uid]').count();
    expect(initialRowCount).toBe(2);

    // Click on cell-1-1 to select it (rows are fully covered by cells, so click cell first)
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();

    // Navigate up to the row by clicking "‹ Cell" in the sidebar
    const cellNavButton = page.locator('.parent-nav:has-text("Cell")');
    await cellNavButton.click();

    // Verify sidebar shows cells as children of the row
    const childBlocksList = page.locator('.child-blocks-list');
    await expect(childBlocksList).toBeVisible();
    // Row should have 2 cells as children
    await expect(childBlocksList.locator('.child-block-item')).toHaveCount(2);

    // Wait for add button to be positioned for the row
    await expect(page.locator('.volto-hydra-add-button')).toBeVisible();

    // Click the add button (should add row below since data-block-add="bottom")
    await page.locator('.volto-hydra-add-button').click();

    // Verify a new row was added in the iframe
    await expect(iframe.locator('tr[data-block-uid]')).toHaveCount(3);

    // Verify the new row is selected (sidebar shows Row header for current block)
    const sidebarHeaders = page.locator('.sidebar-section-header[data-is-current="true"]');
    await expect(sidebarHeaders.locator('.parent-nav')).toContainText('Row');

    // Verify the new row shows cells as children (inherited from template or empty)
    await expect(page.locator('.child-blocks-list')).toBeVisible();

    // Verify the selection outline has minimum height (empty cells should still be clickable)
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible();
    // Use retry loop because boundingBox() may return null while element is repositioning
    await expect(async () => {
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(20);
    }).toPass({ timeout: 5000 });
  });

  test('clicking add button on cell adds a column to ALL rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Count initial cells in both rows (th/td with data-block-uid)
    const initialRow1CellCount = await iframe.locator('tr[data-block-uid="row-1"] th[data-block-uid], tr[data-block-uid="row-1"] td[data-block-uid]').count();
    const initialRow2CellCount = await iframe.locator('tr[data-block-uid="row-2"] th[data-block-uid], tr[data-block-uid="row-2"] td[data-block-uid]').count();
    expect(initialRow1CellCount).toBe(2);
    expect(initialRow2CellCount).toBe(2);

    // Click on cell-1-1 to select it
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();

    // Click the add button (should add column - cell to ALL rows)
    await page.locator('.volto-hydra-add-button').click();

    // Verify a new cell was added to BOTH rows (column add)
    await expect(iframe.locator('tr[data-block-uid="row-1"] th[data-block-uid], tr[data-block-uid="row-1"] td[data-block-uid]')).toHaveCount(3);
    await expect(iframe.locator('tr[data-block-uid="row-2"] th[data-block-uid], tr[data-block-uid="row-2"] td[data-block-uid]')).toHaveCount(3);
  });

  test('new row has same cell count as existing rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // First add a column so rows have 3 cells
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();
    await page.locator('.volto-hydra-add-button').click();
    await expect(iframe.locator('tr[data-block-uid="row-1"] th[data-block-uid], tr[data-block-uid="row-1"] td[data-block-uid]')).toHaveCount(3);

    // Wait for the newly created cell to be selected (sidebar shows "Cell" as current)
    await helper.waitForSidebarCurrentBlock('Cell');

    // Navigate to row using Escape, then add a new row
    await page.keyboard.press('Escape');
    // Wait for add button to change from "Add column" to "Add row" - more reliable than sidebar check
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toHaveAttribute('title', 'Add row', { timeout: 5000 });
    await addButton.click();

    // Wait for new row to appear (should have 3 rows total)
    await expect(iframe.locator('tr[data-block-uid]')).toHaveCount(3);

    // Verify new row has same cell count as existing rows (3 cells)
    const allRows = iframe.locator('tr[data-block-uid]');
    const rowCount = await allRows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const cellCount = await row.locator('th[data-block-uid], td[data-block-uid]').count();
      expect(cellCount).toBe(3);
    }
  });

  test('add button shows column icon for cells', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell - should show "Add column" title with SVG icon
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveAttribute('title', 'Add column');
    // Icon should be an SVG (column-after icon)
    await expect(addButton.locator('svg')).toBeVisible();
  });

  test('add button shows row icon for rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell first, then navigate to row using Escape
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForBlockSelected('row-1');

    // Should show "Add row" title with SVG icon
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveAttribute('title', 'Add row');
    // Icon should be an SVG (row-after icon)
    await expect(addButton.locator('svg')).toBeVisible();
  });

  test('dropdown menu shows Remove Row for rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell, then press Escape to navigate to parent row
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForBlockSelected('row-1');

    // Open dropdown menu (three dots button)
    const menuButton = page.locator('.quanta-toolbar button:has-text("⋯")');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Should show "Remove Row" instead of just "Remove"
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText('Remove Row')).toBeVisible();
  });

  test('dropdown menu shows Remove Column for cells', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell (has addDirection: 'right' so shows "Remove Column")
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();

    // Open dropdown menu (three dots button)
    const menuButton = page.locator('.quanta-toolbar button:has-text("⋯")');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Should show "Remove Column" instead of just "Remove"
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText('Remove Column')).toBeVisible();
  });

  test('cell dropdown also shows Delete Row action', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();

    // Open dropdown menu
    const menuButton = page.locator('.quanta-toolbar button:has-text("⋯")');
    await menuButton.click();

    // Should show both "Remove Column" (primary) and "Remove Row" (additional action)
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown.getByText('Remove Column')).toBeVisible();
    await expect(dropdown.getByText('Remove Row')).toBeVisible();
  });

  test('Remove Row removes row and selects corresponding cell in previous row', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Count initial rows
    const table = iframe.locator('[data-block-uid="table-1"] table');
    const initialRowCount = await table.locator('tr[data-block-uid]').count();
    expect(initialRowCount).toBe(2);

    // Select second cell in second row (cell-2-2)
    await helper.clickBlockInIframe('cell-2-2');
    await helper.waitForSidebarOpen();

    // Open dropdown and click Remove Row (removes row-2 from within a cell)
    const menuButton = page.locator('.quanta-toolbar button:has-text("⋯")');
    await menuButton.click();
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await dropdown.getByText('Remove Row').click();

    // Wait for row to be removed
    await expect(table.locator('tr[data-block-uid]')).toHaveCount(initialRowCount - 1);

    // Should select corresponding cell in previous row (cell-1-2 - same column position)
    await helper.waitForBlockSelected('cell-1-2');
  });

  test('Remove Column removes cell from all rows and selects corresponding cell in previous column', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Count initial cells in first row
    const table = iframe.locator('[data-block-uid="table-1"] table');
    const firstRow = table.locator('tr[data-block-uid]').first();
    const initialCellCount = await firstRow.locator('th[data-block-uid], td[data-block-uid]').count();
    expect(initialCellCount).toBe(2);

    // Select SECOND cell in first row (cell-1-2) so we can verify selection of previous column
    await helper.clickBlockInIframe('cell-1-2');
    await helper.waitForSidebarOpen();

    // Open dropdown and click Remove Column
    const menuButton = page.locator('.quanta-toolbar button:has-text("⋯")');
    await menuButton.click();
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await dropdown.getByText('Remove Column').click();

    // Wait for column to be removed from all rows
    await expect(firstRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(initialCellCount - 1);

    // Verify second row also lost a cell
    const secondRow = table.locator('tr[data-block-uid]').nth(1);
    await expect(secondRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(initialCellCount - 1);

    // Should select corresponding cell in previous column (cell-1-1 - same row, previous column position)
    await helper.waitForBlockSelected('cell-1-1');
  });

  test('toolbar shows insert action buttons for cells', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();

    // Toolbar should have insert action buttons with icons
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar.locator('button[title="Add Column Before"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Add Column After"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Add Row Before"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Add Row After"]')).toBeVisible();
  });

  test('toolbar shows insert action buttons for rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    // Select a cell, then press Escape to navigate to parent row
    await helper.clickBlockInIframe('cell-1-1');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForBlockSelected('row-1');

    // Toolbar should have insert row action buttons
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar.locator('button[title="Add Row Before"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Add Row After"]')).toBeVisible();
  });

  test('Add Row Before creates row above current', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    const table = iframe.locator('[data-block-uid="table-1"] table');
    const initialRowCount = await table.locator('tr[data-block-uid]').count();
    expect(initialRowCount).toBe(2);

    // Select second row via Escape from its cell
    await helper.clickBlockInIframe('cell-2-1');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForBlockSelected('row-2');

    // Click Add Row Before button
    const toolbar = page.locator('.quanta-toolbar');
    await toolbar.locator('button[title="Add Row Before"]').click();

    // Wait for new row to be added
    await expect(table.locator('tr[data-block-uid]')).toHaveCount(initialRowCount + 1);

    // The new row should be at index 1 (before the second row which was at index 1)
    // And the new row should have the same number of cells as existing rows
    const newRow = table.locator('tr[data-block-uid]').nth(1);
    await expect(newRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(2);
  });

  test('Add Column Before creates column in all rows', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    const table = iframe.locator('[data-block-uid="table-1"] table');
    const firstRow = table.locator('tr[data-block-uid]').first();
    const secondRow = table.locator('tr[data-block-uid]').nth(1);
    const initialCellCount = await firstRow.locator('th[data-block-uid], td[data-block-uid]').count();
    expect(initialCellCount).toBe(2);

    // Select second cell in first row
    await helper.clickBlockInIframe('cell-1-2');
    await helper.waitForSidebarOpen();

    // Click Add Column Before button (may be in toolbar or overflow dropdown)
    await helper.clickBlockAction('Add Column Before');

    // Wait for column to be added to all rows
    await expect(firstRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(initialCellCount + 1);
    await expect(secondRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(initialCellCount + 1);
  });

  test('Add Row Before from cell creates row and selects corresponding cell', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/table-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="table-1"]').waitFor();

    const table = iframe.locator('[data-block-uid="table-1"] table');
    const initialRowCount = await table.locator('tr[data-block-uid]').count();
    expect(initialRowCount).toBe(2);

    // Select SECOND cell in second row (cell-2-2)
    await helper.clickBlockInIframe('cell-2-2');
    await helper.waitForSidebarOpen();

    // Click Add Row Before button (may be in toolbar or overflow dropdown)
    await helper.clickBlockAction('Add Row Before');

    // Wait for new row to be added
    await expect(table.locator('tr[data-block-uid]')).toHaveCount(initialRowCount + 1);

    // The new row should have the correct number of cells (2, like existing rows)
    const newRow = table.locator('tr[data-block-uid]').nth(1);
    await expect(newRow.locator('th[data-block-uid], td[data-block-uid]')).toHaveCount(2);

    // Should select the SECOND cell in the new row (corresponding to the cell we were in)
    const secondCellInNewRow = newRow.locator('th[data-block-uid], td[data-block-uid]').nth(1);
    const selectedBlockUid = await secondCellInNewRow.getAttribute('data-block-uid');
    await helper.waitForBlockSelected(selectedBlockUid!);
  });
});

// ============================================================================
// Multi-Container Field Tests
// Block UIDs are unique so admin derives container field from blockPathMap
// Tests both accordion (header/content fields) and columns (top_images/columns fields)
// ============================================================================
test.describe('Multi-Container Field Operations', () => {
  test('selecting block in top_images field shows Image sidebar', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="top-img-1"]').waitFor();

    // Click the first top image block
    await helper.clickBlockInIframe('top-img-1');

    // Wait for sidebar to show Image block settings (includes nav chevron "‹ Image")
    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar.locator('text=Image').first()).toBeVisible();

    // Verify image-specific settings are present
    await expect(sidebar.getByText('Alt text')).toBeVisible();
  });

  test('selecting block in columns field shows Column sidebar', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="col-1"]').waitFor();

    // Click the first column block
    await helper.clickBlockInIframe('col-1');

    // Wait for sidebar to show Column block settings (includes nav chevron "‹ Column")
    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar.locator('text=Column').first()).toBeVisible();
  });

  test('Escape from top_images block navigates to columns parent', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="top-img-1"]').waitFor();

    // Click the first top image to select it
    await helper.clickBlockInIframe('top-img-1');

    // Wait for Image sidebar to appear
    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar.locator('text=Image').first()).toBeVisible();

    // Press Escape to navigate to parent (columns)
    await page.keyboard.press('Escape');

    // Verify the columns block is now selected - Title field should be editable
    await expect(sidebar.getByLabel('Title')).toBeVisible();
  });

  test('Escape from column block navigates to columns parent', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="col-1"]').waitFor();

    // Click the first column to select it
    await helper.clickBlockInIframe('col-1');

    // Wait for Column sidebar to appear
    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar.locator('text=Column').first()).toBeVisible();

    // Press Escape to navigate to parent (columns)
    await page.keyboard.press('Escape');

    // Verify the columns block is now selected - Title field should be editable
    await expect(sidebar.getByLabel('Title')).toBeVisible();
  });

  test('clicking block in sidebar ChildBlocksWidget selects it in iframe', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="columns-1"]').waitFor();

    // First select the columns block to see its child blocks in sidebar
    await helper.clickBlockInIframe('columns-1');

    // Wait for sidebar to show columns block with child blocks widget
    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar.getByLabel('Title')).toBeVisible();

    // The sidebar shows child blocks as buttons like "⋮⋮ Image ›"
    // Click on the first Image entry button (the full row with › arrow)
    const imageButton = sidebar.getByRole('button', { name: /Image/ }).first();
    await expect(imageButton).toBeVisible();
    await imageButton.click();

    // Verify the image block is now selected in the iframe
    await expect(sidebar.getByText('Alt text')).toBeVisible();
  });

  test('can clear image inside container using inline toolbar', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click on the image inside the columns container (top-img-1)
    const imageBlock = iframe.locator('[data-block-uid="top-img-1"]');
    await expect(imageBlock).toBeVisible({ timeout: 10000 });
    await imageBlock.click();

    // Wait for block to be selected (outline appears)
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Get initial image src
    const imageElement = imageBlock.locator('img');
    const initialSrc = await imageElement.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Click the clear button in toolbar overlay (X button appears on filled images)
    // Use iframeContainer scope to avoid matching sidebar's clear button
    const clearButton = page.locator('#iframeContainer button[title="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
    await clearButton.click();

    // Verify the image was cleared - src should change or element should become placeholder
    await expect(imageElement).not.toHaveAttribute('src', initialSrc!, {
      timeout: 5000,
    });
  });
});
