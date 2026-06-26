/**
 * Template merging utilities.
 *
 * This module is intentionally free of Volto-specific imports (immer, lodash,
 * @plone/volto) so that unit tests in hydra-js can import it directly.
 */

import { expandTemplates } from '@volto-hydra/helpers';
import { getBlockSchema, getFieldRegions } from '../../../hydra-js/buildBlockPathMap.js';

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
    pageBlocksFields = { blocks_layout: {} },
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
            // blocks_layout container: blocks in shared dict, layout in
            // field[region]. Process every region so siblings (e.g. footer) are
            // preserved rather than rebuilt away as { items }.
            const fieldValue = processedBlock[fieldName];
            if (!fieldValue || !processedBlock.blocks) continue;
            hasBlocksLayout = true;
            const newFieldLayout = { ...fieldValue };
            for (const region of getFieldRegions(fieldDef, fieldValue)) {
              const layoutItems = fieldValue[region];
              if (!Array.isArray(layoutItems) || layoutItems.length === 0) {
                newFieldLayout[region] = layoutItems || [];
                continue;
              }
              const fieldBlocks = {};
              for (const id of layoutItems) {
                if (processedBlock.blocks[id]) fieldBlocks[id] = processedBlock.blocks[id];
              }
              const { blocks: newFieldBlocks, layout: newRegionLayout } = await processBlocksRecursive(
                fieldBlocks,
                layoutItems,
                null,
                templateState,
                true, // skip template expansion — already done
              );
              Object.assign(mergedBlocks, newFieldBlocks);
              newFieldLayout[region] = newRegionLayout;
            }
            processedBlock[fieldName] = newFieldLayout;
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
        // A layout field value may hold multiple regions (array sub-keys);
        // process each and preserve siblings.
        let mergedBlocks = {};
        for (const [key, value] of Object.entries(block)) {
          if (key === 'blocks' || !value || typeof value !== 'object') continue;
          const regionKeys = Object.keys(value).filter((r) => Array.isArray(value[r]));
          if (regionKeys.length === 0) continue;
          const newFieldLayout = { ...value };
          for (const region of regionKeys) {
            const ids = value[region];
            const fieldBlocks = {};
            for (const id of ids) {
              if (block.blocks[id]) fieldBlocks[id] = block.blocks[id];
            }
            const { blocks: newFieldBlocks, layout: newRegionLayout } = await processBlocksRecursive(
              fieldBlocks,
              ids,
              null,
              templateState,
              true,
            );
            Object.assign(mergedBlocks, newFieldBlocks);
            newFieldLayout[region] = newRegionLayout;
          }
          processedBlock[key] = newFieldLayout;
        }
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

  // Process each page-level blocks field
  // All fields share result.blocks; each field has its own layout (fieldName: { items: [...] })
  const fieldsToProcess = Object.keys(pageBlocksFields).length > 0
    ? pageBlocksFields
    : { blocks_layout: {} }; // Default to main blocks_layout field

  for (const [fieldName, fieldDef] of Object.entries(fieldsToProcess)) {
    const layoutData = result[fieldName];

    // A blocks_layout value may hold multiple named regions (sub-keys). Process
    // each region independently and reassemble the field so sibling regions
    // (e.g. footer) survive — rebuilding it as { items } would drop them.
    const newFieldLayout = { ...(layoutData || {}) };

    for (const region of getFieldRegions(fieldDef, layoutData)) {
      const blocksData = result.blocks || {};
      const layout = layoutData?.[region] || [];
      // allowedLayouts may be declared per region; the default region (items)
      // falls back to the field-level value.
      const allowedLayouts =
        (fieldDef?.regions?.[region]?.allowedLayouts) ||
        (region === 'items' ? fieldDef?.allowedLayouts : null) ||
        null;

      if (layout.length === 0 && !allowedLayouts) {
        // No layout items and no forced layout - keep region as-is
        newFieldLayout[region] = layout;
        continue;
      }

      // Build a blocks subset for this region (only blocks it references)
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

      // Remove old region blocks dropped during template processing, then merge
      // in the new blocks. Blocks from other fields/regions must remain.
      const updatedBlocks = { ...result.blocks };
      for (const oldId of Object.keys(fieldBlocks)) {
        if (!newBlocks[oldId]) {
          delete updatedBlocks[oldId];
        }
      }
      result.blocks = { ...updatedBlocks, ...newBlocks };
      newFieldLayout[region] = newLayout;
    }

    result[fieldName] = newFieldLayout;
  }

  return {
    merged: result,
    newTemplateIds: Array.from(allNewTemplateIds),
  };
}
