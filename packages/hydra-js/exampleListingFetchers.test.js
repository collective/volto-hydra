import {
  relatedItemsFetcher,
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
