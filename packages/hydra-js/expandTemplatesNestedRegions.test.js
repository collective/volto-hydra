import { expandTemplatesSync } from '@volto-hydra/helpers';

/**
 * Regression test for the gap that let #234 (blocks_layout regions) merge green
 * while the SSR render-merge silently couldn't handle a nested container in the
 * regions shape.
 *
 * The existing merge tests (applyLayoutTemplate.test.js) use only FLAT layouts
 * (top-level slate blocks), and regions.test.js covers the admin path
 * (buildBlockPathMap), not the render-merge. So nothing ran a nested container
 * in the new `blocks_layout.<region>` shape through expandTemplatesSync — the
 * exact path a branded footer (a `columns` block forced layout) takes on SSR.
 */
describe('expandTemplatesSync — nested container in blocks_layout region (#234)', () => {
  // A branded footer layout: a columns block (regions shape) with one column
  // holding a slate, all fixed+readOnly+slotId, like a real all-fixed layout.
  const template = {
    '@id': '/templates/footer-layout',
    blocks: {
      cols: {
        '@type': 'columns',
        fixed: true,
        readOnly: true,
        slotId: 'cols',
        blocks: {
          'col-1': {
            '@type': 'column',
            fixed: true,
            readOnly: true,
            slotId: 'col-1',
            blocks: {
              'txt-1': {
                '@type': 'slate',
                fixed: true,
                readOnly: true,
                slotId: 'txt-1',
                value: [{ text: 'Footer text' }],
              },
            },
            // column's content region (default `items`)
            blocks_layout: { items: ['txt-1'] },
          },
        },
        // #234 regions shape: the `columns` region is a sub-key of the block's
        // own blocks_layout dict — NOT a separate `columns` field with `.items`.
        blocks_layout: { columns: ['col-1'] },
      },
    },
    blocks_layout: { items: ['cols'] },
  };

  test('forced layout preserves the columns block and its nested column content', () => {
    const result = expandTemplatesSync([], {
      blocks: {},
      templates: { '/templates/footer-layout': template },
      templateState: {},
      allowedLayouts: ['/templates/footer-layout'],
    });

    const cols = result.find((b) => b['@type'] === 'columns');
    expect(cols).toBeDefined();

    // The nested `columns` region must survive the merge (currently it's dropped
    // / throws because findBlocksLayoutField only recognizes a `.items` field).
    expect(cols.blocks_layout?.columns).toEqual(['col-1']);
    expect(cols.blocks?.['col-1']).toBeDefined();

    // And the column's own content must survive.
    expect(cols.blocks['col-1'].blocks?.['txt-1']).toBeDefined();
    expect(cols.blocks['col-1'].blocks_layout?.items).toEqual(['txt-1']);
  });
});
