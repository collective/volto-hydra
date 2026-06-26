/**
 * mergeTemplatesIntoPage must preserve sibling regions of a blocks_layout field.
 *
 * Regression: the page-level merge rebuilt `blocks_layout = { items }`, which
 * dropped the `footer` region on the second FORM_DATA sent to the iframe (so an
 * edited footer rendered empty). Each region must be processed and reassembled.
 */
import { describe, test, expect } from 'vitest';
import { mergeTemplatesIntoPage } from './mergeTemplates.mjs';

const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };
const blocksConfig = { slate: { id: 'slate' } };
const loadTemplate = async () => ({ blocks: {}, blocks_layout: { items: [] } });

describe('mergeTemplatesIntoPage — region preservation', () => {
  test('keeps the footer region when merging the items region (no templates)', async () => {
    const formData = {
      blocks: {
        'body-1': { '@type': 'slate' },
        'footer-1': { '@type': 'slate' },
      },
      blocks_layout: {
        items: ['body-1'],
        footer: ['footer-1'],
      },
    };

    const { merged } = await mergeTemplatesIntoPage(formData, {
      loadTemplate,
      preloadedTemplates: {},
      pageBlocksFields: {
        blocks_layout: { regions: { footer: {} } },
      },
      uuidGenerator: (() => {
        let n = 0;
        return () => `u-${++n}`;
      })(),
      blocksConfig,
      intl,
    });

    expect(merged.blocks_layout.items).toEqual(['body-1']);
    expect(merged.blocks_layout.footer).toEqual(['footer-1']); // preserved
    expect(merged.blocks['footer-1']).toBeTruthy();
  });

  test('an empty declared footer region survives the merge', async () => {
    const formData = {
      blocks: { 'body-1': { '@type': 'slate' } },
      blocks_layout: { items: ['body-1'], footer: [] },
    };

    const { merged } = await mergeTemplatesIntoPage(formData, {
      loadTemplate,
      preloadedTemplates: {},
      pageBlocksFields: { blocks_layout: { regions: { footer: {} } } },
      uuidGenerator: () => 'u-1',
      blocksConfig,
      intl,
    });

    expect(merged.blocks_layout.items).toEqual(['body-1']);
    expect(Array.isArray(merged.blocks_layout.footer)).toBe(true);
    expect(merged.blocks_layout.footer).toEqual([]);
  });
});
