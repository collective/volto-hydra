/**
 * Read a README-shaped markdown tree as Plone content items.
 *
 * This is the reader the mock API mounts, and the same one the CI agreement
 * check runs — if they were separate implementations, the check would verify
 * something the server does not do.
 *
 * The exported markdown carries authored fields only. Server state is DERIVED
 * from the tree, because the tree already knows it:
 *
 *   parent          the containing folder. `enrichContent` reads this and,
 *                   when it is absent, defaults to the site root — so a page
 *                   at /docs/architecture would claim / as its parent and the
 *                   admin's breadcrumb and object browser would both be wrong.
 *   is_folderish    whether this file is an index.md with siblings. Read with
 *                   a default of `true`, so every leaf page would otherwise
 *                   look like a folder in navigation.
 *   position        sibling order, from the folder's `order:` frontmatter.
 *
 * Nothing here needs a schema: the markdown says which containers hold field
 * items and which construct fills each field.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { mdToPage } from './blockmd.mjs';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif']);
export const BLOB_FIELD = { Image: 'image', File: 'file' };

/**
 * What a blob's content object looks like when nothing is set.
 *
 * Held in one place because the exporter writes only what DIFFERS from this
 * and the reader restores the rest -- two lists would drift, and the field
 * that went missing would just be quietly absent.
 */
export function blobDefaults(type, filename) {
  return {
    title: filename,
    description: '',
    rights: '',
    exclude_from_nav: true,
    language: '##DEFAULT##',
    subjects: [],
    creators: ['admin'],
    contributors: [],
    allow_discussion: false,
    review_state: null,
    effective: null,
    expires: null,
    layout: type === 'Image' ? 'image_view' : 'file_view',
  };
}
const typeForFile = (f) => (IMAGE_EXT.has(extname(f).toLowerCase()) ? 'Image' : 'File');

/**
 * Width and height from the file itself.
 *
 * The format rests on these not being stored. A stored width can drift from
 * the file it describes; a computed one cannot — and one had already drifted:
 * an mp4 recorded 374638 bytes for a 433934-byte file.
 */
export function dimensions(file) {
  const b = readFileSync(file);
  const ext = extname(file).toLowerCase();
  if (ext === '.png') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0..SOF15, excluding the non-frame markers in that range
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    throw new Error(`no SOF marker in ${file}`);
  }
  if (ext === '.svg') {
    const t = b.toString('utf8', 0, 2000);
    const w = /\bwidth="([\d.]+)/.exec(t), h = /\bheight="([\d.]+)/.exec(t);
    if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
    const vb = /viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/.exec(t);
    if (vb) return { width: Number(vb[1]), height: Number(vb[2]) };
    throw new Error(`no dimensions in ${file}`);
  }
  throw new Error(`unsupported image type ${ext}`);
}

function walk(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, hits);
    else hits.push(p);
  }
  return hits;
}

/** A markdown tree is one with an index.md at its root. */
export function isMarkdownTree(dir) {
  return existsSync(join(dir, 'index.md'));
}

/** file path in the tree -> content path */
function idFor(root, file) {
  const rel = relative(root, file).replace(/\\/g, '/');
  if (rel === 'index.md') return '/';
  return `/${rel.replace(/\/index\.md$/, '').replace(/\.md$/, '')}`;
}

/**
 * Read the tree. Returns items keyed by content path, plus the blob file each
 * one came from so the server can hand over the bytes.
 */
export function readTree(root) {
  const items = new Map();
  const blobFiles = new Map();      // content path -> absolute file path
  const order = new Map();          // folder path -> child ids, in order

  for (const file of walk(root)) {
    if (!file.endsWith('.md')) continue;
    const page = mdToPage(readFileSync(file, 'utf8'));
    const id = idFor(root, file);
    page['@id'] = id;

    // `order:` and `blobs:` describe the FOLDER, not the page's own content.
    if (page.order) { order.set(id, page.order); delete page.order; }
    const blobs = page.blobs || [];
    delete page.blobs;
    items.set(id, page);

    for (const entry of blobs) {
      const blob = join(dirname(file), entry.file);
      if (!existsSync(blob)) {
        throw new Error(`${id}: blobs lists ${entry.file}, which is not on disk`);
      }
      const ext = extname(entry.file).toLowerCase();
      if (!MIME[ext]) throw new Error(`${id}: no content type known for ${entry.file}`);
      const bid = entry.id ?? entry.file.replace(/\.[^.]+$/, '');
      const type = entry.type ?? typeForFile(entry.file);
      // Only images have pixel dimensions; a video or a PDF has size and type.
      const meta = { filename: entry.file, 'content-type': MIME[ext], size: statSync(blob).size };
      if (type === 'Image') Object.assign(meta, dimensions(blob));
      const bpath = `${id === '/' ? '' : id}/${bid}`;
      // The entry carries only what differs from the defaults; the rest is
      // restored. `blob_path` is what makes the server's existing transform
      // add the download URL and the scale set, so a blob served from
      // markdown looks the same as one served from JSON.
      const { file: _f, uid: _u, id: _i, type: _t, ...overrides } = entry;
      items.set(bpath, {
        '@id': bpath,
        '@type': type,
        UID: entry.uid,
        id: bid,
        ...blobDefaults(type, entry.file),
        ...overrides,
        [BLOB_FIELD[type]]: { blob_path: relative(root, blob), ...meta },
      });
      blobFiles.set(bpath, blob);
    }
  }

  deriveServerState(items, order);
  return { items, blobFiles, order };
}

/** Everything the markdown deliberately does not store, from tree position. */
function deriveServerState(items, order) {
  const parentPathOf = (p) => (p === '/' ? null : (p.slice(0, p.lastIndexOf('/')) || '/'));

  const childCount = new Map();
  for (const path of items.keys()) {
    const parent = parentPathOf(path);
    if (parent !== null) childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
  }

  for (const [path, item] of items) {
    if (!item.id) item.id = path === '/' ? '' : path.slice(path.lastIndexOf('/') + 1);
    item.is_folderish = (childCount.get(path) ?? 0) > 0;

    const parentPath = parentPathOf(path);
    const parent = parentPath === null ? null : items.get(parentPath);
    if (parent) {
      item.parent = {
        '@id': parentPath,
        '@type': parent['@type'],
        UID: parent.UID,
        title: parent.title,
        description: parent.description ?? '',
      };
    }

    // Sibling order, from the folder's `order:` list. A child the list does
    // not name gets no position rather than a made-up one, which is what
    // `getObjPositionInParent` means.
    const siblings = parentPath === null ? null : order.get(parentPath);
    const at = siblings ? siblings.indexOf(item.id) : -1;
    if (at >= 0) item.getObjPositionInParent = at;
  }
}
