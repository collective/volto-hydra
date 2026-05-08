/**
 * Editor UI screenshot capture for the Editor Guide.
 *
 * Run with: pnpm exec playwright test --project=screenshots
 *
 * Each test below opens the showcase fixture page, drives the editor into a
 * specific state, and saves an image into docs/editor-guide/_images/. The
 * Editor Guide markdown pages reference those images by filename.
 *
 * Not part of normal test runs — gated to its own project (see
 * playwright.config.ts). CSS-driven re-renders are accepted; rerun the
 * --project=screenshots when the editor chrome changes.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(SCRIPT_DIR, '..', '..', 'docs', 'editor-guide', '_images');
const SHOWCASE_PATH = '/showcase-page';

// Make sure the output directory exists once at import time.
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Save a viewport-sized screenshot under docs/editor-guide/_images/<name>.png.
 */
async function snap(page: import('@playwright/test').Page, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`[screenshot] ${name} -> ${path.relative(process.cwd(), file)}`);
}

test.describe('Editor Guide screenshots', () => {
  test('block-selected — slate block in text mode with Quanta toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    // Click the intro paragraph — text mode, Quanta toolbar appears.
    await helper.clickBlockInIframe('intro');
    await helper.waitForBlockSelectedInAdmin('intro');

    await snap(page, 'block-selected');
  });

  test('block-mode — Escape from text mode, full border', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    await helper.clickBlockInIframe('intro');
    await helper.waitForBlockSelectedInAdmin('intro');
    await helper.escapeFromEditing(); // text mode -> block mode

    await snap(page, 'block-mode');
  });

  test('multi-select — Shift+Click to select a range', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    // Select first paragraph in block mode, then Shift+Click the second.
    await helper.clickBlockInIframe('after-columns');
    await helper.waitForBlockSelectedInAdmin('after-columns');
    await helper.escapeFromEditing();

    // Shift+Click in iframe to extend selection across to another-paragraph.
    const iframe = helper.page.frameLocator('iframe');
    const target = iframe.locator('[data-block-uid="another-paragraph"]');
    await target.click({ modifiers: ['Shift'] });

    // Allow the admin chrome to redraw the combined bounding box.
    await page.waitForTimeout(200);

    await snap(page, 'multi-select');
  });

  test('media-empty-placeholder — empty image block with upload prompt', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    // Click the empty image block to surface its placeholder UI.
    await helper.clickBlockInIframe('image-empty');
    await helper.waitForBlockSelectedInAdmin('image-empty');

    await snap(page, 'media-empty-placeholder');
  });

  test('slash-menu — type / in an empty slate to open the chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    const editor = await helper.enterEditMode('empty-slate');
    await editor.pressSequentially('/', { delay: 10 });

    const slashMenu = page.locator('.power-user-menu');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });
    // Wait for menu items to populate so the screenshot isn't a half-rendered list.
    await expect(slashMenu.locator('.ui.menu .item').first()).toBeVisible({ timeout: 3000 });

    await snap(page, 'slash-menu');
  });

  test('wrap-chooser — multi-select then Wrap in container opens a chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    // Multi-select two adjacent paragraphs (block mode).
    await helper.clickBlockInIframe('after-columns');
    await helper.waitForBlockSelectedInAdmin('after-columns');
    await helper.escapeFromEditing();

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="another-paragraph"]').click({ modifiers: [modifier] });
    await helper.waitForMultiSelectOutlines(2);

    // Open the Quanta toolbar's overflow menu and click "Wrap in container...".
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();
    const wrapButton = page.locator('[data-testid="wrap-selected"]');
    await expect(wrapButton).toBeVisible({ timeout: 3000 });
    await wrapButton.click();

    // BlockChooser appears with the compatible container types.
    const chooser = page.locator('.blocks-chooser').first();
    await expect(chooser).toBeVisible({ timeout: 5000 });
    // Allow the chooser to finish its open animation before snap.
    await page.waitForTimeout(150);

    await snap(page, 'wrap-chooser');
  });

  test('link-picker — click the link toolbar button to open the picker', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(SHOWCASE_PATH);

    // Enter edit mode on the intro paragraph (has a link inside).
    const editor = await helper.enterEditMode('intro');
    // Click inside the link so the cursor is on it.
    await editor.locator('a').first().click();
    // Toolbar's link button opens the LinkEditor popup.
    await helper.clickFormatButton('link');
    await helper.waitForLinkEditorPopup();

    await snap(page, 'link-picker');
  });

  test('container-convert — select a container, open Convert chooser', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    // container-test-page has grid-1, a gridBlock with teaser children that
    // can convert to other container types. The showcase columns block
    // doesn't have fieldMappings to other containers so the menu would be
    // empty there.
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="grid-1"]').first().evaluate((el) => {
      (window as any).bridge?.selectBlock(el);
    });
    await helper.waitForIframeBlockHandle('grid-1');

    // Open the toolbar menu, click "Convert to..." — chooser pops up listing
    // compatible target types.
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();
    const convertButton = page.locator('[data-testid="convert-block"]');
    await expect(convertButton).toBeVisible({ timeout: 3000 });
    await convertButton.click();

    const chooser = page.locator('.blocks-chooser').first();
    await expect(chooser).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(150);

    await snap(page, 'container-convert');
  });
});
