/**
 * Schema Inheritance Utilities
 *
 * Helpers for blocks that reference other block types and inherit their schemas.
 * Used by listing blocks, grid blocks, and other containers that need to show
 * editable fields from a referenced block type.
 */
import config from '@plone/volto/registry';
import { getBlockTypeSchema, getBlockById, updateBlockById, getChildBlockIds } from './blockPath';
import { PAGE_BLOCK_UID, convertFieldValue } from '@volto-hydra/hydra-js';
import { getHydraSchemaContext, setHydraSchemaContext, getLiveBlockData } from '../context';

// Re-export getBlockTypeSchema from blockPath for convenience
export { getBlockTypeSchema };

/**
 * Generate a unique placeholder name based on block type.
 * Format: "blocktype-N" where N is the next available number.
 */
function generatePlaceholder(blockType, allBlocks) {
  const baseType = blockType || 'block';
  const existingNames = new Set();

  for (const block of Object.values(allBlocks || {})) {
    if (block?.placeholder) existingNames.add(block.placeholder);
  }

  let counter = 1;
  while (existingNames.has(`${baseType}-${counter}`)) {
    counter++;
  }

  return `${baseType}-${counter}`;
}

/**
 * Check if a position is inside a template by looking at neighbor blocks.
 * Returns { templateId, templateInstanceId, placeholder } if inside a template, undefined otherwise.
 * The placeholder is inherited from adjacent non-fixed placeholder blocks.
 *
 * Template membership is determined by the TARGET block of the insertion:
 * - "insert after X" → inherit from X (the block we're inserting after)
 * - "insert before Y" → inherit from Y (the block we're inserting before)
 * This ensures that inserting after a non-template block stays outside the template,
 * even if the next block is a template block.
 */
/**
 * Resolve a neighbor's block data from the container.
 * Supports both blocks_layout (layoutItems + allBlocks map) and object_list (items array).
 */
function getNeighborData(index, context) {
  const { layoutItems, allBlocks, items } = context;
  if (items) {
    // object_list: items is an array of objects
    return (index >= 0 && index < items.length) ? items[index] : null;
  }
  // blocks_layout: layoutItems is array of IDs, allBlocks is the map
  const neighborId = (index >= 0 && index < layoutItems.length) ? layoutItems[index] : null;
  return neighborId ? allBlocks[neighborId] : null;
}

function getTemplateInfoFromNeighbors(context) {
  const { position, layoutItems, allBlocks, insertAfter, containerId, field, items } = context;
  const containerLength = items ? items.length : layoutItems?.length || 0;

  if (containerLength === 0) {
    // Empty container — check if parent container has childPlaceholders for this field.
    // This handles the case where all blocks in a placeholder region inside a container
    // have been deleted, leaving the container field empty.
    if (containerId && field && allBlocks) {
      const parentBlock = allBlocks?.[containerId];
      if (parentBlock?.templateId && parentBlock?.childPlaceholders?.[field]) {
        return {
          templateId: parentBlock.templateId,
          templateInstanceId: parentBlock.templateInstanceId,
          placeholder: parentBlock.childPlaceholders[field],
          fixed: true,
          readOnly: true,
        };
      }
    }
    return undefined;
  }

  // Determine the primary neighbor based on insertion direction
  // insertAfter=true: we're inserting AFTER the block at position-1, so inherit from it
  // insertAfter=false: we're inserting BEFORE the block at position, so inherit from it
  const prevNeighbor = getNeighborData(position - 1, context);
  const nextNeighbor = getNeighborData(position, context);

  // The "target" block determines template membership
  const primaryNeighbor = insertAfter ? prevNeighbor : nextNeighbor;

  // If the primary neighbor (target of insertion) is not in a template, stay outside
  if (!primaryNeighbor?.templateId) {
    return undefined;
  }

  // Primary neighbor is in a template - inherit template info
  const templateInfo = {
    templateId: primaryNeighbor.templateId,
    templateInstanceId: primaryNeighbor.templateInstanceId,
    fixed: primaryNeighbor.fixed || false,
    readOnly: primaryNeighbor.readOnly || false,
  };

  // Inherit placeholder from the primary neighbor if it's not fixed
  // For placeholder inheritance, also check the secondary neighbor
  let inheritedPlaceholder = null;
  const secondaryNeighbor = insertAfter ? nextNeighbor : prevNeighbor;

  for (const neighbor of [primaryNeighbor, secondaryNeighbor].filter(Boolean)) {
    if (neighbor?.templateId === templateInfo.templateId) {
      // Same template - can inherit placeholder
      if (!neighbor.fixed && neighbor.placeholder && !inheritedPlaceholder) {
        inheritedPlaceholder = neighbor.placeholder;
      }
      // Fixed blocks with nextPlaceholder indicate an adjacent placeholder region.
      // This preserves placeholder info even when all placeholder blocks are deleted.
      if (neighbor.fixed && neighbor.nextPlaceholder && !inheritedPlaceholder) {
        inheritedPlaceholder = neighbor.nextPlaceholder;
      }
    }
  }

  return {
    ...templateInfo,
    placeholder: inheritedPlaceholder,
  };
}

/**
 * Apply block defaults with extended context for dynamic defaults.
 * This is used when adding/moving blocks to pass position context
 * that schemaEnhancers and function defaults can use.
 *
 * Also handles template field inheritance: if adding a block inside
 * a template (adjacent to blocks with templateId), inherits
 * the template fields with a generated placeholder name.
 *
 * @param {Object} blockData - The new block's data (with @type)
 * @param {Object} context - Extended context for defaults
 * @param {string} context.containerId - Parent container ID ('page' or block ID)
 * @param {string} context.field - Container field name ('blocks_layout', 'items', etc.)
 * @param {number} context.position - Index where block is being inserted
 * @param {Object} context.allBlocks - All blocks in the form (formData.blocks)
 * @param {Object} context.blockPathMap - Block path map
 * @param {Object} context.blocksConfig - Blocks configuration
 * @param {Object} context.intl - Intl object
 * @returns {Object} - Block data with defaults applied
 */
export function applyBlockDefaultsWithContext(blockData, context) {
  const { blocksConfig, intl, allBlocks } = context;
  const blockType = blockData?.['@type'];
  if (!blockType || !blocksConfig) return blockData;

  const blockConfig = blocksConfig[blockType];

  // Get base schema
  let schema = null;
  if (blockConfig) {
    if (typeof blockConfig.blockSchema === 'function') {
      schema = blockConfig.blockSchema({ formData: blockData, intl });
    } else if (blockConfig.blockSchema) {
      schema = blockConfig.blockSchema;
    }
  }

  // Ensure schema with properties exists
  schema = schema
    ? { ...schema, properties: { ...schema.properties } }
    : { properties: {} };

  // Compute derived template fields based on neighbors using choices pattern
  // These are calculated fields - values are always determined by position
  const neighborTemplateInfo = getTemplateInfoFromNeighbors(context);
  if (neighborTemplateInfo) {
    // Inside a template - derive the template fields
    const derivedTemplateId = neighborTemplateInfo.templateId;
    const derivedInstanceId = neighborTemplateInfo.templateInstanceId;
    // Priority: keep existing placeholder > inherit from neighbors > generate new
    const derivedPlaceholder = blockData.placeholder || neighborTemplateInfo.placeholder || generatePlaceholder(blockType, allBlocks);

    schema.properties.templateId = {
      choices: [derivedTemplateId],
      default: derivedTemplateId,
    };
    schema.properties.templateInstanceId = {
      choices: [derivedInstanceId],
      default: derivedInstanceId,
    };
    schema.properties.placeholder = {
      choices: [derivedPlaceholder],
      default: derivedPlaceholder,
    };
    schema.properties.fixed = {
      default: neighborTemplateInfo.fixed,
    };
    schema.properties.readOnly = {
      default: neighborTemplateInfo.readOnly,
    };
  } else {
    // Outside a template - values should be undefined
    schema.properties.templateId = {
      choices: [undefined],
      default: undefined,
    };
    schema.properties.templateInstanceId = {
      choices: [undefined],
      default: undefined,
    };
    schema.properties.placeholder = {
      choices: [undefined],
      default: undefined,
    };
  }

  // Apply block-specific schemaEnhancer with extended context
  if (blockConfig?.schemaEnhancer) {
    let enhancer = blockConfig.schemaEnhancer;
    if (typeof enhancer === 'function') {
      schema = enhancer({
        schema,
        formData: blockData,
        intl,
        // Extended context for dynamic values
        containerId: context.containerId,
        field: context.field,
        position: context.position,
        layoutItems: context.layoutItems,
        allBlocks: context.allBlocks,
        blockPathMap: context.blockPathMap,
      });
    }
  }

  // Apply defaults with context (supports function defaults)
  return applySchemaDefaultsToBlockWithContext(blockData, schema, context);
}

/**
 * Creates a schemaEnhancer that inherits fields from a referenced block type.
 *
 * Use this for blocks that reference another block type (e.g., listing → teaser).
 * The referenced type's schema fields are added to the parent's sidebar,
 * minus any fields that are mapped to external data.
 *
 * @param {string|null} typeField - Field name containing the block type, or null to read from
 *                                  blocksConfig[blockType].itemTypeField at call time
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
 * config.blocks.blocksConfig.listing = {
 *   itemTypeField: 'variation',
 *   schemaEnhancer: { inheritSchemaFrom: { mappingField: 'fieldMapping' } },
 * };
 */
export function inheritSchemaFrom(typeField, mappingField, defaultsField, typeFieldOptions = {}) {
  return (args) => {
    let { formData, schema, intl } = args;

    const blocksConfig = config.blocks.blocksConfig;

    // Read typeField from block-level config if not provided directly
    if (!typeField) {
      typeField = blocksConfig[formData?.['@type']]?.itemTypeField;
      if (!typeField) return schema;
    }

    // Get context for computing choices
    const hydraContext = getHydraSchemaContext();
    const blockPathMap = hydraContext?.blockPathMap;
    const blockId = hydraContext?.currentBlockId;

    // Create or update typeField with computed choices
    const { filterConvertibleFrom, allowedBlocks, blocksField, title, default: defaultValue } = typeFieldOptions;
    if (filterConvertibleFrom || allowedBlocks || blocksField) {
      const choices = getBlockTypeChoices(
        { filterConvertibleFrom, allowedBlocks, blocksField },
        blocksConfig,
        blockPathMap,
        blockId,
        formData,  // Pass formData for blocksField lookup
        intl,
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
          const parentTypeField = parentConfig?.itemTypeField;
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
      const parentTypeField = parentConfig?.itemTypeField;
      const parentSelectedType = parentBlock?.[parentTypeField];

      // Use parent's selected type for computing fieldMapping
      const effectiveType = parentSelectedType || referencedType;
      const effectiveSchema = effectiveType ? getBlockTypeSchema(effectiveType, intl, blocksConfig) : null;

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
          (mapping) => {
            const target = getMappingTarget(mapping);
            return target && !new Set(validTargetFields).has(target);
          },
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
    const referencedSchema = getBlockTypeSchema(referencedType, intl, blocksConfig);
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
      mappingField ? Object.values(effectiveMapping).map(getMappingTarget) : [],
    );

    // Resolve which fields belong to the child (shared logic with hideParentOwnedFields)
    const childConfig = blocksConfig[referencedType];
    const childOwnFields = resolveChildOwnFields(childConfig);
    const parentControlledFields = childConfig?.schemaEnhancer?.config?.parentControlledFields;

    // Get non-mapped fields from referenced type, filtered by field control settings
    // Use underscore separator for flat keys (Volto forms don't handle nested paths)
    const inheritedFields = Object.entries(referencedSchema.properties)
      .filter(([fieldName]) => {
        // Skip the typeField itself - it's on the parent, not inherited
        if (fieldName === typeField) return false;

        // Skip mapped fields
        if (mappedFields.has(fieldName)) return false;

        // If parentControlledFields defined: only inherit those specific fields
        if (parentControlledFields) {
          return parentControlledFields.includes(fieldName);
        }
        // If child's own fields resolved: inherit everything NOT in that set
        if (childOwnFields) {
          return !childOwnFields.has(fieldName);
        }
        // Default: inherit all non-mapped fields
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
      if (schema.properties[typeField] && !typeFieldInFieldset) {
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
 * - editableFields: allowlist of fields that stay on child (everything else hidden)
 * - parentControlledFields: blocklist of fields that go to parent (only these hidden)
 *
 * @param {Object} options - Configuration options
 * @param {string[]} options.editableFields - Allowlist of fields to keep on child
 * @param {string[]} options.parentControlledFields - Blocklist of fields to hide from child
 * @returns {Function} - A schemaEnhancer function
 *
 * @example
 * // In schemaEnhancer config (preferred format):
 * schemaEnhancer: {
 *   childBlockConfig: {
 *     editableFields: ['href', 'title', 'description']
 *   }
 * }
 */
export function hideParentOwnedFields({ editableFields, parentControlledFields } = {}) {

  return (args) => {
    const { schema, blockPathMap: passedBlockPathMap, blockId: passedBlockId } = args;

    // Only use context values when called for a specific block instance.
    // When called for TYPE inspection (getBlockSchema without blockId), passedBlockId is undefined
    // and we should NOT filter - that would incorrectly hide fields from the type schema.
    const hydraContext = getHydraSchemaContext();
    const blockPathMap = passedBlockPathMap || (passedBlockId !== undefined ? hydraContext?.blockPathMap : null);
    const blockId = passedBlockId ?? (passedBlockPathMap ? hydraContext?.currentBlockId : null);
    const blocksConfig = hydraContext?.blocksConfig;

    if (!blockPathMap || !blockId) return schema;

    const pathInfo = blockPathMap?.[blockId];
    // Skip field hiding for top-level blocks (no parent or page is parent)
    if (!pathInfo?.parentId || pathInfo.parentId === PAGE_BLOCK_UID) return schema;

    // Only filter fields if parent uses schema inheritance (has typeField configured)
    // AND has a type selected. Otherwise children keep all their fields.
    if (blocksConfig) {
      const parentBlock = getLiveBlockData(pathInfo.parentId);
      if (parentBlock) {
        const parentConfig = blocksConfig[parentBlock['@type']];
        const typeField = parentConfig?.itemTypeField;
        // If parent doesn't use schema inheritance (no typeField), or no type selected,
        // don't filter child fields - they're independent blocks
        if (!typeField || !parentBlock[typeField]) {
          return schema;
        }
      }
    }

    // Determine which fields to hide using the shared child/parent split logic
    let fieldsToHide = new Set();

    if (editableFields) {
      // Explicit param overrides config (backward compat for direct callers)
      for (const fieldName of Object.keys(schema.properties || {})) {
        if (!editableFields.includes(fieldName)) {
          fieldsToHide.add(fieldName);
        }
      }
    } else if (parentControlledFields) {
      // Blocklist mode: hide only parentControlledFields
      fieldsToHide = new Set(parentControlledFields);
    } else if (blocksConfig) {
      // Resolve from child config (editableFields → fieldMappings['@default'])
      const childBlock = getLiveBlockData(blockId);
      const childType = childBlock?.['@type'];
      let childOwnFields = childType ? resolveChildOwnFields(blocksConfig[childType]) : null;

      // Last resort: parent's runtime fieldMapping widget targets
      if (!childOwnFields) {
        const parentBlock = getLiveBlockData(pathInfo.parentId);
        if (parentBlock) {
          const parentConfig = blocksConfig[parentBlock['@type']];
          const mappingField = parentConfig?.schemaEnhancer?.config?.mappingField;
          const fieldMapping = mappingField ? parentBlock[mappingField] : null;
          if (fieldMapping && Object.keys(fieldMapping).length > 0) {
            childOwnFields = new Set(
              Object.values(fieldMapping).map(getMappingTarget).filter(Boolean)
            );
          }
        }
      }

      if (childOwnFields) {
        for (const fieldName of Object.keys(schema.properties || {})) {
          if (!childOwnFields.has(fieldName)) {
            fieldsToHide.add(fieldName);
          }
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
 * @returns {Object} - Field mapping { sourceField: targetField | { field, type }, ... }
 */

/**
 * Determine the hydra type of a field from its schema definition.
 * Returns 'link', 'image', or the JSON Schema type (string, number, etc.)
 */
export function getFieldType(fieldDef) {
  if (!fieldDef) return 'string';
  if (fieldDef.widget === 'object_browser' && fieldDef.mode === 'link') return 'link';
  if (fieldDef.widget === 'object_browser' && fieldDef.mode === 'image') return 'image';
  if (fieldDef.widget === 'image') return 'image';
  return fieldDef.type || 'string';
}

/**
 * Extract the target field name from a fieldMapping value.
 * Handles both legacy string format and new { field, type } format.
 */
export function getMappingTarget(mapping) {
  return typeof mapping === 'string' ? mapping : mapping?.field;
}

/**
 * Get the set of target field names from a block config's fieldMappings['@default'].
 * These are the fields the child block uses to receive mapped data (i.e., child-editable fields).
 * Returns a Set of field names, or null if no @default mapping exists.
 */
export function getDefaultMappingTargets(blockConfig) {
  const defaultMapping = blockConfig?.fieldMappings?.['@default'];
  if (!defaultMapping || Object.keys(defaultMapping).length === 0) return null;
  return new Set(Object.values(defaultMapping).map(getMappingTarget).filter(Boolean));
}

/**
 * Resolve which fields belong to the child block (child-editable).
 * Used by both inheritSchemaFrom (to skip child fields) and hideParentOwnedFields
 * (to hide non-child fields) so the split is determined in one place.
 *
 * Fallback chain:
 *   1. Explicit editableFields from childBlockConfig recipe
 *   2. Child type's fieldMappings['@default'] targets
 *
 * Returns a Set of child-owned field names, or null if undetermined.
 */
export function resolveChildOwnFields(childBlockConfig) {
  const enhancerConfig = childBlockConfig?.schemaEnhancer?.config;
  if (enhancerConfig?.editableFields) return new Set(enhancerConfig.editableFields);
  return getDefaultMappingTargets(childBlockConfig);
}

export function computeSmartDefaults(sourceFields, targetSchema, declaredMappings) {
  if (!targetSchema?.properties) return {};

  // If declared mappings are provided, use them (merge @default + any source-specific)
  if (declaredMappings?.['@default'] || declaredMappings) {
    // If declaredMappings has a '@default' key, it's the full fieldMappings object
    // Otherwise it's just the default mapping directly
    const mappings = declaredMappings['@default'] || declaredMappings;
    // Only return mappings where the target field exists in the target schema
    // Normalize to { field, type } format with type from target schema
    const validMappings = {};
    for (const [sourceField, mapping] of Object.entries(mappings)) {
      const targetField = typeof mapping === 'string' ? mapping : mapping?.field;
      if (targetField && targetSchema.properties[targetField]) {
        const fieldType = getFieldType(targetSchema.properties[targetField]);
        // Use object format for special types, plain string for simple string fields
        if (fieldType === 'link' || fieldType === 'image') {
          validMappings[sourceField] = { field: targetField, type: fieldType };
        } else {
          validMappings[sourceField] = targetField;
        }
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
  // @id (URL) → link field (with type: 'link' for conversion)
  if (sourceFields['@id'] && firstLinkField && !usedTargets.has(firstLinkField)) {
    mapping['@id'] = { field: firstLinkField, type: 'link' };
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

  // image → image field (with type: 'image' for conversion)
  if (sourceFields.image && firstImageField && !usedTargets.has(firstImageField)) {
    mapping.image = { field: firstImageField, type: 'image' };
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
 * Apply schema defaults to a block, with support for function defaults.
 * Function defaults receive context: { containerId, field, position, allBlocks, blockPathMap }
 *
 * @param {Object} blockData - The block's current data
 * @param {Object} schema - The block's schema (with enhancers applied)
 * @param {Object} context - Context for function defaults { containerId, field, position, allBlocks, blockPathMap }
 * @returns {Object} - Block data with defaults applied (or original if no changes)
 */
export function applySchemaDefaultsToBlockWithContext(blockData, schema, context = {}) {
  if (!schema?.properties || !blockData) return blockData;

  let modified = false;
  const newData = { ...blockData };

  // First: validate current value - clear if invalid
  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    const currentValue = blockData[fieldName];
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
      // Support function defaults - call with context
      const defaultValue = typeof fieldDef.default === 'function'
        ? fieldDef.default(context)
        : fieldDef.default;

      // Only set if function returned a value (undefined means "no default")
      if (defaultValue !== undefined) {
        newData[fieldName] = defaultValue;
        modified = true;
      }
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
      fieldDef.choices.map((c) => {
        if (c === undefined || c === null) return c;
        if (Array.isArray(c)) return c[0];
        return c.value ?? c.token ?? c;
      }),
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

    // Use blockPathMap for type lookup (single source of truth)
    // Don't use blockData['@type'] as object_list items don't store @type
    const blockType = blockPathMap[blockId]?.blockType;
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
 *   { fieldRules: { fieldName: false | { set, when?, else? } | [rule, ...] } }
 *
 * Combined example:
 *   {
 *     inheritSchemaFrom: { typeField: 'variation', defaultsField: 'itemDefaults', filterConvertibleFrom: '@default' },
 *     fieldRules: { advancedOptions: { when: { mode: 'advanced' }, else: false } },
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
/**
 * @param {Object} recipe - Declarative recipe from frontend
 * @param {Function} [existingEnhancer] - Admin-side enhancer already registered for this block.
 *   If its .config.enhancerType matches a recipe type (e.g., both are 'inheritSchemaFrom'),
 *   that recipe type is skipped (the admin enhancer already calls it internally).
 *   The existing enhancer's .config is updated with the frontend's values (frontend wins).
 */
export function createSchemaEnhancerFromRecipe(recipe, existingEnhancer) {
  // Plain functions pass through (used in arrays like [existingEnhancer, { recipe }])
  if (typeof recipe === 'function') return recipe;
  if (!recipe || typeof recipe !== 'object') return existingEnhancer || null;

  // Handle array of recipes/functions - compose them
  if (Array.isArray(recipe)) {
    const parts = recipe.map((r) => createSchemaEnhancerFromRecipe(r)).filter(Boolean);
    if (parts.length === 0) return existingEnhancer || null;
    if (parts.length === 1) {
      parts[0]._parts = parts;
      return parts[0];
    }
    const composedFn = (args) =>
      parts.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
    composedFn.config = parts.reduce((acc, fn) => ({ ...acc, ...fn.config }), {});
    composedFn._parts = parts;
    return composedFn;
  }

  // Legacy format: { type: 'x', config: {...} }
  if (recipe.type && recipe.config) {
    return createSingleEnhancerLegacy(recipe);
  }

  // New format: { inheritSchemaFrom: {...}, fieldRules: {...}, childBlockConfig: {...}, ... }
  const enhancerTypes = ['inheritSchemaFrom', 'childBlockConfig', 'fieldRules'];

  // If the existing enhancer has _parts, check each part for type overlap.
  // When the frontend sends a recipe matching an existing part's type,
  // replace that part with the frontend's version (frontend wins).
  const existingParts = existingEnhancer?._parts;

  const enhancers = [];
  let mergedConfig = {};
  const handledTypes = new Set();

  for (const type of enhancerTypes) {
    if (!recipe[type]) continue;

    // Check if existing enhancer already has a part with this type
    if (existingParts) {
      const matchIdx = existingParts.findIndex((p) => p.config?.enhancerType === type);
      if (matchIdx >= 0) {
        // Replace the existing part with the frontend's version
        const replacement = createEnhancerByType(type, recipe[type]);
        if (replacement) {
          existingParts[matchIdx] = replacement;
        }
        handledTypes.add(type);
        continue;
      }
    } else if (existingEnhancer?.config?.enhancerType === type) {
      // Single existing enhancer (no _parts) — replace its config
      const replacement = createEnhancerByType(type, recipe[type]);
      if (replacement) {
        enhancers.push(replacement);
        mergedConfig = { ...mergedConfig, ...replacement.config };
      }
      handledTypes.add(type);
      continue;
    }

    const enhancer = createEnhancerByType(type, recipe[type]);
    if (enhancer) {
      enhancers.push(enhancer);
      if (enhancer.config) {
        mergedConfig = { ...mergedConfig, ...enhancer.config };
      }
    }
  }

  // If existing had _parts and we replaced within them, recompose
  if (existingParts && handledTypes.size > 0) {
    // Add any new (non-replaced) enhancers to the parts
    const allParts = [...existingParts, ...enhancers];
    if (allParts.length === 1) {
      allParts[0]._parts = allParts;
      return allParts[0];
    }
    const composedFn = (args) =>
      allParts.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
    composedFn.config = allParts.reduce((acc, fn) => ({ ...acc, ...fn.config }), {});
    composedFn._parts = allParts;
    return composedFn;
  }

  // If existing enhancer handled everything, return it
  if (enhancers.length === 0) return existingEnhancer || null;

  // Chain existing enhancer before new ones if present
  if (existingEnhancer) {
    enhancers.unshift(existingEnhancer);
    mergedConfig = { ...existingEnhancer.config, ...mergedConfig };
  }

  if (enhancers.length === 1) {
    return enhancers[0];
  }

  // Compose multiple enhancers
  const composedFn = (args) =>
    enhancers.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
  composedFn.config = mergedConfig;
  composedFn._parts = enhancers;
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
      const { typeField, mappingField, defaultsField = 'itemDefaults', filterConvertibleFrom, allowedBlocks, blocksField, title, default: defaultValue } = config;
      // typeField is optional — if not in recipe, inheritSchemaFrom reads
      // blocksConfig[blockType].itemTypeField at call time
      const typeFieldOptions = (filterConvertibleFrom || allowedBlocks || blocksField || title || defaultValue)
        ? { filterConvertibleFrom, allowedBlocks, blocksField, title, default: defaultValue }
        : {};
      enhancer = inheritSchemaFrom(typeField || null, mappingField || null, defaultsField, typeFieldOptions);
      enhancer.config = { ...config, enhancerType: 'inheritSchemaFrom' };
      break;
    }
    case 'childBlockConfig': {
      const { editableFields, parentControlledFields } = config;
      enhancer = hideParentOwnedFields({ editableFields, parentControlledFields });
      enhancer.config = { ...config, enhancerType: 'childBlockConfig' };
      break;
    }
    case 'fieldRules': {
      enhancer = createFieldRulesEnhancer(config);
      if (enhancer) enhancer.config = { ...enhancer.config, enhancerType: 'fieldRules' };
      break;
    }
    default:
      console.warn(`Unknown schemaEnhancer type: ${type}`);
      return null;
  }

  return enhancer;
}

/**
 * Create a fieldRules schemaEnhancer that adds, removes, or conditionally
 * modifies field definitions in the schema.
 *
 * Config format: { fieldPath: rule, ... }
 *
 * Rule formats:
 *   false                          — always hide the field
 *   { set: <definition|false> }    — always set/hide
 *   { when: <condition>, else?: <definition|false> }
 *                                  — show when condition met, else hide/keep
 *   { when: <condition>, set: <definition>, else?: <definition|false> }
 *                                  — conditional definition override
 *   [ rule, rule, ... ]            — switch: first matching rule wins
 *
 * Condition format (when):
 *   { fieldName: value }           — equality: formData[fieldName] === value
 *   { fieldName: { isNot: v } }    — inequality
 *   { fieldName: { gte: n } }      — numeric comparison (gt, gte, lt, lte)
 *   { fieldName: { isSet: true } } — truthy check
 *   { '../field': value }          — parent/root field path
 *
 * Field definitions can include a `fieldset` property to specify placement:
 *   { title: '...', widget: '...', fieldset: { id: 'fs', title: 'FS' } }
 *   { title: '...', widget: '...', fieldset: 'existing-fieldset-id' }
 *
 * Nested field paths (e.g., 'querystring.b_size') target fields inside
 * a widget's inner schema by adding a schemaEnhancer to the parent property.
 *
 * @private
 */
function createFieldRulesEnhancer(rulesConfig) {
  const enhancer = (args) => {
    const { schema, formData } = args;
    if (!schema?.properties) return schema;

    const fieldsToHide = new Set();
    const fieldsToSet = {};    // fieldName → { definition, fieldset? }
    const nestedHides = {};    // parentField → Set of child fields to hide

    for (const [fieldPath, rule] of Object.entries(rulesConfig)) {
      // Handle nested field paths (e.g., 'querystring.b_size')
      if (fieldPath.includes('.')) {
        const [parentField, childField] = fieldPath.split('.', 2);
        if (!schema.properties[parentField]) continue;
        const result = evaluateFieldRule(rule, formData, args);
        if (result === false) {
          if (!nestedHides[parentField]) nestedHides[parentField] = new Set();
          nestedHides[parentField].add(childField);
        }
        continue;
      }

      const result = evaluateFieldRule(rule, formData, args);

      if (result === false) {
        fieldsToHide.add(fieldPath);
      } else if (result && typeof result === 'object') {
        const { fieldset, ...fieldDef } = result;
        fieldsToSet[fieldPath] = { definition: fieldDef, fieldset };
      }
      // result === undefined → no change (keep current)
    }

    // No changes needed
    if (fieldsToHide.size === 0 && Object.keys(fieldsToSet).length === 0 && Object.keys(nestedHides).length === 0) {
      return schema;
    }

    let newProperties = { ...schema.properties };
    let newFieldsets = schema.fieldsets.map((fs) => ({
      ...fs,
      fields: [...fs.fields],
    }));

    // Apply nested hides (add schemaEnhancer to parent property)
    for (const [parentField, childFields] of Object.entries(nestedHides)) {
      const existingEnhancer = newProperties[parentField]?.schemaEnhancer;
      newProperties[parentField] = {
        ...newProperties[parentField],
        schemaEnhancer: (innerArgs) => {
          const innerSchema = existingEnhancer ? existingEnhancer(innerArgs) : innerArgs.schema;
          return {
            ...innerSchema,
            fieldsets: innerSchema.fieldsets.map((fs) => ({
              ...fs,
              fields: fs.fields.filter((f) => !childFields.has(f)),
            })),
          };
        },
      };
    }

    // Hide fields
    if (fieldsToHide.size > 0) {
      newFieldsets = newFieldsets
        .map((fs) => ({
          ...fs,
          fields: fs.fields.filter((f) => !fieldsToHide.has(f)),
        }))
        .filter((fs) => fs.fields.length > 0 || fs.id === 'default');
      for (const f of fieldsToHide) {
        delete newProperties[f];
      }
    }

    // Add/replace fields
    for (const [fieldName, { definition, fieldset }] of Object.entries(fieldsToSet)) {
      newProperties[fieldName] = { ...(newProperties[fieldName] || {}), ...definition };

      if (fieldset) {
        // Remove from any existing fieldset first (to avoid duplicates)
        for (const fs of newFieldsets) {
          fs.fields = fs.fields.filter((f) => f !== fieldName);
        }

        if (typeof fieldset === 'object') {
          // Create or find fieldset
          const existing = newFieldsets.find((fs) => fs.id === fieldset.id);
          if (existing) {
            existing.fields.push(fieldName);
          } else {
            newFieldsets.push({
              id: fieldset.id,
              title: fieldset.title || fieldset.id,
              fields: [fieldName],
            });
          }
        } else if (typeof fieldset === 'string') {
          const existing = newFieldsets.find((fs) => fs.id === fieldset);
          if (existing) {
            existing.fields.push(fieldName);
          }
        }
      } else if (!newFieldsets.some((fs) => fs.fields.includes(fieldName))) {
        // New field without explicit fieldset — add to default
        const defaultFs = newFieldsets.find((fs) => fs.id === 'default');
        if (defaultFs) {
          defaultFs.fields.push(fieldName);
        }
      }
    }

    // Clean up empty fieldsets (except default)
    newFieldsets = newFieldsets.filter((fs) => fs.fields.length > 0 || fs.id === 'default');

    return {
      ...schema,
      properties: newProperties,
      fieldsets: newFieldsets,
      required: schema.required || [],
    };
  };

  enhancer.config = { fieldRules: rulesConfig };
  return enhancer;
}

/**
 * Evaluate a field rule and return the resulting field definition.
 * Returns: false (hide), object (field definition), or undefined (no change).
 * @private
 */
function evaluateFieldRule(rule, formData, args) {
  // false → always hide
  if (rule === false) return false;

  // Array → switch: first matching rule wins
  if (Array.isArray(rule)) {
    for (const r of rule) {
      if (!r.when || evaluateWhenCondition(r.when, formData, args)) {
        if ('set' in r) return r.set;
        return undefined; // matched but no set → keep current
      }
    }
    return undefined; // no match → keep current
  }

  // Object with 'when' or 'set' → single rule
  if (rule && typeof rule === 'object' && ('when' in rule || 'set' in rule)) {
    if (!rule.when || evaluateWhenCondition(rule.when, formData, args)) {
      // Condition met (or no condition)
      return 'set' in rule ? rule.set : undefined;
    }
    // Condition not met → use else (default: undefined = keep current)
    return 'else' in rule ? rule.else : undefined;
  }

  // Plain object without 'when'/'set' → it's a field definition (always apply)
  if (rule && typeof rule === 'object') {
    return rule;
  }

  return undefined;
}

/**
 * Evaluate a 'when' condition against form data.
 * Format: { fieldPath: expectedValue, ... } or { fieldPath: { operator: value }, ... }
 * All entries must match (AND logic).
 * @private
 */
function evaluateWhenCondition(when, formData, args) {
  for (const [fieldPath, expected] of Object.entries(when)) {
    const value = resolveFieldPath(fieldPath, formData, args);

    // Object with operators: { isNot: v, gte: n, isSet: true, ... }
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (!evaluateOperators(value, expected)) return false;
      continue;
    }

    // Simple equality
    if (value !== expected) return false;
  }
  return true;
}

/**
 * Evaluate operator conditions against a value.
 * Operators: is, isNot, gt, gte, lt, lte, isSet, isNotSet
 * @private
 */
function evaluateOperators(value, operators) {
  const { is, isNot, gt, gte, lt, lte, isSet, isNotSet } = operators;

  if (isSet !== undefined) {
    const hasValue = value !== undefined && value !== null && value !== '';
    if (isSet ? !hasValue : hasValue) return false;
  }
  if (isNotSet !== undefined) {
    const hasValue = value !== undefined && value !== null && value !== '';
    if (isNotSet ? hasValue : !hasValue) return false;
  }
  if (is !== undefined && value !== is) return false;
  if (isNot !== undefined && value === isNot) return false;

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
    // Get parent data from hydra context (live UI) or pageFormData (during buildBlockPathMap)
    const hydraContext = getHydraSchemaContext?.();
    if (hydraContext?.blockPathMap && hydraContext?.currentBlockId) {
      const pathInfo = hydraContext.blockPathMap[hydraContext.currentBlockId];
      if (pathInfo?.parentId && pathInfo.parentId !== PAGE_BLOCK_UID) {
        // Nested block - get parent block data
        const parentBlock = getLiveBlockData?.(pathInfo.parentId);
        return parentBlock?.[parentField];
      } else {
        // Top-level block - parent is the page, use hydraContext.formData
        return hydraContext.formData?.[parentField];
      }
    }
    // Fallback for schema builds outside live UI (e.g., buildBlockPathMap)
    return args?.pageFormData?.[parentField];
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
 * 1. Start with allowedBlocks (if provided)
 * 2. Or derive from blocksField (container's blocks field schema)
 * 3. Or fall back to parent's allowedSiblingTypes from pathMap
 * 4. Fall back to all non-restricted blocks (or all if filtering)
 * 5. Filter by filterConvertibleFrom (types with fieldMappings[source])
 *
 * @param {Object} options - Configuration options
 * @param {string[]} options.allowedBlocks - Static list of allowed types
 * @param {string} options.blocksField - Container field name to derive allowedBlocks from (e.g., 'blocks')
 * @param {string} options.filterConvertibleFrom - Source type to filter by (e.g., '@default')
 * @param {Object} blocksConfig - Block configuration registry
 * @param {Object} blockPathMap - Block path map (optional, for allowedSiblingTypes)
 * @param {string} blockId - Current block ID (optional, for allowedSiblingTypes)
 * @param {Object} formData - Current block's formData (optional, for blocksField lookup)
 * @returns {Array} - Array of [value, label] tuples for choices
 */
/**
 * Get the first blocks field name for a container block from the pathMap.
 * Only considers blocks fields (not object_list fields).
 * Returns undefined if no children found or pathMap not available.
 */
function getFirstBlocksField(blockId, blockPathMap) {
  if (!blockPathMap || !blockId) return undefined;
  for (const pathInfo of Object.values(blockPathMap)) {
    // Only consider blocks fields, not object_list items
    if (pathInfo.parentId === blockId && pathInfo.containerField && !pathInfo.isObjectListItem) {
      return pathInfo.containerField;
    }
  }
  return undefined;
}

export function getBlockTypeChoices(options, blocksConfig, blockPathMap, blockId, formData, intl) {
  if (!blocksConfig) return [];

  const { allowedBlocks, blocksField, filterConvertibleFrom } = options || {};

  // Determine base types in order of precedence
  let types = allowedBlocks;

  // Derive from container's blocks field schema
  // blocksField specifies which container field to get allowedBlocks from
  // Special value '..' means get sibling allowed types from parent container
  // If blocksField is undefined, default to the first blocks field from pathMap
  let effectiveBlocksField = blocksField;
  if (effectiveBlocksField === undefined) {
    effectiveBlocksField = getFirstBlocksField(blockId, blockPathMap);
  }

  if (!types && effectiveBlocksField) {
    if (effectiveBlocksField === '..') {
      // ".." means get sibling allowed types from parent container
      // This is available via blockPathMap[blockId].allowedSiblingTypes
      if (blockPathMap && blockId) {
        const pathInfo = blockPathMap[blockId];
        if (pathInfo?.allowedSiblingTypes) {
          types = pathInfo.allowedSiblingTypes;
        }
      }
    } else if (formData) {
      // Regular field name - look at container's own field
      const blockType = formData['@type'];
      const blockSchema = getBlockTypeSchema(blockType, intl, blocksConfig);
      const fieldDef = blockSchema?.properties?.[effectiveBlocksField];
      if (fieldDef?.allowedBlocks) {
        // Get allowedBlocks from the field definition in schema
        types = fieldDef.allowedBlocks;
      } else {
        // For implicit containers (blocks/blocks_layout), check block config's allowedBlocks
        types = blocksConfig[blockType]?.allowedBlocks;
      }
    }
  }

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
 * The canonical @default virtual type fields.
 * These are the standard Plone content item fields that listing query results
 * provide (see DEFAULT_FIELD_MAPPING in expandListingBlocks).
 * A fieldMappings['@default'] entry must use only these keys.
 */
const DEFAULT_TYPE_FIELDS = new Set(['@id', 'title', 'description', 'image']);

/**
 * Check if a block config has a valid @default mapping.
 * Valid means all keys are from the canonical @default field set.
 */
function hasValidDefault(blockConfig) {
  const defaultMapping = blockConfig?.fieldMappings?.['@default'];
  if (!defaultMapping) return false;
  return Object.keys(defaultMapping).every(key => DEFAULT_TYPE_FIELDS.has(key));
}

/**
 * Validate fieldMappings on a block config. Logs warnings for invalid entries.
 * Call during INIT to catch configuration errors early.
 */
export function validateFieldMappings(blockType, blockConfig) {
  const fieldMappings = blockConfig?.fieldMappings;
  if (!fieldMappings) return;

  const defaultMapping = fieldMappings['@default'];
  if (defaultMapping) {
    const invalidKeys = Object.keys(defaultMapping).filter(
      key => !DEFAULT_TYPE_FIELDS.has(key),
    );
    if (invalidKeys.length > 0) {
      console.warn(
        `[HYDRA] Block type "${blockType}" has fieldMappings['@default'] with ` +
        `invalid keys: ${invalidKeys.join(', ')}. @default is a virtual type ` +
        `whose keys must be from: ${[...DEFAULT_TYPE_FIELDS].join(', ')}. ` +
        `Use explicit type-to-type mappings instead (e.g., fieldMappings: { otherType: { ... } }).`,
      );
    }
  }
}

/**
 * Get block types that the given source type can be converted to.
 *
 * Scans all blocks to find ones reachable from the source type through
 * fieldMappings. Types without fieldMappings never appear in results.
 *
 * Edge rules:
 * - Explicit fieldMappings[currentType] always creates an edge.
 * - @default only creates an edge if BOTH types have valid @default mappings
 *   (keys from the canonical set: @id, title, description, image).
 *   Types with invalid @default keys (e.g., form fields, facets) are ignored.
 *
 * @param {string} sourceType - The current block's @type
 * @param {Object} blocksConfig - Block configuration registry
 * @returns {Array} - Array of { type, title } objects for convertible types
 */
export function getConvertibleTypes(sourceType, blocksConfig, allowedTypes = null) {
  if (!sourceType || !blocksConfig) return [];

  // Source block must have fieldMappings defined to be convertible
  const sourceConfig = blocksConfig[sourceType];
  if (!sourceConfig?.fieldMappings) return [];

  // BFS to find all reachable types through the conversion graph
  const reachable = new Set();
  const queue = [sourceType];
  const visited = new Set([sourceType]);

  while (queue.length > 0) {
    const currentType = queue.shift();

    for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
      if (visited.has(blockType)) continue;
      if (!blockConfig.fieldMappings) continue;

      // Explicit mapping from currentType → blockType
      if (blockConfig.fieldMappings[currentType]) {
        reachable.add(blockType);
        visited.add(blockType);
        queue.push(blockType);
        continue;
      }

      // @default: only if BOTH types have valid @default (canonical keys)
      if (blockConfig.fieldMappings['@default'] &&
          hasValidDefault(blockConfig) &&
          hasValidDefault(blocksConfig[currentType])) {
        reachable.add(blockType);
        visited.add(blockType);
        queue.push(blockType);
      }
    }
  }

  // Filter by container's allowedTypes if provided
  const allowedSet = allowedTypes ? new Set(allowedTypes) : null;

  // Convert to array of { type, title }
  return Array.from(reachable)
    .filter(blockType => !allowedSet || allowedSet.has(blockType))
    .map(blockType => ({
      type: blockType,
      title: blocksConfig[blockType]?.title || blockType,
    }));
}

/**
 * Find the conversion path from source to target type.
 * Returns array of types representing the path, or null if no path exists.
 * Prefers direct mappings over default mappings.
 * Uses the same @default compatibility rules as getConvertibleTypes.
 */
function findConversionPath(sourceType, targetType, blocksConfig) {
  if (sourceType === targetType) return [sourceType];

  // BFS to find path, prioritizing direct mappings over default
  const queue = [[sourceType]];
  const visited = new Set([sourceType]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentType = path[path.length - 1];

    // Separate into direct and compatible-default targets, process direct first
    const directTargets = [];
    const defaultTargets = [];

    for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
      if (visited.has(blockType)) continue;
      if (!blockConfig.fieldMappings) continue;

      if (blockConfig.fieldMappings[currentType]) {
        directTargets.push(blockType);
      } else if (blockConfig.fieldMappings['@default'] &&
                 hasValidDefault(blockConfig) &&
                 hasValidDefault(blocksConfig[currentType])) {
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
      queue.push(newPath);
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
 * Get the resolved schema for a block type from blocksConfig.
 * Handles both static objects and factory functions.
 */
function getResolvedSchema(blocksConfig, blockType, intl) {
  const cfg = blocksConfig?.[blockType];
  if (!cfg?.blockSchema) return null;
  if (typeof cfg.blockSchema !== 'function') return cfg.blockSchema;
  return cfg.blockSchema({ intl });
}

/**
 * Map a schema widget to a convertFieldValue targetType.
 * Returns null if no coercion is needed (pass-through).
 * @param {string} widget - The widget name from the schema field
 * @param {Object} fieldDef - The full field definition (to check mode, etc.)
 */
function widgetToTargetType(widget, fieldDef) {
  if (widget === 'object_browser') {
    // object_browser in image mode: array format [{ '@id': url, image_field?, image_scales? }]
    if (fieldDef?.mode === 'image') return 'image_link';
    return 'link';
  }
  // ImageWidget: string value + sibling image_field/image_scales fields on the block
  if (widget === 'image') return 'image';
  if (widget === 'url') return 'string';
  if (widget === 'slate') return 'slate';
  if (widget === 'textarea') return 'textarea';
  return null;
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
 * @param {string} typeFieldName - Field name for block type (default '@type')
 * @param {Object} intl - react-intl intl object for resolving blockSchema factories
 * @returns {Object} - New block data with @type set to newType and fields mapped
 */
export function convertBlockType(blockData, newType, blocksConfig, typeFieldName = '@type', intl = null) {
  const sourceType = blockData[typeFieldName];

  // Find the conversion path
  const path = findConversionPath(sourceType, newType, blocksConfig);
  if (!path || path.length < 2) {
    // No path found, just set the type (shouldn't happen if getConvertibleTypes was used)
    return { [typeFieldName]: newType };
  }

  // Pack image widget fields into canonical image format: [{ '@id': url, image_field?, image_scales? }]
  // widget:'image' can store value as string (content path) or array [{ '@id': url }],
  // with optional image_field/image_scales as separate block-level fields
  let currentData = { ...blockData };
  const sourceSchema = getResolvedSchema(blocksConfig, sourceType, intl);
  if (sourceSchema?.properties) {
    for (const [fieldName, fieldDef] of Object.entries(sourceSchema.properties)) {
      if (fieldDef.widget === 'image' && currentData[fieldName] !== undefined) {
        const val = currentData[fieldName];
        if (typeof val === 'string') {
          const packed = { '@id': val };
          if (currentData.image_field) packed.image_field = currentData.image_field;
          if (currentData.image_scales) packed.image_scales = currentData.image_scales;
          currentData[fieldName] = [packed];
        }
        break;
      }
    }
  }

  for (let i = 1; i < path.length; i++) {
    const fromType = path[i - 1];
    const toType = path[i];
    const sourceConfig = blocksConfig?.[fromType];
    const targetConfig = blocksConfig?.[toType];

    // Step 1: Normalize source data to canonical fields using inverted default mapping
    // This extracts data FROM the source block
    const sourceInvertedDefault = invertMapping(sourceConfig?.fieldMappings?.['@default']);
    let canonicalData = {};
    for (const [blockField, canonicalField] of Object.entries(sourceInvertedDefault)) {
      if (currentData[blockField] !== undefined) {
        canonicalData[canonicalField] = currentData[blockField];
      }
    }
    // Also keep original fields for direct mappings
    canonicalData = { ...currentData, ...canonicalData };

    // Step 2: Map canonical/source fields to target using target's mappings
    // Coerce values to match target field widget types (e.g., object_browser ↔ url)
    const targetMappings = targetConfig?.fieldMappings;
    const targetSchema = getResolvedSchema(blocksConfig, toType, intl);
    const newData = { [typeFieldName]: toType };
    // Apply mappings: source-specific first, then default as fallback
    const mappings = { ...targetMappings?.['@default'], ...targetMappings?.[fromType] };
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (canonicalData[sourceField] !== undefined) {
        const targetFieldDef = targetSchema?.properties?.[targetField];
        const targetType = widgetToTargetType(targetFieldDef?.widget, targetFieldDef);
        // Unpack: when target is widget:'image' (string + siblings), hoist image_field/image_scales
        // from the packed array before convertFieldValue extracts just the string
        if (targetType === 'image') {
          const srcVal = canonicalData[sourceField];
          if (Array.isArray(srcVal) && srcVal.length > 0 && srcVal[0]?.['@id']) {
            if (srcVal[0].image_field) newData.image_field = srcVal[0].image_field;
            if (srcVal[0].image_scales) newData.image_scales = srcVal[0].image_scales;
          }
        }
        newData[targetField] = convertFieldValue(canonicalData[sourceField], targetType);
      }
    }
    currentData = newData;
  }

  // Preserve unmapped fields from the original block that aren't in the final result
  // This enables roundtrip conversion (hero → image → hero) to retain fields like buttonText
  // that exist in source and target but aren't explicitly mapped through intermediate types
  const { [typeFieldName]: _originalType, ...originalFields } = blockData;
  const { [typeFieldName]: finalType, ...convertedFields } = currentData;

  // Coerce preserved fields to match target schema widget types
  // e.g., description (string from summary) → Slate array for hero
  const targetSchema = getResolvedSchema(blocksConfig, finalType, intl);
  if (targetSchema?.properties) {
    for (const [field, value] of Object.entries(originalFields)) {
      if (convertedFields[field] !== undefined) continue; // Already mapped
      const fieldDef = targetSchema.properties[field];
      const targetType = widgetToTargetType(fieldDef?.widget, fieldDef);
      if (targetType) {
        originalFields[field] = convertFieldValue(value, targetType);
      }
    }
  }

  // Merge: original fields as base, converted fields take priority
  return {
    ...originalFields,
    ...convertedFields,
    [typeFieldName]: finalType,
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
 * @param {Object} intl - react-intl intl object for resolving blockSchema factories
 * @returns {Object} Updated formData with synced children
 */
export function syncChildBlockTypes(formData, blockPathMap, blockId, oldBlockData, newBlockData, blocksConfig, intl = null) {
  const blockType = newBlockData['@type'];
  const blockConfig = blocksConfig?.[blockType];

  // Check if block has itemTypeField configured
  const typeField = blockConfig?.itemTypeField;
  if (!typeField) return formData;

  // Check if typeField value changed
  const oldType = oldBlockData?.[typeField];
  const newType = newBlockData[typeField];
  if (oldType === newType || !newType) return formData;

  let result = formData;

  // Reset fieldMapping to the new type's default when variation changes
  // The new type's fieldMappings['@default'] provides the correct source→target mapping
  const newTypeConfig = blocksConfig?.[newType];
  const defaultFieldMapping = newTypeConfig?.fieldMappings?.['@default'];
  if (defaultFieldMapping) {
    // Get the current block with the new variation and reset its fieldMapping
    const currentBlock = getBlockById(result, blockPathMap, blockId);
    if (currentBlock) {
      const updatedBlock = { ...currentBlock, fieldMapping: defaultFieldMapping };
      result = updateBlockById(result, blockPathMap, blockId, updatedBlock);
    }
  }

  // Determine which blocks field to sync
  // Use configured blocksField from enhancer or default to first blocks field from pathMap
  const enhancerConfig = blockConfig?.schemaEnhancer?.config;
  const configuredBlocksField = enhancerConfig?.blocksField;
  const effectiveBlocksField = configuredBlocksField ?? getFirstBlocksField(blockId, blockPathMap);

  // Get child block IDs, filtered to the effective blocks field
  const allChildIds = getChildBlockIds(blockId, blockPathMap);
  const childIds = effectiveBlocksField
    ? allChildIds.filter((id) => blockPathMap[id]?.containerField === effectiveBlocksField)
    : allChildIds;
  console.log('[syncChildBlockTypes] childIds:', childIds, 'in field:', effectiveBlocksField);
  if (childIds.length === 0) return result;

  // Transform each child
  for (const childId of childIds) {
    const childBlock = getBlockById(result, blockPathMap, childId);
    if (!childBlock) continue;

    const childType = childBlock['@type'];
    const childConfig = blocksConfig?.[childType];
    const childTypeField = childConfig?.itemTypeField;

    if (childTypeField) {
      // Child has its own inheritSchemaFrom - change its typeField, not @type
      // This handles nested containers (e.g., Grid → Listing)
      if (childBlock[childTypeField] !== newType) {
        const updatedChild = { ...childBlock, [childTypeField]: newType };
        result = updateBlockById(result, blockPathMap, childId, updatedChild);
        // Recursive: sync this child's children too
        result = syncChildBlockTypes(result, blockPathMap, childId, childBlock, updatedChild, blocksConfig, intl);
      }
    } else {
      // Child is a regular block - convert its type using fieldMappings
      if (childType !== newType) {
        const updatedChild = convertBlockType(childBlock, newType, blocksConfig, '@type', intl);
        result = updateBlockById(result, blockPathMap, childId, updatedChild);
      }
    }
  }

  return result;
}
