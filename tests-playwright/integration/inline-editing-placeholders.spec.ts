/**
 * Tests for schema placeholder support on inline-editable fields.
 *
 * When an editable field is empty and has a placeholder defined in its schema,
 * the placeholder text should be visible (via CSS ::before). It should hide
 * when the field is focused and reappear when the field is blurred while empty.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline Editing - Placeholders', () => {
  test('empty field with schema placeholder shows data-placeholder attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    // The heading field has schema placeholder 'Enter hero heading…'
    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Field has content, so should not have data-empty
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // But should have data-placeholder from schema
    await expect(headingField).toHaveAttribute('data-placeholder', 'Enter hero heading…');
  });

  test('clearing field text makes placeholder visible via data-empty', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Click the heading to focus it
    await headingField.click();

    // Select all and delete to clear the field
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    // Verify text is actually cleared in the DOM
    await expect(headingField).toHaveText('', { timeout: 3000 });

    // Field is focused, so data-empty should NOT be set (placeholder hidden during editing)
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // Click a different block to blur and let the cleared value sync via FORM_DATA
    await helper.clickBlockInIframe('block-1-uuid');

    // After FORM_DATA re-render, applyPlaceholders should set data-empty on the
    // now-empty heading field (even though the hero block is not selected)
    await expect(headingField).toHaveAttribute('data-empty', '', { timeout: 5000 });
  });

  test('slate block defined empty in fixture renders with non-zero height', async ({ page }) => {
    // Reproduces the screenshot-capture failure: when a slate block is loaded
    // with empty value from the fixture (never had content), the placeholder
    // <div> can collapse to 0px height. The placeholder text shows visually
    // (rendered via absolutely-positioned ::before pseudo-element) but the
    // parent element has no measurable height — Playwright sees it as not
    // visible and clicks land on whatever is rendered behind.
    //
    // Compared to the "clearing field text" path above, this exercises the
    // initial-render path where applyPlaceholders sets data-empty from
    // page-load form state, not from a user interaction.
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/showcase-page');

    const iframe = helper.getIframe();
    const editField = iframe.locator(
      '[data-block-uid="empty-slate"][data-edit-text="value"], [data-block-uid="empty-slate"] [data-edit-text="value"]',
    ).first();

    await expect(editField).toHaveAttribute('data-empty', '', { timeout: 5000 });
    await expect(editField).toHaveAttribute('data-placeholder', 'Type text…');

    const box = await editField.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(10);

    await expect(editField).toBeVisible();
  });

  test('empty slate block with placeholder renders with non-zero height (clickable)', async ({ page }) => {
    // The hydra CSS that displays the placeholder uses `::before { position: absolute }`,
    // so the pseudo-element doesn't contribute to its parent's height. Without an
    // explicit min-height on the parent, an empty slate block (a plain <div> wrapper
    // with no inherent line-height) collapses to 0px tall when its content is empty —
    // the placeholder text shows visually (the absolute pseudo-element overlaps
    // whatever is below) but the field itself is unclickable and Playwright sees it
    // as not visible.
    //
    // (A heading or paragraph element with line-height stays measurable even
    // when empty; the bug only manifests on plain wrappers like the slate block.)
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-1-uuid'; // Slate block

    await helper.clickBlockInIframe(blockId);

    // data-edit-text may be on the same element as data-block-uid (Nuxt renders
    // it on the slate-block div directly) or a descendant (mock frontend).
    const editField = iframe.locator(
      `[data-block-uid="${blockId}"][data-edit-text="value"], [data-block-uid="${blockId}"] [data-edit-text="value"]`,
    ).first();
    await expect(editField).toBeVisible();

    // Clear the slate text and blur so applyPlaceholders sets data-empty.
    await editField.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await expect(editField).toHaveText('', { timeout: 3000 });
    await helper.clickBlockInIframe('block-2-uuid');
    await expect(editField).toHaveAttribute('data-empty', '', { timeout: 5000 });
    await expect(editField).toHaveAttribute('data-placeholder', 'Type text…');

    // The placeholder text is rendered via `::before` and absolutely positioned —
    // the parent must reserve enough height that the placeholder is visible AND
    // the field stays clickable. A single line is at least ~18px.
    const box = await editField.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(10);

    // And Playwright's own visibility check (which considers zero-bounding-box
    // elements not visible) should agree.
    await expect(editField).toBeVisible();
  });

  test('typing text removes data-empty attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    const headingField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="heading"]`);
    await expect(headingField).toBeVisible();

    // Click the heading to focus
    await headingField.click();

    // Select all and delete to clear
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    // Type new text
    await page.keyboard.type('New heading');

    // data-empty should not be present since we typed text
    await expect(headingField).not.toHaveAttribute('data-empty', '');

    // Text should be in the field
    await expect(headingField).toContainText('New heading');
  });

  test('field without schema placeholder has no data-placeholder attribute', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-4-hero';

    // Select the hero block
    await helper.clickBlockInIframe(blockId);

    // Hero buttonText field has no placeholder in schema
    const buttonField = iframe.locator(`[data-block-uid="${blockId}"] [data-edit-text="buttonText"]`);
    await expect(buttonField).toBeVisible();
    const hasPlaceholder = await buttonField.evaluate(el => el.hasAttribute('data-placeholder'));
    expect(hasPlaceholder).toBe(false);
  });

  test('slate block shows Type text placeholder from schema', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const blockId = 'block-1-uuid'; // Slate block with text

    await helper.clickBlockInIframe(blockId);

    // data-edit-text may be on the same element as data-block-uid (Nuxt) or a descendant (mock)
    const editField = iframe.locator(`[data-block-uid="${blockId}"][data-edit-text="value"], [data-block-uid="${blockId}"] [data-edit-text="value"]`).first();
    await expect(editField).toBeVisible();
    await expect(editField).toHaveAttribute('data-placeholder', 'Type text…');
  });

  test('page title field shows placeholder from content type schema', async ({ page }, testInfo) => {
    // Nuxt renders title only via title blocks — test-page has no title block in layout
    test.skip(testInfo.project.name.includes('nuxt'), 'Nuxt test-page has no page-level title field');
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Page title: mock frontend uses data-edit-text="title", Nuxt uses data-edit-text="/title"
    const titleField = iframe.locator('[data-edit-text="/title"], #page-title[data-edit-text="title"]').first();
    await expect(titleField).toBeVisible({ timeout: 10000 });
    await expect(titleField).toHaveAttribute('data-placeholder', 'Type the title…');
  });
});
