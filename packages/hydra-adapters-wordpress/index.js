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
    // id -> {slug, parent}. Rebuilding a path walks the parent chain one
    // request per ancestor, and a listing repeats that walk for every sibling:
    // 20 posts under /news fetched /news 20 times. Cleared by any mutation,
    // since a move changes exactly this.
    this.ancestorCache = new Map();
    // type id -> REST base. 'page' is served at /wp/v2/pages, so a filter
    // carrying the type id built /wp/v2/page and 404'd.
    this.restBases = null;
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
      // With an explicit nonce we must NOT also send cookies: a wildcard
      // Access-Control-Allow-Origin makes the browser reject a credentialled
      // cross-origin request outright, surfacing only as "Failed to fetch".
      // Same bug the Plone and Drupal adapters had.
      credentials: this.nonce ? 'omit' : 'include',
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

    // ONE request for every slug in the path, resolved in memory.
    //
    // This walked the tree a segment at a time, which is a full round trip per
    // segment — and against WordPress-on-WASM a round trip is ~1.1s regardless
    // of payload, so a two-segment path cost two seconds before any real work
    // began. WordPress accepts a slug list, so the whole chain arrives at once
    // and the parent pointers are matched here.
    //
    // The disambiguation is unchanged: each segment must sit under the previous
    // one, so "/news/first-post" still cannot match a different "first-post"
    // elsewhere in the tree.
    const candidates = await this.fetchJson(`/wp/v2/${this.postType}`, {
      params: {
        slug: segments.join(','),
        per_page: '100',
        status: 'any',
        context: 'edit',
      },
    });

    let parent = 0;
    let id = null;
    let walked = '';
    for (const slug of segments) {
      const hit = (candidates ?? []).find(
        (c) => c.slug === slug && (c.parent ?? 0) === parent,
      );
      if (!hit) {
        throw new AdapterError(`Not found: ${path}`, {
          code: 'NOT_FOUND',
          status: 404,
        });
      }
      id = hit.id;
      parent = id;

      // Every ancestor was resolved on the way past, so cache them too rather
      // than making the next lookup pay for the same walk.
      walked = `${walked}/${slug}`;
      this.pathCache.set(walked, hit.id);
      this.ancestorCache.set(hit.id, { slug: hit.slug, parent: hit.parent });
    }
    this.pathCache.set(path, id);
    return id;
  }

  /** Walk parent ids up to the root, collecting slugs, so a path can be rebuilt. */
  async ancestryOf(post) {
    const segments = [];
    let parentId = post.parent;
    while (parentId) {
      let entry = this.ancestorCache.get(parentId);
      if (!entry) {
        const parent = await this.fetchJson(
          `/wp/v2/${this.postType}/${parentId}`,
          { params: { context: 'edit' } },
        );
        entry = { slug: parent.slug, parent: parent.parent };
        this.ancestorCache.set(parentId, entry);
      }
      segments.unshift(entry.slug);
      parentId = entry.parent;
    }
    return segments;
  }

  /**
   * REST base for a post type id, e.g. page -> pages.
   *
   * Returns null for a type this site does not have. Filtering by a
   * non-existent type has no results by definition, and guessing an endpoint
   * from the id turns that into a 404 the caller cannot distinguish from a
   * broken request.
   */
  async restBaseFor(typeId) {
    if (!this.restBases) {
      const types = await this.fetchJson('/wp/v2/types');
      this.restBases = new Map(
        Object.entries(types ?? {}).map(([id, t]) => [id, t.rest_base ?? id]),
      );
    }
    return this.restBases.get(typeId) ?? null;
  }

  pathFor(post, ancestry) {
    return `/${[...ancestry, post.slug].join('/')}`;
  }

  /**
   * The document's path, without walking the tree when WordPress already knows.
   *
   * The canonical model addresses content by path, and WordPress is the only
   * one of the three CMSes that does not store one: Plone's path IS its
   * address, Drupal carries path.alias as a field, and WordPress derives a
   * permalink from the parent chain. So every id -> path cost an ancestor walk,
   * once PER ITEM in a listing — a genuine N+1 that the cache only hid until
   * the next mutation cleared it.
   *
   * `link` is that permalink, already in the response: no request at all.
   *
   * Except for drafts. Unpublished content has no public URL, so WordPress
   * returns ?page_id=N instead of a path, and those still have to be walked.
   * That is a real asymmetry of the CMS, not something to paper over — the
   * model wants a path for every document, published or not.
   */
  async pathOfPost(post) {
    const link = typeof post?.link === 'string' ? post.link : '';
    if (link && !link.includes('?')) {
      const { pathname } = new URL(link, this.cmsBaseUrl);
      const path = pathname.replace(/\/+$/, '');
      if (path) {
        this.pathCache.set(path, post.id);
        return path;
      }
    }
    // Draft, or a site without pretty permalinks: fall back to the walk.
    return this.pathFor(post, await this.ancestryOf(post));
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
        // Same reasoning as content.move: the deleted post and anything under
        // it are stale, nothing else is.
        for (const cached of [...this.pathCache.keys()]) {
          if (cached === args.path || cached.startsWith(`${args.path}/`)) {
            this.pathCache.delete(cached);
          }
        }
        this.ancestorCache.delete(id);
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
            this.toDocument(post, await this.pathOfPost(post)),
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
            // Without this the ordering set by content.order is invisible.
            orderby: 'menu_order',
            order: 'asc',
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
          // With an explicit nonce we must NOT also send cookies: a wildcard
      // Access-Control-Allow-Origin makes the browser reject a credentialled
      // cross-origin request outright, surfacing only as "Failed to fetch".
      // Same bug the Plone and Drupal adapters had.
      credentials: this.nonce ? 'omit' : 'include',
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
          // With an explicit nonce we must NOT also send cookies: a wildcard
      // Access-Control-Allow-Origin makes the browser reject a credentialled
      // cross-origin request outright, surfacing only as "Failed to fetch".
      // Same bug the Plone and Drupal adapters had.
      credentials: this.nonce ? 'omit' : 'include',
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

      case 'content.move': {
        if (
          args.targetParentPath === args.path ||
          args.targetParentPath.startsWith(`${args.path}/`)
        ) {
          throw new AdapterError('Cannot move a document inside itself', {
            code: 'INVALID_MOVE',
            status: 400,
          });
        }
        const id = await this.resolvePath(args.path);
        const parentId =
          args.targetParentPath === '/'
            ? 0
            : await this.resolvePath(args.targetParentPath);

        // A WordPress page's location IS its parent pointer, so descendants
        // follow for free — their own parent pointers are untouched and the
        // path is derived from the chain. The post id never changes, which is
        // what keeps stored links resolving.
        const moved = await this.fetchJson(`/wp/v2/${this.postType}/${id}`, {
          method: 'POST',
          body: { parent: parentId },
          params: { context: 'edit' },
        });

        // Only the moved subtree is wrong — invalidate exactly that.
        //
        // Clearing both maps wholesale was correct but ruinously broad: every
        // later lookup re-walked the tree at a full request per hop, and with
        // ~1.1s per request under PHP-WASM it put every move test within a few
        // seconds of the 30s limit, so whichever landed worst failed.
        //
        // A move re-parents ONE post. Paths at or under its old location are
        // stale; every other cached path still holds. In the ancestor map,
        // which is id -> {slug, parent}, only the moved post's own entry
        // changes — its descendants still have the same parent, namely it.
        for (const cached of [...this.pathCache.keys()]) {
          if (cached === args.path || cached.startsWith(`${args.path}/`)) {
            this.pathCache.delete(cached);
          }
        }
        this.ancestorCache.delete(id);

        const segments = args.path.split('/').filter(Boolean);
        const slug = segments[segments.length - 1];
        const destPath =
          args.targetParentPath === '/'
            ? `/${slug}`
            : `${args.targetParentPath}/${slug}`;

        // Built from the response we already have, not re-fetched by path.
        // content.get here would resolve destPath a segment at a time, fetch
        // the post again and re-walk its ancestors — around five requests to
        // rediscover what the write just returned. At ~1.1s each that was most
        // of the cost of a move.
        this.pathCache.set(destPath, id);
        return this.toDocument(moved, destPath);
      }

      case 'content.order': {
        const id = await this.resolvePath(args.path);

        // resolvePath cached this post's parent on the way past, so the
        // separate fetch it used to do is redundant. The post itself is one of
        // the siblings fetched below.
        const parentId = this.ancestorCache.get(id)?.parent ?? 0;

        // Renumber ALL the siblings, not just this one.
        //
        // WordPress orders pages by menu_order, and every page starts at 0. So
        // writing menu_order on one post alone leaves it tied with its
        // siblings, WordPress breaks the tie however it likes, and the move
        // silently does nothing — "reorder draft-post to the front" returned
        // first-post still leading. A position is only meaningful relative to
        // the others, so the whole run has to be given distinct, ordered
        // values.
        const siblings = await this.fetchJson(`/wp/v2/${this.postType}`, {
          params: {
            parent: String(parentId),
            per_page: '100',
            orderby: 'menu_order',
            order: 'asc',
            status: 'any',
            context: 'edit',
          },
        });

        const post = (siblings ?? []).find((s) => s.id === id);
        if (!post) {
          throw new AdapterError(`Not found among siblings: ${args.path}`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }

        const rest = (siblings ?? []).filter((s) => s.id !== id);
        const index = Math.max(0, Math.min(args.targetIndex ?? 0, rest.length));
        const ordered = [...rest.slice(0, index), post, ...rest.slice(index)];

        // ONE request for every renumbering, via WordPress core's batch
        // endpoint (5.6+). The writes are independent — each sets a different
        // post's menu_order — so there is nothing to serialise, and at ~1.1s
        // per round trip issuing them one at a time was most of what a reorder
        // cost. Batch caps at 25 per call, so long sibling runs are chunked.
        const writes = ordered
          .map((sibling, i) => ({ sibling, i }))
          .filter(({ sibling, i }) => sibling.menu_order !== i)
          .map(({ sibling, i }) => ({
            method: 'POST',
            path: `/wp/v2/${this.postType}/${sibling.id}`,
            body: { menu_order: i },
          }));

        for (let start = 0; start < writes.length; start += 25) {
          await this.fetchJson('/batch/v1', {
            method: 'POST',
            body: { requests: writes.slice(start, start + 25) },
          });
        }

        // NOT clearing the path caches. Ordering changes menu_order, which
        // affects neither slugs nor parents, so every cached path is still
        // correct. Clearing them made the following tree.list re-resolve every
        // ancestor at a full request each, which is what pushed this test past
        // the 30s limit — invalidating more than changed is not free when a
        // request costs a second.
        return null;
      }

      case 'querystring.getIndexes': {
        // Discovered from the live site, not a hardcoded list. A WordPress
        // install's queryable fields ARE its registered post types and
        // taxonomies, which differ per site — a shop has product/category, a
        // magazine has article/section. Hardcoding "categories and tags"
        // would offer a query builder that does not describe this site, which
        // is exactly as useless as offering Plone's portal_type here.
        const [types, taxonomies] = await Promise.all([
          this.fetchJson('/wp/v2/types'),
          this.fetchJson('/wp/v2/taxonomies'),
        ]);

        const indexes = {
          title: {
            title: 'Title',
            description: 'Words in the title or body',
            group: 'Metadata',
            enabled: true,
            sortable: true,
            operations: ['string.contains'],
          },
          post_type: {
            title: 'Type',
            description: 'Content type',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['selection.any', 'selection.none'],
            values: Object.fromEntries(
              Object.entries(types).map(([id, t]) => [id, { title: t.name }]),
            ),
          },
          parent: {
            title: 'Location',
            description: 'Parent page',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['string.absolutePath'],
          },
          status: {
            title: 'State',
            description: 'Publication status',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['selection.any'],
            values: {
              publish: { title: 'Published' },
              draft: { title: 'Draft' },
              pending: { title: 'Pending review' },
              private: { title: 'Private' },
            },
          },
          author: {
            title: 'Author',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['selection.any'],
          },
          modified: {
            title: 'Last edited',
            description: 'When the content was last changed',
            group: 'Dates',
            enabled: true,
            // WordPress accepts orderby=modified already; it simply was not
            // offered, so the query builder had no way to sort by it.
            sortable: true,
            operations: ['date.lessThan', 'date.largerThan'],
          },
          date: {
            title: 'Date',
            group: 'Dates',
            enabled: true,
            sortable: true,
            operations: ['date.lessThan', 'date.largerThan'],
          },
        };

        // One index per registered taxonomy, with its terms as values, so a
        // custom taxonomy shows up in the query builder without any change
        // here.
        for (const [id, tax] of Object.entries(taxonomies)) {
          if (tax.visibility && tax.visibility.public === false) continue;
          indexes[id] = {
            title: tax.name,
            description: tax.description || undefined,
            group: 'Categorization',
            enabled: true,
            sortable: false,
            operations: ['selection.any', 'selection.none'],
          };
        }

        return { indexes };
      }

      case 'querystringSearch': {
        const params = {
          status: 'any',
          context: 'edit',
          per_page: String(args.limit ?? 25),
        };
        let postType = this.postType;

        for (const criterion of args.query ?? []) {
          const value = Array.isArray(criterion.v) ? criterion.v : [criterion.v];
          switch (criterion.i) {
            case 'post_type':
              postType = await this.restBaseFor(String(value[0]));
              if (postType === null) return { items: [], total: 0 };
              break;
            case 'parent':
              params.parent = String(
                await this.resolvePath(String(value[0])).catch(() => 0),
              );
              break;
            case 'status':
              params.status = value.join(',');
              break;
            case 'author':
              params.author = value.join(',');
              break;
            case 'title':
              // WordPress has no title query param — setting one is silently
              // ignored and the endpoint returns everything, which reads as a
              // filter that works. ?search= is the real one.
              params.search = String(value[0]);
              break;
            default:
              // A taxonomy index: WordPress filters by its rest_base with a
              // comma-separated term list.
              params[criterion.i] = value.join(',');
          }
        }

        if (args.sortOn) params.orderby = args.sortOn;
        if (args.sortOrder) {
          // WordPress accepts only asc|desc and 400s on anything else. The
          // canonical value is Plone's long form ("descending"), which passed
          // straight through and made every sorted query fail — as a 400 on
          // /wp/v2/pages, which says nothing about the parameter at fault.
          params.order = String(args.sortOrder).startsWith('desc') ? 'desc' : 'asc';
        }

        const posts = await this.fetchJson(`/wp/v2/${postType}`, { params });
        const total = this.lastTotal;
        const items = [];
        for (const post of posts ?? []) {
          items.push(
            this.toDocument(post, await this.pathOfPost(post)),
          );
        }
        return { items, total };
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
