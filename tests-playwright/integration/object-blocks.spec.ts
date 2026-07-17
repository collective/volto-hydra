/**
 * blocks_layout nested inside a widget:'object' (#245).
 *
 * The `objectBlocks` test block declares a `content` object whose `body` region
 * is a blocks_layout. The object holds its OWN shared blocks dict + blocks_layout
 * (data: block.content.blocks / block.content.blocks_layout.body) — one level
 * deeper than the block root. These tests drive the full editing path (select,
 * add, delete, reorder) through the regionPath funnel.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('blocks_layout nested in a widget:object', () => {
  test('renders the object-nested body blocks, each selectable', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    const body = iframe.locator('[data-block-uid="ob-1"] .object-blocks-body');
    await expect(body.locator('[data-block-uid]')).toHaveCount(2);
    await expect(iframe.locator('[data-block-uid="child-1"]')).toContainText('First body block');

    // Selecting a nested body block works (sidebar opens on it).
    await helper.clickBlockInIframe('child-1');
    await helper.waitForSidebarOpen();
    await helper.waitForIframeBlockHandle('child-1');
  });

  test('sidebar prefixes the nested container title with the object path', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    // Select ob-1 (the object block) to see its child container sections.
    await helper.clickBlockInIframe('child-1');
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForIframeBlockHandle('ob-1');

    // The `body` region lives under the `content` object, so its sidebar title
    // is prefixed with the object path: "Content / Body".
    const sidebar = page.locator('.sidebar-container');
    await expect(
      sidebar.locator('.widget-title', { hasText: 'Content / Body' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('adds a block into the object-nested body region', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    const body = iframe.locator('[data-block-uid="ob-1"] .object-blocks-body');
    await expect(body.locator('[data-block-uid]')).toHaveCount(2);

    // Select the first body block and add a sibling via the iframe [+].
    // The body region allows slate + image, so the chooser opens — pick slate.
    await helper.clickBlockInIframe('child-1');
    await helper.waitForSidebarOpen();
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    // A new body block is added inside the SAME object region (count 2 → 3),
    // proving the insert wrote to content.blocks_layout.body, not the block root.
    await expect(body.locator('[data-block-uid]')).toHaveCount(3);
  });

  test('deletes a body block via the sidebar hierarchy', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    const body = iframe.locator('[data-block-uid="ob-1"] .object-blocks-body');
    await expect(body.locator('[data-block-uid]')).toHaveCount(2);

    // Select child-2, delete it via the current block's sidebar dropdown.
    await helper.clickBlockInIframe('child-2');
    await helper.waitForSidebarOpen();
    await helper.waitForIframeBlockHandle('child-2');

    const sidebar = page.locator('.sidebar-container');
    const currentBlockHeader = sidebar.locator('[data-is-current="true"]');
    await currentBlockHeader.locator('.menu-trigger').click();
    const removeOption = page
      .locator('.volto-hydra-dropdown-item')
      .filter({ hasText: 'Remove' });
    await expect(removeOption).toBeVisible({ timeout: 3000 });
    await removeOption.click();

    // Only child-1 remains in the object's body region.
    await expect(body.locator('[data-block-uid]')).toHaveCount(1);
    await expect(iframe.locator('[data-block-uid="child-1"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="child-2"]')).toHaveCount(0);
  });

  test('inline-edits a slate field of a block inside the object region', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    // Type into the first body block. The block's value lives at
    // content.blocks['child-1'].value — inline editing must reach it through the
    // object nesting (getBlockById resolves the block-relative path).
    await helper.editBlockTextInIframe('child-1', 'Edited inside the object');

    // The rendered block reflects the new text.
    await expect(iframe.locator('[data-block-uid="child-1"]')).toContainText(
      'Edited inside the object',
    );
  });

  test('inline-edits a field that lives directly on the object', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();
    const headline = iframe.locator('[data-block-uid="ob-1"] .ob-headline');
    await expect(headline).toHaveText('Original headline');

    // Click the headline itself (it belongs to ob-1, not a child block) to
    // select ob-1 and focus the field, then retype. The value lives at
    // block.content.headline — editing it in the canvas must write there.
    await headline.click();
    await expect(headline).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
    await headline.press('ControlOrMeta+a');
    await headline.pressSequentially('Edited object field', { delay: 10 });

    await expect(headline).toHaveText('Edited object field');

    // Force a re-render FROM formData: edit a body block, which sends FORM_DATA
    // and re-renders ob-1 (headline included) from stored data. If the headline
    // edit only lived in the DOM (writeback missed the nested content.headline
    // storage path), the headline would revert to "Original headline" here.
    await helper.editBlockTextInIframe('child-1', 'Body edit forces rerender');
    await expect(iframe.locator('[data-block-uid="child-1"]')).toContainText(
      'Body edit forces rerender',
    );
    await expect(headline).toHaveText('Edited object field');
  });

  test('inline-edits a LINK field that lives directly on the object', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();
    const link = iframe.locator('[data-block-uid="ob-1"] .ob-link');
    await expect(link).toHaveAttribute('href', 'https://old.example.com');

    // Select the object block via its link, open the link editor, change the URL.
    // The link field is at block.content.href — the central /-path API must read
    // and write it there (not a flat block['content/href'] key).
    await link.click();
    await helper.waitForBlockSelectedInAdmin('ob-1');

    const toolbar = page.locator('.quanta-toolbar');
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await expect(linkButton).toBeVisible({ timeout: 5000 });
    await linkButton.click();

    const linkForm = page.locator('.field-link-editor .link-form-container');
    await expect(linkForm).toBeVisible({ timeout: 5000 });
    const urlInput = linkForm.locator('input[name="link"]');
    await urlInput.fill('https://new.example.com');
    await linkForm.locator('button[aria-label="Submit"]').click();

    // The rendered link reflects the new href (written to content.href).
    await expect(link).toHaveAttribute('href', 'https://new.example.com', { timeout: 5000 });

    // Force a re-render from formData (edit a body block) — the link must
    // survive, proving it persisted to content.href, not a stray flat key.
    await helper.editBlockTextInIframe('child-1', 'Body edit for link rerender');
    await expect(link).toHaveAttribute('href', 'https://new.example.com');
  });

  test('a multi-node slate field on an object is flattened on load (not left multi-node)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-multinode');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="obm-1"]').waitFor();

    // content.headline started as [h2 "First para", p "Second para"] — two top-level
    // nodes. A slate field must hold ONE node; a field on an object can't split into
    // sibling blocks, so it FLATTENS (merges both nodes' children into one). The
    // enforcement must reach the nested field (content/headline), so both texts
    // survive in the single rendered node. If it were left multi-node, the renderer
    // (which shows headline[0]) would show only "First para".
    const headline = iframe.locator('[data-block-uid="obm-1"] .ob-headline');
    await expect(headline).toContainText('First para');
    await expect(headline).toContainText('Second para');
  });

  test('reorders blocks within the object region', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/object-blocks-page');

    const iframe = helper.getIframe();
    await iframe.locator('[data-block-uid="ob-1"]').waitFor();

    const body = iframe.locator('[data-block-uid="ob-1"] .object-blocks-body');
    // Initial order: child-1, child-2.
    await expect(body.locator('[data-block-uid]').nth(0)).toHaveAttribute(
      'data-block-uid',
      'child-1',
    );

    // Drag child-1 below child-2 — the reorder must rewrite
    // content.blocks_layout.body, not the block root.
    await helper.dragBlockAfter('child-1', 'child-2');

    // New order: child-2, child-1.
    await expect(body.locator('[data-block-uid]').nth(0)).toHaveAttribute(
      'data-block-uid',
      'child-2',
    );
    await expect(body.locator('[data-block-uid]').nth(1)).toHaveAttribute(
      'data-block-uid',
      'child-1',
    );
  });
});
