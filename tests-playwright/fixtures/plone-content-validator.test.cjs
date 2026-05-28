const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { validate, checkIntegrity } = require('./plone-content-validator.cjs');

/**
 * Build a minimal plone.exportimport content tree under a temp dir.
 * Returns the content dir path. Caller is responsible for cleanup.
 */
function buildFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plone-content-test-'));
  const contentDir = path.join(root, 'content');
  fs.mkdirSync(contentDir);
  // Required sibling files for validate()
  for (const sib of ['discussions.json', 'portlets.json', 'principals.json', 'redirects.json']) {
    fs.writeFileSync(path.join(root, sib), '{}');
  }

  const dataFiles = overrides.dataFiles || ['plone_site_root/data.json', 'page-a/data.json'];
  const blobFiles = overrides.blobFiles || [];
  // Default local_roles covers the default fixture's two UIDs. Tests that
  // add new content can still override _data_files_ here, but they're
  // expected to handle their own local_roles via metadata overrides
  // (or accept the UID-coverage error they're testing for).
  const localRoles = overrides.localRoles || {
    rootuid1234567: { local_roles: { admin: ['Owner'] } },
    pageauid1234567: { local_roles: { admin: ['Owner'] } },
  };
  fs.writeFileSync(
    path.join(contentDir, '__metadata__.json'),
    JSON.stringify({
      _data_files_: dataFiles,
      _blob_files_: blobFiles,
      local_roles: localRoles,
    }, null, 2),
  );

  const rootItem = {
    '@id': '/',
    '@type': 'Plone Site',
    id: 'plone_site_root',
    UID: 'rootuid1234567',
    ...overrides.rootItem,
  };
  fs.mkdirSync(path.join(contentDir, 'plone_site_root'));
  fs.writeFileSync(path.join(contentDir, 'plone_site_root', 'data.json'), JSON.stringify(rootItem));

  const pageA = overrides.pageA || {
    '@id': '/page-a',
    '@type': 'Document',
    id: 'page-a',
    UID: 'pageauid1234567',
    parent: { '@id': '/' },
  };
  fs.mkdirSync(path.join(contentDir, 'page-a'));
  fs.writeFileSync(path.join(contentDir, 'page-a', 'data.json'), JSON.stringify(pageA));

  return { root, contentDir };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

describe('plone-content-validator validate()', () => {
  it('returns no errors on a clean fixture', () => {
    const { root, contentDir } = buildFixture();
    const r = validate(contentDir);
    cleanup(root);
    assert.deepEqual(r.errors, []);
    assert.equal(r.stats.dataFiles, 2);
  });

  it('reports missing parent container', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: ['plone_site_root/data.json', 'section/child/data.json'],
    });
    fs.mkdirSync(path.join(contentDir, 'section'), { recursive: true });
    fs.mkdirSync(path.join(contentDir, 'section', 'child'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, 'section', 'child', 'data.json'),
      JSON.stringify({ '@id': '/section/child', '@type': 'Document', id: 'child', UID: 'x'.repeat(15), parent: {} }),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('parent container missing')), r.errors.join('\n'));
  });

  it('reports Image with remote URL instead of blob_path', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: ['plone_site_root/data.json', 'my-image/data.json'],
      pageA: {
        '@id': '/my-image',
        '@type': 'Image',
        id: 'my-image',
        UID: 'img1234567890',
        parent: { '@id': '/' },
        image: { download: 'https://example.com/remote.jpg' },
      },
    });
    // buildFixture wrote page-a, but we also need my-image at the path
    fs.mkdirSync(path.join(contentDir, 'my-image'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, 'my-image', 'data.json'),
      JSON.stringify({
        '@id': '/my-image', '@type': 'Image', id: 'my-image',
        UID: 'img1234567890', parent: {}, image: { download: 'https://example.com/remote.jpg' },
      }),
    );
    // Remove page-a so the only Image we check is my-image
    fs.rmSync(path.join(contentDir, 'page-a'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, '__metadata__.json'),
      JSON.stringify({ _data_files_: ['plone_site_root/data.json', 'my-image/data.json'], _blob_files_: [] }, null, 2),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('remote URL')), r.errors.join('\n'));
  });

  it('reports child before parent in _data_files_ ordering', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: [
        'plone_site_root/data.json',
        'section/child/data.json',  // child first
        'section/data.json',        // parent second (wrong order)
      ],
    });
    for (const rel of ['section', 'section/child']) {
      fs.mkdirSync(path.join(contentDir, rel), { recursive: true });
      fs.writeFileSync(
        path.join(contentDir, rel, 'data.json'),
        JSON.stringify({ '@id': '/' + rel, '@type': 'Document', id: rel.split('/').pop(), UID: rel + '1234567', parent: {} }),
      );
    }
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('appears before its parent')),
      r.errors.join('\n'),
    );
  });

  it('reports id starting with underscore', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: ['plone_site_root/data.json', '_underscore/data.json'],
    });
    fs.mkdirSync(path.join(contentDir, '_underscore'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, '_underscore', 'data.json'),
      JSON.stringify({
        '@id': '/_underscore', '@type': 'Document',
        id: '_underscore', UID: 'undr1234567890', parent: {},
      }),
    );
    fs.rmSync(path.join(contentDir, 'page-a'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, '__metadata__.json'),
      JSON.stringify({
        _data_files_: ['plone_site_root/data.json', '_underscore/data.json'],
        _blob_files_: [],
      }, null, 2),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('starts with underscore')),
      r.errors.join('\n'),
    );
  });

  it("reports top-level 'content' key in __metadata__.json", () => {
    const { root, contentDir } = buildFixture();
    fs.writeFileSync(
      path.join(contentDir, '__metadata__.json'),
      JSON.stringify({
        _data_files_: ['plone_site_root/data.json', 'page-a/data.json'],
        _blob_files_: [],
        // Wrong key — Plone import will reject as unknown kwarg.
        content: { 'pageauid1234567': { local_roles: { admin: ['Owner'] } } },
      }, null, 2),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes("'content' key")),
      r.errors.join('\n'),
    );
  });

  it('reports UID missing from local_roles', () => {
    const { root, contentDir } = buildFixture({
      // Empty local_roles → page-a's UID should be flagged.
      localRoles: {},
    });
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('local_roles') && e.includes('pageauid1234567')),
      r.errors.join('\n'),
    );
  });

  it('catches underscore id in NESTED data.json (not just direct children)', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: [
        'plone_site_root/data.json',
        'page-a/data.json',
        'page-a/_bad/data.json',
      ],
    });
    fs.mkdirSync(path.join(contentDir, 'page-a', '_bad'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, 'page-a', '_bad', 'data.json'),
      JSON.stringify({
        '@id': '/page-a/_bad', '@type': 'Document',
        id: '_bad', UID: 'badbadbadbad12', parent: {},
      }),
    );
    fs.writeFileSync(
      path.join(contentDir, '__metadata__.json'),
      JSON.stringify({
        _data_files_: [
          'plone_site_root/data.json',
          'page-a/data.json',
          'page-a/_bad/data.json',
        ],
        _blob_files_: [],
      }, null, 2),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('_bad') && e.includes('starts with underscore')),
      r.errors.join('\n'),
    );
  });
});

describe('plone-content-validator checkIntegrity()', () => {
  it('flags broken resolveuid refs', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        // Reference a UID that doesn't exist in the tree
        body: 'See <a href="resolveuid/deadbeefdeadbeef">this</a>',
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('broken resolveuid')), r.errors.join('\n'));
    assert.equal(r.stats.resolveuidBroken, 1);
  });

  it('flags broken internal hrefs in block teasers', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'teaser-1': {
            '@type': 'teaser',
            href: [{ '@id': '/does-not-exist' }],
          },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.warnings.some((w) => w.includes('/does-not-exist')), r.warnings.join('\n'));
  });

  it('resolves valid resolveuid refs', () => {
    // UID must be hex ≥ 10 chars to match the /resolveuid/[a-f0-9]{10,}/ regex
    const uid = 'abcdef1234567890';
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: uid,
        parent: { '@id': '/' },
        body: `Self-ref: <a href="resolveuid/${uid}">here</a>`,
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.equal(r.stats.resolveuidBroken, 0);
    assert.equal(r.stats.resolveuidOk, 1);
  });
});
