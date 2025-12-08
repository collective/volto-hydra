/**
 * Utilities for working with nested block paths in Volto Hydra.
 * Supports container blocks where blocks can be nested inside other blocks.
 */

import { applyBlockDefaults } from '@plone/volto/helpers';

/**
 * Build a map of blockId -> path for all blocks in formData.
 * Traverses nested containers using schema to find `type: 'blocks'` fields.
 *
 * @param {Object} formData - The form data with blocks
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Array|null} pageAllowedBlocks - Allowed block types at page level (from initBridge config)
 * @returns {Object} Map of blockId -> { path: string[], parentId: string|null, allowedSiblingTypes: Array|null, maxSiblings: number|null }
 *
 * Path format: ['blocks', 'columns-1', 'columns', 'col-1', 'blocks', 'text-1a']
 * This allows accessing: formData.blocks['columns-1'].columns['col-1'].blocks['text-1a']
 */
export function buildBlockPathMap(formData, blocksConfig, pageAllowedBlocks = null) {
  const pathMap = {};

  if (!formData?.blocks) {
    return pathMap;
  }

  /**
   * Recursively traverse block structure.
   * @param {Object} blocksObj - Object containing blocks keyed by uid
   * @param {Array} layoutItems - Array of block uids in order
   * @param {Array} currentPath - Path to this blocks object (e.g., ['blocks'] or ['blocks', 'columns-1', 'columns'])
   * @param {string|null} parentId - Parent block's uid, or null for page-level
   * @param {Array|null} allowedBlocks - Allowed block types in this container (from parent's schema)
   * @param {number|null} maxLength - Maximum number of blocks allowed in this container
   */
  function traverse(blocksObj, layoutItems, currentPath, parentId, allowedBlocks = null, maxLength = null) {
    if (!blocksObj || !layoutItems) return;

    layoutItems.forEach((blockId) => {
      const block = blocksObj[blockId];
      if (!block) return;

      // Store path for this block, including allowedBlocks and maxLength for validation
      const blockPath = [...currentPath, blockId];
      pathMap[blockId] = {
        path: blockPath,
        parentId: parentId,
        allowedSiblingTypes: allowedBlocks, // What types are allowed as siblings in this container
        maxSiblings: maxLength, // Maximum number of blocks allowed in this container
      };

      // Check if this block type has container fields (type: 'blocks')
      const blockType = block['@type'];
      const blockConfig = blocksConfig?.[blockType];
      const schema = typeof blockConfig?.blockSchema === 'function'
        ? blockConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
        : blockConfig?.blockSchema;

      if (schema?.properties) {
        // Look for fields with type: 'blocks' (container fields)
        Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
          if (fieldDef.type === 'blocks') {
            // This is a container field - recurse into it
            const nestedBlocks = block[fieldName];
            const layoutFieldName = `${fieldName}_layout`;
            const nestedLayout = block[layoutFieldName]?.items;

            if (nestedBlocks && nestedLayout) {
              traverse(
                nestedBlocks,
                nestedLayout,
                [...blockPath, fieldName],
                blockId,
                fieldDef.allowedBlocks || null, // Pass allowedBlocks from schema
                fieldDef.maxLength || null, // Pass maxLength from schema
              );
            }
          }
        });
      }

      // Also check for implicit container fields (blocks/blocks_layout without schema)
      // This handles Volto's built-in container blocks like Grid
      if (block.blocks && block.blocks_layout?.items && !pathMap[Object.keys(block.blocks)[0]]) {
        // For implicit containers, allowedBlocks and maxLength come from block config level
        const implicitAllowedBlocks = blockConfig?.allowedBlocks || null;
        const implicitMaxLength = blockConfig?.maxLength || null;
        traverse(
          block.blocks,
          block.blocks_layout.items,
          [...blockPath, 'blocks'],
          blockId,
          implicitAllowedBlocks,
          implicitMaxLength,
        );
      }
    });
  }

  // Start traversal from page-level blocks
  // Pass pageAllowedBlocks so page-level blocks get the correct allowedSiblingTypes
  const pageLayoutItems = formData.blocks_layout?.items || [];
  traverse(formData.blocks, pageLayoutItems, ['blocks'], null, pageAllowedBlocks);

  return pathMap;
}

/**
 * Get a block by its path.
 * @param {Object} formData - The form data
 * @param {Array} path - Path array like ['blocks', 'columns-1', 'columns', 'col-1']
 * @returns {Object|undefined} The block data or undefined if not found
 */
export function getBlockByPath(formData, path) {
  if (!path || path.length === 0) return undefined;

  let current = formData;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Set a block value by its path, returning new formData (immutable update).
 * @param {Object} formData - The form data
 * @param {Array} path - Path array like ['blocks', 'columns-1', 'columns', 'col-1']
 * @param {Object} value - New block value
 * @returns {Object} New formData with the block updated
 */
export function setBlockByPath(formData, path, value) {
  if (!path || path.length === 0) return formData;

  // Build nested update
  const result = { ...formData };
  let current = result;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    current[key] = { ...current[key] };
    current = current[key];
  }

  current[path[path.length - 1]] = value;
  return result;
}

/**
 * Get a block using blockPathMap lookup with fallback.
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block ID to find
 * @returns {Object|undefined} Block data or undefined
 */
export function getBlockById(formData, blockPathMap, blockId) {
  const pathInfo = blockPathMap?.[blockId];
  if (pathInfo?.path) {
    return getBlockByPath(formData, pathInfo.path);
  }
  // Fallback to direct lookup for page-level blocks
  return formData?.blocks?.[blockId];
}

/**
 * Update a block using blockPathMap lookup with fallback.
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block ID to update
 * @param {Object} newBlockData - New block data
 * @returns {Object} New formData with block updated
 */
export function updateBlockById(formData, blockPathMap, blockId, newBlockData) {
  const pathInfo = blockPathMap?.[blockId];
  if (pathInfo?.path) {
    return setBlockByPath(formData, pathInfo.path, newBlockData);
  }
  // Fallback to direct update for page-level blocks
  return {
    ...formData,
    blocks: {
      ...formData.blocks,
      [blockId]: newBlockData,
    },
  };
}

/**
 * Get the container field configuration for a nested block.
 * Returns the allowedBlocks, defaultBlock, etc. from the parent's schema.
 *
 * @param {string} blockId - The block ID to check
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @returns {Object|null} Container field config { fieldName, allowedBlocks, defaultBlock, maxLength, parentId } or null if page-level
 */
export function getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig) {
  const pathInfo = blockPathMap?.[blockId];

  // No parent means page-level block
  if (!pathInfo?.parentId) {
    return null;
  }

  const parentId = pathInfo.parentId;
  const parentBlock = getBlockById(formData, blockPathMap, parentId);

  if (!parentBlock) {
    console.log('[BLOCKPATH] getContainerFieldConfig: parentBlock not found for', parentId);
    return null;
  }

  const parentType = parentBlock['@type'];
  const parentConfig = blocksConfig?.[parentType];
  const schema = typeof parentConfig?.blockSchema === 'function'
    ? parentConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
    : parentConfig?.blockSchema;

  if (!schema?.properties) {
    // Check for implicit container (blocks/blocks_layout without schema)
    // For these containers (like gridBlock), allowedBlocks/maxLength are at the block config level
    const hasBlocks = !!parentBlock.blocks;
    const layoutItems = parentBlock.blocks_layout?.items;
    const includesBlock = layoutItems?.includes(blockId);
    if (hasBlocks && includesBlock) {
      return {
        fieldName: 'blocks',
        parentId,
        allowedBlocks: parentConfig?.allowedBlocks || null,
        defaultBlock: parentConfig?.defaultBlock || null,
        maxLength: parentConfig?.maxLength || null,
      };
    }
    return null;
  }

  // Find which container field contains this block
  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    if (fieldDef.type === 'blocks') {
      const layoutFieldName = `${fieldName}_layout`;
      const layoutItems = parentBlock[layoutFieldName]?.items;

      if (layoutItems?.includes(blockId)) {
        return {
          fieldName,
          parentId,
          allowedBlocks: fieldDef.allowedBlocks || null,
          defaultBlock: fieldDef.defaultBlock || null,
          maxLength: fieldDef.maxLength || null,
        };
      }
    }
  }

  // Fallback: Check for implicit container (blocks/blocks_layout) even when schema exists
  // This handles blocks like gridBlock that have a schema but use implicit blocks/blocks_layout
  // For these containers, allowedBlocks/maxLength are at the block config level
  const hasBlocks = !!parentBlock.blocks;
  const layoutItems = parentBlock.blocks_layout?.items;
  const includesBlock = layoutItems?.includes(blockId);
  if (hasBlocks && includesBlock) {
    return {
      fieldName: 'blocks',
      parentId,
      allowedBlocks: parentConfig?.allowedBlocks || null,
      defaultBlock: parentConfig?.defaultBlock || null,
      maxLength: parentConfig?.maxLength || null,
    };
  }

  return null;
}

/**
 * Get the container field configuration for a block that IS a container.
 * This returns the config for the first container field (type: 'blocks') in the block's schema.
 * Used when the selected block is a container and we want to add children inside it.
 *
 * @param {string} blockId - The block ID to check
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @returns {Object|null} Container field config { fieldName, allowedBlocks, defaultBlock, maxLength } or null if not a container
 */
export function getBlockOwnContainerConfig(blockId, blockPathMap, formData, blocksConfig) {
  const block = getBlockById(formData, blockPathMap, blockId);
  if (!block) return null;

  const blockType = block['@type'];
  const blockConfig = blocksConfig?.[blockType];
  const schema = typeof blockConfig?.blockSchema === 'function'
    ? blockConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
    : blockConfig?.blockSchema;

  if (schema?.properties) {
    // Find the first container field (type: 'blocks')
    for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
      if (fieldDef.type === 'blocks') {
        return {
          fieldName,
          containerId: blockId,
          allowedBlocks: fieldDef.allowedBlocks || null,
          defaultBlock: fieldDef.defaultBlock || null,
          maxLength: fieldDef.maxLength || null,
        };
      }
    }
  }

  // Check for implicit container (blocks/blocks_layout without schema definition)
  if (block.blocks && block.blocks_layout?.items) {
    return {
      fieldName: 'blocks',
      containerId: blockId,
      allowedBlocks: blockConfig?.allowedBlocks || null,
      defaultBlock: blockConfig?.defaultBlock || null,
      maxLength: blockConfig?.maxLength || null,
    };
  }

  return null;
}

/**
 * Insert a block into a container after a specified block.
 * Treats the page itself as a container when containerConfig is null.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} afterBlockId - Block ID to insert after
 * @param {string} newBlockId - New block's ID
 * @param {Object} newBlockData - New block's data
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or null for page-level
 * @returns {Object} New formData with block inserted
 */
export function insertBlockInContainer(formData, blockPathMap, afterBlockId, newBlockId, newBlockData, containerConfig) {
  // Page-level insertion (page is just a container with blocks/blocks_layout)
  if (!containerConfig) {
    const newBlocks = {
      ...formData.blocks,
      [newBlockId]: newBlockData,
    };

    const currentItems = formData.blocks_layout?.items || [];
    const insertIndex = currentItems.indexOf(afterBlockId) + 1;
    const newItems = [...currentItems];
    newItems.splice(insertIndex, 0, newBlockId);

    return {
      ...formData,
      blocks: newBlocks,
      blocks_layout: { items: newItems },
    };
  }

  // Container-level insertion
  const { parentId, fieldName } = containerConfig;
  const layoutFieldName = `${fieldName}_layout`;

  // Get the parent block using path
  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container insertion`);
  }

  // Create new container field with the added block
  const newContainerBlocks = {
    ...parentBlock[fieldName],
    [newBlockId]: newBlockData,
  };

  // Insert into layout after the selected block
  const currentItems = parentBlock[layoutFieldName]?.items || [];
  const insertIndex = currentItems.indexOf(afterBlockId) + 1;
  const newItems = [...currentItems];
  newItems.splice(insertIndex, 0, newBlockId);

  // Update the parent block with new blocks and layout
  const updatedParentBlock = {
    ...parentBlock,
    [fieldName]: newContainerBlocks,
    [layoutFieldName]: { items: newItems },
  };

  // Use path-aware update to handle nested containers
  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Delete a block from a container.
 * Treats the page itself as a container when containerConfig is null.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block ID to delete
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or null for page-level
 * @returns {Object} New formData with block removed
 */
export function deleteBlockFromContainer(formData, blockPathMap, blockId, containerConfig) {
  // Page-level deletion (page is just a container with blocks/blocks_layout)
  if (!containerConfig) {
    const { [blockId]: removed, ...remainingBlocks } = formData.blocks;

    const currentItems = formData.blocks_layout?.items || [];
    const newItems = currentItems.filter((id) => id !== blockId);

    return {
      ...formData,
      blocks: remainingBlocks,
      blocks_layout: { items: newItems },
    };
  }

  // Container-level deletion
  const { parentId, fieldName } = containerConfig;
  const layoutFieldName = `${fieldName}_layout`;

  // Get the parent block using path
  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container deletion`);
  }

  // Remove block from container field
  const { [blockId]: removed, ...remainingBlocks } = parentBlock[fieldName];

  // Remove from layout
  const currentItems = parentBlock[layoutFieldName]?.items || [];
  const newItems = currentItems.filter((id) => id !== blockId);

  // Update the parent block with remaining blocks and layout
  const updatedParentBlock = {
    ...parentBlock,
    [fieldName]: remainingBlocks,
    [layoutFieldName]: { items: newItems },
  };

  // Use path-aware update to handle nested containers
  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Mutate a block in a container (replace its data).
 * Treats the page itself as a container when containerConfig is null.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block ID to mutate
 * @param {Object} newBlockData - New block data
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or null for page-level
 * @returns {Object} New formData with block mutated
 */
export function mutateBlockInContainer(formData, blockPathMap, blockId, newBlockData, containerConfig) {
  // Page-level mutation
  if (!containerConfig) {
    return {
      ...formData,
      blocks: {
        ...formData.blocks,
        [blockId]: newBlockData,
      },
    };
  }

  // Container-level mutation
  const { parentId, fieldName } = containerConfig;

  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container mutation`);
  }

  const updatedParentBlock = {
    ...parentBlock,
    [fieldName]: {
      ...parentBlock[fieldName],
      [blockId]: newBlockData,
    },
  };

  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Determine the block type to use for an empty container.
 * Uses defaultBlock if specified, or the single allowed type, otherwise 'empty'.
 *
 * @param {Object|null} containerConfig - Container config with allowedBlocks/defaultBlock
 * @returns {string} Block type to create
 */
function getEmptyBlockType(containerConfig) {
  if (containerConfig?.defaultBlock) {
    return containerConfig.defaultBlock;
  }
  if (containerConfig?.allowedBlocks?.length === 1) {
    return containerConfig.allowedBlocks[0];
  }
  return 'empty';
}

/**
 * Ensure a container has at least one block (empty block if container is empty).
 * Call this after deleting a block to ensure empty containers get an empty block.
 *
 * @param {Object} formData - The form data
 * @param {Object|null} containerConfig - Container config (null for page-level)
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} options - Options for block initialization
 * @param {Object} options.intl - Intl object for i18n
 * @param {Object} options.metadata - Metadata from form
 * @param {Object} options.properties - Form properties
 * @returns {Object} formData with empty block added if container was empty, or original formData
 */
export function ensureEmptyBlockIfEmpty(formData, containerConfig, blockPathMap, uuidGenerator, blocksConfig, options = {}) {
  const { intl, metadata, properties } = options;

  if (!containerConfig) {
    // Page-level: check blocks_layout.items
    const items = formData.blocks_layout?.items || [];
    if (items.length === 0) {
      const newBlockId = uuidGenerator();
      const blockType = getEmptyBlockType(null);
      let blockData = { '@type': blockType };

      // Apply block defaults to get proper initial values
      if (intl && blocksConfig) {
        blockData = applyBlockDefaults({
          data: blockData,
          intl,
          metadata,
          properties,
        }, blocksConfig);
      }

      return {
        ...formData,
        blocks: {
          ...formData.blocks,
          [newBlockId]: blockData,
        },
        blocks_layout: { items: [newBlockId] },
      };
    }
    return formData;
  }

  // Container-level: check container's blocks_layout
  const { parentId, fieldName } = containerConfig;
  const layoutFieldName = `${fieldName}_layout`;

  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    return formData;
  }

  const items = parentBlock[layoutFieldName]?.items || [];
  if (items.length === 0) {
    const newBlockId = uuidGenerator();
    const blockType = getEmptyBlockType(containerConfig);
    let blockData = { '@type': blockType };

    // Apply block defaults to get proper initial values
    if (intl && blocksConfig) {
      blockData = applyBlockDefaults({
        data: blockData,
        intl,
        metadata,
        properties,
      }, blocksConfig);
    }

    const updatedParentBlock = {
      ...parentBlock,
      [fieldName]: {
        ...parentBlock[fieldName],
        [newBlockId]: blockData,
      },
      [layoutFieldName]: { items: [newBlockId] },
    };
    return setBlockByPath(formData, parentPath, updatedParentBlock);
  }

  return formData;
}

/**
 * Initialize a container block with default child blocks (recursively).
 * Call this when creating a new block to pre-populate containers.
 *
 * For example, when creating a 'columns' block:
 * - columns has allowedBlocks: ['column'], so creates a column inside
 * - column has defaultBlock: 'slate', so creates a slate inside that column
 *
 * @param {Object} blockData - The block data (with at least '@type')
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @param {Object} options - Options for block initialization
 * @param {Object} options.intl - Intl object for i18n
 * @param {Object} options.metadata - Metadata from form
 * @param {Object} options.properties - Form properties
 * @returns {Object} Block data with container fields initialized (if applicable)
 */
export function initializeContainerBlock(blockData, blocksConfig, uuidGenerator, options = {}) {
  const { intl, metadata, properties } = options;
  const blockType = blockData['@type'];
  const blockConfig = blocksConfig?.[blockType];

  // Get schema to find container fields
  const schema = typeof blockConfig?.blockSchema === 'function'
    ? blockConfig.blockSchema({ formData: {}, intl: intl || { formatMessage: (m) => m.defaultMessage } })
    : blockConfig?.blockSchema;

  if (!schema?.properties) {
    return blockData;
  }

  // Find container field (type: 'blocks')
  let containerFieldName = null;
  let containerFieldDef = null;

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    if (fieldDef.type === 'blocks') {
      containerFieldName = fieldName;
      containerFieldDef = fieldDef;
      break;
    }
  }

  // Not a container - return unchanged
  if (!containerFieldName) {
    return blockData;
  }

  // Determine the initial child block type
  let childBlockType = null;
  if (containerFieldDef.defaultBlock) {
    childBlockType = containerFieldDef.defaultBlock;
  } else if (containerFieldDef.allowedBlocks?.length === 1) {
    childBlockType = containerFieldDef.allowedBlocks[0];
  }

  // No determinable child type - return with empty container structure
  if (!childBlockType) {
    const layoutFieldName = `${containerFieldName}_layout`;
    return {
      ...blockData,
      [containerFieldName]: {},
      [layoutFieldName]: { items: [] },
    };
  }

  // Create child block and apply defaults (like Volto's BlocksForm does)
  const childBlockId = uuidGenerator();
  let childBlockData = { '@type': childBlockType };

  // Apply block defaults to get proper initial values (e.g., slate's value field)
  if (intl) {
    childBlockData = applyBlockDefaults({
      data: childBlockData,
      intl,
      metadata,
      properties,
    }, blocksConfig);
  }

  // Recursively initialize the child if it's also a container
  childBlockData = initializeContainerBlock(childBlockData, blocksConfig, uuidGenerator, options);

  // Add child to container
  const layoutFieldName = `${containerFieldName}_layout`;
  return {
    ...blockData,
    [containerFieldName]: {
      [childBlockId]: childBlockData,
    },
    [layoutFieldName]: { items: [childBlockId] },
  };
}

/**
 * Move a block from one location to another (supports same-container reorder,
 * cross-container moves, and page↔container moves).
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block being moved
 * @param {string} targetBlockId - Block to insert relative to
 * @param {boolean} insertAfter - True to insert after target, false for before
 * @param {string|null} sourceParentId - Parent of source block (null for page-level)
 * @param {string|null} targetParentId - Parent of target block (null for page-level)
 * @param {Object} blocksConfig - Block configuration from registry
 * @returns {Object|null} New formData with block moved, or null if invalid move
 */
export function moveBlockBetweenContainers(
  formData,
  blockPathMap,
  blockId,
  targetBlockId,
  insertAfter,
  sourceParentId,
  targetParentId,
  blocksConfig,
) {
  // Get block data to move
  const sourcePath = blockPathMap[blockId]?.path;
  const blockData = getBlockByPath(formData, sourcePath);

  if (!blockData) {
    console.error('[MOVE_BLOCK] Could not find block data for:', blockId);
    return null;
  }

  // Same container - just reorder
  if (sourceParentId === targetParentId) {
    return reorderBlockInContainer(
      formData,
      blockPathMap,
      blockId,
      targetBlockId,
      insertAfter,
      sourceParentId,
      blocksConfig,
    );
  }

  // Different containers - need to remove from source and add to target
  // First, delete from source
  // getContainerFieldConfig takes the block ID and finds its container
  const sourceContainerConfig = sourceParentId
    ? getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig)
    : null;

  let newFormData = deleteBlockFromContainer(
    formData,
    blockPathMap,
    blockId,
    sourceContainerConfig,
  );

  // Get target container config by looking up target block's container
  const targetContainerConfig = targetParentId
    ? getContainerFieldConfig(targetBlockId, blockPathMap, formData, blocksConfig)
    : null;

  // Validate that block type is allowed in target container
  const blockType = blockData?.['@type'];
  const targetAllowedBlocks = blockPathMap[targetBlockId]?.allowedSiblingTypes;
  if (targetAllowedBlocks && blockType && !targetAllowedBlocks.includes(blockType)) {
    console.warn('[MOVE_BLOCK] Block type not allowed in target container:', blockType, 'allowed:', targetAllowedBlocks);
    return null; // Reject the move
  }

  // Find insertion index
  const insertIndex = getInsertionIndex(
    newFormData,
    blockPathMap,
    targetBlockId,
    insertAfter,
    targetContainerConfig,
  );

  // Insert into target container
  if (targetContainerConfig) {
    // Insert into a container
    const { parentId, fieldName } = targetContainerConfig;
    const layoutFieldName = `${fieldName}_layout`;
    const parentPath = blockPathMap[parentId]?.path;
    const parentBlock = getBlockByPath(newFormData, parentPath);

    if (!parentBlock) {
      console.error('[MOVE_BLOCK] Could not find target parent block:', parentId);
      return null;
    }

    const items = [...(parentBlock[layoutFieldName]?.items || [])];
    items.splice(insertIndex, 0, blockId);

    const updatedParentBlock = {
      ...parentBlock,
      [fieldName]: {
        ...parentBlock[fieldName],
        [blockId]: blockData,
      },
      [layoutFieldName]: { items },
    };

    newFormData = setBlockByPath(newFormData, parentPath, updatedParentBlock);
  } else {
    // Insert at page level
    const items = [...(newFormData.blocks_layout?.items || [])];
    items.splice(insertIndex, 0, blockId);

    newFormData = {
      ...newFormData,
      blocks: {
        ...newFormData.blocks,
        [blockId]: blockData,
      },
      blocks_layout: { items },
    };
  }

  return newFormData;
}

/**
 * Reorder a block within the same container.
 */
function reorderBlockInContainer(
  formData,
  blockPathMap,
  blockId,
  targetBlockId,
  insertAfter,
  parentId,
  blocksConfig,
) {
  if (parentId) {
    // Container-level reorder
    // getContainerFieldConfig takes a block ID and finds its container
    const containerConfig = getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig);
    if (!containerConfig) {
      console.error('[MOVE_BLOCK] Could not find container config for block:', blockId, 'parent:', parentId);
      return null;
    }

    const { fieldName } = containerConfig;
    const layoutFieldName = `${fieldName}_layout`;
    const parentPath = blockPathMap[parentId]?.path;
    const parentBlock = getBlockByPath(formData, parentPath);

    if (!parentBlock) {
      console.error('[MOVE_BLOCK] Could not find parent block:', parentId);
      return null;
    }

    const items = [...(parentBlock[layoutFieldName]?.items || [])];
    const currentIndex = items.indexOf(blockId);
    const targetIndex = items.indexOf(targetBlockId);

    if (currentIndex === -1 || targetIndex === -1) {
      console.error('[MOVE_BLOCK] Block not found in layout:', { blockId, targetBlockId, items });
      return null;
    }

    // Remove from current position
    items.splice(currentIndex, 1);

    // Calculate new position (adjust if moving down)
    let newIndex = targetIndex;
    if (currentIndex < targetIndex) {
      newIndex--;
    }
    if (insertAfter) {
      newIndex++;
    }

    // Insert at new position
    items.splice(newIndex, 0, blockId);

    const updatedParentBlock = {
      ...parentBlock,
      [layoutFieldName]: { items },
    };

    return setBlockByPath(formData, parentPath, updatedParentBlock);
  } else {
    // Page-level reorder
    const items = [...(formData.blocks_layout?.items || [])];
    const currentIndex = items.indexOf(blockId);
    const targetIndex = items.indexOf(targetBlockId);

    if (currentIndex === -1 || targetIndex === -1) {
      console.error('[MOVE_BLOCK] Block not found in page layout:', { blockId, targetBlockId, items });
      return null;
    }

    // Remove from current position
    items.splice(currentIndex, 1);

    // Calculate new position (adjust if moving down)
    let newIndex = targetIndex;
    if (currentIndex < targetIndex) {
      newIndex--;
    }
    if (insertAfter) {
      newIndex++;
    }

    // Insert at new position
    items.splice(newIndex, 0, blockId);

    return {
      ...formData,
      blocks_layout: { items },
    };
  }
}

/**
 * Get the index to insert at in the target container.
 */
function getInsertionIndex(formData, blockPathMap, targetBlockId, insertAfter, containerConfig) {
  let items;

  if (containerConfig) {
    const { parentId, fieldName } = containerConfig;
    const layoutFieldName = `${fieldName}_layout`;
    const parentPath = blockPathMap[parentId]?.path;
    const parentBlock = getBlockByPath(formData, parentPath);
    items = parentBlock?.[layoutFieldName]?.items || [];
  } else {
    items = formData.blocks_layout?.items || [];
  }

  const targetIndex = items.indexOf(targetBlockId);
  if (targetIndex === -1) {
    // Target not found, insert at end
    return items.length;
  }

  return insertAfter ? targetIndex + 1 : targetIndex;
}
