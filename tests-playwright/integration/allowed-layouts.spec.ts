/**
 * Integration tests for allowedLayouts configuration.
 *
 * Tests that:
 * 1. LayoutSelector visibility is controlled by allowedLayouts (not allowedTemplates)
 * 2. allowedLayouts and allowedTemplates work independently
 * 3. Applying a layout merges existing content correctly
 * 4. Fixed edge blocks prevent insertion outside them
 * 5. Layouts can be switched while preserving content
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('allowedLayouts', () => {
  test.describe('LayoutSelector Visibility', () => {
    test('shows Layout dropdown when allowedLayouts is configured', async ({ page }) => {
      const helper = new AdminUIHelper(page);

      await helper.login();
      // test-page should have allowedLayouts configured
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Click to deselect blocks and show page-level sidebar
      await page.keyboard.press('Escape');

      // Verify Layout dropdown is visible in sidebar
      const layoutSelector = page.locator('.layout-selector');
      await expect(layoutSelector).toBeVisible();
    });

    test('hides Layout dropdown when allowedLayouts is empty', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // template-test-page has a grid block from the template - grid containers don't have allowedLayouts
      await helper.navigateToEdit('/template-test-page');
      await helper.waitForIframeReady();

      // Click on a grid cell to select it and show the grid container in sidebar
      await helper.clickBlockByContent('Template Grid Cell 1');
      await helper.waitForSidebarOpen();

      // The grid container section should not have a layout selector (no allowedLayouts configured)
      const gridSection = page.locator('.container-field-section').filter({ has: page.locator('.widget-title', { hasText: /Grid/i }) });
      const gridLayoutSelector = gridSection.locator('.layout-selector');
      await expect(gridLayoutSelector).not.toBeVisible();
    });
  });

  test.describe('allowedLayouts vs allowedTemplates Independence', () => {
    test('template in allowedLayouts appears in Layout dropdown', async ({ page }) => {
      const helper = new AdminUIHelper(page);

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Show page-level sidebar
      await page.keyboard.press('Escape');

      // Open layout dropdown - wait for it to be visible first
      const layoutSelector = page.locator('.layout-selector select');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });
      await layoutSelector.click();

      // Verify template appears as option
      const options = await layoutSelector.locator('option').allTextContents();
      expect(options.some(o => o.toLowerCase().includes('header footer'))).toBe(true);
    });
  });

  test.describe('Apply Layout Merging', () => {
    test('existing blocks move into default placeholder', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // Use another-page which has no listings (avoids listing expansion duplicates)
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Remember initial block order
      const initialBlocks = await iframe.locator('[data-block-uid]').allTextContents();
      expect(initialBlocks.length).toBeGreaterThan(0);

      // Show page-level sidebar
      await page.keyboard.press('Escape');

      // Select header-footer-layout and apply
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');

      const applyButton = page.locator('.apply-layout-btn');
      await applyButton.click();

      // Wait for layout to be applied - sidebar shows stable admin state
      await expect(page.locator('.child-block-item', { hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.child-block-item', { hasText: 'Layout Footer' })).toBeVisible({ timeout: 5000 });

      // Verify structure: header, existing content, footer
      // Use main/content selector for broader compatibility (test frontend uses #content, Nuxt uses main)
      const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
      const headerIndex = allBlocks.findIndex(t => t.includes('Layout Header'));
      const footerIndex = allBlocks.findIndex(t => t.includes('Layout Footer'));

      expect(headerIndex).toBe(0); // Header at start
      expect(footerIndex).toBe(allBlocks.length - 1); // Footer at end
      expect(footerIndex - headerIndex).toBeGreaterThan(1); // Content between them
    });

    test('fixed header block appears at start and is locked', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for header to appear
      const { locator: headerBlock } = await helper.waitForBlockByContent('Layout Header');

      // Click header block
      await headerBlock.click();
      await helper.waitForSidebarOpen();

      // Verify lock icon in toolbar
      const toolbar = page.locator('.quanta-toolbar');
      const lockIcon = toolbar.locator('.lock-icon');
      await expect(lockIcon).toBeVisible();
    });

  });

  test.describe('Fixed Edge Blocks Prevent Insertion', () => {
    test('cannot add block before fixed header at edge', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for header
      const { locator: headerBlock } = await helper.waitForBlockByContent('Layout Header');

      // Click header block
      await headerBlock.click();
      await helper.waitForSidebarOpen();

      // Check that "add before" is not available
      // The add button in quanta toolbar should not offer "add before" for edge fixed block
      const toolbar = page.locator('.quanta-toolbar');
      const addBeforeButton = toolbar.locator('[aria-label*="before"], [title*="before"]');
      await expect(addBeforeButton).not.toBeVisible();
    });

    test('cannot add block after fixed footer at edge', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // Use another-page which has no listings (avoids listing expansion duplicates)
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout to be applied - sidebar shows stable admin state
      await expect(page.locator('.child-block-item', { hasText: 'Layout Footer' })).toBeVisible({ timeout: 5000 });

      // Click footer block in iframe (use main/content selector for broader compatibility)
      const footerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Layout Footer' });
      await footerBlock.click();
      await helper.waitForSidebarOpen();

      // Check that "add after" is not available
      const toolbar = page.locator('.quanta-toolbar');
      const addAfterButton = toolbar.locator('[aria-label*="after"], [title*="after"]');
      await expect(addAfterButton).not.toBeVisible();
    });

    test('CAN add block between fixed header and content', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await helper.waitForBlockByContent('Layout Header');

      // Find the first non-fixed block (existing content that was moved)
      const allBlocks = iframe.locator('[data-block-uid]');
      const blockCount = await allBlocks.count();

      // Click second block (should be user content, after header)
      if (blockCount > 1) {
        const secondBlock = allBlocks.nth(1);
        await secondBlock.click();
        await helper.waitForSidebarOpen();

        // There should be an add button available
        await helper.clickAddBlockButton();
        const chooserVisible = await helper.isBlockChooserVisible();
        expect(chooserVisible).toBe(true);
      }
    });
  });

  test.describe('Fixed Edge Blocks Prevent DnD', () => {
    test('cannot drag block to before fixed header at edge', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      const { locator: headerBlock } = await helper.waitForBlockByContent('Layout Header');

      // Get block positions before drag
      const allBlocks = iframe.locator('[data-block-uid]');
      const blockCount = await allBlocks.count();
      expect(blockCount).toBeGreaterThan(2);

      // Try to drag second block (content) to before header
      const contentBlock = allBlocks.nth(1);
      const headerBox = await headerBlock.boundingBox();
      const contentBox = await contentBlock.boundingBox();

      if (headerBox && contentBox) {
        // Drag content block to above header
        await contentBlock.hover();
        await page.mouse.down();
        await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y - 10);
        await page.mouse.up();

        // Verify header is still first (drag was prevented/reverted)
        const firstBlockText = await allBlocks.first().textContent();
        expect(firstBlockText).toContain('Layout Header');
      }
    });

    test('cannot drag block to after fixed footer at edge', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // Use another-page which has no listings (avoids listing expansion duplicates)
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Apply layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout to be applied - sidebar shows stable admin state
      await expect(page.locator('.child-block-item', { hasText: 'Layout Footer' })).toBeVisible({ timeout: 5000 });

      // Get footer block and block positions (use main/content selector for broader compatibility)
      const footerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Layout Footer' });
      const allBlocks = iframe.locator('main [data-block-uid], #content [data-block-uid]');
      const blockCount = await allBlocks.count();
      expect(blockCount).toBeGreaterThan(2);

      // Try to drag second block (content) to after footer
      const contentBlock = allBlocks.nth(1);
      const footerBox = await footerBlock.boundingBox();
      const contentBox = await contentBlock.boundingBox();

      if (footerBox && contentBox) {
        // Drag content block to below footer
        await contentBlock.hover();
        await page.mouse.down();
        await page.mouse.move(footerBox.x + footerBox.width / 2, footerBox.y + footerBox.height + 10);
        await page.mouse.up();

        // Verify footer is still last (drag was prevented/reverted)
        const lastBlockText = await allBlocks.last().textContent();
        expect(lastBlockText).toContain('Layout Footer');
      }
    });
  });

  test.describe('Switching Layouts', () => {
    test('content preserved when switching layouts with matching placeholders', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Get initial content text
      const initialContent = await iframe.locator('[data-block-uid="block-1-uuid"]').textContent();

      // Apply header-footer layout (has "default" placeholder)
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await helper.waitForBlockByContent('Layout Header');

      // Verify original content is still there (moved to default placeholder)
      const contentAfterLayout = await iframe.locator('[data-block-uid]').allTextContents();
      const contentPreserved = contentAfterLayout.some(t => t.includes(initialContent || 'Block'));
      expect(contentPreserved).toBe(true);
    });

    test('multiple blocks in matching placeholder preserved when switching layouts', async ({ page }) => {
      const helper = new AdminUIHelper(page);

      await helper.login();
      // test-page has multiple blocks - including "Block 1" and "Welcome" (hero heading)
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Verify multiple user blocks exist before layout
      const { locator: block1 } = await helper.waitForBlockByContent('test paragraph');
      const { locator: block2 } = await helper.waitForBlockByContent('Another paragraph');
      await expect(block1).toBeVisible();
      await expect(block2).toBeVisible();

      // Apply header-footer layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await helper.waitForBlockByContent('Layout Header');

      // Verify both user blocks still exist after first layout
      await expect(block1).toBeVisible();
      await expect(block2).toBeVisible();

      // Switch to editable-fixed layout
      await page.keyboard.press('Escape');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });
      await layoutSelector.selectOption('Editable Fixed Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for new layout
      await helper.waitForBlockByContent('Editable Header');

      // Old fixed blocks should be replaced
      const iframe = helper.getIframe();
      await expect(iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' }).first()).not.toBeVisible();

      // BOTH user blocks should still be preserved after switching
      await expect(block1).toBeVisible();
      await expect(block2).toBeVisible();
    });

    test('non-matching placeholder content goes to default', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      const originalContent = 'another test page';

      // Apply header-footer layout (has header, default, footer placeholders)
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await expect(iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Layout Footer' })).toBeVisible({ timeout: 5000 });

      // Switch to header-only layout (has header, default but NO footer placeholder)
      await page.keyboard.press('Escape');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });
      await layoutSelector.selectOption('Header Only Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for new layout
      await expect(iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Header Only' })).toBeVisible({ timeout: 5000 });

      // Old fixed blocks gone (no matching footer placeholder in new layout)
      const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
      expect(allBlocks.some(t => t.includes('Layout Footer'))).toBe(false);
      expect(allBlocks.some(t => t.includes('Layout Header'))).toBe(false);

      // User content preserved in default placeholder
      expect(allBlocks.some(t => t.includes(originalContent))).toBe(true);
    });
  });

  test.describe('Single Fixed Edge (Header Only)', () => {
    test('fixed header at top, content flows to free bottom edge', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Apply header-only layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Only Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout - sidebar shows stable state
      await expect(page.locator('.child-block-item', { hasText: 'Header Only' })).toBeVisible({ timeout: 5000 });

      // Verify structure: header at top, content after, NO fixed footer (use main/content selector for broader compatibility)
      const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
      const headerIndex = allBlocks.findIndex(t => t.includes('Header Only'));
      const footerIndex = allBlocks.findIndex(t => t.includes('Layout Footer'));

      expect(headerIndex).toBe(0); // Header at start
      expect(footerIndex).toBe(-1); // No footer
      expect(allBlocks.length).toBeGreaterThan(1); // Header + content
    });

    test('cannot add block before fixed header (constrained edge)', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Apply header-only layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Only Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await expect(page.locator('.child-block-item', { hasText: 'Header Only' })).toBeVisible({ timeout: 5000 });

      // Click header block (use main/content selector for broader compatibility)
      const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Header Only' });
      await headerBlock.click();
      await helper.waitForSidebarOpen();

      // Check that "add before" is not available for fixed header at edge
      const toolbar = page.locator('.quanta-toolbar');
      const addBeforeButton = toolbar.locator('[aria-label*="before"], [title*="before"]');
      await expect(addBeforeButton).not.toBeVisible();
    });

    test('CAN add block after last block (free bottom edge)', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Apply header-only layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Only Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout
      await expect(page.locator('.child-block-item', { hasText: 'Header Only' })).toBeVisible({ timeout: 5000 });

      // Click last block (should be content, not header) - use main/content selector for broader compatibility
      const allBlocks = iframe.locator('main [data-block-uid], #content [data-block-uid]');
      const lastBlock = allBlocks.last();
      await lastBlock.click();
      await helper.waitForSidebarOpen();

      // Should be able to add block after (free edge)
      await helper.clickAddBlockButton();
      const chooserVisible = await helper.isBlockChooserVisible();
      expect(chooserVisible).toBe(true);
    });
  });

  test.describe('Forced Layouts', () => {
    test('footer_blocks with allowedLayouts auto-applies layout in edit mode', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // another-page has footer_blocks data (no template markers) and allowedLayouts forces footer-layout
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Verify the forced layout was applied - fixed branding block should appear
      const footerContent = iframe.locator('#footer-content');
      const brandingBlock = footerContent.locator('[data-block-uid]').filter({ hasText: 'Footer Branding - Forced Layout' });
      await expect(brandingBlock).toBeVisible({ timeout: 10000 });

      // User content should still be there (moved to default placeholder)
      const userContent = footerContent.locator('[data-block-uid]').filter({ hasText: 'Footer user content' });
      await expect(userContent).toBeVisible();

      // Branding block should be first (fixed at top)
      const allFooterBlocks = footerContent.locator('[data-block-uid]');
      const firstBlockText = await allFooterBlocks.first().textContent();
      expect(firstBlockText).toContain('Footer Branding');
    });

    test('footer_blocks with allowedLayouts auto-applies layout in view mode', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      // Navigate to view mode (not edit mode) through the admin UI
      await helper.login();
      await helper.navigateToView('/another-page');
      await helper.waitForIframeReady();

      // Wait for footer to render with forced layout in iframe
      const footerContent = iframe.locator('#footer-content');
      await footerContent.waitFor({ timeout: 10000 });

      // Verify the forced layout was applied
      const brandingBlock = footerContent.locator('[data-block-uid]').filter({ hasText: 'Footer Branding - Forced Layout' });
      await expect(brandingBlock).toBeVisible({ timeout: 10000 });

      // User content should still be there
      const userContent = footerContent.locator('[data-block-uid]').filter({ hasText: 'Footer user content' });
      await expect(userContent).toBeVisible();
    });

    test('fixed block from forced layout is locked', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/another-page');
      await helper.waitForIframeReady();

      // Click the fixed branding block in the footer area
      const footerContent = iframe.locator('#footer-content');
      const brandingBlock = footerContent.locator('[data-block-uid]').filter({ hasText: 'Footer Branding - Forced Layout' });
      await expect(brandingBlock).toBeVisible({ timeout: 10000 });
      await brandingBlock.click();
      await helper.waitForSidebarOpen();

      // Wait for toolbar to appear and verify lock icon
      const toolbar = page.locator('.quanta-toolbar');
      await expect(toolbar).toBeVisible({ timeout: 5000 });
      const lockIcon = toolbar.locator('.lock-icon');
      await expect(lockIcon).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('None Option in allowedLayouts', () => {
    test('pages without template stay template-free when null is in allowedLayouts', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // test-page has no template markers in its data, and allowedLayouts includes null
      // so it should NOT auto-apply a template
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Verify NO template fixed blocks were auto-applied
      // (test-layout has "Template Header - From Template" as fixed header)
      const templateHeader = iframe.locator('[data-block-uid]').filter({ hasText: 'Template Header - From Template' });
      await expect(templateHeader).not.toBeVisible();

      // User's original content should be at the top (not pushed down by template)
      const firstBlock = iframe.locator('[data-block-uid]').first();
      const firstBlockText = await firstBlock.textContent();
      // First block should be user content, not template content
      expect(firstBlockText).not.toContain('Template Header');
      expect(firstBlockText).not.toContain('Layout Header');
    });

    test('Layout dropdown shows None option when null is in allowedLayouts', async ({ page }) => {
      const helper = new AdminUIHelper(page);

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Show page-level sidebar
      await page.keyboard.press('Escape');

      // Open layout dropdown
      const layoutSelector = page.locator('.layout-selector select');
      await expect(layoutSelector).toBeVisible({ timeout: 5000 });

      // Verify "None" option exists
      const options = await layoutSelector.locator('option').allTextContents();
      expect(options.some(o => o.toLowerCase() === 'none' || o.toLowerCase() === 'no layout')).toBe(true);
    });

    test('selecting None removes template and restores content', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // First apply a layout
      await page.keyboard.press('Escape');
      const layoutSelector = page.locator('.layout-selector select');
      await layoutSelector.selectOption('Header Footer Layout');
      await page.locator('.apply-layout-btn').click();

      // Wait for layout to be applied - check sidebar shows the fixed blocks
      await expect(page.locator('.child-block-item', { hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.child-block-item', { hasText: 'Layout Footer' })).toBeVisible({ timeout: 5000 });

      // Now select None to remove the layout
      await page.keyboard.press('Escape');
      await layoutSelector.selectOption({ label: 'None' });
      await page.locator('.apply-layout-btn').click();

      // Wait for template fixed blocks to be removed from sidebar
      await expect(page.locator('.child-block-item', { hasText: 'Layout Header' })).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.child-block-item', { hasText: 'Layout Footer' })).not.toBeVisible({ timeout: 5000 });

      // User content should still be there
      await helper.waitForBlockByContent('test paragraph');
    });
  });

  test.describe('Empty Page Blocks Fields', () => {
    test('page without footer_blocks data gets default block injected', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // template-test-page has no footer_blocks in its data, but schema defines footer_blocks field
      await helper.navigateToEdit('/template-test-page');
      await helper.waitForIframeReady();

      // footer_blocks has allowedBlocks: ['slate', 'image'], so the default block is 'slate'
      // (config.settings.defaultBlockType is allowed). Verify a block is injected.
      const footerContent = iframe.locator('#footer-content');
      const footerBlocks = footerContent.locator('[data-block-uid]');
      await expect(footerBlocks.first()).toBeVisible({ timeout: 5000 });

      // Click the footer block — it should be selectable (slate block, not empty)
      const blockId = await footerBlocks.first().getAttribute('data-block-uid');
      await helper.clickBlockInIframe(blockId!);
      await helper.waitForSidebarOpen();
    });

    test('footer block in template edit mode is readonly', async ({ page }) => {
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      await helper.navigateToEdit('/template-test-page');
      await helper.waitForIframeReady();

      // Select a template block to show template settings in sidebar
      const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Header' }).first();
      await expect(headerBlock).toBeVisible();
      await headerBlock.click();
      const headerBlockId = await headerBlock.getAttribute('data-block-uid');
      await helper.waitForQuantaToolbar(headerBlockId!);

      // Enter template edit mode — blocks outside the template become readonly
      const editTemplateLabel = page.getByText('Edit Template', { exact: true });
      await editTemplateLabel.click();

      // Footer block should be locked (outside the template)
      const footerBlock = iframe.locator('#footer-content [data-block-uid]').first();
      await expect(footerBlock).toBeVisible({ timeout: 5000 });
      await expect(footerBlock.locator('.hydra-locked')).toBeVisible({ timeout: 5000 }).catch(() => {
        // The locked class might be on the block itself
        return expect(footerBlock).toHaveClass(/hydra-locked/, { timeout: 5000 });
      });
    });
  });
});
