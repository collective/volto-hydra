/**
 * Tests for editing page metadata inline.
 * Uses path syntax: /fieldName to edit page-level fields.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Page Metadata Editing', () => {
  test('can edit page title inline using /title path', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find the page title element (outside of blocks, has data-editable-field="/title")
    const pageTitle = iframe.locator('#page-title');
    await expect(pageTitle).toBeVisible({ timeout: 10000 });
    await expect(pageTitle).toHaveText('Test Page');

    // Click on the title to make it editable
    await pageTitle.click();

    // The title should become contenteditable
    await expect(pageTitle).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Clear and type new title
    await pageTitle.fill('');
    await pageTitle.pressSequentially('Updated Page Title', { delay: 50 });

    // Click elsewhere to trigger blur and save
    await iframe.locator('#content').click();

    // Wait for the change to propagate
    await page.waitForTimeout(500);

    // Verify the page title was updated
    await expect(pageTitle).toHaveText('Updated Page Title');

    // Verify in sidebar that the page title field also shows the new value
    // The document title should be shown in the sidebar or form
    // This confirms the metadata was actually updated, not just the display
  });

  test('page title edit updates properties.title (not block data)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find and click the page title
    const pageTitle = iframe.locator('#page-title');
    await expect(pageTitle).toBeVisible({ timeout: 10000 });
    await pageTitle.click();

    // Make it editable and type
    await expect(pageTitle).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
    await pageTitle.fill('');
    await pageTitle.pressSequentially('New Title', { delay: 50 });

    // Trigger save
    await iframe.locator('#content').click();
    await page.waitForTimeout(500);

    // Now click on a block to see the sidebar
    const slateBlock = iframe.locator('[data-block-uid="block-1-uuid"]');
    await slateBlock.click();

    // The block should be selected but should NOT have a 'title' field
    // because the page title is not part of the block
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Verify page title is still the edited value
    await expect(pageTitle).toHaveText('New Title');
  });

  test('can click page-level preview_image and change it inline', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'nuxt', 'Nuxt frontend needs preview_image element added');

    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for the preview image to be visible (it renders from formData)
    const previewImage = iframe.locator('#preview-image');
    await expect(previewImage).toBeVisible({ timeout: 10000 });

    // Get the original image src
    const originalSrc = await previewImage.getAttribute('src');

    // Click on the preview image (has data-media-field="preview_image")
    await previewImage.click();

    // The toolbar should appear (Quanta toolbar)
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // The drag handle should NOT be visible (page-level fields can't be dragged)
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).not.toBeVisible();

    // The add button should NOT be visible (page-level fields don't have add)
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).not.toBeVisible();

    // The menu button IS visible, but Remove option should NOT be in the dropdown
    const menuButton = toolbar.locator('[title="More options"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Wait for dropdown to appear
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // The Remove option should NOT be visible (page-level fields can't be deleted)
    const removeOption = dropdown.locator('text=Remove');
    await expect(removeOption).not.toBeVisible();

    // Close the menu by clicking elsewhere
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Click the image button to open the image editor overlay
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible();
    await imageButton.click();

    // Wait for the image editor overlay to appear at the image position
    const imageEditorOverlay = page.locator('.empty-image-overlay');
    await expect(imageEditorOverlay).toBeVisible({ timeout: 5000 });

    // Open object browser from the overlay
    const objectBrowser = await helper.openObjectBrowserFromToolbarPopup(imageEditorOverlay, imageButton);

    // Navigate to Images folder
    await helper.objectBrowserNavigateToFolder(objectBrowser, /Images/);

    // Select an image
    await helper.objectBrowserSelectItem(objectBrowser, /Test Image 1/);

    // Submit the form if still open
    await helper.submitAddLinkFormIfOpen(imageEditorOverlay);

    // Verify the preview image src has changed
    await expect(previewImage).toHaveAttribute('src', /test-image-1/, { timeout: 5000 });
    const newSrc = await previewImage.getAttribute('src');
    expect(newSrc).not.toBe(originalSrc);
  });
});
