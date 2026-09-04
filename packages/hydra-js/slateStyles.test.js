import {
  foldSlateStyleRules,
  isStyleAllowed,
  isMarkAllowed,
  normalizeSlateValue,
} from './slateStyles.js';

const p = (...kids) => ({ type: 'p', children: kids.map(t => (typeof t === 'string' ? { text: t } : t)) });
const el = (type, ...kids) => ({ type, children: kids.map(t => (typeof t === 'string' ? { text: t } : t)) });

// The DS bans blockquote outright and calls `b` by its real name.
const NO_QUOTE = { allowedStyles: null, disallowedStyles: ['blockquote', 'b'], allowedMarks: null, disallowedMarks: null };
const OPTS = { aliases: { b: 'strong', i: 'em' }, defaultBlockType: 'p' };

describe('foldSlateStyleRules', () => {
  test('nothing declared anywhere → null (unrestricted, today’s behaviour)', () => {
    expect(foldSlateStyleRules(null, {})).toBeNull();
    expect(foldSlateStyleRules(null, { widget: 'blocks_layout' })).toBeNull();
  });

  test('a field that declares nothing returns the inherited object BY REFERENCE', () => {
    const inherited = foldSlateStyleRules(null, { disallowedStyles: ['blockquote'] });
    expect(foldSlateStyleRules(inherited, { allowedBlocks: ['slate'] })).toBe(inherited);
  });

  test('deny accumulates down the chain and cannot be re-allowed', () => {
    const page = foldSlateStyleRules(null, { disallowedStyles: ['blockquote'] });
    const region = foldSlateStyleRules(page, { allowedStyles: ['p', 'h2', 'blockquote'] });
    expect(isStyleAllowed('h2', region)).toBe(true);
    expect(isStyleAllowed('blockquote', region)).toBe(false);
  });

  test('deny unions across levels', () => {
    const page = foldSlateStyleRules(null, { disallowedStyles: ['blockquote'] });
    const region = foldSlateStyleRules(page, { disallowedStyles: ['h4'] });
    expect(region.disallowedStyles.sort()).toEqual(['blockquote', 'h4']);
    expect(page.disallowedStyles).toEqual(['blockquote']); // parent not mutated
  });

  test('allow REPLACES the inherited list — a nested region may widen', () => {
    const page = foldSlateStyleRules(null, { allowedStyles: ['p'] });
    const region = foldSlateStyleRules(page, { allowedStyles: ['p', 'h2'] });
    expect(isStyleAllowed('h2', page)).toBe(false);
    expect(isStyleAllowed('h2', region)).toBe(true);
  });

  test('marks fold the same way, independently of styles', () => {
    const rules = foldSlateStyleRules(null, { disallowedMarks: ['highlight'] });
    expect(isMarkAllowed('highlight', rules)).toBe(false);
    expect(isMarkAllowed('strong', rules)).toBe(true);
    expect(isStyleAllowed('highlight', rules)).toBe(true);
  });
});

describe('isStyleAllowed', () => {
  test('no rules → everything allowed', () => {
    expect(isStyleAllowed('blockquote', null)).toBe(true);
    expect(isStyleAllowed('blockquote', undefined)).toBe(true);
  });

  test('link is structural and is never restrictable', () => {
    expect(isStyleAllowed('link', { allowedStyles: ['p'], disallowedStyles: ['link'] })).toBe(true);
  });
});

describe('normalizeSlateValue', () => {
  test('an untouched value comes back BY REFERENCE', () => {
    const value = [p('hello', el('strong', 'world'))];
    expect(normalizeSlateValue(value, NO_QUOTE, OPTS).value).toBe(value);
  });

  test('blockquote → p, children intact', () => {
    const value = [el('blockquote', 'quoted')];
    const out = normalizeSlateValue(value, NO_QUOTE, OPTS);
    expect(out.value).toEqual([p('quoted')]);
    expect(out.changes).toEqual([
      { path: [0], field: undefined, from: 'blockquote', to: 'p', kind: 'style' },
    ]);
  });

  test('b → strong via the alias map, not to the default block type', () => {
    const value = [p('a ', el('b', 'bold'), ' word')];
    const out = normalizeSlateValue(value, NO_QUOTE, OPTS);
    expect(out.value).toEqual([p('a ', el('strong', 'bold'), ' word')]);
    expect(out.changes[0]).toMatchObject({ from: 'b', to: 'strong', kind: 'style' });
  });

  test('an allowed nested list is left alone', () => {
    const value = [el('ul', el('li', 'one'), el('li', 'two'))];
    expect(normalizeSlateValue(value, NO_QUOTE, OPTS).value).toBe(value);
  });

  test('a denied WRAPPER unwraps, then its children normalize — no text lost', () => {
    const rules = foldSlateStyleRules(null, { allowedStyles: ['p', 'strong'] });
    const value = [el('ul', el('li', 'one'), el('li', 'two'))];
    const out = normalizeSlateValue(value, rules, OPTS);
    expect(out.value).toEqual([p('one'), p('two')]);
  });

  test('a denied leaf mark is stripped, its text kept', () => {
    const rules = foldSlateStyleRules(null, { disallowedMarks: ['highlight'] });
    const value = [{ type: 'p', children: [{ text: 'keep me', highlight: true, bold: true }] }];
    const out = normalizeSlateValue(value, rules, OPTS);
    expect(out.value).toEqual([{ type: 'p', children: [{ text: 'keep me', bold: true }] }]);
    expect(out.changes[0]).toMatchObject({ from: 'highlight', to: null, kind: 'mark' });
  });

  test('a link survives an allow-list that does not mention it', () => {
    const rules = foldSlateStyleRules(null, { allowedStyles: ['p'] });
    const value = [p('see ', { type: 'link', data: { url: '/x' }, children: [{ text: 'x' }] })];
    expect(normalizeSlateValue(value, rules, OPTS).value).toBe(value);
  });

  test('an alias pointing at a DENIED target is a config error, not data loss', () => {
    const rules = foldSlateStyleRules(null, { disallowedStyles: ['blockquote', 'q'] });
    const value = [el('blockquote', 'quoted')];
    const out = normalizeSlateValue(value, rules, { aliases: { blockquote: 'q' }, defaultBlockType: 'p' });
    expect(out.value).toEqual([p('quoted')]);
    expect(out.changes[0]).toMatchObject({ from: 'blockquote', to: 'p', kind: 'style', configError: 'q' });
  });

  test('no rules at all → the value is returned untouched', () => {
    const value = [el('blockquote', 'quoted')];
    expect(normalizeSlateValue(value, null, OPTS).value).toBe(value);
  });
});

describe('depth decides the downgrade', () => {
  // Nothing declared but `b`/`i` denied — the DS spells them `strong`/`em`.
  const rules = { allowedStyles: null, disallowedStyles: ['b', 'blockquote'], allowedMarks: null, disallowedMarks: null };

  test('a TOP-LEVEL node is retyped: it has to stay a block element', () => {
    const out = normalizeSlateValue([el('blockquote', 'quoted')], rules, { defaultBlockType: 'p' });
    expect(out.value).toEqual([p('quoted')]);
  });

  test('an INLINE node unwraps — retyping it to `p` would nest p inside p', () => {
    const value = [p('a ', el('b', 'bold'), ' word')];
    const out = normalizeSlateValue(value, rules, { defaultBlockType: 'p' });
    expect(out.value).toEqual([
      { type: 'p', children: [{ text: 'a ' }, { text: 'bold' }, { text: ' word' }] },
    ]);
  });

  test('an alias still wins over both, at any depth', () => {
    const value = [p(el('b', 'bold'))];
    const out = normalizeSlateValue(value, rules, { aliases: { b: 'strong' }, defaultBlockType: 'p' });
    expect(out.value).toEqual([p(el('strong', 'bold'))]);
  });
});
