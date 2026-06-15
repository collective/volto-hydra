/**
 * Block move via chevron ▲ / ▼ MUST work in block mode on a touch device.
 *
 * The existing "chevron ▼ moves the selected block down within its parent"
 * test at mobile-tablet-admin-layout.spec.ts:532 uses `setViewportSize`
 * only — it does NOT enable `hasTouch + isMobile`. Without those, Chromium
 * doesn't report `pointer: coarse`, and hydra.js's touch-aware tap logic
 * short-circuits to text mode immediately (mouse pointer = always text
 * mode). That test therefore exercises the text-mode chevron path and
 * never sees the block-mode path the bug actually lives in.
 *
 * This test reproduces the user-reported bug: in block mode (1st tap on
 * a touch device) the chevron ▲ / ▼ in the Quanta toolbar fail to move
 * the block. If it fires, the bug is confirmed at the layer it
 * actually happens.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

test.describe('touch-mode block move via chevron', () => {
  test('chevron ▼ moves the selected block down within its parent — IN BLOCK MODE', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const coarse = await iframe.locator('html').evaluate(
      () => window.matchMedia('(pointer: coarse)').matches,
    );
    expect(coarse, 'mobile device profile must report pointer: coarse').toBe(true);

    const initialOrder = await helper.getBlockOrder();
    expect(initialOrder.length).toBeGreaterThan(2);

    // Pick a slate (text) block that is NOT the auto-restored selection
    // — slate is the user-reported case where block-mode chevron-move
    // doesn't fire. Image blocks (initialOrder[1] in this fixture)
    // exhibit different behavior because they don't compete for the
    // text-selection gesture, so testing on slate matters.
    // block-3-uuid is a slate block at idx 2 in test-page.
    const targetBlock = 'block-3-uuid';

    // Dispatch a real touch sequence (touchstart → touchend → click)
    // INSIDE the iframe, not the outer page. Playwright's
    // page.touchscreen.tap dispatches on the outer document and
    // doesn't penetrate the iframe. We need to fire the events on the
    // iframe's own document so the iframe's listeners (long-press
    // timer, MOUSE_ACTIVITY reporter, blockClickHandler) actually run.
    // The bug only manifests with a real touch sequence because
    // MOUSE_ACTIVITY is currently only sent on mousedown / mousemove —
    // a real touch may fire those late or not at all, leaving the
    // Quanta toolbar at opacity:0.
    await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate(
      (el) => {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const touch = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch],
        }));
        el.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [touch],
        }));
        // Synthesize the click the browser would fire after a tap.
        el.dispatchEvent(new MouseEvent('click', {
          bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0,
        }));
      },
    );
    await page.waitForTimeout(800);

    // Confirm we ARE in block mode — that's the precondition the bug needs.
    const editMode = await iframe.locator('body').getAttribute('data-hydra-edit-mode');
    expect(editMode, '1st tap on a touch device should leave us in block mode').toBe('block');

    // The chevron-up button must be visible AND clickable. The Quanta
    // toolbar starts faded; touch should fire MOUSE_ACTIVITY which unfades
    // it. If MOUSE_ACTIVITY is not being sent on touch (or the toolbar's
    // pointerEvents:none isn't overridden on .chevron-buttons), the
    // button is unreachable and this fails.
    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp, 'chevron ▲ should be in the DOM in block mode on touch device').toBeVisible({ timeout: 5000 });
    await expect(chevronUp).not.toBeDisabled();

    // Stricter than toBeVisible — the Quanta toolbar has opacity:0 when
    // faded (default). On a touch device the iframe must send
    // MOUSE_ACTIVITY on touchstart so the toolbar unfades. If
    // MOUSE_ACTIVITY is only on `mousedown` (not `touchstart`), tapping
    // on a real touch device leaves the toolbar invisible — buttons
    // present in the DOM but visually opacity:0, so the user can't see
    // or aim at them.
    const opacity = await page.locator('.quanta-toolbar').evaluate(
      (el) => parseFloat(window.getComputedStyle(el as HTMLElement).opacity || '1'),
    );
    expect(opacity, 'Quanta toolbar must be unfaded after a touch tap').toBeGreaterThan(0.5);

    // Tap the chevron via the real touch sequence — synthetic click
    // synthesizes mousedown which would unfade the toolbar even if the
    // touch listeners don't.
    await chevronUp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const touch = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [touch],
      }));
      el.dispatchEvent(new MouseEvent('click', {
        bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0,
      }));
    });

    // Block order must change — proves the move actually fired. The
    // target block should have swapped with its previous sibling.
    const originalIdx = initialOrder.indexOf(targetBlock);
    await expect(async () => {
      const after = await helper.getBlockOrder();
      const newIdx = after.indexOf(targetBlock);
      expect(newIdx, `${targetBlock} should have moved up by one position`).toBe(originalIdx - 1);
    }).toPass({ timeout: 5000 });
  });

  /**
   * Reported regression: chevron-up/down works for the FIRST block the
   * user taps but does nothing for any block tapped AFTER that. Likely
   * the chevron's onClick captures the first selectedBlock via React
   * closure and never updates when the bridge sends a new BLOCK_SELECTED.
   * Or moveSelectedBlock reads stale selectedBlock from a ref/state.
   *
   * Reproduces the exact user gesture: tap block-3 → move it up,
   * then tap block-2 (now at a different index after the first move)
   * and try to move it up too.
   */
  test('chevron ▲ keeps working after the user switches to a different block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    const tap = async (uid: string) => {
      await iframe.locator(`[data-block-uid="${uid}"]`).first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      });
    };
    const tapChevronUp = async () => {
      await page.locator('.quanta-toolbar .chevron-up').evaluate((el) => {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      });
    };

    const initial = await helper.getBlockOrder();
    expect(initial.length).toBeGreaterThan(3);

    // === 1st block: tap block-3 (slate), move it up. ===
    await tap('block-3-uuid');
    await page.waitForTimeout(800);
    expect(await iframe.locator('body').getAttribute('data-hydra-edit-mode')).toBe('block');
    await expect(page.locator('.quanta-toolbar .chevron-up')).toBeVisible({ timeout: 5000 });
    await tapChevronUp();
    await expect.poll(async () => {
      const o = await helper.getBlockOrder();
      return o.indexOf('block-3-uuid');
    }, { timeout: 5000 }).toBe(initial.indexOf('block-3-uuid') - 1);

    const afterFirstMove = await helper.getBlockOrder();

    // === 2nd block: tap a DIFFERENT block. The bug: chevron does
    // nothing the second time. ===
    // Pick a block that exists AND isn't at the very top (so chevron-up
    // is meaningful).
    const secondTarget = afterFirstMove.find(
      (u) => u !== 'block-3-uuid' && afterFirstMove.indexOf(u) > 0,
    )!;
    expect(secondTarget).toBeTruthy();

    await tap(secondTarget);
    await page.waitForTimeout(800);
    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
      'second tap on a different block must still be block mode',
    ).toBe('block');

    const chevronUp2 = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp2).toBeVisible({ timeout: 5000 });
    await expect(chevronUp2).not.toBeDisabled();
    await tapChevronUp();

    // Bug surface: the second block didn't move.
    const expectedIdx = afterFirstMove.indexOf(secondTarget) - 1;
    await expect.poll(async () => {
      const o = await helper.getBlockOrder();
      return o.indexOf(secondTarget);
    }, { timeout: 5000 }).toBe(expectedIdx);
  });

  /**
   * User-requested behavior: when the block ABOVE is a container that
   * accepts this block's type, chevron-up should put the block INTO the
   * container (as its last child) rather than skipping past it.
   *
   * Fixture: container-test-page has
   *   [title-block, columns-1 (with slates inside), text-after (slate),
   *    grid-1, grid-2, grid-empty]
   * `text-after` is a sibling of `columns-1` at the top level. columns-1
   * accepts slate. So chevron-up on text-after should INSERT it into
   * the last column of columns-1, not swap it with columns-1.
   *
   * EXPECTED-FAILING: current moveSelectedBlock just swaps siblings.
   */
  test.fixme('container-aware chevron-up: text-after (slate) at top level + columns-1 above → INTO columns-1', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    const targetBlock = 'text-after';
    await helper.clickBlockInIframe(targetBlock);
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
    ).toBe('block');

    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp).toBeVisible();
    await chevronUp.click();
    await page.waitForTimeout(800);

    // text-after must now be INSIDE columns-1. Walk up its ancestors
    // until we find a [data-block-uid] — that's its new parent.
    const newParentUid = await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
    );
    expect(
      newParentUid,
      'text-after should be inside columns-1 after chevron-up',
    ).toBe('columns-1');
  });

  /**
   * Reciprocal: a block inside a container, at the TOP of the container,
   * has no sibling above. Today chevron-up is disabled. User expects it
   * to MOVE OUT of the container instead (to the position just before
   * the container in the parent's items).
   *
   * EXPECTED-FAILING.
   */
  test.fixme('container-aware chevron-up: first slate inside columns-1 → OUT of columns-1', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    // First slate child of columns-1 — read it from the DOM dynamically
    // because the fixture's column block UIDs vary.
    const firstChildUid = await iframe.locator(
      '[data-block-uid="columns-1"] [data-block-uid]',
    ).first().evaluate(el => el.getAttribute('data-block-uid'));
    expect(firstChildUid).toBeTruthy();

    await helper.clickBlockInIframe(firstChildUid!);
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
    ).toBe('block');

    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    // Today: this is disabled (at top of parent). New behavior: enabled
    // because the block CAN move out of the container.
    await expect(chevronUp).toBeVisible();
    await expect(chevronUp).not.toBeDisabled();
    await chevronUp.click();
    await page.waitForTimeout(800);

    // The block must NOT have columns-1 as its ancestor anymore.
    const newParentUid = await iframe.locator(`[data-block-uid="${firstChildUid!}"]`).first().evaluate(
      (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
    );
    expect(newParentUid).not.toBe('columns-1');
  });
});
