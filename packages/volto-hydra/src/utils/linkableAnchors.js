import { buildBlockPathMap, getBlockById } from './blockPath';

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
 * Merge a harvested anchor map ({ [blockUid]: [{id,name,level}] }) into content's
 * blocks. Sets _linkableAnchors on blocks named in the map; clears it on blocks
 * that lost theirs. Returns new content (never mutates the input). Used by the
 * admin's LINKABLE_ANCHORS handler to fold hydra's harvest into the live formData.
 *
 * Uses a deep clone + in-place mutation via each block's getBlockById reference,
 * NOT updateBlockById — rebuilding the tree along a path drops sibling blocks on
 * template/slot pages (observed: a newly-added slot block vanished on save).
 */
export function mergeAnchorsIntoContent(content, anchorsMap, blocksConfig, intl = {}) {
  const next = JSON.parse(JSON.stringify(content));
  const pmap = buildBlockPathMap(next, blocksConfig, intl);
  for (const uid of Object.keys(pmap)) {
    if (uid.startsWith('_')) continue;
    const block = getBlockById(next, pmap, uid); // reference into `next`
    if (!block) continue;
    // Never write anchors onto readonly blocks — that content is owned by the
    // template. A fixed-but-editable block (fixed:true, readOnly:false) is still
    // editable, so its anchors DO belong to the instance — don't skip it.
    if (block.readOnly) continue;
    const want = anchorsMap?.[uid];
    if (want && want.length) block._linkableAnchors = want;
    else delete block._linkableAnchors;
  }
  return next;
}
