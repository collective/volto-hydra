import { JSDOM } from 'jsdom';
import { collectLinkableAnchors } from './linkableAnchors.js';

// hydra-js jest env is 'node' (no global document); build DOM via jsdom directly.
function dom(html) {
  const { window } = new JSDOM(`<!DOCTYPE html><div id="root">${html}</div>`);
  return window.document.getElementById('root');
}

describe('collectLinkableAnchors', () => {
  it('groups anchors under their nearest data-block-uid ancestor', () => {
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
        { id: 'sec-one', name: 'Section One' },
        { id: 'sec-two', name: 'Section Two' },
      ],
      b2: [{ id: 'sec-three', name: 'Section Three' }],
    });
  });

  it('skips elements with no id (no fragment target)', () => {
    const root = dom(`
      <div data-block-uid="b1">
        <h2 data-linkable-id="No Id">x</h2>
        <h2 id="ok" data-linkable-id="Ok">y</h2>
      </div>`);
    expect(collectLinkableAnchors(root)).toEqual({ b1: [{ id: 'ok', name: 'Ok' }] });
  });

  it('skips anchors with no owning block', () => {
    const root = dom(`<h2 id="orphan" data-linkable-id="Orphan">x</h2>`);
    expect(collectLinkableAnchors(root)).toEqual({});
  });

  it('a container block does NOT absorb a child block’s anchors', () => {
    const root = dom(`
      <div data-block-uid="col">
        <div data-block-uid="child">
          <h2 id="deep" data-linkable-id="Deep">z</h2>
        </div>
      </div>`);
    // anchor belongs to nearest ancestor 'child', not 'col'
    expect(collectLinkableAnchors(root)).toEqual({ child: [{ id: 'deep', name: 'Deep' }] });
  });
});
