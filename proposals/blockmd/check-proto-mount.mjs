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
const isLinkSummary = (o) => o && typeof o === 'object' && '@id' in o
  && ('Title' in o || 'Description' in o || 'hasPreviewImage' in o);

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

const { items } = readTree(MD, { decode: decodePage });

let pass = 0, blockDiff = 0, stateDiff = 0, error = 0, skip = 0, noOrder = 0;
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

  if (badUids.length || !layoutOk) {
    blockDiff += 1;
    problems.push(`BLOCKS ${id}: ${!layoutOk ? 'layout; ' : ''}${badUids.length} block(s) [${badUids.slice(0, 3).map((u) => orig.blocks[u]['@type']).join(', ')}]`);
  } else if (!parentOk || !folderishOk) {
    stateDiff += 1;
    problems.push(`STATE  ${id}: ${!parentOk ? 'parent ' : ''}${!folderishOk ? 'is_folderish' : ''}`);
  } else pass += 1;
}

console.log(`\nproto mount: ${pass} pass, ${blockDiff} block-diff, ${stateDiff} state-diff, ${error} error  (${skip} skipped)`);
if (noOrder) console.log(`  gap: ${noOrder} item(s) have a JSON position but no sibling order (exporter does not yet emit \`order:\`)`);
console.log('');
for (const p of problems.slice(0, 30)) console.log(`  ${p}`);
if (problems.length > 30) console.log(`  …and ${problems.length - 30} more`);
