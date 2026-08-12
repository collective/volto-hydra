import { buildQuerystringSearchBody } from './index.js';

// Unit tests for buildQuerystringSearchBody — the pure builder that turns a
// listing's queryConfig + paging + extraCriteria into the @querystring-search
// request body. Focus: the facet → Plone query-operation mapping, including the
// DATE-RANGE facets (a `facet.<field>.after` / `.before` key → the scalar date
// operations largerThan / lessThan, so a "from" and a "to" facet on the same
// index build a range).

const criterion = (body, i) => body.query.find((q) => q.i === i);
const criteria = (body, i) => body.query.filter((q) => q.i === i);

describe('buildQuerystringSearchBody — core body', () => {
  test('no queryConfig → default relativePath "." + folder-order sort', () => {
    const body = buildQuerystringSearchBody(undefined, {}, {});
    expect(criterion(body, 'path')).toEqual({
      i: 'path',
      o: 'plone.app.querystring.operation.string.relativePath',
      v: '.',
    });
    expect(body.sort_on).toBe('getObjPositionInParent');
    expect(body.sort_order).toBe('ascending');
    expect(body.b_start).toBe(0);
    expect(body.b_size).toBe(10);
    expect(body.metadata_fields).toBe('_all');
  });

  test('a configured query is cloned (not mutated) and gets effective-desc default sort', () => {
    const cfg = {
      query: [
        {
          i: 'portal_type',
          o: 'plone.app.querystring.operation.selection.any',
          v: ['Document'],
        },
      ],
    };
    const body = buildQuerystringSearchBody(cfg, { b_start: 20, b_size: 5 }, {});
    expect(body.query).not.toBe(cfg.query); // cloned
    expect(criterion(body, 'portal_type')).toBeTruthy();
    expect(body.sort_on).toBe('effective');
    expect(body.sort_order).toBe('descending');
    expect(body.b_start).toBe(20);
    expect(body.b_size).toBe(5);
  });

  test('SearchableText → string.contains; sort_on/sort_order override', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      SearchableText: 'dog',
      sort_on: 'sortable_title',
      sort_order: 'ascending',
    });
    expect(criterion(body, 'SearchableText')).toEqual({
      i: 'SearchableText',
      o: 'plone.app.querystring.operation.string.contains',
      v: 'dog',
    });
    expect(body.sort_on).toBe('sortable_title');
    expect(body.sort_order).toBe('ascending');
  });
});

describe('buildQuerystringSearchBody — discrete (value) facets', () => {
  test('facet.<field> array → selection.any with the array', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.portal_type': ['Document', 'News Item'],
    });
    const q = criterion(body, 'portal_type');
    expect(q.o).toBe('plone.app.querystring.operation.selection.any');
    expect(q.v).toEqual(['Document', 'News Item']);
  });

  test('a scalar facet value is wrapped in an array', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.review_state': 'published',
    });
    expect(criterion(body, 'review_state').v).toEqual(['published']);
  });
});

describe('buildQuerystringSearchBody — date-range facets', () => {
  test("'after' → date.largerThan on the bare index, scalar value", () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.created.after': '2024-01-02',
    });
    const q = criterion(body, 'created');
    expect(q.o).toBe('plone.app.querystring.operation.date.largerThan');
    expect(q.v).toBe('2024-01-02');
    // The index is `created`, never `created.after`.
    expect(criterion(body, 'created.after')).toBeUndefined();
  });

  test("'before' → date.lessThan on the bare index, scalar value", () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.created.before': '2024-01-28',
    });
    const q = criterion(body, 'created');
    expect(q.o).toBe('plone.app.querystring.operation.date.lessThan');
    expect(q.v).toBe('2024-01-28');
  });

  test('combined after + before → BOTH date criteria on the same index (a range)', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.created.after': '2024-01-02',
      'facet.created.before': '2024-01-28',
    });
    const cs = criteria(body, 'created');
    expect(cs).toHaveLength(2);
    expect(cs.map((q) => q.o).sort()).toEqual([
      'plone.app.querystring.operation.date.largerThan',
      'plone.app.querystring.operation.date.lessThan',
    ]);
    expect(
      cs.find((q) => q.o.endsWith('largerThan')).v,
    ).toBe('2024-01-02');
    expect(cs.find((q) => q.o.endsWith('lessThan')).v).toBe('2024-01-28');
  });

  test('an array-wrapped date value uses the first element (scalar op)', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.created.after': ['2024-01-02'],
    });
    expect(criterion(body, 'created').v).toBe('2024-01-02');
  });

  test('a date facet and a discrete facet coexist correctly', () => {
    const body = buildQuerystringSearchBody({}, {}, {
      'facet.portal_type': ['Event'],
      'facet.created.after': '2024-01-02',
    });
    expect(criterion(body, 'portal_type').o).toBe(
      'plone.app.querystring.operation.selection.any',
    );
    expect(criterion(body, 'created').o).toBe(
      'plone.app.querystring.operation.date.largerThan',
    );
  });
});
