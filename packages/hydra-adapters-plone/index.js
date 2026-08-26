import { BaseAdapter, AdapterError } from '@volto-hydra/hydra-adapters-core';

/** Plone serves its REST API under a ++api++ traversal prefix. */
const API_PREFIX = '/++api++';

/** Plone review_state -> canonical state. */
const STATE_MAP = { published: 'published', private: 'draft' };

export class PloneAdapter extends BaseAdapter {
  constructor({ cmsBaseUrl, authToken } = {}) {
    super({
      name: 'plone',
      capabilities: [
        'content',
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

  async fetchJson(path, { method = 'GET', body, headers = {} } = {}) {
    const auth = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};
    const res = await fetch(this.url(path), {
      method,
      // With an explicit bearer token we must NOT send credentials: a
      // wildcard Access-Control-Allow-Origin (which is what a dev CMS
      // typically sends) makes the browser reject a credentialled
      // cross-origin request outright. Cookie auth is the same-origin case.
      credentials: this.authToken ? 'omit' : 'include',
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
    if (!this.authToken) return null;
    const parts = this.authToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8'),
    );
    return payload.sub ?? null;
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
    return this.withAuthRetry(() => this.dispatchOnce(intent, args));
  }

  async dispatchOnce(intent, args) {
    switch (intent) {
      case 'http': {
        const { op, path, data, headers } = args;
        const method = op === 'del' ? 'DELETE' : op.toUpperCase();
        return this.fetchJson(path, { method, body: data, headers });
      }

      case 'content.get':
        return this.toDocument(await this.fetchJson(args.path));

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
        return this.toDocument(raw);
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
