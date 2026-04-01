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

const docPageDefinitions = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'block-definitions.json'), 'utf-8')
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const checkMode = process.argv.includes('--check');

// Match <!-- file: path --> followed by a fenced code block
const MARKER_RE = /^(<!-- file: (.+?) -->)\n```(\w+)\n([\s\S]*?)```/gm;

let outOfSync = false;

const mdFiles = readdirSync(__dirname).filter(f => f.endsWith('.md') && f !== 'README.md');

// --- Phase 0: Generate Schema + JSON Block Data in markdown from block-definitions.json ---

for (const mdFile of mdFiles) {
  const pageName = mdFile.replace('.md', '');
  const pageDef = docPageDefinitions[pageName];
  if (!pageDef) continue;

  const mdPath = join(__dirname, mdFile);
  let md = readFileSync(mdPath, 'utf-8');

  // Generate Schema section content — show the blocks config as JSON
  const schemaBlock = '```json\n' + JSON.stringify(pageDef.blocks, null, 2) + '\n```';

  // Generate JSON Block Data section content (first example only)
  const firstExample = Object.values(pageDef.examples)[0];
  const jsonBlock = '```json\n' + JSON.stringify(firstExample, null, 2) + '\n```';

  // Replace ## Schema section's code block (everything between ## Schema and next ##)
  const schemaRe = /(## Schema\n)[\s\S]*?(?=\n## )/;
  const schemaMatch = md.match(schemaRe);
  if (schemaMatch) {
    const newSection = `## Schema\n\n${schemaBlock}\n\n`;
    md = md.replace(schemaRe, newSection);
  }

  // Replace ## JSON Block Data section's first ```json block
  const jsonRe = /(## JSON Block Data\n(?:[\s\S]*?\n)?)```json\n[\s\S]*?```/;
  const jsonMatch = md.match(jsonRe);
  if (jsonMatch) {
    md = md.replace(jsonRe, `$1${jsonBlock}`);
  }

  const original = readFileSync(mdPath, 'utf-8');
  if (md !== original) {
    outOfSync = true;
    if (checkMode) {
      console.error(`OUT OF SYNC (definitions): ${mdFile}`);
    } else {
      writeFileSync(mdPath, md, 'utf-8');
      console.log(`Updated from definitions: ${mdFile}`);
    }
  }
}

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
  'maps.md': 'e090d954d0a448bca81c1a646e673a12',
  'video.md': '6d37dd19ef754344aaa254fa288e44b4',
};

const CONTENT_DIR = join(__dirname, '..', 'content', 'content', 'content');
const TEMPLATE_ID = '/templates/block-reference-layout';

/** Check if a block's templateId matches our template (handles resolveuid format too) */
function isOurTemplate(block) {
  const tid = block?.templateId;
  if (!tid) return false;
  return tid === TEMPLATE_ID || tid.endsWith('/block-reference-layout');
}

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

  // Schema: ```json``` or ```js``` blocks concatenated
  if (topSections['Schema']) {
    const blocks = extractCodeBlocks(topSections['Schema']).filter(b => b.lang === 'json' || b.lang === 'js');
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
    if (!isOurTemplate(block)) continue;
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

  // Bootstrap: derive prefix and instanceId if no template blocks found yet
  if (!instanceId || !prefix) {
    const name = mdFile.replace('.md', '');
    prefix = `ref-${name}`;
    instanceId = `tpl-inst-${name}`;
  }

  // --- Migration: remove fixed/boilerplate blocks that the template now provides ---
  // Only the 3 codeExample content blocks should be in the stored content.
  // The template expansion (expandTemplates) provides all boilerplate (sep, heading, descriptions).
  const boilerplateSuffixes = [
    'sep', 'heading', 'schema-heading', 'schema-desc', 'json-heading', 'json-desc',
    'rendering-heading', 'rendering-desc',
    // Old placeholder names
    ...OLD_PLACEHOLDERS,
  ];
  for (const suffix of boilerplateSuffixes) {
    const blockId = `${prefix}-${suffix}`;
    if (data.blocks[blockId]) {
      delete data.blocks[blockId];
      contentChanged = true;
    }
  }
  // Also remove any other blocks with our templateId that aren't codeExample
  for (const [blockId, block] of Object.entries(data.blocks)) {
    if (isOurTemplate(block) && block['@type'] !== 'codeExample') {
      delete data.blocks[blockId];
      contentChanged = true;
    }
  }

  // Ensure the 3 codeExample blocks exist
  const schemaId = `${prefix}-schema`;
  if (!data.blocks[schemaId] || data.blocks[schemaId]['@type'] !== 'codeExample') {
    data.blocks[schemaId] = makeCodeExampleBlock(schemaId, instanceId, 'schema', [
      { label: 'Schema', language: 'javascript', code: sections.schema || '' },
    ]);
    contentChanged = true;
  }

  const jsonId = `${prefix}-json-data`;
  if (!data.blocks[jsonId] || data.blocks[jsonId]['@type'] !== 'codeExample') {
    data.blocks[jsonId] = makeCodeExampleBlock(jsonId, instanceId, 'json-data', [
      { label: 'JSON Block Data', language: 'json', code: sections.json || '' },
    ]);
    contentChanged = true;
  }

  const renderingId = `${prefix}-rendering`;
  if (!data.blocks[renderingId] || data.blocks[renderingId]['@type'] !== 'codeExample') {
    data.blocks[renderingId] = makeCodeExampleBlock(renderingId, instanceId, 'rendering', [
      { label: 'React', language: 'jsx', code: sections.react || '' },
      { label: 'Vue', language: 'vue', code: sections.vue || '' },
      { label: 'Svelte', language: 'svelte', code: sections.svelte || '' },
    ]);
    contentChanged = true;
  }

  // Rebuild layout: non-template blocks + the 3 codeExample blocks
  const templateOrder = [schemaId, jsonId, renderingId];
  const nonTplItems = data.blocks_layout.items.filter(id => {
    const block = data.blocks[id];
    return block && !isOurTemplate(block);
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

// --- Phase 3: Generate examples.json from block-definitions.json ---

function getExamplesContent() {
  const blocks = {};
  const items = [];
  for (const page of Object.values(docPageDefinitions)) {
    for (const [blockId, blockData] of Object.entries(page.examples)) {
      blocks[blockId] = blockData;
      items.push(blockId);
    }
  }
  return {
    '@id': '/_test_data/examples',
    '@type': 'Document',
    id: 'examples',
    title: 'Block Examples',
    description: 'Test page with one of each block type from doc examples',
    blocks,
    blocks_layout: { items },
    is_folderish: false,
    review_state: 'published',
    '@components': { navigation: { items: [] } },
  };
}

const examplesPath = join(__dirname, '..', '..', 'tests-playwright', 'fixtures', 'test-frontend', 'examples.json');
const examplesContent = JSON.stringify(getExamplesContent(), null, 2) + '\n';
if (existsSync(examplesPath)) {
  const currentExamples = readFileSync(examplesPath, 'utf-8');
  if (currentExamples !== examplesContent) {
    outOfSync = true;
    if (checkMode) {
      console.error('OUT OF SYNC: examples.json');
    } else {
      writeFileSync(examplesPath, examplesContent, 'utf-8');
      console.log('Updated: examples.json');
    }
  }
} else if (!checkMode) {
  writeFileSync(examplesPath, examplesContent, 'utf-8');
  console.log('Created: examples.json');
}

// --- Phase 4: Sync concepts markdown into Plone content JSON ---

// Map concepts markdown filename -> concepts content JSON folder name
const CONCEPTS_MD_TO_FOLDER = {
  'architecture.md': 'architecture',
  'live-preview.md': 'integration-levels',
  'custom-blocks.md': 'custom-blocks',
  'container-blocks.md': 'container-blocks',
  'visual-editing.md': 'visual-editing',
  'listings.md': 'listings',
  'templates.md': 'templates',
  'deployment.md': 'deployment',
  'advanced.md': 'advanced',
};

const CONCEPTS_DIR = join(__dirname, '..', 'concepts');
const CONCEPTS_CONTENT_DIR = join(CONTENT_DIR, 'concepts');

/**
 * Convert plain text to a Slate paragraph value array.
 */
function textToSlate(text) {
  return [{ type: 'p', children: [{ text }] }];
}

/**
 * Parse a markdown file into a sequence of Plone blocks + layout items.
 * Handles: # title (skip — title block already in JSON), ## headings,
 * paragraphs, bullet/numbered lists, and <!-- codeExample: lang [label="..."] --> markers.
 */
function parseConceptsMd(mdContent) {
  const blocks = {};
  const items = [];
  const lines = mdContent.split('\n');
  let i = 0;
  let blockCounter = 0;

  function addBlock(id, block) {
    blocks[id] = block;
    items.push(id);
  }

  function nextId(prefix) {
    return `${prefix}-${++blockCounter}`;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Skip H1 title — the title block in the JSON handles it
    if (line.startsWith('# ')) {
      i++;
      continue;
    }

    // H2 heading → slate h2 block
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = nextId('h');
      addBlock(id, {
        '@type': 'slate',
        plaintext: text,
        value: [{ type: 'h2', children: [{ text }] }],
      });
      i++;
      continue;
    }

    // <!-- codeExample: lang [label="..."] --> marker
    const ceMatch = line.match(/^<!-- codeExample: (\w+)(?:\s+label="([^"]+)")?\s*-->$/);
    if (ceMatch) {
      const lang = ceMatch[1];
      const label = ceMatch[2] || lang.charAt(0).toUpperCase() + lang.slice(1);
      i++;
      // Next non-empty line should be the opening fence
      while (i < lines.length && lines[i].trim() === '') i++;
      if (lines[i] && lines[i].startsWith('```')) {
        i++; // skip opening fence
        const codeLines = [];
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        const id = nextId('ce');
        addBlock(id, {
          '@type': 'codeExample',
          tabs: [{
            '@id': `${id}-${lang}-${hexSuffix()}`,
            label,
            language: lang,
            code: codeLines.join('\n').trimEnd(),
          }],
        });
      }
      continue;
    }

    // Bullet list (lines starting with '- ')
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listChildren = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listChildren.push({ type: 'li', children: [{ text: lines[i].slice(2).trim() }] });
        i++;
      }
      const id = nextId('ul');
      const plaintext = listChildren.map(c => c.children[0].text).join(' ');
      addBlock(id, {
        '@type': 'slate',
        plaintext,
        value: [{ type: 'ul', children: listChildren }],
      });
      continue;
    }

    // Numbered list (lines starting with '1. ', '2. ', etc.)
    if (/^\d+\.\s/.test(line)) {
      const listChildren = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listChildren.push({ type: 'li', children: [{ text: lines[i].replace(/^\d+\.\s/, '').trim() }] });
        i++;
      }
      const id = nextId('ol');
      const plaintext = listChildren.map(c => c.children[0].text).join(' ');
      addBlock(id, {
        '@type': 'slate',
        plaintext,
        value: [{ type: 'ol', children: listChildren }],
      });
      continue;
    }

    // Fenced code block without a codeExample marker — wrap as codeExample
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const id = nextId('ce');
      const label = lang.charAt(0).toUpperCase() + lang.slice(1);
      addBlock(id, {
        '@type': 'codeExample',
        tabs: [{
          '@id': `${id}-${lang}-${hexSuffix()}`,
          label,
          language: lang,
          code: codeLines.join('\n').trimEnd(),
        }],
      });
      continue;
    }

    // Non-empty paragraph line — collect until blank line
    if (line.trim() !== '') {
      const paraLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Stop if next line is a heading, list, or code fence
        if (lines[i].startsWith('#') || lines[i].startsWith('- ') ||
            lines[i].startsWith('* ') || /^\d+\.\s/.test(lines[i]) ||
            lines[i].startsWith('```') || lines[i].startsWith('<!--')) {
          break;
        }
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        const text = paraLines.join(' ').trim();
        const id = nextId('p');
        addBlock(id, {
          '@type': 'slate',
          plaintext: text,
          value: textToSlate(text),
        });
      }
      continue;
    }

    i++;
  }

  return { blocks, items };
}

const conceptsMdFiles = Object.keys(CONCEPTS_MD_TO_FOLDER);

for (const mdFile of conceptsMdFiles) {
  const folder = CONCEPTS_MD_TO_FOLDER[mdFile];
  const jsonPath = join(CONCEPTS_CONTENT_DIR, folder, 'data.json');
  if (!existsSync(jsonPath)) {
    console.error(`WARNING: concepts content JSON not found for ${mdFile}: ${jsonPath}`);
    continue;
  }

  const mdPath = join(CONCEPTS_DIR, mdFile);
  if (!existsSync(mdPath)) {
    console.error(`WARNING: concepts markdown not found: ${mdPath}`);
    continue;
  }

  const mdContent = readFileSync(mdPath, 'utf-8');
  const { blocks: newBlocks, items: newItems } = parseConceptsMd(mdContent);

  const originalJson = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(originalJson);

  // Preserve the title block and any non-generated metadata blocks
  const titleBlock = Object.entries(data.blocks).find(([, b]) => b['@type'] === 'title');
  const titleId = titleBlock ? titleBlock[0] : 'title-1';

  // Preserve existing tab @id values to keep JSON stable across runs
  for (const [id, block] of Object.entries(newBlocks)) {
    if (block['@type'] === 'codeExample' && data.blocks[id]?.tabs) {
      block.tabs.forEach((tab, idx) => {
        if (data.blocks[id].tabs[idx]?.['@id']) {
          tab['@id'] = data.blocks[id].tabs[idx]['@id'];
        }
      });
    }
  }

  const updatedBlocks = { [titleId]: { '@type': 'title' }, ...newBlocks };
  const updatedItems = [titleId, ...newItems];

  const updatedData = {
    ...data,
    blocks: updatedBlocks,
    blocks_layout: { items: updatedItems },
  };

  const updatedJson = JSON.stringify(updatedData, null, 2) + '\n';
  if (updatedJson !== originalJson) {
    outOfSync = true;
    if (checkMode) {
      console.error(`OUT OF SYNC: concepts content JSON for ${mdFile}`);
    } else {
      writeFileSync(jsonPath, updatedJson, 'utf-8');
      console.log(`Updated concepts content JSON: ${mdFile} -> concepts/${folder}/data.json`);
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
