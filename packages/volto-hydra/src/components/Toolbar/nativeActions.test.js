import { describe, it, expect } from 'vitest';
import { nativeActionsFrom } from './nativeActions';

/**
 * The shape here is Plone's, because that is what the admin's store holds by
 * the time it reaches this: `url` for the destination and `site_actions` for
 * the site category. Both were wrong for a while — the code read `@id` and
 * `site` — and nothing caught it because this file had no tests and the mock
 * had been written to agree with the adapter rather than with Plone.
 */
describe('nativeActionsFrom', () => {
  it('reads the destination from url, as Plone emits it', () => {
    const found = nativeActionsFrom({
      object: [
        { id: 'edit', title: 'Edit in WordPress', url: 'http://cms/edit', native: true },
      ],
    });
    expect(found).toHaveLength(1);
    expect(found[0].url).toBe('http://cms/edit');
  });

  it('finds entries in site_actions', () => {
    const found = nativeActionsFrom({
      site_actions: [
        { id: 'wp-settings', title: 'Site settings', url: 'http://cms/opts', native: true },
      ],
    });
    expect(found.map((a) => a.id)).toEqual(['wp-settings']);
  });

  it('ignores an entry with no destination', () => {
    // Volto's own screens come through as actions too; they are permission
    // flags, not links, and rendering one as a link would send the user
    // nowhere.
    expect(
      nativeActionsFrom({ object: [{ id: 'edit', title: 'Edit', native: true }] }),
    ).toEqual([]);
  });

  it('ignores a destination that is not marked native', () => {
    expect(
      nativeActionsFrom({ object: [{ id: 'view', title: 'View', url: 'http://cms/' }] }),
    ).toEqual([]);
  });
});
