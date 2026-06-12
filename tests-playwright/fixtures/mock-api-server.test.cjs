const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./mock-api-server.cjs');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper: POST to @querystring-search
async function querystringSearch(contextPath, body) {
  const res = await fetch(`${baseUrl}${contextPath}/@querystring-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200);
  return res.json();
}

// Helper: GET content. Expands navigation so tests can assert on
// @components.navigation — a plain GET returns it as an unexpanded
// {@id} stub (nav.items would be undefined).
async function getContent(contentPath) {
  const sep = contentPath.includes('?') ? '&' : '?';
  const res = await fetch(`${baseUrl}${contentPath}${sep}expand=navigation`, {
    headers: { Accept: 'application/json' },
  });
  assert.equal(res.status, 200);
  return res.json();
}

describe('@querystring-search', () => {
  it('relativePath "." returns children of context path', async () => {
    const data = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      b_start: 0,
      b_size: 50,
    });

    assert.ok(data.items_total > 0, 'should return items');
    // All items should be under /_test_data/
    for (const item of data.items) {
      const itemPath = new URL(item['@id']).pathname;
      assert.ok(
        itemPath.startsWith('/_test_data/'),
        `${itemPath} should be under /_test_data/`,
      );
    }
    // Should include known children
    const ids = data.items.map((i) => i.id);
    assert.ok(ids.includes('test-page'), 'should include test-page');
    assert.ok(ids.includes('another-page'), 'should include another-page');
  });

  it('getObjPositionInParent sort returns folder order (ascending)', async () => {
    const data = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      sort_on: 'getObjPositionInParent',
      sort_order: 'ascending',
      b_start: 0,
      b_size: 50,
    });

    // Filter to direct children only (not nested template items etc.)
    const directChildren = data.items.filter((item) => {
      const itemPath = new URL(item['@id']).pathname;
      const rel = itemPath.replace('/_test_data/', '');
      return rel.length > 0 && !rel.includes('/');
    });

    assert.ok(directChildren.length > 0, 'should have direct children');

    // Filesystem scan order is alphabetical by directory name
    const ids = directChildren.map((i) => i.id);
    for (let k = 1; k < ids.length; k++) {
      assert.ok(
        ids[k - 1] <= ids[k],
        `Expected ascending folder order: "${ids[k - 1]}" should be <= "${ids[k]}"`,
      );
    }
  });

  it('getObjPositionInParent descending reverses the order', async () => {
    const asc = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      sort_on: 'getObjPositionInParent',
      sort_order: 'ascending',
      b_start: 0,
      b_size: 50,
    });
    const desc = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      sort_on: 'getObjPositionInParent',
      sort_order: 'descending',
      b_start: 0,
      b_size: 50,
    });

    const ascIds = asc.items.map((i) => i.id);
    const descIds = desc.items.map((i) => i.id);
    assert.deepStrictEqual(descIds, ascIds.toReversed());
  });

  it('absolutePath filter returns items under that path', async () => {
    const data = await querystringSearch('/', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.absolutePath',
          v: '/_test_data',
        },
      ],
      b_start: 0,
      b_size: 50,
    });

    assert.ok(data.items_total > 0, 'should return items');
    for (const item of data.items) {
      const itemPath = new URL(item['@id']).pathname;
      assert.ok(
        itemPath.startsWith('/_test_data'),
        `${itemPath} should start with /_test_data`,
      );
    }
  });

  it('empty query returns all content', async () => {
    const data = await querystringSearch('/_test_data', {
      query: [],
      b_start: 0,
      b_size: 5,
    });

    assert.ok(data.items_total > 0, 'should return items with empty query');
    assert.equal(data.items.length, 5, 'b_size should limit results');
  });

  it('pagination works', async () => {
    const page1 = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      b_start: 0,
      b_size: 3,
    });
    const page2 = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      b_start: 3,
      b_size: 3,
    });

    assert.equal(page1.items.length, 3);
    assert.equal(page2.items.length, 3);
    // Pages should not overlap
    const page1Ids = page1.items.map((i) => i.id);
    const page2Ids = page2.items.map((i) => i.id);
    for (const id of page1Ids) {
      assert.ok(!page2Ids.includes(id), `${id} should not appear in both pages`);
    }
  });
});

describe('folder ordering (__metadata__.json)', () => {
  // The docs topic pages live under /docs (the docs-sphinx tree). Their
  // folder order is defined by docs/__metadata__.json `ordering` (UID →
  // position). Derive the expected title order from that same file so the
  // assertion tracks the content tree instead of hard-coding a page list
  // that drifts as the docs are restructured.
  function expectedDocsOrder() {
    const docsDir = path.join(
      __dirname, '../../docs/content/content/content/docs',
    );
    const meta = JSON.parse(
      fs.readFileSync(path.join(docsDir, '__metadata__.json'), 'utf8'),
    );
    const ordering = meta.ordering || {};
    const uidTitle = {};
    for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dj = path.join(docsDir, entry.name, 'data.json');
      if (!fs.existsSync(dj)) continue;
      const d = JSON.parse(fs.readFileSync(dj, 'utf8'));
      if (d.UID) uidTitle[d.UID] = d.title;
    }
    return Object.entries(ordering)
      .sort((a, b) => a[1] - b[1])
      .map(([uid]) => uidTitle[uid])
      .filter(Boolean);
  }

  it('docs children are in __metadata__.json order, not alphabetical', async () => {
    const data = await getContent('/docs');
    assert.ok(data.items && data.items.length > 0, 'docs should have children');

    const expected = expectedDocsOrder();
    assert.ok(expected.length > 0, 'metadata ordering should resolve to titles');

    // The ordered pages appear first, in metadata order. Children with no
    // `ordering` entry (e.g. examples) follow — slice to the ordered prefix.
    const titles = data.items.map((i) => i.title);
    assert.deepEqual(titles.slice(0, expected.length), expected);
    // Sanity: not alphabetical — by id, 'advanced' would otherwise sort first.
    assert.notEqual(titles[0], 'Advanced');
  });

  it('docs navigation children match __metadata__.json order', async () => {
    const data = await getContent('/docs');

    const nav = data['@components']?.navigation;
    const docsNav = nav.items?.find(
      (i) => new URL(i['@id']).pathname === '/docs',
    );
    assert.ok(docsNav, 'should have docs in navigation');

    const expected = expectedDocsOrder();
    const titles = docsNav.items.map((i) => i.title);
    assert.deepEqual(titles.slice(0, expected.length), expected);
  });

  it('getObjPositionInParent uses __metadata__.json for docs children', async () => {
    // absolutePath `/docs::1` — strict children of /docs only (depth 1),
    // so the position sort isn't diluted by deeper descendants.
    const data = await querystringSearch('/', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.absolutePath',
          v: '/docs::1',
        },
      ],
      sort_on: 'getObjPositionInParent',
      sort_order: 'ascending',
      b_start: 0,
      b_size: 50,
    });

    const expected = expectedDocsOrder();
    const titles = data.items.map((i) => i.title);
    assert.deepEqual(titles.slice(0, expected.length), expected);
  });
});

describe('navigation', () => {
  it('returns children in folder order', async () => {
    const data = await getContent('/_test_data');

    const nav = data['@components']?.navigation;
    assert.ok(nav, 'should have navigation component');

    // _test_data itself should be in the nav tree
    const testDataNav = nav.items?.find(
      (i) => new URL(i['@id']).pathname === '/_test_data',
    );
    assert.ok(testDataNav, 'should have _test_data in navigation');
    assert.ok(testDataNav.items?.length > 0, 'should have children');

    // Children should be in alphabetical directory order
    const childIds = testDataNav.items.map(
      (i) => new URL(i['@id']).pathname.split('/').pop(),
    );
    for (let k = 1; k < childIds.length; k++) {
      assert.ok(
        childIds[k - 1] <= childIds[k],
        `Expected folder order: "${childIds[k - 1]}" should be <= "${childIds[k]}"`,
      );
    }
  });

  it('excludes Image type items from navigation', async () => {
    const data = await getContent('/_test_data');

    const nav = data['@components']?.navigation;
    const testDataNav = nav.items?.find(
      (i) => new URL(i['@id']).pathname === '/_test_data',
    );

    // _test_data contains test-image-1 and test-image-2 (type: Image)
    // These should be excluded from navigation
    const childIds = testDataNav.items.map(
      (i) => new URL(i['@id']).pathname.split('/').pop(),
    );
    assert.ok(!childIds.includes('test-image-1'), 'should exclude Image items');
    assert.ok(!childIds.includes('test-image-2'), 'should exclude Image items');
  });

  it('portal_type selection.none excludes the listed types', async () => {
    const data = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
        {
          i: 'portal_type',
          o: 'plone.app.querystring.operation.selection.none',
          v: ['Image', 'File'],
        },
      ],
      b_start: 0,
      b_size: 50,
    });

    const ids = data.items.map((i) => i.id);
    assert.ok(ids.length > 0, 'should still return non-Image items');
    assert.ok(!ids.includes('test-image-1'), 'selection.none must drop Images');
    assert.ok(!ids.includes('test-image-2'), 'selection.none must drop Images');
    for (const item of data.items) {
      assert.notEqual(item['@type'], 'Image', `${item.id} should not be an Image`);
    }
  });

  it('portal_type selection.any keeps only the listed types', async () => {
    const data = await querystringSearch('/_test_data', {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
        {
          i: 'portal_type',
          o: 'plone.app.querystring.operation.selection.any',
          v: ['Image'],
        },
      ],
      b_start: 0,
      b_size: 50,
    });

    const ids = data.items.map((i) => i.id);
    assert.ok(ids.includes('test-image-1'), 'selection.any must keep Images');
    for (const item of data.items) {
      assert.equal(item['@type'], 'Image', `${item.id} should be an Image`);
    }
  });
});

describe('@site', () => {
  it('returns plone.default_language so Volto 19 SSR can resolve initialLang', async () => {
    // Volto 19's server.jsx reads
    // `state.site.data['plone.default_language']` as the middle fallback in
    // its language-resolution chain. If our mock omits this key, the
    // SSR's `toReactIntlLang(undefined)` crashes with a 500.
    // (Volto 18 used `config.settings.defaultLanguage` here instead — the
    // contract moved from frontend config to backend response.)
    const res = await fetch(`${baseUrl}/@site`, { headers: { Accept: 'application/json' } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data['plone.default_language'], 'string', '@site must include plone.default_language as a string');
    assert.ok(Array.isArray(data['plone.available_languages']), '@site must include plone.available_languages as an array (read by ManageTranslations)');
  });
});
