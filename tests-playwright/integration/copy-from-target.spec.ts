/**
 * Copy-from-target: per-field LINKED ⇄ CUSTOM toggle.
 *
 * The `button` block declares fieldMappings['@target']: { Title: 'title' }; its
 * href carries the target snapshot. A mapped field is LINKED by default (tracks
 * the target, pulled on select) unless listed in the block's `_customFields`.
 *
 * Fixtures: btn-linked (no _customFields → title tracks target 'Target Title');
 * btn-custom (_customFields: ['title'] → keeps 'My own label').
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const linkedToggle = '.copy-from-target-linked';
const titleInput = '#sidebar-properties .field-wrapper-title input';

test.describe('Copy-from-target — linked/custom toggle', () => {
  test('a linked field pulls the target value on select, toggle checked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();

    // Linked → pulled from the target ('Stale label' → 'Target Title').
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a custom field keeps its own value, toggle unchecked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-custom');
    await helper.waitForSidebarOpen();

    // Custom → NOT pulled; keeps the editor's value.
    expect(await helper.getSidebarFieldValue('title')).toBe('My own label');
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'false');
  });

  test('editing a linked field flips it to custom (toggle unchecks)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'true');

    // Type into the (linked) field → it becomes custom.
    await page.locator(titleInput).fill('Hand typed');
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'false');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Hand typed');
  });

  test('typing inline turns off sync (flips the field to custom)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    // The hero's `heading` is a copy-from-target LINKED text field, inline-editable
    // on the canvas. Typing into it must turn off sync (flip to custom) — detected
    // by value-compare, since the inline message doesn't say which field changed.
    const headingToggle =
      '#sidebar-properties .field-wrapper-heading + .copy-from-target-toggle';
    await helper.clickBlockInIframe('hero-linked');
    await helper.waitForSidebarOpen();
    await expect(page.locator(headingToggle)).toHaveAttribute('aria-pressed', 'true');

    const editor = await helper.enterEditMode('hero-linked', 'heading');
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Typed inline', { delay: 10 });

    // Confirm the edit landed (value drifted) — that is what turns it custom.
    await expect
      .poll(async () => helper.getSidebarFieldValue('heading'), { timeout: 5000 })
      .toBe('Typed inline');
    await expect(page.locator(headingToggle)).toHaveAttribute('aria-pressed', 'false');
  });

  test('inline-editing an IMAGE field flips it to custom (image/link edit path)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    // The hero's `image` is a copy-from-target LINKED destination (its buttonLink
    // is an internal target) and is edited inline via the toolbar image overlay —
    // the same `onFieldLinkChange` path that image AND link fields use. Editing it
    // must flip it to custom, exactly like a sidebar edit; otherwise the next pull
    // would clobber the chosen image. The toggle renders after the field wrapper.
    const imageToggle =
      '#sidebar-properties .field-wrapper-image + .copy-from-target-toggle';
    await helper.clickBlockInIframe('hero-linked');
    await helper.waitForSidebarOpen();
    await expect(page.locator(imageToggle)).toHaveAttribute('aria-pressed', 'true');

    // Set the image via a typed URL in the overlay (no object browser).
    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="hero-linked"] [data-edit-media="image"]').click();
    const imageButton = helper.getQuantaToolbarFormatButton('image');
    await expect(imageButton).toBeVisible({ timeout: 5000 });
    await imageButton.click();
    const overlay = page.locator('.empty-image-overlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await overlay.locator('input[name="link"]').fill('https://picsum.photos/400/300');
    await overlay.locator('button[aria-label="Submit"]').click();

    await expect(page.locator(imageToggle)).toHaveAttribute('aria-pressed', 'false');
  });

  test('picking a page in the object browser fills the linked title', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    // btn-pick starts empty (no href, no title). Pick a page via the REAL object
    // browser — the only way a link gets a snapshot in the app — and the title
    // must fill from the picked page. This is the core flow the feature exists for.
    const iframe = helper.getIframe();
    const btn = iframe.locator('[data-block-uid="btn-pick"] [data-edit-link="href"]');
    await btn.click();
    await helper.waitForSidebarOpen();

    const linkButton = page.locator('.quanta-toolbar button[title*="Edit link"]');
    await expect(linkButton).toBeVisible({ timeout: 5000 });
    await linkButton.click();
    await expect(page.locator('.field-link-editor .link-form-container')).toBeVisible({ timeout: 5000 });

    const browse = await helper.getLinkEditorBrowseButton();
    await browse.click();
    const ob = await helper.waitForObjectBrowser();
    await helper.objectBrowserSelectItem(ob, /Another Page/);
    await helper.submitAddLinkFormIfOpen(page.locator('.field-link-editor'));

    // The href now points at /another-page → the linked title fills from its title.
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 8000 })
      .toBe('Another Page');
  });

  test('an external link offers no toggle and cannot pull (plain editable field)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-external');
    await helper.waitForSidebarOpen();

    // External URL → no catalog target to pull from → no toggle, value untouched.
    await expect(page.locator('.copy-from-target-toggle')).toHaveCount(0);
    expect(await helper.getSidebarFieldValue('title')).toBe('External label');

    // Still a normal editable field.
    await page.locator(titleInput).fill('Edited external');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Edited external');
  });

  test('unticking a linked field keeps the current value as custom', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');

    // Untick → custom; value is retained, no longer pulled.
    await page.locator(linkedToggle).click();
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'false');
    expect(await helper.getSidebarFieldValue('title')).toBe('Target Title');
  });

  test('re-linking (re-tick) wipes the custom value and pulls the target again', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/copy-target-page');

    await helper.clickBlockInIframe('btn-linked');
    await helper.waitForSidebarOpen();
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');

    // Edit → custom (keeps the typed value).
    await page.locator(titleInput).fill('Hand typed');
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'false');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Hand typed');

    // Re-tick → re-links AND re-pulls the target, discarding the custom value.
    await page.locator(linkedToggle).click();
    await expect(page.locator(linkedToggle)).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(async () => helper.getSidebarFieldValue('title'), { timeout: 5000 })
      .toBe('Target Title');
  });
});
