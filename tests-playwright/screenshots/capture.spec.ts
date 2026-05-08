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
});
