#!/usr/bin/env node
/**
 * Syncs the Sphinx documentation tree into the Plone content tree that powers
 * the live docs site (hydra.pretagov.com).
 *
 * Two source-of-truth flows:
 *
 *   1. Block reference (docs/examples/)
 *      - block-definitions.json defines each block's schema + JSON example.
 *      - examples/{react,vue,svelte}/ hold real component source files.
 *      - The per-block markdown uses `<!-- file: path -->` markers to inject
 *        component source into fenced code blocks.
 *      - After authoring the markdown, the script syncs the rendered Schema /
 *        JSON / React / Vue / Svelte sections into the matching Plone content
 *        JSON's codeExample blocks (docs/content/.../<UID>/data.json).
 *
 *   2. Topic pages (docs/*.md — architecture, custom-blocks, listings, …)
 *      - Each .md is parsed (parseConceptsMd) into Plone slate / codeExample /
 *        slateTable / separator blocks.
 *      - Synced into the matching Plone content JSON
 *        (docs/content/.../docs/<page>/data.json), mirroring the Sphinx
 *        layout one-for-one.
 *      - Missing data.json files are auto-created from a metadata shell with
 *        the page's title + first paragraph as description.
 *      - Order of CONCEPTS_MD_TO_FOLDER drives the Plone folder's
 *        __metadata__.json ordering.
 *
 * Usage:
 *   pnpm sync:docs            # update everything in place
 *   pnpm sync:docs:check      # exit non-zero if anything is out of sync (CI)
 */

import {
  readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync,
  statSync, copyFileSync,
} from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const checkMode = process.argv.includes('--check');

// Source-of-truth directory roots, all relative to this script's location at docs/sync.mjs.
//   docs/examples/                 — block reference: per-block .md, block-definitions.json,
//                                    examples/{react,vue,svelte}/ source snippets
//   docs/*.md                      — topic-page authoring (architecture, custom-blocks, …)
//   docs/content/content/content/  — Plone-content tree the live site exports from
const EXAMPLES_DIR = join(__dirname, 'examples');
// How-to-build flattened up to docs root; the developer-authored topic
// pages (architecture, custom-blocks, listings, …) sit alongside this
// script. CONCEPTS_MD_TO_FOLDER below maps each .md filename to the Plone
// folder it syncs into.
// Markdown source roots used by the various sync phases below.
const TOPICS_DIR = __dirname;
const TOPICS_MD_ROOT = TOPICS_DIR;
const CONTENT_DIR = join(__dirname, 'content', 'content', 'content');

// Plone-side parent path for documentation pages and the screenshots
// they reference. The whole tree lives under /docs/ in Plone, mirroring
// the Sphinx layout one-for-one (docs/architecture.md → /docs/architecture).
const DOCS_PARENT_PATH = '/docs';
const DOCS_PARENT_UID = 'docs-folder-001';
const IMAGES_PARENT_PATH = DOCS_PARENT_PATH;
const IMAGES_PARENT_UID = DOCS_PARENT_UID;
const IMAGES_FOLDER_UID = 'docs-images-folder-001';

const docPageDefinitions = JSON.parse(
  readFileSync(join(EXAMPLES_DIR, 'block-definitions.json'), 'utf-8')
);

// Match <!-- file: path --> followed by a fenced code block
const MARKER_RE = /^(<!-- file: (.+?) -->)\n```(\w+)\n([\s\S]*?)```/gm;

let outOfSync = false;

const mdFiles = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');

// --- Phase 0a: Auto-create Plone shells for new examples pages ---
// Adding a new docs/examples/<slug>.md should be enough; sync gives it
// a Plone home at /docs/examples/<slug>/. The shell is the bare minimum
// (Document type, parented to /docs/examples, title from H1) so the
// markdown→codeExample sync in later phases has something to write into.
// Existing pages with their template-based layout are left alone — the
// `existsSync` guard skips them.
const EXAMPLES_PARENT_PATH = '/docs/examples';
const EXAMPLES_PARENT_UID = 'docs-examples-folder-001';

function buildExampleShell(slug, mdContent) {
  const { title, description } = extractTitleAndDescription(mdContent, slug);
  const date = '2025-01-01T00:00:00';
  const uid = `docs-examples-${slug}-001`;
  return {
    '@id': `${EXAMPLES_PARENT_PATH}/${slug}`,
    '@type': 'Document',
    UID: uid,
    allow_discussion: false,
    blocks: { 'title-1': { '@type': 'title' } },
    blocks_layout: { items: ['title-1'] },
    contributors: [],
    created: `${date}+00:00`,
    creators: ['admin'],
    description,
    effective: null,
    // Block-reference pages stay in nav so the cnav force-rule at
    // /docs/examples and on each per-block page surfaces them as nav links.
    exclude_from_nav: false,
    expires: null,
    'exportimport.constrains': {},
    'exportimport.conversation': [],
    'exportimport.versions': {},
    id: slug,
    is_folderish: false,
    language: '##DEFAULT##',
    layout: 'document_view',
    lock: {},
    modified: `${date}+00:00`,
    parent: {
      '@id': EXAMPLES_PARENT_PATH,
      '@type': 'Document',
      UID: EXAMPLES_PARENT_UID,
      description: 'Block reference: schema, JSON, and rendered examples for every block type Volto Hydra ships.',
      title: 'Examples',
      type_title: 'Page',
    },
    review_state: 'published',
    rights: '',
    subjects: [],
    title,
    type_title: 'Page',
    version: 'current',
    workflow_history: {},
    working_copy: null,
    working_copy_of: null,
  };
}

for (const mdFile of mdFiles) {
  const slug = mdFile.replace(/\.md$/, '');
  const folderPath = mdFileToContentDir(mdFile);
  const jsonPath = join(folderPath, 'data.json');
  if (existsSync(jsonPath)) continue;
  const mdPath = join(EXAMPLES_DIR, mdFile);
  const mdContent = readFileSync(mdPath, 'utf-8');
  if (checkMode) {
    outOfSync = true;
    console.error(`OUT OF SYNC: docs/examples/${slug}/data.json missing (would auto-create from ${mdFile})`);
    continue;
  }
  if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(buildExampleShell(slug, mdContent), null, 2) + '\n', 'utf-8');
  console.log(`Created docs/examples/${slug}/data.json shell`);
}

// Example pages used to be exclude_from_nav=true on the theory that they'd
// only be reached via the /docs/examples listing block — but the cnav
// force-rule at /docs/examples then pulled siblings from /docs and filtered
// them out, leaving an unhelpful nav. Make them visible to nav so the
// contextNavigation surfaces the per-block reference pages the way users
// expect, and unset the flag on any leftover pages from the old policy.
for (const mdFile of mdFiles) {
  const slug = mdFile.replace(/\.md$/, '');
  const jsonPath = join(mdFileToContentDir(mdFile), 'data.json');
  if (!existsSync(jsonPath)) continue;
  const original = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(original);
  if (data.exclude_from_nav === false) continue;
  data.exclude_from_nav = false;
  const updated = JSON.stringify(data, null, 2) + '\n';
  if (updated === original) continue;
  if (checkMode) {
    outOfSync = true;
    console.error(`OUT OF SYNC: ${jsonPath} (exclude_from_nav)`);
  } else {
    writeFileSync(jsonPath, updated, 'utf-8');
    console.log(`Updated exclude_from_nav=false: docs/examples/${slug}/data.json`);
  }
}

// Regenerate the docs/examples/README.md tables (Built-in / Custom) and the
// hidden toctree from the actual mdFiles. Hand-maintained tables drift —
// new example pages were getting added with their own .md file and Plone
// shell but never appeared in the README. Driving both tables from the
// filesystem keeps "what files exist" and "what the docs index lists" in
// lock-step. The intro/closing prose between tables is preserved.
{
  const readmePath = join(EXAMPLES_DIR, 'README.md');
  if (existsSync(readmePath)) {
    const original = readFileSync(readmePath, 'utf-8');

    // For each example, classify built-in vs custom from the intro line.
    // Falls back to "custom" if not stated. Description comes from the
    // first non-heading prose line (skipping the "This is a … block"
    // classifier line itself).
    const entries = mdFiles.map((mdFile) => {
      const slug = mdFile.replace(/\.md$/, '');
      const md = readFileSync(join(EXAMPLES_DIR, mdFile), 'utf-8');
      const lines = md.split('\n');
      const h1 = (lines.find((l) => l.startsWith('# ')) || `# ${slug}`)
        .slice(2).trim();
      const intro = lines.find(
        (l) => l.startsWith('This is a **'),
      ) || '';
      const kind = intro.includes('**built-in**') ? 'built-in' : 'custom';
      // First prose line that isn't the intro classifier line.
      const desc = lines.find((l) => {
        const t = l.trim();
        if (!t || t.startsWith('#') || t.startsWith('```')) return false;
        if (t.startsWith('This is a **')) return false;
        return true;
      }) || '';
      return { slug, title: h1, kind, desc: desc.trim() };
    }).sort((a, b) => a.slug.localeCompare(b.slug));

    const renderRow = ({ slug, title, desc }) =>
      `| [${title}](./${slug}.md) | ${desc} |`;
    const builtinRows = entries.filter((e) => e.kind === 'built-in').map(renderRow);
    const customRows = entries.filter((e) => e.kind === 'custom').map(renderRow);

    const builtinSection = [
      '## Built-in Blocks',
      '',
      'These blocks are available by default — no schema registration required.',
      '',
      '| Block | Description |',
      '|-------|-------------|',
      ...builtinRows,
      '',
    ].join('\n');

    const customSection = [
      '## Custom Block Examples',
      '',
      'These blocks demonstrate common patterns. Register them via `initBridge({ blocks: { ... } })`.',
      '',
      '| Block | Description |',
      '|-------|-------------|',
      ...customRows,
      '',
    ].join('\n');

    const toctree = [
      '```{toctree}',
      ':hidden:',
      '',
      ...entries.map((e) => e.slug),
      '```',
    ].join('\n');

    // Splice each generated region back into the README, preserving the
    // intro before "## Built-in Blocks" and the static reference tables
    // ("Page Structure", "Data Attributes…", "Widget Reference") between
    // "## Custom Block Examples" and the toctree.
    let updated = original.replace(
      /## Built-in Blocks[\s\S]*?(?=## Custom Block Examples)/,
      builtinSection,
    );
    updated = updated.replace(
      /## Custom Block Examples[\s\S]*?(?=## Page Structure)/,
      customSection,
    );
    updated = updated.replace(
      /```\{toctree\}[\s\S]*?```\n*$/m,
      toctree + '\n',
    );

    if (updated !== original) {
      outOfSync = true;
      if (checkMode) {
        console.error('OUT OF SYNC: docs/examples/README.md');
      } else {
        writeFileSync(readmePath, updated, 'utf-8');
        console.log('Updated docs/examples/README.md (tables + toctree)');
      }
    }
  }
}

// Ensure the /docs/examples landing page has a listing block that surfaces
// every child example. Without it, the page renders as just a title and
// columns/etc. exist only by URL — undiscoverable from the live site.
// Idempotent: only writes when the canonical shape differs from disk, so
// changes to the desired querystring/fieldMapping below also propagate.
{
  const examplesIndexJsonPath = join(
    CONTENT_DIR, 'docs', 'examples', 'data.json',
  );
  // Without an explicit querystring the listing falls back to
  // @querystring-search with relativePath '.', which on a multi-level
  // folder like /docs/examples pulls in EVERY descendant (e.g.
  // content-types/copy_of_event) in arbitrary order. Pin it to direct
  // children sorted in folder order. Note: NO exclude_from_nav filter —
  // the per-block example pages are deliberately exclude_from_nav=true
  // (they're a reference index, not a navigation tier), and the whole
  // point of this listing is to surface them.
  const examplesListingBlock = {
    '@type': 'listing',
    headlineTag: 'h2',
    styles: {},
    variation: 'summary',
    querystring: {
      query: [
        {
          i: 'path',
          o: 'plone.app.querystring.operation.string.relativePath',
          v: '.',
        },
      ],
      sort_on: 'getObjPositionInParent',
      depth: 1,
    },
    fieldMapping: {
      '@id': 'href',
      title: 'title',
      description: 'description',
      image: 'image',
    },
  };
  if (existsSync(examplesIndexJsonPath)) {
    const original = readFileSync(examplesIndexJsonPath, 'utf-8');
    const data = JSON.parse(original);
    const layout = data.blocks_layout?.items || [];
    const currentBlock = data.blocks?.['examples-listing'];
    const blockNeedsUpdate =
      JSON.stringify(currentBlock) !== JSON.stringify(examplesListingBlock);
    const layoutNeedsUpdate = !layout.includes('examples-listing');
    if (blockNeedsUpdate || layoutNeedsUpdate) {
      data.blocks = {
        ...data.blocks,
        'examples-listing': examplesListingBlock,
      };
      if (layoutNeedsUpdate) {
        data.blocks_layout = { items: [...layout, 'examples-listing'] };
      }
      const updated = JSON.stringify(data, null, 2) + '\n';
      if (updated !== original) {
        outOfSync = true;
        if (checkMode) {
          console.error('OUT OF SYNC: /docs/examples examples-listing block');
        } else {
          writeFileSync(examplesIndexJsonPath, updated, 'utf-8');
          console.log('Updated examples-listing block in docs/examples/data.json');
        }
      }
    }
  }
}

// --- Phase 0: Generate Schema + JSON Block Data in markdown from block-definitions.json ---

for (const mdFile of mdFiles) {
  const pageName = mdFile.replace('.md', '');
  const pageDef = docPageDefinitions[pageName];
  if (!pageDef) continue;

  const mdPath = join(EXAMPLES_DIR, mdFile);
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
  const mdPath = join(EXAMPLES_DIR, mdFile);
  const original = readFileSync(mdPath, 'utf-8');
  let updated = original;

  updated = updated.replace(MARKER_RE, (match, marker, filePath, lang) => {
    const absPath = join(EXAMPLES_DIR, filePath);
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

// docs/examples/<slug>.md → docs/content/.../docs/examples/<slug>/data.json.
// Filename-based mapping: every block reference page lives at the path
// matching its markdown filename, no hand-maintained UID list. The few
// markdown files that don't have a Plone counterpart (columns, hero,
// slider) are skipped because the path simply won't exist on disk.
function mdFileToContentDir(mdFile) {
  const slug = mdFile.replace(/\.md$/, '');
  return join(CONTENT_DIR, 'docs', 'examples', slug);
}

// CONTENT_DIR defined above near the script header.
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
  const jsonPath = join(mdFileToContentDir(mdFile), 'data.json');
  // Skip markdown files with no corresponding Plone page (columns.md,
  // hero.md, slider.md don't have one yet — the path just won't exist).
  if (!existsSync(jsonPath)) continue;

  const mdContent = readFileSync(join(EXAMPLES_DIR, mdFile), 'utf-8');
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

  // Scrub cross-prefix orphans: any `ref-<other>-*` block left over
  // from a previous page's content (e.g., when a markdown file was
  // renamed or its content moved). The template instance ID is the
  // authoritative marker — only blocks pointing at *this* page's
  // instanceId should remain.
  for (const [blockId, block] of Object.entries(data.blocks)) {
    if (!blockId.startsWith('ref-')) continue;
    if (blockId.startsWith(`${prefix}-`)) continue;
    // Foreign ref-* block that isn't ours; drop it.
    delete data.blocks[blockId];
    contentChanged = true;
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
        const rel = jsonPath.slice(CONTENT_DIR.length + 1);
        console.log(`Updated content JSON: ${mdFile} -> ${rel}`);
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

const examplesPath = join(__dirname, '..', 'tests-playwright', 'fixtures', 'test-frontend', 'examples.json');
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

// Map docs markdown filename -> Plone folder path (relative to /docs/).
// Order matters — drives __metadata__.json's ordering map below.
// Filename keys may include subdirs ('what-editors-will-experience/foo.md');
// values may be nested paths ('what-editors-will-experience/foo'). The
// root of the editor-experience subtree is its own folder page (index.md).
// Discover docs pages by walking the Sphinx toctree tree, starting from
// docs/index.md. Toctree order is the single source of truth for both the
// rendered Sphinx site nav and Plone's __metadata__.json ordering — sync
// can never drift from the docs nav because it reads the same input.
//
// Toctree entry forms supported:
//   page-name              → leaf page, mdFile = page-name.md
//   sub/page-name          → leaf page in a subfolder
//   sub/index              → folder page; recurse into sub/index.md's toctree
// The literal entry 'examples/README' is skipped — block reference pages
// have a different sync path (Phases 0–3 above) and don't belong here.
function discoverDocsPagesFromToctree() {
  const entries = [];
  function walk(parentMdRel, parentFolder) {
    const mdAbs = join(TOPICS_MD_ROOT, parentMdRel);
    if (!existsSync(mdAbs)) return;
    const md = readFileSync(mdAbs, 'utf-8');
    const m = md.match(/```\{toctree\}([\s\S]*?)```/);
    if (!m) return;
    const dirRel = dirname(parentMdRel);
    const dirPrefix = (dirRel === '' || dirRel === '.') ? '' : `${dirRel}/`;
    for (const rawLine of m[1].split('\n')) {
      const t = rawLine.trim();
      if (!t || t.startsWith(':')) continue;
      if (t === 'examples/README') continue;
      const isFolderIndex = t.endsWith('/index');
      const slug = isFolderIndex ? t.slice(0, -'/index'.length) : t;
      const mdRel = `${dirPrefix}${slug}${isFolderIndex ? '/index' : ''}.md`;
      const leaf = slug.split('/').pop();
      const folder = parentFolder ? `${parentFolder}/${leaf}` : slug;
      entries.push([mdRel, folder]);
      if (isFolderIndex) walk(mdRel, folder);
    }
  }
  walk('index.md', '');
  return Object.fromEntries(entries);
}
const CONCEPTS_MD_TO_FOLDER = discoverDocsPagesFromToctree();

/**
 * Pull H1 + first paragraph from a markdown source as title + description.
 * Returns { title, description }.
 */
function extractTitleAndDescription(mdContent, folderFallback) {
  const lines = mdContent.split('\n');
  let title = folderFallback;
  let description = '';
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('# ')) continue;
    title = lines[i].slice(2).trim();
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (next.startsWith('#') || next.startsWith('-') || next.startsWith('*') ||
          next.startsWith('|') || next.startsWith('```') || next.startsWith('<!--')) break;
      description = next.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        .replace(/\*\*([^*]+)\*\*/g, '$1')
                        .replace(/\*([^*\n]+)\*/g, '$1')
                        .replace(/`([^`]+)`/g, '$1');
      break;
    }
    break;
  }
  return { title, description };
}

// Pre-compute folder → { title, description, uid, isFolderish, parent }
// from CONCEPTS_MD_TO_FOLDER. Lets buildConceptShell look up the parent's
// real title/UID for nested children, and tells the metadata writer which
// folders need their own __metadata__.json.
function folderToUid(folder) {
  return folder === '' ? DOCS_PARENT_UID : `docs-${folder.replace(/\//g, '-')}-001`;
}
function parentFolderOf(folder) {
  if (!folder.includes('/')) return '';
  return folder.split('/').slice(0, -1).join('/');
}
function hasChildren(folder) {
  for (const f of Object.values(CONCEPTS_MD_TO_FOLDER)) {
    if (f !== folder && (folder === '' || f.startsWith(folder + '/'))) return true;
  }
  return false;
}

const folderMeta = new Map();
folderMeta.set('', {
  title: 'Docs',
  description: 'Developer guide for Volto Hydra',
  uid: DOCS_PARENT_UID,
});
for (const [mdFile, folder] of Object.entries(CONCEPTS_MD_TO_FOLDER)) {
  const mdPath = join(TOPICS_MD_ROOT, mdFile);
  const fallback = folder.split('/').pop();
  let title = fallback;
  let description = '';
  if (existsSync(mdPath)) {
    const md = readFileSync(mdPath, 'utf-8');
    ({ title, description } = extractTitleAndDescription(md, fallback));
  }
  folderMeta.set(folder, {
    title,
    description,
    uid: folderToUid(folder),
  });
}

/**
 * Build a Plone-content data.json shell for a docs page that doesn't yet
 * have one. The blocks/blocks_layout fields are filled in by the regular
 * sync logic; this just provides the surrounding metadata Plone export needs.
 */
function buildConceptShell(folder, mdContent) {
  const { title, description } = extractTitleAndDescription(mdContent, folder);
  const uid = folderToUid(folder);
  const parentFolder = parentFolderOf(folder);
  const parentInfo = folderMeta.get(parentFolder) || folderMeta.get('');
  const isFolderish = hasChildren(folder);
  const date = '2025-01-01T00:00:00';
  return {
    '@id': `${DOCS_PARENT_PATH}/${folder}`,
    '@type': 'Document',
    UID: uid,
    allow_discussion: false,
    contributors: [],
    created: `${date}+00:00`,
    creators: ['admin'],
    description,
    effective: date,
    exclude_from_nav: false,
    expires: null,
    'exportimport.constrains': {},
    'exportimport.conversation': [],
    'exportimport.versions': {},
    id: folder.split('/').pop(),
    is_folderish: isFolderish,
    language: '##DEFAULT##',
    layout: 'document_view',
    lock: { locked: false, stealable: true },
    modified: `${date}+00:00`,
    parent: {
      '@id': parentFolder === '' ? DOCS_PARENT_PATH : `${DOCS_PARENT_PATH}/${parentFolder}`,
      '@type': 'Document',
      UID: parentInfo.uid,
      description: parentInfo.description,
      title: parentInfo.title,
      type_title: 'Page',
    },
    preview_caption: null,
    preview_image: null,
    review_state: 'published',
    rights: '',
    subjects: [],
    title,
    type_title: 'Page',
    version: 'current',
    workflow_history: {
      simple_publication_workflow: [
        {
          action: 'publish',
          actor: 'admin',
          comments: '',
          review_state: 'published',
          time: `${date}+00:00`,
        },
      ],
    },
    working_copy: null,
    working_copy_of: null,
    blocks: {},
    blocks_layout: { items: [] },
  };
}

// Sphinx-side: developer topic pages live flat in docs/ (alongside this
// script). Subdirs (what-editors-will-experience/) hold nested pages.
// Plone-side: pages live under content/.../docs/<slug>/ and nested
// content/.../docs/<parent>/<slug>/, mirroring the Sphinx tree.
const DOCS_CONTENT_DIR = join(CONTENT_DIR, 'docs');

/**
 * Parse markdown inline formatting into Slate leaf array.
 * Handles `code`, **strong**, *em*, [text](url). Anything else stays as plain text.
 * Returns an array of leaf objects (each `{ text, ...marks }` or `{ type: 'link', ... }`).
 */
function parseInline(text) {
  const leaves = [];
  let pos = 0;
  // Combined matcher: link, strong, em, code — first match wins at each position.
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > pos) leaves.push({ text: text.slice(pos, m.index) });
    if (m[1] !== undefined) {
      // Link: [text](url) — Volto-slate uses an inline element with `data` href
      leaves.push({
        type: 'link',
        data: { url: m[2] },
        children: [{ text: m[1] }],
      });
    } else if (m[3] !== undefined) {
      // **bold** → inline element { type: 'strong', children: [{text}] }
      // (the documented slate node type — see docs/examples/slate.md).
      // Mark form { text, strong: true } is non-canonical and isn't
      // round-trippable through the renderer.
      leaves.push({ type: 'strong', children: [{ text: m[3] }] });
    } else if (m[4] !== undefined) {
      leaves.push({ type: 'em', children: [{ text: m[4] }] });
    } else if (m[5] !== undefined) {
      leaves.push({ type: 'code', children: [{ text: m[5] }] });
    }
    pos = m.index + m[0].length;
  }
  if (pos < text.length) leaves.push({ text: text.slice(pos) });
  if (leaves.length === 0) leaves.push({ text: '' });
  return leaves;
}

/**
 * Plain text extraction from inline markdown (drop formatting markers).
 */
function inlineToPlaintext(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

/**
 * Convert plain text to a Slate paragraph value array, parsing inline marks.
 */
function textToSlate(text) {
  return [{ type: 'p', children: parseInline(text) }];
}

/**
 * Parse a markdown file into a sequence of Plone blocks + layout items.
 * Handles: # title (skip), ## ### #### headings, paragraphs (with inline
 * `code`, **bold**, *em*, links), bullet/numbered lists, markdown tables,
 * fenced code blocks, and <!-- codeExample: lang [label="..."] --> markers.
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

    // Horizontal rule (---, ***, ___) → separator block
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim()) && line.trim().length >= 3) {
      const id = nextId('sep');
      addBlock(id, { '@type': 'separator' });
      i++;
      continue;
    }

    // Standalone image: ![alt](path/to/image.png) → image block.
    // Matches Phase 5's slug rule: filename without extension.
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      const slug = basename(url).replace(/\.[^.]+$/, '');
      const id = nextId('img');
      addBlock(id, {
        '@type': 'image',
        url: `${IMAGES_PARENT_PATH}/images/${slug}`,
        alt,
        align: 'center',
        size: 'l',
      });
      i++;
      continue;
    }

    // H2/H3/H4 heading → slate h2/h3/h4 block
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;  // 2, 3, or 4
      const rawText = headingMatch[2].trim();
      const id = nextId('h');
      addBlock(id, {
        '@type': 'slate',
        plaintext: inlineToPlaintext(rawText),
        value: [{ type: `h${level}`, children: parseInline(rawText) }],
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
      const listItems = [];
      const plainParts = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        const itemText = lines[i].slice(2).trim();
        listItems.push({ type: 'li', children: parseInline(itemText) });
        plainParts.push(inlineToPlaintext(itemText));
        i++;
      }
      const id = nextId('ul');
      addBlock(id, {
        '@type': 'slate',
        plaintext: plainParts.join(' '),
        value: [{ type: 'ul', children: listItems }],
      });
      continue;
    }

    // Numbered list (lines starting with '1. ', '2. ', etc.)
    if (/^\d+\.\s/.test(line)) {
      const listItems = [];
      const plainParts = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, '').trim();
        listItems.push({ type: 'li', children: parseInline(itemText) });
        plainParts.push(inlineToPlaintext(itemText));
        i++;
      }
      const id = nextId('ol');
      addBlock(id, {
        '@type': 'slate',
        plaintext: plainParts.join(' '),
        value: [{ type: 'ol', children: listItems }],
      });
      continue;
    }

    // Markdown pipe table:
    //   | a | b | c |
    //   | - | - | - |
    //   | 1 | 2 | 3 |
    // → slateTable block. Stops at first non-pipe line.
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cellsFrom = (l) => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const headerCells = cellsFrom(lines[i]);
      i += 2; // skip header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        bodyRows.push(cellsFrom(lines[i]));
        i++;
      }
      const id = nextId('tbl');
      const mkCell = (text, isHeader, rIdx, cIdx) => ({
        key: `${id}-r${rIdx}c${cIdx}`,
        type: isHeader ? 'header' : 'data',
        value: [{ type: 'p', children: parseInline(text) }],
      });
      const rows = [
        { key: `${id}-r0`, cells: headerCells.map((c, cIdx) => mkCell(c, true, 0, cIdx)) },
        ...bodyRows.map((r, rIdx) => ({
          key: `${id}-r${rIdx + 1}`,
          cells: r.map((c, cIdx) => mkCell(c, false, rIdx + 1, cIdx)),
        })),
      ];
      addBlock(id, {
        '@type': 'slateTable',
        table: { fixed: true, compact: false, basic: false, celled: true, inverted: false, striped: false, rows },
      });
      continue;
    }

    // Fenced code block without a codeExample marker — wrap as codeExample.
    // Exception: MyST directive fences like ```{toctree}``` or ```{warning}```
    // are Sphinx-only markup; the toctree is consumed elsewhere (drives sync
    // ordering), and admonitions render natively. None of them should leak
    // into Plone as a codeExample. If we ever want admonition text on the
    // live site, add a directive-aware branch above.
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      // MyST directive fences: ```{toctree}, ```{warning}, ```{raw} html, etc.
      // The language token always starts with `{` for these.
      if (lang.startsWith('{')) continue;
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
        // Stop if next line is a heading, list, code fence, or table.
        if (lines[i].startsWith('#') || lines[i].startsWith('- ') ||
            lines[i].startsWith('* ') || /^\d+\.\s/.test(lines[i]) ||
            lines[i].startsWith('```') || lines[i].startsWith('<!--') ||
            lines[i].startsWith('|')) {
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

const docsMdFiles = Object.keys(CONCEPTS_MD_TO_FOLDER);

for (const mdFile of docsMdFiles) {
  const folder = CONCEPTS_MD_TO_FOLDER[mdFile];
  const folderPath = join(DOCS_CONTENT_DIR, folder);
  const jsonPath = join(folderPath, 'data.json');

  const mdPath = join(TOPICS_MD_ROOT, mdFile);
  if (!existsSync(mdPath)) {
    console.error(`WARNING: docs markdown not found: ${mdPath}`);
    continue;
  }
  const mdContent = readFileSync(mdPath, 'utf-8');
  const { blocks: newBlocks, items: newItems } = parseConceptsMd(mdContent);

  // Build the shell every run — title, description, parent metadata, and
  // is_folderish are derived from CONCEPTS_MD_TO_FOLDER + the markdown's H1
  // and need to track those as they change. We keep the previously-written
  // JSON in prevData only to preserve a couple of stable-across-run details
  // (the title block id; codeExample tab UIDs).
  let originalJson = '';
  let prevData = null;
  if (existsSync(jsonPath)) {
    originalJson = readFileSync(jsonPath, 'utf-8');
    prevData = JSON.parse(originalJson);
  } else if (checkMode) {
    outOfSync = true;
    console.error(`OUT OF SYNC: docs content JSON missing for ${mdFile}`);
    continue;
  } else {
    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
    console.log(`Created docs content JSON shell: docs/${folder}/data.json`);
  }
  const data = buildConceptShell(folder, mdContent);

  // Preserve title-block id from previous JSON (default: title-1).
  const prevTitleEntry = prevData
    ? Object.entries(prevData.blocks || {}).find(([, b]) => b['@type'] === 'title')
    : null;
  const titleId = prevTitleEntry ? prevTitleEntry[0] : 'title-1';

  // Preserve existing codeExample tab @id values to keep JSON stable across runs.
  if (prevData) {
    for (const [id, block] of Object.entries(newBlocks)) {
      if (block['@type'] === 'codeExample' && prevData.blocks?.[id]?.tabs) {
        block.tabs.forEach((tab, idx) => {
          if (prevData.blocks[id].tabs[idx]?.['@id']) {
            tab['@id'] = prevData.blocks[id].tabs[idx]['@id'];
          }
        });
      }
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
      console.error(`OUT OF SYNC: docs content JSON for ${mdFile}`);
    } else {
      writeFileSync(jsonPath, updatedJson, 'utf-8');
      console.log(`Updated docs content JSON: ${mdFile} -> docs/${folder}/data.json`);
    }
  }
}

// --- Phase 4a-root: Sync docs/index.md content into the /docs landing page ---
// The index.md is what Sphinx renders as the docs homepage; its toctree
// drives sync ordering, and its body (Why Hydra, Try the demo, etc.) should
// be the live /docs page on the Plone side. Shell metadata (parent =
// Plone Site root, UID, layout) is preserved as-is — only blocks_layout
// and blocks are regenerated. Any non-parser block already in the data.json
// (e.g. a manually-added `listing` block showing children) is appended
// after the parsed content so the live page keeps its child gallery.
{
  const indexMdPath = join(TOPICS_MD_ROOT, 'index.md');
  const indexJsonPath = join(DOCS_CONTENT_DIR, 'data.json');
  if (existsSync(indexMdPath) && existsSync(indexJsonPath)) {
    const indexMd = readFileSync(indexMdPath, 'utf-8');
    const { blocks: parsedBlocks, items: parsedItems } = parseConceptsMd(indexMd);
    const originalRootJson = readFileSync(indexJsonPath, 'utf-8');
    const rootData = JSON.parse(originalRootJson);

    // Preserve the existing title-block id (default: title-1).
    const prevTitleEntry = Object.entries(rootData.blocks || {})
      .find(([, b]) => b['@type'] === 'title');
    const titleId = prevTitleEntry ? prevTitleEntry[0] : 'title-1';

    // Preserve any non-parser block from the existing data.json (e.g. listing,
    // video). Parser-produced types: title, slate, codeExample, slateTable,
    // separator, image — anything else is hand-authored or migration-injected
    // and should survive a sync run.
    const PARSER_TYPES = new Set(['title', 'slate', 'codeExample', 'slateTable', 'separator', 'image']);
    const preservedBlocks = {};
    const preservedIds = new Set([titleId]);
    for (const [id, b] of Object.entries(rootData.blocks || {})) {
      if (PARSER_TYPES.has(b['@type']) || id === titleId) continue;
      preservedBlocks[id] = b;
      preservedIds.add(id);
    }

    // Build the new blocks_layout by walking the PREVIOUS layout: keep
    // preserved IDs at their old positions, replace the first parser-type
    // run with the freshly-parsed items, drop subsequent parser types.
    // Falls back to "title + parsed + preserved" if there's no previous
    // layout to anchor against (first sync after creation).
    const prevLayout = rootData.blocks_layout?.items || [];
    const newLayout = [];
    let parsedInserted = false;
    for (const id of prevLayout) {
      if (preservedIds.has(id)) {
        newLayout.push(id);
      } else if (!parsedInserted) {
        newLayout.push(...parsedItems);
        parsedInserted = true;
      }
    }
    if (!parsedInserted) newLayout.push(...parsedItems);
    if (!newLayout.includes(titleId)) newLayout.unshift(titleId);
    // Surface any preserved block that didn't appear in prevLayout (rare).
    for (const id of Object.keys(preservedBlocks)) {
      if (!newLayout.includes(id)) newLayout.push(id);
    }

    const updatedRoot = {
      ...rootData,
      title: 'Volto Hydra Documentation',
      description: indexMd.split('\n').slice(1).find(l => l.trim() && !l.startsWith('#') && !l.startsWith('```')) || rootData.description,
      blocks: { [titleId]: { '@type': 'title' }, ...parsedBlocks, ...preservedBlocks },
      blocks_layout: { items: newLayout },
    };
    const updatedRootJson = JSON.stringify(updatedRoot, null, 2) + '\n';
    if (updatedRootJson !== originalRootJson) {
      outOfSync = true;
      if (checkMode) {
        console.error(`OUT OF SYNC: docs/data.json (root from index.md)`);
      } else {
        writeFileSync(indexJsonPath, updatedRootJson, 'utf-8');
        console.log(`Updated docs/data.json (root from index.md)`);
      }
    }
  }
}

// --- Phase 4b: Update __metadata__.json ordering for every folder with children ---
// Each folder (docs root + every parent like 'what-editors-will-experience')
// gets its own __metadata__.json listing only its DIRECT children, in the order
// CONCEPTS_MD_TO_FOLDER declares them. This is what lets Plone render the nav
// hierarchy correctly — without it, nested pages either don't appear at all
// or land at the wrong level.

// Group entries by parent folder.
const childrenByParent = new Map(); // parentFolder -> [folder, folder, ...]
for (const folder of Object.values(CONCEPTS_MD_TO_FOLDER)) {
  const parent = parentFolderOf(folder);
  if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
  childrenByParent.get(parent).push(folder);
}

for (const [parentFolder, children] of childrenByParent) {
  const parentDirOnDisk = parentFolder === ''
    ? DOCS_CONTENT_DIR
    : join(DOCS_CONTENT_DIR, parentFolder);
  const metadataPath = join(parentDirOnDisk, '__metadata__.json');
  const ordering = {};
  children.forEach((folder, idx) => {
    ordering[folderToUid(folder)] = idx;
  });
  const desired = JSON.stringify({ ordering }, null, 2) + '\n';
  const original = existsSync(metadataPath) ? readFileSync(metadataPath, 'utf-8') : '';
  if (desired !== original) {
    outOfSync = true;
    const relLabel = parentFolder === '' ? 'docs/__metadata__.json' : `docs/${parentFolder}/__metadata__.json`;
    if (checkMode) {
      console.error(`OUT OF SYNC: ${relLabel} (ordering)`);
    } else {
      if (!existsSync(parentDirOnDisk)) mkdirSync(parentDirOnDisk, { recursive: true });
      writeFileSync(metadataPath, desired, 'utf-8');
      console.log(`Updated ${relLabel} (ordering)`);
    }
  }
}

// --- Phase 5: Sync screenshot images into Plone Image content ---
// Walks docs/**/*.md (excluding generated/output trees), collects every
// ![alt](relative/path.png) reference, and ensures a matching Plone Image
// content exists at <IMAGES_PARENT_PATH>/images/<slug> with the binary
// copied into <UID>/image/<filename>. Pages produce `image` blocks whose
// `url` points at the Plone @id (handled in parseConceptsMd above).

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(filePath) {
  const buf = readFileSync(filePath, { encoding: null }).slice(0, 24);
  if (!buf.slice(0, 8).equals(PNG_SIG)) {
    throw new Error(`Not a PNG (cannot read dimensions): ${filePath}`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function extToContentType(ext) {
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  throw new Error(`Unsupported image extension: .${ext}`);
}

function buildImageFolderContent() {
  return {
    '@id': `${IMAGES_PARENT_PATH}/images`,
    '@type': 'Document',
    UID: IMAGES_FOLDER_UID,
    allow_discussion: false,
    blocks: { 'title-1': { '@type': 'title' } },
    blocks_layout: { items: ['title-1'] },
    contributors: [],
    created: '2025-01-01T00:00:00+00:00',
    creators: ['admin'],
    description: 'Documentation screenshots referenced by editor-experience pages.',
    effective: null,
    exclude_from_nav: true,
    expires: null,
    'exportimport.constrains': {},
    'exportimport.conversation': [],
    'exportimport.versions': {},
    id: 'images',
    is_folderish: true,
    language: '##DEFAULT##',
    layout: 'document_view',
    lock: {},
    modified: '2025-01-01T00:00:00+00:00',
    parent: {
      '@id': IMAGES_PARENT_PATH,
      '@type': 'Document',
      UID: IMAGES_PARENT_UID,
      description: '',
      image_field: null,
      image_scales: {},
      review_state: 'published',
      title: 'Docs',
      type_title: 'Page',
    },
    review_state: 'published',
    rights: '',
    subjects: [],
    title: 'Images',
    type_title: 'Page',
    version: 'current',
    workflow_history: {},
    working_copy: null,
    working_copy_of: null,
  };
}

function buildImageContent({ slug, filename, sourcePath, contentType }) {
  const fileSize = statSync(sourcePath).size;
  const dims = contentType === 'image/png'
    ? readPngDimensions(sourcePath)
    : { width: 0, height: 0 };
  const uid = `docs-images-${slug}-001`;
  return {
    uid,
    folderName: uid,
    data: {
      '@id': `${IMAGES_PARENT_PATH}/images/${slug}`,
      '@type': 'Image',
      UID: uid,
      allow_discussion: false,
      contributors: [],
      created: '2025-01-01T00:00:00+00:00',
      creators: ['admin'],
      description: '',
      effective: null,
      exclude_from_nav: true,
      expires: null,
      'exportimport.constrains': {},
      'exportimport.conversation': [],
      'exportimport.versions': {},
      id: slug,
      image: {
        blob_path: `${uid}/image/${filename}`,
        'content-type': contentType,
        filename,
        height: dims.height,
        size: fileSize,
        width: dims.width,
      },
      is_folderish: false,
      language: '##DEFAULT##',
      layout: 'image_view',
      lock: {},
      modified: '2025-01-01T00:00:00+00:00',
      parent: {
        '@id': `${IMAGES_PARENT_PATH}/images`,
        '@type': 'Document',
        UID: IMAGES_FOLDER_UID,
        description: 'Documentation screenshots referenced by editor-experience pages.',
        image_field: null,
        image_scales: {},
        review_state: 'published',
        title: 'Images',
        type_title: 'Page',
      },
      review_state: null,
      rights: '',
      subjects: [],
      title: filename,
      type_title: 'Image',
      version: 'current',
      workflow_history: {},
      working_copy: null,
      working_copy_of: null,
    },
  };
}

// Walk docs/ recursively for image references.
const SKIP_DIRS = new Set(['_build', 'node_modules', 'content', 'examples', 'static']);

function discoverImageRefs() {
  const refs = new Map();
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const md = readFileSync(full, 'utf-8');
        const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let m;
        while ((m = re.exec(md)) !== null) {
          const url = m[2];
          if (/^https?:\/\//.test(url) || url.startsWith('/')) continue;
          const sourcePath = resolve(dirname(full), url);
          if (!existsSync(sourcePath)) {
            console.error(`WARNING: image not found: ${url} (referenced from ${full})`);
            continue;
          }
          const filename = basename(sourcePath);
          const ext = (filename.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
          const slug = filename.replace(/\.[^.]+$/, '');
          if (refs.has(slug)) {
            const prev = refs.get(slug);
            if (prev.sourcePath !== sourcePath) {
              throw new Error(
                `Image slug collision: '${slug}' resolves to both ${prev.sourcePath} and ${sourcePath}`
              );
            }
            continue;
          }
          refs.set(slug, { sourcePath, filename, contentType: extToContentType(ext) });
        }
      }
    }
  }
  walk(__dirname);
  return refs;
}

const imageRefs = discoverImageRefs();

// Example-block editor screenshots. docs/examples/_images/<slug>-edit.png
// is produced by tests-playwright/screenshots/example-blocks.spec.ts and
// is git-ignored (a regenerable staging file). The example pages are pure
// Plone content with no markdown body, so these screenshots are not
// reachable by discoverImageRefs above. Register each one directly so
// Phase 5 materialises a committed Plone Image, and remember the example
// page it belongs to for the Phase 5b image-block injection.
const EXAMPLE_IMAGES_DIR = join(EXAMPLES_DIR, '_images');
const exampleScreenshots = [];
if (existsSync(EXAMPLE_IMAGES_DIR)) {
  for (const filename of readdirSync(EXAMPLE_IMAGES_DIR).sort()) {
    if (!filename.toLowerCase().endsWith('.png')) continue;
    const imageSlug = filename.replace(/\.[^.]+$/, '');
    const exampleSlug = imageSlug.replace(/-edit$/, '');
    const sourcePath = join(EXAMPLE_IMAGES_DIR, filename);
    const existing = imageRefs.get(imageSlug);
    if (existing && existing.sourcePath !== sourcePath) {
      throw new Error(
        `Image slug collision: '${imageSlug}' resolves to both ` +
          `${existing.sourcePath} and ${sourcePath}`,
      );
    }
    imageRefs.set(imageSlug, {
      sourcePath,
      filename,
      contentType: extToContentType('png'),
    });
    exampleScreenshots.push({ imageSlug, exampleSlug });
  }
}

if (imageRefs.size > 0) {
  // Ensure _images parent folder content
  const folderPath = join(CONTENT_DIR, IMAGES_FOLDER_UID);
  const folderJsonPath = join(folderPath, 'data.json');
  const desiredFolderJson = JSON.stringify(buildImageFolderContent(), null, 2) + '\n';
  const originalFolderJson = existsSync(folderJsonPath)
    ? readFileSync(folderJsonPath, 'utf-8')
    : '';
  if (desiredFolderJson !== originalFolderJson) {
    outOfSync = true;
    if (checkMode) {
      console.error(`OUT OF SYNC: ${IMAGES_FOLDER_UID}/data.json (images folder)`);
    } else {
      if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
      writeFileSync(folderJsonPath, desiredFolderJson, 'utf-8');
      console.log(`Updated images folder content: ${IMAGES_FOLDER_UID}/data.json`);
    }
  }

  // Materialize each image
  for (const [slug, ref] of [...imageRefs.entries()].sort()) {
    const content = buildImageContent({ slug, ...ref });
    const folderPath = join(CONTENT_DIR, content.folderName);
    const dataPath = join(folderPath, 'data.json');
    const blobDir = join(folderPath, 'image');
    const blobPath = join(blobDir, ref.filename);

    const desiredJson = JSON.stringify(content.data, null, 2) + '\n';
    const originalJson = existsSync(dataPath) ? readFileSync(dataPath, 'utf-8') : '';
    const blobMissing = !existsSync(blobPath);
    const blobSizeMismatch = !blobMissing
      && statSync(blobPath).size !== statSync(ref.sourcePath).size;
    const blobNeedsCopy = blobMissing || blobSizeMismatch;

    if (desiredJson !== originalJson || blobNeedsCopy) {
      outOfSync = true;
      const reasons = [];
      if (desiredJson !== originalJson) reasons.push('metadata');
      if (blobNeedsCopy) reasons.push('blob');
      if (checkMode) {
        console.error(`OUT OF SYNC: image '${slug}' (${reasons.join(', ')})`);
      } else {
        if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });
        if (!existsSync(blobDir)) mkdirSync(blobDir, { recursive: true });
        if (desiredJson !== originalJson) writeFileSync(dataPath, desiredJson, 'utf-8');
        if (blobNeedsCopy) copyFileSync(ref.sourcePath, blobPath);
        console.log(`Synced image: ${slug} (${reasons.join(', ')})`);
      }
    }
  }
}

// --- Phase 5b: Inject the editor screenshot into each example page ---
// Each example-block page (docs/examples/<slug>) gets an `image` block
// just below its title, showing the editor screenshot materialised in
// Phase 5. The example .md files carry no image reference on purpose —
// the screenshot documents the live editor, so it is Plone-only and
// never ships in the Sphinx build — so the block is injected straight
// into the page's Plone content. Idempotent: writes only when the block
// is missing or has drifted. Runs only for screenshots present on disk;
// on a fresh checkout (docs/examples/_images is git-ignored and empty)
// the already-committed blocks stand untouched.
const SCREENSHOT_BLOCK_ID = 'editor-screenshot';
for (const { imageSlug, exampleSlug } of exampleScreenshots) {
  const jsonPath = join(mdFileToContentDir(`${exampleSlug}.md`), 'data.json');
  if (!existsSync(jsonPath)) {
    console.error(
      `WARNING: no example page for screenshot '${imageSlug}' ` +
        `(expected ${jsonPath})`,
    );
    continue;
  }
  const original = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(original);
  const desiredBlock = {
    '@type': 'image',
    url: `${IMAGES_PARENT_PATH}/images/${imageSlug}`,
    alt: `The ${exampleSlug} example block being edited in Volto Hydra`,
    align: 'center',
    size: 'l',
  };
  const items = data.blocks_layout?.items || [];
  const blockChanged =
    JSON.stringify(data.blocks?.[SCREENSHOT_BLOCK_ID]) !==
    JSON.stringify(desiredBlock);
  // Place the screenshot directly after the title block (item 0).
  const newItems = items.includes(SCREENSHOT_BLOCK_ID)
    ? items
    : [items[0], SCREENSHOT_BLOCK_ID, ...items.slice(1)].filter(Boolean);
  const layoutChanged = JSON.stringify(newItems) !== JSON.stringify(items);
  if (blockChanged || layoutChanged) {
    data.blocks = { ...data.blocks, [SCREENSHOT_BLOCK_ID]: desiredBlock };
    data.blocks_layout = { ...data.blocks_layout, items: newItems };
    const updated = JSON.stringify(data, null, 2) + '\n';
    if (updated !== original) {
      outOfSync = true;
      if (checkMode) {
        console.error(`OUT OF SYNC: ${exampleSlug} editor-screenshot block`);
      } else {
        writeFileSync(jsonPath, updated, 'utf-8');
        console.log(`Injected editor-screenshot block: ${exampleSlug}`);
      }
    }
  }
}

// --- Phase 6: Sync the global __metadata__.json ---
// content/content/content/__metadata__.json is the export-import addon's
// manifest: which data.json files exist, which blobs to import, and which
// UIDs get which local roles. When new pages or images appear (Phase 4 +
// Phase 5), the manifest needs to grow with them; when pages disappear
// (e.g., we deleted /docs/deployment), the manifest needs to drop those
// entries. Plone's importer reads this file and silently skips any data
// not listed — so a stale manifest = pages that exist on disk but never
// import. The deploy validator (deploy-all.sh Step 0) catches that drift.
{
  const globalPath = join(CONTENT_DIR, '__metadata__.json');
  if (existsSync(globalPath)) {
    const meta = JSON.parse(readFileSync(globalPath, 'utf-8'));
    const originalGlobal = JSON.stringify(meta, null, 2) + '\n';

    const dataFilesOnDisk = new Set();
    const blobFilesOnDisk = new Set();
    function walk(absDir, relDir) {
      for (const entry of readdirSync(absDir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const abs = join(absDir, entry.name);
        const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
        if (entry.isFile()) {
          if (entry.name === 'data.json' && relDir !== '') {
            dataFilesOnDisk.add(`${relDir}/data.json`);
          }
          if (/\.(png|jpg|jpeg|svg|gif|webp)$/i.test(entry.name)) {
            blobFilesOnDisk.add(rel);
          }
        } else if (entry.isDirectory()) {
          walk(abs, rel);
        }
      }
    }
    walk(CONTENT_DIR, '');

    // Read each data.json once to extract @id + UID. Sort _data_files_
    // by @id depth ascending — Plone's importer processes the list
    // linearly and skips children whose parent doesn't yet exist
    // (manifests as "Container /foo for /foo/bar not found" warnings),
    // so parents must come first. The Plone-import schema's top-level
    // key here is `local_roles` (NOT `content` — ExportImportMetadata
    // rejects unknown kwargs at site creation time).
    const dataFileEntries = [];
    for (const f of dataFilesOnDisk) {
      let d;
      try {
        d = JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf-8'));
      } catch { continue; }
      const atId = d['@id'] || '';
      const depth = atId === '/' ? 0 : atId.split('/').filter(Boolean).length;
      // plone_site_root is the Plone Site itself — implicit container for
      // every top-level entry. Force it to position 0 regardless of @id.
      const isPloneRoot = d.UID === 'plone_site_root';
      dataFileEntries.push({ f, atId, depth, uid: d.UID, isPloneRoot });
    }
    dataFileEntries.sort((a, b) => {
      if (a.isPloneRoot !== b.isPloneRoot) return a.isPloneRoot ? -1 : 1;
      return a.depth - b.depth || a.atId.localeCompare(b.atId);
    });
    meta._data_files_ = dataFileEntries.map(e => e.f);
    meta._blob_files_ = [...blobFilesOnDisk].sort();

    const allUids = new Set(dataFileEntries.map(e => e.uid).filter(Boolean));
    const localRoles = meta.local_roles || {};
    for (const uid of allUids) {
      if (!localRoles[uid]) localRoles[uid] = { local_roles: { admin: ['Owner'] } };
    }
    for (const uid of Object.keys(localRoles)) {
      if (!allUids.has(uid)) delete localRoles[uid];
    }
    meta.local_roles = localRoles;
    // Drop a stray `content` key in case an earlier (broken) sync run
    // wrote one — Plone import will reject it as an unknown kwarg.
    delete meta.content;

    const updated = JSON.stringify(meta, null, 2) + '\n';
    if (updated !== originalGlobal) {
      outOfSync = true;
      if (checkMode) {
        console.error('OUT OF SYNC: __metadata__.json (_data_files_ / _blob_files_ / local_roles)');
      } else {
        writeFileSync(globalPath, updated, 'utf-8');
        console.log('Updated global __metadata__.json (_data_files_ / _blob_files_ / local_roles)');
      }
    }
  }
}

// --- Phase 7: Validate the resulting Plone tree ---
// Same canonical validator the mock-api server uses at startup and the
// deploy script calls in Step 0. Fails fast on the export-shape pitfalls
// we've hit at site creation (underscore ids, child-before-parent in
// _data_files_, top-level `content` key, missing local_roles).
{
  const { validate, formatReport } = await import(
    '../tests-playwright/fixtures/plone-content-validator.cjs'
  ).then(m => m.default);
  const result = validate(CONTENT_DIR);
  if (result.errors.length > 0) {
    console.error(formatReport('validate', result));
    process.exit(1);
  }
}

if (checkMode && outOfSync) {
  console.error('\nFiles are out of sync with example files. Run: node docs/sync.mjs');
  process.exit(1);
}

if (!outOfSync) {
  console.log('All files are in sync with example files.');
}
