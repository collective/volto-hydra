#!/usr/bin/env node
/**
 * Convert the docs content tree to the NEW prototype-mapping markdown format,
 * for review. Clean markdown for prototyped block types; an explicit tier-3
 * `<block .../>` tag for everything else. Prints a coverage report.
 *
 *   node proposals/blockmd/export-proto.mjs [--out DIR]
 *
 * This is a review artifact, not a round-tripping export: blocks are emitted
 * one at a time (no cross-block verify-on-emit), and prototypes live in one
 * shared header written once to the out dir rather than per page.
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync,
  statSync,
} from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { slateToMd, fmtTagAttrs, renderTable, SERVER_STATE } from '../../lib/blockmd.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INKA = resolve(HERE, '../..');
const SRC = resolve(INKA, 'docs/content/content/content');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > -1 ? resolve(process.argv[outArg + 1]) : resolve(INKA, 'docs/content-md-proto');

// The per-page prototype section: how the tags and bare markdown below map to
// blocks. Written into every file so each page decodes standalone (per-page for
// now; a shared global file is the later step). Object defaults like styles:{}
// are omitted here for readability.
// The prototype declaration per block type. A page emits only the ones it uses.
const PROTO_BY_TYPE = {
  title: ['<block type="title"      _="${h1}" />'],
  slate: ['<block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />'],
  separator: ['<block type="separator"  _="${hr}" />'],
  image: ['<block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />'],
  slateTable: [
    '<block type="slateTable">',
    '  <region name="rows">',
    '    <block type="row">',
    '      <region name="cells">',
    '        <block type="cell" value="${td/slate}" />',
    '      </region>',
    '    </block>',
    '  </region>',
    '</block>',
  ],
  codeExample: [
    '<block type="codeExample">',
    '  <region name="tabs" widget="object_list">',
    '    <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />',
    '  </region>',
    '</block>',
  ],
  gridBlock: [
    '<block type="gridBlock"  headline="${text}">',
    '  <region name="blocks" widget="blocks_layout" />',
    '</block>',
  ],
  accordion: [
    '<block type="accordion"  right_arrows="true">',
    '  <region name="panels" widget="object_list">',
    '    <block type="panel" title="${h2/text}" />',
    '  </region>',
    '</block>',
  ],
};
/** Only the prototypes a page actually uses, as a frontmatter block scalar. */
function prototypesYaml(used) {
  const lines = Object.keys(PROTO_BY_TYPE).filter((t) => used.has(t)).flatMap((t) => PROTO_BY_TYPE[t]);
  return lines.length ? `prototypes: |\n${lines.map((l) => `  ${l}`).join('\n')}` : '';
}

// --------------------------------------------------------------- emit --------
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A clean leaf accounts for every field it has (nothing silently dropped):
// `use` = fields the emitter renders, `def` = fields that must match a default.
const LEAF = {
  slate: { use: ['value'], def: { styles: {} } },
  separator: { use: [], def: { styles: {} } },
  title: { use: [], def: {} },
  image: { use: ['url', 'alt', 'description'], def: { align: 'center', size: 'l', styles: {}, credit: {}, image_field: 'image', title: 'Image' } },
  codeExample: { use: ['tabs'], def: {} },
  slateTable: { use: ['table'], def: { styles: {} } },
};
function cleanLeaf(block) {
  const spec = LEAF[block['@type']];
  if (!spec) return false;
  const ok = new Set(['@type', 'plaintext', ...spec.use, ...Object.keys(spec.def)]);
  for (const [k, v] of Object.entries(block)) {
    if (!ok.has(k)) return false;
    if (k in spec.def && !eq(spec.def[k], v)) return false;
  }
  return true;
}

function emitLeaf(block, ctx) {
  const t = block['@type'];
  if (t === 'slate') return slateToMd(block.value);
  if (t === 'separator') return '---';
  if (t === 'title') return `# ${ctx.title}`;
  if (t === 'image') {
    const cap = (block.description || '').trim();
    return `${cap ? `${cap}\n\n` : ''}![${block.alt || ''}](${block.url})`;
  }
  if (t === 'codeExample') {
    return block.tabs.map((tab) => `### ${tab.label}\n\n\`\`\`${tab.language || ''}\n${tab.code}\n\`\`\``).join('\n\n');
  }
  if (t === 'slateTable') return renderTable(block.table.rows);
  return null;
}

function tier3(uid, block) {
  const { '@type': type, plaintext, ...rest } = block;
  const attrs = fmtTagAttrs(rest);
  return `<block type="${type}" uid="${uid}"${attrs ? ` ${attrs}` : ''} />`;
}

const stats = { clean: {}, fallback: {} };
let usedTypes = new Set();
const bump = (bucket, t) => { stats[bucket][t] = (stats[bucket][t] || 0) + 1; if (bucket === 'clean') usedTypes.add(t); };

/** Emit one block, recursing into containers (their structure is always shown,
 *  children clean-or-tier3 individually). */
function emitMd(uid, block, ctx) {
  const t = block['@type'];
  if (t === 'accordion') { // object_list: ## title + children
    bump('clean', t);
    const panels = (block.panels || []).map((p) => {
      const kids = (p.blocks_layout?.items || []).map((cu) => emitMd(cu, p.blocks[cu], ctx)).join('\n\n');
      return `## ${p.title || ''}\n\n${kids}`;
    }).join('\n\n');
    return `<block type="accordion">\n\n${panels}\n\n</block>`;
  }
  if (t === 'gridBlock') { // blocks_layout: a bare block sequence
    bump('clean', t);
    const kids = (block.blocks_layout?.items || []).map((cu) => emitMd(cu, block.blocks[cu], ctx)).join('\n\n');
    const head = block.headline ? ` headline="${block.headline}"` : '';
    return `<block type="gridBlock"${head}>\n\n${kids}\n\n</block>`;
  }
  if (cleanLeaf(block)) {
    const md = emitLeaf(block, ctx);
    if (md != null) { bump('clean', t); return md; }
  }
  bump('fallback', t);
  return tier3(uid, block);
}

function emitBody(page, ctx) {
  usedTypes = new Set();
  const parts = [];
  const order = [];
  for (const uid of page.blocks_layout.items) {
    order.push({ uid, type: page.blocks[uid]['@type'] });
    parts.push(emitMd(uid, page.blocks[uid], ctx));
  }
  return { body: parts.join('\n\n'), order, used: usedTypes };
}

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

let pages = 0;
for (const d of items) {
  const id = canon(d['@id']);
  const folderish = hasKids.has(id) || d['@type'] === 'Plone Site';
  const dest = join(OUT, pathFor(id, folderish));
  mkdirSync(dirname(dest), { recursive: true });

  const meta = Object.fromEntries(Object.entries(d).filter(([k]) => !SERVER_STATE.has(k) && k !== 'blocks' && k !== 'blocks_layout'));
  const front = YAML.stringify(meta).trim();

  if (d.blocks && d.blocks_layout?.items?.length) {
    const { body, order, used } = emitBody(d, { title: d.title });
    // One line per block: { uid, type, ...hoisted fields }. Flow style keeps
    // it compact and leaves room for templateId/slotId/etc. on the same line.
    const flow = (o) => `{ ${Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
    const assignments = `assignments:\n${order.map((o) => `  - ${flow(o)}`).join('\n')}`;
    writeFileSync(dest, `---\n${front}\n${assignments}\n${prototypesYaml(used)}\n---\n\n${body}\n`);
    pages += 1;
  } else {
    writeFileSync(dest, `---\n${front}\n---\n`);
  }
}

// ------------------------------------------------------------- report --------
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const cleanN = sum(stats.clean), fbN = sum(stats.fallback);
console.log(`\n${pages} pages -> ${OUT}`);
console.log(`blocks: ${cleanN} clean (${Math.round(cleanN / (cleanN + fbN) * 100)}%), ${fbN} fallback\n`);
console.log('CLEAN by type:');
for (const [t, c] of Object.entries(stats.clean).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(4)}  ${t}`);
console.log('\nFALLBACK by type (needs a prototype):');
for (const [t, c] of Object.entries(stats.fallback).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(4)}  ${t}`);
