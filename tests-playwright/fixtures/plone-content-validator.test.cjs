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

  // The two tests above use path-shaped directories (section/child/data.json).
  // Real distributions are UID-keyed and FLAT — every data.json sits in its own
  // <uid>/ dir and the hierarchy lives ONLY in the `@id` field. Deriving the
  // parent from the directory path silently no-ops on that layout, which is how
  // 90 of 150 objects got dropped at import with nothing going red.
  it('reports child before parent in a UID-keyed (flat) layout', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: [
        'plone_site_root/data.json',
        'childuid12345678/data.json',   // /components/card — child first
        'parentuid1234567/data.json',   // /components      — parent second
      ],
    });
    const flat = {
      childuid12345678: { '@id': '/components/card', id: 'card' },
      parentuid1234567: { '@id': '/components', id: 'components' },
    };
    for (const [uid, item] of Object.entries(flat)) {
      fs.mkdirSync(path.join(contentDir, uid), { recursive: true });
      fs.writeFileSync(
        path.join(contentDir, uid, 'data.json'),
        JSON.stringify({ ...item, '@type': 'Document', UID: uid }),
      );
    }
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('appears before its parent')),
      r.errors.join('\n'),
    );
  });

  it('reports a missing parent container in a UID-keyed (flat) layout', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: ['plone_site_root/data.json', 'orphanuid1234567/data.json'],
    });
    fs.mkdirSync(path.join(contentDir, 'orphanuid1234567'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, 'orphanuid1234567', 'data.json'),
      JSON.stringify({
        '@id': '/editing/pages', '@type': 'Document', id: 'pages', UID: 'orphanuid1234567',
      }),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('parent container missing')),
      r.errors.join('\n'),
    );
  });

  it('accepts a correctly ordered UID-keyed (flat) layout', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: [
        'plone_site_root/data.json',
        'parentuid1234567/data.json',   // parent first
        'childuid12345678/data.json',   // child second
      ],
    });
    const flat = {
      parentuid1234567: { '@id': '/components', id: 'components' },
      childuid12345678: { '@id': '/components/card', id: 'card' },
    };
    for (const [uid, item] of Object.entries(flat)) {
      fs.mkdirSync(path.join(contentDir, uid), { recursive: true });
      fs.writeFileSync(
        path.join(contentDir, uid, 'data.json'),
        JSON.stringify({ ...item, '@type': 'Document', UID: uid }),
      );
    }
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      !r.errors.some((e) => e.includes('appears before its parent') || e.includes('parent container missing')),
      r.errors.join('\n'),
    );
  });

  // A child whose id shadows an attribute the FTI machinery reads makes its
  // CONTAINER un-serializable: BTreeFolder2Base.__getattr__ resolves the name
  // out of _tree, so getViewMethod's `getattr(aq_base(context), "layout")`
  // returns the child object, calls it unwrapped, and plone.restapi 500s with
  // `AttributeError: REQUEST`. /components died this way in production.
  it('reports a content id that shadows the layout attribute', () => {
    const { root, contentDir } = buildFixture({
      dataFiles: ['plone_site_root/data.json', 'shadowuid1234567/data.json'],
    });
    fs.mkdirSync(path.join(contentDir, 'shadowuid1234567'), { recursive: true });
    fs.writeFileSync(
      path.join(contentDir, 'shadowuid1234567', 'data.json'),
      JSON.stringify({
        '@id': '/page-a/layout', '@type': 'Document', id: 'layout',
        UID: 'shadowuid1234567',
      }),
    );
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('reserved')),
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

  it('accepts content with NO local_roles (optional for plone.distribution)', () => {
    // local_roles is generated/defaulted on import, not required: plone.distribution
    // imports items fine when it is absent and defaults them to admin ownership.
    // The REAL pretagov __metadata__.json ships no local_roles key at all and is
    // deployed live (197 items). An earlier version of this test asserted the
    // OPPOSITE — that missing local_roles is an error — which would have rejected
    // that valid distribution. Assert the true behavior instead.
    const { root, contentDir } = buildFixture({
      localRoles: {},
    });
    const r = validate(contentDir);
    cleanup(root);
    assert.ok(
      !r.errors.some((e) => e.includes('local_roles')),
      `local_roles must not be required, got: ${r.errors.join('\n')}`,
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

  it('FAILS on a template block with no templateId', () => {
    // A forced-layout template's blocks are matched to a page's region by
    // templateId + slotId. A block carrying only slotId is silently skipped by
    // the expansion: no error anywhere, the block simply never renders. That
    // cost an hour of "why is my footer button missing" — the validator, the
    // schema gate and block-sanity were all green while it was broken.
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/templates/thing', '@type': 'Document', id: 'thing',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          good: { '@type': 'slate', templateId: 'resolveuid/pageauid1234567', slotId: 'good' },
          orphan: { '@type': 'slate', slotId: 'orphan' },
        },
        blocks_layout: { items: ['good', 'orphan'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('orphan') && e.includes('templateId')),
      r.errors.join('\n'));
  });

  it('FAILS on a template block with no slotId', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/templates/thing', '@type': 'Document', id: 'thing',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          good: { '@type': 'slate', templateId: 'resolveuid/pageauid1234567', slotId: 'good' },
          noslot: { '@type': 'slate', templateId: 'resolveuid/pageauid1234567' },
        },
        blocks_layout: { items: ['good', 'noslot'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('noslot') && e.includes('slotId')),
      r.errors.join('\n'));
  });

  it('accepts a template whose blocks all carry both', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/templates/thing', '@type': 'Document', id: 'thing',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          a: { '@type': 'slate', templateId: 'resolveuid/pageauid1234567', slotId: 'a' },
          b: { '@type': 'slate', templateId: '/templates/thing', slotId: 'b' },
        },
        blocks_layout: { items: ['a', 'b'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.equal(r.errors.filter((e) => /templateId|slotId/.test(e)).length, 0,
      r.errors.join('\n'));
  });

  it('leaves ordinary pages alone', () => {
    // Only pages that ARE templates are checked. A normal page's blocks have
    // no templateId and must not be nagged about one.
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: { plain: { '@type': 'slate' } },
        blocks_layout: { items: ['plain'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.equal(r.errors.filter((e) => /templateId|slotId/.test(e)).length, 0,
      r.errors.join('\n'));
  });

  it('FAILS on a broken path inside a SLATE link node', () => {
    // Slate links live at value[].data.url, not in a block field, so pass 2c's
    // LINK_FIELDS scan never saw them. Only resolveuid refs were caught (by a
    // raw-text regex over the whole file) — a plain-path slate link pointing
    // nowhere was not checked at all, and the gate still said "0 broken".
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          'slate-1': {
            '@type': 'slate',
            value: [{
              type: 'p',
              children: [
                { text: 'See ' },
                { type: 'link', data: { url: '/nope' }, children: [{ text: 'this' }] },
              ],
            }],
          },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('/nope')), r.errors.join('\n'));
    assert.equal(r.stats.linksBroken, 1);
  });

  it('accepts a slate link to a real page', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          'slate-1': {
            '@type': 'slate',
            value: [{
              type: 'p',
              children: [{ type: 'link', data: { url: '/page-a' }, children: [{ text: 'self' }] }],
            }],
          },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.equal(r.stats.linksBroken, 0, r.errors.join('\n'));
  });

  it('accepts a path carrying a #fragment, and still checks the path', () => {
    // Deep-linking to a heading is legitimate content — RichText emits slugged
    // ids for headings precisely so `page#section` resolves. The path branch
    // did not strip the fragment, so a perfectly good link read as
    // "path not in content: /page-a#section".
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          'good': {
            '@type': 'teaser',
            href: [{ '@id': '/page-a#a-heading' }],
          },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.equal(r.stats.linksBroken, 0, r.errors.join('\n'));
  });

  it('still FAILS when the page before the #fragment does not exist', () => {
    // Stripping the fragment must not become a way to smuggle a dead path past
    // the gate.
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a',
        UID: 'pageauid1234567', parent: { '@id': '/' },
        blocks: {
          'bad': { '@type': 'teaser', href: [{ '@id': '/ghost#a-heading' }] },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(r.errors.some((e) => e.includes('/ghost')), r.errors.join('\n'));
    assert.equal(r.stats.linksBroken, 1);
  });

  it('FAILS on a broken internal href in a block teaser', () => {
    // A broken link is a malformed-content ERROR, not a warning. A warning does
    // not fail the deploy gate, so a broken href would ship.
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
    assert.ok(r.errors.some((e) => e.includes('/does-not-exist')), r.errors.join('\n'));
    assert.equal(r.stats.linksBroken, 1);
  });

  it('FAILS on an image block url in [{"@id": path}] array form pointing nowhere', () => {
    // The exact shape that shipped 5 dead image blocks on pretagov-site: url as
    // an object_browser ARRAY, not a string, pointing at /images/test-image
    // which does not exist. Pass 2c only checked url as a STRING, so this was
    // never looked at and the gate reported "0 broken".
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'image-1': {
            '@type': 'image',
            url: [{ '@id': '/images/test-image' }],
          },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('/images/test-image')),
      r.errors.join('\n'),
    );
    assert.equal(r.stats.linksBroken, 1);
  });

  it('accepts a valid array-form url that resolves', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'image-1': { '@type': 'image', url: [{ '@id': '/' }] },  // homepage
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.deepEqual(r.errors, []);
    assert.equal(r.stats.linksBroken, 0);
    assert.equal(r.stats.linksOk, 1);
  });

  it('FAILS on a reference form it does not understand', () => {
    // "if a sanity test is finding links it can't understand, it fails." An
    // href that is neither resolveuid, internal path, external URL, nor a known
    // scheme must not be silently skipped.
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'btn-1': { '@type': 'button', href: [{ '@id': 'garbage-not-a-ref' }] },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('garbage-not-a-ref')),
      r.errors.join('\n'),
    );
  });

  it('accepts external URLs and known schemes without flagging them', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a',
        '@type': 'Document',
        id: 'page-a',
        UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'img-1': { '@type': 'image', href: [{ '@id': 'https://digital.nsw.gov.au/x' }] },
          'img-2': { '@type': 'image', href: [{ '@id': 'mailto:hi@example.com' }] },
        },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.deepEqual(r.errors, []);
    assert.equal(r.stats.linksOk, 2);
  });

  it('FAILS on a blocks_layout.items entry with no matching block', () => {
    // A uid listed in a container's blocks_layout but absent from its `blocks`
    // dict is a dangling reference — what a partial block deletion leaves (remove
    // the block def but not its layout entry).
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a', UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: { 'real-1': { '@type': 'slate' } },
        blocks_layout: { items: ['real-1', 'ghost-block-999'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('ghost-block-999') && e.includes('blocks_layout')),
      r.errors.join('\n'),
    );
  });

  it('FAILS on a dangling ref in the nested blocks_layout.blocks_layout key', () => {
    // The exact bug a teaser removal left: block def gone from `blocks`, uid still
    // in the vestigial blocks_layout.blocks_layout array.
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a', UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: {
          'grid-1': {
            '@type': 'gridBlock',
            blocks: { 'child-1': { '@type': 'teaser' } },
            blocks_layout: { blocks_layout: ['deleted-teaser-uid'], items: ['child-1'] },
          },
        },
        blocks_layout: { items: ['grid-1'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.ok(
      r.errors.some((e) => e.includes('deleted-teaser-uid')),
      r.errors.join('\n'),
    );
  });

  it('accepts a container whose blocks_layout fully resolves', () => {
    const { root, contentDir } = buildFixture({
      pageA: {
        '@id': '/page-a', '@type': 'Document', id: 'page-a', UID: 'pageauid1234567',
        parent: { '@id': '/' },
        blocks: { 'a': { '@type': 'slate' }, 'b': { '@type': 'slate' } },
        blocks_layout: { blocks_layout: [], items: ['a', 'b'] },
      },
    });
    const r = checkIntegrity(contentDir);
    cleanup(root);
    assert.deepEqual(r.errors, []);
    assert.equal(r.stats.layoutBroken, 0);
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

describe('checkIntegrity over in-memory items (API-fed)', () => {
  it('catches broken resolveuid, dangling layout refs and duplicate UIDs with no disk tree', () => {
    const uid = 'abcdef1234567890';
    const r = checkIntegrity([
      {
        rel: 'page-a',
        data: {
          '@id': '/page-a',
          '@type': 'Document',
          id: 'page-a',
          UID: uid,
          blocks: {
            good: { '@type': 'slate', value: [{ type: 'p', children: [{ text: `see resolveuid/${uid}` }] }] },
            bad: { '@type': 'slate', value: [{ type: 'p', children: [{ text: 'see resolveuid/feedfeedfeedfeed' }] }] },
          },
          blocks_layout: { items: ['good', 'bad', 'ghost'] },
        },
      },
      {
        rel: 'page-b',
        data: { '@id': '/page-b', '@type': 'Document', id: 'page-b', UID: uid, blocks: {}, blocks_layout: { items: [] } },
      },
    ]);
    assert.equal(r.stats.resolveuidOk, 1);
    assert.equal(r.stats.resolveuidBroken, 1);
    assert.equal(r.stats.layoutBroken, 1);
    assert.ok(r.errors.some((e) => e.includes('duplicate UID')));
    assert.ok(r.errors.some((e) => e.includes('missing block ghost')));
    // Disk-only passes must not have run (nothing to stat).
    assert.equal(r.stats.imagesBroken, 0);
  });

  it('a clean in-memory set reports nothing', () => {
    const r = checkIntegrity([
      {
        rel: 'page-a',
        data: { '@id': '/page-a', '@type': 'Document', id: 'page-a', UID: 'aaaabbbbcccc', blocks: {}, blocks_layout: { items: [] } },
      },
    ]);
    assert.deepEqual(r.errors, []);
  });
});
