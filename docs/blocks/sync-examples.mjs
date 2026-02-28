#!/usr/bin/env node
/**
 * Syncs code examples from real component files into markdown documentation
 * AND into Plone content JSON files that power the Hydra docs site.
 *
 * Source of truth: files in examples/{react,vue,svelte}/
 * The markdown uses <!-- file: path --> markers to indicate where file content
 * should be injected. The next fenced code block after each marker is replaced
 * with the file's content.
 *
 * After updating the markdown, the script parses each markdown file and syncs
 * the schema, JSON, React, and Vue code sections into the corresponding Plone
 * content JSON files in docs/content/.
 *
 * Usage:
 *   node sync-examples.mjs          # update markdown and content JSON from files
 *   node sync-examples.mjs --check  # exit non-zero if anything is out of sync
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const checkMode = process.argv.includes('--check');

// Match <!-- file: path --> followed by a fenced code block
const MARKER_RE = /^(<!-- file: (.+?) -->)\n```(\w+)\n([\s\S]*?)```/gm;

let outOfSync = false;

const mdFiles = readdirSync(__dirname).filter(f => f.endsWith('.md') && f !== 'README.md');

// --- Phase 1: Sync example files into markdown ---

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

// --- Phase 2: Sync markdown content into Plone content JSON ---

// Map markdown filename -> content JSON UID directory
const MD_TO_CONTENT_UID = {
  'accordion.md': 'f8cd4a2d8d7c4703b4e41d2093b21aed',
  'columns.md': '99c70917b6894af08dd306fdbc0eff6a',
  'form.md': '13de82575e16493fbc54514e548a9f3c',
  'image.md': '40a436ad604f4f80aeafe0977806760a',
  'listing.md': '6bd32a3367ea4254b295db642655b9d3',
  'search.md': '928010d84e5d4df2b2282f3e179d6b1a',
  'slate.md': '2508797173824f0e9f82bb2e7cfe922d',
  'table.md': '102f648399914851951ffa3fefc8665c',
  'teaser.md': 'bd2b39d2745847db82ed197a4eb1effc',
};

const CONTENT_DIR = join(__dirname, '..', 'content', 'content', 'content');
const PLAINTEXT_MAX = 200;

// Map content JSON placeholder names to section keys
const PLACEHOLDER_TO_SECTION = {
  'schema': 'schema',
  'json-data': 'json',
  'react-code': 'react',
  'vue-code': 'vue',
};

/**
 * Extract fenced code blocks from a chunk of markdown text.
 * Returns array of { lang, content, fileName } objects.
 */
function extractCodeBlocks(text) {
  const blocks = [];
  const re = /(?:<!-- file: (.+?) -->\n)?```(\w+)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    blocks.push({
      fileName: m[1] ? basename(m[1]) : null,
      lang: m[2],
      content: m[3].trimEnd(),
    });
  }
  return blocks;
}

/**
 * Parse a markdown file and extract content for each content JSON placeholder.
 * Returns { schema, json, react, vue } where each is a string or null.
 */
function extractMdSections(mdContent) {
  const result = { schema: null, json: null, react: null, vue: null };

  // Split into top-level sections by ## headings
  const topSections = {};
  for (const part of mdContent.split(/^(?=## )/m)) {
    const heading = part.match(/^## (.+)\n/);
    if (heading) topSections[heading[1].trim()] = part;
  }

  // Schema: all ```js``` blocks concatenated
  if (topSections['Schema']) {
    const blocks = extractCodeBlocks(topSections['Schema']).filter(b => b.lang === 'js');
    if (blocks.length > 0) {
      result.schema = blocks.map(b => b.content).join('\n\n');
    }
  }

  // JSON Block Data: the ```json``` block
  if (topSections['JSON Block Data']) {
    const blocks = extractCodeBlocks(topSections['JSON Block Data']).filter(b => b.lang === 'json');
    if (blocks.length > 0) {
      result.json = blocks.map(b => b.content).join('\n\n');
    }
  }

  // Rendering section contains ### React and ### Vue subsections
  if (topSections['Rendering']) {
    const subSections = {};
    for (const part of topSections['Rendering'].split(/^(?=### )/m)) {
      const heading = part.match(/^### (.+)\n/);
      if (heading) subSections[heading[1].trim()] = part;
    }

    // React: all ```jsx``` blocks concatenated with \n\n
    if (subSections['React']) {
      const blocks = extractCodeBlocks(subSections['React']).filter(b => b.lang === 'jsx');
      if (blocks.length > 0) {
        result.react = blocks.map(b => b.content).join('\n\n');
      }
    }

    // Vue: all ```vue``` blocks; multi-file gets <!-- FileName.vue --> headers
    if (subSections['Vue']) {
      const blocks = extractCodeBlocks(subSections['Vue']).filter(b => b.lang === 'vue');
      if (blocks.length === 1) {
        result.vue = blocks[0].content;
      } else if (blocks.length > 1) {
        result.vue = blocks.map(b => {
          const header = b.fileName ? `<!-- ${b.fileName} -->\n` : '';
          return `${header}${b.content}`;
        }).join('\n\n');
      }
    }
  }

  return result;
}

/**
 * Update a Slate text block's plaintext and value fields.
 */
function updateSlateBlock(block, text) {
  block.plaintext = text.length > PLAINTEXT_MAX ? text.slice(0, PLAINTEXT_MAX) : text;
  block.value = [{ type: 'p', children: [{ text }] }];
}

for (const mdFile of mdFiles) {
  const uid = MD_TO_CONTENT_UID[mdFile];
  if (!uid) continue; // No content JSON for this md file (e.g., hero.md, slider.md)

  const jsonPath = join(CONTENT_DIR, uid, 'data.json');
  if (!existsSync(jsonPath)) {
    console.error(`WARNING: content JSON not found for ${mdFile}: ${jsonPath}`);
    continue;
  }

  const mdContent = readFileSync(join(__dirname, mdFile), 'utf-8');
  const sections = extractMdSections(mdContent);

  const originalJson = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(originalJson);
  let contentChanged = false;

  for (const block of Object.values(data.blocks)) {
    if (block.templateId !== 'resolveuid/tpl-block-reference-layout') continue;

    const sectionKey = PLACEHOLDER_TO_SECTION[block.placeholder];
    if (!sectionKey) continue;

    const newText = sections[sectionKey];
    if (newText == null) continue;

    const currentText = block.value?.[0]?.children?.[0]?.text;
    if (currentText === newText) continue;

    updateSlateBlock(block, newText);
    contentChanged = true;
  }

  if (contentChanged) {
    const updatedJson = JSON.stringify(data, null, 2) + '\n';
    if (updatedJson !== originalJson) {
      outOfSync = true;
      if (checkMode) {
        console.error(`OUT OF SYNC: content JSON for ${mdFile}`);
      } else {
        writeFileSync(jsonPath, updatedJson, 'utf-8');
        console.log(`Updated content JSON: ${mdFile} -> ${uid}/data.json`);
      }
    }
  }
}

if (checkMode && outOfSync) {
  console.error('\nFiles are out of sync with example files. Run: node docs/blocks/sync-examples.mjs');
  process.exit(1);
}

if (!outOfSync) {
  console.log('All files are in sync with example files.');
}
