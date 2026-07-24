// This frontend tags headings as deep-link anchors (id = slug of text,
// data-linkable-id = text) via richtext.vue. Inline editing changes a heading's
// text directly in the DOM without updating the Vue node, so keep the anchor
// attributes fresh on input — hydra harvests the id on its next flush/render.
export default defineNuxtPlugin(() => {
  if (typeof document === 'undefined') return;

  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  document.addEventListener(
    'input',
    (e) => {
      // The contenteditable host is the [data-edit-text] element; the heading is
      // a descendant (richtext.vue renders <div data-edit-text><h2>…</h2></div>).
      const editable =
        e.target && e.target.closest && e.target.closest('[data-edit-text]');
      if (!editable) return;
      // Refresh only elements already TAGGED with data-linkable-id (any element,
      // multiple per block). Tag-driven — untagged elements (the page title) are
      // never touched; no element/block/field special-casing.
      const tagged = editable.matches('[data-linkable-id]') ? [editable] : [];
      editable
        .querySelectorAll('[data-linkable-id]')
        .forEach((el) => tagged.push(el));
      for (const el of tagged) {
        const text = (el.textContent || '').trim();
        el.setAttribute('data-linkable-id', text);
        if (text) el.id = slugify(text);
        else el.removeAttribute('id');
      }
    },
    true,
  );
});
