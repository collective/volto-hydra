import config from '@plone/volto/registry';

/**
 * What to call a block on screen.
 *
 * One function, because a block gets named in more than one place — the child
 * list in the sidebar, and any picker that offers blocks — and two of those
 * disagreeing is confusing in a way that is hard to report: the same question
 * is "Text" in one list and "Your name" in another.
 *
 * The order runs from what an author wrote to what the system knows:
 *
 *   1. `labelField` — a field the schema nominates, for blocks whose name lives
 *      somewhere specific (a form question's `label`).
 *   2. `title`, then `label` — what most blocks call their own heading.
 *   3. `plaintext` — the block's indexed text, which is what a block that has
 *      no name but does have words is recognised by.
 *   4. the block type's configured title, then the raw type — a last resort
 *      that at least says what kind of thing it is.
 *
 * `fallback` covers a block with none of the above (an untyped object_list item
 * is "Item 3" rather than nothing).
 */
export function blockDisplayTitle(data, { labelField, fallback } = {}) {
  const named = labelField ? data?.[labelField] : undefined;
  if (typeof named === 'string' && named.trim()) return named;

  for (const key of ['title', 'label', 'plaintext']) {
    const value = data?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  const type = data?.['@type'];
  const configured = type
    ? config.blocks?.blocksConfig?.[type]?.title
    : undefined;
  return configured || fallback || type || 'Block';
}
