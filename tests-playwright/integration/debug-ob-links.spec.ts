import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test('debug OB search flow', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/test-page');

  const blockId = 'block-1-uuid';
  await helper.editBlockTextInIframe(blockId, 'Click here');
  const editor = await helper.getEditorLocator(blockId);
  await helper.selectAllTextInEditor(editor);
  await helper.clickFormatButton('link');
  await helper.waitForLinkEditorPopup();

  const linkUrlInput = await helper.getLinkEditorUrlInput();
  await expect(linkUrlInput).toBeFocused({ timeout: 2000 });
  const inputValue = await linkUrlInput.inputValue();
  if (inputValue && inputValue.length > 0) {
    await linkUrlInput.clear();
    await expect(linkUrlInput).toBeFocused({ timeout: 1000 });
  }

  const browseButton = await helper.getLinkEditorBrowseButton();
  await browseButton.click();

  // Wait for OB to fully mount
  const homeButton = page.getByRole('button', { name: 'Home' });
  await expect(homeButton).toBeVisible({ timeout: 10000 });

  // Wait for initial @search response
  await page.waitForResponse(
    resp => resp.url().includes('@search'),
    { timeout: 5000 },
  ).catch(() => null);

  console.log('[DEBUG] OB open, initial search done');

  // Try clicking Search SVG button
  const searchBtn = page.getByRole('button', { name: 'Search SVG' });
  const btnBox = await searchBtn.boundingBox();
  console.log(`[DEBUG] Search SVG button box: ${JSON.stringify(btnBox)}`);

  await searchBtn.click();
  console.log('[DEBUG] Search SVG clicked');

  // Wait for React to re-render
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/ob-debug-after-search-click.png' });

  // Check search input with various selectors
  const selectors = [
    '.object-browser .search input',
    '.object-browser input',
    '.object-browser header input',
    'input.search',
    '.header.pulled input',
    '.object-browser input[type="text"]',
  ];
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    console.log(`[DEBUG] "${sel}": ${count} match(es)`);
  }

  // Check if the header content changed (search input replaces heading)
  const heading = page.getByRole('heading', { name: 'Choose Target' });
  const headingVisible = await heading.isVisible().catch(() => false);
  console.log(`[DEBUG] "Choose Target" heading still visible: ${headingVisible}`);

  // Try clicking again
  const searchBtn2 = page.getByRole('button', { name: 'Search SVG' });
  const visible2 = await searchBtn2.isVisible().catch(() => false);
  console.log(`[DEBUG] Search SVG still visible: ${visible2}`);

  if (visible2) {
    await searchBtn2.click();
    console.log('[DEBUG] Search SVG clicked AGAIN');
    await page.waitForTimeout(500);

    for (const sel of selectors) {
      const count = await page.locator(sel).count();
      console.log(`[DEBUG] after 2nd click "${sel}": ${count} match(es)`);
    }
    const headingVisible2 = await heading.isVisible().catch(() => false);
    console.log(`[DEBUG] heading after 2nd click: ${headingVisible2}`);
  }

  await page.screenshot({ path: '/tmp/ob-debug-final.png' });
});
