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
        'search-fulltext',
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
    return `${this.cmsBaseUrl}${API_PREFIX}${path}`;
  }

  async fetchJson(path, { method = 'GET', body, headers = {} } = {}) {
    const auth = this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};
    const res = await fetch(this.url(path), {
      method,
      credentials: 'include',
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

      default:
        return super.dispatch(intent, args);
    }
  }
}

export default PloneAdapter;
