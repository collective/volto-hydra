import { Bridge } from './hydra.src.js';

/**
 * Revealing a FIELD, not just a block.
 *
 * A block can be drawn in several places at once, with a different field in
 * each. The design system's cookie consent is the clearest case: its message
 * lives in a banner and its category wording in a preferences dialog, both built
 * by design system JavaScript into `<body>`, both hidden until their own trigger
 * is pressed — while the block's own element (its editing bar) sits on screen
 * the whole time.
 *
 * A block-level handle cannot serve that. `data-block-selector="uid"` is one
 * handle and one click, so whichever half it opened, the other half's wording
 * stayed unreachable from the sidebar. The field is what says which half the
 * author means, so a handle can now name one:
 *
 *     data-block-selector="uid#message"
 *
 * `#` rather than `:`, which the grammar already spends on navigation
 * (`uid:direction`, alongside `+1` / `-1`).
 */
describe('selector tokens — a handle may name a field', () => {
  test('a plain uid names that block', () => {
    expect(Bridge.uidFromSelectorToken('block-1')).toBe('block-1');
  });

  test('`uid#field` names the same block', () => {
    // Everything except WHICH handle to click treats the two forms alike: a
    // `data-edit-text` inside either belongs to `block-1`.
    expect(Bridge.uidFromSelectorToken('block-1#message')).toBe('block-1');
  });

  test('navigation tokens name no block', () => {
    expect(Bridge.uidFromSelectorToken('+1')).toBeUndefined();
    expect(Bridge.uidFromSelectorToken('-1')).toBeUndefined();
    expect(Bridge.uidFromSelectorToken('block-1:next')).toBeUndefined();
  });

  test('nothing is not a token', () => {
    expect(Bridge.uidFromSelectorToken('')).toBeUndefined();
    expect(Bridge.uidFromSelectorToken(undefined)).toBeUndefined();
  });
});

describe('revealFieldPlace — asks about the FIELD', () => {
  /** A bridge with only the parts this decision touches. */
  const bridgeWith = ({ fieldElement, hidden }) => {
    const calls = [];
    return {
      calls,
      bridge: Object.assign(Object.create(Bridge.prototype), {
        queryBlockElement: () => ({}),
        getEditableFieldByName: () => fieldElement,
        isElementHidden: () => hidden,
        tryMakeBlockVisible: (uid, depth, field) => {
          calls.push({ uid, depth, field });
          return true;
        },
      }),
    };
  };

  test('a field already on screen reveals nothing', () => {
    const { bridge, calls } = bridgeWith({ fieldElement: {}, hidden: false });
    expect(bridge.revealFieldPlace('block-1', 'message')).toBe(false);
    expect(calls).toEqual([]);
  });

  test('a hidden field is revealed BY NAME', () => {
    const { bridge, calls } = bridgeWith({ fieldElement: {}, hidden: true });
    expect(bridge.revealFieldPlace('block-1', 'message')).toBe(true);
    // The field travels with the request: that is what picks the `uid#message`
    // handle over the block's own.
    expect(calls).toEqual([{ uid: 'block-1', depth: 0, field: 'message' }]);
  });

  test('a field with no element at all is revealed too', () => {
    // The banner before its first build, or a dialog not yet in the DOM: absent
    // is the same as hidden for this purpose.
    const { bridge, calls } = bridgeWith({ fieldElement: null, hidden: false });
    expect(bridge.revealFieldPlace('block-1', 'about_analytics')).toBe(true);
    expect(calls[0].field).toBe('about_analytics');
  });

  test('without a field name there is nothing to reveal', () => {
    // FOCUS_FIELD and REVEAL_FIELD both carry one; a caller that does not is
    // asking about the block, which is `tryMakeBlockVisible`'s own job.
    const { bridge, calls } = bridgeWith({ fieldElement: null, hidden: true });
    expect(bridge.revealFieldPlace('block-1', undefined)).toBe(false);
    expect(bridge.revealFieldPlace(undefined, 'message')).toBe(false);
    expect(calls).toEqual([]);
  });
});
