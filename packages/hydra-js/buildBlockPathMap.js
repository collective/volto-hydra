/**
 * Schema-driven block path map builder — no Volto dependencies.
 *
 * This module provides the core path-building algorithm extracted from
 * packages/volto-hydra/src/utils/blockPath.js so it can be used in
 * contexts that cannot import @plone/volto (e.g. test mock parents,
 * browser-only scripts).
 *
 * blockPath.js imports from here and re-exports, so Volto code continues
 * to use it via the same import path as before.
 */

// Same value as PAGE_BLOCK_UID in hydra.js — defined locally to avoid
// importing from @volto-hydra/hydra-js (which would pull in Volto deps).
const PAGE_BLOCK_UID = '_page';

// Cache for getBlockTypeSchema — keyed by blockType
const _typeSchemaCache = new Map();

/**
 * Get the default schema for a block type (with empty formData).
 * Runs blockSchema + schemaEnhancer with formData={}, so enhancers that add
 * fields unconditionally are included. Cached by blockType since the inputs
 * are always the same for a given type.
 *
 * @param {string} blockType - The block type ID
 * @param {Object} intl - The intl object from react-intl (optional; only needed for i18n schemas)
 * @param {Object} blocksConfig - The blocks config from registry
 * @returns {Object|null} - The default block schema or null
 */
export function getBlockTypeSchema(blockType, intl, blocksConfig) {
  if (!blockType) return null;
  if (!blocksConfig) throw new Error('getBlockTypeSchema requires blocksConfig');

  const cached = _typeSchemaCache.get(blockType);
  if (cached) return cached;

  const blockConfig = blocksConfig[blockType];
  if (!blockConfig) return null;

  const schemaSource = blockConfig.blockSchema || blockConfig.schema;
  let schema = null;

  if (schemaSource) {
    schema = typeof schemaSource === 'function'
      ? schemaSource({ formData: {}, data: {}, intl })
      : schemaSource;
  }

  if (!schema) {
    schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
      properties: {},
      required: [],
    };
  } else if (!schema.fieldsets) {
    schema = {
      ...schema,
      fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
    };
  }

  if (typeof blockConfig.schemaEnhancer === 'function') {
    schema = blockConfig.schemaEnhancer({
      schema,
      formData: {},
      intl,
    });
  }

  const result = schema?.properties && Object.keys(schema.properties).length > 0
    ? schema
    : null;

  _typeSchemaCache.set(blockType, result);
  return result;
}

/**
 * Get the full enhanced schema for a specific block instance.
 * Runs blockSchema + schemaEnhancer with the block's actual data.
 * The result depends on formData (e.g., selected variation), so it's NOT
 * cacheable by type alone — each block instance may produce a different schema.
 *
 * @param {string} blockType - The block type ID
 * @param {Object} intl - The intl object from react-intl (optional; only needed for i18n schemas)
 * @param {Object} blocksConfig - The blocks config from registry
 * @param {Object} formData - Block instance data passed to schemaEnhancer
 * @returns {Object|null} - The enhanced block schema or null
 */
export function getBlockSchema(blockType, intl, blocksConfig, formData, pageFormData) {
  if (!blockType) return null;
  if (!blocksConfig) throw new Error('getBlockSchema requires blocksConfig');

  const blockConfig = blocksConfig[blockType];
  if (!blockConfig) return null;

  const schemaSource = blockConfig.blockSchema || blockConfig.schema;
  let schema = null;

  const effectiveFormData = formData || {};

  if (schemaSource) {
    schema = typeof schemaSource === 'function'
      ? schemaSource({ formData: effectiveFormData, data: effectiveFormData, intl })
      : schemaSource;
  }

  if (!schema) {
    schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
      properties: {},
      required: [],
    };
  } else if (!schema.fieldsets) {
    schema = {
      ...schema,
      fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
    };
  }

  // Ensure nested widget: 'object' schemas also have fieldsets
  if (schema?.properties) {
    for (const fieldDef of Object.values(schema.properties)) {
      if (fieldDef?.widget === 'object' && fieldDef.schema?.properties && !fieldDef.schema.fieldsets) {
        fieldDef.schema = {
          ...fieldDef.schema,
          fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
        };
      }
    }
  }

  // Run schemaEnhancer with instance data (skip recipe objects — only admin converts those)
  if (typeof blockConfig.schemaEnhancer === 'function') {
    schema = blockConfig.schemaEnhancer({
      schema,
      formData: effectiveFormData,
      intl,
      pageFormData,
    });
  }

  return schema?.properties && Object.keys(schema.properties).length > 0
    ? schema
    : null;
}

/**
 * Compute page-level allowed block types from blocksConfig's `restricted` property.
 * A block is allowed at page level if restricted is false or if restricted(context) returns false.
 *
 * @param {Object} blocksConfig - Block configuration from registry
 * @param {Object} context - Context for restricted functions { properties, navRoot, contentType }
 * @returns {Array} Array of block type IDs allowed at page level
 */
export function getPageAllowedBlocksFromRestricted(blocksConfig, context = {}) {
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
 * @param {Object} blocksConfig - Block configuration (must have _page registered for multiple page fields)
 * @param {Object} [intl={}] - The intl object from react-intl (optional; only needed for i18n schemas)
 * @returns {Object} Map of blockId -> { path: string[], parentId: string, containerField: string|null, ... }
 *
 * Path format examples:
 * - Page block: ['blocks', 'text-1']
 * - Nested block: ['blocks', 'columns-1', 'columns', 'col-1', 'blocks', 'text-1a']
 * - Object list item: ['blocks', 'slider-1', 'slides', 0]
 * - Nested object list: ['blocks', 'table-1', 'table', 'rows', 0, 'cells', 1]
 * - Multiple page fields: ['header_blocks', 'header-1'], ['footer_blocks', 'footer-1']
 */
/**
 * Get the resolved schema for a block from its pathInfo entry.
 * Schemas are deduplicated in pathMap._schemas by content hash.
 * @param {Object} pathInfo - The block's pathMap entry
 * @param {Object} pathMap - The full pathMap (contains _schemas)
 * @returns {Object|null} The resolved block schema, or null
 */
export function getResolvedSchema(pathInfo, pathMap) {
  if (!pathInfo?._schemaRef || !pathMap?._schemas) return null;
  return pathMap._schemas[pathInfo._schemaRef] || null;
}

// djb2 hash for schema deduplication
function _hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return 's' + hash.toString(36);
}

export function buildBlockPathMap(formData, blocksConfig, intl = {}) {
  const pathMap = {};
  // Deduplicated schema store — most blocks of the same type share identical
  // resolved schemas. Storing once per unique schema instead of per-block
  // reduces postMessage payload dramatically (e.g., 2.5MB → ~200KB).
  pathMap._schemas = {};
  // Store a schema in the deduplicated _schemas map, return the ref key.
  // Extract text from React elements (JSX) recursively.
  // Schemas may have JSX in description fields (e.g., Image block's
  // alt.description). These capture React context refs that create
  // circular structures in JSON.stringify.
  const reactElementToText = (el) => {
    if (!el) return '';
    if (typeof el === 'string') return el;
    if (typeof el === 'number') return String(el);
    if (Array.isArray(el)) return el.map(reactElementToText).join('');
    if (el.$$typeof && el.props) {
      const children = el.props.children;
      return reactElementToText(children);
    }
    return '';
  };

  const storeSchema = (schema) => {
    if (!schema) return undefined;
    const str = JSON.stringify(schema, (key, value) => {
      if (typeof value === 'function') return undefined;
      // Convert React elements (JSX) to plain text
      if (value?.$$typeof) return reactElementToText(value);
      return value;
    });
    const key = _hashString(str);
    if (!pathMap._schemas[key]) {
      pathMap._schemas[key] = schema;
    }
    return key;
  };
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

  // Insert restriction logic for fixed block/item boundaries.
  // Can't insert between two adjacent fixed items, or at container edges next to a fixed item.
  function getInsertRestrictions(item, index, count, prevIsFixed, nextIsFixed) {
    const isFixed = item.fixed === true;
    const atStart = index === 0;
    const atEnd = index === count - 1;
    const hasNextPlaceholder = item.nextSlotId != null;
    return {
      canInsertBefore: !(isFixed && (atStart || prevIsFixed)),
      canInsertAfter: !(isFixed && (atEnd || nextIsFixed)) || hasNextPlaceholder,
    };
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
        // Strip functions from fieldDef for postMessage serialization
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
      const blockSchema = getBlockSchema(blockType, intl, blocksConfig, block, formData);

      // Check Volto's standard block properties
      const isFixed = block.fixed === true;        // Volto standard: position locked
      const isReadonly = block.readOnly === true;  // Volto standard: content locked

      // Insert restrictions based on fixed block boundaries
      const prevBlockId = layout[index - 1];
      const nextBlockId = layout[index + 1];
      const { canInsertBefore, canInsertAfter } = getInsertRestrictions(
        block, index, layout.length,
        prevBlockId ? blockFixedStatus[prevBlockId] : false,
        nextBlockId ? blockFixedStatus[nextBlockId] : false,
      );

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
        _schemaRef: storeSchema(blockSchema), // Deduplicated schema reference
        allowedSiblingTypes: fieldDef.allowedBlocks
          ? (parentId === PAGE_BLOCK_UID
            ? fieldDef.allowedBlocks.filter(t => defaultPageAllowedBlocks.includes(t))
            : fieldDef.allowedBlocks)
          : defaultPageAllowedBlocks,
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
    // or from the field definition (e.g., fieldDef.addMode = 'table' on rows field)
    // - First-level items (rows) get addMode from block config or field def
    // - Second-level items (cells) get parentAddMode from their parent row
    const parentAddMode = parentPathInfo?.addMode || parentPathInfo?.parentAddMode || null;

    // Get addMode from block config or field definition
    // Check field definition first (works when nested inside widget: 'object' where parent['@type'] is absent)
    let addMode = fieldDef.addMode || null;
    if (!addMode && !parentPathInfo?.isObjectListItem) {
      // Parent is a real block - check its config for addMode
      const blockType = parent['@type'];
      const blockConfig = blocksConfig?.[blockType];
      addMode = blockConfig?.addMode || null;
    }

    itemsArray.forEach((item, index) => {
      const itemId = item[idField];
      if (!itemId) return;

      // Build path using numeric index (not string key) so getBlockByPath traversal works on arrays
      const itemPath = [...parentPath, ...effectiveDataPath, index];

      // Determine block type:
      // - If typeField is set, read type from item[typeField] (typed object_list)
      // - If typed mode and type missing, fall back to defaultBlockType (e.g., old data without @type)
      // - Otherwise, use virtual type like 'slateTable:rows' (single-schema object_list)
      const itemBlockType = typeField
        ? (item[typeField] || (hasAllowedBlocks && fieldDef.defaultBlockType) || virtualType)
        : virtualType;

      // Determine schema for this item:
      // - If allowedBlocks is set (typed mode), use blocksConfig schema (looked up via blockType)
      // - Otherwise, use shared itemSchema from field definition
      const effectiveItemSchema = hasAllowedBlocks
        ? null // Schema comes from blocksConfig via getBlockSchema(itemBlockType)
        : itemSchema;

      // Get block schema for typed items (for emptyRequiredFields check)
      const blockSchema = hasAllowedBlocks
        ? getBlockSchema(itemBlockType, intl, blocksConfig, item, formData)
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

      // Check template properties on the item itself (same as regular blocks)
      const itemIsFixed = item.fixed === true;
      const itemIsReadonly = item.readOnly === true;

      // Insert restrictions based on fixed item boundaries
      const { canInsertBefore, canInsertAfter } = getInsertRestrictions(
        item, index, itemsArray.length,
        itemsArray[index - 1]?.fixed === true,
        itemsArray[index + 1]?.fixed === true,
      );

      pathMap[itemId] = {
        path: itemPath,
        parentId,
        containerField: fieldName,
        blockType: itemBlockType, // Real type (from typeField) or virtual type (from parent:field)
        isObjectListItem: true,
        idField,
        ...(typeField && { typeField }), // Only set if typed object_list
        ...(itemIsFixed && { isFixed: true }),
        ...(itemIsReadonly && { isReadonly: true }),
        ...(!canInsertBefore && { canInsertBefore: false }),
        ...(!canInsertAfter && { canInsertAfter: false }),
        _schemaRef: storeSchema(blockSchema), // Deduplicated schema reference
        itemSchema: effectiveItemSchema, // null for typed items (schema from blocksConfig)
        dataPath: effectiveDataPath, // Store for later use
        allowedSiblingTypes: hasAllowedBlocks ? fieldDef.allowedBlocks : [virtualType],
        maxSiblings: fieldDef.maxLength || null,
        siblingCount: itemsArray.length,
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
    _schemaRef: storeSchema(pageSchema),
  };

  // Start traversal with page as root container
  // pageSchema was retrieved from blocksConfig['_page'] at the top of this function
  // parentId=PAGE_BLOCK_UID means page-level blocks have the page as parent
  // parentPath=[] means paths start with [fieldName, blockId]
  processItem(formData, PAGE_BLOCK_UID, [], pageSchema);

  return pathMap;
}
