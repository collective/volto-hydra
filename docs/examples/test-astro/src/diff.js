/**
 * Find the shallowest block in `newForm` whose subtree differs from
 * `prevForm`. Returns:
 *
 *   - `null` when the forms are deep-equal (no edit happened — no re-render
 *     needed).
 *   - `{ unit: 'page' }` when the change spans more than one top-level
 *     block (multi-block reorder, add/remove at top, or simultaneous edits
 *     to two unrelated branches). The entire content area re-renders.
 *   - `{ unit: 'block', blockId: 'X' }` when exactly one subtree changed
 *     and that subtree's outer items array is unchanged — meaning the
 *     change is contained inside block X (or one of its descendants). The
 *     caller re-renders block X.
 *
 * Algorithm (recursive, walks DOWN):
 *
 *   1. If items array at this level differs (add/remove/reorder) → this
 *      level is the unit. The caller re-renders the whole container.
 *   2. Else find each child whose data differs (deep-equal compare).
 *      - 0 differ → no change here (return null, walk back up).
 *      - 1 differ AND that child is a container → recurse into it. If
 *        recursion finds a deeper unit, return that. Otherwise return the
 *        child itself.
 *      - 1 differ AND it's a leaf → return that child.
 *      - 2+ differ → return THIS level (multiple children changed, so
 *        re-render their common parent).
 *
 * Containers in Hydra fixtures use one of three field shapes — handled by
 * `getContainerFields` below. Anything else compares as a leaf.
 */

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

/**
 * Container fields on a block we recurse into. A container field has the
 * shape `{ items: [id, ...] }` plus a sibling `blocks` dict of the actual
 * block data. Returns `[{ itemsPath, blocksPath }, ...]` so the diff can
 * walk multiple container fields on a single block (e.g. columns-1 has
 * `columns` for column items but each column has `blocks_layout` for its
 * own children — same shape, different field names).
 *
 * The recursion treats whatever blocks live in `block.blocks` as the
 * children of THIS container field. The `blocks_layout` and `columns`
 * field both reference ids in the SAME `blocks` dict — that's the Plone
 * shape.
 */
function getContainerFields(block) {
  if (!block || typeof block !== 'object') return [];
  const fields = [];
  if (block.blocks_layout?.items && block.blocks) {
    fields.push({ items: block.blocks_layout.items, blocks: block.blocks });
  }
  if (block.columns?.items && block.blocks) {
    fields.push({ items: block.columns.items, blocks: block.blocks });
  }
  return fields;
}

/**
 * Recurse into a single block looking for the shallowest changed
 * descendant. Returns the changed descendant's blockId or null if nothing
 * within this block changed (caller decides whether the block itself is
 * the unit).
 */
function findChangedInBlock(prevBlock, newBlock) {
  const newFields = getContainerFields(newBlock);
  const prevFields = getContainerFields(prevBlock);
  // If container shape changed (added/removed a container field) the whole
  // block is the unit.
  if (newFields.length !== prevFields.length) return { unit: 'this' };

  for (let f = 0; f < newFields.length; f++) {
    const cur = newFields[f];
    const old = prevFields[f];
    // Items reorder/add/remove at this level → this block is the unit.
    if (!deepEqual(cur.items, old.items)) return { unit: 'this' };

    const changed = [];
    for (const childId of cur.items) {
      if (!deepEqual(cur.blocks[childId], old.blocks[childId])) changed.push(childId);
    }
    if (changed.length === 0) continue;
    if (changed.length > 1) return { unit: 'this' };

    // Exactly one child changed → recurse.
    const childId = changed[0];
    const inner = findChangedInBlock(old.blocks[childId], cur.blocks[childId]);
    if (inner?.unit === 'this') return { unit: 'block', blockId: childId };
    if (inner?.unit === 'block') return inner;
    // inner null → child differs but recursion found no diff (would be a
    // bug since we already proved data differs) — defensively return the
    // child as the unit.
    return { unit: 'block', blockId: childId };
  }
  return null;
}

/**
 * Public entry. Compares two top-level form data objects. The "page"
 * is the implicit container holding `blocks_layout.items` + `blocks`.
 */
export function findChangedUnit(prevForm, newForm) {
  if (deepEqual(prevForm, newForm)) return null;

  // Top-level items changed → render whole page.
  const prevItems = prevForm?.blocks_layout?.items || [];
  const newItems = newForm?.blocks_layout?.items || [];
  if (!deepEqual(prevItems, newItems)) return { unit: 'page' };

  // Find changed top-level blocks.
  const prevBlocks = prevForm?.blocks || {};
  const newBlocks = newForm?.blocks || {};
  const changed = [];
  for (const id of newItems) {
    if (!deepEqual(prevBlocks[id], newBlocks[id])) changed.push(id);
  }

  // No block data changed but forms differ → page-level scalar (title,
  // description, etc.) changed. Re-render page so the renderer can pick
  // up whatever the change was.
  if (changed.length === 0) return { unit: 'page' };
  if (changed.length > 1) return { unit: 'page' };

  // Exactly one top-level block changed — try to find a deeper unit.
  const blockId = changed[0];
  const inner = findChangedInBlock(prevBlocks[blockId], newBlocks[blockId]);
  if (inner?.unit === 'this') return { unit: 'block', blockId };
  if (inner?.unit === 'block') return inner;
  return { unit: 'block', blockId };
}
