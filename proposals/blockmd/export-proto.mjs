#!/usr/bin/env node
/**
 * Convert the docs content tree to the prototype-mapping markdown format,
 * emitting THROUGH the engine (emitPage) so emit and decode share one
 * implementation and verify-on-emit guarantees the round-trip. A block the
 * clean prototypes can't carry falls back to a tier-3 data tag, never lost.
 *
 *   node proposals/blockmd/export-proto.mjs [--out DIR]
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync,
} from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { SERVER_STATE } from '../../lib/blockmd.mjs';
import { parsePrototypes, emitPage } from '../../lib/prototype-mapping.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INKA = resolve(HERE, '../..');
const SRC = resolve(INKA, 'docs/content/content/content');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > -1 ? resolve(process.argv[outArg + 1]) : resolve(INKA, 'docs/content-md-proto');

// Emit-capable prototypes, one text block per type. Types not here (slateTable,
// gridBlock, the long tail) fall to tier-3 data tags automatically.
const PROTO_TEXT = {
  title: '<block type="title" _="${h1}" />',
  slate: '<block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />',
  separator: '<block type="separator" _="${hr}" />',
  image: [
    '<block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />',
    '<block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />',
  ].join('\n'),
  slateTable: [
    '<block type="slateTable">',
    '  <region name="table.rows">',
    '    <block type="row">',
    '      <region name="cells">',
    '        <block type="cell" value="${td/slate}" />',
    '      </region>',
    '    </block>',
    '  </region>',
    '</block>',
  ].join('\n'),
  codeExample: [
    '<block type="codeExample">',
    '  <region name="tabs" widget="object_list">',
    '    <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'),
  gridBlock: [
    '<block type="gridBlock">',
    '  <region name="blocks" widget="blocks_layout">',
    '    <block type="teaser" title="${h2/text}" description="${p/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'),
  accordion: [
    '<block type="accordion" right_arrows=true>',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h2/text}" />',
    '  </region>',
    '</block>',
  ].join('\n'),
};
const PROTOS = parsePrototypes(Object.values(PROTO_TEXT).join('\n'));

/** Only the prototypes a page's block types use, as a frontmatter block scalar. */
function prototypesYaml(used) {
  const lines = Object.entries(PROTO_TEXT).filter(([t]) => used.has(t)).flatMap(([, txt]) => txt.split('\n'));
  return lines.length ? `prototypes: |\n${lines.map((l) => `  ${l}`).join('\n')}` : '';
}

const flow = (o) => `{ ${Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ')} }`;

// --------------------------------------------------------------- tree --------
function walk(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, hits);
    else if (name === 'data.json') hits.push(p);
  }
  return hits;
}

const items = [];
for (const f of walk(SRC)) {
  let d; try { d = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  if (d['@id']) items.push(d);
}
const ROOT = items.find((i) => i['@type'] === 'Plone Site')?.['@id'];
const canon = (id) => (id === ROOT ? '/' : id);
const hasKids = new Set(items.map((i) => canon((i.parent || {})['@id'] ?? '')).filter(Boolean));
const pathFor = (id, folderish) => {
  const rel = canon(id).replace(/^\//, '');
  if (!rel) return 'index.md';
  return folderish ? `${rel}/index.md` : `${rel}.md`;
};

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pages = 0, tier3 = 0, clean = 0;
for (const d of items) {
  const id = canon(d['@id']);
  const folderish = hasKids.has(id) || d['@type'] === 'Plone Site';
  const dest = join(OUT, pathFor(id, folderish));
  mkdirSync(dirname(dest), { recursive: true });

  const meta = Object.fromEntries(Object.entries(d)
    .filter(([k]) => !SERVER_STATE.has(k) && k !== 'blocks' && k !== 'blocks_layout'));
  const front = YAML.stringify(meta).trim();

  if (d.blocks && d.blocks_layout?.items?.length) {
    const { markdown, assignments } = emitPage(PROTOS, { blocks: d.blocks, blocks_layout: d.blocks_layout });
    const used = new Set(assignments.map((a) => a.type).filter(Boolean));
    const asg = `assignments:\n${assignments.map((a) => `  - ${flow(a)}`).join('\n')}`;
    const proto = prototypesYaml(used);
    writeFileSync(dest, `---\n${front}\n${asg}\n${proto}\n---\n\n${markdown}\n`);
    pages += 1;
    // rough coverage: count self-closing data tags (tier-3) vs the rest
    tier3 += (markdown.match(/<block type="[^"]*"[^>]*\/>/g) || []).length;
    clean += assignments.filter((a) => a.type).length;
  } else {
    writeFileSync(dest, `---\n${front}\n---\n`);
  }
}

console.log(`\n${pages} pages -> ${OUT}`);
console.log(`~${tier3} tier-3 data tags of ${clean} blocks (${Math.round((1 - tier3 / clean) * 100)}% clean)`);
