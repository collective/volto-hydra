/**
 * Utilities for working with nested block paths in Volto Hydra.
 * Supports container blocks where blocks can be nested inside other blocks.
 */

/**
 * Build a map of blockId -> path for all blocks in formData.
 * Traverses nested containers using schema to find `type: 'blocks'` fields.
 *
 * @param {Object} formData - The form data with blocks
 * @param {Object} blocksConfig - Block configuration from registry
 * @returns {Object} Map of blockId -> { path: string[], parentId: string|null }
 *
 * Path format: ['blocks', 'columns-1', 'columns', 'col-1', 'blocks', 'text-1a']
 * This allows accessing: formData.blocks['columns-1'].columns['col-1'].blocks['text-1a']
 */
export function buildBlockPathMap(formData, blocksConfig) {
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
   */
  function traverse(blocksObj, layoutItems, currentPath, parentId) {
    if (!blocksObj || !layoutItems) return;

    layoutItems.forEach((blockId) => {
      const block = blocksObj[blockId];
      if (!block) return;

      // Store path for this block
      const blockPath = [...currentPath, blockId];
      pathMap[blockId] = {
        path: blockPath,
        parentId: parentId,
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
              );
            }
          }
        });
      }

      // Also check for implicit container fields (blocks/blocks_layout without schema)
      // This handles Volto's built-in container blocks like Grid
      if (block.blocks && block.blocks_layout?.items && !pathMap[Object.keys(block.blocks)[0]]) {
        traverse(
          block.blocks,
          block.blocks_layout.items,
          [...blockPath, 'blocks'],
          blockId,
        );
      }
    });
  }

  // Start traversal from page-level blocks
  const pageLayoutItems = formData.blocks_layout?.items || [];
  traverse(formData.blocks, pageLayoutItems, ['blocks'], null);

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
 * @returns {Object} formData with empty block added if container was empty, or original formData
 */
export function ensureEmptyBlockIfEmpty(formData, containerConfig, blockPathMap, uuidGenerator) {
  if (!containerConfig) {
    // Page-level: check blocks_layout.items
    const items = formData.blocks_layout?.items || [];
    if (items.length === 0) {
      const newBlockId = uuidGenerator();
      const blockType = getEmptyBlockType(null);
      return {
        ...formData,
        blocks: {
          ...formData.blocks,
          [newBlockId]: { '@type': blockType },
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
    const updatedParentBlock = {
      ...parentBlock,
      [fieldName]: {
        ...parentBlock[fieldName],
        [newBlockId]: { '@type': blockType },
      },
      [layoutFieldName]: { items: [newBlockId] },
    };
    return setBlockByPath(formData, parentPath, updatedParentBlock);
  }

  return formData;
}
