import { buildBlockPathMap, getBlockById, updateBlockById } from './blockPath';

/**
 * Collect a content item's linkable anchors in document order.
 *
 * Order comes from buildBlockPathMap, whose keys follow blocks_layout traversal
 * (recursing containers) — never the arbitrary `blocks` dict order.
 *
 * @param {object} content - full content object (blocks + blocks_layout)
 * @param {object} blocksConfig - registry blocks config
 * @param {object} [intl]
 * @returns {Array<{id: string, name: string, blockUid: string}>}
 */
export function collectAnchorsFromContent(content, blocksConfig, intl = {}) {
  const pmap = buildBlockPathMap(content, blocksConfig, intl);
  const anchors = [];
  for (const uid of Object.keys(pmap)) {
    if (uid.startsWith('_')) continue; // skip meta keys (_schemas, ...)
    const block = getBlockById(content, pmap, uid);
    const list = block?._linkableAnchors;
    if (!list) continue;
    for (const a of list) anchors.push({ ...a, blockUid: uid });
  }
  return anchors;
}

/**
 * Seed the transient anchor store from a content item's saved
 * block._linkableAnchors → { [blockUid]: [{id,name}] }. Used on load.
 */
export function seedAnchorsFromContent(content, blocksConfig, intl = {}) {
  const pmap = buildBlockPathMap(content, blocksConfig, intl);
  const map = {};
  for (const uid of Object.keys(pmap)) {
    if (uid.startsWith('_')) continue;
    const block = getBlockById(content, pmap, uid);
    if (block?._linkableAnchors?.length) map[uid] = block._linkableAnchors;
  }
  return map;
}

/**
 * Ordered anchors for the page being edited, read from the transient store map
 * rather than the blocks (which don't carry _linkableAnchors during editing).
 */
export function collectAnchorsFromStore(content, anchorsMap, blocksConfig, intl = {}) {
  const pmap = buildBlockPathMap(content, blocksConfig, intl);
  const anchors = [];
  for (const uid of Object.keys(pmap)) {
    if (uid.startsWith('_')) continue;
    const list = anchorsMap?.[uid];
    if (!list) continue;
    for (const a of list) anchors.push({ ...a, blockUid: uid });
  }
  return anchors;
}

/**
 * Write the transient anchor store back into the blocks (for save). Sets
 * _linkableAnchors on blocks named in the map; clears it on blocks that lost
 * theirs. Returns new content (never mutates the input).
 */
export function mergeAnchorsIntoContent(content, anchorsMap, blocksConfig, intl = {}) {
  const pmap = buildBlockPathMap(content, blocksConfig, intl);
  let next = content;
  for (const uid of Object.keys(pmap)) {
    if (uid.startsWith('_')) continue;
    const block = getBlockById(next, pmap, uid);
    if (!block) continue;
    const want = anchorsMap?.[uid];
    const have = block._linkableAnchors;
    if (JSON.stringify(want || null) === JSON.stringify(have || null)) continue;
    const updated = { ...block };
    if (want && want.length) updated._linkableAnchors = want;
    else delete updated._linkableAnchors;
    next = updateBlockById(next, pmap, uid, updated);
  }
  return next;
}
