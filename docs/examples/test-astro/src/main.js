/**
 * Astro example client bootstrap.
 *
 * Bridge integration mirrors test-svelte/src/main.js with one structural
 * difference: instead of handing form data to a reactive UI framework
 * (Svelte / Vue / React) to reconcile, the Astro version POSTs to its own
 * `/api/render` endpoint and swaps the returned HTML into the DOM. The
 * unit that gets re-rendered is decided by `findChangedUnit` in diff.js —
 * single block when only one block's data changed; otherwise the whole
 * page content area.
 *
 * Why server round-trip instead of a top-level UI-framework island: pure
 * `.astro` block components have no client-side reactivity, so we lean on
 * the server's Container API. The diff narrows what's re-rendered so the
 * cost is per-changed-block, not per-page, even on huge pages.
 *
 * Why per-block matters (not just an optimisation): a full innerHTML swap
 * of the content area destroys all in-place state — contenteditable
 * cursor, image load state, scroll position. Vue/React reconciliation in
 * Nuxt/Next gives "per-block" effectively for free; Astro has to opt in.
 */
import { initBridge, expandListingBlocks, ploneFetchItems, contentPath } from '$hydra';
import docPageDefinitions from '$schemas';
import { findChangedUnit } from './diff.js';

const docBlocksConfig = Object.fromEntries(
  Object.values(docPageDefinitions).flatMap((page) => Object.entries(page.blocks)),
);

// Hydra helpers that doc-example block components consume as globals — same
// pattern as test-svelte/main.js. Keeping the global shape compatible so
// the shared block-definitions.json reaches the same DOM hooks.
window.expandListingBlocks = expandListingBlocks;
window.ploneFetchItems = ploneFetchItems;
window._API_URL = 'http://localhost:8888';
window._contentPath = (url) => contentPath(url, window._API_URL);

// The form data the iframe last received via FORM_DATA — kept here so the
// next FORM_DATA can be diffed against it. `null` means we haven't
// rendered anything yet, so the first onEditChange triggers a full-page
// render unconditionally.
let lastFormData = null;
let renderInFlight = null;

/**
 * Sends the unit to /api/render and swaps the returned HTML in.
 *
 * For unit='page': replaces the entire `#content` innerHTML.
 * For unit='block': replaces the matching `[data-block-uid="X"]`
 *   element's outerHTML. The new HTML carries its own wrapper div with
 *   data-block-uid (rendered by BlockRenderer.astro) so the swap is
 *   self-contained — no need to re-attach the attribute.
 */
async function renderUnit(unit, formData) {
  const resp = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unit, formData }),
  });
  if (!resp.ok) {
    console.error('Render endpoint failed:', resp.status, await resp.text());
    return;
  }
  const html = await resp.text();
  if (unit.unit === 'page') {
    const container = document.getElementById('content');
    if (container) container.innerHTML = html;
  } else {
    const el = document.querySelector(`[data-block-uid="${unit.blockId}"]`);
    if (el) el.outerHTML = html;
  }
}

async function handleFormData(formData) {
  if (formData.title) {
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = formData.title;
  }
  if (!formData.blocks || !formData.blocks_layout) return;

  // First render: there's no previous form, so re-render the whole page.
  // findChangedUnit short-circuits this case via its early deep-equal,
  // but it returns null for "no change" — we need an explicit "render
  // everything" trigger for the first time we see data.
  const unit = lastFormData == null
    ? { unit: 'page' }
    : findChangedUnit(lastFormData, formData);
  lastFormData = formData;
  if (!unit) return;

  // Coalesce: if a render is already in flight, drop this one; the
  // newest formData is what we have stored, and the next FORM_DATA will
  // diff against it. Prevents flicker when the user types fast.
  if (renderInFlight) return;
  renderInFlight = renderUnit(unit, formData).finally(() => {
    renderInFlight = null;
  });
}

window.bridge = initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: {
          title: 'Blocks',
          allowedBlocks: Object.keys(docBlocksConfig),
        },
      },
    },
  },
  blocks: { ...docBlocksConfig },
  onEditChange: handleFormData,
});
