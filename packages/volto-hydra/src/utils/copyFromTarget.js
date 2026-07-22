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
 * A mapped field is LINKED by default (it tracks the target) or CUSTOM (the
 * editor's own value, recorded in the block's `_customFields`).
 *
 * This module is the PURE core (no React): mapping lookup, schema field-widget
 * swap, per-field typed value extraction, and linked/custom state. The enhancer
 * that installs it on every block and the `copyFromTargetField` wrapper widget
 * build on these.
 */
import { getMappingTarget, getFieldType } from './schemaInheritance';

/** Widget name the mapped destination fields are swapped to (the wrapper). */
export const COPY_FROM_TARGET_WIDGET = 'copyFromTargetField';

// Canonical `@default` source keys (the lowercase listing/conversion shape) →
// the keys the LINK snapshot (selectedItemAttrs) actually carries. @default and
// a link snapshot are both catalog-shaped but historically cased differently: a
// listing result serializes `title`, a link brain carries `Title`. So to reuse
// `@default` as the target mapping we translate each canonical source to its
// snapshot key. `@id` is the link itself (it populates the url field), not a
// pulled display field, so it is intentionally omitted.
const DEFAULT_SOURCE_TO_SNAPSHOT = {
  title: { src: 'Title' },
  description: { src: 'Description' },
  image: { src: 'image_scales', type: 'image' },
};

/**
 * The `@target` mapping ({ sourceAttr: destField | {field,type} }) or null.
 *
 * Copy-from-target is ON BY DEFAULT: a block with a link field but no explicit
 * `@target` falls back to a normalized `@default` — so any link-bearing block
 * that already declares its canonical content shape pulls from the link without
 * extra wiring (the teaser case). An explicit `@target` always wins. A block
 * with no link field (nothing to pull from) returns null.
 */
export function getTargetMapping(blockConfig) {
  const explicit = blockConfig?.fieldMappings?.['@target'];
  if (explicit && Object.keys(explicit).length > 0) return explicit;

  const def = blockConfig?.fieldMappings?.['@default'];
  if (!def || !getUrlField(blockConfig)) return null;

  const synthesized = {};
  for (const [canonical, dest] of Object.entries(def)) {
    const norm = DEFAULT_SOURCE_TO_SNAPSHOT[canonical]; // skips @id + unknowns
    const destField = norm && getMappingTarget(dest);
    if (!destField) continue;
    synthesized[norm.src] = norm.type ? { field: destField, type: norm.type } : destField;
  }
  return Object.keys(synthesized).length > 0 ? synthesized : null;
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
 * `liveTarget` (snapshot-shaped, from a fresh catalog @search) overrides the
 * stored link-field snapshot, so a linked field pulls the target AS IT IS NOW,
 * not as it was when it was last selected. Falls back to the stored snapshot
 * when no live target is available.
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

/** Block key holding the set of fields the editor has taken CUSTOM (overridden). */
export const CUSTOM_FIELDS_KEY = '_customFields';

/**
 * A mapped field is either LINKED (tracks the target — default) or CUSTOM (the
 * editor's own value). Custom is explicit and stored, so there's no value
 * comparison / divergence: a field is custom iff it's listed in _customFields.
 */
export function isFieldCustom(field, blockData) {
  return (blockData?.[CUSTOM_FIELDS_KEY] || []).includes(field);
}

/**
 * A mapped field is linked when it's mapped, a target is selected, and the
 * editor hasn't taken it custom.
 */
export function isFieldLinked(field, blockConfig, blockData) {
  if (!getTargetMapping(blockConfig)) return false;
  if (!mappingEntryFor(field, getTargetMapping(blockConfig))) return false;
  if (!getTargetId(blockConfig, blockData)) return false;
  return !isFieldCustom(field, blockData);
}

/** Return blockData with `field` marked custom (immutable). */
export function withFieldCustom(blockData, field) {
  const set = new Set(blockData?.[CUSTOM_FIELDS_KEY] || []);
  set.add(field);
  return { ...blockData, [CUSTOM_FIELDS_KEY]: [...set] };
}

/** Return blockData with `field` marked linked again (removed from custom). */
export function withFieldLinked(blockData, field) {
  const next = (blockData?.[CUSTOM_FIELDS_KEY] || []).filter((f) => f !== field);
  const out = { ...blockData };
  if (next.length) out[CUSTOM_FIELDS_KEY] = next;
  else delete out[CUSTOM_FIELDS_KEY];
  return out;
}

/** Mapped destination field names a @target mapping writes to, or []. */
function targetDestFields(blockConfig) {
  const mapping = getTargetMapping(blockConfig);
  if (!mapping) return [];
  return [...new Set(Object.values(mapping).map(getMappingTarget).filter(Boolean))];
}

function isEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Turn a LINKED field CUSTOM the moment its value is edited — the ONE mechanism
 * for EVERY edit path (sidebar, inline canvas, image, link). Rather than hook each
 * path, compare by value: diff `incoming` against `previous` and flip any @target
 * destination whose value changed. This runs on every committed formData change,
 * so three guards keep it correct:
 *   1. it was LINKED in the previous (pre-edit) state — typing into a not-yet-
 *      linked field (no target) doesn't flip it, so a later link still pulls it;
 *   2. its value actually changed;
 *   3. the NEW value differs from the TARGET value — this is what distinguishes a
 *      user edit (writes something other than the target) from the PULL itself
 *      (writes exactly the target). Without it, the pull would flip the very field
 *      it just synced.
 * Recurses into nested container blocks. Returns a shallow clone (=== previous
 * content when nothing flipped, so callers can cheaply skip a no-op write).
 */
export function markEditedLinkedFieldsCustom(incoming, previous, blocksConfig) {
  if (!incoming?.blocks || !previous?.blocks || !blocksConfig) return incoming;
  let anyFlipped = false;

  const visit = (inBlocks, prevBlocks) => {
    for (const id of Object.keys(inBlocks)) {
      let block = inBlocks[id];
      const prevBlock = prevBlocks?.[id];
      if (!block || typeof block !== 'object') continue;

      const cfg = blocksConfig[block['@type']];
      if (cfg && prevBlock) {
        for (const field of targetDestFields(cfg)) {
          if (
            isFieldLinked(field, cfg, prevBlock) && // was linked BEFORE the edit
            !isFieldCustom(field, block) && // not already flipped (idempotent)
            !isEqualJson(block[field], prevBlock[field]) && // its value changed
            !isEqualJson(block[field], getTargetValueForField(field, cfg, block)) // not the pull
          ) {
            block = withFieldCustom(block, field);
            inBlocks[id] = block;
            anyFlipped = true;
          }
        }
      }
      if (block.blocks) {
        block = { ...block, blocks: { ...block.blocks } };
        inBlocks[id] = block;
        visit(block.blocks, prevBlock?.blocks);
      }
    }
  };

  const cloned = { ...incoming, blocks: { ...incoming.blocks } };
  visit(cloned.blocks, previous.blocks);
  return anyFlipped ? cloned : incoming;
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
