/**
 * Integration tests for the edit-mode bridge-connection guard.
 *
 * hydra.js paints a "Hydra Bridge: Not Connected" overlay when it's loaded in
 * an edit iframe but initBridge() was never called (or INITIAL_DATA never
 * arrived) — but only after a 5s idle timeout, long after most tests tear down,
 * so nothing catches it. AdminUIHelper.navigateToEdit() therefore calls
 * waitForBridgeConnected(), the immediate positive form of that check. These
 * tests cover both directions: a healthy boot connects, and the guard fails
 * fast (with the real diagnostic) when the bridge is missing.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Edit-mode bridge connection guard', () => {
  test('navigateToEdit connects the bridge (initialized)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    // navigateToEdit calls waitForBridgeConnected internally; it would throw if
    // the bridge never connected. Assert the positive signal directly too.
    await helper.navigateToEdit('/test-page');

    const initialized = await helper
      .getIframe()
      .locator('body')
      .evaluate(() => (window as any).__hydraBridge?.initialized === true);
    expect(initialized).toBe(true);
  });

  test('waitForBridgeConnected throws the "Not Connected" diagnostic when initBridge was never called', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Reproduce the screenshot's failure: hydra.js is loaded but there is no
    // bridge instance (initBridge never called). Wipe the handle in the iframe.
    await helper
      .getIframe()
      .locator('body')
      .evaluate(() => {
        delete (window as any).__hydraBridge;
      });

    await expect(helper.waitForBridgeConnected(1500)).rejects.toThrow(
      /Hydra Bridge: Not Connected|initBridge\(\) was never called/,
    );
  });
});
