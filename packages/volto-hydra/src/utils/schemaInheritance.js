/**
 * Schema Inheritance Utilities
 *
 * Helpers for blocks that reference other block types and inherit their schemas.
 * Used by listing blocks, grid blocks, and other containers that need to show
 * editable fields from a referenced block type.
 */
import config from '@plone/volto/registry';
import { getBlockSchema, getBlockById, updateBlockById } from './blockPath';

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
  return ({ formData, schema, intl }) => {
    const referencedType = formData?.[typeField];
    if (!referencedType) return schema;

    const blocksConfig = config.blocks.blocksConfig;
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

    // Get non-mapped fields from referenced type
    // Use underscore separator for flat keys (Volto forms don't handle nested paths)
    const inheritedFields = Object.entries(referencedSchema.properties)
      .filter(([fieldName]) => !mappedFields.has(fieldName))
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
 * When a parent container defines defaults for a field, that field should not appear
 * in the child's sidebar (it's "owned" by the parent).
 *
 * @param {string[]} defaultsFieldSuffixes - Suffixes to look for (e.g., ['Defaults'])
 * @returns {Function} - A schemaEnhancer function
 *
 * @example
 * // In child block config:
 * schemaEnhancer: hideParentOwnedFields(['Defaults'])
 */
export function hideParentOwnedFields(defaultsFieldSuffixes = ['Defaults']) {
  return ({ schema, blockPathMap, blockId, parentFormData }) => {
    if (!parentFormData || !blockPathMap) return schema;

    const pathInfo = blockPathMap?.[blockId];
    if (!pathInfo?.parentId) return schema;

    // Collect fields that are owned by parent (from *Defaults fields)
    const parentOwnedFields = new Set();

    for (const [key, value] of Object.entries(parentFormData)) {
      const isDefaultsField = defaultsFieldSuffixes.some((suffix) =>
        key.endsWith(suffix),
      );
      if (isDefaultsField && typeof value === 'object' && value !== null) {
        Object.keys(value).forEach((f) => parentOwnedFields.add(f));
      }
    }

    if (parentOwnedFields.size === 0) return schema;

    // Clone schema to avoid mutations
    const newSchema = {
      ...schema,
      fieldsets: schema.fieldsets.map((fieldset) => ({
        ...fieldset,
        fields: fieldset.fields.filter((f) => !parentOwnedFields.has(f)),
      })),
      properties: { ...schema.properties },
    };

    // Remove from properties
    for (const fieldName of parentOwnedFields) {
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
  for (const [blockId, pathInfo] of Object.entries(blockPathMap)) {
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
