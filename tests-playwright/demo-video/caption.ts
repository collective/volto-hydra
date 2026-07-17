import type { Page } from '@playwright/test';

/**
 * On-screen captions burned into the Playwright-recorded demo video.
 *
 * Playwright has no native video-caption API, so we render the caption as a
 * single fixed overlay inside the recorded page. The demo capture already
 * describes each beat with a label; `showCaption` turns that label into text
 * the viewer actually sees, so the loop reads as a narrated walkthrough
 * instead of a silent screen recording.
 *
 * The overlay is `pointer-events: none` and lives on the top-level admin page
 * (not the iframe), so it never intercepts the actions being demoed and
 * survives iframe reloads / frontend switches.
 */
const CAPTION_ID = '__hydra_demo_caption__';

/** Show or update the caption. Pass '' to hide it. */
export async function showCaption(page: Page, text: string): Promise<void> {
  await page.evaluate(
    ({ id, text }) => {
      let el = document.getElementById(id) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        Object.assign(el.style, {
          position: 'fixed',
          left: '50%',
          bottom: '32px',
          transform: 'translateX(-50%)',
          zIndex: '2147483647',
          maxWidth: 'min(82vw, 880px)',
          padding: '12px 22px',
          background: 'rgba(17, 17, 26, 0.86)',
          color: '#fff',
          font: '600 20px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
          textAlign: 'center',
          borderRadius: '12px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
          pointerEvents: 'none',
          opacity: '0',
          transition: 'opacity 180ms ease',
        } as CSSStyleDeclaration);
        document.body.appendChild(el);
      }
      el.textContent = text;
      el.style.opacity = text ? '1' : '0';
    },
    { id: CAPTION_ID, text },
  );
}

/** Remove the caption overlay entirely. */
export async function clearCaption(page: Page): Promise<void> {
  await page.evaluate((id) => {
    document.getElementById(id)?.remove();
  }, CAPTION_ID);
}
