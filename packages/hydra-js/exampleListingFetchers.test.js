import {
  relatedItemsFetcher,
  searchShortcutsFetcher,
} from '@volto-hydra/helpers';

const API = 'http://api.test';

function mockContent(fields) {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ '@id': `${API}/page`, ...fields }),
  });
}

describe('relatedItemsFetcher', () => {
  test('returns the current page relation field items, paged', async () => {
    mockContent({
      relatedItems: [
        { '@id': `${API}/a`, title: 'A' },
        { '@id': `${API}/b`, title: 'B' },
        { '@id': `${API}/c`, title: 'C' },
      ],
    });
    const fetcher = relatedItemsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items, total } = await fetcher(
      { relationField: 'relatedItems' },
      { start: 1, size: 1 },
    );
    expect(total).toBe(3);
    expect(items.map((i) => i.title)).toEqual(['B']);
  });

  test('defaults to the relatedItems field', async () => {
    mockContent({ relatedItems: [{ '@id': `${API}/a`, title: 'A' }] });
    const fetcher = relatedItemsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items, total } = await fetcher({}, { start: 0, size: 10 });
    expect(total).toBe(1);
    expect(items).toHaveLength(1);
  });

  test('empty relation field → no items', async () => {
    mockContent({ relatedItems: [] });
    const fetcher = relatedItemsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items, total } = await fetcher({}, { start: 0, size: 10 });
    expect(total).toBe(0);
    expect(items).toEqual([]);
  });
});

describe('searchShortcutsFetcher', () => {
  // Fetchers return RAW result objects; expandListingBlocks maps @id→href by
  // default, so setting @id to the facet URL yields a shortcut link — no
  // special item type or fieldMapping needed.
  test('this-page mode: values from the content field, @id = facet URL', async () => {
    mockContent({ subjects: ['news', 'plone'] });
    const fetcher = searchShortcutsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items, total } = await fetcher(
      { pageField: 'subjects', index: 'Subject', searchUrl: '/search' },
      { start: 0, size: 10 },
    );
    expect(total).toBe(2);
    expect(items).toEqual([
      { '@id': '/search?facet.Subject=news', title: 'news' },
      { '@id': '/search?facet.Subject=plone', title: 'plone' },
    ]);
  });

  test('site-wide mode (no pageField): unique values from the index vocabulary', async () => {
    global.fetch = async (url) => ({
      ok: true,
      json: async () =>
        String(url).includes('Keywords')
          ? { items: [{ token: 'a', title: 'a' }, { token: 'b', title: 'b' }] }
          : {},
    });
    const fetcher = searchShortcutsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items, total } = await fetcher(
      { index: 'Subject', searchUrl: '/search' },
      { start: 0, size: 10 },
    );
    expect(total).toBe(2);
    expect(items.map((i) => i.title)).toEqual(['a', 'b']);
    expect(items[0]['@id']).toBe('/search?facet.Subject=a');
  });

  test('values are URL-encoded in the facet param', async () => {
    mockContent({ subjects: ['a b & c'] });
    const fetcher = searchShortcutsFetcher({ apiUrl: API, contextPath: '/page' });
    const { items } = await fetcher(
      { pageField: 'subjects', index: 'Subject', searchUrl: '/search' },
      { start: 0, size: 10 },
    );
    expect(items[0]['@id']).toBe('/search?facet.Subject=a%20b%20%26%20c');
  });
});
