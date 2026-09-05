/**
 * A design-system style is a frontend class, and the sidebar's slate editor
 * renders inside Volto, which never loads the site's stylesheet. The class is
 * applied there and resolves to nothing — so the author picks "Lead" and sees
 * no change at all. These labels are what makes it visible generically.
 */
import { describe, test, expect } from 'vitest';
import { buildStyleMenuPreviewCss } from './styleMenuPreviewCss.js';

const menu = {
  blockStyles: [{ cssClass: 'lead', label: 'Lead' }],
  inlineStyles: [{ cssClass: 'dropcap', label: 'Drop cap' }],
};

describe('buildStyleMenuPreviewCss', () => {
  test('a frontend that declares no styles gets no stylesheet', () => {
    expect(buildStyleMenuPreviewCss(undefined)).toBe('');
    expect(buildStyleMenuPreviewCss({ blockStyles: [], inlineStyles: [] })).toBe('');
  });

  test('marks each styled run at BOTH ends, so its extent is visible', () => {
    // A style over three words looks identical to one over the whole paragraph
    // unless you can see where it stops.
    const css = buildStyleMenuPreviewCss(menu);
    expect(css).toContain('.slate-editor .lead::before');
    expect(css).toContain('.slate-editor .dropcap::before');
    expect(css).toContain('.slate-editor .dropcap::after');
  });

  test('the markers are chevrons, never words', () => {
    // The first version wrote the style NAME inline. A drop cap styles one
    // letter at the start of a word, so the closing marker landed between `D`
    // and `esign-system` and the word read as two.
    const css = buildStyleMenuPreviewCss(menu);
    expect(css).toContain('content: "\\2039"'); // ‹
    expect(css).toContain('content: "\\203A"'); // ›
    // No name is rendered until the run is clicked.
    const beforeClickRules = css.slice(0, css.indexOf('data-hydra-style-open'));
    expect(beforeClickRules).not.toContain('Lead');
    expect(beforeClickRules).not.toContain('Drop cap');
  });

  test('clicking a run reveals its name, from the attribute', () => {
    const css = buildStyleMenuPreviewCss(menu);
    expect(css).toContain('[data-hydra-style-open]::after');
    // attr() means one rule covers every style, rather than one per class.
    expect(css).toContain('attr(data-hydra-style-open)');
  });

  test('the shared appearance actually applies to the generated selectors', () => {
    // An early version styled `[data-hydra-style]`, an attribute nothing set, so
    // every marker rendered unstyled — the rules existed and did nothing.
    const css = buildStyleMenuPreviewCss(menu);
    const shared = css.slice(0, css.indexOf('content:'));
    expect(shared).toContain('.slate-editor .lead::before');
    expect(shared).toContain('.slate-editor .dropcap::after');
  });

  test('never escapes its scope — admin slate only, never the canvas', () => {
    for (const line of buildStyleMenuPreviewCss(menu).split('\n')) {
      if (!line.includes('{') || line.trim().startsWith('}')) continue;
      expect(line, `unscoped rule: ${line}`).toContain('.slate-editor');
    }
  });

  test('a class or label with awkward characters cannot break out', () => {
    const css = buildStyleMenuPreviewCss({
      blockStyles: [{ cssClass: 'a.b"c', label: 'He said "hi"' }],
      inlineStyles: [],
    });
    // The class is escaped for the selector; the label never reaches CSS at all
    // now — it rides on an attribute — so it cannot break out of a string.
    expect(css).toContain('.slate-editor .a\\.b\\"c');
    expect(css).not.toContain('He said');
  });

  test('a definition with no label still gets its markers', () => {
    const css = buildStyleMenuPreviewCss({ blockStyles: [{ cssClass: 'lead' }], inlineStyles: [] });
    expect(css).toContain('.slate-editor .lead::before');
  });
});
