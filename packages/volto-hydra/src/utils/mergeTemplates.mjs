/**
 * Template merging utilities.
 *
 * This module is intentionally free of Volto-specific imports (immer, lodash,
 * @plone/volto) so that unit tests in hydra-js can import it directly.
 */

import { expandTemplates } from '@volto-hydra/hydra-js';
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
    pageBlocksFields = { blocks_layout: {} },
    uuidGenerator,
    filterInstanceId,
    preloadedTemplates = {},
    blocksConfig,
    intl,
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
            // blocks_layout container: blocks in shared dict, layout in field.items
            const layoutItems = processedBlock[fieldName]?.items;
            if (!layoutItems || !processedBlock.blocks) continue;
            hasBlocksLayout = true;
            const fieldBlocks = {};
            for (const id of layoutItems) {
              if (processedBlock.blocks[id]) fieldBlocks[id] = processedBlock.blocks[id];
            }
            const { blocks: newFieldBlocks, layout: newFieldLayout } = await processBlocksRecursive(
              fieldBlocks,
              layoutItems,
              null,
              templateState,
              true, // skip template expansion — already done
            );
            Object.assign(mergedBlocks, newFieldBlocks);
            processedBlock[fieldName] = { items: newFieldLayout };
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
            // Strip @uid (transport field) and write back through dataPath
            const cleaned = expanded.map(({ '@uid': _uid, ...rest }) => rest);
            let target = processedBlock;
            for (let i = 0; i < dataPath.length - 1; i++) {
              target = target[dataPath[i]];
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
      } else if (block.blocks && block.blocks_layout?.items) {
        // Implicit container (no schema definition, e.g. Grid) — fallback
        let mergedBlocks = {};
        for (const [key, value] of Object.entries(block)) {
          if (key !== 'blocks' && value?.items && Array.isArray(value.items)) {
            const fieldBlocks = {};
            for (const id of value.items) {
              if (block.blocks[id]) fieldBlocks[id] = block.blocks[id];
            }
            const { blocks: newFieldBlocks, layout: newFieldLayout } = await processBlocksRecursive(
              fieldBlocks,
              value.items,
              null,
              templateState,
              true,
            );
            Object.assign(mergedBlocks, newFieldBlocks);
            processedBlock[key] = { items: newFieldLayout };
          }
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
    const blocksData = result.blocks || {};
    const layoutData = result[fieldName];
    const layout = layoutData?.items || [];
    const allowedLayouts = fieldDef?.allowedLayouts || null;

    if (layout.length === 0 && !allowedLayouts) {
      // No layout items and no forced layout - skip this field
      continue;
    }

    // Build a blocks subset for this field (only blocks referenced by this field's layout)
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

    // Remove old field blocks that were dropped during template processing,
    // then merge in the new blocks. Other fields' blocks must remain.
    const updatedBlocks = { ...result.blocks };
    for (const oldId of Object.keys(fieldBlocks)) {
      if (!newBlocks[oldId]) {
        delete updatedBlocks[oldId];
      }
    }
    result.blocks = { ...updatedBlocks, ...newBlocks };
    result[fieldName] = { items: newLayout };
  }

  return {
    merged: result,
    newTemplateIds: Array.from(allNewTemplateIds),
  };
}
