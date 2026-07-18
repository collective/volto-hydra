/**
 * Can a block of `type` be dropped/pasted into a container whose accepted
 * sibling types are `allowed`, given the static `conversionMap`
 * ({ sourceType: [reachableTypes] })?
 *
 * - unrestricted container (allowed nullish) → always
 * - native fit (type ∈ allowed) → always
 * - else options = conversionMap[type] ∩ allowed:
 *     empty        → no
 *     single block → yes (1 = auto-convert, >1 = popup; both are valid spots)
 *     multi block  → yes only if exactly one option (auto-only, no popup chains)
 *
 * Shared by the iframe drag gate and (by construction) the admin's drop
 * resolution — a spot the iframe offers is never rejected on drop, because the
 * admin's `getConvertibleTypes(type, cfg, allowed)` yields the same options set
 * as `conversionMap[type] ∩ allowed`.
 */
export function acceptableAt(type, allowed, isMulti, conversionMap) {
  if (allowed == null) return true;
  if (allowed.includes(type)) return true;
  const reachable = (conversionMap && conversionMap[type]) || [];
  const options = reachable.filter((t) => allowed.includes(t));
  if (options.length === 0) return false;
  if (isMulti) return options.length === 1;
  return true;
}
