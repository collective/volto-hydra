/**
 * Tests for inline media and link editing.
 *
 * These tests verify that:
 * - Image fields can be edited via toolbar overlay (browse, upload, URL)
 * - Link fields can be edited via sidebar object browser
 * - Image clear/replace works from inline overlays
 * - Upload and drag-drop functionality
 *
 * Uses the hero block which has:
 * - image: media field with inline toolbar editing
 * - buttonLink: linkable field with sidebar editing
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline image editing', () => {
  test('can select an image from toolbar object browser', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block's image element (has data-media-field="image")
    const iframe = helper.getIframe();
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible();
    await heroImage.click();

    // Wait for toolbar to appear with the image button
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });

    // Click the image button to open the image editor overlay (at image position)
    await imageButton.click();

    // Wait for the image editor overlay to appear
    const imageEditorOverlay = page.locator('.empty-image-overlay');
    await expect(imageEditorOverlay).toBeVisible({ timeout: 5000 });

    // Open object browser from the overlay (clears existing value if needed)
    const objectBrowser = await helper.openObjectBrowserFromToolbarPopup(imageEditorOverlay, imageButton);

    // Navigate to Images folder (object browser opens at root)
    await helper.objectBrowserNavigateToFolder(objectBrowser, /Images/);

    // Select the image
    await helper.objectBrowserSelectItem(objectBrowser, /Test Image 1/);

    // Submit the AddLinkForm if still open
    await helper.submitAddLinkFormIfOpen(imageEditorOverlay);

    // Verify the image in iframe updated
    await expect(heroImage).toHaveAttribute('src', /test-image-1/, { timeout: 5000 });
  });

  test('image selection updates the iframe preview', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block's image
    const iframe = helper.getIframe();
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await heroImage.click();

    // Get the current image src
    const initialSrc = await heroImage.getAttribute('src');

    // Click image button in toolbar
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });
    await imageButton.click();

    // Wait for the image editor overlay (at image position)
    const imageEditorOverlay = page.locator('.empty-image-overlay');
    await expect(imageEditorOverlay).toBeVisible({ timeout: 5000 });

    // Open object browser from the overlay (clears existing value if needed)
    const objectBrowser = await helper.openObjectBrowserFromToolbarPopup(imageEditorOverlay, imageButton);
    await helper.objectBrowserNavigateToFolder(objectBrowser, /Images/);
    await helper.objectBrowserSelectItem(objectBrowser, /Test Image 1/);

    // Submit the AddLinkForm if still open
    await helper.submitAddLinkFormIfOpen(imageEditorOverlay);

    // Verify the iframe image src changed
    await expect(heroImage).toHaveAttribute('src', /test-image-1/, { timeout: 5000 });
    const newSrc = await heroImage.getAttribute('src');
    expect(newSrc).not.toBe(initialSrc);
  });

  test('can enter external image URL via toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block's image element
    const iframe = helper.getIframe();
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible();
    await heroImage.click();

    // Wait for toolbar to appear with the image button
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });

    // Click the image button to open the image editor overlay (shown at image position)
    await imageButton.click();

    // Wait for the image editor overlay to appear (replaces image with ImageInput)
    const imageEditorOverlay = page.locator('.empty-image-overlay');
    await expect(imageEditorOverlay).toBeVisible({ timeout: 5000 });

    // Wait for URL input to be visible and ready
    const urlInput = imageEditorOverlay.locator('input[name="link"]');
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill('https://picsum.photos/400/300');

    // Click the submit button (arrow icon)
    const submitButton = imageEditorOverlay.locator('button[aria-label="Submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for overlay to close (indicates submission completed)
    await expect(imageEditorOverlay).not.toBeVisible({ timeout: 5000 });

    // Verify the image src was updated to the external URL
    // Use regex to match since Nuxt may transform the URL
    await expect(heroImage).toHaveAttribute('src', /picsum\.photos.*400.*300|400\/300/, { timeout: 5000 });
  });

  test('can clear image using X button overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block (not specifically the image) to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroBlock).toBeVisible();

    // Verify the image has a src (not empty)
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Scroll the hero block into view and click to select it
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Wait for the clear button overlay to appear (top-right X button)
    // This should appear when the block is selected, not just when the image is clicked
    const clearButton = page.locator('button[title="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });

    // Scroll to ensure clear button is clickable
    await clearButton.scrollIntoViewIfNeeded();
    await clearButton.click();

    // Verify the image was cleared - the element should now be the empty placeholder
    // or have an empty/placeholder src
    const heroImagePlaceholder = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImagePlaceholder).toBeVisible({ timeout: 5000 });

    // Check that either:
    // 1. The src is now empty/different from before, OR
    // 2. The element changed to a div placeholder (not img)
    const tagName = await heroImagePlaceholder.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'img') {
      const newSrc = await heroImagePlaceholder.getAttribute('src');
      expect(newSrc).not.toBe(initialSrc);
    } else {
      // It's now a placeholder div, which means image was cleared
      expect(tagName).toBe('div');
    }

    // Verify the AddLinkForm appears inside the hero block's image area (not at page bottom)
    const addLinkForm = page.locator('.empty-image-overlay');
    await expect(addLinkForm).toBeVisible({ timeout: 5000 });

    // Get bounding boxes to verify positioning
    const heroBlockBox = await heroBlock.boundingBox();
    const addLinkFormBox = await addLinkForm.boundingBox();

    expect(heroBlockBox).toBeTruthy();
    expect(addLinkFormBox).toBeTruthy();

    // AddLinkForm should be within the hero block's vertical bounds
    // (form top should be above hero block bottom)
    expect(addLinkFormBox!.y + addLinkFormBox!.height).toBeLessThanOrEqual(
      heroBlockBox!.y + heroBlockBox!.height + 10 // 10px tolerance
    );
  });
});

test.describe('Inline link editing', () => {
  test('can edit hero button link via toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero button (has data-linkable-field="buttonLink")
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    const heroButton = heroBlock.locator('[data-linkable-field="buttonLink"]');

    // Scroll hero block to center first, then click the button
    await helper.scrollBlockIntoViewWithToolbarRoom('block-4-hero');
    await expect(heroButton).toBeVisible();
    await heroButton.click();

    // Wait for toolbar to appear
    await helper.waitForQuantaToolbar('block-4-hero');

    // Wait for link button in toolbar
    const toolbar = page.locator('.quanta-toolbar');
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await expect(linkButton).toBeVisible({ timeout: 5000 });

    // Click the link button to open AddLinkForm
    await linkButton.click();

    // Wait for the link editor popup to appear
    const linkForm = page.locator('.field-link-editor .link-form-container');
    await expect(linkForm).toBeVisible({ timeout: 5000 });

    // Find the URL input and change it
    const urlInput = linkForm.locator('input[name="link"]');
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill('https://new-link.example.com');

    // Submit the form
    const submitButton = linkForm.locator('button[aria-label="Submit"]');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Verify the link was updated in the iframe
    await expect(heroButton).toHaveAttribute('href', 'https://new-link.example.com', { timeout: 5000 });
  });

  test('can open link in new tab from AddLinkForm', async ({ page, context }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero button to select it
    const iframe = helper.getIframe();
    const heroButton = iframe.locator('[data-block-uid="block-4-hero"] [data-linkable-field="buttonLink"]');
    await expect(heroButton).toBeVisible();
    await heroButton.click();

    // Open the link editor via toolbar
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await expect(linkButton).toBeVisible({ timeout: 5000 });
    await linkButton.click();

    // Wait for the link form
    const linkForm = page.locator('.field-link-editor .link-form-container');
    await expect(linkForm).toBeVisible({ timeout: 5000 });

    // Enter a URL
    const urlInput = linkForm.locator('input[name="link"]');
    await urlInput.fill('https://example.com/test-link');

    // Find the "Open in new tab" button
    const openButton = linkForm.locator('button[aria-label="Open link in new tab"]');
    await expect(openButton).toBeVisible({ timeout: 5000 });

    // Click the button and wait for a new page to open
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      openButton.click(),
    ]);

    // Verify the new page opened with the correct URL
    expect(newPage.url()).toBe('https://example.com/test-link');

    // Close the new page
    await newPage.close();
  });

  test('link field shows in sidebar for hero block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await heroBlock.click();
    await helper.waitForSidebarOpen();
    await helper.waitForSidebarCurrentBlock('Hero');

    // Find the buttonLink field in the sidebar
    const linkField = page.locator('.field-wrapper-buttonLink');
    await expect(linkField).toBeVisible({ timeout: 5000 });
  });

  test('can enter external URL in link field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await heroBlock.click();
    await helper.waitForSidebarOpen();
    await helper.waitForSidebarCurrentBlock('Hero');

    // Find the buttonLink field in the sidebar
    const linkField = page.locator('.field-wrapper-buttonLink');
    await expect(linkField).toBeVisible({ timeout: 5000 });

    // First clear any existing value - the "Open object browser" button shows X icon when there's a value
    // Clicking it clears the value (for mode !== 'multiple')
    const actionButton = linkField.locator('button[aria-label="Open object browser"]');
    await expect(actionButton).toBeVisible({ timeout: 5000 });
    await actionButton.click();

    // Now the input for external URLs should appear (when allowExternals=true and no items)
    const urlInput = linkField.locator('input');
    await expect(urlInput).toBeVisible({ timeout: 5000 });

    // Type an external URL
    await urlInput.fill('https://example.com/external-link');

    // Press Enter to confirm
    await urlInput.press('Enter');

    // Verify the URL was saved - check the iframe's button href
    const heroButton = iframe.locator('[data-block-uid="block-4-hero"] [data-linkable-field="buttonLink"]');
    await expect(heroButton).toHaveAttribute('href', 'https://example.com/external-link', { timeout: 5000 });
  });

  test('can select internal link from object browser', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await heroBlock.click();
    await helper.waitForSidebarOpen();
    await helper.waitForSidebarCurrentBlock('Hero');

    // Find the buttonLink field and open object browser
    const linkField = page.locator('.field-wrapper-buttonLink');
    await expect(linkField).toBeVisible({ timeout: 5000 });

    // Click the browse button - first click clears existing value (buttonLink already has a value)
    const browseButton = linkField.locator('button[aria-label="Open object browser"]');
    await expect(browseButton).toBeVisible({ timeout: 5000 });
    await expect(browseButton).toBeEnabled({ timeout: 5000 });
    await browseButton.click();

    // Second click opens the object browser (now that value is cleared)
    await browseButton.click();

    // Wait for object browser - this handles navigating to Home if needed
    const objectBrowser = await helper.waitForObjectBrowser();

    // Select "Another Page"
    await helper.objectBrowserSelectItem(objectBrowser, /Another Page/);

    // Verify the link was updated in the iframe
    const heroButton = iframe.locator('[data-block-uid="block-4-hero"] [data-linkable-field="buttonLink"]');
    await expect(heroButton).toHaveAttribute('href', /another-page/, { timeout: 5000 });
  });
});

test.describe('Image upload and drag-drop', () => {
  test('upload button is visible in empty image overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.click();

    // Wait for clear button to appear (in sidebar)
    const clearButton = page.locator('button[aria-label="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });

    // Track image src to detect when it's cleared
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    const initialSrc = await heroImage.getAttribute('src');
    // Force click in case the button position is awkward
    await clearButton.click({ force: true });

    // Wait for image to be cleared
    if (initialSrc) {
      await expect(heroImage).not.toHaveAttribute('src', initialSrc, { timeout: 5000 });
    }

    // Verify empty image overlay appears with upload button
    const emptyOverlay = page.locator('.empty-image-overlay');
    await expect(emptyOverlay).toBeVisible({ timeout: 5000 });

    // The upload button should be in the AddLinkForm - look for the upload icon button
    const uploadButton = emptyOverlay.locator('button[aria-label="Upload image"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });
  });

  test('upload button is visible in toolbar image editor overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block's image element
    const iframe = helper.getIframe();
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible();
    await heroImage.click();

    // Wait for toolbar image button and click it
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });
    await imageButton.click();

    // Wait for the image editor overlay (now shown at image position, not as popup)
    const imageEditorOverlay = page.locator('.empty-image-overlay');
    await expect(imageEditorOverlay).toBeVisible({ timeout: 5000 });

    // The upload button should be visible in the overlay
    const uploadButton = imageEditorOverlay.locator('button[aria-label="Upload image"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });
  });

  test('can upload image file and see it appear in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    // Scroll hero block into view before clicking (ensures clear button will be visible)
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get the hero image element
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Scroll the image into view so the clear button overlay will be positioned in viewport
    await heroImage.scrollIntoViewIfNeeded();

    // Wait for clear button to appear and be in viewport
    const clearButton = page.locator('button[title="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });

    // Click the clear button
    await clearButton.click();

    // Wait for image src to change (cleared) before checking overlay
    if (initialSrc) {
      await expect(heroImage).not.toHaveAttribute('src', initialSrc, { timeout: 5000 });
    }

    // Wait for empty overlay to appear
    const emptyOverlay = page.locator('.empty-image-overlay');
    await expect(emptyOverlay).toBeVisible({ timeout: 5000 });

    // Find the file input and upload a test image
    // Use first() to get Dropzone's input (has multiple attribute), not AddLinkForm's
    const fileInput = emptyOverlay.locator('input[type="file"][accept="image/*"]').first();
    await expect(fileInput).toBeAttached();

    // Create a simple 1x1 red PNG image as a Buffer
    // PNG header + IHDR + IDAT + IEND for minimal valid PNG
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR length + type
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // depth, color, compression, filter, interlace, CRC
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT length + type
      0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, // compressed pixel data (red)
      0x05, 0xfe, 0x02, 0xfe, // CRC
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND length + type
      0xae, 0x42, 0x60, 0x82 // IEND CRC
    ]);

    // Upload the file
    await fileInput.setInputFiles({
      name: 'test-upload.png',
      mimeType: 'image/png',
      buffer: pngData,
    });

    // Wait for upload to complete - image src should update with uploaded image URL
    await expect(heroImage).toHaveAttribute('src', /uploaded-image/, { timeout: 10000 });

    // After upload completes, overlay should close
    await expect(emptyOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test('can drag-drop image file onto empty image overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get the hero image element
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible({ timeout: 5000 });

    // Wait for clear button to appear
    const clearButton = page.locator('button[aria-label="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
    await clearButton.click({ force: true });

    // Wait for empty overlay to appear (this is the drop zone)
    const emptyOverlay = page.locator('.empty-image-overlay');
    await expect(emptyOverlay).toBeVisible({ timeout: 5000 });

    // Wait for the dropzone inside the overlay to be ready
    const dropzone = emptyOverlay.locator('.hydra-image-picker-inline');
    await expect(dropzone).toBeVisible({ timeout: 5000 });

    // Drag-drop an image file onto the dropzone
    await helper.dragDropImageFile(dropzone);

    // Wait for upload to complete - image src should update
    await expect(heroImage).toHaveAttribute('src', /uploaded-image/, { timeout: 10000 });

    // After upload completes, overlay should close
    await expect(emptyOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test('can replace existing image via toolbar overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block's image element
    const iframe = helper.getIframe();
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible();

    // Get initial src
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    await heroImage.click();

    // Click image button in toolbar to open replace overlay
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });
    await imageButton.click();

    // Overlay should appear (without the circular icon since image exists)
    const imageOverlay = page.locator('.empty-image-overlay');
    await expect(imageOverlay).toBeVisible({ timeout: 5000 });

    // There should NOT be the large circular icon (only shown when empty)
    const circularIcon = imageOverlay.locator('div').filter({ hasText: /^$/ }).locator('svg').first();
    // The overlay should have the ImageInput form but not the large icon
    const uploadButton = imageOverlay.locator('button[aria-label="Upload image"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });

    // Enter a new URL to replace the image
    const urlInput = imageOverlay.locator('input[name="link"]');
    await urlInput.fill('https://placehold.co/999x999');

    const submitButton = imageOverlay.locator('button[aria-label="Submit"]');
    await submitButton.click();

    // Verify image was replaced
    await expect(heroImage).toHaveAttribute('src', /999x999/, { timeout: 5000 });
  });

  test('shows error toast when upload fails', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get hero image and clear it
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible({ timeout: 5000 });
    await heroImage.scrollIntoViewIfNeeded();

    const clearButton = page.locator('button[title="Clear image"]');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
    await clearButton.click();

    // Wait for empty overlay
    const emptyOverlay = page.locator('.empty-image-overlay');
    await expect(emptyOverlay).toBeVisible({ timeout: 5000 });

    // Find file input - use first() to get Dropzone's input
    const fileInput = emptyOverlay.locator('input[type="file"][accept="image/*"]').first();
    await expect(fileInput).toBeAttached();

    // Upload with special filename that triggers mock API error
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00,
      0x05, 0xfe, 0x02, 0xfe,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ]);

    await fileInput.setInputFiles({
      name: 'trigger-error.png',
      mimeType: 'image/png',
      buffer: pngData,
    });

    // Should show error toast about invalid image
    const errorToast = page.locator('.Toastify__toast--error, .toast.error');
    await expect(errorToast).toBeVisible({ timeout: 10000 });

    // Overlay should no longer show uploading state
    await expect(emptyOverlay.getByText('Uploading image')).not.toBeVisible({ timeout: 5000 });
  });

  test('can upload file via toolbar overlay to replace existing image', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();

    // Get hero image and wait for it to be visible
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible({ timeout: 5000 });
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Click the image to select the block with media field focus
    await heroImage.click();

    // Wait for toolbar to appear
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });

    // Click image button in toolbar to open replace overlay
    await imageButton.click();

    // Overlay should appear
    const imageOverlay = page.locator('.empty-image-overlay');
    await expect(imageOverlay).toBeVisible({ timeout: 5000 });

    // Wait for upload button to be visible in overlay
    const uploadButton = imageOverlay.locator('button[aria-label="Upload image"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });

    // Find the file input and upload - use first() to get Dropzone's input
    const fileInput = imageOverlay.locator('input[type="file"][accept="image/*"]').first();
    await expect(fileInput).toBeAttached();

    // Create test PNG
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00,
      0x05, 0xfe, 0x02, 0xfe,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ]);

    await fileInput.setInputFiles({
      name: 'toolbar-upload.png',
      mimeType: 'image/png',
      buffer: pngData,
    });

    // Should show "Uploading image" while in progress
    const uploadingText = imageOverlay.getByText('Uploading image');
    await expect(uploadingText).toBeVisible({ timeout: 2000 });

    // Wait for upload to complete - image src should update
    await expect(heroImage).toHaveAttribute('src', /uploaded-image/, { timeout: 10000 });

    // Only AFTER src updates should the overlay close
    await expect(imageOverlay).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sidebar image upload and drag-drop', () => {
  test('can upload image via sidebar and see it in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get initial image src in iframe
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Find the sidebar clear button for the image field
    const sidebar = page.locator('[aria-label="Sidebar"]');
    const sidebarClearButton = sidebar.locator('button[aria-label="Clear image"]');
    await expect(sidebarClearButton).toBeVisible({ timeout: 5000 });
    await sidebarClearButton.click();

    // Wait for sidebar to show empty image input - use first() for Dropzone's input
    const sidebarImageInput = sidebar.locator('input[type="file"][accept="image/*"]').first();
    await expect(sidebarImageInput).toBeAttached({ timeout: 5000 });

    // Create a test PNG image
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00,
      0x05, 0xfe, 0x02, 0xfe,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ]);

    // Upload via sidebar
    await sidebarImageInput.setInputFiles({
      name: 'sidebar-upload.png',
      mimeType: 'image/png',
      buffer: pngData,
    });

    // Verify the image appears in the iframe with uploaded image URL
    await expect(heroImage).toHaveAttribute('src', /uploaded-image/, { timeout: 10000 });
  });

  test('can enter URL in sidebar and see it in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get iframe image
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    const initialSrc = await heroImage.getAttribute('src');
    expect(initialSrc).toBeTruthy();

    // Find the sidebar clear button for the image field
    const sidebar = page.locator('[aria-label="Sidebar"]');
    const sidebarClearButton = sidebar.locator('button[aria-label="Clear image"]');
    await expect(sidebarClearButton).toBeVisible({ timeout: 5000 });
    await sidebarClearButton.click();

    // Wait for URL input to be visible
    const urlInput = sidebar.locator('input[name="link"]');
    await expect(urlInput).toBeVisible({ timeout: 5000 });

    // Enter URL
    await urlInput.fill('https://placehold.co/777x777');

    // Submit
    const submitButton = sidebar.locator('button[aria-label="Submit"]');
    await submitButton.click();

    // Verify the image appears in iframe with new URL
    await expect(heroImage).toHaveAttribute('src', /777x777/, { timeout: 5000 });
  });

  test('sidebar shows drag-drop zone when image is empty', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the hero block to select it
    const iframe = helper.getIframe();
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible();
    await heroBlock.scrollIntoViewIfNeeded();
    await heroBlock.click();

    // Get iframe image and sidebar
    const heroImage = iframe.locator('[data-block-uid="block-4-hero"] [data-media-field="image"]');
    await expect(heroImage).toBeVisible({ timeout: 5000 });

    const sidebar = page.locator('[aria-label="Sidebar"]');
    const sidebarClearButton = sidebar.locator('button[aria-label="Clear image"]');
    await expect(sidebarClearButton).toBeVisible({ timeout: 5000 });
    await sidebarClearButton.click();

    // Wait for the image widget to show empty state with dropzone
    // The ImageWidget uses react-dropzone which wraps content
    // Use the field wrapper to get the specific widget
    const imageWidget = sidebar.locator('.field-wrapper-image .image-upload-widget');
    await expect(imageWidget).toBeVisible({ timeout: 5000 });

    // Should have the AddLinkForm visible for URL input and upload
    const urlInput = imageWidget.locator('input[name="link"]');
    await expect(urlInput).toBeVisible({ timeout: 5000 });

    // Should have upload button
    const uploadButton = imageWidget.locator('button[aria-label="Upload image"]');
    await expect(uploadButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Add button and image overlay conflict', () => {
  test('add button does not overlap with image clear button when add is right-aligned', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page'); // Page with images in horizontal container

    const iframe = helper.getIframe();

    // Find an image block on the RIGHT side of the container (no space to the right)
    // top-img-2 is the rightmost image, so add button will be constrained inside
    const imageBlock = iframe.locator('[data-block-uid="top-img-2"]');
    await expect(imageBlock).toBeVisible({ timeout: 10000 });

    // Click to select the image block
    await imageBlock.click();

    // Wait for both the add button and image overlay (clear button) to appear
    const addButton = page.locator('.volto-hydra-add-button');
    // The clear button is in the image overlay (near the iframe), not in the sidebar
    const clearButton = page.locator('#iframeContainer').getByRole('button', { name: 'Clear image' });

    await expect(addButton).toBeVisible({ timeout: 5000 });
    await expect(clearButton).toBeVisible({ timeout: 5000 });

    // Get bounding boxes
    const addButtonBox = await addButton.boundingBox();
    const clearButtonBox = await clearButton.boundingBox();

    expect(addButtonBox).not.toBeNull();
    expect(clearButtonBox).not.toBeNull();

    console.log('[TEST] Add button box:', addButtonBox);
    console.log('[TEST] Clear button box:', clearButtonBox);

    // Check that they don't overlap
    const overlap = !(
      addButtonBox!.x + addButtonBox!.width < clearButtonBox!.x ||
      clearButtonBox!.x + clearButtonBox!.width < addButtonBox!.x ||
      addButtonBox!.y + addButtonBox!.height < clearButtonBox!.y ||
      clearButtonBox!.y + clearButtonBox!.height < addButtonBox!.y
    );

    expect(overlap).toBe(false);

    // Both should be clickable
    await expect(addButton).toBeEnabled();
    await expect(clearButton).toBeEnabled();
  });
});

test.describe('Slider image positioning', () => {
  test('image starter widget is positioned correctly over slide image field', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/carousel-test-page');

    const iframe = helper.getIframe();
    const iframeElement = page.locator('#previewIframe');

    // Wait for the slider block to be visible
    const sliderBlock = iframe.locator('[data-block-uid="slider-1"]');
    await expect(sliderBlock).toBeVisible({ timeout: 10000 });

    // Find the first slide (should be visible by default)
    const slide1 = iframe.locator('[data-block-uid="slide-1"]');
    await expect(slide1).toBeVisible({ timeout: 5000 });

    // Get the slide's bounding box as fallback reference
    const slideBox = await slide1.boundingBox();
    expect(slideBox).not.toBeNull();

    // Try to get the media field element's box if it has dimensions
    // Some frontends use absolute inset-0 (zero dimensions), others have explicit dimensions
    const mediaField = slide1.locator('[data-media-field="preview_image"]');
    const mediaFieldBox = await mediaField.boundingBox();

    // Determine the expected position - use media field if it has dimensions, else slide
    const expectedBox = (mediaFieldBox && mediaFieldBox.width > 0 && mediaFieldBox.height > 0)
      ? mediaFieldBox
      : slideBox;

    // Get iframe position for debugging
    const iframeBox = await iframeElement.boundingBox();
    expect(iframeBox).not.toBeNull();

    // Click on the slide to select it and show the starter widget
    // Use force:true in case the media-field overlay intercepts clicks
    await slide1.click({ force: true });

    // Wait for the starter widget (empty image overlay) to appear
    const starterWidget = page.locator('.empty-image-overlay');
    await expect(starterWidget).toBeVisible({ timeout: 5000 });

    // Get the starter widget's bounding box
    const starterWidgetBox = await starterWidget.boundingBox();
    expect(starterWidgetBox).not.toBeNull();

    // Log positions for debugging
    console.log('[TEST] Media field box:', mediaFieldBox);
    console.log('[TEST] Slide box:', slideBox);
    console.log('[TEST] Expected box:', expectedBox);
    console.log('[TEST] Iframe box:', iframeBox);
    console.log('[TEST] Starter widget box:', starterWidgetBox);
    console.log('[TEST] Expected: left=', expectedBox!.x, 'top=', expectedBox!.y);
    console.log('[TEST] Actual (starterWidget): left=', starterWidgetBox!.x, 'top=', starterWidgetBox!.y);

    // The starter widget should have the same dimensions as the slide/media field
    // and be positioned within the visible iframe area (x aligned, y within bounds)
    // Note: Y position may differ from slide position due to viewport-relative calculations
    const tolerance = 10;
    expect(Math.abs(starterWidgetBox!.x - expectedBox!.x)).toBeLessThan(tolerance);
    expect(Math.abs(starterWidgetBox!.width - expectedBox!.width)).toBeLessThan(tolerance);
    expect(Math.abs(starterWidgetBox!.height - expectedBox!.height)).toBeLessThan(tolerance);
    // Y should be within the visible iframe area
    expect(starterWidgetBox!.y).toBeGreaterThanOrEqual(iframeBox!.y);
    expect(starterWidgetBox!.y + starterWidgetBox!.height).toBeLessThanOrEqual(
      iframeBox!.y + iframeBox!.height + tolerance
    );
  });

  test('can select an empty image block added to page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on an existing block to enable add button
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForQuantaToolbar('block-1-uuid');

    // Add a new image block
    await helper.clickAddBlockButton();
    await helper.selectBlockType('image');

    // Wait for sidebar to show Image as current block (new block auto-selected)
    await helper.waitForSidebarOpen();
    await helper.waitForSidebarCurrentBlock('Image', 10000);

    // The new empty image block should already be selected
    // Wait for the empty-image-overlay to appear (confirms media field has size)
    const emptyOverlay = page.locator('.empty-image-overlay');
    await expect(emptyOverlay).toBeVisible({ timeout: 5000 });

    // The overlay should have reasonable dimensions
    const overlayBox = await emptyOverlay.boundingBox();
    expect(overlayBox).not.toBeNull();
    expect(overlayBox!.width).toBeGreaterThan(50);
    expect(overlayBox!.height).toBeGreaterThan(50);
  });
});
