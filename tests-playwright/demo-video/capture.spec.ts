/**
 * Homepage demo video capture.
 *
 * Records a single deterministic edit session against /showcase-page that
 * shows off slate editing + DnD + container ops + frontend switching, in a
 * tight ~12-second loop suitable for the docs homepage hero (à la plate.js).
 *
 * Run with:
 *   pnpm demo:capture
 *
 * Output: tests-playwright/demo-video/.recordings/<timestamp>.webm
 *   then `pnpm demo:encode` re-muxes that into docs/_static/hydra-demo.mp4
 *   for embedding in docs/index.md.
 *
 * Each `step()` block is a beat in the demo with a fixed pause afterwards
 * so a viewer can follow what happened. Resist the urge to make individual
 * actions fast — the storytelling cadence matters more than realism here.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOWCASE_PATH = '/showcase-page';
const BEAT_MS = 900;
const TRIM_MARKER_FILE = path.join(SCRIPT_DIR, '.recordings', 'trim-ms.txt');

async function beat(page: import('@playwright/test').Page, label: string) {
  // No-op marker that just paces the recording. `label` shows up in the
  // playwright trace if anyone enables tracing for debugging.
  await page.waitForTimeout(BEAT_MS);
}

test.describe.configure({ mode: 'serial' });

// Required local servers for the demo capture. Missing any of these
// produces a recording with broken iframes / blank frames, so we fail
// fast instead. Update this list (and start:test / RAZZLE_DEFAULT_IFRAME_URL)
// together if the demo flow gets new beats.
const REQUIRED_SERVERS = [
  { url: 'http://localhost:8888/@search?path=/', label: 'mock-api on :8888    (pnpm start:mock-api)' },
  { url: 'http://localhost:3002/health',         label: 'Volto compile on :3002 (pnpm start:test)' },
  { url: 'http://localhost:3003/',               label: 'Nuxt on :3003          (pnpm start:nuxt:test)' },
  { url: 'http://localhost:3008/',               label: 'F7 Mobile on :3008     (cd examples/hydra-vue-f7 && pnpm dev:test)' },
];

test.beforeAll(async () => {
  const failures: string[] = [];
  for (const { url, label } of REQUIRED_SERVERS) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (r.status >= 500) failures.push(`${label} — HTTP ${r.status}`);
    } catch (e) {
      failures.push(`${label} — ${(e as Error).message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Demo video capture requires these servers to be running:\n  ` +
      failures.join('\n  ') +
      `\nStart them and retry. The expected frontend list (with names) is set in the start:test script.`,
    );
  }
});

test('hydra-demo — homepage hero loop', async ({ page }) => {
  test.setTimeout(120_000);
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit(SHOWCASE_PATH);

  // Wait for a fully-settled editor before any beats — the recording
  // includes login + iframe load, but those are visually noisy and
  // shouldn't be in the published clip. Network idle + a small buffer
  // gives the iframe time to finish layout/paint.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2_000);

  // Stamp the timestamp where beats begin so encode can -ss-trim the
  // loading prefix off the .webm. Playwright videos start at t=0 when
  // the page is created; this performance.now() is "ms since page
  // create" → "seconds to skip in ffmpeg".
  const trimMs = await page.evaluate(() => performance.now());
  fs.mkdirSync(path.dirname(TRIM_MARKER_FILE), { recursive: true });
  fs.writeFileSync(TRIM_MARKER_FILE, String(trimMs));
  console.log(`[demo-video] trim point: ${trimMs.toFixed(0)} ms`);

  const iframe = page.frameLocator('iframe');

  // Beat 1 — type into a slate paragraph. Shows live preview updating.
  // Assert: the typed text actually lands in the iframe.
  await helper.clickBlockInIframe('intro');
  await helper.waitForBlockSelectedInAdmin('intro');
  await page.keyboard.press('End');
  await page.keyboard.type(' Edit anywhere.', { delay: 40 });
  await expect(iframe.locator('[data-block-uid="intro"]'))
    .toContainText('Edit anywhere.', { timeout: 5_000 });
  await beat(page, 'slate edit');

  // Beat 2 — bold the phrase we just typed (Quanta toolbar).
  // No DOM-level assertion — Slate's bold rendering varies by frontend
  // (could be <strong>, <b>, or a styled span); the visual recording
  // captures the formatting toolbar interaction either way.
  await page.keyboard.press('Shift+Home');
  await page.waitForTimeout(200);
  await page.keyboard.press('Meta+B');
  await beat(page, 'format');

  // Beat 3 — drop into block mode, drag the intro paragraph past the
  // adjacent column block to show DnD reflow. The dragBlockAfter helper
  // asserts the drop completed; the post-drop DOM order is implicit.
  await helper.escapeFromEditing();
  await beat(page, 'block mode');
  await helper.dragBlockAfter('intro', 'after-columns');
  await beat(page, 'dnd');

  // Beat 4 — click into the columns container. waitForBlockSelectedInAdmin
  // is the assertion; the helper fails if the selection state doesn't land.
  await helper.clickBlockInIframe('columns-1');
  await helper.waitForBlockSelectedInAdmin('columns-1');
  await beat(page, 'container selected');

  // Beat 5 — open the frontend switcher panel and click F7 Mobile.
  // The iframe swaps to the F7 frontend showing the same content
  // through a different design system — the omni-channel feature in
  // action. Requires the F7 dev frontend to be running on :3008
  // (pnpm --filter hydra-vue-f7 run dev:test) and the start:test env
  // var to map "F7 Mobile" to that URL.
  // Assert: the iframe src changes to a localhost:3008 URL after click.
  await page.locator('#toolbar-frontend-switcher').click();
  const panel = page.locator('.frontend-switcher-panel');
  await panel.waitFor({ state: 'visible' });
  const f7Item = panel.locator('.frontend-switcher-url-item', { hasText: 'F7 Mobile' });
  await f7Item.waitFor({ state: 'visible', timeout: 5_000 });
  await beat(page, 'switcher open');
  await f7Item.click();
  await expect(async () => {
    const src = await page.locator('#previewIframe').getAttribute('src');
    expect(src).toContain('localhost:3008');
  }).toPass({ timeout: 5_000 });
  // Let the F7 frontend finish loading inside the iframe so the swap
  // is visibly captured (not just the URL change).
  await page.waitForTimeout(2_500);
});
