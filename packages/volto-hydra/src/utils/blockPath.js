/**
 * Utilities for working with nested block paths in Volto Hydra.
 * Supports container blocks where blocks can be nested inside other blocks.
 */

import { produce } from 'immer';
import { applyBlockDefaults } from '@plone/volto/helpers';

/**
 * Get items array from a container (works for both object_list and blocks containers).
 * @param {Object} parentBlock - The parent block containing the container
 * @param {Object} containerConfig - Container configuration with fieldName, isObjectList, dataPath
 * @returns {Array} The items array (copy for object_list, items array for blocks)
 */
function getContainerItems(parentBlock, containerConfig) {
  const { fieldName, isObjectList, dataPath } = containerConfig;

  if (isObjectList) {
    const effectivePath = dataPath || [fieldName];
    let container = parentBlock;
    for (const key of effectivePath) {
      container = container?.[key];
    }
    return [...(container || [])];
  }

  // blocks container: items are in fieldName_layout.items
  const layoutFieldName = `${fieldName}_layout`;
  return [...(parentBlock[layoutFieldName]?.items || [])];
}

/**
 * Reorder items in a container by ID list.
 * For object_list: finds items by idField and returns them in new order
 * For blocks: just returns the newOrder as-is (IDs are the items)
 * @param {Array} items - Current items from getContainerItems
 * @param {Array<string>} newOrder - New order of item IDs
 * @param {Object} containerConfig - Container configuration
 * @returns {Array} Reordered items
 */
function reorderContainerItems(items, newOrder, containerConfig) {
  if (containerConfig.isObjectList) {
    const idField = containerConfig.idField || '@id';
    return newOrder.map(id => items.find(item => item[idField] === id)).filter(Boolean);
  }
  return newOrder;
}

/**
 * Set items array on a container (returns updated parent block).
 * @param {Object} parentBlock - The parent block containing the container
 * @param {Object} containerConfig - Container configuration
 * @param {Array} items - New items array
 * @param {Object} [blocksObj] - For blocks containers, the blocks object to merge
 * @returns {Object} Updated parent block
 */
function setContainerItems(parentBlock, containerConfig, items, blocksObj = null) {
  const { fieldName, isObjectList, dataPath } = containerConfig;

  if (isObjectList) {
    const effectivePath = dataPath || [fieldName];
    const updatedParent = { ...parentBlock };
    let current = updatedParent;
    for (let i = 0; i < effectivePath.length - 1; i++) {
      current[effectivePath[i]] = { ...current[effectivePath[i]] };
      current = current[effectivePath[i]];
    }
    current[effectivePath[effectivePath.length - 1]] = items;
    return updatedParent;
  }

  // blocks container: update both fieldName (blocks) and fieldName_layout (items)
  const layoutFieldName = `${fieldName}_layout`;
  return {
    ...parentBlock,
    [fieldName]: blocksObj || parentBlock[fieldName],
    [layoutFieldName]: { items },
  };
}

/**
 * Compute page-level allowed block types from blocksConfig's `restricted` property.
 * A block is allowed at page level if restricted is false or if restricted(context) returns false.
 *
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} context - Context for restricted functions { properties, navRoot, contentType }
 * @returns {Array} Array of block type IDs allowed at page level
 */
function getPageAllowedBlocksFromRestricted(blocksConfig, context = {}) {
  if (!blocksConfig) return null;

  const allowedTypes = [];
  for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
    // Skip blocks without proper config
    if (!blockConfig || !blockConfig.id) continue;

    const restricted = blockConfig.restricted;
    if (restricted === undefined || restricted === false) {
      // Not restricted - allowed at page level
      allowedTypes.push(blockType);
    } else if (typeof restricted === 'function') {
      // Dynamic restriction - evaluate with context
      try {
        const isRestricted = restricted({ ...context, block: blockConfig });
        if (!isRestricted) {
          allowedTypes.push(blockType);
        }
      } catch (e) {
        // If function throws, treat as restricted
        console.warn(`[BLOCKPATH] Error evaluating restricted for ${blockType}:`, e);
      }
    }
    // If restricted === true, block is not allowed at page level
  }
  return allowedTypes.length > 0 ? allowedTypes : null;
}

/**
 * Build a map of blockId -> path for all blocks in formData.
 * Uses unified traversal for both `type: 'blocks'` and `widget: 'object_list'` containers.
 *
 * @param {Object} formData - The form data with blocks
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Array|null} pageAllowedBlocks - Allowed block types at page level (overrides restricted-based computation)
 * @returns {Object} Map of blockId -> { path: string[], parentId: string|null, containerField: string|null, ... }
 *
 * Path format examples:
 * - Page block: ['blocks', 'text-1']
 * - Nested block: ['blocks', 'columns-1', 'columns', 'col-1', 'blocks', 'text-1a']
 * - Object list item: ['blocks', 'slider-1', 'slides', 0]
 * - Nested object list: ['blocks', 'table-1', 'table', 'rows', 0, 'cells', 1]
 */
export function buildBlockPathMap(formData, blocksConfig, intl, pageAllowedBlocks = null) {
  if (!intl) {
    throw new Error('buildBlockPathMap requires intl parameter');
  }

  const pathMap = {};

  if (!formData?.blocks) {
    return pathMap;
  }

  // Compute page-level allowed blocks from restricted if not explicitly provided
  const effectivePageAllowedBlocks = pageAllowedBlocks ??
    getPageAllowedBlocksFromRestricted(blocksConfig, { properties: formData });

  // Helper to get block schema from blocksConfig
  function getBlockSchema(blockType) {
    const blockConfig = blocksConfig?.[blockType];
    return typeof blockConfig?.blockSchema === 'function'
      ? blockConfig.blockSchema({ formData: {}, intl })
      : blockConfig?.blockSchema;
  }

  // Helper to find empty required fields for starter UI
  // Returns array of { fieldName, fieldDef } for required fields that are empty
  function getEmptyRequiredFields(blockData, schema) {
    if (!schema?.required || !schema?.properties) return null;

    const emptyFields = [];
    for (const fieldName of schema.required) {
      const fieldDef = schema.properties[fieldName];
      if (!fieldDef) continue;

      // Check if field is empty
      const fieldValue = blockData[fieldName];
      const isEmpty = !fieldValue ||
        (Array.isArray(fieldValue) && fieldValue.length === 0) ||
        (typeof fieldValue === 'string' && fieldValue === '');

      if (isEmpty) {
        emptyFields.push({ fieldName, fieldDef });
      }
    }
    return emptyFields.length > 0 ? emptyFields : null;
  }

  /**
   * Process container fields in an item (block or object_list item).
   * Scans schema for container fields and processes each one.
   * This is the single recursion point for all container types.
   */
  function processItem(item, itemId, itemPath, schema) {
    if (!schema?.properties) return;

    Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
      // Nested object widget (e.g., slateTable.table with widget: 'object')
      // Descend into the nested schema
      if (fieldDef.widget === 'object' && fieldDef.schema?.properties) {
        if (item[fieldName]) {
          processItem(item[fieldName], itemId, [...itemPath, fieldName], fieldDef.schema);
        }
        return;
      }

      // Nested object property (legacy: has properties but no widget/type)
      if (fieldDef.properties && !fieldDef.widget && !fieldDef.type) {
        if (item[fieldName]) {
          processItem(item[fieldName], itemId, [...itemPath, fieldName], fieldDef);
        }
        return;
      }

      // Container field - process its contents
      if (fieldDef.type === 'blocks') {
        processBlocksContainer(item, itemId, itemPath, fieldName, fieldDef);
      } else if (fieldDef.widget === 'object_list') {
        // Use dataPath if provided to find data in a different location
        const dataPath = fieldDef.dataPath || [fieldName];
        let fieldData = item;
        for (const key of dataPath) {
          fieldData = fieldData?.[key];
        }
        if (fieldData) {
          processObjectListContainer(item, itemId, itemPath, fieldName, fieldDef, dataPath);
        }
      }
    });

    // Also check for implicit container fields (blocks/blocks_layout without schema definition)
    // This handles Volto's built-in container blocks like Grid
    const firstBlockId = Object.keys(item.blocks || {})[0];
    if (item.blocks && item.blocks_layout?.items && firstBlockId && !pathMap[firstBlockId]) {
      const blockType = item['@type'];
      const blockConfig = blocksConfig?.[blockType];
      processBlocksContainer(item, itemId, itemPath, 'blocks', {
        allowedBlocks: blockConfig?.allowedBlocks || null,
        maxLength: blockConfig?.maxLength || null,
      });
    }
  }

  /**
   * Process a type: 'blocks' container field.
   * Items are stored in object + layout array pattern.
   */
  function processBlocksContainer(parent, parentId, parentPath, fieldName, fieldDef) {
    const blocks = parent[fieldName];
    const layoutFieldName = `${fieldName}_layout`;
    const layout = parent[layoutFieldName]?.items;
    if (!blocks || !layout) return;

    layout.forEach(blockId => {
      const block = blocks[blockId];
      if (!block) return;

      const blockPath = [...parentPath, fieldName, blockId];
      const blockType = block['@type'];
      const blockSchema = getBlockSchema(blockType);

      pathMap[blockId] = {
        path: blockPath,
        parentId,
        containerField: fieldName,
        allowedSiblingTypes: fieldDef.allowedBlocks || null,
        maxSiblings: fieldDef.maxLength || null,
        emptyRequiredFields: getEmptyRequiredFields(block, blockSchema),
      };

      // RECURSE: process this block's container fields
      if (blockSchema) {
        processItem(block, blockId, blockPath, blockSchema);
      }
    });
  }

  /**
   * Process a widget: 'object_list' container field.
   * Items are stored as array with configurable ID field.
   * @param {Array} dataPath - Path to actual data location (defaults to [fieldName])
   */
  function processObjectListContainer(parent, parentId, parentPath, fieldName, fieldDef, dataPath = null) {
    // Navigate to actual data location using dataPath
    const effectiveDataPath = dataPath || [fieldName];
    let items = parent;
    for (const key of effectiveDataPath) {
      items = items?.[key];
    }

    // Handle both arrays and objects (Volto's form state can convert arrays to objects)
    let itemsArray;
    if (Array.isArray(items)) {
      itemsArray = items;
    } else if (items && typeof items === 'object') {
      // Convert object with numeric keys to array (e.g., {"0": {...}, "1": {...}})
      itemsArray = Object.values(items);
    } else {
      return;
    }

    const idField = fieldDef.idField || '@id';
    const itemSchema = fieldDef.schema;

    // Compute virtual type for items in this container
    // Parent type is either a real block type (from @type) or a virtual type (for nested object_list)
    const parentPathInfo = pathMap[parentId];
    const parentType = parentPathInfo?.itemType || parent['@type'];
    const itemType = `${parentType}:${fieldName}`;

    // Track addMode for table-aware behavior
    // addMode comes from block config (e.g., blocksConfig.slateTable.addMode = 'table')
    // - First-level items (rows) get addMode from block config
    // - Second-level items (cells) get parentAddMode from their parent row
    const parentAddMode = parentPathInfo?.addMode || parentPathInfo?.parentAddMode || null;

    // Get addMode from the actual block config if this is first-level (parent is a block, not an object_list item)
    let addMode = null;
    if (!parentPathInfo?.isObjectListItem) {
      // Parent is a real block - check its config for addMode
      const blockType = parent['@type'];
      const blockConfig = blocksConfig?.[blockType];
      addMode = blockConfig?.addMode || null;
    }

    itemsArray.forEach((item, index) => {
      const itemId = item[idField];
      if (!itemId) return;

      // Build path using the actual data path (not schema field name)
      const itemPath = [...parentPath, ...effectiveDataPath, index];

      // Compute available actions based on table mode
      // Primary remove is hardcoded in DropdownMenu based on addDirection
      // These are ADDITIONAL actions beyond the primary
      let actions = null;
      if (addMode === 'table') {
        // First-level items in table mode (rows): insert row before/after
        // Primary remove (Remove Row) is hardcoded based on addDirection
        actions = {
          toolbar: ['addRowBefore', 'addRowAfter'],
          dropdown: [],
        };
      } else if (parentAddMode === 'table') {
        // Second-level items in table mode (cells): all insert actions + delete row
        // Primary remove (Remove Column) is hardcoded based on addDirection
        actions = {
          toolbar: ['addColumnBefore', 'addColumnAfter', 'addRowBefore', 'addRowAfter'],
          dropdown: ['deleteRow'], // Additional action: delete parent row
        };
      }

      pathMap[itemId] = {
        path: itemPath,
        parentId,
        containerField: fieldName,
        isObjectListItem: true,
        idField,
        itemSchema, // For sidebar form rendering
        dataPath: effectiveDataPath, // Store for later use
        itemType, // Virtual type like 'slateTable:rows' or 'slateTable:rows:cells'
        allowedSiblingTypes: [itemType], // Only allow same type as siblings
        addMode, // Table mode for this container (e.g., rows)
        parentAddMode, // Inherited from parent (e.g., cells inherit 'table' from rows)
        actions, // Available actions for toolbar/dropdown
        emptyRequiredFields: getEmptyRequiredFields(item, itemSchema),
      };

      // RECURSE: process this item's container fields (same pattern!)
      if (itemSchema) {
        processItem(item, itemId, itemPath, itemSchema);
      }
    });
  }

  // Start traversal from page-level blocks
  const pageLayout = formData.blocks_layout?.items || [];
  pageLayout.forEach(blockId => {
    const block = formData.blocks[blockId];
    if (!block) return;

    const blockPath = ['blocks', blockId];
    const blockType = block['@type'];
    const blockSchema = getBlockSchema(blockType);

    pathMap[blockId] = {
      path: blockPath,
      parentId: null,
      containerField: 'blocks',
      allowedSiblingTypes: effectivePageAllowedBlocks,
      maxSiblings: null,
      emptyRequiredFields: getEmptyRequiredFields(block, blockSchema),
    };

    // Process this block's container fields
    if (blockSchema) {
      processItem(block, blockId, blockPath, blockSchema);
    }
  });

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

  return produce(formData, draft => {
    let current = draft;
    for (const key of path.slice(0, -1)) {
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  });
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
    const block = getBlockByPath(formData, pathInfo.path);
    // Inject virtual @type for object_list items
    if (block && pathInfo.isObjectListItem && pathInfo.itemType) {
      return { ...block, '@type': pathInfo.itemType };
    }
    return block;
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
  const fieldName = pathInfo.containerField;

  // For object_list items, we already have most info in pathInfo
  if (pathInfo.isObjectListItem) {
    // Get itemSchema and dataPath from parent's schema definition
    const parentBlock = getBlockById(formData, blockPathMap, parentId);
    const parentType = parentBlock?.['@type'];
    const parentConfig = blocksConfig?.[parentType];
    const schema = typeof parentConfig?.blockSchema === 'function'
      ? parentConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
      : parentConfig?.blockSchema;
    const fieldDef = schema?.properties?.[fieldName];

    return {
      fieldName,
      parentId,
      allowedBlocks: pathInfo.allowedSiblingTypes,
      defaultBlock: pathInfo.itemType,
      maxLength: pathInfo.maxSiblings,
      isObjectList: true,
      itemSchema: fieldDef?.schema,
      itemIndex: pathInfo.path[pathInfo.path.length - 1], // Last element is index
      idField: pathInfo.idField,
      dataPath: pathInfo.dataPath || fieldDef?.dataPath || null, // Path to actual data location
      addMode: pathInfo.addMode || null, // Table mode for this container
      parentAddMode: pathInfo.parentAddMode || null, // Inherited from parent
    };
  }

  // For standard blocks, look up container config from schema
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

  // Check schema-defined container field
  if (schema?.properties && fieldName) {
    const fieldDef = schema.properties[fieldName];
    if (fieldDef?.type === 'blocks') {
      return {
        fieldName,
        parentId,
        allowedBlocks: fieldDef.allowedBlocks || null,
        defaultBlock: fieldDef.defaultBlock || null,
        maxLength: fieldDef.maxLength || null,
      };
    }
  }

  // Fallback: Check for implicit container (blocks/blocks_layout)
  // This handles blocks like gridBlock that have a schema but use implicit blocks/blocks_layout
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
 * Get ALL container fields for a block (supports multiple container fields).
 * Returns both schema-defined container fields (type: 'blocks') and implicit containers.
 *
 * @param {string} blockId - The block ID to check
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @returns {Array} Array of container field configs [{ fieldName, title, allowedBlocks, defaultBlock, maxLength }]
 */
export function getAllContainerFields(blockId, blockPathMap, formData, blocksConfig) {
  const block = getBlockById(formData, blockPathMap, blockId);
  if (!block) return [];

  const blockType = block['@type'];
  const blockConfig = blocksConfig?.[blockType];
  const schema = typeof blockConfig?.blockSchema === 'function'
    ? blockConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
    : blockConfig?.blockSchema;

  const containerFields = [];

  // Check for schema-defined container fields (type: 'blocks' or widget: 'object_list')
  if (schema?.properties) {
    for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
      if (fieldDef.type === 'blocks') {
        containerFields.push({
          fieldName,
          title: fieldDef.title || fieldName,
          allowedBlocks: fieldDef.allowedBlocks || null,
          defaultBlock: fieldDef.defaultBlock || null,
          maxLength: fieldDef.maxLength || null,
        });
      } else if (fieldDef.widget === 'object_list') {
        // object_list: items stored as array, virtual type is blockType:fieldName
        const itemType = `${blockType}:${fieldName}`;
        containerFields.push({
          fieldName,
          title: fieldDef.title || fieldName,
          allowedBlocks: [itemType], // Single virtual type
          defaultBlock: itemType,
          maxLength: null,
          isObjectList: true,
          itemSchema: fieldDef.schema, // Store itemSchema for editing
          idField: fieldDef.idField || '@id', // ID field name for items
          dataPath: fieldDef.dataPath || null, // Path to actual data location
        });
      }
    }
  }

  // Check for implicit container (blocks/blocks_layout without schema definition)
  // Only if no explicit container fields found
  if (containerFields.length === 0 && block.blocks && block.blocks_layout?.items) {
    containerFields.push({
      fieldName: 'blocks',
      title: 'Blocks',
      allowedBlocks: blockConfig?.allowedBlocks || null,
      defaultBlock: blockConfig?.defaultBlock || null,
      maxLength: blockConfig?.maxLength || null,
    });
  }

  return containerFields;
}

/**
 * Insert a block into a container after a specified block.
 * Treats the page itself as a container when containerConfig is null.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} refBlockId - Reference block ID for positioning
 * @param {string} newBlockId - New block's ID
 * @param {Object} newBlockData - New block's data
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or null for page-level
 * @param {'before'|'after'|'inside'} action - Where to insert relative to refBlockId
 * @returns {Object} New formData with block inserted
 */
export function insertBlockInContainer(formData, blockPathMap, refBlockId, newBlockId, newBlockData, containerConfig, action = 'after') {
  // Helper to compute insert index based on action
  const getInsertIndex = (items, refIndex) => {
    if (action === 'before') return Math.max(0, refIndex);
    if (action === 'after') return refIndex + 1;
    if (action === 'inside') return items.length; // append at end
    return refIndex + 1; // default to after
  };

  // Page-level insertion (page is just a container with blocks/blocks_layout)
  if (!containerConfig || containerConfig.parentId === null) {
    const newBlocks = {
      ...formData.blocks,
      [newBlockId]: newBlockData,
    };

    const currentItems = formData.blocks_layout?.items || [];
    const refIndex = currentItems.indexOf(refBlockId);
    const insertIndex = getInsertIndex(currentItems, refIndex);
    const newItems = [...currentItems];
    newItems.splice(insertIndex, 0, newBlockId);

    return {
      ...formData,
      blocks: newBlocks,
      blocks_layout: { items: newItems },
    };
  }

  // Container-level insertion
  const { parentId, fieldName, isObjectList } = containerConfig;

  // Get the parent block using path
  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container insertion`);
  }

  const items = getContainerItems(parentBlock, containerConfig);
  let updatedParentBlock;

  if (isObjectList) {
    const idField = containerConfig.idField || '@id';
    const refIndex = items.findIndex(item => item[idField] === refBlockId);
    const insertIndex = getInsertIndex(items, refIndex);
    items.splice(insertIndex, 0, { [idField]: newBlockId, ...newBlockData });
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, items);
  } else {
    // Standard container: blocks object + blocks_layout
    const newContainerBlocks = { ...parentBlock[fieldName], [newBlockId]: newBlockData };
    const refIndex = items.indexOf(refBlockId);
    const insertIndex = getInsertIndex(items, refIndex);
    items.splice(insertIndex, 0, newBlockId);
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, items, newContainerBlocks);
  }

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
  const { parentId, fieldName, isObjectList } = containerConfig;

  // Get the parent block using path
  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container deletion`);
  }

  let updatedParentBlock;
  const items = getContainerItems(parentBlock, containerConfig);

  if (isObjectList) {
    const idField = containerConfig.idField || '@id';
    const filteredItems = items.filter(item => item[idField] !== blockId);
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, filteredItems);
  } else {
    // Standard container: remove from blocks object and layout
    const { [blockId]: removed, ...remainingBlocks } = parentBlock[fieldName];
    const filteredItems = items.filter(id => id !== blockId);
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, filteredItems, remainingBlocks);
  }

  // Use path-aware update to handle nested containers
  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Insert a column into a table (add cell to ALL rows at the same position).
 * Used when adding a cell in table mode (parentAddMode === 'table').
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} refCellId - Reference cell ID for positioning
 * @param {Object} cellTemplate - Template for new cell data (without ID) - should have defaults already applied
 * @param {'before'|'after'} action - Where to insert relative to refCellId
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @returns {Object} { formData, insertedCellId } - Updated formData and the ID of the cell in the reference row
 */
export function insertTableColumn(formData, blockPathMap, refCellId, cellTemplate, action, uuidGenerator) {
  const cellPathInfo = blockPathMap[refCellId];
  if (!cellPathInfo || !cellPathInfo.parentAddMode) {
    throw new Error('[HYDRA] insertTableColumn: cell is not in table mode');
  }

  // Get the row containing this cell
  const rowId = cellPathInfo.parentId;
  const rowPathInfo = blockPathMap[rowId];
  if (!rowPathInfo) {
    throw new Error('[HYDRA] insertTableColumn: could not find row for cell');
  }

  // Get the table block (grandparent of the cell)
  const tableId = rowPathInfo.parentId;
  const tablePathInfo = blockPathMap[tableId];
  if (!tablePathInfo) {
    throw new Error('[HYDRA] insertTableColumn: could not find table for row');
  }

  // Get table block data
  const tableBlock = getBlockByPath(formData, tablePathInfo.path);
  if (!tableBlock) {
    throw new Error('[HYDRA] insertTableColumn: table block not found');
  }

  // Get rows using dataPath
  const dataPath = rowPathInfo.dataPath || ['rows'];
  let rows = tableBlock;
  for (const key of dataPath) {
    rows = rows?.[key];
  }
  if (!Array.isArray(rows)) {
    throw new Error('[HYDRA] insertTableColumn: could not find rows array');
  }

  // Find the cell index in its row
  const cellIdField = cellPathInfo.idField || 'key';
  const currentRow = rows.find(row => row[rowPathInfo.idField || 'key'] === rowId);
  if (!currentRow || !currentRow.cells) {
    throw new Error('[HYDRA] insertTableColumn: could not find current row or cells');
  }

  const cellIndex = currentRow.cells.findIndex(cell => cell[cellIdField] === refCellId);
  if (cellIndex === -1) {
    throw new Error('[HYDRA] insertTableColumn: cell not found in row');
  }

  // Calculate insert index based on action
  const insertIndex = action === 'before' ? cellIndex : cellIndex + 1;

  // Track the cell ID we'll insert in the reference row (for selection)
  let insertedCellId = null;

  // Insert a new cell into EACH row at the same position
  const updatedRows = rows.map((row) => {
    const newCellId = uuidGenerator();

    // Track the cell in the reference row for selection
    if (row[rowPathInfo.idField || 'key'] === rowId) {
      insertedCellId = newCellId;
    }

    const cells = [...(row.cells || [])];
    cells.splice(insertIndex, 0, {
      [cellIdField]: newCellId,
      ...cellTemplate,
    });

    return { ...row, cells };
  });

  // Update the table block with new rows
  let updatedTableBlock = { ...tableBlock };
  let current = updatedTableBlock;
  for (let i = 0; i < dataPath.length - 1; i++) {
    current[dataPath[i]] = { ...current[dataPath[i]] };
    current = current[dataPath[i]];
  }
  current[dataPath[dataPath.length - 1]] = updatedRows;

  const newFormData = setBlockByPath(formData, tablePathInfo.path, updatedTableBlock);

  return { formData: newFormData, insertedCellId };
}

/**
 * Delete a column from a table (remove cell at same index from ALL rows).
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} cellId - Cell ID to delete (determines column index)
 * @returns {Object} Updated formData with column removed
 */
export function deleteTableColumn(formData, blockPathMap, cellId) {
  const cellPathInfo = blockPathMap[cellId];
  if (!cellPathInfo || !cellPathInfo.parentAddMode) {
    throw new Error('[HYDRA] deleteTableColumn: cell is not in table mode');
  }

  // Get the row containing this cell
  const rowId = cellPathInfo.parentId;
  const rowPathInfo = blockPathMap[rowId];
  if (!rowPathInfo) {
    throw new Error('[HYDRA] deleteTableColumn: could not find row for cell');
  }

  // Get the table block (grandparent of the cell)
  const tableId = rowPathInfo.parentId;
  const tablePathInfo = blockPathMap[tableId];
  if (!tablePathInfo) {
    throw new Error('[HYDRA] deleteTableColumn: could not find table for row');
  }

  // Get table block data
  const tableBlock = getBlockByPath(formData, tablePathInfo.path);
  if (!tableBlock) {
    throw new Error('[HYDRA] deleteTableColumn: table block not found');
  }

  // Get rows using dataPath
  const dataPath = rowPathInfo.dataPath || ['rows'];
  let rows = tableBlock;
  for (const key of dataPath) {
    rows = rows?.[key];
  }
  if (!Array.isArray(rows)) {
    throw new Error('[HYDRA] deleteTableColumn: could not find rows array');
  }

  // Find the cell index in its row
  const cellIdField = cellPathInfo.idField || 'key';
  const currentRow = rows.find(row => row[rowPathInfo.idField || 'key'] === rowId);
  if (!currentRow || !currentRow.cells) {
    throw new Error('[HYDRA] deleteTableColumn: could not find current row or cells');
  }

  const cellIndex = currentRow.cells.findIndex(cell => cell[cellIdField] === cellId);
  if (cellIndex === -1) {
    throw new Error('[HYDRA] deleteTableColumn: cell not found in row');
  }

  // Remove cell at this index from EACH row
  const updatedRows = rows.map(row => {
    const cells = [...(row.cells || [])];
    if (cellIndex < cells.length) {
      cells.splice(cellIndex, 1);
    }
    return { ...row, cells };
  });

  // Update the table block with new rows
  let updatedTableBlock = { ...tableBlock };
  let current = updatedTableBlock;
  for (let i = 0; i < dataPath.length - 1; i++) {
    current[dataPath[i]] = { ...current[dataPath[i]] };
    current = current[dataPath[i]];
  }
  current[dataPath[dataPath.length - 1]] = updatedRows;

  return setBlockByPath(formData, tablePathInfo.path, updatedTableBlock);
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
  const { parentId, fieldName, isObjectList } = containerConfig;

  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    throw new Error(`[HYDRA] Could not find parent block ${parentId} for container mutation`);
  }

  const items = getContainerItems(parentBlock, containerConfig);
  let updatedParentBlock;

  if (isObjectList) {
    const idField = containerConfig.idField || '@id';
    const updatedItems = items.map(item =>
      item[idField] === blockId ? { [idField]: blockId, ...newBlockData } : item
    );
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, updatedItems);
  } else {
    // Standard container: update block in blocks object
    const blocksObj = { ...parentBlock[fieldName], [blockId]: newBlockData };
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, items, blocksObj);
  }

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

  // Container-level: check container's items
  const { parentId, fieldName, isObjectList } = containerConfig;

  const parentPath = blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);

  if (!parentBlock) {
    return formData;
  }

  const items = getContainerItems(parentBlock, containerConfig);
  if (items.length > 0) {
    return formData;
  }

  // Container is empty - create a new empty item
  const newBlockId = uuidGenerator();

  if (isObjectList) {
    const idField = containerConfig.idField || 'key';
    let blockData = { [idField]: newBlockId };

    // Initialize nested containers
    if (intl && blocksConfig && containerConfig.defaultBlock) {
      blockData = initializeContainerBlock(blockData, blocksConfig, uuidGenerator, { intl, metadata, properties });
    }

    const updatedParentBlock = setContainerItems(parentBlock, containerConfig, [blockData]);
    return setBlockByPath(formData, parentPath, updatedParentBlock);
  }

  // Standard blocks container
  const blockType = getEmptyBlockType(containerConfig);
  let blockData = { '@type': blockType };

  if (intl && blocksConfig) {
    blockData = applyBlockDefaults({ data: blockData, intl, metadata, properties }, blocksConfig);
  }

  const blocksObj = { ...parentBlock[fieldName], [newBlockId]: blockData };
  const updatedParentBlock = setContainerItems(parentBlock, containerConfig, [newBlockId], blocksObj);
  return setBlockByPath(formData, parentPath, updatedParentBlock);
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
  const { intl, metadata, properties, siblingData } = options;
  const blockType = blockData['@type'];
  const blockConfig = blocksConfig?.[blockType];

  // Get schema to find container fields
  const schema = typeof blockConfig?.blockSchema === 'function'
    ? blockConfig.blockSchema({ formData: {}, intl: intl || { formatMessage: (m) => m.defaultMessage } })
    : blockConfig?.blockSchema;

  if (!schema?.properties) {
    return blockData;
  }

  // Find ALL container fields (type: 'blocks') and initialize each one
  let result = { ...blockData };

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    // Handle object_list containers (like cells in a row)
    if (fieldDef.widget === 'object_list') {
      const idField = fieldDef.idField || '@id';
      const childType = `${blockType}:${fieldName}`;

      // For table mode: copy child count from sibling rows
      // siblingData is passed when adding a new row to a table-mode container
      let childCount = 1;
      if (siblingData?.length > 0 && siblingData[0]?.[fieldName]) {
        // Count children in first sibling row's same field
        const siblingField = siblingData[0][fieldName];
        childCount = Array.isArray(siblingField) ? siblingField.length : 1;
      }

      const children = [];
      for (let i = 0; i < childCount; i++) {
        const childId = uuidGenerator();

        // Start with ID and virtual type
        let childData = { [idField]: childId, '@type': childType };

        // Apply schema defaults (e.g., slate fields get empty paragraph)
        childData = applyBlockDefaults({ data: childData, intl }, blocksConfig);

        // Recursively initialize nested containers
        childData = initializeContainerBlock(childData, blocksConfig, uuidGenerator, options);

        // Remove @type - object_list items don't store it in data
        delete childData['@type'];

        children.push(childData);
      }

      result = {
        ...result,
        [fieldName]: children,
      };
      continue;
    }

    if (fieldDef.type !== 'blocks') {
      continue;
    }

    // Determine the initial child block type for this container field
    let childBlockType = null;
    if (fieldDef.defaultBlock) {
      childBlockType = fieldDef.defaultBlock;
    } else if (fieldDef.allowedBlocks?.length === 1) {
      childBlockType = fieldDef.allowedBlocks[0];
    }

    const layoutFieldName = `${fieldName}_layout`;

    // No determinable child type - initialize with empty container structure
    if (!childBlockType) {
      result = {
        ...result,
        [fieldName]: {},
        [layoutFieldName]: { items: [] },
      };
      continue;
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

    // Call initialValue if defined (like Volto's _applyBlockInitialValue)
    const childBlockConfig = blocksConfig?.[childBlockType];
    if (childBlockConfig?.initialValue) {
      childBlockData = childBlockConfig.initialValue({
        id: childBlockId,
        value: childBlockData,
      });
    }

    // Recursively initialize the child if it's also a container
    childBlockData = initializeContainerBlock(childBlockData, blocksConfig, uuidGenerator, options);

    // Add child to this container field
    result = {
      ...result,
      [fieldName]: {
        [childBlockId]: childBlockData,
      },
      [layoutFieldName]: { items: [childBlockId] },
    };
  }

  return result;
}

/**
 * Reorder blocks within a container by providing the new order array.
 * Used by the sidebar ChildBlocksWidget for drag-and-drop reordering.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string|null} parentBlockId - Parent block ID (null for page-level)
 * @param {string} fieldName - Container field name (e.g., 'blocks', 'columns')
 * @param {Array<string>} newOrder - New order of block IDs
 * @returns {Object} New formData with blocks reordered
 */
export function reorderBlocksInContainer(
  formData,
  blockPathMap,
  parentBlockId,
  fieldName,
  newOrder,
  blocksConfig = null,
) {
  if (!parentBlockId) {
    // Page-level reorder
    return {
      ...formData,
      blocks_layout: { items: newOrder },
    };
  }

  // Container-level reorder
  const parentPath = blockPathMap[parentBlockId]?.path;
  if (!parentPath) {
    console.error('[REORDER] Could not find parent path for:', parentBlockId);
    return formData;
  }

  const parentBlock = getBlockByPath(formData, parentPath);
  if (!parentBlock) {
    console.error('[REORDER] Could not find parent block:', parentBlockId);
    return formData;
  }

  // Detect if this is an object_list field
  const parentType = parentBlock['@type'];
  const parentConfig = blocksConfig?.[parentType];
  const schema = typeof parentConfig?.blockSchema === 'function'
    ? parentConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
    : parentConfig?.blockSchema;
  const fieldDef = schema?.properties?.[fieldName];
  const isObjectList = fieldDef?.widget === 'object_list';

  let updatedParent;

  // Build containerConfig from fieldDef for helper functions
  const containerConfig = {
    fieldName,
    isObjectList,
    dataPath: fieldDef?.dataPath,
    idField: fieldDef?.idField,
  };

  const items = getContainerItems(parentBlock, containerConfig);
  const reorderedItems = reorderContainerItems(items, newOrder, containerConfig);
  updatedParent = setContainerItems(parentBlock, containerConfig, reorderedItems);

  return setBlockByPath(formData, parentPath, updatedParent);
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
