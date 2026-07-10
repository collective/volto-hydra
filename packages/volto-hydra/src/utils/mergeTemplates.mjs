/**
 * Template merging utilities.
 *
 * This module is intentionally free of Volto-specific imports (immer, lodash,
 * @plone/volto) so that unit tests in hydra-js can import it directly.
 */

import { expandTemplates } from '@volto-hydra/helpers';

/**
 * Merge templates into page data. Expands template references in every blocks field via
 * the public merge (expandTemplates), which fully expands all nested regions
 * (blocks_layout + object_list) at apply time. No admin-side re-entry or schema walk.
 *
 * @param {Object} page - Page formData
 * @param {Object} options
 * @param {Function} options.loadTemplate - Async function: (templateId) => Promise<templateData>
 * @param {Object} options.pageBlocksFields - Map of field names to field config (e.g. { blocks_layout: { allowedLayouts: [...] } })
 * @param {Function} options.uuidGenerator - UUID generator function (required)
 * @param {string} options.filterInstanceId - Only process blocks matching this instance ID
 * @param {Object} options.preloadedTemplates - Pre-loaded template cache
 * @returns {Promise<{merged: Object, newTemplateIds: string[]}>}
 */
export async function mergeTemplatesIntoPage(page, options = {}) {
  const {
    loadTemplate,
    pageBlocksFields = { items: {} },
    uuidGenerator,
    filterInstanceId,
    preloadedTemplates = {},
    firstInsert,
    idFieldMap,
  } = options;

  let result = { ...page };
  const allNewTemplateIds = new Set();

  // Expand one page-level blocks field via the PUBLIC merge. That merge fully expands
  // every nested region (blocks_layout regions AND object_list arrays) at apply time,
  // so there is NO admin-side re-entry or schema walk — we run expandTemplates once and
  // reshape its items back into a blocks dict + layout, using each emitted block (with
  // its nested content already filled) as-is.
  async function expandBlocksField(blocks, layout, allowedLayouts, templateState) {
    const items = await expandTemplates(layout, {
      blocks,
      templateState,
      loadTemplate,
      preloadedTemplates,
      allowedLayouts,
      uuidGenerator,
      filterInstanceId,
      firstInsert,
      idFieldMap, // { blockType: { field: idField } } — admin-resolved from the schema
    });

    const newBlocks = {};
    const newLayout = [];
    for (const item of items) {
      const { '@uid': blockId, ...block } = item;
      newLayout.push(blockId);
      newBlocks[blockId] = block;
    }

    for (const tid of templateState.newTemplateIds || []) {
      allNewTemplateIds.add(tid);
    }

    return { blocks: newBlocks, layout: newLayout };
  }

  // Process each page-level blocks field. A blocks field's name is the key in
  // the shared `blocks_layout` dict (default 'items'); all share result.blocks.
  // Writing each field's list back under blocks_layout[fieldName] preserves the
  // sibling fields (e.g. footer) — rebuilding the whole dict would drop them.
  const fieldsToProcess = Object.keys(pageBlocksFields).length > 0
    ? pageBlocksFields
    : { items: {} }; // Default to the main 'items' blocks field

  for (const [fieldName, fieldDef] of Object.entries(fieldsToProcess)) {
    const blocksData = result.blocks || {};
    const layout = result.blocks_layout?.[fieldName] || [];
    const allowedLayouts = fieldDef?.allowedLayouts || null;

    if (layout.length === 0 && !allowedLayouts) {
      // No layout items and no forced layout - leave this field as-is
      continue;
    }

    // Build a blocks subset for this field (only blocks it references)
    const fieldBlocks = {};
    for (const blockId of layout) {
      if (blocksData[blockId]) {
        fieldBlocks[blockId] = blocksData[blockId];
      }
    }

    const templateState = {};
    const { blocks: newBlocks, layout: newLayout } = await expandBlocksField(
      fieldBlocks,
      layout,
      allowedLayouts,
      templateState
    );

    // Remove old field blocks dropped during template processing, then merge in
    // the new blocks. Blocks from other fields must remain.
    const updatedBlocks = { ...result.blocks };
    for (const oldId of Object.keys(fieldBlocks)) {
      if (!newBlocks[oldId]) {
        delete updatedBlocks[oldId];
      }
    }
    result.blocks = { ...updatedBlocks, ...newBlocks };
    result.blocks_layout = { ...result.blocks_layout, [fieldName]: newLayout };
  }

  return {
    merged: result,
    newTemplateIds: Array.from(allNewTemplateIds),
  };
}
