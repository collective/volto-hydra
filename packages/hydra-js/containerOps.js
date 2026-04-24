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

/**
 * Find the shortest conversion path from srcType to any allowedTarget, using
 * Volto's fieldMappings convention: blocksConfig[target].fieldMappings[source]
 * defines an edge source → target.
 *
 * Returns an array of types from srcType to the chosen target, or null if no
 * path exists within `depth` edges (default 3 — caller memoization is
 * recommended for hot paths like DropdownMenu rendering).
 *
 * @param {string} srcType
 * @param {string[]} allowedTargets
 * @param {object} blocksConfig
 * @param {number} [depth=3]     Max number of edges to traverse.
 * @returns {string[] | null}
 */
export function findConversionPath(srcType, allowedTargets, blocksConfig, depth = 3) {
  if (!srcType || !blocksConfig?.[srcType]) return null;
  const targetSet = new Set(allowedTargets);
  if (targetSet.has(srcType)) return [srcType];

  const parents = new Map();
  parents.set(srcType, null);
  let frontier = [srcType];
  for (let hop = 1; hop <= depth; hop++) {
    const next = [];
    for (const current of frontier) {
      for (const [candidate, candidateCfg] of Object.entries(blocksConfig)) {
        if (parents.has(candidate)) continue;
        if (!candidateCfg?.fieldMappings) continue;
        if (!candidateCfg.fieldMappings[current]) continue;
        parents.set(candidate, current);
        if (targetSet.has(candidate)) {
          const path = [candidate];
          let node = current;
          while (node !== null) {
            path.unshift(node);
            node = parents.get(node);
          }
          return path;
        }
        next.push(candidate);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return null;
}
