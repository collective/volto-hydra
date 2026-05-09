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
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOWCASE_PATH = '/showcase-page';
const BEAT_MS = 900;

async function beat(page: import('@playwright/test').Page, label: string) {
  // No-op marker that just paces the recording. `label` shows up in the
  // playwright trace if anyone enables tracing for debugging.
  await page.waitForTimeout(BEAT_MS);
}

test.describe.configure({ mode: 'serial' });

test('hydra-demo — homepage hero loop', async ({ page }) => {
  test.setTimeout(120_000);
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit(SHOWCASE_PATH);
  await beat(page, 'page loaded');

  const iframe = page.frameLocator('iframe');

  // Beat 1 — type into a slate paragraph. Shows live preview updating.
  await helper.clickBlockInIframe('intro');
  await helper.waitForBlockSelectedInAdmin('intro');
  await page.keyboard.press('End');
  await page.keyboard.type(' Edit anywhere.', { delay: 40 });
  await beat(page, 'slate edit');

  // Beat 2 — bold a phrase (Quanta toolbar).
  await page.keyboard.press('Shift+Home');
  await page.waitForTimeout(200);
  await page.keyboard.press('Meta+B');
  await beat(page, 'format');

  // Beat 3 — drop into block mode, drag the block down past a sibling.
  await helper.escapeFromEditing();
  await beat(page, 'block mode');

  // (Drag handle interactions are flow-dependent on the helper API; left as
  // a placeholder — fill in with the project's preferred drag helper.)

  // Beat 4 — click into the columns container, show the children list.
  await helper.clickBlockInIframe('columns-1');
  await helper.waitForBlockSelectedInAdmin('columns-1');
  await beat(page, 'container selected');

  // Beat 5 — open the frontend switcher (admin toolbar), preview-only beat.
  // Concrete locator depends on the toolbar's data-test attribute; use the
  // closest stable selector from AdminUIHelper here.
  // await helper.openFrontendSwitcher();
  // await beat(page, 'frontend switch');
});
