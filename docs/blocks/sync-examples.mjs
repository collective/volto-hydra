#!/usr/bin/env node
/**
 * Syncs code examples from real component files into markdown documentation.
 *
 * Source of truth: files in examples/{react,vue,svelte}/
 * The markdown uses <!-- file: path --> markers to indicate where file content
 * should be injected. The next fenced code block after each marker is replaced
 * with the file's content.
 *
 * Usage:
 *   node sync-examples.mjs          # update markdown from files
 *   node sync-examples.mjs --check  # exit non-zero if markdown is out of sync
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const checkMode = process.argv.includes('--check');

// Match <!-- file: path --> followed by a fenced code block
const MARKER_RE = /^(<!-- file: (.+?) -->)\n```(\w+)\n([\s\S]*?)```/gm;

let outOfSync = false;

const mdFiles = readdirSync(__dirname).filter(f => f.endsWith('.md') && f !== 'README.md');

for (const mdFile of mdFiles) {
  const mdPath = join(__dirname, mdFile);
  const original = readFileSync(mdPath, 'utf-8');
  let updated = original;

  updated = updated.replace(MARKER_RE, (match, marker, filePath, lang) => {
    const absPath = join(__dirname, filePath);
    let content;
    try {
      content = readFileSync(absPath, 'utf-8').trimEnd();
    } catch (err) {
      console.error(`ERROR: ${mdFile}: referenced file not found: ${filePath}`);
      process.exitCode = 1;
      return match;
    }
    return `${marker}\n\`\`\`${lang}\n${content}\n\`\`\``;
  });

  if (updated !== original) {
    outOfSync = true;
    if (checkMode) {
      console.error(`OUT OF SYNC: ${mdFile}`);
    } else {
      writeFileSync(mdPath, updated, 'utf-8');
      console.log(`Updated: ${mdFile}`);
    }
  }
}

if (checkMode && outOfSync) {
  console.error('\nMarkdown is out of sync with example files. Run: node docs/blocks/sync-examples.mjs');
  process.exit(1);
}

if (!outOfSync) {
  console.log('All markdown files are in sync with example files.');
}
