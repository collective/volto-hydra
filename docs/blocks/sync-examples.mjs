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
 * the schema, JSON, React, Vue, and Svelte code sections into codeExample
 * blocks in the corresponding Plone content JSON files in docs/content/.
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
  'button.md': '405582582e70493c96a6c549444a1eaa',
  'columns.md': '99c70917b6894af08dd306fdbc0eff6a',
  'form.md': '13de82575e16493fbc54514e548a9f3c',
  'heading.md': '2f69aa417e894fd3bf23d393287b369e',
  'highlight.md': '8416628543f146ff9a18d281c03e2399',
  'image.md': '40a436ad604f4f80aeafe0977806760a',
  'introduction.md': '00cef5f245a342958288ace545e3c097',
  'listing.md': '6bd32a3367ea4254b295db642655b9d3',
  'search.md': '928010d84e5d4df2b2282f3e179d6b1a',
  'separator.md': '546e82cce6c842d0a4046a0131539bd2',
  'slate.md': '2508797173824f0e9f82bb2e7cfe922d',
  'table.md': '102f648399914851951ffa3fefc8665c',
  'teaser.md': 'bd2b39d2745847db82ed197a4eb1effc',
  'toc.md': '3906609d0456404ca7146f6aa1f12f32',
  'video.md': '6d37dd19ef754344aaa254fa288e44b4',
};

const CONTENT_DIR = join(__dirname, '..', 'content', 'content', 'content');
const TEMPLATE_ID = 'resolveuid/tpl-block-reference-layout';

// Old placeholders to remove during migration
const OLD_PLACEHOLDERS = new Set([
  'react-heading', 'vue-heading',
  'react-code', 'vue-code',
  'examples-desc',  // replaced by per-section descriptions
]);

/**
 * Generate a 6-char hex suffix for tab @id fields.
 */
function hexSuffix() {
  return Math.random().toString(16).slice(2, 8);
}

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
  const result = { schema: null, json: null, react: null, vue: null, svelte: null };

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

    // Svelte: all ```svelte``` blocks; multi-file gets <!-- FileName.svelte --> headers
    if (subSections['Svelte']) {
      const blocks = extractCodeBlocks(subSections['Svelte']).filter(b => b.lang === 'svelte');
      if (blocks.length === 1) {
        result.svelte = blocks[0].content;
      } else if (blocks.length > 1) {
        result.svelte = blocks.map(b => {
          const header = b.fileName ? `<!-- ${b.fileName} -->\n` : '';
          return `${header}${b.content}`;
        }).join('\n\n');
      }
    }
  }

  return result;
}

/**
 * Build a codeExample block with the given tabs.
 */
function makeCodeExampleBlock(blockId, templateInstanceId, placeholder, tabs) {
  return {
    '@type': 'codeExample',
    templateId: TEMPLATE_ID,
    templateInstanceId,
    placeholder,
    tabs: tabs.map(t => ({
      '@id': `${blockId}-${t.language}-${hexSuffix()}`,
      label: t.label,
      language: t.language,
      code: t.code || '',
    })),
  };
}

/**
 * Update an existing codeExample block's tab code content.
 * Returns true if anything changed.
 */
function updateCodeExampleTabs(block, tabUpdates) {
  let changed = false;
  for (const { language, code } of tabUpdates) {
    if (code == null) continue;
    const tab = block.tabs.find(t => t.language === language);
    if (tab && tab.code !== code) {
      tab.code = code;
      changed = true;
    }
  }
  return changed;
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

  // Find all template blocks and their instance ID
  const tplBlocks = {};
  let instanceId = null;
  let prefix = null; // e.g., "ref-image"
  for (const [blockId, block] of Object.entries(data.blocks)) {
    if (block.templateId !== TEMPLATE_ID) continue;
    tplBlocks[block.placeholder] = { blockId, block };
    if (!instanceId) instanceId = block.templateInstanceId;
    if (!prefix) {
      // Derive prefix from block ID: "ref-image-schema" -> "ref-image"
      const parts = blockId.split('-');
      // Find the name part: ref-<name>-<placeholder>
      // The placeholder may contain hyphens (e.g., "json-data"), so match from known placeholders
      for (const ph of [...OLD_PLACEHOLDERS, 'schema', 'json-data', 'rendering', 'sep', 'examples-heading', 'examples-desc', 'schema-heading', 'schema-desc', 'json-heading', 'json-desc', 'rendering-heading', 'rendering-desc']) {
        if (blockId.endsWith(`-${ph}`)) {
          prefix = blockId.slice(0, -(ph.length + 1));
          break;
        }
      }
    }
  }

  // Bootstrap: if no template blocks found, create the initial sep + heading anchor
  if (!instanceId || !prefix) {
    // Derive prefix from md filename: "introduction.md" → "ref-introduction"
    // Special case: "button.md" → "ref-button" (not "ref-__button")
    const name = mdFile.replace('.md', '');
    prefix = `ref-${name}`;
    instanceId = `tpl-inst-${name}`;

    // Create the separator and heading anchor blocks
    const sepId = `${prefix}-sep`;
    data.blocks[sepId] = {
      '@type': 'separator',
      fixed: true,
      readOnly: true,
      templateId: TEMPLATE_ID,
      templateInstanceId: instanceId,
      placeholder: 'sep',
    };

    const headingId = `${prefix}-heading`;
    data.blocks[headingId] = {
      '@type': 'slate',
      fixed: true,
      readOnly: true,
      templateId: TEMPLATE_ID,
      templateInstanceId: instanceId,
      placeholder: 'heading',
    };

    contentChanged = true;
  }

  // --- Migration: remove old-format blocks, ensure new-format blocks exist ---

  // Remove old placeholder blocks (headings for schema/json/react/vue + react-code/vue-code)
  for (const oldPh of OLD_PLACEHOLDERS) {
    const entry = tplBlocks[oldPh];
    if (entry) {
      delete data.blocks[entry.blockId];
      const idx = data.blocks_layout.items.indexOf(entry.blockId);
      if (idx !== -1) data.blocks_layout.items.splice(idx, 1);
      delete tplBlocks[oldPh];
      contentChanged = true;
    }
  }

  // Ensure fixed heading/description blocks exist for each section
  const fixedBlocks = {
    'schema-heading': 'schema-heading',
    'schema-desc': 'schema-desc',
    'json-heading': 'json-heading',
    'json-desc': 'json-desc',
    'rendering-heading': 'rendering-heading',
    'rendering-desc': 'rendering-desc',
  };
  for (const [suffix, placeholder] of Object.entries(fixedBlocks)) {
    const blockId = `${prefix}-${suffix}`;
    if (!data.blocks[blockId]) {
      // These are fixed+readOnly template blocks — content comes from the template
      data.blocks[blockId] = {
        '@type': 'slate',
        fixed: true,
        readOnly: true,
        templateId: TEMPLATE_ID,
        templateInstanceId: instanceId,
        placeholder,
      };
      contentChanged = true;
    }
  }

  // Ensure schema codeExample block exists
  const schemaId = `${prefix}-schema`;
  if (!data.blocks[schemaId] || data.blocks[schemaId]['@type'] !== 'codeExample') {
    // Remove old slate version if present
    if (data.blocks[schemaId]) {
      const idx = data.blocks_layout.items.indexOf(schemaId);
      if (idx !== -1) data.blocks_layout.items.splice(idx, 1);
    }
    data.blocks[schemaId] = makeCodeExampleBlock(schemaId, instanceId, 'schema', [
      { label: 'Schema', language: 'javascript', code: sections.schema || '' },
    ]);
    contentChanged = true;
  }

  // Ensure json-data codeExample block exists
  const jsonId = `${prefix}-json-data`;
  if (!data.blocks[jsonId] || data.blocks[jsonId]['@type'] !== 'codeExample') {
    if (data.blocks[jsonId]) {
      const idx = data.blocks_layout.items.indexOf(jsonId);
      if (idx !== -1) data.blocks_layout.items.splice(idx, 1);
    }
    data.blocks[jsonId] = makeCodeExampleBlock(jsonId, instanceId, 'json-data', [
      { label: 'JSON Block Data', language: 'json', code: sections.json || '' },
    ]);
    contentChanged = true;
  }

  // Ensure rendering codeExample block exists
  const renderingId = `${prefix}-rendering`;
  if (!data.blocks[renderingId]) {
    data.blocks[renderingId] = makeCodeExampleBlock(renderingId, instanceId, 'rendering', [
      { label: 'React', language: 'jsx', code: sections.react || '' },
      { label: 'Vue', language: 'vue', code: sections.vue || '' },
      { label: 'Svelte', language: 'svelte', code: sections.svelte || '' },
    ]);
    contentChanged = true;
  }

  // Rebuild layout: keep non-template blocks, then append template blocks in correct order
  const templateOrder = [
    `${prefix}-sep`,
    `${prefix}-heading`,
    `${prefix}-schema-heading`,
    `${prefix}-schema-desc`,
    schemaId,
    `${prefix}-json-heading`,
    `${prefix}-json-desc`,
    jsonId,
    `${prefix}-rendering-heading`,
    `${prefix}-rendering-desc`,
    renderingId,
  ];
  const nonTplItems = data.blocks_layout.items.filter(id => {
    const block = data.blocks[id];
    return !block || block.templateId !== TEMPLATE_ID;
  });
  const tplItems = templateOrder.filter(id => data.blocks[id]);
  const newItems = [...nonTplItems, ...tplItems];
  if (JSON.stringify(newItems) !== JSON.stringify(data.blocks_layout.items)) {
    data.blocks_layout.items = newItems;
    contentChanged = true;
  }

  // --- Update tab content from markdown sections ---

  if (data.blocks[schemaId]?.['@type'] === 'codeExample') {
    if (updateCodeExampleTabs(data.blocks[schemaId], [
      { language: 'javascript', code: sections.schema },
    ])) contentChanged = true;
  }

  if (data.blocks[jsonId]?.['@type'] === 'codeExample') {
    if (updateCodeExampleTabs(data.blocks[jsonId], [
      { language: 'json', code: sections.json },
    ])) contentChanged = true;
  }

  if (data.blocks[renderingId]?.['@type'] === 'codeExample') {
    if (updateCodeExampleTabs(data.blocks[renderingId], [
      { language: 'jsx', code: sections.react },
      { language: 'vue', code: sections.vue },
      { language: 'svelte', code: sections.svelte },
    ])) contentChanged = true;
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
