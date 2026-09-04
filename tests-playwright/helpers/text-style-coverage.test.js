/**
 * The aggregation contract. Two findings, kept apart on purpose:
 *   - a style that never rendered anywhere
 *   - a style that rendered, but looks exactly like body text
 * Both are "the author picked a style and got nothing", but they have different
 * causes and different fixes.
 */
import {
  slateStyles,
  recordTextStyles,
  stylesNeverRendered,
  stylesRenderingAsPlainText,
  stylesSeenInContent,
  resetTextStyleCoverage,
} from './text-style-coverage.ts';
import * as fs from 'fs';
import * as path from 'path';

const el = (type, ...kids) => ({
  type,
  children: kids.map((k) => (typeof k === 'string' ? { text: k } : k)),
});

beforeEach(() => resetTextStyleCoverage());

describe('slateStyles', () => {
  test('finds every element type at any depth, with its text', () => {
    expect([...slateStyles([el('p', 'a ', el('strong', 'bold'), ' b')])]).toEqual([
      ['p', 'a bold b'],
      ['strong', 'bold'],
    ]);
  });

  test("a design system's own styles count too", () => {
    // Volto's StyleMenu writes the chosen definition's cssClass into styleName.
    // Those are what a DS actually offers an author beyond h2/bold, so they are
    // covered by the same machinery — prefixed, so `.lead` can never be confused
    // with an element type named `lead`.
    const value = [{ type: 'p', styleName: 'lead dropcap', children: [{ text: 'Intro' }] }];
    expect([...slateStyles(value)]).toEqual([
      ['p', 'Intro'],
      ['.lead', 'Intro'],
      ['.dropcap', 'Intro'],
    ]);
  });

  test('skips a style with no text — there is nothing to locate in the DOM', () => {
    expect([...slateStyles([el('p', el('image'))])]).toEqual([]);
  });
});

describe('did it render at all', () => {
  test('a style with a signature is covered', () => {
    recordTextStyles('slate', '/a', [el('h2', 'Hello')], { h2: { sig: 'H2|700|24px', node: 1 } }, { sig: 'P|400|16px', node: 0 });
    expect(stylesNeverRendered()).toEqual([]);
  });

  test('a style the page never rendered is reported, with where to look', () => {
    recordTextStyles('slate', '/a', [el('h4', 'Invisible')], { h4: null }, { sig: 'P|400|16px', node: 0 });
    expect(stylesNeverRendered()).toEqual([
      { style: 'h4', blockType: 'slate', text: 'Invisible', pagePath: '/a' },
    ]);
  });

  test('ONE rendering example is enough — a later missing one does not undo it', () => {
    recordTextStyles('slate', '/a', [el('h3', 'Shown')], { h3: { sig: 'H3|700|20px', node: 1 } });
    recordTextStyles('slate', '/b', [el('h3', 'Hidden here')], { h3: null });
    expect(stylesNeverRendered()).toEqual([]);
  });
});

describe('did it render DIFFERENTLY', () => {
  test('a style that looks exactly like body text is a finding', () => {
    recordTextStyles('slate', '/a', [el('h4', 'Subtitle')], { h4: { sig: 'P|400|16px', node: 1 } }, { sig: 'P|400|16px', node: 0 });
    expect(stylesRenderingAsPlainText().map((s) => s.style)).toEqual(['h4']);
  });

  test('a style that differs is fine, whatever markup it used', () => {
    // A styled span, not a <strong>. The check must not care.
    recordTextStyles('slate', '/a', [el('strong', 'bold')], { strong: { sig: 'SPAN|700|16px', node: 1 } }, { sig: 'P|400|16px', node: 0 });
    expect(stylesRenderingAsPlainText()).toEqual([]);
  });

  test('the default block type is body text — never a finding', () => {
    recordTextStyles('slate', '/a', [el('p', 'words')], { p: { sig: 'P|400|16px', node: 1 } }, { sig: 'P|400|16px', node: 0 });
    expect(stylesRenderingAsPlainText()).toEqual([]);
  });

  test('with no baseline captured, nothing is claimed', () => {
    recordTextStyles('slate', '/a', [el('h4', 'Subtitle')], { h4: { sig: 'P|400|16px', node: 1 } }, null);
    expect(stylesRenderingAsPlainText()).toEqual([]);
  });

  test('a fully-bold paragraph is ONE element — not evidence that bold is invisible', () => {
    // p and strong locate the same node: the paragraph IS the bold run. Reading
    // that as "bold looks like body text" is what the first version did.
    const same = { sig: 'P|700|16px', node: 3 };
    recordTextStyles('slate', '/a', [el('p', el('strong', 'All bold'))], { p: same, strong: same }, same);
    expect(stylesRenderingAsPlainText()).toEqual([]);
  });

  test('each example is judged against ITS OWN body text', () => {
    // Two pages whose body text renders differently. h4 matching the body text
    // of the page it is ON is the finding — the comparison is never against
    // some other page's baseline.
    recordTextStyles('slate', '/a', [el('p', 'x')], { p: { sig: 'P|400|16px', node: 1 } }, { sig: 'P|400|16px', node: 1 });
    recordTextStyles('slate', '/b', [el('h4', 'y')], { h4: { sig: 'DIV|400|15px', node: 2 } }, { sig: 'DIV|400|15px', node: 9 });
    expect(stylesRenderingAsPlainText().map((s) => s.style)).toEqual(['h4']);
  });
});

test('reports the vocabulary actually present in the content', () => {
  recordTextStyles('slate', '/a', [el('p', 'x'), el('h2', 'y')], {});
  expect(stylesSeenInContent()).toEqual(['h2', 'p']);
});

describe('merging across workers', () => {
  // Playwright runs each worker in its OWN process, so module state alone makes
  // the answer depend on which worker happens to run the aggregate — the check
  // passed on one run and reported "0 styles measured" on the next from
  // identical content. Every worker shares what it saw; the aggregate merges.
  const dir = path.resolve(process.cwd(), '.text-style-coverage');

  const asAnotherWorker = (payload) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'other-worker.json'), JSON.stringify(payload));
  };

  test("another worker's coverage counts", () => {
    // This worker saw h2 but never rendered it; another worker did.
    recordTextStyles('slate', '/a', [el('h2', 'Heading')], { h2: null }, { sig: 'P|400|16px', node: 0 });
    expect(stylesNeverRendered().map((s) => s.style)).toEqual(['h2']);

    asAnotherWorker({ seen: [], signatures: [['h2', 'H2|700|24px']], baselines: [] });
    expect(stylesNeverRendered()).toEqual([]);
  });

  test("another worker's styles are visible to the fail-closed check", () => {
    asAnotherWorker({
      seen: [['h3', { blockType: 'slate', text: 'x', pagePath: '/b' }]],
      signatures: [],
      baselines: [],
    });
    expect(stylesSeenInContent()).toEqual(['h3']);
  });

  test('a half-written file from a live worker is skipped, not fatal', () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'partial.json'), '{"seen": [["h4",');
    recordTextStyles('slate', '/a', [el('p', 'x')], { p: { sig: 'P|400|16px', node: 1 } }, { sig: 'P|400|16px', node: 0 });
    expect(() => stylesSeenInContent()).not.toThrow();
    expect(stylesSeenInContent()).toEqual(['p']);
  });
});
