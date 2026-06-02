/**
 * Schema Validation Utilities — pure, dependency-free.
 *
 * These mirror the per-block validation Hydra runs in
 * `applySchemaDefaultsToFormData` (schemaInheritance.js). Extracted here as
 * pure functions so they can be reused from test runners, CI gates, and any
 * other tool that needs to know "would Hydra strip this value on load?"
 * without pulling in Volto's registry / React contexts / blockPath helpers.
 *
 * Originally lived inline in `./schemaInheritance.js`; that module now
 * re-exports from here. Single source of truth.
 *
 * NO imports. Keep it that way — that's the whole point.
 */

/**
 * Check if a value is valid for a field definition.
 * Returns true if valid, false if invalid.
 *
 * For Choice fields with `choices`: value must be one of the allowed choices.
 * For `enum` fields (JSON Schema style): value must be in enum.
 * For objects with `propertyNames.enum`: every key must be allowed.
 * For objects with `additionalProperties.enum`: every non-empty value must be allowed.
 * Otherwise (no constraints): always valid.
 */
export function isValidValue(value, fieldDef) {
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
      // eslint-disable-next-line no-console
      console.log('[isValidValue] Invalid values found:', invalidValues, 'validValues:', [...validValues]);
      return false;
    }
  }

  // No validation constraints - value is valid
  return true;
}

/**
 * Apply schema defaults to a block.
 *
 * Two passes:
 *   1. For each field, if `isValidValue(currentValue, fieldDef)` is false,
 *      null it. (This is the strip that surprises content authors.)
 *   2. For each field where the schema has a `default` and the current
 *      value is empty (undefined, null, or {}), apply the default.
 *
 * Returns the original blockData reference (not a copy) when nothing was
 * modified — callers rely on this to detect no-op updates cheaply.
 *
 * @param {Object} blockData - The block's current data
 * @param {Object} schema - The block's schema (with enhancers already applied)
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
 * @param {Object} context - Context for function defaults
 * @returns {Object} - Block data with defaults applied (or original if no changes)
 */
export function applySchemaDefaultsToBlockWithContext(blockData, schema, context = {}) {
  if (!schema?.properties || !blockData) return blockData;

  let modified = false;
  const newData = { ...blockData };

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    const currentValue = blockData[fieldName];
    if (currentValue !== undefined && currentValue !== null) {
      if (!isValidValue(currentValue, fieldDef)) {
        newData[fieldName] = null;
        modified = true;
      }
    }
  }

  for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
    if (fieldDef.default === undefined) continue;

    const currentValue = newData[fieldName];

    const needsDefault =
      currentValue === undefined ||
      currentValue === null ||
      (typeof currentValue === 'object' &&
        !Array.isArray(currentValue) &&
        Object.keys(currentValue).length === 0);

    if (needsDefault) {
      const defaultValue = typeof fieldDef.default === 'function'
        ? fieldDef.default(context)
        : fieldDef.default;

      if (defaultValue !== undefined) {
        newData[fieldName] = defaultValue;
        modified = true;
      }
    }
  }

  return modified ? newData : blockData;
}
