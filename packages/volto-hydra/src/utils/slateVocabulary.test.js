/**
 * The style vocabulary must not be a transcription.
 *
 * `undefinedSlateTypes` judges a node by asking "does anything define a
 * rendering for this type". Answering that from a list copied out of
 * volto-slate's source is a promise to keep re-copying it: the registry is OPEN
 * (`slate.elements['blockquote'] = …` is how the Blockquote plugin adds itself),
 * so any addon can extend it and the copy silently goes stale — reporting real
 * types as undefined, or missing ones that are.
 *
 * This compares the default against the LIVE registry, with volto-slate's own
 * applyConfig chain run (vitest-setup-hydra.js does that). Drift fails here
 * rather than in someone's content report.
 */
import { describe, test, expect } from 'vitest';
import config from '@plone/volto/registry';
import { DEFAULT_SLATE_VOCABULARY } from '../../../hydra-js/slateStyles.js';

describe('DEFAULT_SLATE_VOCABULARY', () => {
  test('matches the element types volto-slate actually registers', () => {
    const live = Object.keys(config.settings.slate?.elements || {}).sort();
    expect(live.length, 'volto-slate config did not load — this would compare against nothing').toBeGreaterThan(5);
    const missing = live.filter((t) => !DEFAULT_SLATE_VOCABULARY.includes(t));
    const extra = DEFAULT_SLATE_VOCABULARY.filter((t) => !live.includes(t));
    expect(
      { missing, extra },
      'DEFAULT_SLATE_VOCABULARY has drifted from config.settings.slate.elements. ' +
        'Regenerate it from the live registry rather than editing by hand.',
    ).toEqual({ missing: [], extra: [] });
  });
});
