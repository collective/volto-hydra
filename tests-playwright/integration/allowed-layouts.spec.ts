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

    test('hides Layout dropdown when allowedLayouts is empty', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'nuxt', 'Nuxt frontend has allowedLayouts configured');
      const helper = new AdminUIHelper(page);

      await helper.login();
      // footer_blocks field has no allowedLayouts
      await helper.navigateToEdit('/test-page');
      await helper.waitForIframeReady();

      // Click to show page-level sidebar
      await page.keyboard.press('Escape');

      // Check the footer section - should not have layout selector
      // Use exact match for the section title to avoid matching "Header Footer Layout" in Blocks section
      const footerSection = page.locator('.container-field-section').filter({ has: page.locator('.widget-title', { hasText: /^Footer$/ }) });
      const footerLayoutSelector = footerSection.locator('.layout-selector');
      await expect(footerLayoutSelector).not.toBeVisible();
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

      // Open layout dropdown
      const layoutSelector = page.locator('.layout-selector select');
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
      // Scope to #content to only check main blocks field (not footer_blocks)
      const allBlocks = await iframe.locator('#content [data-block-uid]').allTextContents();
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
      const headerBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' });
      await expect(headerBlock).toBeVisible({ timeout: 5000 });

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
      const headerBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' });
      await expect(headerBlock).toBeVisible({ timeout: 5000 });

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

      // Click footer block in iframe
      const footerBlock = iframe.locator('#content [data-block-uid]').filter({ hasText: 'Layout Footer' });
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
      await expect(iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });

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
      const headerBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' });
      await expect(headerBlock).toBeVisible({ timeout: 5000 });

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

      // Get footer block and block positions (scope to #content)
      const footerBlock = iframe.locator('#content [data-block-uid]').filter({ hasText: 'Layout Footer' });
      const allBlocks = iframe.locator('#content [data-block-uid]');
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
      await expect(iframe.locator('[data-block-uid]').filter({ hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });

      // Verify original content is still there (moved to default placeholder)
      const contentAfterLayout = await iframe.locator('[data-block-uid]').allTextContents();
      const contentPreserved = contentAfterLayout.some(t => t.includes(initialContent || 'Block'));
      expect(contentPreserved).toBe(true);
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

      // Verify structure: header at top, content after, NO fixed footer
      const allBlocks = await iframe.locator('#content [data-block-uid]').allTextContents();
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

      // Click header block
      const headerBlock = iframe.locator('#content [data-block-uid]').filter({ hasText: 'Header Only' });
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

      // Click last block (should be content, not header)
      const allBlocks = iframe.locator('#content [data-block-uid]');
      const lastBlock = allBlocks.last();
      await lastBlock.click();
      await helper.waitForSidebarOpen();

      // Should be able to add block after (free edge)
      await helper.clickAddBlockButton();
      const chooserVisible = await helper.isBlockChooserVisible();
      expect(chooserVisible).toBe(true);
    });
  });

  test.describe('Empty Page Blocks Fields', () => {
    test('page without footer_blocks data gets empty block injected', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'nuxt', 'Nuxt frontend has different page field config');
      const helper = new AdminUIHelper(page);
      const iframe = helper.getIframe();

      await helper.login();
      // template-test-page has no footer_blocks in its data, but schema defines footer_blocks field
      await helper.navigateToEdit('/template-test-page');
      await helper.waitForIframeReady();

      // Debug: Check if footer_blocks is being rendered
      const footerContent = iframe.locator('#footer-content');
      const footerBlocks = footerContent.locator('[data-block-uid]');
      const footerBlockCount = await footerBlocks.count();
      console.log('[TEST] Footer blocks count:', footerBlockCount);

      if (footerBlockCount > 0) {
        const blockId = await footerBlocks.first().getAttribute('data-block-uid');
        const hasEmptyAttr = await footerBlocks.first().getAttribute('data-hydra-empty');
        console.log('[TEST] First footer block ID:', blockId, 'has data-hydra-empty:', hasEmptyAttr);
      }

      // Verify empty block is rendered in iframe's footer section with data-hydra-empty attribute
      const emptyBlock = await helper.waitForEmptyBlock('#footer-content');

      // Click the empty block - should open BlockChooser
      await emptyBlock.click();
      const chooserVisible = await helper.isBlockChooserVisible();
      expect(chooserVisible).toBe(true);
    });

    test('readonly empty block (in template edit mode) does NOT open BlockChooser', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'nuxt', 'Nuxt frontend has different page field config');
      const helper = new AdminUIHelper(page);

      await helper.login();
      await helper.navigateToEdit('/template-test-page');
      await helper.waitForIframeReady();

      // Select a template block to show template settings in sidebar
      await helper.clickBlockInIframe('template-header');
      await helper.waitForQuantaToolbar('template-header');

      // Enter template edit mode by clicking "Edit Template" checkbox in sidebar
      // This makes all blocks outside the template readonly
      const editTemplateCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('~ *', { hasText: /Edit Template/i }) });
      // Alternative: find by the label text
      const editTemplateLabel = page.getByText('Edit Template', { exact: true });
      await editTemplateLabel.click();

      // Wait for template edit mode to be active (blocks outside template get locked class)
      const iframe = helper.getIframe();
      await expect(iframe.locator('#footer-content [data-hydra-empty].hydra-locked')).toBeVisible({ timeout: 5000 });

      // Now footer_blocks empty block should be readonly (outside the template)
      const emptyBlock = iframe.locator('#footer-content [data-hydra-empty]');

      // Click the readonly empty block
      await emptyBlock.click();

      // Verify BlockChooser did NOT open for readonly empty block
      const chooserVisible = await helper.isBlockChooserVisible();
      expect(chooserVisible).toBe(false);
    });
  });
});
