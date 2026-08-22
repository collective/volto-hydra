/**
 * A sidebar widget must not take the caret away from the preview.
 *
 * Selecting a block renders that block's form. Any image field with no value
 * renders its empty state — an inline AddLinkForm — and AddLinkForm focused
 * itself on mount, unconditionally, 50ms later. It was written as the toolbar
 * link popup, where the author has just opened it and taking focus is correct.
 * Mounted as a widget it fires on something the author never asked for.
 *
 * What an author saw: click a text field in the preview, get a caret, and lose
 * it ~400ms later. The field kept contenteditable="true", the element was never
 * replaced, and nothing called blur() — focus had simply left the iframe, so
 * keystrokes went to the sidebar input instead. Clicking a second time appeared
 * to fix it, because by then the form was mounted and did not re-fire.
 *
 * The fixture's highlight block has a title and NO image, which is the whole
 * trigger: an image field that is empty renders the picker on every selection.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const PAGE = '/sidebar-focus-page';

test.describe('sidebar widgets and the preview caret', () => {
  test('clicking a field keeps focus in the preview iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit(PAGE);

    const field = helper.getIframe().locator('[data-block-uid="highlight-1"] [data-edit-text="title"]');
    await expect(field).toBeVisible({ timeout: 10_000 });
    const before = (await field.textContent())?.trim();

    await field.click();
    // Longer than AddLinkForm's 50ms mount timer, and than the selection
    // round-trip that mounts it — the theft happened ~400ms after the click.
    await page.waitForTimeout(1500);

    // The admin must still be handing input to the preview, not to a widget.
    const adminActive = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.tagName}.${(el.className || '').toString().split(' ')[0]}` : 'none';
    });
    expect(adminActive, 'focus must stay on the preview iframe').toContain('IFRAME');

    expect(
      await field.evaluate((el) => document.activeElement === el),
      'the clicked field holds the caret',
    ).toBe(true);

    // The contract an author experiences: one click, then type.
    await page.keyboard.type('ZZ');
    await page.waitForTimeout(800);
    expect((await field.textContent())?.trim(), 'typing lands in the clicked field').not.toBe(before);
  });
});
