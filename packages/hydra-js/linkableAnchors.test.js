import { JSDOM } from 'jsdom';
import {
  buildAnchorTree,
  collectLinkableAnchors,
  collectLinkableAnchorsList,
} from './linkableAnchors.js';

// hydra-js jest env is 'node' (no global document); build DOM via jsdom directly.
function dom(html) {
  const { window } = new JSDOM(`<!DOCTYPE html><div id="root">${html}</div>`);
  return window.document.getElementById('root');
}

describe('collectLinkableAnchors', () => {
  it('groups anchors under their nearest data-block-uid ancestor, with levels inferred from the heading tag', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <h2 id="sec-one" data-linkable-id="Section One">One</h2>
        <p>text</p>
        <h3 id="sec-two" data-linkable-id="Section Two">Two</h3>
      </div>
      <div data-block-uid="b2">
        <h2 id="sec-three" data-linkable-id="Section Three">Three</h2>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({
      b1: [
        { id: 'sec-one', name: 'Section One', level: 2 },
        { id: 'sec-two', name: 'Section Two', level: 3 },
      ],
      b2: [{ id: 'sec-three', name: 'Section Three', level: 2 }],
    });
  });

  it('reads an explicit data-linkable-h{n} level (independent of the tag)', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <div id="s1" data-linkable-h2="Section">not a heading tag</div>
        <h4 id="s2" data-linkable-h2="Overridden">h4 tag, forced level 2</h4>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({
      b1: [
        { id: 's1', name: 'Section', level: 2 },
        { id: 's2', name: 'Overridden', level: 2 },
      ],
    });
  });

  it('treats a data-linkable-id on a non-heading element as a level-less leaf', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <figure id="fig-1" data-linkable-id="Figure 1">img</figure>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({
      b1: [{ id: 'fig-1', name: 'Figure 1', level: null }],
    });
  });

  it('skips elements with no id (no fragment target)', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <h2 data-linkable-id="No Id">x</h2>
        <h2 id="ok" data-linkable-id="Ok">y</h2>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({
      b1: [{ id: 'ok', name: 'Ok', level: 2 }],
    });
  });

  it('skips anchors with no owning block', () => {
    const root = dom(`<h2 id="orphan" data-linkable-id="Orphan">x</h2>`);
    expect(collectLinkableAnchors(root)).toEqual({});
  });

  it('skips anchors inside readonly/forced-template blocks (template owns them)', () => {
    const root = dom(`
      <div data-block-uid="tmpl" data-block-readonly>
        <h2 id="tmpl-head" data-linkable-id="Template Head">fixed</h2>
      </div>
      <div data-block-uid="editable">
        <h2 id="mine" data-linkable-id="Mine">editable</h2>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({
      editable: [{ id: 'mine', name: 'Mine', level: 2 }],
    });
  });

  it('a container block does NOT absorb a child block’s anchors', () => {
    const root = dom(`
      <div data-block-uid="col">
        <div data-block-uid="child">
          <h2 id="deep" data-linkable-id="Deep">z</h2>
        </div>
      </div>`);
    // anchor belongs to nearest ancestor 'child', not 'col'
    expect(collectLinkableAnchors(root)).toEqual({
      child: [{ id: 'deep', name: 'Deep', level: 2 }],
    });
  });
});

describe('collectLinkableAnchorsList', () => {
  it('returns a flat, document-ordered list with level + owning blockUid', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <h2 id="one" data-linkable-id="One">1</h2>
        <h3 id="two" data-linkable-h3="Two">2</h3>
      </div>
      <div data-block-uid="b2">
        <figure id="fig" data-linkable-id="Fig">img</figure>
      </div>`);
    expect(collectLinkableAnchorsList(root)).toEqual([
      { id: 'one', name: 'One', level: 2, blockUid: 'b1' },
      { id: 'two', name: 'Two', level: 3, blockUid: 'b1' },
      { id: 'fig', name: 'Fig', level: null, blockUid: 'b2' },
    ]);
  });

  it('INCLUDES anchors in read-only blocks (unlike the persist harvest)', () => {
    const root = dom(`
      <div data-block-uid="tmpl" data-block-readonly>
        <h2 id="section" data-linkable-id="Section">fixed template heading</h2>
      </div>`);
    // collectLinkableAnchors would drop this; the display list keeps it.
    expect(collectLinkableAnchors(root)).toEqual({});
    expect(collectLinkableAnchorsList(root)).toEqual([
      { id: 'section', name: 'Section', level: 2, blockUid: 'tmpl' },
    ]);
  });

  it('skips elements with no id', () => {
    const root = dom(
      `<div data-block-uid="b1"><h2 data-linkable-id="No Id">x</h2></div>`,
    );
    expect(collectLinkableAnchorsList(root)).toEqual([]);
  });
});

describe('buildAnchorTree', () => {
  const leaf = (id, level) => ({ id, name: id, level });

  it('nests deeper levels under the nearest preceding shallower one', () => {
    const tree = buildAnchorTree([
      leaf('a', 2),
      leaf('a1', 3),
      leaf('a2', 3),
      leaf('b', 2),
      leaf('b1', 3),
    ]);
    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['a1', 'a2']);
    expect(tree[1].children.map((n) => n.id)).toEqual(['b1']);
  });

  it('pops back up when a shallower level follows a deeper one', () => {
    const tree = buildAnchorTree([leaf('a', 2), leaf('a1', 3), leaf('c', 2)]);
    expect(tree.map((n) => n.id)).toEqual(['a', 'c']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['a1']);
    expect(tree[1].children).toEqual([]);
  });

  it('attaches level-less leaves to the current parent without opening a depth', () => {
    const tree = buildAnchorTree([leaf('a', 2), leaf('fig', null), leaf('b', 2)]);
    // The leaf sits under 'a'; 'b' is still a sibling of 'a' at the top level.
    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['fig']);
  });

  it('produces a flat list when no levels are given', () => {
    const tree = buildAnchorTree([leaf('a', null), leaf('b', null)]);
    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it('handles empty / nullish input', () => {
    expect(buildAnchorTree([])).toEqual([]);
    expect(buildAnchorTree(undefined)).toEqual([]);
  });
});
