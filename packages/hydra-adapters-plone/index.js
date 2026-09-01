import { BaseAdapter, AdapterError } from '@volto-hydra/hydra-adapters-core';

/**
 * Decode base64url without Node's Buffer.
 *
 * Adapters run in the BROWSER — that is the whole point of the inversion, so
 * credentials stay on the frontend's origin. Buffer is a Node global and does
 * not exist there; using it made whoami() throw, which failed adapter
 * registration silently and left the editor waiting for an ADAPTER_READY that
 * never came. atob is available in browsers and in Node 16+.
 */
function decodeBase64Url(segment) {
  const padded = segment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  // Percent-decoding round trip so multi-byte UTF-8 survives.
  return decodeURIComponent(
    Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
}

/** Plone serves its REST API under a ++api++ traversal prefix. */
const API_PREFIX = '/++api++';

/**
 * Plone spells its query operations as fully-qualified dotted ids. The
 * canonical form drops the package prefix so a query builder written against
 * the contract does not have to know Plone exists.
 */
const OPERATION_PREFIX = 'plone.app.querystring.operation.';

const toCanonicalOperation = (op) =>
  op.startsWith(OPERATION_PREFIX) ? op.slice(OPERATION_PREFIX.length) : op;

const toPloneOperation = (op) =>
  op.startsWith(OPERATION_PREFIX) ? op : `${OPERATION_PREFIX}${op}`;

/** Plone review_state -> canonical state. */
const STATE_MAP = { published: 'published', private: 'draft' };

export class PloneAdapter extends BaseAdapter {
  constructor({ cmsBaseUrl, authToken, getAuthToken } = {}) {
    super({
      name: 'plone',
      capabilities: [
        'content',
        // Plone speaks the REST dialect the admin's action creators emit, so
        // it can serve them verbatim. Advertising this keeps those requests on
        // the passthrough; adapters without it get them as semantic intents.
        'http-passthrough',
        // Plone answers ?expand=breadcrumbs,actions,types,navigation inside
        // the content response, so the admin's expander bundle rides along in
        // a request it was making anyway. Adapters without this still SERVE
        // expansion — the base class emulates it concurrently — but the admin
        // does not ask them to, because emulation cannot reduce request count
        // and Volto already caches most of the bundle in its store.
        'expand-native',
        // Plone's catalog answers both free-text queries and structured
        // path/type filters, so both are real here. Adapters over CMSes with
        // only one (Drupal without search_api, Strapi) must advertise only
        // the one they have.
        'search-fulltext',
        'search-filter',
        'vocabulary',
        'schema',
        'asset',
      ],
    });
    this.cmsBaseUrl = cmsBaseUrl;
    // In a browser the session rides on a cookie and this stays null. Node
    // callers (the contract suite) hand one in explicitly.
    this.authToken = authToken ?? null;
    // Resolved per request, not captured once: a frontend often has no token
    // at the moment it constructs the adapter (it arrives via URL param or
    // sessionStorage during bootstrap), and a stale null there silently
    // downgrades every later call to cookie auth.
    this.getAuthToken = getAuthToken ?? null;
  }

  resolveToken() {
    return this.getAuthToken ? this.getAuthToken() : this.authToken;
  }

  async init(ctx) {
    await super.init(ctx);
    this.cmsBaseUrl = ctx.cmsBaseUrl ?? this.cmsBaseUrl;
  }

  url(path) {
    // Volto's formatUrl passes an already-absolute URL through untouched, so
    // callers can hand us one. Prefixing it would produce nonsense.
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.cmsBaseUrl}${API_PREFIX}${path}`;
  }

  /**
   * Reads are served from the current scope; anything else clears it.
   *
   * Sits in front of requestJson so EVERY caller benefits, including the ones
   * that repeat a read indirectly — resolvePath and the ancestor walk repeat
   * the same lookups across different intents, and that is where most of the
   * duplication measured in the journey came from.
   */
  async fetchJson(path, options = {}) {
    const method = options.method ?? 'GET';
    if (method !== 'GET') {
      this.invalidateReads();
      return this.requestJson(path, options);
    }
    return this.cachedRead(`GET ${path}`, () => this.requestJson(path, options));
  }

  async requestJson(path, { method = 'GET', body, headers = {} } = {}) {
    const token = this.resolveToken();
    const auth = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(this.url(path), {
      method,
      // With an explicit bearer token we must NOT send credentials: a
      // wildcard Access-Control-Allow-Origin (which is what a dev CMS
      // typically sends) makes the browser reject a credentialled
      // cross-origin request outright. Cookie auth is the same-origin case.
      credentials: token ? 'omit' : 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...auth,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401) {
      throw new AdapterError('Unauthorized', {
        code: 'UNAUTHORIZED',
        status: 401,
      });
    }
    if (res.status === 404) {
      throw new AdapterError(`Not found: ${path}`, {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
    if (!res.ok) {
      throw new AdapterError(`Plone returned ${res.status} for ${path}`, {
        code: 'SERVER_ERROR',
        status: res.status,
      });
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text.length === 0 ? null : JSON.parse(text);
  }

  /**
   * Plone's @id is an absolute URL; the canonical shape wants a CMS-relative
   * path so nothing downstream has to know where the CMS lives.
   */
  toPath(atId) {
    const u = new URL(atId);
    const p = u.pathname.replace(API_PREFIX, '');
    return p === '' ? '/' : p;
  }

  toDocument(raw) {
    const {
      '@id': atId,
      '@type': type,
      UID,
      title,
      language,
      blocks,
      blocks_layout: blocksLayout,
      review_state: reviewState,
      ...fields
    } = raw;

    return {
      id: String(UID ?? atId),
      path: this.toPath(atId),
      type,
      title,
      language: language?.token,
      blocks: blocks ?? {},
      blocksLayout: blocksLayout ?? { items: [] },
      fields,
      state: STATE_MAP[reviewState] ?? reviewState,
      _adapter: { raw },
    };
  }

  /**
   * Plone has no "current user" endpoint: the session's user id lives in the
   * JWT's `sub` claim and is then looked up via /@users/{id}. This mirrors
   * what Volto itself does.
   */
  subjectFromToken() {
    const token = this.resolveToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(decodeBase64Url(parts[1])).sub ?? null;
  }

  toUser(raw) {
    return {
      id: String(raw.id),
      username: raw.username ?? raw.id,
      fullname: raw.fullname,
      email: raw.email,
      roles: raw.roles ?? [],
    };
  }

  async whoami() {
    return this.dispatch('auth.whoami', {});
  }

  /**
   * Search results and navigation items are "brains" — partial documents with
   * no blocks. Normalise them to the same canonical Document shape so callers
   * never branch on where a result came from.
   */
  toBrief(raw) {
    return {
      id: String(raw.UID ?? raw['@id']),
      path: this.toPath(raw['@id']),
      type: raw['@type'],
      title: raw.title,
      blocks: {},
      blocksLayout: { items: [] },
      fields: raw,
      state: STATE_MAP[raw.review_state] ?? raw.review_state,
      _adapter: { raw },
    };
  }

  async dispatch(intent, args) {
    return this.dispatchWithInvalidation(intent, args, () =>
      this.withAuthRetry(() => this.dispatchOnce(intent, args)),
    );
  }

  async dispatchOnce(intent, args) {
    switch (intent) {
      case 'http': {
        const { op, path, data, headers } = args;
        const method = op === 'del' ? 'DELETE' : op.toUpperCase();
        return this.fetchJson(path, { method, body: data, headers });
      }

      case 'content.get': {
        // Plone can expand natively, but only over its own @components set.
        // Emulating uniformly keeps one code path and one tested behaviour;
        // the native fast path is a later optimisation, not a correctness fix.
        const doc = this.toDocument(await this.fetchJson(args.path));
        return this.withContext(doc, args.path, args.expand);
      }

      case 'content.update': {
        const body = { ...args.data };
        if (body.blocksLayout) {
          body.blocks_layout = body.blocksLayout;
          delete body.blocksLayout;
        }
        await this.fetchJson(args.path, { method: 'PATCH', body });
        return null;
      }

      case 'content.create': {
        const raw = await this.fetchJson(args.parentPath, {
          method: 'POST',
          body: {
            '@type': args.data.type,
            title: args.data.title,
            ...args.data.fields,
          },
        });
        return this.toDocument(raw);
      }

      case 'content.delete':
        await this.fetchJson(args.path, { method: 'DELETE' });
        return null;

      case 'auth.whoami': {
        const sub = this.subjectFromToken();
        if (!sub) {
          throw new AdapterError('No session token to identify the user', {
            code: 'UNAUTHORIZED',
            status: 401,
          });
        }
        return this.toUser(
          await this.fetchJson(`/@users/${encodeURIComponent(sub)}`),
        );
      }

      case 'asset.upload': {
        const raw = await this.fetchJson(args.parentPath, {
          method: 'POST',
          body: {
            '@type': 'Image',
            title: args.title ?? args.filename,
            image: {
              data: args.data,
              encoding: 'base64',
              'content-type': args.contentType,
              filename: args.filename,
            },
          },
        });
        // An uploaded asset carries the ABSOLUTE url it can be fetched at.
        //
        // Everything else in this contract travels as a path, because the
        // admin resolves paths itself. An image cannot: it ends up in an
        // <img src>, and a CMS-relative path there resolves against whichever
        // origin happens to render it — the admin's, which then 404s. Same
        // rule asset.imageUrl states; the widget reads this one straight after
        // the upload, before anything asks for a scale.
        const doc = this.toDocument(raw);
        return {
          ...doc,
          fields: {
            ...doc.fields,
            url: raw.image?.download ?? raw['@id'],
            filename: raw.image?.filename ?? args.filename,
          },
        };
      }

      case 'asset.imageUrl': {
        // Scale URLs are published by the CMS on the document itself; deriving
        // them by string-building would bake in Plone's @@images convention
        // and silently break the moment a scale is renamed.
        const doc = await this.fetchJson(args.path);
        const field = doc[args.field];
        if (!field) {
          throw new AdapterError(
            `No field '${args.field}' on ${args.path}`,
            { code: 'NOT_FOUND', status: 404 },
          );
        }
        const scale = field.scales?.[args.scale];
        if (!scale) {
          throw new AdapterError(
            `No scale '${args.scale}' for ${args.path}/${args.field}`,
            { code: 'NOT_FOUND', status: 404 },
          );
        }
        return scale.download;
      }

      case 'types.list': {
        const raw = await this.fetchJson('/@types');
        return {
          items: (raw ?? []).map((t) => ({
            // Plone identifies a type by the last segment of its @id; there is
            // no separate id field on the listing entries.
            id: decodeURIComponent(t['@id'].split('/').pop()),
            title: t.title,
            addable: t.addable === true,
          })),
        };
      }

      case 'types.getSchema': {
        const raw = await this.fetchJson(
          `/@types/${encodeURIComponent(args.type)}`,
        );
        return {
          fieldsets: raw.fieldsets ?? [],
          properties: raw.properties ?? {},
          required: raw.required ?? [],
        };
      }

      case 'vocabulary.get': {
        const params = new URLSearchParams();
        // Filter and batch server-side. Pulling the whole vocabulary back and
        // narrowing it here would work on a 3-term list and fall over on a
        // real taxonomy.
        if (args.title) params.set('title', args.title);
        if (args.limit) params.set('b_size', String(args.limit));
        const qs = params.toString();
        const raw = await this.fetchJson(
          `/@vocabularies/${encodeURIComponent(args.name)}${qs ? `?${qs}` : ''}`,
        );
        return {
          items: (raw.items ?? []).map((i) => ({
            token: i.token,
            title: i.title,
          })),
          total: raw.items_total ?? (raw.items ?? []).length,
        };
      }

      case 'content.move': {
        // plone.restapi posts to the TARGET container with the source in the
        // body; the object keeps its UID, which is what makes every stored
        // link to it survive the move.
        if (
          args.targetParentPath === args.path ||
          args.targetParentPath.startsWith(`${args.path}/`)
        ) {
          throw new AdapterError('Cannot move a document inside itself', {
            code: 'INVALID_MOVE',
            status: 400,
          });
        }
        const result = await this.fetchJson(`${args.targetParentPath}/@move`, {
          method: 'POST',
          body: { source: args.path },
        });
        const target = Array.isArray(result) ? result[0]?.target : null;
        const id = args.path.split('/').filter(Boolean).pop();
        const destPath =
          target ??
          `${args.targetParentPath === '/' ? '' : args.targetParentPath}/${id}`;
        return this.dispatchOnce('content.get', { path: destPath });
      }

      case 'content.order': {
        const segments = args.path.split('/').filter(Boolean);
        const objId = segments.pop();
        const parentPath = `/${segments.join('/')}`;
        await this.fetchJson(`${parentPath === '/' ? '' : parentPath}/@order`, {
          method: 'POST',
          body: {
            obj_id: objId,
            delta: args.targetIndex === 0 ? 'top' : 'bottom',
          },
        });
        return null;
      }

      case 'querystring.getIndexes': {
        const raw = await this.fetchJson('/@querystring');
        const indexes = {};
        for (const [name, index] of Object.entries(raw.indexes ?? {})) {
          indexes[name] = {
            title: index.title,
            description: index.description,
            group: index.group,
            enabled: index.enabled !== false,
            sortable: index.sortable === true,
            operations: (index.operations ?? []).map(toCanonicalOperation),
            values: index.values,
          };
        }
        return { indexes };
      }

      case 'querystringSearch': {
        const raw = await this.fetchJson('/@querystring-search', {
          method: 'POST',
          body: {
            query: (args.query ?? []).map((c) => ({
              i: c.i,
              o: toPloneOperation(c.o),
              v: c.v,
            })),
            ...(args.sortOn ? { sort_on: args.sortOn } : {}),
            ...(args.sortOrder ? { sort_order: args.sortOrder } : {}),
            ...(args.limit ? { b_size: args.limit } : {}),
          },
        });
        return {
          items: (raw.items ?? []).map((i) => this.toBrief(i)),
          total: raw.items_total ?? (raw.items ?? []).length,
          batching: raw.batching,
        };
      }

      case 'reference.resolve': {
        // Plone's own answer to this is resolveuid: store the UID, look up the
        // current path at render time. The catalog is the index that makes it
        // cheap.
        const raw = await this.fetchJson(
          `/@search?UID=${encodeURIComponent(args.id)}`,
        );
        const hit = (raw.items ?? [])[0];
        if (!hit) {
          throw new AdapterError(`No document with id ${args.id}`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }
        return {
          id: args.id,
          path: this.toPath(hit['@id']),
          url: hit['@id'],
          title: hit.title,
        };
      }

      case 'search': {
        const params = new URLSearchParams();
        if (args.query) params.set('SearchableText', args.query);
        if (args.path) params.set('path.query', args.path);
        if (args.limit) params.set('b_size', String(args.limit));
        const raw = await this.fetchJson(
          `${args.path ?? ''}/@search?${params.toString()}`,
        );
        return {
          items: (raw.items ?? []).map((i) => this.toBrief(i)),
          total: raw.items_total ?? 0,
          batching: raw.batching,
        };
      }

      case 'tree.list': {
        // plone.restapi's @search is context-scoped: searching on /news
        // restricts to that subtree, and path.depth=1 narrows it to direct
        // children. Passing path.query on an unscoped /@search is NOT
        // equivalent — the context is what bounds the subtree.
        const base = args.parent === '/' ? '' : args.parent;
        const raw = await this.fetchJson(`${base}/@search?path.depth=1`);
        return {
          items: (raw.items ?? []).map((i) => this.toBrief(i)),
          total: raw.items_total ?? 0,
        };
      }

      case 'breadcrumbs.get': {
        const raw = await this.fetchJson(`${args.path}/@breadcrumbs`);
        // Canonical breadcrumbs are the ancestors BELOW the site root. Plone
        // has a root document to point at; WordPress and Drupal do not, so a
        // root entry could not mean the same thing across adapters.
        const items = (raw.items ?? [])
          .map((i) => this.toBrief(i))
          .filter((i) => i.path !== '/');
        return { items };
      }

      case 'navigation.get': {
        const base = args.path === '/' ? '' : (args.path ?? '');
        const raw = await this.fetchJson(`${base}/@navigation`);
        return { items: (raw.items ?? []).map((i) => this.toBrief(i)) };
      }

      default:
        return super.dispatch(intent, args);
    }
  }
}

export default PloneAdapter;
