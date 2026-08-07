/**
 * Repro: an EMPTY forced-layout region (allowedLayouts) — the NSW site
 * announcement — must seed a TYPED placeholder when empty, not a typeless
 * `@type: 'empty'`. A typeless seed comes through the admin as
 * "Block data undefined" and can't be inline-edited (it has no fields).
 *
 * This pins down whether the typeless seed is a config gap (region needs a
 * defaultBlockType / single allowedBlocks) or a deeper forced-layout bug.
 */
import { describe, test, expect } from 'vitest';
import { PAGE_BLOCK_UID } from '@volto-hydra/hydra-js';
import {
  buildBlockPathMap,
  ensureEmptyBlockIfEmpty,
  getBlockById,
} from './blockPath.js';
import { mergeTemplatesIntoPage } from './mergeTemplates.mjs';

const EMPTY_ANNOUNCEMENT_TEMPLATE = {
  '@id': '/templates/site-announcement',
  '@type': 'Document',
  blocks: {},
  blocks_layout: { items: [] },
};

const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

const makeCfg = (announcementExtra) => ({
  _page: {
    id: '_page',
    schema: () => ({
      properties: {
        items: {
          widget: 'blocks_layout',
          allowedBlocks: ['slate'],
          defaultBlockType: 'slate',
        },
        announcement: {
          widget: 'blocks_layout',
          title: 'Announcement',
          allowedLayouts: ['/templates/site-announcement'],
          ...announcementExtra,
        },
      },
    }),
  },
  slate: { id: 'slate' },
  globalAlert: { id: 'globalAlert' },
});

const seedAnnouncement = (cfg) => {
  const form = {
    '@type': 'Document',
    blocks: { a: { '@type': 'slate' } },
    blocks_layout: { items: ['a'], announcement: [] },
  };
  const map = buildBlockPathMap(form, cfg, intl);
  let n = 0;
  const result = ensureEmptyBlockIfEmpty(
    form,
    { parentId: PAGE_BLOCK_UID },
    map,
    () => `seed-${++n}`,
    cfg,
    { intl },
  );
  const id = result.blocks_layout.announcement?.[0];
  return id ? result.blocks[id] : undefined;
};

describe('empty forced-layout region seeds an empty placeholder (announcement)', () => {
  // The NSW announcement is EMPTY by default (no band). We want hydra to seed an
  // `@type: "empty"` placeholder — a selectable slot with a '+' the editor uses
  // to add a global alert — NOT a typed block and NOT the page default.
  //
  // `defaultBlockType: "empty"` forces that regardless of allowedBlocks. The
  // frontend renders the seed via the central Block dispatch, which renders
  // `empty` as a selectable slot.
  test('defaultBlockType:"empty" -> seeds an @type:"empty" placeholder', () => {
    const seed = seedAnnouncement(
      makeCfg({ allowedBlocks: ['globalAlert'], defaultBlockType: 'empty' }),
    );
    expect(seed?.['@type']).toBe('empty');
  });

  // ROOT CAUSE of the earlier admin "Block data undefined": with NO type config
  // the region falls back to the PAGE default block type (here slate) — the wrong
  // type for the announcement. Documented so the defaultBlockType isn't dropped.
  test('no type config -> falls back to the page default (slate), the bug', () => {
    const seed = seedAnnouncement(makeCfg({}));
    expect(seed?.['@type']).toBe('slate');
  });
});

// The full admin data-prep pipeline for an empty forced layout (View.jsx
// INITIAL_DATA): merge the forced layout, then seed empty page regions. The
// seeded announcement placeholder must be RESOLVABLE via getBlockById (what the
// admin uses) — the admin logged "Block data undefined / blockPathMap entry:
// undefined", so this pins whether the pure pipeline is at fault (it isn't — the
// bug is View.jsx committing the pre-seed data to Redux).
describe('empty forced-layout data-prep pipeline (merge + seed)', () => {
  test('the seeded announcement placeholder resolves via getBlockById', async () => {
    const cfg = makeCfg({
      allowedBlocks: ['globalAlert'],
      defaultBlockType: 'empty',
    });
    const page = {
      '@type': 'Document',
      blocks: { a: { '@type': 'slate' } },
      blocks_layout: { items: ['a'], announcement: [] },
    };

    const { merged } = await mergeTemplatesIntoPage(page, {
      loadTemplate: async () => EMPTY_ANNOUNCEMENT_TEMPLATE,
      pageBlocksFields: {
        items: {},
        announcement: { allowedLayouts: ['/templates/site-announcement'] },
      },
      uuidGenerator: () => 'ann-seed',
      blocksConfig: cfg,
      intl,
    });

    let map = buildBlockPathMap(merged, cfg, intl);
    const seeded = ensureEmptyBlockIfEmpty(
      merged,
      { parentId: PAGE_BLOCK_UID },
      map,
      () => 'ann-seed',
      cfg,
      { intl, properties: merged },
    );
    map = buildBlockPathMap(seeded, cfg, intl);

    const annIds = seeded.blocks_layout.announcement || [];
    expect(annIds.length, 'announcement region should be seeded').toBe(1);
    const seedId = annIds[0];
    const resolved = getBlockById(seeded, map, seedId);
    expect(resolved, `getBlockById must resolve the seed ${seedId}`).toBeTruthy();
    expect(resolved?.['@type']).toBe('empty');
  });
});
