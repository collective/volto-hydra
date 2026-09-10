import { test, expect } from '@playwright/test';
import { URLS } from '../ports';

/**
 * The menu follows the editing session.
 *
 * `/@navigation` builds the site menu from content. An editing session's saves
 * live in that session's store, so the menu it serves has to read them — the
 * label on a menu item IS the page's title, so renaming a page renames its
 * entry, and ticking exclude_from_nav removes it.
 *
 * There was no test for any of this, which is how it came to be broken in a way
 * that looked fine: `getNavigationItems` declared three parameters while both
 * call sites passed a fourth (the session id), so JavaScript dropped it and
 * every item came off disk. The plumbing read as though the menu were
 * session-aware and nothing about it was. A demo of "the pages ARE the menu"
 * renamed a page, saved, and watched the menu not change.
 *
 * Isolation is the other half of the contract and is asserted here too: one
 * session's unsaved-to-the-world rename must not leak into anybody else's menu,
 * or parallel tests would see each other's edits.
 */

const MOCK_API = URLS.mockApi;
const PAGE = '/++api++/test-page';

/** The titles the menu offers at the top level. */
async function menuTitles(request: any, token?: string): Promise<string[]> {
  const res = await request.get(`${MOCK_API}/++api++/@navigation`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(res.ok(), 'the navigation endpoint answers').toBeTruthy();
  const body = await res.json();
  return (body.items ?? []).map((i: any) => i.title);
}

test.describe('navigation follows the session', () => {
  test('a renamed page is renamed in the menu — for that session only', async ({ request }) => {
    const token = `navtest-rename-${Date.now()}`;
    const renamed = `Renamed ${token}`;

    const before = await menuTitles(request, token);
    expect(before.length, 'the menu has items to begin with').toBeGreaterThan(0);
    expect(before).not.toContain(renamed);
    const original = before[0];

    // Rename whatever the menu lists first, in this session.
    const target = await request.get(`${MOCK_API}/++api++/@navigation`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const path = new URL((await target.json()).items[0]['@id']).pathname;
    const patch = await request.patch(`${MOCK_API}/++api++${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: renamed },
    });
    expect(patch.status(), 'the rename saves').toBeLessThan(300);

    // The label IS the title, so the menu follows.
    expect(
      await menuTitles(request, token),
      'the session that renamed the page sees the new label',
    ).toContain(renamed);

    // …and nobody else's menu moved.
    const others = await menuTitles(request);
    expect(others, "another session keeps the page's real title").toContain(original);
    expect(others, "another session does not see this session's rename").not.toContain(renamed);
  });

  test('a page excluded from navigation leaves the menu', async ({ request }) => {
    const token = `navtest-exclude-${Date.now()}`;

    const before = await menuTitles(request, token);
    const target = await request.get(`${MOCK_API}/++api++/@navigation`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const first = (await target.json()).items[0];
    const path = new URL(first['@id']).pathname;

    await request.patch(`${MOCK_API}/++api++${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { exclude_from_nav: true },
    });

    const after = await menuTitles(request, token);
    expect(after, 'the excluded page is gone from the menu').not.toContain(first.title);
    expect(after.length, 'only that one page left').toBe(before.length - 1);
  });
});
