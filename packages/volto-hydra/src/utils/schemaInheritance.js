/**
 * Schema Inheritance Utilities
 *
 * Helpers for blocks that reference other block types and inherit their schemas.
 * Used by listing blocks, grid blocks, and other containers that need to show
 * editable fields from a referenced block type.
 */
import config from '@plone/volto/registry';
import { getBlockSchema, getBlockById, updateBlockById, getChildBlockIds } from './blockPath';
import { getHydraSchemaContext, setHydraSchemaContext, getLiveBlockData } from '../context';

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
 * @param {Object} typeFieldOptions - Options for the typeField (optional)
 * @param {string} typeFieldOptions.title - Title for the typeField (default: 'Item Type')
 * @param {string} typeFieldOptions.filterConvertibleFrom - Only show types with fieldMappings[this]
 * @param {string[]} typeFieldOptions.allowedBlocks - Static list of allowed types
 * @param {string} typeFieldOptions.default - Default value for the typeField
 * @returns {Function} - A schemaEnhancer function
 *
 * @example
 * // In block config:
 * schemaEnhancer: inheritSchemaFrom('variation', 'fieldMapping', 'itemDefaults', {
 *   filterConvertibleFrom: 'default',
 *   title: 'Item Type',
 *   default: 'summaryItem',
 * })
 */
export function inheritSchemaFrom(typeField, mappingField, defaultsField, typeFieldOptions = {}) {
  return (args) => {
    let { formData, schema, intl } = args;
    const blocksConfig = config.blocks.blocksConfig;

    // Get context for computing choices
    const hydraContext = getHydraSchemaContext();
    const blockPathMap = hydraContext?.blockPathMap;
    const blockId = hydraContext?.currentBlockId;

    // Create or update typeField with computed choices
    const { filterConvertibleFrom, allowedBlocks, title, default: defaultValue } = typeFieldOptions;
    if (filterConvertibleFrom || allowedBlocks) {
      const choices = getBlockTypeChoices(
        { filterConvertibleFrom, allowedBlocks },
        blocksConfig,
        blockPathMap,
        blockId,
      );

      // Create or update the typeField
      schema = {
        ...schema,
        properties: {
          ...schema.properties,
          [typeField]: {
            ...(schema.properties?.[typeField] || {}),
            title: title || schema.properties?.[typeField]?.title || 'Item Type',
            choices,
            ...(defaultValue ? { default: defaultValue } : {}),
          },
        },
      };
    }

    // Use formData value, falling back to schema default for the typeField
    const referencedType = formData?.[typeField] ?? schema.properties?.[typeField]?.default;

    // Check if parent controls our type (parent has inheritSchemaFrom with typeField selected)
    // If so, hide our typeField and defaults fieldset since parent controls those

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
          // Use fieldMappings from child block's top-level config if available
          const childFieldMappings = blocksConfig[effectiveType]?.fieldMappings;
          effectiveMapping = computeSmartDefaults(
            newSchema.properties[mappingField].sourceFields,
            effectiveSchema,
            childFieldMappings,
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
        // Use fieldMappings from child block's top-level config if available
        const childFieldMappings = blocksConfig[referencedType]?.fieldMappings;
        effectiveMapping = computeSmartDefaults(
          schema.properties[mappingField].sourceFields,
          referencedSchema,
          childFieldMappings,
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

    // Check if typeField needs to be added to a fieldset
    const typeFieldHasChoices = schema.properties[typeField]?.choices?.length > 0;
    const typeFieldInFieldset = schema.fieldsets?.some(
      (fs) => fs.fields?.includes(typeField),
    );

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

    // Even without inherited fields, ensure typeField is visible if it has choices
    if (typeFieldHasChoices && !typeFieldInFieldset) {
      const referencedTitle =
        blocksConfig[referencedType]?.title || referencedType;

      return {
        ...schema,
        fieldsets: [
          ...(schema.fieldsets || []),
          {
            id: 'inherited_fields',
            title: `${referencedTitle} Defaults`,
            fields: [typeField],
          },
        ],
      };
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
 * // In schemaEnhancer config (preferred format):
 * schemaEnhancer: {
 *   childBlockConfig: {
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
 * If declaredMappings is provided (from block's top-level fieldMappings config),
 * those are used as the base. Otherwise, smart defaults are computed by matching
 * source field types to target field types:
 * - title → first link field (href/target for navigation)
 * - description → first textarea field
 * - image → first image field (object_browser with mode='image')
 * - @id → first link field (object_browser with mode='link')
 *
 * @param {Object} sourceFields - Source field definitions (e.g., QUERY_RESULT_FIELDS)
 * @param {Object} targetSchema - Target block schema with properties
 * @param {Object} declaredMappings - Optional declared mappings from block's fieldMappings config
 * @returns {Object} - Field mapping { sourceField: targetField, ... }
 */
export function computeSmartDefaults(sourceFields, targetSchema, declaredMappings) {
  if (!targetSchema?.properties) return {};

  // If declared mappings are provided, use them (merge default + any source-specific)
  if (declaredMappings?.default || declaredMappings) {
    // If declaredMappings has a 'default' key, it's the full fieldMappings object
    // Otherwise it's just the default mapping directly
    const mappings = declaredMappings.default || declaredMappings;
    // Only return mappings where the target field exists in the target schema
    const validMappings = {};
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (targetSchema.properties[targetField]) {
        validMappings[sourceField] = targetField;
      }
    }
    return validMappings;
  }

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
    const invalidValues = Object.entries(value).filter(([k, v]) => v && !validValues.has(v));
    if (invalidValues.length > 0) {
      console.log('[isValidValue] Invalid values found:', invalidValues, 'validValues:', [...validValues]);
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
      // schemaEnhancer can be a function or a recipe object
      let enhancer = blockConfig.schemaEnhancer;
      if (typeof enhancer !== 'function') {
        // It's a recipe object - create enhancer from it
        enhancer = createSchemaEnhancerFromRecipe(enhancer);
      }
      if (enhancer) {
        // Set context so schemaEnhancer can access currentBlockId and blockPathMap
        const restoreContext = setHydraSchemaContext({
          blockPathMap,
          currentBlockId: blockId,
          blocksConfig,
          formData: result,
        });
        try {
          schema = enhancer({
            formData: blockData,
            schema: { ...schema, properties: { ...schema.properties } },
            intl,
          });
        } finally {
          restoreContext();
        }
      }
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
 *   { inheritSchemaFrom: { typeField, defaultsField, mappingField?, filterConvertibleFrom?, allowedBlocks?, title?, default? } }
 *   { childBlockConfig: { defaultsField, editableFields?, parentControlledFields? } }
 *   { skiplogic: { fieldName: { field, is?, isNot?, gt?, gte?, lt?, lte?, isSet?, isNotSet? } } }
 *
 * Combined example:
 *   {
 *     inheritSchemaFrom: { typeField: 'variation', defaultsField: 'itemDefaults', filterConvertibleFrom: 'default' },
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

  // New format: { inheritSchemaFrom: {...}, skiplogic: {...}, childBlockConfig: {...}, ... }
  const enhancerTypes = ['inheritSchemaFrom', 'childBlockConfig', 'skiplogic'];
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
      const { typeField, mappingField, defaultsField, filterConvertibleFrom, allowedBlocks, title, default: defaultValue } = config;
      if (!typeField || !defaultsField) return null;
      // Pass typeFieldOptions if any type field config is provided
      const typeFieldOptions = (filterConvertibleFrom || allowedBlocks || title || defaultValue)
        ? { filterConvertibleFrom, allowedBlocks, title, default: defaultValue }
        : {};
      enhancer = inheritSchemaFrom(typeField, mappingField || null, defaultsField, typeFieldOptions);
      enhancer.config = config;
      break;
    }
    case 'childBlockConfig': {
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
 * Get valid block types for a type selection field.
 *
 * Used by inheritSchemaFrom to compute choices for the typeField.
 * Logic:
 * 1. Start with allowedBlocks (if provided) or parent's allowedSiblingTypes
 * 2. Fall back to all non-restricted blocks (or all if filtering)
 * 3. Filter by filterConvertibleFrom (types with fieldMappings[source])
 *
 * @param {Object} options - Configuration options
 * @param {string[]} options.allowedBlocks - Static list of allowed types
 * @param {string} options.filterConvertibleFrom - Source type to filter by (e.g., 'default')
 * @param {Object} blocksConfig - Block configuration registry
 * @param {Object} blockPathMap - Block path map (optional, for allowedSiblingTypes)
 * @param {string} blockId - Current block ID (optional, for allowedSiblingTypes)
 * @returns {Array} - Array of [value, label] tuples for choices
 */
export function getBlockTypeChoices(options, blocksConfig, blockPathMap, blockId) {
  if (!blocksConfig) return [];

  const { allowedBlocks, filterConvertibleFrom } = options || {};

  // Determine base types in order of precedence
  let types = allowedBlocks;

  // Try parent's allowedSiblingTypes from pathMap
  if (!types && blockPathMap && blockId) {
    const pathInfo = blockPathMap[blockId];
    if (pathInfo?.allowedSiblingTypes) {
      types = pathInfo.allowedSiblingTypes;
    }
  }

  // Fall back to all non-restricted blocks (or all if filtering)
  if (!types) {
    types = Object.keys(blocksConfig).filter(
      (type) => blocksConfig[type] && (filterConvertibleFrom || !blocksConfig[type].restricted),
    );
  }

  // Filter by filterConvertibleFrom (types with fieldMappings[source])
  if (filterConvertibleFrom) {
    types = types.filter((type) => {
      const blockConfig = blocksConfig[type];
      return blockConfig?.fieldMappings?.[filterConvertibleFrom];
    });
  }

  // Return as choices array [[value, label], ...]
  return types
    .filter((type) => blocksConfig[type])
    .map((type) => [type, blocksConfig[type]?.title || type]);
}

/**
 * Get block types that the given source type can be converted to.
 *
 * Scans all blocks to find ones that have fieldMappings defined for the source type
 * or have a default mapping. Returns an array of convertible block types.
 *
 * @param {string} sourceType - The current block's @type
 * @param {Object} blocksConfig - Block configuration registry
 * @returns {Array} - Array of { type, title } objects for convertible types
 */
export function getConvertibleTypes(sourceType, blocksConfig) {
  if (!sourceType || !blocksConfig) return [];

  // Source block must have fieldMappings defined to be convertible
  const sourceConfig = blocksConfig[sourceType];
  if (!sourceConfig?.fieldMappings) return [];

  // Find all types reachable from source (direct + transitive)
  // Use BFS to find all reachable types through the conversion graph
  const reachable = new Set();
  const queue = [sourceType];
  const visited = new Set([sourceType]);

  while (queue.length > 0) {
    const currentType = queue.shift();

    for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
      if (visited.has(blockType)) continue;
      const fieldMappings = blockConfig.fieldMappings;
      // Can convert to this type if it has mapping for current type OR default
      if (fieldMappings?.[currentType] || fieldMappings?.default) {
        reachable.add(blockType);
        visited.add(blockType);
        // Only continue BFS if this type also has fieldMappings (can be a stepping stone)
        if (blockConfig.fieldMappings) {
          queue.push(blockType);
        }
      }
    }
  }

  // Convert to array of { type, title }
  return Array.from(reachable).map(blockType => ({
    type: blockType,
    title: blocksConfig[blockType]?.title || blockType,
  }));
}

/**
 * Find the conversion path from source to target type.
 * Returns array of types representing the path, or null if no path exists.
 * Prefers direct mappings over default mappings.
 */
function findConversionPath(sourceType, targetType, blocksConfig) {
  if (sourceType === targetType) return [sourceType];

  // BFS to find path, prioritizing direct mappings over default
  const queue = [[sourceType]];
  const visited = new Set([sourceType]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentType = path[path.length - 1];

    // Separate into direct and default targets, process direct first
    const directTargets = [];
    const defaultTargets = [];

    for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
      if (visited.has(blockType)) continue;
      const fieldMappings = blockConfig.fieldMappings;
      if (fieldMappings?.[currentType]) {
        directTargets.push(blockType);
      } else if (fieldMappings?.default) {
        defaultTargets.push(blockType);
      }
    }

    // Process direct mappings first (higher priority)
    for (const blockType of [...directTargets, ...defaultTargets]) {
      if (visited.has(blockType)) continue;
      visited.add(blockType);

      const newPath = [...path, blockType];
      if (blockType === targetType) {
        return newPath;
      }
      // Only continue if this type has fieldMappings (can be stepping stone)
      if (blocksConfig[blockType]?.fieldMappings) {
        queue.push(newPath);
      }
    }
  }
  return null;
}

/**
 * Invert a field mapping (swap keys and values).
 * Used to extract data FROM a block using its default mapping.
 */
function invertMapping(mapping) {
  if (!mapping) return {};
  const inverted = {};
  for (const [sourceField, targetField] of Object.entries(mapping)) {
    inverted[targetField] = sourceField;
  }
  return inverted;
}

/**
 * Convert a block from one type to another using fieldMappings.
 *
 * Supports transitive conversions - if Image→Teaser and Teaser→Hero exist,
 * Image can convert to Hero by applying mappings through the path.
 *
 * For each conversion step:
 * 1. Use source's inverted default mapping to normalize to canonical fields
 * 2. Use target's mapping (source-specific or default) to map to target fields
 *
 * @param {Object} blockData - The source block's data
 * @param {string} newType - The target block type
 * @param {Object} blocksConfig - Block configuration registry
 * @returns {Object} - New block data with @type set to newType and fields mapped
 */
export function convertBlockType(blockData, newType, blocksConfig) {
  const sourceType = blockData['@type'];

  // Find the conversion path
  const path = findConversionPath(sourceType, newType, blocksConfig);
  if (!path || path.length < 2) {
    // No path found, just set the type (shouldn't happen if getConvertibleTypes was used)
    return { '@type': newType };
  }

  // Apply mappings through each step in the path
  let currentData = { ...blockData };
  for (let i = 1; i < path.length; i++) {
    const fromType = path[i - 1];
    const toType = path[i];
    const sourceConfig = blocksConfig?.[fromType];
    const targetConfig = blocksConfig?.[toType];

    // Step 1: Normalize source data to canonical fields using inverted default mapping
    // This extracts data FROM the source block
    const sourceInvertedDefault = invertMapping(sourceConfig?.fieldMappings?.default);
    let canonicalData = {};
    for (const [blockField, canonicalField] of Object.entries(sourceInvertedDefault)) {
      if (currentData[blockField] !== undefined) {
        canonicalData[canonicalField] = currentData[blockField];
      }
    }
    // Also keep original fields for direct mappings
    canonicalData = { ...currentData, ...canonicalData };

    // Step 2: Map canonical/source fields to target using target's mappings
    const targetMappings = targetConfig?.fieldMappings;
    const newData = { '@type': toType };
    // Apply mappings: source-specific first, then default as fallback
    const mappings = { ...targetMappings?.default, ...targetMappings?.[fromType] };
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (canonicalData[sourceField] !== undefined) {
        newData[targetField] = canonicalData[sourceField];
      }
    }
    currentData = newData;
  }

  // Preserve unmapped fields from the original block that aren't in the final result
  // This enables roundtrip conversion (hero → image → hero) to retain fields like buttonText
  // that exist in source and target but aren't explicitly mapped through intermediate types
  const { '@type': _originalType, ...originalFields } = blockData;
  const { '@type': finalType, ...convertedFields } = currentData;

  // Merge: original fields as base, converted fields take priority
  return {
    ...originalFields,
    ...convertedFields,
    '@type': finalType,
  };
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

  let result = formData;

  // Reset fieldMapping to the new type's default when variation changes
  // The new type's fieldMappings.default provides the correct source→target mapping
  const newTypeConfig = blocksConfig?.[newType];
  const defaultFieldMapping = newTypeConfig?.fieldMappings?.default;
  if (defaultFieldMapping) {
    // Get the current block with the new variation and reset its fieldMapping
    const currentBlock = getBlockById(result, blockPathMap, blockId);
    if (currentBlock) {
      console.log('[syncChildBlockTypes] Resetting fieldMapping from', currentBlock.fieldMapping, 'to', defaultFieldMapping);
      const updatedBlock = { ...currentBlock, fieldMapping: defaultFieldMapping };
      result = updateBlockById(result, blockPathMap, blockId, updatedBlock);
    }
  }

  // Get all child block IDs
  const childIds = getChildBlockIds(blockId, blockPathMap);
  console.log('[syncChildBlockTypes] childIds:', childIds);
  if (childIds.length === 0) return result;

  // Transform each child
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
      // Child is a regular block - convert its type using fieldMappings
      if (childType !== newType) {
        const updatedChild = convertBlockType(childBlock, newType, blocksConfig);
        result = updateBlockById(result, blockPathMap, childId, updatedChild);
      }
    }
  }

  return result;
}
