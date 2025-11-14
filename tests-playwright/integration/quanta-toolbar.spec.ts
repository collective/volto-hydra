/**
 * Integration tests for Quanta Toolbar in Volto Hydra.
 *
 * The Quanta Toolbar is created by hydra.js inside the iframe when a block is selected.
 * It provides buttons for: Add, Drag, Format (for text blocks), Menu (Settings/Remove).
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Quanta Toolbar - Basic Buttons', () => {
  test('Quanta Toolbar appears when block is selected', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on a block to select it
    const blockId = 'block-1-uuid';
    await helper.clickBlockInIframe(blockId);

    // Verify Quanta Toolbar is visible
    const toolbarVisible = await helper.isQuantaToolbarVisibleInIframe(blockId);
    expect(toolbarVisible).toBe(true);
  });

  test('Add button is present on all blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Check Add button on Slate block
    await helper.clickBlockInIframe('block-1-uuid');
    let buttons = await helper.getQuantaToolbarButtons('block-1-uuid');
    expect(buttons.addButton).toBe(true);

    // Check Add button on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    buttons = await helper.getQuantaToolbarButtons('block-2-uuid');
    expect(buttons.addButton).toBe(true);
  });

  test('Drag button is present on all blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    await helper.clickBlockInIframe('block-1-uuid');
    const buttons = await helper.getQuantaToolbarButtons('block-1-uuid');

    expect(buttons.dragButton).toBe(true);
  });

  test('Menu button is present on all blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    await helper.clickBlockInIframe('block-1-uuid');
    const buttons = await helper.getQuantaToolbarButtons('block-1-uuid');

    expect(buttons.menuButton).toBe(true);
  });
});

test.describe('Quanta Toolbar - Format Buttons (Slate Blocks)', () => {
  test('Format buttons appear for Slate/text blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');
    const buttons = await helper.getQuantaToolbarButtons('block-1-uuid');

    // Format buttons should exist for Slate blocks
    expect(buttons.formatButtons).toBeDefined();
    expect(buttons.formatButtons?.bold).toBe(true);
    expect(buttons.formatButtons?.italic).toBe(true);
    expect(buttons.formatButtons?.strikethrough).toBe(true);
    expect(buttons.formatButtons?.link).toBe(true);
  });

  test('Format buttons do NOT appear for Image blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    const buttons = await helper.getQuantaToolbarButtons('block-2-uuid');

    // Format buttons should NOT exist for Image blocks
    expect(buttons.formatButtons).toBeUndefined();
  });
});

test.describe('Quanta Toolbar - Dropdown Menu', () => {
  test('Dropdown menu opens when menu button is clicked', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    await helper.clickBlockInIframe(blockId);

    // Initially dropdown should not be visible
    let menuOpen = await helper.isQuantaToolbarMenuOpen(blockId);
    expect(menuOpen).toBe(false);

    // Click menu button
    await helper.openQuantaToolbarMenu(blockId);

    // Dropdown should now be visible
    menuOpen = await helper.isQuantaToolbarMenuOpen(blockId);
    expect(menuOpen).toBe(true);
  });

  test('Dropdown menu contains Settings and Remove options', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    await helper.clickBlockInIframe(blockId);
    await helper.openQuantaToolbarMenu(blockId);

    // Get menu options
    const options = await helper.getQuantaToolbarMenuOptions(blockId);

    expect(options).toContain('Settings');
    expect(options).toContain('Remove');
    expect(options.length).toBe(2);
  });

  test('Clicking Remove option triggers delete', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Verify block exists
    let blockCount = await helper.getBlockCountInIframe();
    expect(blockCount).toBe(3);

    // Select block and open menu
    await helper.clickBlockInIframe(blockId);
    await helper.openQuantaToolbarMenu(blockId);

    // Click Remove
    await helper.clickQuantaToolbarMenuOption(blockId, 'Remove');

    // Wait for block to be removed
    await helper.waitForBlockCountToBe(2);

    // Verify block count decreased
    blockCount = await helper.getBlockCountInIframe();
    expect(blockCount).toBe(2);
  });
});

test.describe('Quanta Toolbar - Different Block Types', () => {
  test('All blocks have core toolbar buttons (Add, Drag, Menu)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockIds = ['block-1-uuid', 'block-2-uuid', 'block-3-uuid'];

    for (const blockId of blockIds) {
      await helper.clickBlockInIframe(blockId);
      const buttons = await helper.getQuantaToolbarButtons(blockId);

      // All blocks should have these buttons
      expect(buttons.addButton, `Add button missing for ${blockId}`).toBe(true);
      expect(buttons.dragButton, `Drag button missing for ${blockId}`).toBe(true);
      expect(buttons.menuButton, `Menu button missing for ${blockId}`).toBe(true);
    }
  });

  test('Only Slate blocks have format buttons', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Slate blocks should have format buttons
    await helper.clickBlockInIframe('block-1-uuid');
    let buttons = await helper.getQuantaToolbarButtons('block-1-uuid');
    expect(buttons.formatButtons).toBeDefined();

    await helper.clickBlockInIframe('block-3-uuid');
    buttons = await helper.getQuantaToolbarButtons('block-3-uuid');
    expect(buttons.formatButtons).toBeDefined();

    // Image block should NOT have format buttons
    await helper.clickBlockInIframe('block-2-uuid');
    buttons = await helper.getQuantaToolbarButtons('block-2-uuid');
    expect(buttons.formatButtons).toBeUndefined();
  });
});
