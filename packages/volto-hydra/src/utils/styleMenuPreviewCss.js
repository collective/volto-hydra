/**
 * Make design-system styles VISIBLE in the admin, where the design system's own
 * CSS does not exist.
 *
 * A style is a frontend class. On the canvas that is fine — the canvas IS the
 * frontend, so `.lead` looks like a lead paragraph. But slate is also edited in
 * the SIDEBAR (a teaser's description, a table cell), and that renders inside
 * Volto, which never loads the site's stylesheet. volto-slate does apply the
 * class there (`render.jsx` puts `styleName` on the element and each `style-*`
 * mark on the leaf) — it just resolves to nothing, so an author picks "Lead",
 * sees no change, and has no way to tell whether it took.
 *
 * Rather than ask every design system to ship a second stylesheet for the admin,
 * label the styles generically from what the style menu already declares. Each
 * gets its NAME — the same label the menu shows — and, for an inline style,
 * a marker at both ends so the extent of the run is visible: an inline style
 * that covers three words looks no different from one covering the whole
 * paragraph unless you can see where it stops.
 *
 * Scoped to `.slate-editor` so it only ever affects admin-rendered slate. The
 * canvas is untouched and keeps showing the real thing.
 */

/** CSS-escape a class name for use in a selector. */
function escapeClass(cls) {
  return String(cls).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/** Escape a label for use in a CSS `content` string. */
function escapeContent(label) {
  return String(label).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** The look of a label, applied to whichever selectors this menu produces. */
const LABEL_APPEARANCE = `{
  font-family: system-ui, sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6c757d;
  background: #f1f3f5;
  border-radius: 2px;
  padding: 0 3px;
  vertical-align: super;
  user-select: none;
}`;

/**
 * Build the stylesheet that labels each declared style inside admin slate.
 *
 * @param {Object} styleMenu - config.settings.slate.styleMenu
 * @returns {string} CSS; empty when nothing is declared, so a frontend that
 *   offers no styles gets no stylesheet at all
 */
export function buildStyleMenuPreviewCss(styleMenu) {
  const block = styleMenu?.blockStyles || [];
  const inline = styleMenu?.inlineStyles || [];
  if (block.length === 0 && inline.length === 0) return '';

  // The shared appearance is attached to the selectors this menu actually
  // produces. An earlier version hung it on `[data-hydra-style]`, an attribute
  // nothing sets, so every label rendered as unstyled text.
  const labelSelectors = [];
  for (const def of [...block, ...inline]) {
    if (!def?.cssClass) continue;
    const sel = `.slate-editor .${escapeClass(def.cssClass)}`;
    labelSelectors.push(`${sel}::before`);
  }
  for (const def of inline) {
    if (!def?.cssClass) continue;
    labelSelectors.push(`.slate-editor .${escapeClass(def.cssClass)}::after`);
  }
  if (labelSelectors.length === 0) return '';

  const rules = [`${labelSelectors.join(',\n')} ${LABEL_APPEARANCE}`];

  for (const def of block) {
    if (!def?.cssClass) continue;
    const sel = `.slate-editor .${escapeClass(def.cssClass)}`;
    const label = escapeContent(def.label || def.cssClass);
    // A block style labels itself once, at the start of the block.
    rules.push(
      `${sel} { border-left: 2px solid #dee2e6; padding-left: 6px; }`,
      `${sel}::before { content: "${label}"; margin-right: 4px; }`,
    );
  }

  for (const def of inline) {
    if (!def?.cssClass) continue;
    const sel = `.slate-editor .${escapeClass(def.cssClass)}`;
    const label = escapeContent(def.label || def.cssClass);
    // An inline style is bracketed: where it starts, and where it stops.
    rules.push(
      `${sel} { border-bottom: 1px dotted #adb5bd; }`,
      `${sel}::before { content: "${label}"; margin-right: 2px; }`,
      `${sel}::after { content: "/"; margin-left: 2px; }`,
    );
  }

  return rules.join('\n');
}

const STYLE_ELEMENT_ID = 'hydra-style-menu-preview';

/**
 * Put (or refresh) that stylesheet in the document.
 *
 * Called after the frontend's voltoConfig is merged, which is when the style
 * menu is first known — a frontend declares it at INIT, long after applyConfig.
 * No-op outside a browser, and removes the element when nothing is declared.
 *
 * @param {Object} styleMenu - config.settings.slate.styleMenu
 */
export function installStyleMenuPreviewCss(styleMenu) {
  if (typeof document === 'undefined') return;
  const css = buildStyleMenuPreviewCss(styleMenu);
  let el = document.getElementById(STYLE_ELEMENT_ID);
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
