/**
 * Template merging utilities.
 *
 * This module is intentionally free of Volto-specific imports (immer, lodash,
 * @plone/volto) so that unit tests in hydra-js can import it directly.
 */

import { expandTemplates } from '@volto-hydra/helpers';
import { getBlockSchema } from '../../../hydra-js/buildBlockPathMap.js';

/**
 * Merge templates into page data. Expands template references in all blocks fields,
 * replacing fixed blocks with template versions and preserving user content in placeholders.
 * Also recurses into object_list arrays using schema-driven detection.
 *
 * @param {Object} page - Page formData
 * @param {Object} options
 * @param {Function} options.loadTemplate - Async function: (templateId) => Promise<templateData>
 * @param {Object} options.pageBlocksFields - Map of field names to field config (e.g. { blocks_layout: { allowedLayouts: [...] } })
 * @param {Function} options.uuidGenerator - UUID generator function (required)
 * @param {string} options.filterInstanceId - Only process blocks matching this instance ID
 * @param {Object} options.preloadedTemplates - Pre-loaded template cache
 * @param {Object} options.blocksConfig - Block configuration registry (for schema lookup)
 * @param {Object} options.intl - react-intl object (for schema resolution)
 * @returns {Promise<{merged: Object, newTemplateIds: string[]}>}
 */
export async function mergeTemplatesIntoPage(page, options = {}) {
  const {
    loadTemplate,
    pageBlocksFields = { items: {} },
    uuidGenerator,
    filterInstanceId,
    preloadedTemplates = {},
    blocksConfig,
    intl,
    firstInsert,
  } = options;

  let result = { ...page };
  const allNewTemplateIds = new Set();

  // Helper to expand templates at one level, then recurse into nested containers.
  // Only the top call for each blocks field does template expansion;
  // nested containers just need their inner containers processed (templates
  // inside containers were already merged by expandTemplatesSync).
  async function processBlocksRecursive(blocks, layout, allowedLayouts, templateState, skipExpand = false) {
    let items;
    if (skipExpand) {
      // Already expanded — just convert layout IDs to block objects
      items = layout.map(id => blocks[id] ? { ...blocks[id], '@uid': id } : null).filter(Boolean);
    } else {
      items = await expandTemplates(layout, {
        blocks,
        templateState,
        loadTemplate,
        preloadedTemplates,
        allowedLayouts,
        uuidGenerator,
        filterInstanceId,
        firstInsert,
      });
    }

    // Convert items back to blocks/layout format
    const newBlocks = {};
    const newLayout = [];

    for (const item of items) {
      const { '@uid': blockId, ...block } = item;
      newLayout.push(blockId);

      // Process nested containers using schema (same approach as buildBlockPathMap.processItem)
      const processedBlock = { ...block };
      const blockSchema = blocksConfig && getBlockSchema(block['@type'], intl, blocksConfig, block);
      if (blockSchema?.properties) {
        let mergedBlocks = {};
        let hasBlocksLayout = false;

        for (const [fieldName, fieldDef] of Object.entries(blockSchema.properties)) {
          if (fieldDef.widget === 'object' && fieldDef.schema?.properties) {
            // Nested object widget — descend into nested schema
            // (handled by recursive schema traversal if needed)
            continue;
          }

          if (fieldDef.widget === 'blocks_layout') {
            // A blocks field: its name is the key under the block's shared
            // blocks_layout dict. Process its list and write it back, preserving
            // sibling fields (e.g. footer).
            if (!processedBlock.blocks || !processedBlock.blocks_layout) continue;
            const layoutItems = processedBlock.blocks_layout[fieldName];
            if (!Array.isArray(layoutItems) || layoutItems.length === 0) continue;
            hasBlocksLayout = true;
            // Re-enter the nested level via the PUBLIC expand on the EMITTED dict
            // (registered in nestedContainers when the container was emitted) with the
            // SAME state — recognition hits and processNestedTemplateLevel fills this
            // level's slots. (skipExpand=true on a subset left deep slots unfilled and
            // missed recognition.) The admin just re-enters; the fill lives in expand.
            const { blocks: newFieldBlocks, layout: newRegionLayout } = await processBlocksRecursive(
              processedBlock.blocks,
              layoutItems,
              null,
              templateState,
              false,
            );
            Object.assign(mergedBlocks, newFieldBlocks);
            processedBlock.blocks_layout = {
              ...processedBlock.blocks_layout,
              [fieldName]: newRegionLayout,
            };
          } else if (fieldDef.widget === 'object_list') {
            // object_list container: expand templates same as blocks_layout
            const dataPath = fieldDef.dataPath || [fieldName];
            let arrayItems = processedBlock;
            for (const key of dataPath) {
              arrayItems = arrayItems?.[key];
            }
            if (!Array.isArray(arrayItems) || arrayItems.length === 0) continue;

            const idField = fieldDef.idField || '@id';
            const expanded = await expandTemplates(arrayItems, {
              templateState,
              loadTemplate,
              preloadedTemplates,
              uuidGenerator,
              filterInstanceId,
              idField,
            });
            // Strip @uid (transport field) and write back through dataPath.
            // Clone each level while descending: processedBlock is a shallow
            // copy of `block`, so its nested objects (e.g. block.table for
            // slateTable's table.rows dataPath) are still the original —
            // and INITIAL_DATA arrives deep-frozen, so a direct assignment
            // throws "Cannot assign to read only property".
            const cleaned = expanded.map(({ '@uid': _uid, ...rest }) => rest);
            let target = processedBlock;
            for (let i = 0; i < dataPath.length - 1; i++) {
              const key = dataPath[i];
              target[key] = { ...target[key] };
              target = target[key];
            }
            target[dataPath[dataPath.length - 1]] = cleaned;
          }
        }

        if (hasBlocksLayout) {
          // Keep any blocks not referenced by layout fields (orphaned/utility blocks)
          for (const [id, blockData] of Object.entries(processedBlock.blocks || {})) {
            if (!mergedBlocks[id]) mergedBlocks[id] = blockData;
          }
          processedBlock.blocks = mergedBlocks;
        }
      } else if (block.blocks && block.blocks_layout) {
        // Implicit container (no schema definition, e.g. Grid) — fallback.
        // The blocks_layout dict holds one list per blocks field (array
        // sub-key); process each and preserve siblings.
        let mergedBlocks = {};
        const newLayoutDict = { ...block.blocks_layout };
        for (const [region, ids] of Object.entries(block.blocks_layout)) {
          if (!Array.isArray(ids)) continue;
          const { blocks: newFieldBlocks, layout: newRegionLayout } = await processBlocksRecursive(
            block.blocks,
            ids,
            null,
            templateState,
            false,
          );
          Object.assign(mergedBlocks, newFieldBlocks);
          newLayoutDict[region] = newRegionLayout;
        }
        processedBlock.blocks_layout = newLayoutDict;
        for (const [id, blockData] of Object.entries(block.blocks)) {
          if (!mergedBlocks[id]) mergedBlocks[id] = blockData;
        }
        processedBlock.blocks = mergedBlocks;
      }

      newBlocks[blockId] = processedBlock;
    }

    // Collect new template IDs
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
    const { blocks: newBlocks, layout: newLayout } = await processBlocksRecursive(
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
