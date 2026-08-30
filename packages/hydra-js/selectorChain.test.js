import { JSDOM } from 'jsdom';
import { Bridge } from './hydra.src.js';

/**
 * One click, one navigation — the older one stops.
 *
 * Clicking a reveal trigger does not select the block there and then: the block
 * it reveals is usually still moving (a tab panel appearing pushes the page
 * around), so the bridge polls until its position is stable and selects after.
 * That wait is patient by design, and an author clicking along a tab bar
 * routinely clicks again while an earlier chain is still counting.
 *
 * The stale chain then selected ITS block. By that point the caret intent
 * recorded for that click had already been spent, so `selectBlock` fell back to
 * the block's FIRST editable field and focused it — the author clicked a tab's
 * label and the caret jumped into the code of the tab they had clicked before.
 * It only bit when the timing lined up, which is what made the codeExample
 * sanity check flaky (4 runs in 10) rather than simply broken.
 *
 * So each navigation is numbered, and a chain that finds itself superseded
 * stops without selecting.
 */
describe('waitForBlockVisibleAndSelect — only the newest navigation selects', () => {
  const bridgeWith = (seq) => {
    const { window } = new JSDOM(
      `<!DOCTYPE html><div data-block-uid="tab-1">code</div>`,
    );
    const selected = [];
    const bridge = Object.assign(Object.create(Bridge.prototype), {
      _selectorNavSeq: seq,
      queryBlockElement: (uid) =>
        window.document.querySelector(`[data-block-uid="${uid}"]`),
      isElementHidden: () => false,
      selectBlock: (el) => selected.push(el.getAttribute('data-block-uid')),
      restoreSelectorCaret: () => {},
    });
    return { bridge, selected };
  };

  test('a superseded chain selects nothing', () => {
    const { bridge, selected } = bridgeWith(2);
    // Chain 1 reaching its stable count long after chain 2 started.
    bridge.waitForBlockVisibleAndSelect('tab-1', 40, 3, 0, 1);
    expect(selected).toEqual([]);
  });

  test('the current chain selects', () => {
    const { bridge, selected } = bridgeWith(2);
    bridge.waitForBlockVisibleAndSelect('tab-1', 40, 3, 0, 2);
    expect(selected).toEqual(['tab-1']);
  });

  test('an untracked call still selects', () => {
    // seq 0 means "no navigation number" — nothing to supersede, so the old
    // behaviour stands for any caller that does not number its chain.
    const { bridge, selected } = bridgeWith(2);
    bridge.waitForBlockVisibleAndSelect('tab-1', 40, 3, 0);
    expect(selected).toEqual(['tab-1']);
  });
});
