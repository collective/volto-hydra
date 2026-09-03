import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

/**
 * History + the Inka compare view (volto-hydra#326/#327).
 *
 * The mock synthesizes two deterministic older revisions for any page nobody
 * edited (older = trailing blocks dropped + one seeded word-swap), so History
 * always has something to list and Compare something to show. The compare view
 * SHADOWS Volto's Diff: it renders BOTH versions in `hydra-view:` frontend
 * iframes, answering each iframe's INIT with that version's content — the
 * test-frontend re-renders pushed FORM_DATA, so each pane must show ITS
 * version, not the SSR current page.
 */
test.describe('History and compare', () => {
  test('history lists the synthetic revisions', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await page.goto(helper.contentUrl('/test-page', '/historyview'));

    // Two synthetic versioning rows (0 and 1), newest first.
    const rows = page.locator('#page-history table tbody tr, .contents-table tbody tr, table tbody tr');
    await expect(rows.filter({ hasText: 'Edited' })).toHaveCount(2, { timeout: 15_000 });
  });

  test('compare renders each version in its own frontend iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    // Arrive the way users do — from the page (this also persists the
    // frontend preview URL the compare panes reuse).
    await helper.navigateToView('/test-page');
    await page.goto(helper.contentUrl('/test-page', '/diff?one=0&two=1'));

    const panes = page.locator('#page-diff iframe');
    await expect(panes).toHaveCount(2, { timeout: 20_000 });
    console.log('pane src 0:', await panes.nth(0).getAttribute('src'));
    console.log('pane src 1:', await panes.nth(1).getAttribute('src'));

    // Both panes render the page via the test-frontend...
    const paneBlocks = (n: number) =>
      panes.nth(n).contentFrame().locator('[data-block-uid]');
    await expect(paneBlocks(0).first()).toBeVisible({ timeout: 30_000 });
    await expect(paneBlocks(1).first()).toBeVisible({ timeout: 30_000 });

    // ...and each pane shows ITS version: the synthetic older revision drops
    // trailing blocks, so version 0 must render FEWER blocks than version 1.
    // Poll until the pushed FORM_DATA has applied to both panes (the push
    // replaces the SSR current page, which starts identical in both).
    await expect(async () => {
      const v0 = await paneBlocks(0).count();
      const v1 = await paneBlocks(1).count();
      expect(v0).toBeGreaterThan(0);
      expect(v1).toBeGreaterThan(v0);
    }).toPass({ timeout: 30_000 });
  });

  test('the history row offers View changes for a comparable version', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await page.goto(helper.contentUrl('/test-page', '/historyview'));

    const laterVersion = page.locator('table tbody tr', { hasText: 'Edited' }).first();
    await expect(laterVersion).toBeVisible({ timeout: 15_000 });
    await laterVersion.locator('.dropdown, .ellipsis').first().click();
    await expect(
      page.getByRole('link', { name: /view changes/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
