/**
 * Validate and integrity-check a plone.exportimport content tree.
 *
 * Two entry points:
 *   validate(contentDir) — export shape: _data_files_/_blob_files_ consistency,
 *                          parent/UID/id presence, Image blob paths, ordering
 *   checkIntegrity(contentDir) — graph integrity: resolveuid refs, image refs,
 *                                teaser/button hrefs, parent containers
 *
 * Both return { errors: string[], warnings: string[], stats: object }.
 * Mirrors the behaviour of pretagov-site/{validate,test}-content.py so the
 * same errors surface whether invoked at mock-api startup or from a CI
 * script.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listDataEntries(contentDir) {
  const out = [];
  for (const name of fs.readdirSync(contentDir)) {
    const dataFile = path.join(contentDir, name, 'data.json');
    if (fs.statSync(path.join(contentDir, name), { throwIfNoEntry: false })?.isDirectory()
        && fs.existsSync(dataFile)) {
      out.push({ name, dataFile });
    }
  }
  return out;
}

/** Recursively walk every data.json under contentDir, yielding { rel, data }. */
function* walkData(contentDir) {
  const stack = [contentDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const dataPath = path.join(dir, 'data.json');
    if (fs.existsSync(dataPath)) {
      const rel = path.relative(contentDir, dir) || '.';
      yield { rel, data: readJson(dataPath), dir };
    }
    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(dir, e.name));
    }
  }
}

/**
 * Export-shape validation. Mirrors validate-content.py, plus a few checks
 * we've learned about the hard way at site-creation time:
 *
 *   - `id` starting with underscore — Plone OFS rejects with
 *     "BadRequest: The id ... is invalid because it begins with an underscore"
 *     (see Products/CMFCore/PortalFolder.py).
 *   - Top-level `content` key in __metadata__.json — Plone's
 *     ExportImportMetadata.__init__ rejects unknown kwargs at site creation
 *     and the whole import aborts before any content is created.
 *   - Every UID has a local_roles entry — without it, the imported page
 *     has no owner and may not be reachable from the admin.
 *
 * Walks the entire content tree (not just direct children) so nested
 * pages catch the same failures as top-level ones.
 */
function validate(contentDir) {
  const errors = [];
  const warnings = [];
  const stats = { dataFiles: 0, blobFiles: 0 };

  const metaPath = path.join(contentDir, '__metadata__.json');
  if (!fs.existsSync(metaPath)) {
    errors.push(`${metaPath} not found`);
    return { errors, warnings, stats };
  }
  const meta = readJson(metaPath);
  const listed = new Set(meta._data_files_ || []);
  const listedBlobs = new Set(meta._blob_files_ || []);
  stats.dataFiles = listed.size;
  stats.blobFiles = listedBlobs.size;

  // Required sibling files one level above the content dir
  const parentDir = path.dirname(contentDir);
  for (const req of ['discussions.json', 'portlets.json', 'principals.json', 'redirects.json']) {
    if (!fs.existsSync(path.join(parentDir, req))) {
      errors.push(`  Missing ${req} in ${parentDir}/`);
    }
  }

  // ExportImportMetadata is a strict dataclass — unknown kwargs raise TypeError.
  // The legitimate top-level keys here are:
  //   __version__, _blob_files_, _data_files_, default_page, local_roles,
  //   ordering, relations
  if ('content' in meta) {
    errors.push("  __metadata__.json has top-level 'content' key — ExportImportMetadata rejects this at site creation. Use 'local_roles' instead.");
  }

  // redirects.json shape: plone.exportimport's set_redirects expects a
  // flat Dict[str, str] mapping {old_path: new_path}. The REST API's
  // @aliases response uses an `{items: [{path, redirect-to, ...}]}` array
  // shape — easy to confuse the two. The importer iterates `data.items()`
  // and crashes with `'list' object has no attribute 'endswith'` if you
  // feed it the items-array shape. Catching this here keeps a bad
  // redirects.json from silently breaking site bootstrap on deploy.
  const redirectsPath = path.join(parentDir, 'redirects.json');
  if (fs.existsSync(redirectsPath)) {
    let redirectsData;
    try { redirectsData = readJson(redirectsPath); }
    catch (e) { errors.push(`  redirects.json: invalid JSON (${e.message})`); }
    if (redirectsData !== undefined) {
      if (Array.isArray(redirectsData) || typeof redirectsData !== 'object' || redirectsData === null) {
        errors.push(`  redirects.json: must be a plain {path: target} object, got ${Array.isArray(redirectsData) ? 'array' : typeof redirectsData}`);
      } else {
        for (const [key, value] of Object.entries(redirectsData)) {
          if (typeof value !== 'string') {
            errors.push(`  redirects.json: value for "${key}" is ${Array.isArray(value) ? 'an array' : typeof value} — use {"/old": "/new"}, not the REST-API {items: [...]} shape`);
          } else if (!key.startsWith('/') || !value.startsWith('/')) {
            errors.push(`  redirects.json: paths must be absolute (start with /): ${JSON.stringify(key)} -> ${JSON.stringify(value)}`);
          }
        }
      }
    }
  }

  // Per-item checks on EVERY data.json in the tree (not just direct children)
  const allUids = new Set();
  for (const { rel, data, dir } of walkData(contentDir)) {
    const relSlash = rel.split(path.sep).join('/');
    const entry = relSlash === '.' ? 'data.json' : `${relSlash}/data.json`;
    const isRoot = relSlash === 'plone_site_root';
    const contentType = data['@type'] || '?';

    if (entry !== 'data.json' && !listed.has(entry)) {
      errors.push(`  ${entry} on disk but not in __metadata__.json _data_files_`);
    }
    if (!isRoot && !data.UID) {
      errors.push(`  ${entry} missing UID`);
    }
    if (!isRoot && !data.parent) {
      errors.push(`  ${entry} missing parent`);
    }
    if (!data.id) {
      errors.push(`  ${entry} has empty id`);
    } else if (/^_/.test(data.id)) {
      errors.push(`  ${entry} id "${data.id}" starts with underscore (Plone OFS rejects this at import)`);
    }
    if (data.UID) allUids.add(data.UID);

    if (contentType === 'Image') {
      const img = data.image || {};
      const blobPath = img.blob_path || '';
      const download = img.download || '';
      if (download && download.startsWith('http')) {
        errors.push(`  ${entry} image has remote URL instead of blob_path: ${download.slice(0, 80)}`);
      } else if (blobPath) {
        const fullBlob = path.join(contentDir, blobPath);
        if (!fs.existsSync(fullBlob)) {
          errors.push(`  ${entry} blob_path file missing: ${blobPath}`);
        }
        if (!listedBlobs.has(blobPath)) {
          warnings.push(`  ${entry} blob_path not in _blob_files_: ${blobPath}`);
        }
      } else if (!blobPath && !download) {
        warnings.push(`  ${entry} Image has no image data`);
      }
    }
  }

  // Every non-root listing should have its parent container also listed
  for (const entry of listed) {
    const parts = entry.split('/');
    if (parts.length > 2 && parts[0] !== 'plone_site_root') {
      const parentEntry = parts.slice(0, -2).join('/') + '/data.json';
      if (!listed.has(parentEntry)) {
        errors.push(`  ${entry} parent container missing: ${parentEntry}`);
      }
    }
  }

  // Ordering: parents must appear before their children in _data_files_
  const listedList = meta._data_files_ || [];
  const seenParents = new Set();
  for (const entry of listedList) {
    const parts = entry.split('/');
    if (parts.length > 2 && parts[0] !== 'plone_site_root') {
      const parentEntry = parts.slice(0, -2).join('/') + '/data.json';
      if (listed.has(parentEntry) && !seenParents.has(parentEntry)) {
        errors.push(`  ${entry} appears before its parent ${parentEntry} in _data_files_`);
      }
    }
    seenParents.add(entry);
  }

  // Listed entries must exist on disk
  for (const entry of listed) {
    if (!fs.existsSync(path.join(contentDir, entry))) {
      errors.push(`  ${entry} in _data_files_ but missing from disk`);
    }
  }
  for (const entry of listedBlobs) {
    if (!fs.existsSync(path.join(contentDir, entry))) {
      errors.push(`  ${entry} in _blob_files_ but missing from disk`);
    }
  }

  // local_roles coverage: every UID needs an entry; every entry needs a UID.
  const localRoles = meta.local_roles || {};
  for (const uid of allUids) {
    if (!(uid in localRoles)) {
      errors.push(`  UID ${uid} not in __metadata__.json local_roles`);
    }
  }
  for (const uid of Object.keys(localRoles)) {
    if (!allUids.has(uid)) {
      warnings.push(`  UID ${uid} listed in local_roles but no on-disk data.json claims it`);
    }
  }

  return { errors, warnings, stats };
}

/**
 * Graph integrity. Mirrors test-content.py.
 */
function checkIntegrity(contentDir) {
  const errors = [];
  const warnings = [];
  const stats = {
    items: 0,
    imagesOk: 0, imagesBroken: 0,
    resolveuidOk: 0, resolveuidBroken: 0,
    linksOk: 0, linksBroken: 0,
  };

  // Pass 1: build UID → relpath and path → data
  // Detect duplicate UIDs as we go — two content items sharing one UID
  // makes Plone's catalog throw `A different document with value '<UID>'
  // already exists in the index` during create-site, which silently leaves
  // half the import incomplete (missing nav items, redirects don't install,
  // etc.) while the API still responds enough to pass api-wait. Catching
  // this here turns it into a deploy-blocking validate failure.
  const uidMap = new Map();
  const pathMap = new Map();
  const items = [];
  for (const { rel, data, dir } of walkData(contentDir)) {
    items.push({ rel, data, dir });
    if (data.UID) {
      if (uidMap.has(data.UID)) {
        errors.push(`  ${rel}: duplicate UID ${data.UID} (also in ${uidMap.get(data.UID)})`);
      } else {
        uidMap.set(data.UID, rel);
      }
    }
    const atId = data['@id'];
    if (atId) pathMap.set(atId, data);
    pathMap.set('/' + rel.split(path.sep).join('/'), data);
  }
  stats.items = uidMap.size;

  // Pass 2a: resolveuid references
  const resolveuidRe = /(?:\.\.\/)*resolveuid\/([a-f0-9]{10,})/g;
  for (const { rel, dir } of items) {
    const text = fs.readFileSync(path.join(dir, 'data.json'), 'utf8');
    let m;
    while ((m = resolveuidRe.exec(text)) !== null) {
      const uid = m[1];
      if (uidMap.has(uid)) {
        stats.resolveuidOk += 1;
      } else {
        stats.resolveuidBroken += 1;
        errors.push(`  ${rel}: broken resolveuid/${uid}`);
      }
    }
  }

  // Pass 2b: Image content items have blob files
  for (const { rel, data } of items) {
    if (data['@type'] !== 'Image') continue;
    const img = data.image || {};
    const blobPath = img.blob_path || '';
    const download = img.download || '';
    if (download && download.startsWith('http')) {
      errors.push(`  ${rel}: image has remote URL (not blob_path): ${download.slice(0, 60)}`);
      stats.imagesBroken += 1;
    } else if (blobPath) {
      if (fs.existsSync(path.join(contentDir, blobPath))) {
        stats.imagesOk += 1;
      } else {
        errors.push(`  ${rel}: blob file missing: ${blobPath}`);
        stats.imagesBroken += 1;
      }
    } else {
      errors.push(`  ${rel}: Image has no image data`);
      stats.imagesBroken += 1;
    }
  }

  // Pass 2c: Internal link refs in blocks. Covers any block's plain `url`
  // string (image, hero, button, ...) and `href` link-object arrays
  // (teaser/button/cta), walking nested blocks (sections, grids, columns)
  // — not just the top level, so a broken CTA inside a section is caught too.
  const isInternalPath = (u) =>
    typeof u === 'string' && u.startsWith('/') &&
    !u.includes('resolveuid') && !u.includes('@@') && !u.includes('/++');

  function* walkBlocks(blocks) {
    for (const [bid, block] of Object.entries(blocks || {})) {
      if (!block || typeof block !== 'object') continue;
      yield [bid, block];
      if (block.blocks && typeof block.blocks === 'object') {
        yield* walkBlocks(block.blocks);
      }
    }
  }

  for (const { rel, data } of items) {
    for (const [bid, block] of walkBlocks(data.blocks)) {
      // Plain string url on any block (hero CTA, image, button-with-url, ...)
      if (isInternalPath(block.url)) {
        if (pathMap.has(block.url)) {
          stats.linksOk += 1;
        } else {
          warnings.push(`  ${rel}: block ${bid} (${block['@type']}) url references missing: ${block.url}`);
          stats.linksBroken += 1;
        }
      }
      // href link-object arrays (teaser/button/cta)
      if (Array.isArray(block.href)) {
        for (const h of block.href) {
          const linkId = (h && typeof h === 'object') ? (h['@id'] || '') : '';
          if (isInternalPath(linkId)) {
            if (pathMap.has(linkId)) {
              stats.linksOk += 1;
            } else {
              warnings.push(`  ${rel}: block ${bid} href references missing: ${linkId}`);
              stats.linksBroken += 1;
            }
          }
        }
      }
    }
  }

  // Parent containers (metadata cross-check for completeness)
  const metaPath = path.join(contentDir, '__metadata__.json');
  if (fs.existsSync(metaPath)) {
    const meta = readJson(metaPath);
    const listed = new Set(meta._data_files_ || []);
    for (const entry of listed) {
      const parts = entry.split('/');
      if (parts.length > 2 && parts[0] !== 'plone_site_root') {
        const parentEntry = parts.slice(0, -2).join('/') + '/data.json';
        if (!listed.has(parentEntry)) {
          errors.push(`  ${entry}: parent container missing (${parentEntry})`);
        }
      }
    }
  }

  return { errors, warnings, stats };
}

function formatReport(title, result) {
  const lines = [];
  if (title === 'validate') {
    lines.push(`Content export OK: ${result.stats.dataFiles} data files, ${result.stats.blobFiles} blob files`);
  } else {
    lines.push(`Content: ${result.stats.items} items`);
    lines.push(`Images:  ${result.stats.imagesOk} ok, ${result.stats.imagesBroken} broken`);
    lines.push(`UIDs:    ${result.stats.resolveuidOk} resolved, ${result.stats.resolveuidBroken} broken`);
    lines.push(`Links:   ${result.stats.linksOk} ok, ${result.stats.linksBroken} broken`);
  }
  if (result.errors.length) {
    lines.push('');
    lines.push(`ERRORS (${result.errors.length}):`);
    for (const e of result.errors) lines.push(e);
  }
  if (result.warnings.length) {
    lines.push('');
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) lines.push(w);
  }
  return lines.join('\n');
}

module.exports = { validate, checkIntegrity, formatReport };
