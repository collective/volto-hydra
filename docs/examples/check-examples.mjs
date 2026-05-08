#!/usr/bin/env node
/**
 * Compile-checks all example component files.
 *
 * - React JSX: parsed with acorn + acorn-jsx
 * - Vue SFCs: parsed with @vue/compiler-sfc
 * - Svelte: compiled with svelte/compiler
 *
 * Install dependencies first: cd docs/blocks && pnpm install
 *
 * Usage:
 *   node check-examples.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, 'examples');

let errors = 0;
let checked = 0;

async function checkReact(filePath, name) {
  try {
    const { Parser } = await import('acorn');
    const acornJsx = (await import('acorn-jsx')).default;
    const JsxParser = Parser.extend(acornJsx());
    const code = readFileSync(filePath, 'utf-8');
    JsxParser.parse(code, {
      sourceType: 'module',
      ecmaVersion: 'latest',
    });
    checked++;
  } catch (err) {
    console.error(`FAIL react/${name}: ${err.message}`);
    errors++;
  }
}

async function checkVue(filePath, name) {
  try {
    const { parse } = await import('@vue/compiler-sfc');
    const code = readFileSync(filePath, 'utf-8');
    const { errors: parseErrors } = parse(code, { filename: name });
    if (parseErrors.length > 0) {
      for (const e of parseErrors) {
        console.error(`FAIL vue/${name}: ${e.message}`);
      }
      errors++;
    } else {
      checked++;
    }
  } catch (err) {
    console.error(`FAIL vue/${name}: ${err.message}`);
    errors++;
  }
}

async function checkSvelte(filePath, name) {
  try {
    const { compile } = await import('svelte/compiler');
    const code = readFileSync(filePath, 'utf-8');
    compile(code, {
      filename: name,
      generate: false, // parse + validate only, no codegen
    });
    checked++;
  } catch (err) {
    console.error(`FAIL svelte/${name}: ${err.message}`);
    errors++;
  }
}

// Check React files
const reactDir = join(examplesDir, 'react');
for (const file of readdirSync(reactDir)) {
  if (extname(file) === '.jsx') {
    await checkReact(join(reactDir, file), file);
  }
}

// Check Vue files
const vueDir = join(examplesDir, 'vue');
for (const file of readdirSync(vueDir)) {
  if (extname(file) === '.vue') {
    await checkVue(join(vueDir, file), file);
  }
}

// Check Svelte files
const svelteDir = join(examplesDir, 'svelte');
for (const file of readdirSync(svelteDir)) {
  if (extname(file) === '.svelte') {
    await checkSvelte(join(svelteDir, file), file);
  }
}

console.log(`\nChecked ${checked} files, ${errors} errors.`);
if (errors > 0) {
  process.exit(1);
}
