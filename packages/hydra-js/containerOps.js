/**
 * containerOps — shared predicates and transforms for container operations
 * (wrap, unwrap, edge-drag, convert).
 *
 * Runs in both the iframe (hydra.js) and the admin (volto-hydra). Pure JS;
 * no DOM, no Redux, no intl. Callers supply container configs already resolved
 * from the block registry (e.g. via getContainerFieldConfig).
 */

/**
 * Can a container accept one more block of a given type?
 *
 * @param {object} config         Container field config (allowedBlocks, maxLength, etc.)
 * @param {string} blockType      The block @type being considered
 * @param {number} currentCount   Current number of children in the container
 * @returns {boolean}
 */
export function canContain(config, blockType, currentCount) {
  if (config?.readOnly) return false;
  if (config?.fixed) return false;
  const { allowedBlocks, maxLength } = config || {};
  if (allowedBlocks != null && !allowedBlocks.includes(blockType)) return false;
  if (maxLength != null && currentCount >= maxLength) return false;
  return true;
}

/**
 * Can a container accept every block type in `blockTypes` given its current
 * count? Considers the combined count against maxLength.
 *
 * @param {object} config         Container field config
 * @param {string[]} blockTypes   Block types to add (in order)
 * @param {number} currentCount   Current number of children
 * @returns {boolean}
 */
export function canContainAll(config, blockTypes, currentCount) {
  if (blockTypes.length === 0) return true;
  if (config?.readOnly || config?.fixed) return false;
  const { allowedBlocks, maxLength } = config || {};
  if (allowedBlocks != null) {
    for (const type of blockTypes) {
      if (!allowedBlocks.includes(type)) return false;
    }
  }
  if (maxLength != null && currentCount + blockTypes.length > maxLength) {
    return false;
  }
  return true;
}
