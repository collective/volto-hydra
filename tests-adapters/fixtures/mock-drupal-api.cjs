/**
 * Mock Drupal JSON:API.
 *
 * Response SHAPES come from tests-adapters/fixtures/drupal/, captured from a
 * real drupal:11 by capture/capture-drupal.sh — a static replay cannot serve
 * writes, so behaviour is simulated while the shape stays honest. The
 * normalizer's tests run against the raw capture, so drift between the two
 * shows up there.
 *
 * Two Drupal facts drive the design:
 *
 *  - Nodes are FLAT. Hierarchy comes from menu_link_content, per the design
 *    decision recorded in the spec (§8b). A node with no menu link has no
 *    place in the tree, so it surfaces in a virtual folder instead of
 *    vanishing.
 *  - A path alias is the document's URL and carries no structure. Moving a
 *    document re-parents its MENU LINK and must not rewrite the alias.
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8791;
const BASE = () => `http://127.0.0.1:${PORT}`;

const SEED_PATH =
  process.env.SEED_PATH ||
  path.join(__dirname, '..', '..', 'tests-adapters', 'fixtures', 'seed.json');

/** The virtual folder holding content that has no menu link yet. */
const UNFILED_PATH = '/_unfiled';

app.use(cors());
app.use(express.json({ type: ['application/json', 'application/vnd.api+json'], limit: '50mb' }));

// --- state ---------------------------------------------------------------
let nodes = new Map(); // uuid -> {uuid, nid, type, title, alias, blocks, status}
let menuLinks = new Map(); // uuid -> {uuid, nodeUuid, parentUuid, weight}
let terms = new Map(); // vocab -> [{uuid, name, slug}]
let files = new Map(); // uuid -> {uuid, filename, mime, bytes}
let nextNid = 1;

const uuid = () => crypto.randomUUID();

function seed() {
  nodes = new Map();
  menuLinks = new Map();
  files = new Map();
  nextNid = 1;

  const spec = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const byPath = new Map();

  for (const doc of spec.documents) {
    if (doc.path === '/') continue; // Drupal has no root document
    const id = uuid();
    nodes.set(id, {
      uuid: id,
      nid: nextNid++,
      type: 'page',
      title: doc.title,
      alias: doc.path,
      blocks: JSON.stringify({
        v: 1,
        blocks: doc.blocks ?? {},
        blocksLayout: doc.blocksLayout ?? { items: [] },
      }),
      status: doc.state === 'published',
    });
    byPath.set(doc.path, id);
  }

  // Menu links mirror the seed's path nesting — that is what makes the seed's
  // hierarchy expressible in a CMS that has none of its own.
  const linkByNode = new Map();
  const sorted = [...byPath.keys()].sort(
    (a, b) => a.split('/').length - b.split('/').length,
  );
  for (const p of sorted) {
    const parentPath = '/' + p.split('/').filter(Boolean).slice(0, -1).join('/');
    const parentNode = parentPath === '/' ? null : byPath.get(parentPath);
    const id = uuid();
    menuLinks.set(id, {
      uuid: id,
      nodeUuid: byPath.get(p),
      parentUuid: parentNode ? linkByNode.get(parentNode) : null,
      weight: 0,
    });
    linkByNode.set(byPath.get(p), id);
  }

  const vocab = spec.vocabularies?.categories;
  terms.set(
    'categories',
    Array.from({ length: vocab?.generate ?? 0 }, (_, i) => ({
      uuid: uuid(),
      name: `${vocab.titlePrefix}${i}`,
      slug: `${vocab.tokenPrefix}${i}`,
    })),
  );
}

// --- helpers -------------------------------------------------------------
const nodeByAlias = (alias) =>
  [...nodes.values()].find((n) => n.alias === alias) || null;

const linkForNode = (nodeUuid) =>
  [...menuLinks.values()].find((l) => l.nodeUuid === nodeUuid) || null;

const childLinks = (parentLinkUuid) =>
  [...menuLinks.values()].filter((l) => l.parentUuid === parentLinkUuid);

/** Serialise one node in the captured JSON:API shape. */
function toResource(n) {
  return {
    type: `node--${n.type}`,
    id: n.uuid,
    links: { self: { href: `${BASE()}/jsonapi/node/${n.type}/${n.uuid}` } },
    attributes: {
      drupal_internal__nid: n.nid,
      title: n.title,
      status: n.status,
      created: '2026-01-01T00:00:00+00:00',
      changed: '2026-01-01T00:00:00+00:00',
      path: { alias: n.alias, pid: n.nid, langcode: 'en' },
      field_hydra_blocks: n.blocks,
    },
    relationships: {
      node_type: {
        data: { type: 'node_type--node_type', id: `type-${n.type}` },
      },
      uid: { data: { type: 'user--user', id: 'user-admin' } },
    },
  };
}

const collection = (items) => ({
  jsonapi: { version: '1.0' },
  data: items,
  links: { self: { href: BASE() } },
  meta: { count: items.length },
});

const single = (item) => ({ jsonapi: { version: '1.0' }, data: item });

/**
 * Express parses `filter[title][value]=x` into a NESTED object, so looking up
 * the literal bracketed string never matches. Read the parsed shape and
 * accept the shorthand `filter[title]=x` too, which is what JSON:API allows.
 */
function filterValue(req, field) {
  const filter = req.query.filter;
  if (!filter) return undefined;
  const entry = filter[field];
  if (entry === undefined) return undefined;
  return typeof entry === 'object' ? entry.value : entry;
}

function pageLimit(req) {
  const page = req.query.page;
  const limit = page && typeof page === 'object' ? page.limit : undefined;
  return limit === undefined ? undefined : Number(limit);
}

const notFound = (res, what) =>
  res.status(404).json({ errors: [{ status: '404', detail: `Not found: ${what}` }] });

// --- auth ----------------------------------------------------------------
// Drupal writes need a CSRF token; the contract's expireSession invalidates it.
const VALID_TOKEN = 'drupal-csrf-token';

function authed(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  // Bad credentials fail everything, reads included — that is what an expired
  // session actually looks like.
  if (user !== 'admin' || pass !== 'admin') return false;
  // Writes additionally need the CSRF token, as real Drupal requires.
  if (req.method === 'GET') return true;
  return req.headers['x-csrf-token'] === VALID_TOKEN;
}

app.use((req, res, next) => {
  if (req.path.startsWith('/jsonapi') && !authed(req)) {
    return res.status(401).json({ errors: [{ status: '401', detail: 'Unauthorized' }] });
  }
  next();
});

app.get('/session/token', (req, res) => res.type('text').send(VALID_TOKEN));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- root ----------------------------------------------------------------
app.get('/jsonapi', (req, res) =>
  res.json({ jsonapi: { version: '1.0' }, data: [], links: { self: { href: `${BASE()}/jsonapi` } } }),
);

// --- users ---------------------------------------------------------------
app.get('/jsonapi/user/user', (req, res) =>
  res.json(
    collection([
      {
        type: 'user--user',
        id: 'user-admin',
        attributes: {
          display_name: 'admin',
          name: 'admin',
          mail: 'admin@example.com',
          roles: ['authenticated', 'administrator'],
        },
      },
    ]),
  ),
);

// --- types & schema ------------------------------------------------------
app.get('/jsonapi/node_type/node_type', (req, res) =>
  res.json(
    collection(
      ['page', 'article'].map((t) => ({
        type: 'node_type--node_type',
        id: `type-${t}`,
        attributes: { drupal_internal__type: t, name: t === 'page' ? 'Basic page' : 'Article' },
      })),
    ),
  ),
);

app.get('/jsonapi/field_config/field_config', (req, res) =>
  res.json(
    collection(
      [
        ['title', 'Title', 'string', true],
        ['field_hydra_blocks', 'Hydra blocks', 'string_long', false],
        ['status', 'Published', 'boolean', false],
      ].map(([name, label, type, required]) => ({
        type: 'field_config--field_config',
        id: `field-${name}`,
        attributes: {
          field_name: name,
          label,
          field_type: type,
          required,
          bundle: 'page',
          entity_type: 'node',
        },
      })),
    ),
  ),
);

// --- taxonomy ------------------------------------------------------------
app.get('/jsonapi/taxonomy_term/:vocab', (req, res) => {
  const all = terms.get(req.params.vocab);
  if (!all) return notFound(res, req.params.vocab);
  const nameFilter = filterValue(req, 'name');
  const limit = pageLimit(req) ?? 25;
  const matched = nameFilter
    ? all.filter((t) => t.name.includes(String(nameFilter)))
    : all;
  res.json({
    jsonapi: { version: '1.0' },
    data: matched.slice(0, limit).map((t) => ({
      type: `taxonomy_term--${req.params.vocab}`,
      id: t.uuid,
      attributes: { name: t.name, drupal_internal__tid: 1 },
    })),
    meta: { count: matched.length },
  });
});

// --- menu links (the hierarchy) -----------------------------------------
app.get('/jsonapi/menu_link_content/menu_link_content', (req, res) => {
  const parent = filterValue(req, 'parent');
  const list = [...menuLinks.values()].filter((l) =>
    parent === undefined ? true : (l.parentUuid ?? '') === (parent === 'null' ? '' : parent),
  );
  res.json(
    collection(
      list.map((l) => ({
        type: 'menu_link_content--menu_link_content',
        id: l.uuid,
        attributes: { weight: l.weight, enabled: true },
        relationships: {
          node: { data: { type: 'node--page', id: l.nodeUuid } },
          parent: {
            data: l.parentUuid
              ? { type: 'menu_link_content--menu_link_content', id: l.parentUuid }
              : null,
          },
        },
      })),
    ),
  );
});

app.patch('/jsonapi/menu_link_content/menu_link_content/:uuid', (req, res) => {
  const link = menuLinks.get(req.params.uuid);
  if (!link) return notFound(res, req.params.uuid);
  // PATCH is a PARTIAL update: a field that is absent means "leave it alone",
  // not "set it to null". Treating absence as null made a weight-only PATCH
  // silently detach the link from its parent and flatten the whole tree.
  const relationships = req.body?.data?.relationships;
  if (relationships && 'parent' in relationships) {
    const rel = relationships.parent?.data;
    link.parentUuid = rel ? rel.id : null;
  }
  if (req.body?.data?.attributes?.weight !== undefined) {
    link.weight = req.body.data.attributes.weight;
  }
  res.json(single({ type: 'menu_link_content--menu_link_content', id: link.uuid }));
});

app.post('/jsonapi/menu_link_content/menu_link_content', (req, res) => {
  const rel = req.body?.data?.relationships ?? {};
  const id = uuid();
  menuLinks.set(id, {
    uuid: id,
    nodeUuid: rel.node?.data?.id ?? null,
    parentUuid: rel.parent?.data?.id ?? null,
    weight: req.body?.data?.attributes?.weight ?? 0,
  });
  res.status(201).json(single({ type: 'menu_link_content--menu_link_content', id }));
});

// --- files ---------------------------------------------------------------
app.post('/jsonapi/:entity/:bundle/field_media_image', (req, res) => {
  const id = uuid();
  const filename = String(req.headers['content-disposition'] || 'file="upload.png"')
    .split('filename=')
    .pop()
    .replace(/["']/g, '')
    .trim();
  files.set(id, {
    uuid: id,
    filename,
    mime: req.headers['content-type'] || 'application/octet-stream',
    bytes: Buffer.isBuffer(req.body) ? req.body : Buffer.from(''),
  });
  res.status(201).json(
    single({
      type: 'file--file',
      id,
      attributes: {
        filename,
        uri: { url: `/sites/default/files/${filename}` },
        filemime: files.get(id).mime,
      },
    }),
  );
});

app.get('/sites/default/files/:name', (req, res) => {
  const file = [...files.values()].find((f) => f.filename === req.params.name);
  if (!file) return notFound(res, req.params.name);
  res.set('Content-Type', file.mime).send(file.bytes);
});

// --- nodes ---------------------------------------------------------------
app.get('/jsonapi/node/:bundle/:uuid', (req, res) => {
  const n = nodes.get(req.params.uuid);
  if (!n) return notFound(res, req.params.uuid);
  res.json(single(toResource(n)));
});

app.get('/jsonapi/node/:bundle', (req, res) => {
  let list = [...nodes.values()].filter((n) => n.type === req.params.bundle);

  const alias = filterValue(req, 'path.alias');
  if (alias) list = list.filter((n) => n.alias === alias);

  const title = filterValue(req, 'title');
  if (title !== undefined) {
    list = list.filter((n) => n.title.includes(String(title)));
  }

  const nodeType = filterValue(req, 'node_type');
  if (nodeType !== undefined) list = list.filter((n) => n.type === nodeType);

  const status = filterValue(req, 'status');
  if (status !== undefined) {
    list = list.filter((n) => n.status === (status === '1' || status === 'true'));
  }

  const total = list.length;
  const limit = pageLimit(req);
  if (limit !== undefined) list = list.slice(0, limit);

  res.json({ ...collection(list.map(toResource)), meta: { count: total } });
});

app.post('/jsonapi/node/:bundle', (req, res) => {
  const attrs = req.body?.data?.attributes ?? {};
  const id = uuid();
  const n = {
    uuid: id,
    nid: nextNid++,
    type: req.params.bundle,
    title: attrs.title ?? 'Untitled',
    alias: attrs.path?.alias || '',
    blocks: attrs.field_hydra_blocks ?? '{"v":1,"blocks":{},"blocksLayout":{"items":[]}}',
    status: attrs.status ?? false,
  };
  nodes.set(id, n);
  res.status(201).json(single(toResource(n)));
});

app.patch('/jsonapi/node/:bundle/:uuid', (req, res) => {
  const n = nodes.get(req.params.uuid);
  if (!n) return notFound(res, req.params.uuid);
  const attrs = req.body?.data?.attributes ?? {};
  if (attrs.title !== undefined) n.title = attrs.title;
  if (attrs.status !== undefined) n.status = attrs.status;
  if (attrs.field_hydra_blocks !== undefined) n.blocks = attrs.field_hydra_blocks;
  if (attrs.path?.alias !== undefined) n.alias = attrs.path.alias;
  res.json(single(toResource(n)));
});

app.delete('/jsonapi/node/:bundle/:uuid', (req, res) => {
  if (!nodes.has(req.params.uuid)) return notFound(res, req.params.uuid);
  nodes.delete(req.params.uuid);
  for (const [id, l] of menuLinks) {
    if (l.nodeUuid === req.params.uuid) menuLinks.delete(id);
  }
  res.status(204).send();
});

// --- test control --------------------------------------------------------
app.post('/_reset', (req, res) => {
  seed();
  res.json({ status: 'reseeded', nodes: nodes.size, links: menuLinks.size });
});

seed();
app.listen(PORT, () => {
  console.log(`Mock Drupal JSON:API on ${BASE()}  (${nodes.size} nodes, ${menuLinks.size} menu links)`);
});

module.exports = { app, UNFILED_PATH };
