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
      const headings = [];
      if (/^H[1-6]$/.test(editable.tagName)) headings.push(editable);
      editable
        .querySelectorAll('h1,h2,h3,h4,h5,h6')
        .forEach((h) => headings.push(h));
      for (const heading of headings) {
        const text = (heading.textContent || '').trim();
        if (text) {
          heading.id = slugify(text);
          heading.setAttribute('data-linkable-id', text);
        } else {
          heading.removeAttribute('id');
          heading.removeAttribute('data-linkable-id');
        }
      }
    },
    true,
  );
});
