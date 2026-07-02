import fs from 'fs';
import path from 'path';
import { mergeTemplatesIntoPage } from './mergeTemplates.js';

const load = (p) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', '..', p), 'utf-8'));
const textOf = (b) =>
  b?.plaintext ?? b?.value?.[0]?.children?.[0]?.text ?? b?.value?.[0]?.text ?? '';

/**
 * Integration :866 ("saved template changes … appear on other pages using the template")
 * at the unit level, with the REAL fixtures (test-layout has a grid + multiple regions,
 * which a minimal header+slot fixture doesn't exercise):
 *   1. apply the template to page 1 (load)
 *   2. edit the fixed+readOnly header (template edit mode)
 *   3. SAVE: reverse-merge (filterInstanceId) the edited page back into the template
 *   4. VIEW page 2: forward-merge the UPDATED template — the edit must appear.
 */
test('template edit propagates to another page — real fixtures (integration :866)', async () => {
  const template = load('tests-playwright/fixtures/content/templates/test-layout/data.json');
  const page1 = load('tests-playwright/fixtures/content/template-test-page/data.json');
  const page2 = load('tests-playwright/fixtures/content/template-test-page-2/data.json');
  let c = 0;
  const uuidGenerator = () => `u-${++c}`;

  // 1. Apply the template to page 1.
  const { merged: applied1 } = await mergeTemplatesIntoPage(page1, {
    loadTemplate: async () => template,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });
  const header1 = Object.values(applied1.blocks).find((b) => b.slotId === 'header' && b.fixed);
  expect(header1).toBeDefined();
  expect(textOf(header1)).toContain('Template Header');
  const instanceId = header1.templateInstanceId;

  // 2. Edit the fixed+readOnly header (as template edit mode allows).
  header1.value = [{ type: 'p', children: [{ text: 'Template Header - EDITED' }] }];
  header1.plaintext = 'Template Header - EDITED';

  // 3. SAVE: reverse-merge the edited instance back into the template (View.jsx path).
  const { merged: updatedTemplate } = await mergeTemplatesIntoPage(template, {
    loadTemplate: async () => applied1,
    filterInstanceId: instanceId,
    uuidGenerator,
  });
  const tplHeader = Object.values(updatedTemplate.blocks).find((b) => b.slotId === 'header' && b.fixed);
  expect(textOf(tplHeader)).toContain('EDITED'); // captured into the template

  // 4. VIEW page 2: forward-merge the UPDATED template — the edit must propagate.
  const { merged: applied2 } = await mergeTemplatesIntoPage(page2, {
    loadTemplate: async () => updatedTemplate,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });
  const header2Entry = Object.entries(applied2.blocks).find(([, b]) => b.slotId === 'header' && b.fixed);
  expect(header2Entry).toBeDefined();
  const [header2Id, header2] = header2Entry;
  expect(textOf(header2)).toContain('EDITED'); // propagated to page 2
  // The header must be in the RENDERED layout, not just present in blocks — otherwise
  // it never renders (the block exists but isn't listed in blocks_layout.items).
  expect(applied2.blocks_layout.items).toContain(header2Id);

  // 5. Page 1 VIEW-mode re-render (what :866 asserts at line 926): re-forward-merge the
  // edited page with the updated template — the header must render with the edit.
  const { merged: rerendered1 } = await mergeTemplatesIntoPage(applied1, {
    loadTemplate: async () => updatedTemplate,
    pageBlocksFields: { items: {} },
    uuidGenerator,
  });
  const h1Entry = Object.entries(rerendered1.blocks).find(([, b]) => b.slotId === 'header' && b.fixed);
  expect(h1Entry).toBeDefined();
  const [h1Id, h1] = h1Entry;
  expect(rerendered1.blocks_layout.items).toContain(h1Id); // in the rendered layout
  expect(textOf(h1)).toContain('EDITED'); // page 1 shows the edit in view mode
});
