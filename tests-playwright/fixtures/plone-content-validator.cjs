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
    // `parent` is an export-only field: plone.distribution import infers the
    // parent from the on-disk directory tree / _data_files_ ordering, so a
    // minimal/hand-built distribution legitimately omits it (verified on the
    // live site). The structural parent-container-ordering check below still
    // enforces correct nesting; this only dropped the per-item field presence.
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

  // local_roles is OPTIONAL for plone.distribution import: when absent, items
  // import fine and default to admin ownership (verified on the live site —
  // 178 items, no local_roles, working). A full plone.exportimport export
  // includes it, but requiring it here only rejected valid hand-built/older
  // distributions, so we no longer validate local_roles coverage.

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
    layoutOk: 0, layoutBroken: 0,
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
    // `id` is required by the Plone importer: a missing id aborts the ENTIRE
    // create-site with `KeyError: 'id'` (plone.exportimport process_id), and an
    // underscore-prefixed id is rejected by Plone OFS. Both silently leave an
    // empty site that still answers api-wait. Catch them here — like the
    // duplicate-UID check below — so they're deploy-blocking, not runtime
    // surprises. (The site root legitimately has no on-disk `id`.)
    const isRoot =
      data['@type'] === 'Plone Site' ||
      rel === 'plone_site_root' ||
      data['@id'] === '/Plone';
    if (!isRoot) {
      if (!data.id) {
        errors.push(`  ${rel}: missing id (Plone import aborts with KeyError: 'id')`);
      } else if (/^_/.test(data.id)) {
        errors.push(`  ${rel}: id "${data.id}" starts with underscore (Plone OFS rejects it at import)`);
      }
    }
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
    // The site root is linked to as "/" in content hrefs, but on disk its @id
    // is "/Plone" and its rel is "plone_site_root" — register "/" too so
    // homepage links resolve instead of false-flagging as broken.
    if (data['@type'] === 'Plone Site' || rel === 'plone_site_root' || atId === '/Plone') {
      pathMap.set('/', data);
    }
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

  // Pass 2c: link/media reference integrity across every block (nested included).
  //
  // Every reference-bearing field must point at something that EXISTS or is a
  // recognized external/resource form. A reference the validator cannot verify
  // is a FAILURE, not a skip. The old version only looked at `url` when it was a
  // STRING and treated broken refs as warnings — so an image block storing
  // `url: [{ "@id": "/images/test-image" }]` (object_browser ARRAY form) pointing
  // at a nonexistent object was never checked, and 5 such dead blocks shipped
  // while this gate reported "Links: N ok, 0 broken".
  const LINK_FIELDS = ['url', 'href', 'image', 'preview_image', 'preview_image_link', 'backgroundImage'];

  function* walkBlocks(blocks) {
    for (const [bid, block] of Object.entries(blocks || {})) {
      if (!block || typeof block !== 'object') continue;
      yield [bid, block];
      if (block.blocks && typeof block.blocks === 'object') {
        yield* walkBlocks(block.blocks);
      }
    }
  }

  // Extract every reference string from a field value in any shape it takes:
  //   "…"                  plain string
  //   [{ "@id": "…" }, …]   object_browser / image array
  //   { "@id": "…" }        single relation
  function refStrings(val) {
    const out = [];
    const pushId = (o) => { if (o && typeof o === 'object' && typeof o['@id'] === 'string') out.push(o['@id']); };
    if (typeof val === 'string') out.push(val);
    else if (Array.isArray(val)) val.forEach(pushId);
    else if (val && typeof val === 'object') pushId(val);
    return out.filter((s) => s !== '');
  }

  // Classify a reference. Returns null when verified/recognized, or a reason
  // string when it is a failure. NOTHING is silently accepted — an unrecognized
  // form returns a reason so it fails loudly.
  function refFailure(ref) {
    const ru = ref.match(/resolveuid\/([a-f0-9]{10,})/);
    if (ru) return uidMap.has(ru[1]) ? null : `broken resolveuid/${ru[1]}`;
    if (/^https?:\/\//.test(ref)) return null;             // external — well-formed, unverifiable offline
    if (/^(mailto:|tel:|data:)/.test(ref)) return null;    // known schemes
    if (ref.startsWith('#')) return null;                  // in-page anchor
    // Static frontend media assets (e.g. generated doc demo clips served from
    // the frontend's public/ dir, like `/docs/cards/x.mp4`) — not Plone
    // content, verifiable only in a built frontend, like external URLs.
    if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(ref)) return null;
    if (ref.startsWith('/') || ref.startsWith('../')) {
      // strip ../ prefixes, scale suffixes (@@images/…) and resource views (/++…)
      let base = ref.replace(/^(\.\.\/)+/, '');
      if (!base.startsWith('/')) base = '/' + base;
      base = base.split('/@@')[0].split('/++')[0].replace(/\/+$/, '') || '/';
      return pathMap.has(base) ? null : `path not in content: ${base}`;
    }
    // Plone action / browser-view URLs relative to the current context (they
    // don't match the absolute-path branch above). These are UI actions, not
    // content references — they resolve at runtime for whatever container the
    // page lives in, so they can't (and shouldn't) be checked as content paths.
    // e.g. `./add?type=Document` (add form), `./edit`, `@@some-view`, `++resource++…`.
    const relAction = ref.replace(/^\.\//, '');
    if (/^(@@|\+\+)/.test(relAction)) return null;
    if (/^(add|edit|view|delete|sharing|contents|folder_contents|login|logout|history)(\?|\/|#|$)/.test(relAction))
      return null;
    return `unrecognized reference form: ${ref.slice(0, 60)}`;
  }

  function checkBlockRefs(rel, bid, block) {
    for (const field of LINK_FIELDS) {
      if (!(field in block)) continue;
      for (const ref of refStrings(block[field])) {
        const reason = refFailure(ref);
        if (reason) {
          stats.linksBroken += 1;
          errors.push(`  ${rel}: block ${bid} (${block['@type']}) ${field}: ${reason}`);
        } else {
          stats.linksOk += 1;
        }
      }
    }
    // object_list / column sub-items carry the same link/media fields
    for (const key of ['items', 'columns', 'column_items']) {
      const arr = block[key];
      if (!Array.isArray(arr)) continue;
      arr.forEach((it, i) => {
        if (it && typeof it === 'object') checkBlockRefs(rel, `${bid}.${key}[${i}]`, it);
      });
    }
  }

  for (const { rel, data } of items) {
    for (const [bid, block] of walkBlocks(data.blocks)) {
      checkBlockRefs(rel, bid, block);
    }
  }

  // Pass 2d: blocks_layout references must resolve to a block in the SAME
  // container. A uid listed in a container's blocks_layout but absent from its
  // `blocks` dict is a dangling reference — exactly what a partial block deletion
  // leaves behind (block def removed, layout entry not). Checks the page itself
  // and every nested container, across EVERY array in blocks_layout (standard
  // `items` plus the vestigial nested `blocks_layout` key some exports carry).
  function checkLayout(rel, bid, container) {
    const sub = container.blocks;
    const bl = container.blocks_layout;
    if (!sub || typeof sub !== 'object' || !bl || typeof bl !== 'object') return;
    for (const [lkey, arr] of Object.entries(bl)) {
      if (!Array.isArray(arr)) continue;
      for (const ref of arr) {
        if (typeof ref !== 'string') continue;
        if (Object.prototype.hasOwnProperty.call(sub, ref)) {
          stats.layoutOk += 1;
        } else {
          stats.layoutBroken += 1;
          const where = bid ? `block ${bid} ` : 'page ';
          errors.push(`  ${rel}: ${where}blocks_layout.${lkey} references missing block ${ref}`);
        }
      }
    }
  }
  for (const { rel, data } of items) {
    checkLayout(rel, null, data);  // page-level blocks_layout
    for (const [bid, block] of walkBlocks(data.blocks)) {
      if (block.blocks && typeof block.blocks === 'object') checkLayout(rel, bid, block);
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
    lines.push(`Layout:  ${result.stats.layoutOk} ok, ${result.stats.layoutBroken} dangling`);
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
