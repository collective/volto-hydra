#!/usr/bin/env node
/**
 * The mount agreement check for the prototype format: read the exported proto
 * tree through the SAME tree reader the mock API mounts (`readTree`), decoding
 * block bodies with `decodePage`, and diff every served item against the JSON
 * the frontend would otherwise be served.
 *
 *   node proposals/blockmd/check-proto-mount.mjs
 *
 * This goes one step past check-proto-parity: that proves a page's blocks decode
 * identically; this proves the whole content object the server hands out --
 * blocks AND the server state the reader DERIVES from tree position (`parent`,
 * `is_folderish`) -- matches. Gaps the exporter does not yet fill (sibling
 * `order`, `blobs`) are reported, not hidden: a silent gap reads as "covered".
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { decodePage } from '../../lib/prototype-mapping.mjs';
import { readTree } from '../../lib/markdown-mount.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INKA = resolve(HERE, '../..');
const MD = resolve(INKA, 'docs/content-md-proto');
const SRC = resolve(INKA, 'docs/content/content/content');

// A resolved link summary carries only `@id` when authored; the stored JSON has
// the target's brain resolved in. The markdown owns the `@id`; the API restores
// the rest. So compare links on the target alone (see the /link widget).
const LINK_KEYS = new Set(['@id', '@type', 'title', 'Title', 'description', 'Description',
  'hasPreviewImage', 'getRemoteUrl', 'head_title', 'image_field', 'image_scales', 'review_state']);
const isLinkSummary = (o) => o && typeof o === 'object' && !Array.isArray(o)
  && '@id' in o && Object.keys(o).every((k) => LINK_KEYS.has(k));

/** Comparison view: drop derived/default-nothing, collapse link summaries. */
function semantic(v) {
  if (Array.isArray(v)) return v.map(semantic).filter((x) => x !== undefined);
  if (isLinkSummary(v)) return { '@id': v['@id'] };
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'text' && v.text === '') return undefined;
    const out = {};
    for (const k of keys.sort()) {
      if (k === 'plaintext' || k === 'key') continue;
      if (v[k] === false) continue;
      const r = semantic(v[k]);
      if (r === undefined) continue;
      if (r && typeof r === 'object' && !Array.isArray(r) && !Object.keys(r).length) continue;
      out[k] = r;
    }
    return out;
  }
  return v;
}
const eq = (a, b) => JSON.stringify(semantic(a)) === JSON.stringify(semantic(b));

/** content path (@id) -> the original data.json for the same item. */
function originalFor(id) {
  const rel = id === '/' ? '' : id.replace(/^\//, '');
  const p = rel ? join(SRC, rel, 'data.json') : join(SRC, 'data.json');
  return existsSync(p) ? p : null;
}

// The reader normalises the ROOT to '/'; the JSON stores it as its full @id.
const canonId = (jsonId, rootId) => (jsonId === rootId ? '/' : jsonId);

// No decode option: use the mount's default (decodeAuto), the exact server path.
const { items, blobFiles } = readTree(MD);

// Images/files live in flattened dirs (docs-images-x-001/) with logical @ids, so
// map @id -> its JSON by walking, not by path. Used to verify blob items, which
// have no data.json at their content path.
function walkFiles(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, hits);
    else if (name === 'data.json') hits.push(p);
  }
  return hits;
}
const byId = {};
for (const f of walkFiles(SRC)) {
  try { const d = JSON.parse(readFileSync(f, 'utf-8')); if (d['@id']) byId[d['@id']] = d; } catch { /* skip */ }
}
const rootJsonId = Object.values(byId).find((d) => d['@type'] === 'Plone Site')?.['@id'];
const jsonFor = (p) => byId[p] ?? Object.values(byId).find((d) => canonId(d['@id'], rootJsonId) === p);

// Block types that RENDER their href summary. A teaser shows href[0].title /
// description / hasPreviewImage when `overwrite` is off (teaser.md:80); a button
// or link renders only href[0]['@id'] (button.md:70), so its embedded href.title
// is edit-time cruft no consumer reads -- checking it would be a false positive.
const RENDERS_HREF_SUMMARY = new Set(['teaser']);

// The link collapse compares only @id, so a dropped rendered sub-field (a
// teaser's href.title) would pass silently. Check the RENDERED href fields
// directly: title is a hard requirement (the frontend shows it when overwrite is
// off); hasPreviewImage is a reported residual (the clean link carries @id+title
// but not the preview flag yet).
function hrefRender(served, stored) {
  const out = { titleBad: [], previewGap: 0 };
  for (const [uid, sb] of Object.entries(stored)) {
    if (!RENDERS_HREF_SUMMARY.has(sb['@type'])) continue;
    const s = Array.isArray(sb.href) && sb.href[0]?.['@id'] ? sb.href[0] : null;
    if (!s || s.title === undefined) continue; // no rendered title to preserve
    const v = served?.[uid]?.href?.[0] ?? {};
    if (v.title !== s.title) out.titleBad.push(`${sb['@type']} href.title ${JSON.stringify(v.title)}!=${JSON.stringify(s.title)}`);
    if (s.hasPreviewImage && v.hasPreviewImage === undefined) out.previewGap += 1;
  }
  return out;
}

let pass = 0, blockDiff = 0, stateDiff = 0, error = 0, skip = 0, noOrder = 0, renderDiff = 0, previewGap = 0;
const problems = [];
for (const [id, item] of items) {
  // Blob items (Image/File synthesised from `blobs:`) have no data.json of
  // their own; they are checked by the blob gap, below.
  const src = originalFor(id);
  if (!src) { skip += 1; continue; }
  let orig;
  try { orig = JSON.parse(readFileSync(src, 'utf-8')); }
  catch (e) { error += 1; problems.push(`ERROR ${id}: ${e.message.slice(0, 70)}`); continue; }
  if (!orig.blocks || !Object.keys(orig.blocks).length) { skip += 1; continue; }

  const rootId = orig['@type'] === 'Plone Site' ? orig['@id'] : null;
  const badUids = Object.keys(orig.blocks).filter((u) => !eq(item.blocks?.[u], orig.blocks[u]));
  const layoutOk = eq(item.blocks_layout, orig.blocks_layout);

  // Server state the reader DERIVES (not stored in the markdown).
  const parentOk = orig.parent
    ? eq(item.parent?.['@id'] && canonId(item.parent['@id'], rootId), canonId(orig.parent['@id'], rootId))
    : true;
  const folderishOk = orig.is_folderish === undefined || item.is_folderish === orig.is_folderish;
  if (item.getObjPositionInParent === undefined && orig.getObjPositionInParent != null) noOrder += 1;

  const render = hrefRender(item.blocks, orig.blocks);
  previewGap += render.previewGap;

  if (badUids.length || !layoutOk) {
    blockDiff += 1;
    problems.push(`BLOCKS ${id}: ${!layoutOk ? 'layout; ' : ''}${badUids.length} block(s) [${badUids.slice(0, 3).map((u) => orig.blocks[u]['@type']).join(', ')}]`);
  } else if (!parentOk || !folderishOk) {
    stateDiff += 1;
    problems.push(`STATE  ${id}: ${!parentOk ? 'parent ' : ''}${!folderishOk ? 'is_folderish' : ''}`);
  } else if (render.titleBad.length) {
    renderDiff += 1;
    problems.push(`RENDER ${id}: ${render.titleBad.slice(0, 2).join('; ')}`);
  } else pass += 1;
}

// Blob items are reconstructed from `blobs:` (no data.json at their content
// path), so verify against the JSON by @id, plus that the bytes are on disk.
let blobOk = 0; const blobBad = [];
for (const [p, file] of blobFiles) {
  const it = items.get(p); const o = jsonFor(p);
  if (!o) { blobBad.push(`${p}: no json`); continue; }
  const field = it['@type'] === 'Image' ? 'image' : 'file';
  const diffs = [];
  for (const k of ['@type', 'id', 'UID', 'title', 'description', 'review_state', 'exclude_from_nav']) {
    if (JSON.stringify(it[k]) !== JSON.stringify(o[k])) diffs.push(k);
  }
  if (it[field]?.size !== o[field]?.size) diffs.push('size');
  if (!existsSync(file)) diffs.push('bytes-missing');
  if (diffs.length) blobBad.push(`BLOB   ${p}: ${diffs.join(',')}`); else blobOk += 1;
}
problems.push(...blobBad);

console.log(`\nproto mount: ${pass} pass, ${blockDiff} block-diff, ${stateDiff} state-diff, ${renderDiff} render-diff, ${error} error  (${skip} skipped)`);
console.log(`blobs: ${blobOk}/${blobFiles.size} reconstruct (fields + size + bytes) vs JSON`);
if (noOrder) console.log(`  gap: ${noOrder} item(s) have a JSON position but no sibling order (exporter does not yet emit \`order:\`)`);
if (previewGap) console.log(`  gap: ${previewGap} teaser href(s) drop hasPreviewImage (clean link carries @id+title, not the preview flag)`);
console.log('');
for (const p of problems.slice(0, 30)) console.log(`  ${p}`);
if (problems.length > 30) console.log(`  …and ${problems.length - 30} more`);
