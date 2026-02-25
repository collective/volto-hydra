/**
 * Utilities for working with nested block paths in Volto Hydra.
 * Supports container blocks where blocks can be nested inside other blocks.
 */

import { produce } from 'immer';
import { get } from 'lodash';
import { applyBlockDefaults } from '@plone/volto/helpers';
import config from '@plone/volto/registry';
import { PAGE_BLOCK_UID, isBlockReadonly } from '@volto-hydra/hydra-js';

/**
 * Strip functions from a schema object for postMessage serialization.
 * Widget callbacks like filterOptions can't be cloned for postMessage.
 * @param {any} obj - Schema object to strip functions from
 * @param {WeakSet} seen - Set of already-seen objects (circular reference detection)
 * @returns {any} - Schema with functions removed
 */
function stripFunctionsFromSchema(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (typeof obj !== 'object') return obj;

  // Handle circular references
  if (seen.has(obj)) return undefined;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => stripFunctionsFromSchema(item, seen)).filter((item) => item !== undefined);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const stripped = stripFunctionsFromSchema(value, seen);
    if (stripped !== undefined) {
      result[key] = stripped;
    }
  }
  return result;
}

/**
 * Get the schema for a block type, including schemaEnhancer modifications.
 * Also handles object_list items (like table rows/cells) which have itemSchema in blockPathMap.
 *
 * @param {string} blockType - The block type ID
 * @param {Object} intl - The intl object from react-intl (required for i18n schemas)
 * @param {Object} blocksConfig - Optional blocksConfig override (defaults to config.blocks.blocksConfig)
 * @param {Object} blockPathMap - Optional blockPathMap for object_list item lookup
 * @param {string} blockId - Optional block ID for object_list item lookup
 * @param {Object} formData - Optional block data to pass to schemaEnhancer (required for dynamic enhancers like inheritSchemaFrom)
 * @returns {Object|null} - The block schema or null
 */
export function getBlockSchema(blockType, intl, blocksConfig = null, blockPathMap = null, blockId = null, formData = null) {
  // For object_list items (like table rows/cells), use itemSchema from blockPathMap
  if (blockPathMap && blockId) {
    const pathInfo = blockPathMap[blockId];
    if (pathInfo?.isObjectListItem && pathInfo.itemSchema?.fieldsets) {
      return {
        ...pathInfo.itemSchema,
        required: pathInfo.itemSchema.required || [],
      };
    }
  }

  if (!blockType) return null;

  const effectiveBlocksConfig = blocksConfig || config.blocks?.blocksConfig;
  const blockConfig = effectiveBlocksConfig?.[blockType];
  if (!blockConfig) return null;

  // Get base schema from blockSchema or schema property
  const schemaSource = blockConfig.blockSchema || blockConfig.schema;
  let schema = null;

  // Use provided formData or empty object
  const effectiveFormData = formData || {};

  if (schemaSource) {
    try {
      schema = typeof schemaSource === 'function'
        ? schemaSource({ formData: effectiveFormData, data: effectiveFormData, intl })
        : schemaSource;
    } catch {
      schema = null;
    }
  }

  // Ensure schema has required structure
  if (!schema) {
    schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
      properties: {},
      required: [],
    };
  } else {
    // Ensure fieldsets exists (frontend blockSchema may only define properties)
    if (!schema.fieldsets) {
      schema = {
        ...schema,
        fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
      };
    }
  }

  // Run schemaEnhancer on top of base schema (if it exists)
  // Note: childBlockConfig reads blockPathMap/blockId from HydraSchemaContext
  if (blockConfig.schemaEnhancer) {
    try {
      schema = blockConfig.schemaEnhancer({
        schema,
        formData: effectiveFormData,
        intl,
      });
    } catch {
      // Keep the base schema if enhancer fails
    }
  }

  // Only return if we have properties
  return schema?.properties && Object.keys(schema.properties).length > 0
    ? schema
    : null;
}

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

  // blocks container: layout is in fieldName.items, blocks in shared parent.blocks
  return [...(parentBlock[fieldName]?.items || [])];
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

  // blocks container: update shared blocks dict + layout field
  return {
    ...parentBlock,
    blocks: blocksObj || parentBlock.blocks,
    [fieldName]: { items },
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
 * Uses unified traversal for both `widget: 'blocks_layout'` and `widget: 'object_list'` containers.
 *
 * @param {Object} formData - The form data with blocks
 * @param {Object} blocksConfig - Block configuration from registry (must have _page registered for multiple page fields)
 * @param {Object} intl - The intl object from react-intl (required for i18n schemas)
 * @returns {Object} Map of blockId -> { path: string[], parentId: string, containerField: string|null, ... }
 *
 * Path format examples:
 * - Page block: ['blocks', 'text-1']
 * - Nested block: ['blocks', 'columns-1', 'columns', 'col-1', 'blocks', 'text-1a']
 * - Object list item: ['blocks', 'slider-1', 'slides', 0]
 * - Nested object list: ['blocks', 'table-1', 'table', 'rows', 0, 'cells', 1]
 * - Multiple page fields: ['header_blocks', 'header-1'], ['footer_blocks', 'footer-1']
 */
export function buildBlockPathMap(formData, blocksConfig, intl) {
  if (!intl) {
    throw new Error('buildBlockPathMap requires intl parameter');
  }

  const pathMap = {};
  // Track created virtual containers for template instances
  const createdTemplateInstances = new Set();

  // Get page schema from _page block type (registered at INIT time)
  // This contains the blocks container fields (blocks, footer_blocks, etc.)
  const rootConfig = blocksConfig?.['_page'];
  const pageSchema = rootConfig?.schema?.({ intl }) || {
    // Fallback before INIT: default to single 'blocks_layout' field
    properties: { blocks_layout: { widget: 'blocks_layout' } },
  };

  // Get field names from page schema to check for data
  const pageFieldNames = Object.keys(pageSchema.properties || {})
    .filter(fieldName => pageSchema.properties[fieldName]?.widget === 'blocks_layout');

  // Check if any page fields have data
  // All layout fields use fieldName.items; blocks are in shared formData.blocks
  const hasAnyPageData = pageFieldNames.some(
    fieldName => formData?.[fieldName]?.items?.length > 0
  );
  if (!hasAnyPageData) {
    return pathMap;
  }

  // Compute default page-level allowed blocks from restricted (used when field doesn't specify allowedBlocks)
  const defaultPageAllowedBlocks = getPageAllowedBlocksFromRestricted(blocksConfig, { properties: formData });

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
        // Strip functions from fieldDef for postMessage serialization
        emptyFields.push({ fieldName, fieldDef: stripFunctionsFromSchema(fieldDef) });
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
      if (fieldDef.widget === 'blocks_layout') {
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
      processBlocksContainer(item, itemId, itemPath, 'blocks_layout', {
        allowedBlocks: blockConfig?.allowedBlocks || null,
        maxLength: blockConfig?.maxLength || null,
      });
    }
  }

  /**
   * Process a widget: 'blocks_layout' container field.
   * Blocks are in shared parent.blocks dict; layout is parent[fieldName].items.
   */
  function processBlocksContainer(parent, parentId, parentPath, fieldName, fieldDef) {
    const blocks = parent.blocks;
    const layout = parent[fieldName]?.items;
    if (!blocks || !layout) return;

    // First pass: collect fixed status for all blocks to determine insert restrictions
    const blockFixedStatus = {};
    layout.forEach(blockId => {
      const block = blocks[blockId];
      if (block) {
        blockFixedStatus[blockId] = block.fixed === true;
      }
    });

    layout.forEach((blockId, index) => {
      const block = blocks[blockId];
      if (!block) return;

      const blockPath = [...parentPath, 'blocks', blockId];
      const blockType = block['@type'];
      const blockSchema = getBlockSchema(blockType, intl, blocksConfig);

      // Check Volto's standard block properties
      const isFixed = block.fixed === true;        // Volto standard: position locked
      const isReadonly = block.readOnly === true;  // Volto standard: content locked

      // Check if inserting before/after this block is allowed
      // Can't insert:
      // 1. Between two adjacent fixed blocks
      // 2. Before a fixed block at container start (no placeholder there)
      // 3. After a fixed block at container end (no placeholder there)
      const prevBlockId = layout[index - 1];
      const nextBlockId = layout[index + 1];
      const prevBlockIsFixed = prevBlockId ? blockFixedStatus[prevBlockId] : false;
      const nextBlockIsFixed = nextBlockId ? blockFixedStatus[nextBlockId] : false;
      const atContainerStart = index === 0;
      const atContainerEnd = index === layout.length - 1;
      // Fixed block at edge OR between two fixed blocks = can't insert
      // Exception: if the block has nextPlaceholder, there's a placeholder region after it
      // that may be empty — always allow inserting after it.
      const hasNextPlaceholder = block.nextPlaceholder != null;
      const canInsertBefore = !(isFixed && (atContainerStart || prevBlockIsFixed));
      const canInsertAfter = !(isFixed && (atContainerEnd || nextBlockIsFixed)) || hasNextPlaceholder;

      // Template instance virtual container
      // Only FIRST-LEVEL template blocks get the virtual instance as parent
      // Nested blocks (inside containers that are part of the template) keep their actual parent
      let effectiveParentId = parentId;
      if (block.templateInstanceId) {
        const instanceId = block.templateInstanceId;

        // Check if parent container is also part of this template instance
        // If so, this is a nested block - keep actual parent
        const parentInSameInstance = parent.templateInstanceId === instanceId;

        if (!parentInSameInstance) {
          // First-level template block - create/use virtual instance as parent
          if (!createdTemplateInstances.has(instanceId)) {
            createdTemplateInstances.add(instanceId);

            // Derive display name from templateId path (e.g., "/templates/test-layout" -> "test-layout")
            const templatePath = block.templateId || '';
            const templateName = templatePath.split('/').filter(Boolean).pop() || 'unknown';

            // Nested: parent container belongs to the same template (different instanceId
            // because merge assigns new IDs to top-level but children keep original)
            const isNestedInTemplate = parent.templateId === block.templateId;

            const instanceBlockType = isNestedInTemplate
              ? 'Template blocks'
              : `Template: ${templateName}`;
            pathMap[instanceId] = {
              path: null, // Virtual - no actual storage path
              parentId, // Template instance's parent is the original container
              containerField: fieldName,
              blockType: instanceBlockType, // Virtual type for sidebar display
              isTemplateInstance: true,
              ...(isNestedInTemplate && { isNestedTemplateInstance: true }),
              templateId: block.templateId,
              // Virtual block data for components that need blockData (e.g., ParentBlocksWidget)
              blockData: { '@type': instanceBlockType, '@uid': instanceId },
              // Template instances can be moved/deleted as a unit (TODO: implement group operations)
            };
          }

          // Block's parent is the template instance, not the original container
          effectiveParentId = instanceId;
        }
      }

      pathMap[blockId] = {
        path: blockPath,
        parentId: effectiveParentId,
        containerField: fieldName,
        blockType, // Block type for uniform lookups (single source of truth)
        allowedSiblingTypes: fieldDef.allowedBlocks || defaultPageAllowedBlocks,
        allowedTemplates: fieldDef.allowedTemplates || null,
        maxSiblings: fieldDef.maxLength || null,
        siblingCount: layout.length, // Total siblings in this container
        emptyRequiredFields: getEmptyRequiredFields(block, blockSchema),
        ...(isFixed && { isFixed: true }), // Fixed template blocks can't be moved/deleted
        ...(isReadonly && { isReadonly: true }), // Readonly template blocks can't be edited
        // Insert restrictions for fixed block boundaries
        ...(!canInsertBefore && { canInsertBefore: false }),
        ...(!canInsertAfter && { canInsertAfter: false }),
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
    const typeField = fieldDef.typeField || null; // e.g., '@type' - which attribute stores the item's type
    const hasAllowedBlocks = !!fieldDef.allowedBlocks; // Typed items mode (multi-type container)

    // Compute virtual type for items in this container (used when no typeField/allowedBlocks)
    // Parent type is either a real block type or a virtual type (for nested object_list)
    const parentPathInfo = pathMap[parentId];
    const parentType = parentPathInfo?.blockType || parent['@type'];
    const virtualType = `${parentType}:${fieldName}`;

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

      // Determine block type:
      // - If typeField is set, read type from item[typeField] (typed object_list)
      // - Otherwise, use virtual type like 'slateTable:rows' (single-schema object_list)
      const itemBlockType = typeField ? (item[typeField] || virtualType) : virtualType;

      // Determine schema for this item:
      // - If allowedBlocks is set (typed mode), use blocksConfig schema (looked up via blockType)
      // - Otherwise, use shared itemSchema from field definition
      const effectiveItemSchema = hasAllowedBlocks
        ? null // Schema comes from blocksConfig via getBlockSchema(itemBlockType)
        : stripFunctionsFromSchema(itemSchema);

      // Get block schema for typed items (for emptyRequiredFields check)
      const blockSchema = hasAllowedBlocks
        ? getBlockSchema(itemBlockType, intl, blocksConfig)
        : itemSchema;

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
        blockType: itemBlockType, // Real type (from typeField) or virtual type (from parent:field)
        isObjectListItem: true,
        idField,
        ...(typeField && { typeField }), // Only set if typed object_list
        itemSchema: effectiveItemSchema, // null for typed items (schema from blocksConfig)
        dataPath: effectiveDataPath, // Store for later use
        allowedSiblingTypes: hasAllowedBlocks ? fieldDef.allowedBlocks : [virtualType],
        addMode, // Table mode for this container (e.g., rows)
        parentAddMode, // Inherited from parent (e.g., cells inherit 'table' from rows)
        actions, // Available actions for toolbar/dropdown
        emptyRequiredFields: getEmptyRequiredFields(item, blockSchema),
      };

      // RECURSE: process this item's container fields (same pattern!)
      const recurseSchema = hasAllowedBlocks ? blockSchema : itemSchema;
      if (recurseSchema) {
        processItem(item, itemId, itemPath, recurseSchema);
      }
    });
  }

  // Add entry for the page itself (PAGE_BLOCK_UID virtual block)
  // This allows getBlockById, getParentChain, etc. to handle PAGE_BLOCK_UID consistently
  pathMap[PAGE_BLOCK_UID] = {
    path: [],
    parentId: null, // Page has no parent
    containerField: null,
    blockType: '_page',
  };

  // Start traversal with page as root container
  // pageSchema was retrieved from blocksConfig['_page'] at the top of this function
  // parentId=PAGE_BLOCK_UID means page-level blocks have the page as parent
  // parentPath=[] means paths start with [fieldName, blockId]
  processItem(formData, PAGE_BLOCK_UID, [], pageSchema);

  return pathMap;
}

/**
 * Get a block by its path.
 * @param {Object} formData - The form data
 * @param {Array} path - Path array like ['blocks', 'columns-1', 'columns', 'col-1']
 *                       Empty path returns formData (for page-level access)
 * @returns {Object|undefined} The block data or undefined if not found
 */
export function getBlockByPath(formData, path) {
  // Empty path means page-level (return formData itself)
  if (!path || path.length === 0) return formData;

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
  // Empty path means replace root - return value directly
  if (!path || path.length === 0) return value;

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
  if (!pathInfo?.path) {
    // Virtual blocks (like template instances) have blockData in pathMap instead of formData
    return pathInfo?.blockData;
  }
  // Return the raw block data - no @type injection
  // Callers should use blockPathMap[blockId].blockType for the block type
  return getBlockByPath(formData, pathInfo.path);
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
  if (!pathInfo?.path) {
    throw new Error(`Block ${blockId} not found in blockPathMap`);
  }
  return setBlockByPath(formData, pathInfo.path, newBlockData);
}

/**
 * Get all child block IDs whose parent is the given block.
 * Uses blockPathMap's parentId tracking to find direct children.
 *
 * @param {string} parentId - The parent block ID
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId, ... }
 * @returns {string[]} Array of child block IDs
 */
export function getChildBlockIds(parentId, blockPathMap) {
  const childIds = [];
  for (const [blockId, pathInfo] of Object.entries(blockPathMap || {})) {
    if (pathInfo.parentId === parentId) {
      childIds.push(blockId);
    }
  }
  return childIds;
}

/**
 * Get the container field configuration for a nested block.
 * Returns the allowedBlocks, defaultBlockType, etc. from the parent's schema.
 *
 * @param {string} blockId - The block ID to check
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
 * @returns {Object|null} Container field config { fieldName, allowedBlocks, defaultBlockType, maxLength, parentId } or null if page-level
 */
export function getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig, intl) {
  const pathInfo = blockPathMap?.[blockId];
  if (!pathInfo) {
    return null;
  }

  let parentId = pathInfo.parentId;
  const fieldName = pathInfo.containerField;

  // If parent is a virtual template instance, use the instance's parent for storage operations
  // Template blocks are stored flat, so the actual container is the instance's parent
  const parentPathInfo = blockPathMap[parentId];
  if (parentPathInfo?.isTemplateInstance) {
    parentId = parentPathInfo.parentId;
  }

  // Determine parent type: '_page' for page-level blocks, otherwise from blockPathMap
  const parentType = parentId === PAGE_BLOCK_UID ? '_page' : blockPathMap[parentId]?.blockType;
  const schema = getBlockSchema(parentType, intl, blocksConfig);
  const fieldDef = schema?.properties?.[fieldName];

  // For object_list items, we already have most info in pathInfo
  if (pathInfo.isObjectListItem) {
    return {
      fieldName,
      parentId,
      allowedBlocks: pathInfo.allowedSiblingTypes,
      defaultBlockType: pathInfo.blockType,
      maxLength: pathInfo.maxSiblings,
      isObjectList: true,
      itemSchema: pathInfo.typeField ? null : stripFunctionsFromSchema(fieldDef?.schema), // null for typed items
      itemIndex: pathInfo.path[pathInfo.path.length - 1], // Last element is index
      idField: pathInfo.idField,
      typeField: pathInfo.typeField || null, // Attribute name for item type (typed object_list)
      dataPath: pathInfo.dataPath || fieldDef?.dataPath || null, // Path to actual data location
      addMode: pathInfo.addMode || null, // Table mode for this container
      parentAddMode: pathInfo.parentAddMode || null, // Inherited from parent
    };
  }

  // For standard blocks (including page-level), look up container config from schema
  const parentBlock = parentId === PAGE_BLOCK_UID ? formData : getBlockById(formData, blockPathMap, parentId);

  if (!parentBlock) {
    console.log('[BLOCKPATH] getContainerFieldConfig: parentBlock not found for', parentId);
    return null;
  }

  const parentConfig = blocksConfig?.[parentType];

  // Check schema-defined container field
  if (schema?.properties && fieldName) {
    const fieldDef = schema.properties[fieldName];
    if (fieldDef?.widget === 'blocks_layout') {
      return {
        fieldName,
        parentId,
        allowedBlocks: fieldDef.allowedBlocks || null,
        defaultBlockType: fieldDef.defaultBlockType || null,
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
      fieldName: 'blocks_layout',
      parentId,
      allowedBlocks: parentConfig?.allowedBlocks || null,
      defaultBlockType: parentConfig?.defaultBlockType || null,
      maxLength: parentConfig?.maxLength || null,
    };
  }

  return null;
}

/**
 * Get the ID of the adjacent sibling to select after deleting a block from its container.
 * Returns previous sibling if available, otherwise next sibling, otherwise the parent.
 *
 * Works consistently for both page-level blocks and container children.
 *
 * @param {string} blockId - The block being deleted
 * @param {Object} containerConfig - Container config from getContainerFieldConfig
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @returns {string|null} ID of the block to select after deletion
 */
export function getSelectAfterDelete(blockId, containerConfig, blockPathMap, formData) {
  if (!containerConfig) return null;

  const { parentId, isObjectList } = containerConfig;

  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);
  if (!parentBlock) return parentId !== PAGE_BLOCK_UID ? parentId : null;

  const items = getContainerItems(parentBlock, containerConfig);

  if (isObjectList) {
    const idField = containerConfig.idField || '@id';
    const index = items.findIndex(item => item[idField] === blockId);
    if (index === -1) return parentId !== PAGE_BLOCK_UID ? parentId : null;
    // If more than one item, pick adjacent sibling
    if (items.length > 1) {
      const adjacentItem = index > 0 ? items[index - 1] : items[index + 1];
      return adjacentItem[idField];
    }
    // Last item — select parent (unless page-level)
    return parentId !== PAGE_BLOCK_UID ? parentId : null;
  }

  // blocks_layout container: items are string IDs
  const index = items.indexOf(blockId);
  if (index === -1) return parentId !== PAGE_BLOCK_UID ? parentId : null;
  if (items.length > 1) {
    return index > 0 ? items[index - 1] : items[index + 1];
  }
  return parentId !== PAGE_BLOCK_UID ? parentId : null;
}

/**
 * Get ALL container fields for a block (supports multiple container fields).
 * Returns both schema-defined container fields (widget: 'blocks_layout') and implicit containers.
 *
 * @param {string} blockId - The block ID to check
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
 * @param {string|null} templateEditMode - The templateInstanceId being edited, or null
 * @returns {Array} Array of container field configs [{ fieldName, title, allowedBlocks, allowedTemplates, defaultBlockType, maxLength, currentCount, canAdd }]
 */
export function getAllContainerFields(blockId, blockPathMap, formData, blocksConfig, intl, templateEditMode = null) {
  const pathInfo = blockPathMap?.[blockId];

  // Special handling for virtual template instances
  // Template instances don't have a schema, but they contain child blocks
  // tracked via parentId in the pathMap
  if (pathInfo?.isTemplateInstance) {
    // Find all direct children of this template instance
    const childIds = Object.entries(blockPathMap)
      .filter(([, info]) => info.parentId === blockId)
      .map(([id]) => id);

    if (childIds.length > 0) {
      return [{
        fieldName: 'blocks', // Virtual field name for template children
        title: 'Blocks',
        isTemplateInstance: true,
        // Template children are managed specially - no add button for now
        allowedBlocks: null,
        defaultBlockType: null,
        maxLength: null,
        currentCount: childIds.length,
        canAdd: false, // Template instances don't support adding via sidebar
      }];
    }
    return [];
  }

  // For page-level (blockId is PAGE_BLOCK_UID), use _page schema and formData as the block
  const block = blockId === PAGE_BLOCK_UID ? formData : getBlockById(formData, blockPathMap, blockId);
  if (!block) return [];

  // Check if parent block is readonly (can't add to readonly containers)
  const parentIsReadonly = isBlockReadonly(block, templateEditMode);

  // Use blockPathMap for type lookup (single source of truth)
  // For page-level, use '_page' as the type
  const blockType = blockId === PAGE_BLOCK_UID ? '_page' : pathInfo?.blockType;
  if (!blockType) return [];
  const schema = getBlockSchema(blockType, intl, blocksConfig);

  // Compute default allowed blocks (used when field doesn't specify allowedBlocks)
  const blockConfig = blocksConfig?.[blockType];
  const defaultAllowedBlocks = getPageAllowedBlocksFromRestricted(blocksConfig, { properties: formData });

  // Helper to get current count for a container field
  const getFieldCount = (fieldName, isObjectList = false, dataPath = null) => {
    if (isObjectList) {
      // object_list: navigate via dataPath or fieldName
      const path = dataPath || [fieldName];
      let data = block;
      for (const key of path) {
        data = data?.[key];
      }
      return Array.isArray(data) ? data.length : 0;
    }
    // blocks container: count items in layout (fieldName IS the layout)
    return block[fieldName]?.items?.length || 0;
  };

  const containerFields = [];

  // Check for schema-defined container fields (widget: 'blocks_layout' or widget: 'object_list')
  if (schema?.properties) {
    for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
      if (fieldDef.widget === 'blocks_layout') {
        const maxLength = fieldDef.maxLength || blockConfig?.maxLength || null;
        const currentCount = getFieldCount(fieldName);
        const maxLengthOk = !maxLength || currentCount < maxLength;
        containerFields.push({
          fieldName,
          title: fieldDef.title || fieldName,
          allowedBlocks: fieldDef.allowedBlocks || blockConfig?.allowedBlocks || defaultAllowedBlocks,
          allowedTemplates: fieldDef.allowedTemplates || null,
          allowedLayouts: fieldDef.allowedLayouts || null,
          defaultBlockType: fieldDef.defaultBlockType || blockConfig?.defaultBlockType || null,
          maxLength,
          currentCount,
          canAdd: !parentIsReadonly && maxLengthOk,
        });
      } else if (fieldDef.widget === 'object_list') {
        // object_list: items stored as array
        // Two modes:
        //   1. allowedBlocks set: typed items, each can have a different type via typeField
        //   2. schema set (no allowedBlocks): single-schema items, virtual type blockType:fieldName
        const hasAllowedBlocks = !!fieldDef.allowedBlocks;
        const itemType = `${blockType}:${fieldName}`;
        const dataPath = fieldDef.dataPath || null;
        const maxLength = fieldDef.maxLength || null;
        const currentCount = getFieldCount(fieldName, true, dataPath);
        const maxLengthOk = !maxLength || currentCount < maxLength;
        containerFields.push({
          fieldName,
          title: fieldDef.title || fieldName,
          allowedBlocks: hasAllowedBlocks ? fieldDef.allowedBlocks : [itemType],
          allowedTemplates: fieldDef.allowedTemplates || null,
          defaultBlockType: fieldDef.defaultBlockType || (hasAllowedBlocks ? null : itemType),
          maxLength,
          currentCount,
          canAdd: !parentIsReadonly && maxLengthOk,
          isObjectList: true,
          itemSchema: hasAllowedBlocks ? null : stripFunctionsFromSchema(fieldDef.schema), // null for typed (schema from blocksConfig)
          idField: fieldDef.idField || '@id', // ID field name for items
          typeField: fieldDef.typeField || null, // Attribute name for item type (e.g., '@type')
          dataPath,
        });
      }
    }
  }

  // Check for implicit container (blocks/blocks_layout without schema definition)
  // Only if no explicit container fields found
  // Detect from blockConfig (allowedBlocks/defaultBlockType) or existing blocks/blocks_layout
  const isImplicitContainer = (block.blocks && block.blocks_layout?.items) ||
                              blockConfig?.allowedBlocks || blockConfig?.defaultBlockType;
  if (containerFields.length === 0 && isImplicitContainer) {
    const maxLength = blockConfig?.maxLength || null;
    const currentCount = getFieldCount('blocks_layout');
    const maxLengthOk = !maxLength || currentCount < maxLength;
    containerFields.push({
      fieldName: 'blocks_layout',
      title: 'Blocks',
      allowedBlocks: blockConfig?.allowedBlocks || defaultAllowedBlocks,
      defaultBlockType: blockConfig?.defaultBlockType || null,
      maxLength,
      currentCount,
      canAdd: !parentIsReadonly && maxLengthOk,
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
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or PAGE_BLOCK_UID for page-level
 * @param {'before'|'after'|'inside'} action - Where to insert relative to refBlockId
 * @returns {Object} New formData with block inserted
 */
export function insertBlockInContainer(formData, blockPathMap, refBlockId, newBlockId, newBlockData, containerConfig, action = 'after') {
  if (!containerConfig) {
    throw new Error(`[HYDRA] insertBlockInContainer: containerConfig required for block ${refBlockId}`);
  }

  // Helper to compute insert index based on action
  const getInsertIndex = (items, refIndex) => {
    if (action === 'before') return Math.max(0, refIndex);
    if (action === 'after') return refIndex + 1;
    if (action === 'inside') return items.length; // append at end
    return refIndex + 1; // default to after
  };

  const { parentId, fieldName, isObjectList } = containerConfig;

  // parentPath is [] for page-level (parentId === PAGE_BLOCK_UID)
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
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
    // Standard container: shared blocks dict + layout field
    const newContainerBlocks = { ...parentBlock.blocks, [newBlockId]: newBlockData };
    const refIndex = items.indexOf(refBlockId);
    const insertIndex = getInsertIndex(items, refIndex);
    items.splice(insertIndex, 0, newBlockId);
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, items, newContainerBlocks);
  }

  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Delete a block from a container.
 * Treats the page itself as a container when containerConfig is null.
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {string} blockId - Block ID to delete
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or PAGE_BLOCK_UID for page-level
 * @returns {Object} New formData with block removed
 */
export function deleteBlockFromContainer(formData, blockPathMap, blockId, containerConfig) {
  if (!containerConfig) {
    throw new Error(`[HYDRA] deleteBlockFromContainer: containerConfig required for block ${blockId}`);
  }

  const { parentId, fieldName, isObjectList } = containerConfig;

  // parentPath is [] for page-level (parentId === PAGE_BLOCK_UID)
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
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
    // Standard container: remove from shared blocks dict and layout
    const { [blockId]: removed, ...remainingBlocks } = parentBlock.blocks;
    const filteredItems = items.filter(id => id !== blockId);
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, filteredItems, remainingBlocks);
  }

  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Strip all @type:'empty' placeholder blocks from formData before saving.
 * Uses blockPathMap to locate empty blocks at any nesting level.
 *
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
 * @returns {Object} New formData with empty blocks removed
 */
export function stripEmptyBlocks(formData, blocksConfig, intl) {
  const pathMap = buildBlockPathMap(formData, blocksConfig, intl);

  const emptyIds = [];
  for (const [blockId, pathInfo] of Object.entries(pathMap)) {
    if (pathInfo.isTemplateInstance) continue;
    const block = getBlockById(formData, pathMap, blockId);
    if (block?.['@type'] === 'empty') {
      emptyIds.push(blockId);
    }
  }

  if (emptyIds.length === 0) return formData;

  let result = formData;
  for (const blockId of emptyIds) {
    const containerConfig = getContainerFieldConfig(
      blockId, pathMap, result, blocksConfig, intl,
    );
    result = deleteBlockFromContainer(result, pathMap, blockId, containerConfig);
  }
  return result;
}

/**
 * Ensure every container block has at least one child.
 * Inverse of stripEmptyBlocks — restores placeholder blocks on page load
 * for containers that were saved empty (after stripping).
 *
 * @param {Object} formData - The form data
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @returns {Object} New formData with empty containers populated
 */
export function ensureAllContainersHaveBlocks(formData, blocksConfig, intl, uuidGenerator) {
  const pathMap = buildBlockPathMap(formData, blocksConfig, intl);

  let result = formData;
  for (const [blockId, pathInfo] of Object.entries(pathMap)) {
    if (pathInfo.isTemplateInstance) continue;
    const containerFields = getAllContainerFields(
      blockId, pathMap, result, blocksConfig, intl,
    );
    for (const field of containerFields) {
      if (field.isTemplateInstance) continue;
      result = ensureEmptyBlockIfEmpty(
        result,
        { parentId: blockId, ...field },
        pathMap,
        uuidGenerator,
        blocksConfig,
        { intl },
      );
    }
  }
  return result;
}

/**
 * Remove a template instance from the page.
 * - Fixed blocks are deleted entirely
 * - Non-fixed (placeholder) blocks have template fields stripped and become regular blocks
 *
 * @param {Object} formData - The form data
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId, isTemplateInstance, ... }
 * @param {string} templateInstanceId - The templateInstanceId to remove
 * @returns {Object} New formData with template instance removed
 */
export function removeTemplateInstance(formData, blockPathMap, templateInstanceId) {
  // Find the template instance entry in pathMap to get container info
  const instanceInfo = blockPathMap[templateInstanceId];
  if (!instanceInfo?.isTemplateInstance) {
    throw new Error(`[HYDRA] removeTemplateInstance: ${templateInstanceId} is not a template instance`);
  }

  const { parentId, containerField } = instanceInfo;

  // Get the parent container
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);
  if (!parentBlock) {
    throw new Error(`[HYDRA] removeTemplateInstance: could not find parent block ${parentId}`);
  }

  // Get current layout
  // All container fields use fieldName.items for layout; blocks are in shared parent.blocks
  const layoutPath = containerField === 'blocks_layout'
    ? 'blocks_layout.items'
    : `${containerField}.items`;
  const blocksPath = 'blocks';

  const layout = get(parentBlock, layoutPath, []);
  const blocks = get(parentBlock, blocksPath, {});

  // Separate blocks into: fixed (to delete), placeholder (to keep but strip), and unrelated
  const newLayout = [];
  const newBlocks = { ...blocks };

  for (const blockId of layout) {
    const block = blocks[blockId];
    if (!block) {
      newLayout.push(blockId);
      continue;
    }

    // Check if this block belongs to the template instance being removed
    if (block.templateInstanceId === templateInstanceId) {
      if (block.fixed) {
        // Fixed blocks are deleted - don't add to newLayout, remove from newBlocks
        delete newBlocks[blockId];
      } else {
        // Non-fixed blocks: strip template fields and keep them
        const { templateId, templateInstanceId: _, placeholder, fixed, readOnly, ...cleanBlock } = block;
        newBlocks[blockId] = cleanBlock;
        newLayout.push(blockId);
      }
    } else {
      // Block doesn't belong to this template instance - keep as-is
      newLayout.push(blockId);
    }
  }

  // Build updated parent block
  // All fields use shared parent.blocks + fieldName.items layout
  const updatedParentBlock = {
    ...parentBlock,
    blocks: newBlocks,
    [containerField]: { ...parentBlock[containerField], items: newLayout },
  };

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
 * @param {Object|null} containerConfig - Container config from getContainerFieldConfig, or PAGE_BLOCK_UID for page-level
 * @returns {Object} New formData with block mutated
 */
export function mutateBlockInContainer(formData, blockPathMap, blockId, newBlockData, containerConfig) {
  if (!containerConfig) {
    throw new Error(`[HYDRA] mutateBlockInContainer: containerConfig required for block ${blockId}`);
  }

  const { parentId, fieldName, isObjectList } = containerConfig;

  // parentPath is [] for page-level (parentId === PAGE_BLOCK_UID)
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
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
    // Standard container: update block in shared blocks dict
    const blocksObj = { ...parentBlock.blocks, [blockId]: newBlockData };
    updatedParentBlock = setContainerItems(parentBlock, containerConfig, items, blocksObj);
  }

  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Determine the block type to use for an empty container.
 * Fallback chain:
 *   1. containerConfig.defaultBlockType (explicit default for this container)
 *   2. Single allowedBlocks entry (only one choice)
 *   3. config.settings.defaultBlockType if allowed (global default, e.g. 'slate')
 *   4. 'empty' (placeholder that opens BlockChooser on click)
 *
 * @param {Object|null} containerConfig - Container config with allowedBlocks/defaultBlockType
 * @returns {string} Block type to create
 */
function getEmptyBlockType(containerConfig) {
  if (containerConfig?.defaultBlockType) {
    return containerConfig.defaultBlockType;
  }
  if (containerConfig?.allowedBlocks?.length === 1) {
    return containerConfig.allowedBlocks[0];
  }
  const globalDefault = config.settings.defaultBlockType;
  if (globalDefault) {
    const allowed = containerConfig?.allowedBlocks;
    if (!allowed || allowed.includes(globalDefault)) {
      return globalDefault;
    }
  }
  return 'empty';
}

/**
 * Ensure a container has at least one block (empty block if container is empty).
 * Call this after deleting a block to ensure empty containers get an empty block.
 *
 * @param {Object} formData - The form data
 * @param {Object|null} containerConfig - Container config (PAGE_BLOCK_UID for page-level)
 * @param {Object} blockPathMap - Map of blockId -> { path, parentId }
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} options - Options for block initialization
 * @param {Object} options.intl - Intl object for i18n
 * @param {Object} options.metadata - Metadata from form
 * @param {Object} options.properties - Form properties
 * @param {string} options.pageField - For page-level, which page field to check (default: 'blocks')
 * @returns {Object} formData with empty block added if container was empty, or original formData
 */
export function ensureEmptyBlockIfEmpty(formData, containerConfig, blockPathMap, uuidGenerator, blocksConfig, options = {}) {
  const { intl, metadata, properties } = options;

  if (!containerConfig) {
    throw new Error('[HYDRA] ensureEmptyBlockIfEmpty: containerConfig required');
  }

  // If no fieldName, process all container fields for this block
  if (!containerConfig.fieldName) {
    const containerFields = getAllContainerFields(containerConfig.parentId, blockPathMap, formData, blocksConfig, intl);
    let result = formData;
    for (const field of containerFields) {
      result = ensureEmptyBlockIfEmpty(
        result,
        { parentId: containerConfig.parentId, ...field },
        blockPathMap,
        uuidGenerator,
        blocksConfig,
        options,
      );
    }
    return result;
  }

  const { parentId, fieldName, isObjectList } = containerConfig;

  // parentPath is [] for page-level (parentId === PAGE_BLOCK_UID)
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
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
    const typeFieldName = containerConfig.typeField || null;
    let blockData = { [idField]: newBlockId };

    // For typed object_list, add the type attribute
    if (typeFieldName && containerConfig.defaultBlockType) {
      const emptyType = getEmptyBlockType(containerConfig);
      blockData[typeFieldName] = emptyType;
      // Also set @type temporarily for applyBlockDefaults to find the config
      blockData['@type'] = emptyType;
    }

    // Initialize nested containers
    if (intl && blocksConfig && containerConfig.defaultBlockType) {
      blockData = initializeContainerBlock(blockData, blocksConfig, uuidGenerator, { intl, metadata, properties });
    }

    // For typed object_list, clean up @type if typeField is different
    if (typeFieldName && typeFieldName !== '@type') {
      delete blockData['@type'];
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

  const blocksObj = { ...parentBlock.blocks, [newBlockId]: blockData };
  const updatedParentBlock = setContainerItems(parentBlock, containerConfig, [newBlockId], blocksObj);
  return setBlockByPath(formData, parentPath, updatedParentBlock);
}

/**
 * Initialize a container block with default child blocks (recursively).
 * Call this when creating a new block to pre-populate containers.
 *
 * For example, when creating a 'columns' block:
 * - columns has allowedBlocks: ['column'], so creates a column inside
 * - column has defaultBlockType: 'slate', so creates a slate inside that column
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

  // Get schema to find container fields
  const schema = getBlockSchema(blockType, intl, blocksConfig);

  if (!schema?.properties) {
    return blockData;
  }

  // Find ALL container fields (widget: 'blocks_layout') and initialize each one
  let result = { ...blockData };

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    // Handle object_list containers (like cells in a row)
    if (fieldDef.widget === 'object_list') {
      const idField = fieldDef.idField || '@id';
      const typeFieldName = fieldDef.typeField || null;
      const hasAllowedBlocks = !!fieldDef.allowedBlocks;

      // Determine child type:
      // - Typed mode (allowedBlocks): use defaultBlockType or first allowed
      // - Single-schema mode: use virtual type for applyBlockDefaults
      const childType = hasAllowedBlocks
        ? (fieldDef.defaultBlockType || fieldDef.allowedBlocks?.[0] || `${blockType}:${fieldName}`)
        : `${blockType}:${fieldName}`;

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

        // Start with ID and type
        let childData = { [idField]: childId, '@type': childType };

        // Apply schema defaults (e.g., slate fields get empty paragraph)
        childData = applyBlockDefaults({ data: childData, intl }, blocksConfig);

        // Recursively initialize nested containers
        childData = initializeContainerBlock(childData, blocksConfig, uuidGenerator, options);

        if (hasAllowedBlocks && typeFieldName) {
          // Typed object_list: store type in the specified typeField attribute
          childData[typeFieldName] = childType;
          // Remove @type if typeField is different (don't duplicate)
          if (typeFieldName !== '@type') {
            delete childData['@type'];
          }
        } else {
          // Single-schema object_list: remove @type, items don't store it in data
          delete childData['@type'];
        }

        children.push(childData);
      }

      result = {
        ...result,
        [fieldName]: children,
      };
      continue;
    }

    if (fieldDef.widget !== 'blocks_layout') {
      continue;
    }

    // Determine the initial child block type for this container field
    let childBlockType = null;
    if (fieldDef.defaultBlockType) {
      childBlockType = fieldDef.defaultBlockType;
    } else if (fieldDef.allowedBlocks?.length === 1) {
      childBlockType = fieldDef.allowedBlocks[0];
    }

    // No determinable child type - initialize with empty container structure
    if (!childBlockType) {
      result = {
        ...result,
        blocks: { ...(result.blocks || {}) },
        [fieldName]: { items: [] },
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

    // Add child to shared blocks dict + layout field
    result = {
      ...result,
      blocks: {
        ...(result.blocks || {}),
        [childBlockId]: childBlockData,
      },
      [fieldName]: { items: [childBlockId] },
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
 * @param {string|null} parentBlockId - Parent block ID (PAGE_BLOCK_UID for page-level)
 * @param {string} fieldName - Container field name (e.g., 'blocks', 'columns')
 * @param {Array<string>} newOrder - New order of block IDs
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
 * @returns {Object} New formData with blocks reordered
 */
export function reorderBlocksInContainer(
  formData,
  blockPathMap,
  parentBlockId,
  fieldName,
  newOrder,
  blocksConfig = null,
  intl = null,
) {
  // If parent is a virtual template instance, resolve to the instance's actual parent
  let effectiveParentId = parentBlockId;
  if (blockPathMap[parentBlockId]?.isTemplateInstance) {
    effectiveParentId = blockPathMap[parentBlockId].parentId;
  }

  // parentPath is [] for page-level (parentBlockId === PAGE_BLOCK_UID)
  const parentPath = effectiveParentId === PAGE_BLOCK_UID ? [] : blockPathMap[effectiveParentId]?.path;
  if (effectiveParentId !== PAGE_BLOCK_UID && !parentPath) {
    console.error('[REORDER] Could not find parent path for:', parentBlockId);
    return formData;
  }

  const parentBlock = getBlockByPath(formData, parentPath);
  if (!parentBlock) {
    console.error('[REORDER] Could not find parent block:', parentBlockId);
    return formData;
  }

  // Detect if this is an object_list field
  // For page-level, parent type is '_page'
  const parentType = effectiveParentId === PAGE_BLOCK_UID ? '_page' : parentBlock['@type'];
  const schema = getBlockSchema(parentType, intl, blocksConfig);
  const fieldDef = schema?.properties?.[fieldName];
  const isObjectList = fieldDef?.widget === 'object_list';

  // Build containerConfig from fieldDef for helper functions
  const containerConfig = {
    fieldName,
    isObjectList,
    dataPath: fieldDef?.dataPath,
    idField: fieldDef?.idField,
  };

  const items = getContainerItems(parentBlock, containerConfig);
  const reorderedItems = reorderContainerItems(items, newOrder, containerConfig);
  const updatedParent = setContainerItems(parentBlock, containerConfig, reorderedItems);

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
 * @param {string|null} sourceParentId - Parent of source block (PAGE_BLOCK_UID for page-level)
 * @param {string|null} targetParentId - Parent of target block (PAGE_BLOCK_UID for page-level)
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} intl - The intl object from react-intl
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
  intl,
) {
  // Get block data to move
  const sourcePath = blockPathMap[blockId]?.path;
  const blockData = getBlockByPath(formData, sourcePath);
  console.log('[MOVE_BLOCK] sourcePath:', sourcePath, 'blockData:', blockData ? 'found' : 'null', 'blockType:', blockData?.['@type']);

  if (!blockData) {
    console.error('[MOVE_BLOCK] Could not find block data for:', blockId);
    return null;
  }

  // Same container - just reorder
  // Check both parentId AND containerField to handle page-level blocks in different fields
  // (e.g., blocks vs footer_blocks both have parentId=PAGE_BLOCK_UID but different containerField)
  const sourceContainerField = blockPathMap[blockId]?.containerField;
  const targetContainerField = blockPathMap[targetBlockId]?.containerField;
  if (sourceParentId === targetParentId && sourceContainerField === targetContainerField) {
    return reorderBlockInContainer(
      formData,
      blockPathMap,
      blockId,
      targetBlockId,
      insertAfter,
      sourceParentId,
      blocksConfig,
      intl,
    );
  }

  // Different containers - need to remove from source and add to target
  // First, delete from source
  const sourceContainerConfig = getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig, intl);
  if (!sourceContainerConfig) {
    console.error('[MOVE_BLOCK] Could not find source container config for block:', blockId);
    return null;
  }

  let newFormData = deleteBlockFromContainer(
    formData,
    blockPathMap,
    blockId,
    sourceContainerConfig,
  );

  // Get target container config by looking up target block's container
  const targetContainerConfig = getContainerFieldConfig(targetBlockId, blockPathMap, formData, blocksConfig, intl);
  if (!targetContainerConfig) {
    console.error('[MOVE_BLOCK] Could not find target container config for block:', targetBlockId);
    return null;
  }

  // Validate that block type is allowed in target container
  const sourcePathInfo = blockPathMap[blockId];
  const blockType = sourcePathInfo?.blockType || blockData?.['@type'];
  const targetAllowedBlocks = blockPathMap[targetBlockId]?.allowedSiblingTypes;
  if (targetAllowedBlocks && blockType && !targetAllowedBlocks.includes(blockType)) {
    console.warn('[MOVE_BLOCK] Block type not allowed in target container:', blockType, 'allowed:', targetAllowedBlocks);
    return null; // Reject the move
  }

  // Adapt block data for target format
  // When moving between object_list and blocks containers, the data needs cleaning
  let adaptedBlockData = { ...blockData };

  // Strip source-format-specific ID field if moving FROM object_list
  if (sourceContainerConfig.isObjectList) {
    const sourceIdField = sourceContainerConfig.idField || '@id';
    delete adaptedBlockData[sourceIdField];
  }

  // When moving TO blocks container, ensure @type is set
  if (!targetContainerConfig.isObjectList && !adaptedBlockData['@type'] && blockType) {
    adaptedBlockData['@type'] = blockType;
  }

  // When moving TO typed object_list, ensure typeField is set
  if (targetContainerConfig.isObjectList && targetContainerConfig.typeField && blockType) {
    adaptedBlockData[targetContainerConfig.typeField] = blockType;
    // If typeField is not @type, remove @type to avoid duplication
    if (targetContainerConfig.typeField !== '@type') {
      delete adaptedBlockData['@type'];
    }
  }

  // Use insertBlockInContainer for the target insertion (handles both formats)
  const action = insertAfter ? 'after' : 'before';
  newFormData = insertBlockInContainer(
    newFormData,
    blockPathMap,
    targetBlockId,
    blockId,
    adaptedBlockData,
    targetContainerConfig,
    action,
  );

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
  intl,
) {
  const containerConfig = getContainerFieldConfig(blockId, blockPathMap, formData, blocksConfig, intl);
  if (!containerConfig) {
    console.error('[MOVE_BLOCK] Could not find container config for block:', blockId);
    return null;
  }

  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);
  if (!parentBlock) {
    console.error('[MOVE_BLOCK] Could not find parent block:', parentId);
    return null;
  }

  // Compute new ID order from blockId + targetBlockId + insertAfter
  const items = getContainerItems(parentBlock, containerConfig);
  const idField = containerConfig.isObjectList ? (containerConfig.idField || '@id') : null;
  const getId = idField ? (item => item[idField]) : (item => item);

  const ids = items.map(getId);
  const currentIndex = ids.indexOf(blockId);
  const targetIndex = ids.indexOf(targetBlockId);

  if (currentIndex === -1 || targetIndex === -1) {
    console.error('[MOVE_BLOCK] Block not found in container:', { blockId, targetBlockId, ids });
    return null;
  }

  ids.splice(currentIndex, 1);
  let newIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
  if (insertAfter) newIndex++;
  ids.splice(newIndex, 0, blockId);

  // Delegate to reorderBlocksInContainer which handles both formats
  return reorderBlocksInContainer(formData, blockPathMap, parentId, containerConfig.fieldName, ids, blocksConfig, intl);
}

/**
 * Get the index to insert at in the target container.
 */
function getInsertionIndex(formData, blockPathMap, targetBlockId, insertAfter, containerConfig) {
  if (!containerConfig) {
    throw new Error(`[HYDRA] getInsertionIndex: containerConfig required`);
  }

  const { parentId, fieldName } = containerConfig;

  // parentPath is [] for page-level (parentId === PAGE_BLOCK_UID)
  const parentPath = parentId === PAGE_BLOCK_UID ? [] : blockPathMap[parentId]?.path;
  const parentBlock = getBlockByPath(formData, parentPath);
  const items = parentBlock?.[fieldName]?.items || [];

  const targetIndex = items.indexOf(targetBlockId);
  if (targetIndex === -1) {
    // Target not found, insert at end
    return items.length;
  }

  return insertAfter ? targetIndex + 1 : targetIndex;
}
