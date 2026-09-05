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

  test('labels a block style with the name the menu shows', () => {
    const css = buildStyleMenuPreviewCss(menu);
    expect(css).toContain('.slate-editor .lead::before');
    expect(css).toContain('content: "Lead"');
  });

  test('brackets an inline style at BOTH ends, so its extent is visible', () => {
    // An inline style over three words looks identical to one over the whole
    // paragraph unless you can see where it stops.
    const css = buildStyleMenuPreviewCss(menu);
    expect(css).toContain('.slate-editor .dropcap::before');
    expect(css).toContain('.slate-editor .dropcap::after');
  });

  test('the shared appearance actually applies to the generated selectors', () => {
    // The first version styled `[data-hydra-style]`, an attribute nothing sets,
    // so every label rendered unstyled — the rules existed and did nothing.
    const css = buildStyleMenuPreviewCss(menu);
    const shared = css.slice(0, css.indexOf('content:'));
    expect(shared).toContain('.slate-editor .lead::before');
    expect(shared).toContain('.slate-editor .dropcap::after');
    expect(css).not.toContain('data-hydra-style');
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
    expect(css).toContain('.slate-editor .a\\.b\\"c');
    expect(css).toContain('content: "He said \\"hi\\""');
  });

  test('falls back to the class when a definition has no label', () => {
    const css = buildStyleMenuPreviewCss({ blockStyles: [{ cssClass: 'lead' }], inlineStyles: [] });
    expect(css).toContain('content: "lead"');
  });
});
