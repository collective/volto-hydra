import { mergeTemplatesIntoPage } from './mergeTemplates.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// jest runs with cwd = packages/hydra-js
const root = join(process.cwd(), '..', '..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

/**
 * Regression test for the template-edit-mode "saved changes persist" flow,
 * exercised end-to-end with the real fixtures:
 *
 *   1. INIT merge — load page, inject the template's fixed blocks
 *   2. edit a fixed (template-owned) block
 *   3. reverse merge — capture the page edit back into the template (on save)
 *
 * The reverse merge (View.jsx) calls mergeTemplatesIntoPage WITHOUT
 * pageBlocksFields, so it relies on the default. That default was once
 * `{ blocks_layout: {} }` (the old field-name convention); after the blocks-
 * field rename the merge reads `blocks_layout[fieldName]`, so the stale default
 * resolved to `blocks_layout.blocks_layout` (nothing) and silently skipped the
 * whole merge — the edit was never captured. The default must be `{ items: {} }`.
 */
test('reverse merge captures a template-block edit using the default pageBlocksFields', async () => {
  const page = load('tests-playwright/fixtures/content/template-test-page/data.json');
  const template = load('tests-playwright/fixtures/content/templates/test-layout/data.json');
  let c = 0;
  const uuidGenerator = () => `uuid-${++c}`;

  // 1. INIT merge (page load): inject the template's fixed blocks
  const { merged: formData } = await mergeTemplatesIntoPage(page, {
    loadTemplate: async () => template,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });

  // 2. Edit the header (template edit mode)
  const headerId = Object.entries(formData.blocks)
    .find(([, b]) => b.slotId === 'header' && b.fixed)?.[0];
  const prevInstanceId = formData.blocks[headerId].templateInstanceId;
  formData.blocks[headerId] = {
    ...formData.blocks[headerId],
    value: [{ type: 'h1', children: [{ text: 'Template Header - From Template - edited' }] }],
  };

  // 3. Reverse merge (save) — note: NO pageBlocksFields, so the default is used
  const { merged: updatedTemplate } = await mergeTemplatesIntoPage(template, {
    loadTemplate: async () => formData,
    filterInstanceId: prevInstanceId,
    uuidGenerator,
  });

  const hdr = Object.values(updatedTemplate.blocks).find((b) => b.slotId === 'header' && b.fixed);
  expect(hdr).toBeDefined();
  expect(hdr.value[0].children[0].text).toContain('edited');
});
