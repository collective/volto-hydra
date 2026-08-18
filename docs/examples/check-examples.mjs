#!/usr/bin/env node
/**
 * Compile-checks the framework example code.
 *
 * Two sources, same parsers:
 *   1. the docs — every codeExample tab in `content-md-proto` (the loader inlines
 *      each `{literalinclude}`, so this validates exactly the code the docs show);
 *   2. the renderer files under `examples/{react,vue,svelte,astro}/` (transitional,
 *      until every renderer is referenced from a doc page).
 *
 * - React JSX: acorn + acorn-jsx
 * - Vue SFCs: @vue/compiler-sfc
 * - Svelte: svelte/compiler
 * - Astro: @astrojs/compiler (falls back to a lightweight structural check)
 *
 * Usage: node check-examples.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { readTree } from '../../lib/markdown-mount.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, 'examples');
const docsTree = join(__dirname, '..', 'content-md-proto');

let errors = 0;
let checked = 0;

async function checkReact(code, name) {
  try {
    const { Parser } = await import('acorn');
    const acornJsx = (await import('acorn-jsx')).default;
    Parser.extend(acornJsx()).parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
    checked++;
  } catch (err) {
    console.error(`FAIL react/${name}: ${err.message}`);
    errors++;
  }
}

async function checkVue(code, name) {
  try {
    const { parse } = await import('@vue/compiler-sfc');
    const { errors: parseErrors } = parse(code, { filename: name });
    if (parseErrors.length > 0) {
      for (const e of parseErrors) console.error(`FAIL vue/${name}: ${e.message}`);
      errors++;
    } else {
      checked++;
    }
  } catch (err) {
    console.error(`FAIL vue/${name}: ${err.message}`);
    errors++;
  }
}

async function checkSvelte(code, name) {
  try {
    const { compile } = await import('svelte/compiler');
    compile(code, { filename: name, generate: false });
    checked++;
  } catch (err) {
    console.error(`FAIL svelte/${name}: ${err.message}`);
    errors++;
  }
}

async function checkAstro(code, name) {
  try {
    const { parse } = await import('@astrojs/compiler');
    const result = await parse(code, { position: true });
    const errs = (result.diagnostics || []).filter((d) => d.severity === 0);
    if (errs.length > 0) {
      for (const diag of errs) console.error(`FAIL astro/${name}: ${diag.text}`);
      errors++;
    } else {
      checked++;
    }
  } catch (err) {
    if (err && err.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error(`FAIL astro/${name}: ${err.message}`);
      errors++;
      return;
    }
    // Fallback structural check when @astrojs/compiler isn't installed: catch
    // gross truncation only (unterminated frontmatter, wildly unbalanced braces
    // or angle brackets — tolerant of strings/comments/TS generics).
    let failed = false;
    const fm = code.match(/^\s*---\r?\n/);
    if (fm && !/\r?\n---(\r?\n|$)/.test(code.slice(fm[0].length))) {
      console.error(`FAIL astro/${name}: unterminated frontmatter`); failed = true;
    }
    const o = (code.match(/\{/g) || []).length, c = (code.match(/\}/g) || []).length;
    if (o + c > 0 && o !== c) { console.error(`FAIL astro/${name}: unbalanced braces (${o} vs ${c})`); failed = true; }
    const lt = (code.match(/</g) || []).length, gt = (code.match(/>/g) || []).length;
    if (Math.abs(lt - gt) > 2) { console.error(`FAIL astro/${name}: unbalanced angle brackets (${lt} vs ${gt})`); failed = true; }
    if (failed) errors++; else checked++;
  }
}

// Language (a codeExample tab's `language`, or a file extension) -> checker.
const CHECKERS = {
  jsx: checkReact, javascript: null, js: null,
  vue: checkVue, svelte: checkSvelte, astro: checkAstro,
};
const EXT_LANG = { '.jsx': 'jsx', '.vue': 'vue', '.svelte': 'svelte', '.astro': 'astro' };

async function checkByLang(lang, code, name) {
  const fn = CHECKERS[lang];
  if (fn) await fn(code, name);
}

/** A tab may show more than one file (e.g. slate = SlateBlock + SlateNode),
 *  delimited by a `<!-- File.ext -->` / `// File.ext` filename comment. Split so
 *  each file is validated on its own, not glued into one (in)valid component. */
function splitFiles(code) {
  const marker = /^[ \t]*(?:<!--[ \t]*([\w.\-/]+\.\w+)[ \t]*-->|\/\/[ \t]*([\w.\-/]+\.\w+))[ \t]*$/gm;
  const at = [];
  for (let m; (m = marker.exec(code)); ) at.push({ i: m.index, name: m[1] || m[2] });
  if (at.length < 2) return [{ name: null, code }];
  return at.map((a, k) => ({ name: a.name, code: code.slice(a.i, at[k + 1]?.i ?? code.length).trim() }));
}

// 1. The docs: every codeExample tab (the loader has inlined its literalincludes).
if (existsSync(docsTree)) {
  const { items } = readTree(docsTree);
  const tabs = [];
  const walk = (o, page) => {
    if (!o || typeof o !== 'object') return;
    if (o['@type'] === 'codeExample') for (const t of (o.tabs || [])) tabs.push({ lang: t.language, code: t.code, name: `${page}#${t.label}` });
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, page);
  };
  for (const [id, page] of items) walk(page.blocks, id);
  for (const t of tabs) if (t.code) {
    for (const f of splitFiles(t.code)) await checkByLang(t.lang, f.code, f.name ? `${t.name}:${f.name}` : t.name);
  }
  console.log(`Checked ${tabs.filter((t) => CHECKERS[t.lang]).length} codeExample tabs from the docs.`);
}

// 2. The renderer files (transitional — until every renderer is referenced).
for (const [dir, ext] of [['react', '.jsx'], ['vue', '.vue'], ['svelte', '.svelte'], ['astro', '.astro']]) {
  const d = join(examplesDir, dir);
  if (!existsSync(d)) continue;
  for (const file of readdirSync(d)) {
    if (extname(file) !== ext) continue;
    await checkByLang(EXT_LANG[ext], readFileSync(join(d, file), 'utf-8'), file);
  }
}

console.log(`\nChecked ${checked} examples, ${errors} errors.`);
if (errors > 0) process.exit(1);
