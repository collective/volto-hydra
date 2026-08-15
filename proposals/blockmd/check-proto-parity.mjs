#!/usr/bin/env node
/**
 * Decode every exported markdown page back through the engine and diff its
 * blocks against the original JSON. This is the "mock API reads the markdown and
 * gets the same JSON" check, at the block level.
 *
 *   node proposals/blockmd/check-proto-parity.mjs
 *
 * Two differences are ignored (both derived / normalisation noise, as in the
 * original check-parity): `plaintext` (recomputed from value) and an empty
 * `styles: {}` (a default the readable prototypes omit). A page whose body still
 * has a not-yet-engine-driven clean form (slateTable, gridBlock) will error or
 * differ -- that is the honest signal of what is left to drive.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { decodePage } from '../../lib/prototype-mapping.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INKA = resolve(HERE, '../..');
const MD = resolve(INKA, 'docs/content-md-proto');
const SRC = resolve(INKA, 'docs/content/content/content');

/** Comparison view: drop plaintext, empty styles, and empty text leaves. */
function semantic(v) {
  if (Array.isArray(v)) return v.map(semantic).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'text' && v.text === '') return undefined;
    const out = {};
    for (const k of keys.sort()) {
      if (k === 'plaintext') continue;
      const r = semantic(v[k]);
      if (r === undefined) continue;
      if (k === 'styles' && r && typeof r === 'object' && !Array.isArray(r) && !Object.keys(r).length) continue;
      out[k] = r;
    }
    return out;
  }
  return v;
}
const eq = (a, b) => JSON.stringify(semantic(a)) === JSON.stringify(semantic(b));

/** md file -> the original data.json for the same content item. */
function originalFor(mdPath) {
  let rel = mdPath.slice(MD.length + 1);
  rel = rel.endsWith('/index.md') ? rel.slice(0, -'/index.md'.length) : rel.replace(/\.md$/, '');
  const p = rel ? join(SRC, rel, 'data.json') : join(SRC, 'data.json');
  return existsSync(p) ? p : null;
}

function walk(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, hits);
    else if (name.endsWith('.md')) hits.push(p);
  }
  return hits;
}

let pass = 0, diff = 0, error = 0, skip = 0;
const problems = [];
for (const md of walk(MD)) {
  const src = originalFor(md);
  if (!src) { skip += 1; continue; }
  const orig = JSON.parse(readFileSync(src, 'utf8'));
  if (!orig.blocks || !Object.keys(orig.blocks).length) { skip += 1; continue; }

  let decoded;
  try { decoded = decodePage(readFileSync(md, 'utf8')); }
  catch (e) { error += 1; problems.push(`ERROR ${md.slice(MD.length + 1)}: ${e.message.slice(0, 80)}`); continue; }

  const layoutOk = eq(decoded.blocks_layout, orig.blocks_layout);
  const badUids = Object.keys(orig.blocks).filter((u) => !eq(decoded.blocks?.[u], orig.blocks[u]));
  if (layoutOk && !badUids.length) { pass += 1; continue; }
  diff += 1;
  problems.push(`DIFF  ${md.slice(MD.length + 1)}: ${!layoutOk ? 'layout; ' : ''}${badUids.length} block(s) [${badUids.slice(0, 3).map((u) => orig.blocks[u]['@type']).join(', ')}]`);
}

console.log(`\nparity: ${pass} pass, ${diff} diff, ${error} error  (${skip} skipped, no blocks)\n`);
for (const p of problems.slice(0, 30)) console.log(`  ${p}`);
if (problems.length > 30) console.log(`  …and ${problems.length - 30} more`);
