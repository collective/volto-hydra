/**
 * Make design-system styles VISIBLE in the admin, where the design system's own
 * CSS does not exist.
 *
 * A style is a frontend class. On the canvas that is fine — the canvas IS the
 * frontend. But slate is also edited in the SIDEBAR, which renders inside Volto,
 * and Volto never loads the site's stylesheet. volto-slate does apply the class
 * there (`render.jsx` puts `styleName` on the element and each `style-*` mark on
 * the leaf); it simply resolves to nothing, so an author picks "Lead", sees no
 * change, and cannot tell whether it took.
 *
 * MARKERS, NOT WORDS. The first version wrote the style's NAME inline, which put
 * text inside the sentence: a drop cap styles one letter at the start of a word,
 * so the closing marker landed between `D` and `esign-system` and the word read
 * as two. Now each styled run is bracketed with chevrons — enough to see that a
 * style is applied and exactly where it stops, without adding anything that
 * reads as a word. The NAME appears when you click into the run, which is when
 * you actually want it.
 *
 * Scoped to `.slate-editor`, so the canvas keeps showing the real thing.
 */

/** CSS-escape a class name for use in a selector. */
function escapeClass(cls) {
  return String(cls).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/** The marker pair, and the name revealed on click. */
const APPEARANCE = `{
  font-family: system-ui, sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #adb5bd;
  user-select: none;
  cursor: default;
}`;

const OPEN_APPEARANCE = `{
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #495057;
  background: #f1f3f5;
  border-radius: 2px;
  padding: 0 3px;
  margin-left: 2px;
  vertical-align: super;
}`;

/**
 * Build the stylesheet that marks each declared style inside admin slate.
 *
 * @param {Object} styleMenu - config.settings.slate.styleMenu
 * @returns {string} CSS; empty when nothing is declared, so a frontend that
 *   offers no styles gets no stylesheet at all
 */
export function buildStyleMenuPreviewCss(styleMenu) {
  const defs = [
    ...(styleMenu?.blockStyles || []),
    ...(styleMenu?.inlineStyles || []),
  ].filter((d) => d?.cssClass);
  if (defs.length === 0) return '';

  const sel = (d) => `.slate-editor .${escapeClass(d.cssClass)}`;
  const before = defs.map((d) => `${sel(d)}::before`);
  const after = defs.map((d) => `${sel(d)}::after`);

  return [
    // Chevrons on each side. No text, so nothing joins the sentence.
    `${[...before, ...after].join(',\n')} ${APPEARANCE}`,
    `${before.join(',\n')} { content: "\\2039"; margin-right: 1px; }`,
    `${after.join(',\n')} { content: "\\203A"; margin-left: 1px; }`,
    // Clicked: say which style it is. The name rides on the attribute, so this
    // is one rule for every style rather than one per class.
    `${defs.map((d) => `${sel(d)}[data-hydra-style-open]::after`).join(',\n')} { content: "\\203A" " " attr(data-hydra-style-open); }`,
    `${defs.map((d) => `${sel(d)}[data-hydra-style-open]::after`).join(',\n')} ${OPEN_APPEARANCE}`,
  ].join('\n');
}

const STYLE_ELEMENT_ID = 'hydra-style-menu-preview';
const OPEN_ATTR = 'data-hydra-style-open';

/** class -> label, for whatever the frontend currently declares. */
function labelsOf(styleMenu) {
  const out = new Map();
  for (const d of [
    ...(styleMenu?.blockStyles || []),
    ...(styleMenu?.inlineStyles || []),
  ]) {
    if (d?.cssClass) out.set(d.cssClass, d.label || d.cssClass);
  }
  return out;
}

let clickHandler = null;

/**
 * Put (or refresh) the stylesheet, and the click-to-name behaviour with it.
 *
 * Called after the frontend's voltoConfig is merged, which is when the style
 * menu first becomes known — a frontend declares it at INIT, long after
 * applyConfig. No-op outside a browser; removes everything when nothing is
 * declared.
 *
 * @param {Object} styleMenu - config.settings.slate.styleMenu
 */
export function installStyleMenuPreviewCss(styleMenu) {
  if (typeof document === 'undefined') return;

  const css = buildStyleMenuPreviewCss(styleMenu);
  let el = document.getElementById(STYLE_ELEMENT_ID);
  if (!css) {
    el?.remove();
    if (clickHandler) {
      document.removeEventListener('click', clickHandler, true);
      clickHandler = null;
    }
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;

  const labels = labelsOf(styleMenu);
  if (clickHandler) document.removeEventListener('click', clickHandler, true);
  clickHandler = (e) => {
    // Only ever one open at a time, so a click elsewhere closes the last.
    for (const open of document.querySelectorAll(`[${OPEN_ATTR}]`)) {
      open.removeAttribute(OPEN_ATTR);
    }
    const target = e.target instanceof Element ? e.target : null;
    if (!target || !target.closest('.slate-editor')) return;
    // The innermost styled ancestor — an inline style inside a styled block
    // names the inline one, which is what was clicked.
    let node = target;
    while (node && node.classList) {
      for (const cls of node.classList) {
        if (labels.has(cls)) {
          node.setAttribute(OPEN_ATTR, labels.get(cls));
          return;
        }
      }
      if (node.classList.contains('slate-editor')) return;
      node = node.parentElement;
    }
  };
  // Capture, so it still runs when slate stops the click for its own purposes.
  document.addEventListener('click', clickHandler, true);
}
