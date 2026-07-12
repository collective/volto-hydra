/**
 * Content sanity: every block sits in a container that allows its @type.
 *
 * Walks all committed content (docs/content = the deployed site, plus the
 * Playwright fixtures) and, using the REAL buildBlockPathMap + the shared
 * block config the frontends ship, asserts that every block's @type is in its
 * container's resolved allowedSiblingTypes.
 *
 * Why this exists: a block whose type isn't allowed in its container makes the
 * container-aware move (chevron / drag) walk the block OUT to the nearest
 * ancestor that DOES accept the type — so on mobile a block "escapes" its
 * container. That was invisible because block-sanity/page-integrity only check
 * rendering, not containment. This catches the class at the source: either the
 * container's allowedBlocks is too narrow, or the content put a block where it
 * doesn't belong.
 *
 * Covers both storage models — blocks_layout (gridBlock/column/accordion-panel
 * items, page items) AND object_list (slider slides, form subblocks) — because
 * buildBlockPathMap unifies them under the region model and assigns
 * allowedSiblingTypes to every child regardless of storage.
 */
import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildBlockPathMap } from './blockPath.js';
import { sharedBlocksConfig } from '../../../../tests-playwright/fixtures/shared-block-schemas.js';

// Vitest runs from the repo root (where vitest.config.js lives).
const REPO_ROOT = process.cwd();
const intl = { formatMessage: (m) => (m && (m.defaultMessage || m.id)) || '' };

// Content-type / structural / placeholder blocks that are NOT governed by
// allowedBlocks: they're placed by content-type layouts (title, description),
// are structural wrappers (column), or are seeded placeholders (empty).
const EXEMPT_TYPES = new Set(['empty', 'column', 'title', 'description']);

function findDataJson(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      findDataJson(full, out);
    } else if (e.name === 'data.json') {
      out.push(full);
    }
  }
  return out;
}

describe('content sanity — blocks are allowed in their container', () => {
  const roots = [
    path.join(REPO_ROOT, 'docs/content'),
    path.join(REPO_ROOT, 'tests-playwright/fixtures/content'),
  ];
  const files = roots.flatMap((r) => findDataJson(r));

  test('every content page has data.json to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test('no block sits in a container that disallows its @type', () => {
    const violations = [];
    for (const file of files) {
      let page;
      try {
        page = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        continue;
      }
      if (!page || !page.blocks || !page.blocks_layout) continue;
      const map = buildBlockPathMap(page, sharedBlocksConfig, intl);
      for (const [id, info] of Object.entries(map)) {
        if (id.startsWith('_') || !info || typeof info !== 'object' || Array.isArray(info)) {
          continue;
        }
        // Template-placed / content-type-fixed blocks aren't governed by allowedBlocks.
        if (info.isTemplateInstance || info.isFixed) continue;
        const type = info.blockType;
        if (!type || EXEMPT_TYPES.has(type)) continue;
        const allowed = info.allowedSiblingTypes;
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(type)) {
          const parentType = map[info.parentId]?.blockType || 'page';
          violations.push(
            `${type} (${id}) is not allowed in ${parentType} [${allowed.join(', ')}] — ` +
              `${path.relative(REPO_ROOT, file)}`,
          );
        }
      }
    }
    expect(
      violations,
      `Blocks placed in containers that disallow their @type ` +
        `(widen the container/page allowedBlocks, or move/convert the block):\n` +
        [...new Set(violations)].map((v) => '  - ' + v).join('\n'),
    ).toEqual([]);
  });
});
