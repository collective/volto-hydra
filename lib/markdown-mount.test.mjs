import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveLiteralIncludes, readTree, resolveMarkdownLink, resolveMarkdownLinksInBlocks } from './markdown-mount.mjs';

describe('resolveLiteralIncludes', () => {
  let dir;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'li-'));
    writeFileSync(join(dir, 'ButtonBlock.jsx'), [
      "import { x } from './utils.js';",
      '// docs:start',
      'function ButtonBlock({ block }) {',
      '  return <a href={block.href} data-edit-text="title">{block.title}</a>;',
      '}',
      '// docs:end',
      'export default ButtonBlock;',
    ].join('\n'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const li = (opts) => `\`\`\`{literalinclude} ButtonBlock.jsx\n${opts}\n\`\`\``;

  it('inlines the whole file with an inferred language from the extension', () => {
    const out = resolveLiteralIncludes(li(''), dir);
    expect(out).toMatch(/^```jsx\n/);
    expect(out).toContain('function ButtonBlock');
    expect(out).toContain('export default');
  });

  it('slices with :start-after: / :end-before:, dropping imports/exports', () => {
    const out = resolveLiteralIncludes(li(':start-after: // docs:start\n:end-before: // docs:end'), dir);
    expect(out).toContain('function ButtonBlock');
    expect(out).not.toContain('import');
    expect(out).not.toContain('export default');
  });

  it('honors an explicit :language: and :lines:', () => {
    const out = resolveLiteralIncludes(li(':language: js\n:lines: 3-5'), dir);
    expect(out).toMatch(/^```js\n/);
    expect(out).toContain('function ButtonBlock');
    expect(out).not.toContain('docs:start');
  });

  it('leaves ordinary code fences untouched', () => {
    const md = '```jsx\nconst x = 1;\n```';
    expect(resolveLiteralIncludes(md, dir)).toBe(md);
  });

  it('fails loudly on a missing file', () => {
    expect(() => resolveLiteralIncludes('```{literalinclude} nope.jsx\n```', dir)).toThrow(/not found/);
  });
});

describe('resolveMarkdownLink', () => {
  it('rewrites a relative .md link to a served path against the page dir', () => {
    expect(resolveMarkdownLink('selecting-blocks.md', 'docs/what-editors-will-experience'))
      .toBe('/docs/what-editors-will-experience/selecting-blocks');
    expect(resolveMarkdownLink('advanced/index.md', 'docs')).toBe('/docs/advanced');
    expect(resolveMarkdownLink('../architecture.md#chrome', 'docs/x')).toBe('/docs/architecture#chrome');
    expect(resolveMarkdownLink('foo.md', '')).toBe('/foo');
  });
  it('passes external, absolute, anchor and non-.md links through untouched', () => {
    for (const u of ['https://x.io/a', 'mailto:a@b.c', '#frag', '/docs/live-preview', '/x.md-ish'])
      expect(resolveMarkdownLink(u, 'docs')).toBe(u);
  });
  it('rewrites only slate link nodes when walking blocks', () => {
    const blocks = { 's-1': { '@type': 'slate', value: [
      { type: 'link', data: { url: 'other.md' }, children: [{ text: 'x' }] },
      { type: 'link', data: { url: 'https://keep.me' }, children: [{ text: 'y' }] },
    ] } };
    resolveMarkdownLinksInBlocks(blocks, 'docs');
    expect(blocks['s-1'].value[0].data.url).toBe('/docs/other');
    expect(blocks['s-1'].value[1].data.url).toBe('https://keep.me');
  });
});

describe("readTree registers a content item's own image/file blob", () => {
  let dir;
  const page = (fm) => `---\n${fm}\n---\n`;
  const seedRoot = (d) =>
    writeFileSync(join(d, 'index.md'), page('"@type": Document\nUID: root-uid\nid: Plone'));

  beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'mm-blob-')); });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('registers the bytes under the item path when the referenced file exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'mm-ok-'));
    seedRoot(root);
    mkdirSync(join(root, 'news/image'), { recursive: true });
    // A leadimage: an `image:` field on the item itself (not a `blobs:` child),
    // with a root-relative blob_path, exactly as an exported News Item carries.
    writeFileSync(join(root, 'news.md'), page(
      '"@type": News Item\nUID: n1\nid: news\n' +
      'image:\n  blob_path: news/image/pic.jpg\n  filename: pic.jpg\n  content-type: image/jpeg'));
    writeFileSync(join(root, 'news/image/pic.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const { items, blobFiles } = readTree(root);
    // The News Item keeps its image field...
    expect(items.get('/news').image.blob_path).toBe('news/image/pic.jpg');
    // ...and its bytes are registered under the item's own path, so the server
    // (and an export) can resolve them the same way it resolves a `blobs:` child.
    expect(blobFiles.get('/news')).toBe(join(root, 'news/image/pic.jpg'));
    rmSync(root, { recursive: true, force: true });
  });

  it('fails loudly when a declared image/file blob_path has no file on disk', () => {
    const root = mkdtempSync(join(tmpdir(), 'mm-bad-'));
    seedRoot(root);
    writeFileSync(join(root, 'news.md'), page(
      '"@type": News Item\nUID: n1\nid: news\nimage:\n  blob_path: news/image/gone.jpg'));
    expect(() => readTree(root)).toThrow(/gone\.jpg/);
    rmSync(root, { recursive: true, force: true });
  });
});
