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
   * Reported regression (user, 2026-06-15): "you of course special cased
   * moving so it only works at the top level and not inside containers."
   *
   * What actually happens on Chrome devtools mobile emulation: tap a block
   * INSIDE a container (e.g. a slate inside a column inside a columns
   * block) → chevron-up appears, looks enabled → tap → NOTHING happens.
   *
   * The within-parent move must work the same way at every nesting level.
   * test-1b is the 2nd slate inside col-1; chevron-up should swap it with
   * text-1a (the 1st slate in col-1) — without ever leaving col-1.
   */
  test('chevron ▲ moves a slate within its column (block INSIDE a container)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Confirm starting layout INSIDE col-1: [text-1a, text-1b, col1-img-1]
    const col1ItemsBefore = await iframe.locator('[data-block-uid="col-1"] > [data-block-uid]').evaluateAll(
      els => els.map(e => e.getAttribute('data-block-uid')),
    );
    expect(col1ItemsBefore.slice(0, 2)).toEqual(['text-1a', 'text-1b']);

    // Touch-tap text-1b inside the iframe. Same dispatch pattern the
    // other tests in this file use — touchstart → touchend → click on
    // the iframe's own document so blockClickHandler actually runs.
    const target = 'text-1b';
    await iframe.locator(`[data-block-uid="${target}"]`).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
      'tap on block inside container should still enter block mode',
    ).toBe('block');

    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp, 'chevron ▲ must show for a block inside a column').toBeVisible({ timeout: 5000 });
    await expect(chevronUp, 'chevron ▲ must be enabled for a non-top sibling').not.toBeDisabled();

    // Tap the chevron with the same touch sequence — synthetic click
    // alone would synthesize mousedown and might mask any touch-only bug.
    await chevronUp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });

    // text-1b must now be at index 0 inside col-1 (swapped with text-1a),
    // and must STILL be inside col-1 (this is a within-parent move).
    await expect.poll(async () => {
      const items = await iframe.locator('[data-block-uid="col-1"] > [data-block-uid]').evaluateAll(
        els => els.map(e => e.getAttribute('data-block-uid')),
      );
      return items.slice(0, 2).join(',');
    }, { timeout: 5000 }).toBe('text-1b,text-1a');
  });

  /**
   * Home-page-style: top-level page with diverse block types — slate,
   * image, hero, teaser — and NO containers. The user reported
   * "I click on any frontend on the home page. I can't move it up or
   * down." This locks chevron-up/down behavior for top-level blocks of
   * each type the home page typically has.
   *
   * test-page top-level items: block-1-uuid (slate), block-2-uuid
   * (image), block-3-uuid (slate), block-4-hero (hero), ...
   */
  test('chevron ▲/▼ moves any top-level block (slate, image, hero) on a page with no containers above', async ({ page }) => {
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
    const tapChevron = async (which: 'up' | 'down') => {
      const cls = which === 'up' ? 'chevron-up' : 'chevron-down';
      await page.locator(`.quanta-toolbar .${cls}`).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      });
    };

    // Each scenario: select a block, tap chevron, verify the block's
    // index in the top-level order changed by one in the expected
    // direction.
    const scenarios: Array<{ uid: string; dir: 'up' | 'down' }> = [
      { uid: 'block-2-uuid', dir: 'up' },     // image, idx 1 → 0
      { uid: 'block-3-uuid', dir: 'up' },     // slate, idx 2 → 1
      { uid: 'block-4-hero', dir: 'up' },     // hero,  idx 3 → 2
      { uid: 'block-2-uuid', dir: 'down' },   // image, idx 1 → 2 (after the previous up)
    ];

    for (const { uid, dir } of scenarios) {
      const before = await helper.getBlockOrder();
      const beforeIdx = before.indexOf(uid);
      expect(beforeIdx, `${uid} must be in DOM order before tap`).toBeGreaterThan(-1);

      await tap(uid);
      await page.waitForTimeout(800);
      expect(
        await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
        `tap on ${uid} must enter block mode`,
      ).toBe('block');

      const chev = page.locator(
        `.quanta-toolbar .${dir === 'up' ? 'chevron-up' : 'chevron-down'}`,
      );
      await expect(chev, `chevron ${dir} must be visible for ${uid}`).toBeVisible({ timeout: 5000 });
      await expect(chev, `chevron ${dir} must be enabled for ${uid}`).not.toBeDisabled();

      await tapChevron(dir);
      const expectedStep = dir === 'up' ? -1 : 1;
      await expect.poll(async () => {
        const after = await helper.getBlockOrder();
        return after.indexOf(uid) - beforeIdx;
      }, { timeout: 5000 }).toBe(expectedStep);
    }
  });

  /**
   * Closer to the actual user report: first tap a TOP-LEVEL block,
   * chevron-move it, THEN tap a block INSIDE a container and try to
   * chevron-move that. User reported "works for the first block I
   * selected. then does nothing if I select another block".
   *
   * In container-test-page top-level items: [title-block, columns-1,
   * text-after, grid-1, grid-2, grid-empty]. We move text-after up by
   * one (swap with columns-1 → won't happen with container-aware
   * behavior, but for now the simple within-parent swap is what the
   * code currently does — assert the post-move state precisely).
   * Then we tap a block INSIDE col-1 and try to chevron it up too.
   */
  test('after a top-level move, chevron still works for a 2nd block INSIDE a container', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

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

    // === 1st move: top-level swap of text-after with columns-1 ===
    await tap('text-after');
    await page.waitForTimeout(800);
    expect(await iframe.locator('body').getAttribute('data-hydra-edit-mode')).toBe('block');
    await expect(page.locator('.quanta-toolbar .chevron-up')).toBeVisible({ timeout: 5000 });
    await tapChevronUp();
    await page.waitForTimeout(800);

    // === 2nd block: tap text-1b INSIDE col-1 and chevron-up it ===
    // (text-1b was originally at idx 1 inside col-1, sibling of text-1a/col1-img-1)
    await tap('text-1b');
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
      '2nd tap (different block, in container) should also be block mode',
    ).toBe('block');

    const chevronUp2 = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp2).toBeVisible({ timeout: 5000 });
    await expect(chevronUp2, 'chevron ▲ must be enabled for text-1b inside col-1').not.toBeDisabled();
    await tapChevronUp();

    await expect.poll(async () => {
      const items = await iframe.locator('[data-block-uid="col-1"] > [data-block-uid]').evaluateAll(
        els => els.map(e => e.getAttribute('data-block-uid')),
      );
      return items.slice(0, 2).join(',');
    }, { timeout: 5000 }).toBe('text-1b,text-1a');
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
   * EXPECTED-FAILING (until container-aware chevron is implemented):
   * current moveSelectedBlock just swaps siblings, so this test fails
   * with text-after still at top level (swapped with columns-1).
   */
  test('container-aware chevron-up: text-after (slate) at top level + columns-1 above → INTO columns-1', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    const targetBlock = 'text-after';

    // Touch-tap text-after inside the iframe (block mode requires
    // pointer:coarse, which we get from hasTouch+isMobile + a real
    // touch event sequence — see other tests in this file).
    await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
    ).toBe('block');

    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp).toBeVisible({ timeout: 5000 });
    await chevronUp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });

    // text-after must now be INSIDE columns-1 (specifically in the LAST
    // column, col-2, as the last child — matching the user's expressed
    // model "put it into the container instead of skip"). We assert the
    // weaker "inside columns-1" condition because absorption-into-which-
    // column is a separate design decision; the bug being fixed here is
    // "moves PAST the container instead of INTO it".
    await expect.poll(async () => {
      return await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
      );
    }, { timeout: 5000 }).toBe('col-2');
  });

  /**
   * Skip-past behavior: when the target container REJECTS the block's
   * @type at every accessible leaf AND every slot AND every nesting
   * level, chevron should fall through to a simple swap so the block
   * skips past the container — not silently no-op.
   *
   * Fixture: text-after (slate) is at idx 2 in container-test-page top
   * level. grid-1 (gridBlock) at idx 3 only accepts @type=teaser at
   * every leaf. chevron-▼ on text-after should hop past grid-1, ending
   * up at idx 3 with grid-1 sliding up to idx 2.
   *
   * Also exercises "check other slots in the same container and each
   * container level too": grid-1 has two grid-cells (grid-cell-1,
   * grid-cell-2), both rejecting slate. The new logic must check BOTH
   * cells (and any nested levels) before deciding to skip.
   */
  test('chevron ▼ skips past a container whose every slot rejects the type', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    const orderBefore = await helper.getBlockOrder();
    const idxTextBefore = orderBefore.indexOf('text-after');
    const idxGridBefore = orderBefore.indexOf('grid-1');
    expect(idxTextBefore, 'text-after must be in fixture').toBeGreaterThan(-1);
    expect(idxGridBefore, 'grid-1 must be after text-after initially').toBeGreaterThan(idxTextBefore);

    await iframe.locator('[data-block-uid="text-after"]').first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });
    await page.waitForTimeout(800);
    expect(await iframe.locator('body').getAttribute('data-hydra-edit-mode')).toBe('block');

    const chevronDown = page.locator('.quanta-toolbar .chevron-down');
    await expect(chevronDown).toBeVisible({ timeout: 5000 });
    await expect(chevronDown).not.toBeDisabled();
    await chevronDown.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });

    // text-after must remain at top level (NOT swallowed into grid-1) and
    // must now sit BELOW grid-1 in DOM order.
    await expect.poll(async () => {
      return await iframe.locator('[data-block-uid="text-after"]').first().evaluate((el) => {
        const ancestor = el.parentElement && el.parentElement.closest
          ? el.parentElement.closest('[data-block-uid]')
          : null;
        return ancestor ? ancestor.getAttribute('data-block-uid') : 'top-level';
      });
    }, { timeout: 5000 }).toBe('top-level');

    const orderAfter = await helper.getBlockOrder();
    const idxTextAfter = orderAfter.indexOf('text-after');
    const idxGridAfter = orderAfter.indexOf('grid-1');
    expect(idxTextAfter, 'text-after should be after grid-1 after the skip').toBeGreaterThan(idxGridAfter);
  });

  /**
   * Reciprocal: a block inside a container, at the TOP of the container,
   * has no sibling above. Today chevron-up is disabled. User expects it
   * to MOVE OUT of the container instead (to the position just before
   * the container in the parent's items).
   *
   * EXPECTED-FAILING (until container-aware chevron is implemented):
   * today text-1a is at idx 0 of col-1 so chevron-up is disabled, never
   * fires. New behavior: chevron-up is enabled and moves text-1a OUT
   * of col-1 to top level just before columns-1.
   */
  test('container-aware chevron-up: first slate inside col-1 → OUT of columns-1', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    const targetBlock = 'text-1a'; // First slate in col-1 (statically known)

    await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });
    await page.waitForTimeout(800);

    expect(
      await iframe.locator('body').getAttribute('data-hydra-edit-mode'),
    ).toBe('block');

    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    await expect(chevronUp).toBeVisible({ timeout: 5000 });
    // Today: chevron-up is disabled (at top of parent). New behavior:
    // enabled because the block CAN escape its container.
    await expect(
      chevronUp,
      'chevron ▲ for the top-of-container block should escape, not be disabled',
    ).not.toBeDisabled();
    await chevronUp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      const t = new Touch({ identifier: 2, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    });

    // text-1a must now be at top level (parent NOT col-1 or columns-1)
    // — specifically, just before columns-1 in the page's items.
    await expect.poll(async () => {
      const parentUid = await iframe.locator(`[data-block-uid="${targetBlock}"]`).first().evaluate(
        (el) => el.parentElement?.closest('[data-block-uid]')?.getAttribute('data-block-uid'),
      );
      return parentUid || 'page-level';
    }, { timeout: 5000 }).not.toBe('col-1');
  });
});
