/**
 * End-to-end for the per-region slate style allow-list (#295).
 *
 * Fixture: /restricted-styles-page. Its `items` region declares
 * `disallowedStyles: ['blockquote', 'b']` and the frontend passes
 * `styleAliases: { b: 'strong' }` via voltoConfig — so this page is restricted
 * while every other admin-mock fixture stays unrestricted, which is also what
 * makes the last test a real guard: the feature has to stay opt-in.
 *
 * The keyboard surfaces (markdown shortcut, format hotkey) are covered
 * deterministically in tests-playwright/unit/slateStyleGating.spec.ts — they
 * turn on a bridge predicate, not on admin rendering.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/** Titles offered by the block-format dropdown for the given block. */
async function formatOptions(page, helper: AdminUIHelper, blockId: string) {
  await helper.clickBlockInIframe(blockId);
  const trigger = page.locator('.quanta-toolbar .format-dropdown-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.locator('.format-dropdown-menu');
  await expect(menu).toBeVisible();
  return await menu
    .locator('.format-dropdown-item')
    .evaluateAll((items) => items.map((i) => i.getAttribute('title')));
}

test.describe('slate style allow-list', () => {
  test('the format dropdown drops a disallowed style and keeps the rest', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const titles = await formatOptions(page, helper, 'target');
    expect(titles.some((t) => t?.toLowerCase().includes('quote'))).toBe(false);
    // The dropdown still works — this is a filter, not an empty menu.
    expect(titles).toContain('Title');
  });

  test('an inline style is filtered out of the toolbar too', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('target');
    const toolbar = page.locator('.quanta-toolbar');
    // Bold survives; strikethrough (`del`) is denied. volto-slate models both as
    // inline ELEMENTS, so one allow-list covers block and inline formats alike.
    await expect(toolbar.locator('[data-toolbar-button="bold"]')).toHaveCount(1);
    await expect(toolbar.locator('[data-toolbar-button="strikethrough"]')).toHaveCount(0);
  });

  test('an ALLOWED format still applies on a restricted page', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const iframe = helper.getIframe();
    const block = iframe.locator('[data-block-uid="target"]');
    await expect(block.locator('h2')).toHaveCount(0);

    await helper.clickBlockInIframe('target');
    const editableField = await helper.getEditorLocator('target');
    await editableField.click();

    const toolbar = page.locator('.quanta-toolbar');
    await toolbar.locator('.format-dropdown-trigger').click();
    const dropdownMenu = page.locator('.format-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });
    await dropdownMenu.getByRole('button', { name: 'Title', exact: true }).click();

    // Filtering the menu must not break applying what's left in it.
    await expect(block.locator('h2')).toBeVisible({ timeout: 5000 });
    expect(await block.locator('h2').textContent()).toContain('paste here');
  });

  test('a format transform driven straight at the admin is refused', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const iframe = helper.getIframe();
    await helper.clickBlockInIframe('target');
    const editableField = await helper.getEditorLocator('target');
    await editableField.click();

    // The toolbar button is gone and the hotkey is swallowed, so nothing a user
    // can do reaches this branch — which is the point of a backstop. Drive the
    // transform the way a NEW surface added later would, and it still has to be
    // refused at the place the format is actually written.
    await iframe.locator('body').evaluate((_el, blockId) => {
      (window as any).bridge.sendTransformRequest(blockId, 'format', { format: 'del' });
    }, 'target');

    const block = iframe.locator('[data-block-uid="target"]');
    // This frontend renders `del` as a line-through span.
    await expect(block.locator('span[style*="line-through"]')).toHaveCount(0);
    await expect(block).toContainText('paste here');
  });

  test('an unrestricted page still offers everything (the feature is opt-in)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForIframeReady();

    const titles = await formatOptions(page, helper, 'block-1-uuid');
    expect(titles.some((t) => t?.toLowerCase().includes('quote'))).toBe(true);
  });

  test('a stored node the region disallows is normalized when the page loads', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    // The fixture stores `b`; the alias map renames it to `strong`, which this
    // frontend renders as a font-weight span.
    const legacy = helper.getIframe().locator('[data-block-uid="legacy"]');
    await expect(legacy.locator('span[style*="font-weight: bold"]')).toHaveText('bold');
    await expect(legacy).toContainText('was bold');
  });

  test('pasting a disallowed element lands as a paragraph, text intact', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const editor = await helper.enterEditMode('target');
    await helper.selectAllTextInEditor(editor);

    await editor.evaluate((el: HTMLElement) => {
      const dt = new DataTransfer();
      dt.setData('text/html', '<blockquote>quoted</blockquote><p>after</p>');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });

    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid]')).toContainText(['quoted']);
    // Nothing was dropped, and nothing arrived as a blockquote.
    await expect(iframe.locator('blockquote')).toHaveCount(0);
    await expect(iframe.locator('body')).toContainText('after');
  });
});

/**
 * The style menu — how a design system's OWN styles reach an author.
 *
 * Volto ships the menu and both toolbars list it, but hydra's canvas toolbar
 * intercepts mousedown on its buttons to flush the iframe's text buffer before
 * a format applies. A dropdown is not a format button, so "it is in the list"
 * is not evidence that picking a style works. This checks the whole path:
 * the menu opens, a style applies, and the frontend renders the class.
 */
test.describe('design-system style menu', () => {
  test('a block style applies and reaches the rendered element', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    const iframe = helper.getIframe();
    const block = iframe.locator('[data-block-uid="target"]');
    await expect(block.locator('.lead')).toHaveCount(0);

    await helper.clickBlockInIframe('target');
    const editor = await helper.getEditorLocator('target');
    await editor.click();

    const trigger = page.locator('.quanta-toolbar #style-menu');
    await expect(trigger, 'the style menu is in toolbarButtons — it should render').toBeVisible();
    await trigger.click();

    const lead = page.locator('.block-style-lead');
    await expect(lead).toBeVisible();
    await lead.click();

    // The class the design system styles on, on the element the author edited.
    await expect(iframe.locator('[data-block-uid="target"] .lead, [data-block-uid="target"].lead'))
      .toHaveCount(1, { timeout: 5000 });
  });
});

/**
 * Design-system styles in the SIDEBAR, where the design system's CSS does not
 * exist.
 *
 * volto-slate applies the classes there (render.jsx puts `styleName` on the
 * element and each `style-*` mark on the leaf), but Volto never loads the site's
 * stylesheet, so they resolve to nothing: the author picks a style and sees no
 * change at all. hydra labels them from what the style menu declares.
 *
 * Asserting the generated CSS *string* proves nothing — the rules can be perfect
 * and still apply to no element, which is exactly the bug an earlier version of
 * this had (the shared appearance hung on an attribute nothing sets). So this
 * reads the COMPUTED pseudo-element content off the real sidebar editor.
 */
test.describe('style markers in the sidebar', () => {
  test('a styled run is marked at both ends, and names itself when clicked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('styled');
    const sidebarEditor = helper.getSidebarSlateEditor('value');
    await expect(sidebarEditor).toBeVisible({ timeout: 10000 });

    const read = (cls: string, pseudo: string) =>
      sidebarEditor.evaluate(
        (root: HTMLElement, [c, p]: string[]) => {
          const el = root.querySelector(`.${c}`);
          return el ? getComputedStyle(el, p).content : '(no element)';
        },
        [cls, pseudo],
      );

    // WAIT ON THE RIGHT THING. The stylesheet is installed when the frontend's
    // voltoConfig is merged at INIT, which can land after the sidebar editor is
    // visible — so reading a computed marker straight away races it, and the
    // NEGATIVE assertions below would pass for the wrong reason if it lost.
    // Wait until a marker is actually applied; everything else is then readable
    // in one go, with nothing left in flight.
    await expect
      .poll(() => read('lead', '::before'), { timeout: 10000 })
      .toContain('\u00AB');

    const marks = await sidebarEditor.evaluate((root: HTMLElement) => {
      const at = (c: string, p: string) => {
        const el = root.querySelector(`.${c}`);
        return el ? getComputedStyle(el, p).content : '(no element)';
      };
      return {
        leadOpen: at('lead', '::before'),
        leadClose: at('lead', '::after'),
        capOpen: at('dropcap', '::before'),
        capClose: at('dropcap', '::after'),
      };
    });

    // A block style and an inline mark claim different things — a paragraph
    // versus a run inside one — so they are marked differently: doubles for the
    // wider scope, singles for the narrower.
    expect(marks.leadOpen, 'block style opens with «').toContain('\u00AB');
    expect(marks.leadClose, 'block style closes with »').toContain('\u00BB');
    expect(marks.capOpen, 'inline mark opens with ‹').toContain('\u2039');
    expect(marks.capClose, 'inline mark closes with ›').toContain('\u203A');
    // …and neither names itself until it is clicked. Meaningful now: the
    // stylesheet is known applied, so an absent name is a real absence.
    expect(marks.leadClose).not.toContain('Lead');
    expect(marks.capClose).not.toContain('Drop cap');

    // Clicking into the run is when you want to know which style it is.
    await sidebarEditor.locator('.dropcap').click();
    await expect
      .poll(() => read('dropcap', '::after'), { timeout: 5000 })
      .toContain('Drop cap');

    // Only one at a time — clicking elsewhere closes it again.
    await sidebarEditor.locator('.lead').click({ position: { x: 200, y: 5 } });
    await expect
      .poll(() => read('dropcap', '::after'), { timeout: 5000 })
      .not.toContain('Drop cap');
  });
});

test.describe('style menu in the sidebar toolbar', () => {
  test('a style can be applied from the sidebar, and shows there', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/restricted-styles-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('target');
    await helper.waitForSidebarOpen();

    const sidebarEditor = helper.getSidebarSlateEditor('value');
    await expect(sidebarEditor).toBeVisible({ timeout: 10000 });
    // Nothing is styled yet — otherwise the assertion at the end proves nothing.
    await expect(sidebarEditor.locator('.lead')).toHaveCount(0);

    await sidebarEditor.click();
    await sidebarEditor.press('ControlOrMeta+a');

    const toolbar = await helper.waitForSidebarSlateToolbar();
    const trigger = page.locator('.slate-inline-toolbar:not(.quanta-toolbar) #style-menu');
    await expect(
      trigger,
      'styleMenu is in expandedToolbarButtons — the sidebar toolbar should offer it',
    ).toBeVisible({ timeout: 5000 });
    await trigger.click();

    const lead = page.locator('.style-dropdown-menu .block-style-lead');
    await expect(lead).toBeVisible({ timeout: 5000 });
    await lead.click();

    // Applied to the value, and visible where the author is working — the label
    // is what stands in for the design system's CSS, which Volto never loads.
    const styled = sidebarEditor.locator('.lead');
    await expect(styled).toHaveCount(1, { timeout: 5000 });
    // Marked, so the author can see a style took — the marker stands in for the
    // design system's CSS, which Volto never loads. The NAME is on click, and is
    // covered by the markers test above.
    await expect
      .poll(
        () => styled.evaluate((el) => getComputedStyle(el, '::before').content),
        { timeout: 5000 },
      )
      .toContain('\u00AB');
    expect(toolbar).toBeTruthy();
  });
});

/**
 * The opt-in guarantee, for every frontend that is NOT using this.
 *
 * hydra replaces volto-slate's styleMenu button globally, so a bug here would
 * change the toolbar for every consumer, not just one that declares styles. A
 * frontend that declares none must get no control at all — not an empty
 * dropdown, and nothing occupying a toolbar slot.
 */
test.describe('frontends that declare no styles', () => {
  test('get no style control, and no stylesheet', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForIframeReady();

    await helper.clickBlockInIframe('block-1-uuid');
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible();
    // The format dropdown proves the toolbar rendered its buttons at all, so
    // "no style menu" is an absence rather than an empty toolbar.
    await expect(toolbar.locator('.format-dropdown-trigger')).toBeVisible();
    await expect(toolbar.locator('#style-menu')).toHaveCount(0);

    // Nothing declared → nothing injected. A stylesheet here would be marking
    // classes no style menu offers.
    await expect(page.locator('#hydra-style-menu-preview')).toHaveCount(0);
  });
});
