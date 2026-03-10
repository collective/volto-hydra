/**
 * Tests for the codeExample block using the mock test frontend.
 *
 * Tests that:
 * 1. Each tab renders as a child block with data-block-uid
 * 2. Clicking a tab selects it and shows sidebar fields (label, language, code)
 * 3. Editing code in the sidebar textarea updates the iframe
 * 4. Enter key inserts a newline in <pre> (not a <div>)
 * 5. Tab key inserts spaces in <pre> (not focus change)
 * 6. Single-tab block shows no tab bar
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Code Example Block', () => {
  test('single-tab: no tab bar, tab item is selectable child block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    const block = iframe.locator('[data-block-uid="single-tab"]');
    await expect(block).toBeVisible();

    // No tab bar for single tab
    await expect(block.locator('[data-tab-bar]')).toHaveCount(0);

    // Tab is a child block
    const tabItem = block.locator('[data-block-uid="tab-1"]');
    await expect(tabItem).toBeVisible();

    // Code is in a <pre> with data-edit-text="code"
    const codePre = tabItem.locator('pre[data-edit-text="code"]');
    await expect(codePre).toBeVisible();
    await expect(codePre).toContainText('Hello, World!');
  });

  test('multi-tab: tab bar shows all tabs', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    const block = iframe.locator('[data-block-uid="multi-tab"]');
    await expect(block).toBeVisible();

    const tabBar = block.locator('[data-tab-bar]');
    await expect(tabBar).toBeVisible();
    const buttons = tabBar.locator('button');
    await expect(buttons).toHaveCount(3);
    await expect(buttons.nth(0)).toContainText('JavaScript');
    await expect(buttons.nth(1)).toContainText('Python');
    await expect(buttons.nth(2)).toContainText('Bash');
  });

  test('clicking tab item opens sidebar with label, language, code fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('tab-js');
    await helper.waitForSidebarOpen();

    const sidebar = page.locator('#sidebar');
    await expect(sidebar.locator('label:text-is("Tab Label")')).toBeVisible({ timeout: 5000 });
    await expect(sidebar.locator('label:text-is("Language")')).toBeVisible({ timeout: 5000 });
    await expect(sidebar.locator('label:text-is("Code")')).toBeVisible({ timeout: 5000 });

    // Code textarea should have the JS code
    const codeTextarea = sidebar.locator('#field-code');
    await expect(codeTextarea).toBeVisible();
    await expect(codeTextarea).toHaveValue(/console\.log/);
  });

  test('editing code in sidebar updates iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    // Click the single-tab code block's tab
    await helper.clickBlockInIframe('tab-1');
    await helper.waitForSidebarOpen();

    const sidebar = page.locator('#sidebar');
    const codeTextarea = sidebar.locator('#field-code');
    await expect(codeTextarea).toBeVisible();

    // Edit the code in sidebar
    await codeTextarea.fill('const updated = true;');

    // Verify iframe updates with new code
    const tabItem = iframe.locator('[data-block-uid="tab-1"]');
    await expect(tabItem.locator('pre')).toContainText('const updated = true;', { timeout: 5000 });
  });

  test('Enter key in <pre> inserts newline, not <div>', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    // Click into the code area of single-tab
    await helper.clickBlockInIframe('tab-1');
    await helper.waitForSidebarOpen();

    const tabItem = iframe.locator('[data-block-uid="tab-1"]');
    const codePre = tabItem.locator('pre[data-edit-text="code"]');
    await expect(codePre).toBeVisible();

    // Click into the code to get cursor there
    await codePre.click();
    await helper.waitForEditorFocus(codePre);

    // Press End to go to end of first line, then Enter
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('// new line');

    // Check that no <div> elements were inserted inside the pre
    const divCount = await codePre.locator('div').count();
    expect(divCount).toBe(0);

    // The new line text should be present
    await expect(codePre).toContainText('// new line');
  });

  test('Tab key in <pre> inserts spaces, not focus change', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/code-example-test-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('tab-1');
    await helper.waitForSidebarOpen();

    const tabItem = iframe.locator('[data-block-uid="tab-1"]');
    const codePre = tabItem.locator('pre[data-edit-text="code"]');
    await codePre.click();
    await helper.waitForEditorFocus(codePre);

    // Move cursor to start using helper, then press Tab
    await helper.moveCursorToStart(codePre);
    await page.keyboard.press('Tab');

    // Pre should now contain the spaces at the start
    const textContent = await codePre.evaluate((el: any) => el.textContent);
    expect(textContent).toMatch(/^ {2}/); // starts with 2 spaces
  });
});
