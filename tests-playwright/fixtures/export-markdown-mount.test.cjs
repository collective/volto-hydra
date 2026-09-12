// End-to-end: a MARKDOWN mount exported through POST /@export?format=json must
// produce the same deployable .tar.gz as a JSON mount does. This is the case the
// default (JSON-only) config never exercises and the one that motivated exporting
// from memory: a markdown tree has no exportimport layout on disk, so the tar can
// only come from the decoded-in-memory content. CONTENT_MOUNTS is set BEFORE the
// api module loads (node --test isolates each file in its own process), mounting
// the docs markdown tree at '/'.
const path = require('node:path');
process.env.CONTENT_MOUNTS = '/:' + path.resolve(__dirname, '../../docs/content-md-proto');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { app, ready } = require('./mock-plone-api.cjs');

let server, baseUrl;
before(async () => {
  await ready;
  await new Promise((resolve) => {
    server = app.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
  });
});
after(async () => { if (server) await new Promise((r) => server.close(r)); });

describe('/@export json from a markdown mount', () => {
  it('emits a deployable, validator-clean tar with markdown blobs bundled', async () => {
    const res = await fetch(`${baseUrl}/@export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'json' }),
    });
    assert.equal(res.status, 200, 'export succeeded');
    assert.equal(res.headers.get('content-type'), 'application/gzip');
    const buf = Buffer.from(await res.arrayBuffer());

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-export-'));
    try {
      fs.writeFileSync(path.join(dir, 'e.tar.gz'), buf);
      execFileSync('tar', ['-xzf', 'e.tar.gz', '-C', dir], { cwd: dir });
      const content = path.join(dir, 'content');
      const meta = JSON.parse(fs.readFileSync(path.join(content, '__metadata__.json'), 'utf8'));

      // A real tree came out of markdown-only content.
      assert.ok(meta._data_files_.length > 100, `whole tree exported (${meta._data_files_.length} items)`);
      assert.ok(meta._blob_files_.length > 0, 'blobs bundled');
      // Every referenced blob's bytes are present, normalised under its item dir.
      for (const blob of meta._blob_files_) {
        assert.ok(fs.existsSync(path.join(content, blob)), `blob present: ${blob}`);
        assert.match(blob, /\/(image|file)\//, `blob normalised under a field dir: ${blob}`);
      }
      // A leadimage (image field on a content item, not a blobs: child) rode along.
      const lead = 'docs/examples/content-types/copy_of_news-item/image/sergio-martinez-rhNJJ4eD2zk-unsplash.jpg';
      assert.ok(meta._blob_files_.includes(lead), 'content-item leadimage bytes exported');

      // Passes the same validator the JSON export is gated on.
      const { validate, checkIntegrity } = require('./plone-content-validator.cjs');
      assert.deepEqual(validate(content).errors, [], 'validate: no errors');
      assert.deepEqual(checkIntegrity(content).errors, [], 'checkIntegrity: no errors');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
