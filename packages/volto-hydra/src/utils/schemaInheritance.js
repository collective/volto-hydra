/**
 * Schema Inheritance Utilities
 *
 * Helpers for blocks that reference other block types and inherit their schemas.
 * Used by listing blocks, grid blocks, and other containers that need to show
 * editable fields from a referenced block type.
 */
import config from '@plone/volto/registry';
import { getBlockSchema, getBlockById, updateBlockById, getChildBlockIds } from './blockPath';
import { getHydraSchemaContext, getLiveBlockData } from '../context';

// Re-export getBlockSchema from blockPath for convenience
export { getBlockSchema };

/**
 * Creates a schemaEnhancer that inherits fields from a referenced block type.
 *
 * Use this for blocks that reference another block type (e.g., listing → teaser).
 * The referenced type's schema fields are added to the parent's sidebar,
 * minus any fields that are mapped to external data.
 *
 * @param {string} typeField - Field name containing the block type (e.g., 'itemType')
 * @param {string} mappingField - Field name containing field mappings (e.g., 'fieldMapping')
 *                                Can be null if no mapping is used
 * @param {string} defaultsField - Field name to store inherited values (e.g., 'itemDefaults')
 * @returns {Function} - A schemaEnhancer function
 *
 * @example
 * // In block config:
 * schemaEnhancer: inheritSchemaFrom('itemType', 'fieldMapping', 'itemDefaults')
 */
export function inheritSchemaFrom(typeField, mappingField, defaultsField) {
  return (args) => {
    let { formData, schema, intl } = args;

    // Use formData value, falling back to schema default for the typeField
    const referencedType = formData?.[typeField] ?? schema.properties?.[typeField]?.default;
    const blocksConfig = config.blocks.blocksConfig;

    // Check if parent controls our type (parent has inheritSchemaFrom with typeField selected)
    // If so, hide our typeField and defaults fieldset since parent controls those
    const hydraContext = getHydraSchemaContext();
    const blockPathMap = hydraContext?.blockPathMap;
    const blockId = hydraContext?.currentBlockId;

    let parentControlsType = false;
    if (blockPathMap && blockId) {
      const pathInfo = blockPathMap[blockId];
      if (pathInfo?.parentId) {
        // Use getLiveBlockData to get fresh parent data from form internal state
        const parentBlock = getLiveBlockData(pathInfo.parentId);
        if (parentBlock) {
          const parentConfig = blocksConfig?.[parentBlock['@type']];
          const parentTypeField = parentConfig?.schemaEnhancer?.config?.typeField;
          // If parent has a typeField AND has selected a value, it controls our type
          if (parentTypeField && parentBlock[parentTypeField]) {
            parentControlsType = true;
          }
        }
      }
    }

    // If parent controls our type, hide typeField but still update fieldMapping
    // The parent's itemDefaults will control default values
    if (parentControlsType) {
      // Get the type from parent's selection (via getLiveBlockData)
      const pathInfo = blockPathMap[blockId];
      const parentBlock = getLiveBlockData(pathInfo.parentId);
      const parentConfig = blocksConfig?.[parentBlock?.['@type']];
      const parentTypeField = parentConfig?.schemaEnhancer?.config?.typeField;
      const parentSelectedType = parentBlock?.[parentTypeField];

      // Use parent's selected type for computing fieldMapping
      const effectiveType = parentSelectedType || referencedType;
      const effectiveSchema = effectiveType ? getBlockSchema(effectiveType, intl, blocksConfig) : null;

      // Clone schema and remove typeField
      let newSchema = {
        ...schema,
        fieldsets: schema.fieldsets?.map((fs) => ({
          ...fs,
          fields: fs.fields?.filter((f) => f !== typeField) || [],
        })).filter((fs) => fs.fields.length > 0 || fs.id === 'default'),
        properties: { ...schema.properties },
      };
      delete newSchema.properties[typeField];

      // Still need to update fieldMapping with valid target fields for the parent's type
      if (mappingField && newSchema.properties[mappingField]?.sourceFields && effectiveSchema?.properties) {
        const validTargetFields = Object.keys(effectiveSchema.properties);
        let effectiveMapping = formData?.[mappingField] || {};

        // Check if current mapping is empty or has invalid target fields
        const hasMapping = Object.keys(effectiveMapping).length > 0;
        const hasInvalidTargets = Object.values(effectiveMapping).some(
          (targetField) => targetField && !new Set(validTargetFields).has(targetField),
        );

        if (!hasMapping || hasInvalidTargets) {
          // Compute smart defaults for the parent's selected type
          effectiveMapping = computeSmartDefaults(
            newSchema.properties[mappingField].sourceFields,
            effectiveSchema,
          );
        }

        // Set propertyNames.enum (source fields) and additionalProperties.enum (target fields)
        const sourceFields = Object.keys(newSchema.properties[mappingField].sourceFields || {});
        newSchema = {
          ...newSchema,
          properties: {
            ...newSchema.properties,
            [mappingField]: {
              ...newSchema.properties[mappingField],
              default: effectiveMapping,
              targetType: effectiveType, // Ensure targetType is set
              propertyNames: {
                enum: sourceFields,
              },
              additionalProperties: {
                enum: validTargetFields,
              },
            },
          },
        };
      }

      return newSchema;
    }

    // If no referenced type selected, still ensure typeField is in a fieldset
    if (!referencedType) {
      // Check if typeField is already in a fieldset
      const typeFieldInFieldset = schema.fieldsets?.some(
        (fs) => fs.fields?.includes(typeField),
      );
      if (typeFieldInFieldset || !schema.properties?.[typeField]) {
        return schema;
      }
      // Add typeField to Default fieldset so it's visible
      const newSchema = {
        ...schema,
        fieldsets: schema.fieldsets?.map((fs) =>
          fs.id === 'default'
            ? { ...fs, fields: [typeField, ...(fs.fields || [])] }
            : fs,
        ) || [{ id: 'default', title: 'Default', fields: [typeField] }],
      };
      return newSchema;
    }
    const referencedSchema = getBlockSchema(referencedType, intl, blocksConfig);
    if (!referencedSchema?.properties) return schema;

    // Compute smart defaults for fieldMapping based on current target type
    // We set this as the schema default so the form applies it when value is empty/invalid
    let effectiveMapping = formData?.[mappingField] || {};
    if (mappingField && schema.properties[mappingField]?.sourceFields) {
      const validTargetFields = Object.keys(referencedSchema.properties);

      // Check if current mapping is empty or has invalid target fields
      const hasMapping = Object.keys(effectiveMapping).length > 0;
      const hasInvalidTargets = Object.values(effectiveMapping).some(
        (targetField) => targetField && !new Set(validTargetFields).has(targetField),
      );

      if (!hasMapping || hasInvalidTargets) {
        // Compute smart defaults for this target type
        effectiveMapping = computeSmartDefaults(
          schema.properties[mappingField].sourceFields,
          referencedSchema,
        );
      }

      // Set propertyNames.enum (source fields) and additionalProperties.enum (target fields)
      // This enables isValidValue to detect when mapping becomes invalid
      const sourceFields = Object.keys(schema.properties[mappingField].sourceFields || {});
      schema = {
        ...schema,
        properties: {
          ...schema.properties,
          [mappingField]: {
            ...schema.properties[mappingField],
            default: effectiveMapping,
            propertyNames: {
              enum: sourceFields,
            },
            additionalProperties: {
              enum: validTargetFields,
            },
          },
        },
      };
    }

    // Get mapped fields (these won't be shown - they come from external data)
    // Use effectiveMapping which includes smart defaults if computed
    const mappedFields = new Set(
      mappingField ? Object.values(effectiveMapping) : [],
    );

    // Check if child block has editableFields or parentControlledFields in its schemaEnhancer config
    const childConfig = blocksConfig[referencedType];
    const childEnhancerConfig = childConfig?.schemaEnhancer?.config;
    const editableFields = childEnhancerConfig?.editableFields;
    const parentControlledFields = childEnhancerConfig?.parentControlledFields;

    // Get non-mapped fields from referenced type, filtered by field control settings
    // Use underscore separator for flat keys (Volto forms don't handle nested paths)
    const inheritedFields = Object.entries(referencedSchema.properties)
      .filter(([fieldName]) => {
        // Skip the typeField itself - it's on the parent, not inherited
        // (e.g., if image block has 'variation' field, don't inherit it when parent uses 'variation' as typeField)
        if (fieldName === typeField) return false;

        // Skip mapped fields
        if (mappedFields.has(fieldName)) return false;

        // If editableFields defined: only show fields NOT in that list (parent gets the rest)
        if (editableFields) {
          return !editableFields.includes(fieldName);
        }
        // If parentControlledFields defined: only show those fields
        if (parentControlledFields) {
          return parentControlledFields.includes(fieldName);
        }
        // Default: show all non-mapped fields
        return true;
      })
      .map(([fieldName, fieldDef]) => ({
        name: `${defaultsField}_${fieldName}`,
        def: { ...fieldDef, title: fieldDef.title || fieldName },
      }));

    // Add fieldset for inherited fields if there are any
    if (inheritedFields.length > 0) {
      const referencedTitle =
        blocksConfig[referencedType]?.title || referencedType;

      // Clone schema to avoid mutations
      const newSchema = {
        ...schema,
        fieldsets: [...schema.fieldsets],
        properties: { ...schema.properties },
      };

      // Add fieldset for inherited fields (includes typeField at the start)
      const inheritedFieldsetFields = inheritedFields.map((f) => f.name);
      if (schema.properties[typeField]) {
        inheritedFieldsetFields.unshift(typeField);
      }
      newSchema.fieldsets.push({
        id: 'inherited_fields',
        title: `${referencedTitle} Defaults`,
        fields: inheritedFieldsetFields,
      });

      // Add field definitions
      for (const { name, def } of inheritedFields) {
        newSchema.properties[name] = def;
      }

      return newSchema;
    }

    return schema;
  };
}

/**
 * Creates a schemaEnhancer that hides fields owned by parent container.
 *
 * Use this on child block types that can appear in containers with inherited defaults.
 * Specify either:
 * - editableFields: whitelist of fields that stay on child (everything else hidden)
 * - parentControlledFields: blacklist of fields that go to parent (only these hidden)
 *
 * @param {string[]} defaultsFieldSuffixes - Suffixes to look for in parent (e.g., ['itemDefaults'])
 * @param {Object} options - Configuration options
 * @param {string[]} options.editableFields - Whitelist of fields to keep on child
 * @param {string[]} options.parentControlledFields - Blacklist of fields to hide from child
 * @returns {Function} - A schemaEnhancer function
 *
 * @example
 * // In schemaEnhancer config:
 * schemaEnhancer: {
 *   type: 'hideParentOwnedFields',
 *   config: {
 *     defaultsField: 'itemDefaults',
 *     editableFields: ['href', 'title', 'description']
 *   }
 * }
 */
export function hideParentOwnedFields(defaultsFieldSuffixes = ['Defaults'], options = {}) {
  const { editableFields, parentControlledFields } = options;

  return (args) => {
    const { schema, blockPathMap: passedBlockPathMap, blockId: passedBlockId } = args;

    // Get blockPathMap and blockId from context (set by HydraSchemaProvider)
    // Fall back to passed params for compatibility
    const hydraContext = getHydraSchemaContext();
    const blockPathMap = hydraContext?.blockPathMap || passedBlockPathMap;
    const blockId = hydraContext?.currentBlockId || passedBlockId;
    const blocksConfig = hydraContext?.blocksConfig;

    if (!blockPathMap || !blockId) return schema;

    const pathInfo = blockPathMap?.[blockId];
    if (!pathInfo?.parentId) return schema;

    // Check if parent has a type selected (via inheritSchemaFrom's typeField)
    // If parent has no type selected, children are free to be any type - don't hide fields
    if (blocksConfig) {
      // Use getLiveBlockData to get fresh parent data from form internal state
      const parentBlock = getLiveBlockData(pathInfo.parentId);
      if (parentBlock) {
        const parentConfig = blocksConfig[parentBlock['@type']];
        const typeField = parentConfig?.schemaEnhancer?.config?.typeField;
        if (typeField && !parentBlock[typeField]) {
          // Parent has a typeField config but no value selected - children are independent
          return schema;
        }
      }
    }

    // Determine which fields to hide
    let fieldsToHide = new Set();

    if (editableFields) {
      // Whitelist mode: hide everything except editableFields
      for (const fieldName of Object.keys(schema.properties || {})) {
        if (!editableFields.includes(fieldName)) {
          fieldsToHide.add(fieldName);
        }
      }
    } else if (parentControlledFields) {
      // Blacklist mode: hide only parentControlledFields
      fieldsToHide = new Set(parentControlledFields);
    } else {
      // Legacy behavior: look at what parent has set in *Defaults fields
      for (const key of Object.keys(parentFormData || {})) {
        const isDefaultsField = defaultsFieldSuffixes.some((suffix) =>
          key.startsWith(suffix + '_'),
        );
        if (isDefaultsField) {
          // Extract field name from itemDefaults_fieldName format
          const fieldName = key.split('_').slice(1).join('_');
          if (fieldName) fieldsToHide.add(fieldName);
        }
      }
    }

    if (fieldsToHide.size === 0) return schema;

    // Clone schema to avoid mutations
    const newSchema = {
      ...schema,
      fieldsets: schema.fieldsets
        .map((fieldset) => ({
          ...fieldset,
          fields: fieldset.fields.filter((f) => !fieldsToHide.has(f)),
        }))
        // Remove empty fieldsets (except 'default' which should always exist)
        .filter((fieldset) => fieldset.fields.length > 0 || fieldset.id === 'default'),
      properties: { ...schema.properties },
    };

    // Remove from properties
    for (const fieldName of fieldsToHide) {
      delete newSchema.properties[fieldName];
    }

    return newSchema;
  };
}

/**
 * Query result fields available for mapping in listing blocks.
 * These are the standard fields returned by @querystring-search.
 */
export const QUERY_RESULT_FIELDS = {
  '@id': { title: 'URL', type: 'string' },
  title: { title: 'Title', type: 'string' },
  description: { title: 'Description', type: 'string' },
  image: { title: 'Lead Image', type: 'image' },
  created: { title: 'Created', type: 'date' },
  effective: { title: 'Published', type: 'date' },
  Creator: { title: 'Author', type: 'string' },
  review_state: { title: 'State', type: 'string' },
};

/**
 * Compute smart default field mappings based on field types.
 *
 * Maps source fields to target fields by matching types:
 * - title → first link field (href/target for navigation)
 * - description → first textarea field
 * - image → first image field (object_browser with mode='image')
 * - @id → first link field (object_browser with mode='link')
 *
 * @param {Object} sourceFields - Source field definitions (e.g., QUERY_RESULT_FIELDS)
 * @param {Object} targetSchema - Target block schema with properties
 * @returns {Object} - Field mapping { sourceField: targetField, ... }
 */
export function computeSmartDefaults(sourceFields, targetSchema) {
  if (!targetSchema?.properties) return {};

  const mapping = {};
  const targetProps = targetSchema.properties;

  // Find first field of each type in target schema
  let firstLinkField = null;
  let firstImageField = null;
  let firstTextareaField = null;
  let firstStringField = null;

  for (const [fieldName, fieldDef] of Object.entries(targetProps)) {
    // Link field: object_browser with mode='link' or allowExternals
    if (
      !firstLinkField &&
      fieldDef.widget === 'object_browser' &&
      fieldDef.mode === 'link'
    ) {
      firstLinkField = fieldName;
    }

    // Image field: object_browser with mode='image' or widget='image'
    if (
      !firstImageField &&
      ((fieldDef.widget === 'object_browser' && fieldDef.mode === 'image') ||
        fieldDef.widget === 'image')
    ) {
      firstImageField = fieldName;
    }

    // Textarea field
    if (!firstTextareaField && fieldDef.widget === 'textarea') {
      firstTextareaField = fieldName;
    }

    // String field (no widget or basic string type)
    if (
      !firstStringField &&
      !fieldDef.widget &&
      fieldDef.type !== 'boolean' &&
      fieldDef.type !== 'integer'
    ) {
      firstStringField = fieldName;
    }
  }

  // Track which target fields have been used (no duplicates)
  const usedTargets = new Set();

  // Map source fields to best matching target fields by type
  // @id (URL) → link field
  if (sourceFields['@id'] && firstLinkField && !usedTargets.has(firstLinkField)) {
    mapping['@id'] = firstLinkField;
    usedTargets.add(firstLinkField);
  }

  // title → first string field (not link, not textarea)
  if (sourceFields.title && firstStringField && !usedTargets.has(firstStringField)) {
    mapping.title = firstStringField;
    usedTargets.add(firstStringField);
  }

  // description → textarea field
  if (sourceFields.description && firstTextareaField && !usedTargets.has(firstTextareaField)) {
    mapping.description = firstTextareaField;
    usedTargets.add(firstTextareaField);
  }

  // image → image field
  if (sourceFields.image && firstImageField && !usedTargets.has(firstImageField)) {
    mapping.image = firstImageField;
    usedTargets.add(firstImageField);
  }

  return mapping;
}

/**
 * Apply schema defaults to a block's data.
 *
 * This is used before sending FORM_DATA to the frontend to ensure
 * fields with schema defaults (like fieldMapping smart defaults) are
 * applied even when the schema changes mid-edit.
 *
 * Applies defaults when:
 * - The schema property has a `default` value AND either:
 *   - The current field value is undefined, null, or empty object
 *   - The current value has invalid options (for field_mapping widget)
 *
 * @param {Object} blockData - The block's current data
 * @param {Object} schema - The block's schema (with enhancers applied)
 * @returns {Object} - Block data with defaults applied (or original if no changes)
 */
export function applySchemaDefaultsToBlock(blockData, schema) {
  if (!schema?.properties || !blockData) return blockData;

  let modified = false;
  const newData = { ...blockData };

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    const currentValue = blockData[fieldName];

    // First: validate current value - clear if invalid
    if (currentValue !== undefined && currentValue !== null) {
      if (!isValidValue(currentValue, fieldDef)) {
        newData[fieldName] = null;
        modified = true;
      }
    }
  }

  // Second pass: apply defaults to empty/null fields
  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    if (fieldDef.default === undefined) continue;

    const currentValue = newData[fieldName];

    // Check if current value is "empty" (needs default)
    const needsDefault =
      currentValue === undefined ||
      currentValue === null ||
      (typeof currentValue === 'object' &&
        !Array.isArray(currentValue) &&
        Object.keys(currentValue).length === 0);

    if (needsDefault) {
      newData[fieldName] = fieldDef.default;
      modified = true;
    }
  }

  return modified ? newData : blockData;
}

/**
 * Check if a value is valid for a field definition.
 * Returns true if valid, false if invalid.
 */
function isValidValue(value, fieldDef) {
  // For choice fields: check if value is one of the allowed choices
  if (fieldDef.choices) {
    const validValues = new Set(
      fieldDef.choices.map((c) => (Array.isArray(c) ? c[0] : c.value ?? c.token ?? c)),
    );
    return validValues.has(value);
  }

  // For enum fields (JSON Schema style)
  if (fieldDef.enum) {
    return fieldDef.enum.includes(value);
  }

  // For allowedTypes (used by block_type widget)
  if (fieldDef.allowedTypes) {
    return fieldDef.allowedTypes.includes(value);
  }

  // For objects with propertyNames.enum - validate each property key
  if (fieldDef.propertyNames?.enum && typeof value === 'object' && value !== null) {
    const validKeys = new Set(fieldDef.propertyNames.enum);
    if (!Object.keys(value).every((k) => validKeys.has(k))) {
      return false;
    }
  }

  // For objects with additionalProperties.enum - validate each property value
  if (fieldDef.additionalProperties?.enum && typeof value === 'object' && value !== null) {
    const validValues = new Set(fieldDef.additionalProperties.enum);
    if (!Object.values(value).every((v) => !v || validValues.has(v))) {
      return false;
    }
  }

  // No validation constraints - value is valid
  return true;
}

/**
 * Apply schema defaults to all blocks in formData.
 *
 * Iterates over all blocks and applies schema defaults (including those
 * computed by schemaEnhancers like inheritSchemaFrom).
 *
 * @param {Object} formData - The full form data with blocks
 * @param {Object} blocksConfig - Block configuration from config.blocks.blocksConfig
 * @param {Object} intl - React Intl object for translations
 * @returns {Object} - FormData with defaults applied to blocks (or original if no changes)
 */
export function applySchemaDefaultsToFormData(formData, blockPathMap, blocksConfig, intl) {
  if (!blockPathMap) return formData;

  let result = formData;

  // Iterate over ALL blocks via blockPathMap (includes nested blocks)
  for (const blockId of Object.keys(blockPathMap)) {
    const blockData = getBlockById(result, blockPathMap, blockId);
    if (!blockData) continue;

    const blockType = blockData['@type'];
    if (!blockType) continue;

    const blockConfig = blocksConfig?.[blockType];
    if (!blockConfig) continue;

    // Get base schema
    let schema = null;
    if (typeof blockConfig.blockSchema === 'function') {
      schema = blockConfig.blockSchema({ formData: blockData, intl });
    } else if (blockConfig.blockSchema) {
      schema = blockConfig.blockSchema;
    } else if (typeof blockConfig.schema === 'function') {
      schema = blockConfig.schema({ formData: blockData, intl });
    } else if (blockConfig.schema) {
      schema = blockConfig.schema;
    }

    if (!schema) continue;

    // Apply schemaEnhancer if present (this sets the `default` values)
    if (blockConfig.schemaEnhancer) {
      schema = blockConfig.schemaEnhancer({
        formData: blockData,
        schema: { ...schema, properties: { ...schema.properties } },
        intl,
      });
    }

    // Apply defaults from enhanced schema
    const updatedBlock = applySchemaDefaultsToBlock(blockData, schema);
    if (updatedBlock !== blockData) {
      result = updateBlockById(result, blockPathMap, blockId, updatedBlock);
    }
  }

  return result;
}

/**
 * Create a schemaEnhancer function from a declarative recipe.
 *
 * New format (supports combining multiple enhancers):
 *   { inheritSchemaFrom: { typeField, defaultsField, mappingField? } }
 *   { hideParentOwnedFields: { defaultsField, editableFields?, parentControlledFields? } }
 *   { skiplogic: { fieldName: { field, is?, isNot?, gt?, gte?, lt?, lte?, isSet?, isNotSet? } } }
 *
 * Combined example:
 *   {
 *     inheritSchemaFrom: { typeField: 'variation', defaultsField: 'itemDefaults' },
 *     skiplogic: { advancedOptions: { field: 'mode', is: 'advanced' } },
 *   }
 *
 * Legacy format (still supported):
 *   { type: 'inheritSchemaFrom', config: { ... } }
 *
 * The returned function has a `config` property attached with the original config,
 * so parent blocks can read child's editableFields/parentControlledFields.
 *
 * @param {Object|Array} recipe - Recipe object or array of recipes
 * @returns {Function|null} - schemaEnhancer function or null if invalid
 */
export function createSchemaEnhancerFromRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;

  // Handle array of recipes - compose them
  if (Array.isArray(recipe)) {
    const enhancers = recipe.map((r) => createSchemaEnhancerFromRecipe(r)).filter(Boolean);
    if (enhancers.length === 0) return null;
    const composedFn = (args) =>
      enhancers.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
    composedFn.config = enhancers.reduce((acc, fn) => ({ ...acc, ...fn.config }), {});
    return composedFn;
  }

  // Legacy format: { type: 'x', config: {...} }
  if (recipe.type && recipe.config) {
    return createSingleEnhancerLegacy(recipe);
  }

  // New format: { inheritSchemaFrom: {...}, skiplogic: {...}, ... }
  const enhancerTypes = ['inheritSchemaFrom', 'hideParentOwnedFields', 'skiplogic'];
  const enhancers = [];
  let mergedConfig = {};

  for (const type of enhancerTypes) {
    if (recipe[type]) {
      const enhancer = createEnhancerByType(type, recipe[type]);
      if (enhancer) {
        enhancers.push(enhancer);
        if (enhancer.config) {
          mergedConfig = { ...mergedConfig, ...enhancer.config };
        }
      }
    }
  }

  if (enhancers.length === 0) return null;

  if (enhancers.length === 1) {
    return enhancers[0];
  }

  // Compose multiple enhancers
  const composedFn = (args) =>
    enhancers.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
  composedFn.config = mergedConfig;
  return composedFn;
}

/**
 * Create an enhancer by type name and config.
 * @private
 */
function createEnhancerByType(type, config) {
  let enhancer = null;

  switch (type) {
    case 'inheritSchemaFrom': {
      const { typeField, mappingField, defaultsField } = config;
      if (!typeField || !defaultsField) return null;
      enhancer = inheritSchemaFrom(typeField, mappingField || null, defaultsField);
      enhancer.config = config;
      break;
    }
    case 'hideParentOwnedFields': {
      const { defaultsField, editableFields, parentControlledFields } = config;
      if (!defaultsField) return null;
      enhancer = hideParentOwnedFields([defaultsField], { editableFields, parentControlledFields });
      enhancer.config = config;
      break;
    }
    case 'skiplogic': {
      enhancer = createSkiplogicEnhancer(config);
      break;
    }
    default:
      console.warn(`Unknown schemaEnhancer type: ${type}`);
      return null;
  }

  return enhancer;
}

/**
 * Create a skiplogic schemaEnhancer that conditionally hides fields.
 *
 * Config format: { fieldName: { field, is?, isNot?, gt?, gte?, lt?, lte?, isSet?, isNotSet? } }
 *
 * Field path syntax:
 *   - 'field' - current block's field
 *   - '../field' - parent block's field
 *   - '/field' - root formData field
 *
 * @private
 */
function createSkiplogicEnhancer(config) {
  const enhancer = (args) => {
    const { schema, formData } = args;
    if (!schema?.properties) return schema;

    const fieldsToHide = new Set();

    for (const [fieldName, condition] of Object.entries(config)) {
      if (!schema.properties[fieldName]) continue;

      const shouldShow = evaluateSkiplogicCondition(condition, formData, args);
      if (!shouldShow) {
        fieldsToHide.add(fieldName);
      }
    }

    if (fieldsToHide.size === 0) return schema;

    // Clone and filter schema
    const newSchema = {
      ...schema,
      fieldsets: schema.fieldsets
        ?.map((fieldset) => ({
          ...fieldset,
          fields: fieldset.fields?.filter((f) => !fieldsToHide.has(f)) || [],
        }))
        .filter((fieldset) => fieldset.fields.length > 0 || fieldset.id === 'default'),
      properties: { ...schema.properties },
      required: schema.required || [],
    };

    for (const fieldName of fieldsToHide) {
      delete newSchema.properties[fieldName];
    }

    return newSchema;
  };

  enhancer.config = { skiplogic: config };
  return enhancer;
}

/**
 * Evaluate a skiplogic condition against form data.
 * Returns true if field should be shown, false if hidden.
 * @private
 */
function evaluateSkiplogicCondition(condition, formData, args) {
  const { field: fieldPath, is, isNot, gt, gte, lt, lte, isSet, isNotSet } = condition;

  // Resolve field value based on path
  const value = resolveFieldPath(fieldPath, formData, args);

  // isSet / isNotSet operators
  if (isSet !== undefined) {
    const hasValue = value !== undefined && value !== null && value !== '';
    return isSet ? hasValue : !hasValue;
  }
  if (isNotSet !== undefined) {
    const hasValue = value !== undefined && value !== null && value !== '';
    return isNotSet ? !hasValue : hasValue;
  }

  // Equality operators
  if (is !== undefined) {
    return value === is;
  }
  if (isNot !== undefined) {
    return value !== isNot;
  }

  // Numeric comparison operators
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(numValue)) {
    if (gt !== undefined && !(numValue > gt)) return false;
    if (gte !== undefined && !(numValue >= gte)) return false;
    if (lt !== undefined && !(numValue < lt)) return false;
    if (lte !== undefined && !(numValue <= lte)) return false;
  }

  return true;
}

/**
 * Resolve a field path to its value.
 * Supports: 'field' (current), '../field' (parent), '/field' (root)
 * @private
 */
function resolveFieldPath(fieldPath, formData, args) {
  if (!fieldPath) return undefined;

  // Root path: /field
  if (fieldPath.startsWith('/')) {
    const rootField = fieldPath.slice(1);
    // args may have rootFormData for accessing page-level fields
    const rootData = args.rootFormData || formData;
    return rootData?.[rootField];
  }

  // Parent path: ../field
  if (fieldPath.startsWith('../')) {
    const parentField = fieldPath.slice(3);
    // Get parent data from hydra context
    const hydraContext = getHydraSchemaContext?.();
    if (hydraContext?.blockPathMap && hydraContext?.currentBlockId) {
      const pathInfo = hydraContext.blockPathMap[hydraContext.currentBlockId];
      if (pathInfo?.parentId) {
        // Nested block - get parent block data
        const parentBlock = getLiveBlockData?.(pathInfo.parentId);
        return parentBlock?.[parentField];
      } else {
        // Top-level block - parent is the page, use hydraContext.formData
        return hydraContext.formData?.[parentField];
      }
    }
    return undefined;
  }

  // Current block path: field
  return formData?.[fieldPath];
}

/**
 * Create a single schemaEnhancer from legacy recipe format.
 * Attaches config to the function for parent blocks to read.
 * @private
 */
function createSingleEnhancerLegacy(recipe) {
  if (!recipe || typeof recipe !== 'object' || !recipe.type) {
    return null;
  }

  return createEnhancerByType(recipe.type, recipe.config || {});
}

/**
 * Sync child blocks when parent's typeField changes.
 * Auto-derived from inheritSchemaFrom config - no extra config needed.
 *
 * If child has its own inheritSchemaFrom, changes its typeField instead of @type.
 * This handles nested containers (Grid → Listing → Items).
 *
 * @param {Object} formData - Current form data
 * @param {Object} blockPathMap - Map of blockId → path info
 * @param {string} blockId - Parent block ID that changed
 * @param {Object} oldBlockData - Previous parent block data
 * @param {Object} newBlockData - Updated parent block data
 * @param {Object} blocksConfig - Block configuration registry
 * @returns {Object} Updated formData with synced children
 */
export function syncChildBlockTypes(formData, blockPathMap, blockId, oldBlockData, newBlockData, blocksConfig) {
  const blockType = newBlockData['@type'];
  const blockConfig = blocksConfig?.[blockType];

  // Check if block has inheritSchemaFrom enhancer with typeField
  const enhancerConfig = blockConfig?.schemaEnhancer?.config;
  const typeField = enhancerConfig?.typeField;
  console.log('[syncChildBlockTypes] blockId:', blockId, 'blockType:', blockType, 'typeField:', typeField);
  if (!typeField) return formData;

  // Check if typeField value changed
  const oldType = oldBlockData?.[typeField];
  const newType = newBlockData[typeField];
  console.log('[syncChildBlockTypes] oldType:', oldType, 'newType:', newType);
  if (oldType === newType || !newType) return formData;

  // Get all child block IDs
  const childIds = getChildBlockIds(blockId, blockPathMap);
  console.log('[syncChildBlockTypes] childIds:', childIds);
  if (childIds.length === 0) return formData;

  // Transform each child
  let result = formData;
  for (const childId of childIds) {
    const childBlock = getBlockById(result, blockPathMap, childId);
    if (!childBlock) continue;

    const childType = childBlock['@type'];
    const childConfig = blocksConfig?.[childType];
    const childEnhancerConfig = childConfig?.schemaEnhancer?.config;
    const childTypeField = childEnhancerConfig?.typeField;

    if (childTypeField) {
      // Child has its own inheritSchemaFrom - change its typeField, not @type
      // This handles nested containers (e.g., Grid → Listing)
      if (childBlock[childTypeField] !== newType) {
        const updatedChild = { ...childBlock, [childTypeField]: newType };
        result = updateBlockById(result, blockPathMap, childId, updatedChild);
        // Recursive: sync this child's children too
        result = syncChildBlockTypes(result, blockPathMap, childId, childBlock, updatedChild, blocksConfig);
      }
    } else {
      // Child is a regular block - change its @type
      if (childType !== newType) {
        const updatedChild = { ...childBlock, '@type': newType };
        result = updateBlockById(result, blockPathMap, childId, updatedChild);
      }
    }
  }

  return result;
}
