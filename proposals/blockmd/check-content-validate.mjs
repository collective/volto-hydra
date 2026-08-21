#!/usr/bin/env node
/**
 * The content sanity GATE: run lib/content-validator over the committed content
 * trees and EXIT NON-ZERO on any problem. The mock API runs the same checks at
 * load time, but "loud but non-fatal" -- warnings you can miss. This is the CI
 * teeth: blocks_layout integrity, schema type-checks, cross-tree references, and
 * the single-node slate rule all fail the build instead of scrolling past.
 *
 *   node proposals/blockmd/check-content-validate.mjs [tree ...]
 *
 * Defaults to both trees (docs + site). All trees are validated as ONE universe
 * so a cross-tree href (docs -> site home) resolves instead of false-flagging.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { validateTree } from '../../lib/content-validator.mjs';
import { sharedBlocksConfig } from '../../tests-playwright/fixtures/shared-block-schemas.js';
import { allBlocksConfig } from '../../tests-playwright/fixtures/core-block-schemas.js';

const INKA = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_TREES = [
  resolve(INKA, 'docs/content/content/content'),
  resolve(INKA, '../content/content'),
];
const trees = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => resolve(p))
  : DEFAULT_TREES;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'data.json') out.push(p);
  }
  return out;
}

const items = [];
for (const tree of trees) {
  for (const f of walk(tree)) {
    const item = JSON.parse(readFileSync(f, 'utf8'));
    // Mirror the mock API (mock-plone-api.cjs:1159): the Plone Site root is
    // stored as `@id: /Plone` but SERVED at `/`, and every link uses `/`. Rename
    // it to its served path so cross-tree href checks resolve against reality.
    if (item['@id'] === '/Plone') item['@id'] = '/';
    items.push(item);
  }
}

const schema = allBlocksConfig(sharedBlocksConfig);
const problems = validateTree(items, { schema });

console.log(`\ncontent-validate: ${items.length} items across ${trees.length} tree(s)`);
if (!problems.length) {
  console.log('  ok — no problems\n');
  process.exit(0);
}
console.log(`  ${problems.length} problem(s):\n`);
for (const p of problems) console.log(`  ${p}`);
console.log('');
process.exit(1);
