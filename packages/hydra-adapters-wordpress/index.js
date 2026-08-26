import { BaseAdapter, AdapterError } from '@volto-hydra/hydra-adapters-core';

/**
 * Hydra adapter for vanilla WordPress — no plugin, no theme changes.
 *
 * Blocks live inside post_content as a Gutenberg-style HTML comment. WordPress
 * preserves it byte-for-byte on save (verified against WP latest) and renders
 * nothing for it on the public page, because the block type is not registered.
 * That is intentional: the reader-facing surface is the decoupled frontend.
 */

const BLOCK_MARKER = 'wp:hydra-blocks/document';

/** WP post status -> canonical lifecycle state. */
const STATE_MAP = {
  publish: 'published',
  draft: 'draft',
  pending: 'pending',
  private: 'private',
  future: 'scheduled',
};

const TRANSITIONS = {
  draft: [
    { id: 'publish', label: 'Publish', targetState: 'published' },
    { id: 'pending', label: 'Submit for review', targetState: 'pending' },
  ],
  pending: [
    { id: 'publish', label: 'Publish', targetState: 'published' },
    { id: 'draft', label: 'Back to draft', targetState: 'draft' },
  ],
  publish: [
    { id: 'draft', label: 'Unpublish', targetState: 'draft' },
    { id: 'private', label: 'Make private', targetState: 'private' },
  ],
  private: [{ id: 'publish', label: 'Publish', targetState: 'published' }],
};

/**
 * WordPress does not assign a post_name to a draft until it is first published,
 * so a freshly created draft has NO slug and therefore no addressable path.
 * Hydra addresses content by path, so the adapter must supply one up front
 * rather than discover it later.
 */
export function slugify(title) {
  const slug = String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new AdapterError(`Cannot derive a slug from title ${JSON.stringify(title)}`, {
      code: 'INVALID_TITLE',
    });
  }
  return slug;
}

export function serializeBlocks(blocks, blocksLayout) {
  const payload = JSON.stringify({ v: 1, blocks, blocksLayout });
  return `<!-- ${BLOCK_MARKER} ${payload} /-->`;
}

/**
 * Pull the blocks payload back out of post_content.
 *
 * Anything else in post_content is legacy content authored elsewhere; it is
 * preserved verbatim on write so Hydra never destroys work done in Gutenberg.
 */
export function parseBlocks(content) {
  const start = content.indexOf(`<!-- ${BLOCK_MARKER} `);
  if (start === -1) {
    return { blocks: {}, blocksLayout: { items: [] }, legacy: content };
  }
  const end = content.indexOf('/-->', start);
  if (end === -1) {
    throw new AdapterError('Unterminated hydra-blocks comment in post_content', {
      code: 'MALFORMED_CONTENT',
    });
  }
  const json = content.slice(start + `<!-- ${BLOCK_MARKER} `.length, end).trim();
  const parsed = JSON.parse(json);
  // PHP's json_encode cannot tell an empty map from an empty list, so a
  // document whose blocks were emptied comes back as [] rather than {}.
  // Everything downstream indexes blocks by id, so coerce it back.
  const asMap = (v) => (Array.isArray(v) && v.length === 0 ? {} : v);
  const legacy = (content.slice(0, start) + content.slice(end + 4)).trim();
  return {
    blocks: asMap(parsed.blocks) ?? {},
    blocksLayout: parsed.blocksLayout ?? { items: [] },
    legacy,
  };
}

export class WordPressAdapter extends BaseAdapter {
  constructor({ cmsBaseUrl, nonce, postType = 'pages' } = {}) {
    super({
      name: 'wordpress',
      capabilities: [
        'content',
        'search-fulltext',
        // WordPress filters by parent, type and status server-side; tree.list
        // relies on it, so claiming otherwise would be false advertising.
        'search-filter',
        'vocabulary',
        'schema',
        'asset',
        'state',
        // Deliberately absent: per-content-permissions. Vanilla WordPress has
        // no per-post principal grants, so the sharing half of the panel must
        // hide rather than show something it cannot honour.
      ],
    });
    this.cmsBaseUrl = cmsBaseUrl;
    this.nonce = nonce ?? null;
    this.postType = postType;
    this.pathCache = new Map();
  }

  async init(ctx) {
    await super.init(ctx);
    this.cmsBaseUrl = ctx.cmsBaseUrl ?? this.cmsBaseUrl;
    if (!this.nonce) this.nonce = await this.fetchNonce();
  }

  /**
   * WordPress cookie auth is not sufficient for the REST API on its own; every
   * authenticated call needs a nonce. In a real frontend this comes from
   * wp_localize_script as window.wpApiSettings.nonce; admin-ajax is the
   * fallback when the page did not enqueue it.
   */
  async fetchNonce() {
    if (typeof window !== 'undefined' && window.wpApiSettings?.nonce) {
      return window.wpApiSettings.nonce;
    }
    const res = await fetch(
      `${this.cmsBaseUrl}/wp-admin/admin-ajax.php?action=rest-nonce`,
      { credentials: 'include' },
    );
    if (!res.ok) return null;
    return (await res.text()).trim();
  }

  /**
   * Pretty permalinks are not guaranteed to be on, and /wp-json 302s when they
   * are not. The rest_route query form always works.
   */
  url(route, params = {}) {
    const qs = new URLSearchParams({ rest_route: route, ...params });
    return `${this.cmsBaseUrl}/?${qs.toString()}`;
  }

  async fetchJson(route, { method = 'GET', body, params = {} } = {}) {
    const headers = { Accept: 'application/json' };
    if (this.nonce) headers['X-WP-Nonce'] = this.nonce;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(this.url(route, params), {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403) {
      throw new AdapterError('Unauthorized', {
        code: 'UNAUTHORIZED',
        status: 401,
      });
    }
    if (res.status === 404) {
      throw new AdapterError(`Not found: ${route}`, {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
    if (!res.ok) {
      throw new AdapterError(`WordPress returned ${res.status} for ${route}`, {
        code: 'SERVER_ERROR',
        status: res.status,
      });
    }
    // X-WP-Total carries the unpaginated count; without it a caller cannot
    // tell "25 results" from "25 of 10000".
    this.lastTotal = Number(res.headers.get('X-WP-Total') ?? '0');
    const text = await res.text();
    return text.length === 0 ? null : JSON.parse(text);
  }

  /**
   * WordPress addresses content by id, Hydra by path. Pages carry a slug and a
   * parent, so a path is resolved a segment at a time down the tree — which
   * also means "/news/first-post" cannot collide with a different "first-post"
   * elsewhere.
   */
  async resolvePath(path) {
    if (path === '/' || path === '') {
      throw new AdapterError('WordPress has no root document', {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
    if (this.pathCache.has(path)) return this.pathCache.get(path);

    const segments = path.split('/').filter(Boolean);
    let parent = 0;
    let id = null;
    for (const slug of segments) {
      const matches = await this.fetchJson(`/wp/v2/${this.postType}`, {
        params: { slug, parent: String(parent), status: 'any', context: 'edit' },
      });
      if (!matches || matches.length === 0) {
        throw new AdapterError(`Not found: ${path}`, {
          code: 'NOT_FOUND',
          status: 404,
        });
      }
      id = matches[0].id;
      parent = id;
    }
    this.pathCache.set(path, id);
    return id;
  }

  /** Walk parent ids up to the root, collecting slugs, so a path can be rebuilt. */
  async ancestryOf(post) {
    const segments = [];
    let parentId = post.parent;
    while (parentId) {
      const parent = await this.fetchJson(
        `/wp/v2/${this.postType}/${parentId}`,
        { params: { context: 'edit' } },
      );
      segments.unshift(parent.slug);
      parentId = parent.parent;
    }
    return segments;
  }

  pathFor(post, ancestry) {
    return `/${[...ancestry, post.slug].join('/')}`;
  }

  toDocument(post, path) {
    const raw = post.content?.raw ?? '';
    const { blocks, blocksLayout, legacy } = parseBlocks(raw);
    return {
      id: String(post.id),
      path,
      type: post.type,
      title: post.title?.raw ?? post.title?.rendered ?? '',
      blocks,
      blocksLayout,
      fields: { legacyContent: legacy, slug: post.slug, link: post.link },
      state: STATE_MAP[post.status] ?? post.status,
      _adapter: { raw: post },
    };
  }

  async whoami() {
    return this.dispatch('auth.whoami', {});
  }

  async dispatch(intent, args) {
    return this.withAuthRetry(() => this.dispatchOnce(intent, args));
  }

  async dispatchOnce(intent, args) {
    switch (intent) {
      case 'content.get': {
        const id = await this.resolvePath(args.path);
        const post = await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          params: { context: 'edit' },
        });
        return this.toDocument(post, args.path);
      }

      case 'content.update': {
        const id = await this.resolvePath(args.path);
        const body = {};
        if (args.data.title !== undefined) body.title = args.data.title;
        if (args.data.blocks !== undefined) {
          const current = await this.fetchJson(
            `/wp/v2/${this.postType}/${id}`,
            { params: { context: 'edit' } },
          );
          const { legacy } = parseBlocks(current.content?.raw ?? '');
          const serialized = serializeBlocks(
            args.data.blocks,
            args.data.blocksLayout ?? { items: [] },
          );
          body.content = legacy ? `${serialized}\n${legacy}` : serialized;
        }
        await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          method: 'POST',
          body,
        });
        return null;
      }

      case 'content.create': {
        const parentId =
          args.parentPath === '/' ? 0 : await this.resolvePath(args.parentPath);
        const post = await this.fetchJson(`/wp/v2/${this.postType}`, {
          method: 'POST',
          body: {
            title: args.data.title,
            // Explicit: a draft would otherwise have no slug at all, and the
            // document would not be addressable by path until published.
            slug: args.data.slug ?? slugify(args.data.title),
            status: 'draft',
            parent: parentId,
            content: serializeBlocks(
              args.data.blocks ?? {},
              args.data.blocksLayout ?? { items: [] },
            ),
          },
        });
        if (!post.slug) {
          throw new AdapterError(
            `WordPress created post ${post.id} with no slug; it has no addressable path`,
            { code: 'NO_SLUG' },
          );
        }
        const parentSegments =
          args.parentPath === '/'
            ? []
            : args.parentPath.split('/').filter(Boolean);
        return this.toDocument(post, this.pathFor(post, parentSegments));
      }

      case 'content.delete': {
        const id = await this.resolvePath(args.path);
        await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          method: 'DELETE',
          params: { force: 'true' },
        });
        this.pathCache.delete(args.path);
        return null;
      }

      case 'state.get': {
        const id = await this.resolvePath(args.path);
        const post = await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          params: { context: 'edit' },
        });
        const canPublish = true; // refined below by user capabilities
        return {
          state: {
            name: STATE_MAP[post.status] ?? post.status,
            label: post.status,
          },
          transitions: TRANSITIONS[post.status] ?? [],
          effective: {
            canEdit: true,
            canPublish,
            canDelete: true,
            canShare: false,
            canComment: post.comment_status === 'open',
          },
          // Vanilla WordPress has no per-post grants; the sharing half of the
          // panel hides on this rather than showing an empty list.
          shareEntries: null,
        };
      }

      case 'state.transition': {
        const id = await this.resolvePath(args.path);
        await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          method: 'POST',
          body: { status: args.id },
        });
        return null;
      }

      case 'auth.whoami': {
        const me = await this.fetchJson('/wp/v2/users/me', {
          params: { context: 'edit' },
        });
        return {
          id: String(me.id),
          username: me.slug,
          fullname: me.name,
          email: me.email,
          roles: me.roles ?? [],
        };
      }

      case 'search': {
        const posts = await this.fetchJson(`/wp/v2/${this.postType}`, {
          params: {
            search: args.query ?? '',
            status: 'any',
            context: 'edit',
            per_page: String(args.limit ?? 25),
          },
        });
        const total = this.lastTotal;
        const items = [];
        for (const post of posts) {
          items.push(
            this.toDocument(post, this.pathFor(post, await this.ancestryOf(post))),
          );
        }
        return { items, total };
      }

      case 'tree.list': {
        const parentId =
          args.parent === '/' ? 0 : await this.resolvePath(args.parent);
        const posts = await this.fetchJson(`/wp/v2/${this.postType}`, {
          params: {
            parent: String(parentId),
            status: 'any',
            context: 'edit',
            per_page: '100',
          },
        });
        const parentSegments =
          args.parent === '/' ? [] : args.parent.split('/').filter(Boolean);
        return {
          items: posts.map((p) => this.toDocument(p, this.pathFor(p, parentSegments))),
          total: this.lastTotal,
        };
      }

      case 'breadcrumbs.get': {
        const id = await this.resolvePath(args.path);
        const post = await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          params: { context: 'edit' },
        });
        const ancestry = await this.ancestryOf(post);
        // Canonical breadcrumbs are the ancestors below the root, root-first,
        // including the document itself — matching the Plone adapter.
        const items = [];
        for (let i = 0; i < ancestry.length; i++) {
          const path = `/${ancestry.slice(0, i + 1).join('/')}`;
          const ancestorId = await this.resolvePath(path);
          const ancestor = await this.fetchJson(
            `/wp/v2/${this.postType}/${ancestorId}`,
            { params: { context: 'edit' } },
          );
          items.push(this.toDocument(ancestor, path));
        }
        items.push(this.toDocument(post, args.path));
        return { items };
      }

      case 'navigation.get': {
        const posts = await this.fetchJson(`/wp/v2/${this.postType}`, {
          params: { parent: '0', status: 'any', context: 'edit', per_page: '100' },
        });
        return {
          items: posts.map((p) => this.toDocument(p, `/${p.slug}`)),
        };
      }

      case 'vocabulary.get': {
        const params = {
          per_page: String(args.limit ?? 25),
          // WordPress filters terms server-side; pulling 10k back to filter
          // here would make type-ahead unusable.
          ...(args.title ? { search: args.title } : {}),
        };
        const terms = await this.fetchJson(
          `/wp/v2/${encodeURIComponent(args.name)}`,
          { params },
        );
        return {
          items: terms.map((t) => ({ token: t.slug, title: t.name })),
          total: this.lastTotal,
        };
      }

      case 'types.getSchema': {
        // The type endpoint describes the post type, not its fields; the field
        // schema comes from an OPTIONS request on the collection.
        const type = await this.fetchJson(`/wp/v2/types/${args.type}`);
        const res = await fetch(this.url(`/wp/v2/${type.rest_base}`), {
          method: 'OPTIONS',
          credentials: 'include',
          headers: this.nonce ? { 'X-WP-Nonce': this.nonce } : {},
        });
        const described = await res.json();
        const properties = described.schema?.properties ?? {};
        return {
          properties,
          fieldsets: [
            { id: 'default', title: 'Default', fields: Object.keys(properties) },
          ],
          required: Object.entries(properties)
            .filter(([, v]) => v.required === true)
            .map(([k]) => k),
        };
      }

      case 'asset.upload': {
        const binary = Uint8Array.from(atob(args.data), (c) => c.charCodeAt(0));
        const res = await fetch(this.url('/wp/v2/media'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(this.nonce ? { 'X-WP-Nonce': this.nonce } : {}),
            'Content-Type': args.contentType,
            'Content-Disposition': `attachment; filename="${args.filename}"`,
          },
          body: binary,
        });
        if (!res.ok) {
          throw new AdapterError(`Upload failed: ${res.status}`, {
            code: 'UPLOAD_FAILED',
            status: res.status,
          });
        }
        const media = await res.json();
        return {
          id: String(media.id),
          path: `/${media.slug}`,
          type: media.type,
          title: media.title?.rendered ?? args.filename,
          blocks: {},
          blocksLayout: { items: [] },
          fields: { link: media.source_url },
          state: 'published',
          _adapter: { raw: media },
        };
      }

      case 'asset.imageUrl': {
        // Callers address assets by path, like any other document. WordPress
        // media is flat, so the path is just the attachment slug.
        const slug = (args.path ?? '').replace(/^\//, '');
        const matches = await this.fetchJson('/wp/v2/media', {
          params: { slug, context: 'edit' },
        });
        const media = matches?.[0];
        if (!media) {
          throw new AdapterError(`No media at ${args.path}`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }
        // WordPress only generates a named size when the original is larger
        // than it, so a small image legitimately has none. The original is
        // always a valid rendition, so fall back to it rather than failing a
        // request the CMS can actually satisfy.
        const sizes = media.media_details?.sizes ?? {};
        const size = sizes[args.scale] ?? sizes.full;
        if (size?.source_url) return size.source_url;
        if (media.source_url) return media.source_url;
        throw new AdapterError(
          `Media ${media.id} has no retrievable image URL`,
          { code: 'NOT_FOUND', status: 404 },
        );
      }

      case 'reference.resolve': {
        // WordPress has no resolveuid. The post id IS stable across renames
        // and moves, but the permalink is not — so the id is what gets stored
        // and the link is resolved fresh on every render.
        const post = await this.fetchJson(
          `/wp/v2/${this.postType}/${args.id}`,
          { params: { context: 'edit' } },
        );
        const ancestry = await this.ancestryOf(post);
        return {
          id: String(post.id),
          path: this.pathFor(post, ancestry),
          url: post.link,
          title: post.title?.raw ?? post.title?.rendered ?? '',
        };
      }

      case 'types.list': {
        const types = await this.fetchJson('/wp/v2/types');
        return {
          items: Object.entries(types).map(([id, t]) => ({
            id,
            title: t.name,
            addable: true,
          })),
        };
      }

      default:
        return super.dispatch(intent, args);
    }
  }
}

export default WordPressAdapter;
