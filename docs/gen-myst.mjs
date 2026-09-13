#!/usr/bin/env node
/**
 * Generate the Sphinx/myst version of the docs from the <block> markdown source.
 *
 * The source (content-md-proto) is authored for the LOADER: block bodies are
 * plain markdown, but wrapped in <block>/<region>/<fields> tags, with nav in
 * `order:` frontmatter. Sphinx wants plain myst + `{toctree}`s. This emits that
 * — a BUILD ARTIFACT, never committed (the source stays loader-shaped):
 *
 *   node docs/gen-myst.mjs <src> <out>
 *
 * Transforms:
 *  - `<block type="callout" variation="X">…</block>`  -> ```{X} …``` admonition
 *  - self-closing `<block type="image" url alt>`       -> `![alt](url)`
 *  - `<block type="separator" .../>`                   -> `---`
 *  - other self-closing `<block …/>` (video, listing…) -> dropped (inert in Sphinx)
 *  - remaining `<block>|</block>|<region>|</region>|<fields>|</fields>` -> stripped,
 *    keeping the markdown body (codeExample renders as its ### tabs + fences)
 *  - `order:` frontmatter on a folder index -> a `{toctree}` of its children
 *  - heavy frontmatter (@type, UID, blocks-*, prototypes, …) -> dropped
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync, cpSync, statSync } from 'fs';
import { join, dirname, relative, basename } from 'path';

const [SRC, OUT] = process.argv.slice(2);
if (!SRC || !OUT) { console.error('usage: gen-myst.mjs <src> <out>'); process.exit(1); }

const walk = (d, acc = []) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p, acc); else acc.push(p); } return acc; };

// A callout block -> a myst admonition. The body is already markdown.
function calloutToAdmonition(md) {
  return md.replace(
    /<block type="callout" variation="(\w+)"[^>]*>\n([\s\S]*?)\n<\/block>/g,
    (_m, variation, body) => '```{' + variation + '}\n' + body.trim() + '\n```',
  );
}

// A self-closing block tag's attributes -> {name: value}
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/(\w[\w-]*)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

function transformBody(body) {
  let out = calloutToAdmonition(body);
  // self-closing image blocks -> markdown image
  out = out.replace(/<block type="image"([^>]*?)\/>/g, (m, rest) => {
    const a = attrs('x' + rest); // prefix so the leading space parses
    return a.url ? `![${a.alt || a.description || ''}](${a.url})` : '';
  });
  // separator -> thematic break
  out = out.replace(/<block type="separator"[^>]*\/>/g, '---');
  // any other self-closing block -> drop (inert in Sphinx: video, listing, teaser, …)
  out = out.replace(/<block [^>]*\/>/g, '');
  // strip wrapper tags, keep their bodies
  out = out.replace(/^\s*<\/?(?:block|region|fields)(?:\s[^>]*)?>\s*$/gm, '');
  // collapse the blank-line runs the stripping leaves behind
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim() + '\n';
}

// Parse `order:` (a YAML list) out of the frontmatter, for a folder index toctree.
function parseOrder(fm) {
  const m = fm.match(/^order:\n((?:\s*-\s*.*\n?)+)/m);
  if (!m) return null;
  return m[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
}
const titleOf = (fm) => (fm.match(/^title:\s*(.+)$/m)?.[1] || '').replace(/^["']|["']$/g, '').trim();
const descOf = (fm) => (fm.match(/^description:\s*(.+)$/m)?.[1] || '').replace(/^["']|["']$/g, '').trim();

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Which order: entries are folder children that have a page (so a toctree can point at them).
for (const f of walk(SRC)) {
  const rel = relative(SRC, f);
  const dest = join(OUT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  if (!f.endsWith('.md')) { cpSync(f, dest); continue; } // images etc. copied as-is

  const raw = readFileSync(f, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

  const title = titleOf(fm);
  const order = parseOrder(fm);
  let out = '';
  // minimal frontmatter Sphinx cares about
  if (title) out += `---\ntitle: ${JSON.stringify(title)}\n---\n\n`;
  out += transformBody(body);

  // a folder index (index.md with order:) gets a hidden toctree of its children.
  // Site content (templates, search, image folders) isn't docs — the parent
  // provides it and its pages have no prose title — so keep it out of the nav.
  const NOT_DOCS = new Set(['templates', 'search', 'images', 'static', '_static']);
  if (order && (basename(f) === 'index.md' || basename(f) === 'README.md')) {
    const here = dirname(f);
    const entries = order
      .filter((name) => !NOT_DOCS.has(name))
      .map((name) => (existsSync(join(here, name, 'index.md')) || existsSync(join(here, name, 'README.md')) ? `${name}/index`
        : existsSync(join(here, `${name}.md`)) ? name : null))
      .filter(Boolean);
    if (entries.length) out += `\n\`\`\`{toctree}\n:hidden:\n\n${entries.join('\n')}\n\`\`\`\n`;
  }
  writeFileSync(dest, out);
}
console.log(`generated myst -> ${OUT}`);
