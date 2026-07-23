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
