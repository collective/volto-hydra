const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
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

// Helper: GET content
async function getContent(contentPath) {
  const res = await fetch(`${baseUrl}${contentPath}`, {
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
  it('concepts items are in __metadata__.json order, not alphabetical', async () => {
    const data = await getContent('/concepts');

    assert.ok(data.items, 'concepts should have items');
    assert.ok(data.items.length > 0, 'concepts should have children');

    const titles = data.items.map((i) => i.title);
    // Order defined in concepts/__metadata__.json matches README order:
    // architecture, integration-levels, container-blocks, listings, templates, deployment, advanced
    assert.equal(titles[0], 'How Hydra Works');
    assert.equal(titles[1], 'The Bridge, Callbacks & Custom Blocks');
    assert.equal(titles[2], 'Container Blocks');
    assert.equal(titles[3], 'Listings & Dynamic Blocks');
    assert.equal(titles[4], 'Templates & Layouts');
    assert.equal(titles[5], 'Deployment Patterns');
    assert.equal(titles[6], 'Advanced');
  });

  it('concepts navigation children match __metadata__.json order', async () => {
    const data = await getContent('/concepts');

    const nav = data['@components']?.navigation;
    const conceptsNav = nav.items?.find(
      (i) => new URL(i['@id']).pathname === '/concepts',
    );
    assert.ok(conceptsNav, 'should have concepts in navigation');

    const titles = conceptsNav.items.map((i) => i.title);
    assert.equal(titles[0], 'How Hydra Works');
    assert.equal(titles[6], 'Advanced');
  });

  it('getObjPositionInParent uses __metadata__.json for concepts children', async () => {
    const data = await querystringSearch('/concepts', {
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

    const titles = data.items.map((i) => i.title);
    assert.equal(titles[0], 'How Hydra Works');
    assert.equal(titles[titles.length - 1], 'Advanced');
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
});
