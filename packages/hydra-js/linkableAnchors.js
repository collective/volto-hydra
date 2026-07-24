/**
 * Harvest deep-link anchors from a rendered DOM subtree.
 *
 * Each element carrying `data-linkable-id` contributes an anchor to its NEAREST
 * `[data-block-uid]` ancestor (so a container never absorbs a child block's
 * anchors). Elements without an `id` are skipped — there is no fragment to link.
 *
 * @param {ParentNode} rootEl - element/document to scan
 * @returns {{ [blockUid: string]: Array<{id: string, name: string}> }}
 */
export function collectLinkableAnchors(rootEl) {
  const out = {};
  const els = rootEl.querySelectorAll('[data-linkable-id]');
  for (const el of els) {
    const id = el.getAttribute('id');
    if (!id) continue;
    // Skip anchors inside readonly/forced-template blocks: that content is owned
    // by the template (which carries its own anchors), and persisting
    // _linkableAnchors onto a template-fixed block corrupts slot-collapse on save.
    if (el.closest('[data-block-readonly]')) continue;
    const owner = el.closest('[data-block-uid]');
    if (!owner) continue;
    const uid = owner.getAttribute('data-block-uid');
    const name = el.getAttribute('data-linkable-id');
    (out[uid] ||= []).push({ id, name });
  }
  return out;
}
