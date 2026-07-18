/**
 * Copy-from-target: a generic version of the Volto teaser's "sync data from
 * the linked content item" behaviour, driven by `fieldMappings['@target']`.
 *
 * A block declares which target-content attributes map to which of its own
 * fields:
 *
 *   fieldMappings: {
 *     '@target': {
 *       Title: 'title',
 *       Description: 'description',
 *       image_scales: { field: 'preview_image', type: 'image' },
 *     },
 *   }
 *
 * The target snapshot rides on the block's link/url field (the object_browser
 * `selectedItemAttrs`), e.g. `block.href[0] = { Title, Description, … }`.
 *
 * This module is the PURE core (no React): mapping lookup, schema field-widget
 * swap, and per-field typed value extraction / divergence. The enhancer that
 * installs it on every block and the `copyFromTargetField` wrapper widget build
 * on these.
 */
import { getMappingTarget, getFieldType } from './schemaInheritance';

/** Widget name the mapped destination fields are swapped to (the wrapper). */
export const COPY_FROM_TARGET_WIDGET = 'copyFromTargetField';

/** The `@target` mapping ({ sourceAttr: destField | {field,type} }) or null. */
export function getTargetMapping(blockConfig) {
  const m = blockConfig?.fieldMappings?.['@target'];
  return m && Object.keys(m).length > 0 ? m : null;
}

/** Destination (block) field names the @target mapping writes to. */
function targetDestinations(mapping) {
  return new Set(
    Object.values(mapping).map(getMappingTarget).filter(Boolean),
  );
}

/**
 * The block's link/url field — where the target snapshot (selectedItemAttrs)
 * lives. It's just the link-typed field in the schema ("the url is the link in
 * the fieldmapping"). Returns the field name or null.
 */
export function getUrlField(blockConfig) {
  const props = blockConfig?.blockSchema?.properties || {};
  for (const [name, def] of Object.entries(props)) {
    if (getFieldType(def) === 'link') return name;
  }
  return null;
}

/**
 * Swap each mapped destination field's widget to the wrapper, stashing the
 * original field def under `baseWidget` for faithful re-resolution. No-op when
 * the block declares no @target mapping. Idempotent. Returns a new schema.
 */
export function applyCopyFromTargetToSchema(schema, blockConfig) {
  const mapping = getTargetMapping(blockConfig);
  if (!mapping || !schema?.properties) return schema;

  const dests = targetDestinations(mapping);
  const properties = { ...schema.properties };
  let changed = false;

  for (const field of dests) {
    const def = properties[field];
    if (!def) continue; // mapped to a field the schema doesn't declare
    if (def.widget === COPY_FROM_TARGET_WIDGET) continue; // already wrapped (idempotent)
    properties[field] = {
      ...def,
      widget: COPY_FROM_TARGET_WIDGET,
      // Preserve the ORIGINAL field def so the wrapper can re-resolve the
      // real widget (object_browser/textarea/select/…) exactly as Volto would.
      baseWidget: def,
    };
    changed = true;
  }

  return changed ? { ...schema, properties } : schema;
}

/**
 * The @target mapping entry whose destination is `field`: its source attr and
 * (optional) declared hydra type ({ field, type } form). Null if not mapped.
 */
function mappingEntryFor(field, mapping) {
  for (const [src, dest] of Object.entries(mapping)) {
    if (getMappingTarget(dest) === field) {
      return { src, type: typeof dest === 'object' ? dest.type : undefined };
    }
  }
  return null;
}

/** The linked target's @id (from the link field), or undefined. */
export function getTargetId(blockConfig, blockData) {
  const urlField = getUrlField(blockConfig);
  return urlField ? blockData?.[urlField]?.[0]?.['@id'] : undefined;
}

/**
 * The value `field` should hold if synced from the target, or undefined when
 * the field isn't mapped or no target is selected.
 *
 * `liveTarget` (snapshot-shaped, from a fresh getContent → contentToSnapshot)
 * overrides the stored link-field snapshot, so divergence/sync reflect the
 * target AS IT IS NOW, not as it was when it was last selected. Falls back to
 * the stored snapshot when no live target is available.
 *
 * Typed: an `image` field is assembled from the catalog-brain image attrs
 * (`@id` / `image_field` / `image_scales`) into the array form an
 * object_browser (mode=image) field expects. Plain fields pass through.
 */
export function getTargetValueForField(field, blockConfig, blockData, liveTarget) {
  const mapping = getTargetMapping(blockConfig);
  if (!mapping) return undefined;
  const entry = mappingEntryFor(field, mapping);
  if (!entry) return undefined;

  const urlField = getUrlField(blockConfig);
  const snapshot = liveTarget || (urlField ? blockData?.[urlField]?.[0] : undefined);
  if (!snapshot) return undefined;

  if (entry.type === 'image') {
    if (snapshot.image_scales == null && snapshot.image_field == null) {
      return undefined; // target has no image
    }
    return [
      {
        '@id': snapshot['@id'],
        image_field: snapshot.image_field,
        image_scales: snapshot.image_scales,
      },
    ];
  }

  return snapshot[entry.src];
}

/**
 * True when `field`'s current value differs from what the target would set —
 * i.e. it's been customised. False when there's no target selected (nothing to
 * diverge from) or the field isn't mapped.
 */
export function isFieldDivergedFromTarget(field, blockConfig, blockData, liveTarget) {
  const targetValue = getTargetValueForField(field, blockConfig, blockData, liveTarget);
  if (targetValue === undefined) return false;
  const current = blockData?.[field];
  return JSON.stringify(current) !== JSON.stringify(targetValue);
}

/**
 * A block schemaEnhancer that applies the copy-from-target field-widget swap.
 * Bound to the block's config at install time (so this module stays free of the
 * Volto registry / React context — the tested pure core).
 */
export function copyFromTargetEnhancer(blockConfig) {
  const enhancer = ({ schema }) => applyCopyFromTargetToSchema(schema, blockConfig);
  enhancer._isCopyFromTargetEnhancer = true;
  return enhancer;
}

/**
 * Append `copyFromTargetEnhancer` to every block that declares a
 * `fieldMappings['@target']` — the author's only opt-in is the mapping itself
 * (no per-block enhancer wiring). Idempotent. Mirrors installChildBlockEnhancers.
 *
 * Call once at INIT, after blocksConfig is populated.
 */
export function installCopyFromTargetEnhancers(blocksConfig) {
  if (!blocksConfig) return;
  const isInstalled = (fn) => fn?._isCopyFromTargetEnhancer === true;

  for (const blockType of Object.keys(blocksConfig)) {
    const cfg = blocksConfig[blockType];
    if (!cfg || blockType === '_page') continue;
    if (!getTargetMapping(cfg)) continue; // gate: no @target mapping → skip

    const existing = cfg.schemaEnhancer;
    if (typeof existing === 'function') {
      if (isInstalled(existing)) continue;
      if (Array.isArray(existing._parts) && existing._parts.some(isInstalled)) continue;
    } else if (existing && typeof existing === 'object') {
      // Recipe form — installed on a later function-form pass (same caveat as
      // installChildBlockEnhancers).
      continue;
    }

    const enhancer = copyFromTargetEnhancer(cfg);
    let combined;
    if (typeof existing === 'function') {
      const parts = Array.isArray(existing._parts)
        ? [...existing._parts, enhancer]
        : [existing, enhancer];
      combined = (args) => parts.reduce((schema, fn) => fn({ ...args, schema }), args.schema);
      combined.config = existing.config;
      combined._parts = parts;
    } else {
      combined = enhancer;
    }
    cfg.schemaEnhancer = combined;
  }
}
