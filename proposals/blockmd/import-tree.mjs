#!/usr/bin/env node
/**
 * The README-shaped markdown tree -> Plone content items.
 *
 *   node import-tree.mjs [--diff]
 *
 * This is what a mock-API markdown mount would do on read. `--diff` compares
 * the result against the source content tree, which is the check that counts:
 * the exporter is only correct if what comes back out is what the frontend
 * would have been served from the JSON.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve, relative, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { mdToPage } from './blockmd.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INKA = resolve(HERE, '../..');
const TREE = join(HERE, 'tree');
const SRC = resolve(INKA, 'docs/content/content/content');

const schema = existsSync(join(HERE, 'schemas.json'))
  ? JSON.parse(readFileSync(join(HERE, 'schemas.json'), 'utf8')) : {};
schema._markdown = existsSync(join(HERE, 'markdown-roles.json'))
  ? JSON.parse(readFileSync(join(HERE, 'markdown-roles.json'), 'utf8')) : {};

// ------------------------------------------------------- blob metadata ----
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif']);
const typeForFile = (f) => (IMAGE_EXT.has(extname(f).toLowerCase()) ? 'Image' : 'File');
const BLOB_FIELD = { Image: 'image', File: 'file' };

/**
 * Width and height from the file itself.
 *
 * The claim the format rests on is that these need not be stored. A stored
 * width can drift from the file it describes; a computed one cannot.
 */
function dimensions(file) {
  const b = readFileSync(file);
  const ext = extname(file).toLowerCase();
  if (ext === '.png') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0..SOF15, excluding the non-frame markers in that range
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    throw new Error(`no SOF marker in ${file}`);
  }
  if (ext === '.svg') {
    const t = b.toString('utf8', 0, 2000);
    const w = /\bwidth="([\d.]+)/.exec(t), h = /\bheight="([\d.]+)/.exec(t);
    if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
    const vb = /viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/.exec(t);
    if (vb) return { width: Number(vb[1]), height: Number(vb[2]) };
    throw new Error(`no dimensions in ${file}`);
  }
  throw new Error(`unsupported image type ${ext}`);
}

// --------------------------------------------------------------- read ----
function walk(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, hits);
    else hits.push(p);
  }
  return hits;
}

/** file path in the tree -> content @id */
function idFor(file) {
  const rel = relative(TREE, file).replace(/\\/g, '/');
  if (rel === 'index.md') return '/';
  return `/${rel.replace(/\/index\.md$/, '').replace(/\.md$/, '')}`;
}

const items = new Map();
for (const file of walk(TREE)) {
  if (!file.endsWith('.md')) continue;
  const text = readFileSync(file, 'utf8');
  const page = mdToPage(text);
  const id = idFor(file);
  page['@id'] = id;
  items.set(id, page);

  // `contents:` names the blobs this folder holds. Everything else about them
  // comes from the file on disk.
  for (const entry of page.blobs || []) {
    const blob = join(dirname(file), entry.file);
    if (!existsSync(blob)) throw new Error(`${id}: contents lists ${entry.file}, which is not on disk`);
    const ext = extname(entry.file).toLowerCase();
    const bid = entry.id ?? entry.file.replace(/\.[^.]+$/, '');
    const type = entry.type ?? typeForFile(entry.file);
    if (!MIME[ext]) throw new Error(`${id}: no content type known for ${entry.file}`);
    // Only images have pixel dimensions. A video or PDF carries size and
    // content type and nothing more.
    const meta = { filename: entry.file, 'content-type': MIME[ext], size: statSync(blob).size };
    if (type === 'Image') Object.assign(meta, dimensions(blob));
    items.set(`${id === '/' ? '' : id}/${bid}`, {
      '@id': `${id === '/' ? '' : id}/${bid}`,
      '@type': type,
      UID: entry.uid,
      id: bid,
      title: entry.title ?? entry.file,
      description: entry.description ?? '',
      rights: entry.rights ?? '',
      exclude_from_nav: entry.exclude_from_nav ?? true,
      [BLOB_FIELD[type]]: meta,
    });
  }
  delete page.blobs;
}

// --------------------------------------------------------------- diff ----
if (!process.argv.includes('--diff')) {
  console.log(`read ${items.size} items from ${TREE}`);
  process.exit(0);
}

function walkSrc(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkSrc(p, hits);
    else if (name === 'data.json') hits.push(p);
  }
  return hits;
}
const src = new Map();
let ROOT_ID = null;
for (const f of walkSrc(SRC)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  if (d['@type'] === 'Plone Site') ROOT_ID = d['@id'];
  src.set(d['@id'], d);
}
if (ROOT_ID && src.has(ROOT_ID)) { src.set('/', src.get(ROOT_ID)); src.delete(ROOT_ID); }

const IMAGE_KEYS = ['UID', 'id', 'title', 'description', 'rights', 'exclude_from_nav'];
let ok = 0, bad = [];
for (const [id, want] of src) {
  const got = items.get(id);
  if (!got) { bad.push(`${id}: missing from the tree`); continue; }
  if (BLOB_FIELD[want['@type']]) {
    const diffs = IMAGE_KEYS.filter((k) => JSON.stringify(want[k]) !== JSON.stringify(got[k]));
    for (const k of ['filename', 'content-type', 'size', 'width', 'height']) {
      const f = BLOB_FIELD[want['@type']];
      if (JSON.stringify(want[f]?.[k]) !== JSON.stringify(got[f]?.[k])) diffs.push(`${f}.${k}`);
    }
    if (diffs.length) bad.push(`${id}: ${diffs.join(', ')}`);
    else ok++;
    continue;
  }
  ok++;
}
console.log(`items in tree : ${items.size}`);
console.log(`items in JSON : ${src.size}`);
console.log(`matched       : ${ok}`);
if (bad.length) {
  console.log(`\nmismatches (${bad.length}):`);
  for (const b of bad.slice(0, 12)) console.log(`  ${b}`);
}
process.exit(bad.length ? 1 : 0);
