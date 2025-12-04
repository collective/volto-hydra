/**
 * Integration tests for Quanta Toolbar in Volto Hydra.
 *
 * The Quanta Toolbar is rendered in the parent window (Volto) when a block is selected.
 * It provides buttons for: Drag handle, Format buttons (for Slate blocks).
 * The Add button is rendered separately in the iframe.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Quanta Toolbar - Visibility', () => {
  test('Quanta Toolbar appears when block is selected', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on a block to select it
    await helper.clickBlockInIframe('block-1-uuid');

    // Verify Quanta Toolbar is visible in parent window
    const toolbarVisible = await helper.isQuantaToolbarVisibleInIframe('block-1-uuid');
    expect(toolbarVisible).toBe(true);
  });

  test('Quanta Toolbar has buttons when Slate block selected', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');

    // Get all toolbar buttons
    const buttons = await helper.getQuantaToolbarButtons();
    console.log('[TEST] Toolbar buttons:', buttons);

    // Should have at least some buttons
    expect(buttons.length).toBeGreaterThan(0);

    // Check for expected format buttons (by title)
    const buttonTitles = buttons.map((b) => b.title.toLowerCase());
    expect(buttonTitles.some((t) => t.includes('bold'))).toBe(true);
    expect(buttonTitles.some((t) => t.includes('italic'))).toBe(true);
  });
});

test.describe('Quanta Toolbar - Format Buttons (Slate Blocks)', () => {
  test('Format buttons appear for Slate/text blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');

    // Get all toolbar buttons
    const buttons = await helper.getQuantaToolbarButtons();
    const buttonTitles = buttons.map((b) => b.title.toLowerCase());

    // Format buttons should exist for Slate blocks
    expect(buttonTitles.some((t) => t.includes('bold'))).toBe(true);
    expect(buttonTitles.some((t) => t.includes('italic'))).toBe(true);
    expect(buttonTitles.some((t) => t.includes('link'))).toBe(true);
  });

  test('Format buttons do NOT appear for Image blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');

    // Get all toolbar buttons
    const buttons = await helper.getQuantaToolbarButtons();
    const buttonTitles = buttons.map((b) => b.title.toLowerCase());

    // Format buttons should NOT exist for Image blocks
    expect(buttonTitles.some((t) => t.includes('bold'))).toBe(false);
    expect(buttonTitles.some((t) => t.includes('italic'))).toBe(false);
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
    let menu = await helper.getQuantaToolbarMenu(blockId);
    await expect(menu).not.toBeVisible();

    // Click menu button
    await helper.openQuantaToolbarMenu(blockId);

    // Dropdown should now be visible
    menu = await helper.getQuantaToolbarMenu(blockId);
    await expect(menu).toBeVisible();
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

    // Verify block exists - use dynamic count, don't hardcode
    const initialBlockCount = await helper.getBlockCountInIframe();
    expect(initialBlockCount).toBeGreaterThanOrEqual(3);

    // Select block and open menu
    await helper.clickBlockInIframe(blockId);
    await helper.openQuantaToolbarMenu(blockId);

    // Click Remove
    await helper.clickQuantaToolbarMenuOption(blockId, 'Remove');

    // Wait for block to be removed (one less than initial)
    await helper.waitForBlockCountToBe(initialBlockCount - 1);

    // Verify block count decreased by 1
    const finalBlockCount = await helper.getBlockCountInIframe();
    expect(finalBlockCount).toBe(initialBlockCount - 1);
  });
});

test.describe('Quanta Toolbar - Different Block Types', () => {
  test('Slate blocks have format buttons, Image blocks do not', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Slate block should have format buttons
    await helper.clickBlockInIframe('block-1-uuid');
    let buttons = await helper.getQuantaToolbarButtons();
    let hasBold = buttons.some((b) => b.title.toLowerCase().includes('bold'));
    expect(hasBold).toBe(true);

    // Image block should NOT have format buttons
    await helper.clickBlockInIframe('block-2-uuid');
    buttons = await helper.getQuantaToolbarButtons();
    hasBold = buttons.some((b) => b.title.toLowerCase().includes('bold'));
    expect(hasBold).toBe(false);

    // Another Slate block should have format buttons
    await helper.clickBlockInIframe('block-3-uuid');
    buttons = await helper.getQuantaToolbarButtons();
    hasBold = buttons.some((b) => b.title.toLowerCase().includes('bold'));
    expect(hasBold).toBe(true);
  });
});
