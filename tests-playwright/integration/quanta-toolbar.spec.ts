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

test.describe('Quanta Toolbar - Config Matching', () => {
  test('Toolbar buttons should match Volto Slate toolbar config exactly', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Click the block in the iframe and wait for toolbar to appear
    await helper.clickBlockInIframe(blockId);

    // Wait for Quanta toolbar to appear
    const toolbarVisible = await helper.isQuantaToolbarVisibleInIframe(blockId);
    expect(toolbarVisible).toBe(true);

    // Get the iframe
    const iframe = helper.getIframe();

    // Focus the Slate editor in the sidebar to make the Volto toolbar appear
    // The Slate toolbar is rendered via createPortal to document.body
    const slateEditable = page.locator('[contenteditable="true"][role="textbox"]').first();

    // Triple-click to select all text in the paragraph (more reliable than keyboard shortcuts)
    await slateEditable.click({ clickCount: 3 });
    await page.waitForTimeout(500); // Wait for selection to register

    // Wait for the Volto Slate toolbar to appear in the sidebar (portaled to body)
    const voltoToolbar = page.locator('.slate-inline-toolbar, .slate-toolbar, [class*="toolbar"]').first();
    await voltoToolbar.waitFor({ state: 'visible', timeout: 10000 });

    // Extract button metadata from the actual Volto Slate toolbar
    const voltoButtons = await page.evaluate(() => {
      // Find the Volto Slate toolbar (rendered via portal to document.body)
      const toolbar = document.querySelector('.slate-inline-toolbar, .slate-toolbar');
      if (!toolbar) return [];

      // Find all buttons/links in the toolbar (Volto uses <a> tags, not <button>)
      const buttons = toolbar.querySelectorAll('button, a[role="button"]');
      const buttonData = [];

      for (const button of buttons) {
        // Get the title (aria-label or title attribute)
        const title = button.getAttribute('aria-label') || button.getAttribute('title') || '';

        // Get the SVG icon if present
        const svg = button.querySelector('svg');
        const svgOuterHTML = svg ? svg.outerHTML : '';

        // Get test ID if present
        const testId = button.getAttribute('data-testid') || '';

        if (title || testId) {
          buttonData.push({ title, testId, hasSvg: !!svg, svgOuterHTML });
        }
      }

      return buttonData;
    });

    console.log('[TEST] Volto Slate toolbar buttons:', voltoButtons);

    // Wait a bit for the Quanta toolbar buttons to be fully rendered
    await page.waitForTimeout(500);

    // Extract button metadata from the iframe toolbar
    // Use locator().evaluateAll() to run code in the iframe context
    const iframeButtons = await iframe.locator('.volto-hydra-format-button').evaluateAll((buttons) => {
      const buttonData: Array<{ title: string; testId: string; hasSvg: boolean; svgOuterHTML: string }> = [];

      for (const button of buttons) {
        const title = button.getAttribute('title') || '';
        const testId = button.getAttribute('data-testid') || '';
        const svg = button.querySelector('svg');
        const svgOuterHTML = svg ? svg.outerHTML : '';

        if (title || testId) {
          buttonData.push({ title, testId, hasSvg: !!svg, svgOuterHTML });
        }
      }

      return buttonData;
    });

    console.log('[TEST] Iframe toolbar buttons:', iframeButtons);

    // Compare the two lists
    // Filter out separators and compare by title or testId
    const voltoButtonTitles = voltoButtons.map((b: { title: string; testId: string }) => b.title || b.testId).filter((t: string) => t);
    const iframeButtonTitles = iframeButtons.map((b: { title: string; testId: string }) => b.title || b.testId).filter((t: string) => t);

    console.log('[TEST] Volto button titles:', voltoButtonTitles);
    console.log('[TEST] Iframe button titles:', iframeButtonTitles);

    // MUST have buttons - test should fail if no buttons found
    expect(voltoButtonTitles.length).toBeGreaterThan(0);
    expect(iframeButtonTitles.length).toBeGreaterThan(0);

    // Verify the button titles match
    expect(iframeButtonTitles.sort()).toEqual(voltoButtonTitles.sort());

    // Verify the icons (SVG) match for each button
    for (let i = 0; i < voltoButtons.length; i++) {
      const voltoButton = voltoButtons[i];
      const iframeButton = iframeButtons.find((b: any) =>
        (b.title || b.testId) === (voltoButton.title || voltoButton.testId)
      );

      if (iframeButton) {
        expect(iframeButton.svgOuterHTML).toEqual(voltoButton.svgOuterHTML);
      }
    }
  });
});
