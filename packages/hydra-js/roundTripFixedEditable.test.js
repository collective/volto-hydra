import fs from 'fs';
import path from 'path';
import { mergeTemplatesIntoPage } from './mergeTemplates.js';

const load = (p) =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', '..', p), 'utf-8'));

/**
 * The gap roundTripSlotContent.test.js misses: a FIXED-but-editable block
 * (fixed:true, readOnly:false). The user edits its content on the instance, the
 * page is saved (PATCH), then RE-MERGED on the next view/edit load (forward-merge
 * again). The edit must survive — the template must NOT re-inject its own fixed
 * content over the instance's edit.
 *
 * Mirrors integration template-advanced.spec.ts (Editable Fixed Layout →
 * edit the header → save → reload).
 */
test('round-trip: an edited fixed-but-editable block survives a re-merge (save → reload)', async () => {
  const template = load(
    'tests-playwright/fixtures/content/templates/editable-fixed-layout/data.json',
  );
  let c = 0;
  const uuidGenerator = () => `uuid-${++c}`;

  // 1. LOAD (apply): a page that references the template. The block carrying the
  // templateId reference is what the merge expands into the fixed layout.
  const page = {
    '@id': '/another-page',
    '@type': 'Document',
    blocks: {
      'ref-1': {
        '@type': 'slate',
        templateId: 'resolveuid/editable-fixed-layout-uid',
      },
    },
    blocks_layout: { items: ['ref-1'] },
  };

  const { merged: loaded } = await mergeTemplatesIntoPage(page, {
    loadTemplate: async () => template,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });

  // The applied page has a fixed-but-editable header (fixed:true, no readOnly).
  const headerEntry = Object.entries(loaded.blocks).find(
    ([, b]) => b.slotId === 'header' && b.fixed && !b.readOnly,
  );
  expect(headerEntry).toBeTruthy();
  const [headerId, headerBlock] = headerEntry;
  expect(headerBlock.plaintext).toBe('Editable Header');

  // 2. EDIT: the user edits the fixed-but-editable header's content.
  loaded.blocks[headerId] = {
    ...headerBlock,
    value: [{ type: 'h1', children: [{ text: 'Editable Header EDITED' }] }],
    plaintext: 'Editable Header EDITED',
  };

  // 3. RELOAD (view/edit re-merge): forward-merge the edited page again.
  const { merged: reloaded } = await mergeTemplatesIntoPage(loaded, {
    loadTemplate: async () => template,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });

  // 4. ASSERT: the edit survives; the template did NOT re-inject "Editable Header".
  const survived = Object.values(reloaded.blocks).some(
    (b) =>
      b.slotId === 'header' &&
      (b.plaintext === 'Editable Header EDITED' ||
        b.value?.[0]?.children?.[0]?.text === 'Editable Header EDITED'),
  );
  expect(survived).toBe(true);
});
