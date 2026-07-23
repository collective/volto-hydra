import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * Object browser: upload a file into the folder being browsed and have it
 * auto-selected. Implemented once in ObjectBrowserBody, so it works from both
 * the sidebar and the canvas link editor (which open the same component).
 */
test.describe('object browser folder upload', () => {
  // Open the canvas link editor for a button's href and browse into Upload Folder.
  async function browseIntoUploadFolder(helper: AdminUIHelper, page, iframe) {
    await iframe.locator('[data-block-uid="btnb"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    const browse = await helper.getLinkEditorBrowseButton();
    await browse.click();
    const ob = await helper.waitForObjectBrowser();
    await helper.objectBrowserNavigateToFolder(ob, /Test Data/);
    // Enter the (empty) Upload Folder directly — objectBrowserNavigateToFolder
    // waits for child rows, which an empty folder has none of. The upload bar is
    // always rendered, so wait for its input instead.
    await page
      .locator('.object-listing li')
      .filter({ hasText: 'Upload Folder' })
      .first()
      .click();
    await expect(page.locator('.ob-upload-input')).toBeAttached({
      timeout: 5000,
    });
  }

  test('upload a file from the canvas link editor and link to it', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/deep-link-page-b');
    const iframe = helper.getIframe();

    await browseIntoUploadFolder(helper, page, iframe);

    // Upload a text file into the folder → becomes a File and is auto-selected.
    await page.locator('.ob-upload-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    });

    // The link is now set to the uploaded file inside upload-folder.
    await iframe.locator('[data-block-uid="btnb"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    await expect(page.locator('input[name="link"]')).toHaveValue(
      /upload-folder\/notes/,
    );
  });

  test('uploading an image creates an Image', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/deep-link-page-b');
    const iframe = helper.getIframe();

    await browseIntoUploadFolder(helper, page, iframe);

    // Minimal valid 1×1 red PNG (same bytes used by inline-media-link-editing).
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
      0x00, 0x05, 0xfe, 0x02, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    await page.locator('.ob-upload-input').setInputFiles({
      name: 'pic.png',
      mimeType: 'image/png',
      buffer: pngData,
    });

    await iframe.locator('[data-block-uid="btnb"] [data-edit-link="href"]').click();
    await page.locator('.quanta-toolbar button[title*="Edit link"]').click();
    // The mock's Image branch mints an `uploaded-image-<ts>` id, confirming the
    // PNG went through the Image (not File) path and was linked in the folder.
    await expect(page.locator('input[name="link"]')).toHaveValue(
      /upload-folder\/uploaded-image/,
    );
  });
});
