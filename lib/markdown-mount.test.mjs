import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveLiteralIncludes } from './markdown-mount.mjs';

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
