import { BaseAdapter, AdapterError } from '@volto-hydra/hydra-adapters-core';
import { flattenPayload, aliasOf } from './normalize.js';

/**
 * Hydra adapter for Drupal via JSON:API.
 *
 * Two things make Drupal unlike Plone and WordPress:
 *
 *  - Nodes are FLAT. There is no parent pointer and no tree. Hierarchy comes
 *    from menu links, which is how Drupal sites actually express structure.
 *    Content with no menu link therefore has no place in the tree at all, so
 *    it surfaces in a virtual folder rather than being invisible.
 *  - A path alias is the document's URL and carries no structure. Moving a
 *    document re-parents its MENU LINK; it must NOT rewrite a published URL.
 */

/** Virtual folder listing content that has no menu link yet. */
export const UNFILED_PATH = '/_unfiled';

const STATE_MAP = { true: 'published', false: 'draft' };

export class DrupalAdapter extends BaseAdapter {
  constructor({ cmsBaseUrl, credentials, bundle = 'page' } = {}) {
    super({
      name: 'drupal',
      capabilities: [
        'content',
        // Core Drupal has no full-text index; that needs the search_api
        // contrib module. Advertising search-fulltext here would hand the
        // editor a search box that quietly returns nothing.
        'search-filter',
        'vocabulary',
        'schema',
        'asset',
        'state',
      ],
    });
    this.cmsBaseUrl = cmsBaseUrl;
    this.credentials = credentials ?? null;
    this.bundle = bundle;
    this.csrfToken = null;
  }

  async init(ctx) {
    await super.init(ctx);
    this.cmsBaseUrl = ctx.cmsBaseUrl ?? this.cmsBaseUrl;
    if (!this.csrfToken) this.csrfToken = await this.fetchCsrfToken();
  }

  /** Drupal requires a CSRF token for every write. */
  async fetchCsrfToken() {
    const res = await fetch(`${this.cmsBaseUrl}/session/token`, {
      credentials: this.credentials ? 'omit' : 'include',
      headers: this.authHeaders(),
    });
    if (!res.ok) return null;
    return (await res.text()).trim();
  }

  authHeaders() {
    if (!this.credentials) return {};
    const { username, password } = this.credentials;
    return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
  }

  async fetchJson(route, { method = 'GET', body, params } = {}) {
    const qs = params ? `?${params}` : '';
    const headers = {
      Accept: 'application/vnd.api+json',
      ...this.authHeaders(),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/vnd.api+json';
    if (method !== 'GET' && this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;

    const res = await fetch(`${this.cmsBaseUrl}${route}${qs}`, {
      // With explicit credentials we must NOT also send cookies: a wildcard
      // Access-Control-Allow-Origin — what a dev CMS typically returns —
      // makes the browser reject a credentialled cross-origin request
      // outright, surfacing only as "Failed to fetch". Cookie auth is the
      // same-origin case. The Plone adapter had this exact bug.
      credentials: this.credentials ? 'omit' : 'include',
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403) {
      throw new AdapterError('Unauthorized', { code: 'UNAUTHORIZED', status: 401 });
    }
    if (res.status === 404) {
      throw new AdapterError(`Not found: ${route}`, { code: 'NOT_FOUND', status: 404 });
    }
    if (!res.ok) {
      throw new AdapterError(`Drupal returned ${res.status} for ${route}`, {
        code: 'SERVER_ERROR',
        status: res.status,
      });
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text.length === 0 ? null : JSON.parse(text);
  }

  // --- lookups -----------------------------------------------------------

  async nodeByAlias(alias) {
    const payload = await this.fetchJson(`/jsonapi/node/${this.bundle}`, {
      params: `filter[path.alias]=${encodeURIComponent(alias)}`,
    });
    const flat = flattenPayload(payload) ?? [];
    if (flat.length === 0) {
      throw new AdapterError(`Not found: ${alias}`, { code: 'NOT_FOUND', status: 404 });
    }
    return flat[0];
  }

  async nodeByUuid(id) {
    const payload = await this.fetchJson(`/jsonapi/node/${this.bundle}/${id}`);
    return flattenPayload(payload);
  }

  async allMenuLinks() {
    const payload = await this.fetchJson(
      '/jsonapi/menu_link_content/menu_link_content',
    );
    return flattenPayload(payload) ?? [];
  }

  toDocument(flat) {
    const blocksRaw = flat.attributes.field_hydra_blocks;
    const parsed = blocksRaw ? JSON.parse(blocksRaw) : {};
    return {
      id: flat.id,
      path: aliasOf(flat),
      type: flat.attributes.drupal_internal__type ?? this.bundle,
      title: flat.attributes.title,
      blocks: parsed.blocks ?? {},
      blocksLayout: parsed.blocksLayout ?? { items: [] },
      fields: { nid: flat.attributes.drupal_internal__nid },
      state: STATE_MAP[String(flat.attributes.status)] ?? 'draft',
      _adapter: { raw: flat },
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
      case 'content.get':
        return this.toDocument(await this.nodeByAlias(args.path));

      case 'content.update': {
        const node = await this.nodeByAlias(args.path);
        const attributes = {};
        if (args.data.title !== undefined) attributes.title = args.data.title;
        if (args.data.blocks !== undefined) {
          attributes.field_hydra_blocks = JSON.stringify({
            v: 1,
            blocks: args.data.blocks,
            blocksLayout: args.data.blocksLayout ?? { items: [] },
          });
        }
        await this.fetchJson(`/jsonapi/node/${this.bundle}/${node.id}`, {
          method: 'PATCH',
          body: { data: { type: `node--${this.bundle}`, id: node.id, attributes } },
        });
        return null;
      }

      case 'content.create': {
        const slug = String(args.data.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const parent = args.parentPath === '/' ? '' : args.parentPath;
        const alias = `${parent}/${slug}`;

        const created = flattenPayload(
          await this.fetchJson(`/jsonapi/node/${this.bundle}`, {
            method: 'POST',
            body: {
              data: {
                type: `node--${this.bundle}`,
                attributes: {
                  title: args.data.title,
                  status: false,
                  path: { alias },
                  field_hydra_blocks: JSON.stringify({
                    v: 1,
                    blocks: args.data.blocks ?? {},
                    blocksLayout: args.data.blocksLayout ?? { items: [] },
                  }),
                },
              },
            },
          }),
        );

        // Give it a place in the tree straight away, under the requested
        // parent — otherwise a newly created document would land in the
        // virtual folder, which is for content that never got filed.
        await this.linkNode(created.id, args.parentPath);
        return this.toDocument(created);
      }

      case 'content.delete': {
        const node = await this.nodeByAlias(args.path);
        await this.fetchJson(`/jsonapi/node/${this.bundle}/${node.id}`, {
          method: 'DELETE',
        });
        return null;
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
        const node = await this.nodeByAlias(args.path);
        await this.linkNode(node.id, args.targetParentPath);
        // The alias is deliberately untouched: in Drupal the URL is not the
        // tree position, and re-filing a document must not break its links.
        return this.toDocument(await this.nodeByUuid(node.id));
      }

      case 'content.order': {
        const node = await this.nodeByAlias(args.path);
        const links = await this.allMenuLinks();
        const link = links.find((l) => l.relationships.node?.id === node.id);
        if (!link) {
          throw new AdapterError(`${args.path} has no menu link to order`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }

        // Renumber the whole sibling set rather than assigning the target
        // index as a weight. Menu weights start life all-equal, so setting one
        // to 0 among zeroes is a tie and reorders nothing — the operation
        // would appear to succeed and do nothing at all.
        const parentId = link.relationships.parent?.id ?? null;
        const siblings = links
          .filter((l) => (l.relationships.parent?.id ?? null) === parentId)
          .sort((a, b) => (a.attributes.weight ?? 0) - (b.attributes.weight ?? 0));

        const without = siblings.filter((l) => l.id !== link.id);
        const at = Math.max(0, Math.min(args.targetIndex ?? 0, without.length));
        without.splice(at, 0, link);

        for (const [index, sibling] of without.entries()) {
          await this.fetchJson(
            `/jsonapi/menu_link_content/menu_link_content/${sibling.id}`,
            {
              method: 'PATCH',
              body: {
                data: {
                  type: 'menu_link_content--menu_link_content',
                  id: sibling.id,
                  attributes: { weight: index },
                },
              },
            },
          );
        }
        return null;
      }

      case 'tree.list': {
        const links = await this.allMenuLinks();

        // The virtual folder: everything with no menu link. Without it a
        // document created outside Hydra would exist and be unreachable.
        if (args.parent === UNFILED_PATH) {
          const filed = new Set(
            links.map((l) => l.relationships.node?.id).filter(Boolean),
          );
          const all = flattenPayload(
            await this.fetchJson(`/jsonapi/node/${this.bundle}`),
          );
          const unfiled = all.filter((n) => !filed.has(n.id));
          return { items: unfiled.map((n) => this.toDocument(n)), total: unfiled.length };
        }

        const parentLinkId =
          args.parent === '/' ? null : await this.linkIdForPath(args.parent);
        const children = links
          .filter((l) => (l.relationships.parent?.id ?? null) === parentLinkId)
          // Menu weight IS the sibling order; without sorting, content.order
          // would appear to do nothing.
          .sort((a, b) => (a.attributes.weight ?? 0) - (b.attributes.weight ?? 0));
        const items = [];
        for (const child of children) {
          const nodeId = child.relationships.node?.id;
          if (!nodeId) continue;
          items.push(this.toDocument(await this.nodeByUuid(nodeId)));
        }
        return { items, total: items.length };
      }

      case 'breadcrumbs.get': {
        const links = await this.allMenuLinks();
        const byId = new Map(links.map((l) => [l.id, l]));
        let current = links.find(
          async (l) => l.relationships.node?.id === (await this.nodeByAlias(args.path)).id,
        );
        const node = await this.nodeByAlias(args.path);
        current = links.find((l) => l.relationships.node?.id === node.id) ?? null;

        const trail = [];
        while (current) {
          const nodeId = current.relationships.node?.id;
          if (nodeId) trail.unshift(this.toDocument(await this.nodeByUuid(nodeId)));
          const parentId = current.relationships.parent?.id ?? null;
          current = parentId ? byId.get(parentId) : null;
        }
        return { items: trail };
      }

      case 'navigation.get': {
        const links = await this.allMenuLinks();
        const top = links.filter((l) => !l.relationships.parent?.id);
        const items = [];
        for (const l of top) {
          const nodeId = l.relationships.node?.id;
          if (nodeId) items.push(this.toDocument(await this.nodeByUuid(nodeId)));
        }
        return { items };
      }

      // `search` is the FULL-TEXT intent and core Drupal has no full-text
      // index — that needs the search_api contrib module. Answering it with a
      // title-substring filter would be the dishonest option: the editor gets
      // a search box that silently misses anything not in a title. Filtered
      // discovery goes through querystringSearch instead, which is why this
      // adapter advertises search-filter and not search-fulltext.


      case 'auth.whoami': {
        const payload = await this.fetchJson('/jsonapi/user/user');
        const flat = (flattenPayload(payload) ?? [])[0];
        if (!flat) {
          throw new AdapterError('No user for this session', {
            code: 'UNAUTHORIZED',
            status: 401,
          });
        }
        return {
          id: flat.id,
          username: flat.attributes.name,
          fullname: flat.attributes.display_name,
          email: flat.attributes.mail,
          roles: flat.attributes.roles ?? [],
        };
      }

      case 'types.list': {
        const flat = flattenPayload(
          await this.fetchJson('/jsonapi/node_type/node_type'),
        );
        return {
          items: (flat ?? []).map((t) => ({
            id: t.attributes.drupal_internal__type,
            title: t.attributes.name,
            addable: true,
          })),
        };
      }

      case 'types.getSchema': {
        // JSON:API exposes no canonical schema, so it is assembled from field
        // config — the static-schema fallback the spec anticipated.
        const flat =
          flattenPayload(await this.fetchJson('/jsonapi/field_config/field_config')) ??
          [];
        const fields = flat.filter((f) => f.attributes.bundle === args.type);
        if (fields.length === 0) {
          throw new AdapterError(`No such content type: ${args.type}`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }
        const properties = {};
        for (const f of fields) {
          properties[f.attributes.field_name] = {
            title: f.attributes.label,
            type: f.attributes.field_type,
          };
        }
        return {
          properties,
          fieldsets: [
            { id: 'default', title: 'Default', fields: Object.keys(properties) },
          ],
          required: fields
            .filter((f) => f.attributes.required)
            .map((f) => f.attributes.field_name),
        };
      }

      case 'vocabulary.get': {
        const params = new URLSearchParams();
        if (args.title) {
          params.set('filter[name][operator]', 'CONTAINS');
          params.set('filter[name][value]', args.title);
        }
        params.set('page[limit]', String(args.limit ?? 25));
        const payload = await this.fetchJson(
          `/jsonapi/taxonomy_term/${encodeURIComponent(args.name)}`,
          { params: params.toString() },
        );
        const flat = flattenPayload(payload) ?? [];
        return {
          items: flat.map((t) => ({ token: t.id, title: t.attributes.name })),
          total: payload?.meta?.count ?? flat.length,
        };
      }

      case 'state.get': {
        const node = await this.nodeByAlias(args.path);
        const published = node.attributes.status === true;
        return {
          state: {
            name: published ? 'published' : 'draft',
            label: published ? 'Published' : 'Draft',
          },
          transitions: published
            ? [{ id: 'unpublish', label: 'Unpublish', targetState: 'draft' }]
            : [{ id: 'publish', label: 'Publish', targetState: 'published' }],
          effective: {
            canEdit: true,
            canPublish: true,
            canDelete: true,
            canShare: false,
            canComment: false,
          },
          // Core Drupal has no per-node principal grants; that needs the
          // Group module. The sharing half of the panel hides on this.
          shareEntries: null,
        };
      }

      case 'state.transition': {
        const node = await this.nodeByAlias(args.path);
        await this.fetchJson(`/jsonapi/node/${this.bundle}/${node.id}`, {
          method: 'PATCH',
          body: {
            data: {
              type: `node--${this.bundle}`,
              id: node.id,
              attributes: { status: args.id === 'publish' },
            },
          },
        });
        return null;
      }

      case 'asset.upload': {
        const binary = Uint8Array.from(atob(args.data), (c) => c.charCodeAt(0));
        const res = await fetch(
          `${this.cmsBaseUrl}/jsonapi/node/${this.bundle}/field_media_image`,
          {
            method: 'POST',
            credentials: this.credentials ? 'omit' : 'include',
            headers: {
              ...this.authHeaders(),
              ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
              'Content-Type': args.contentType,
              'Content-Disposition': `file; filename="${args.filename}"`,
            },
            body: binary,
          },
        );
        if (!res.ok) {
          throw new AdapterError(`Upload failed: ${res.status}`, {
            code: 'UPLOAD_FAILED',
            status: res.status,
          });
        }
        const file = flattenPayload(await res.json());
        return {
          id: file.id,
          path: file.attributes.uri?.url ?? `/${file.attributes.filename}`,
          type: 'file',
          title: file.attributes.filename,
          blocks: {},
          blocksLayout: { items: [] },
          fields: { filename: file.attributes.filename },
          state: 'published',
          _adapter: { raw: file },
        };
      }

      case 'asset.imageUrl': {
        // Drupal core serves the original file; named image styles require
        // configuration, so the original is the honest answer rather than a
        // fabricated style URL that would 404.
        return `${this.cmsBaseUrl}${args.path}`;
      }

      case 'querystring.getIndexes': {
        // Discovered from the site's own content types and fields, so the
        // query builder describes THIS Drupal rather than Drupal in general.
        const [types, fields] = await Promise.all([
          this.dispatchOnce('types.list', {}),
          this.fetchJson('/jsonapi/field_config/field_config'),
        ]);
        const flatFields = flattenPayload(fields) ?? [];

        const indexes = {
          node_type: {
            title: 'Type',
            description: 'Content type',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['selection.any', 'selection.none'],
            values: Object.fromEntries(
              types.items.map((t) => [t.id, { title: t.title }]),
            ),
          },
          menu_parent: {
            title: 'Location',
            description: 'Parent in the menu tree',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            // Drupal's hierarchy is the menu, so "under this path" means
            // "under this menu item" rather than a path prefix match.
            operations: ['string.absolutePath'],
          },
          status: {
            title: 'State',
            group: 'Metadata',
            enabled: true,
            sortable: false,
            operations: ['selection.any'],
            values: {
              published: { title: 'Published' },
              draft: { title: 'Draft' },
            },
          },
          title: {
            title: 'Title',
            group: 'Metadata',
            enabled: true,
            sortable: true,
            operations: ['string.contains'],
          },
        };

        for (const f of flatFields) {
          const name = f.attributes.field_name;
          if (!name?.startsWith('field_') || name === 'field_hydra_blocks') continue;
          indexes[name] = {
            title: f.attributes.label,
            group: 'Fields',
            enabled: true,
            sortable: false,
            operations: ['selection.any'],
          };
        }

        return { indexes };
      }

      case 'querystringSearch': {
        const params = new URLSearchParams();
        let menuParent = null;

        for (const criterion of args.query ?? []) {
          const value = Array.isArray(criterion.v) ? criterion.v : [criterion.v];
          switch (criterion.i) {
            case 'node_type':
              params.set('filter[node_type]', String(value[0]));
              break;
            case 'menu_parent':
              menuParent = String(value[0]);
              break;
            case 'status':
              params.set('filter[status]', value[0] === 'published' ? '1' : '0');
              break;
            case 'title':
              params.set('filter[title][operator]', 'CONTAINS');
              params.set('filter[title][value]', String(value[0]));
              break;
            default:
              params.set(`filter[${criterion.i}]`, value.join(','));
          }
        }

        // A menu-parent filter is a tree question, not a field one, so it is
        // answered from the menu rather than pushed into the node query.
        if (menuParent) {
          const subtree = await this.dispatchOnce('tree.list', {
            parent: menuParent,
          });
          const limited = args.limit
            ? subtree.items.slice(0, args.limit)
            : subtree.items;
          return { items: limited, total: subtree.total };
        }

        if (args.limit) params.set('page[limit]', String(args.limit));
        const payload = await this.fetchJson(`/jsonapi/node/${this.bundle}`, {
          params: params.toString(),
        });
        const flat = flattenPayload(payload) ?? [];
        return {
          items: flat.map((n) => this.toDocument(n)),
          total: payload?.meta?.count ?? flat.length,
        };
      }

      case 'reference.resolve': {
        // A uuid never changes — not when the title changes, not when the
        // document is re-filed under a different menu parent.
        const flat = await this.nodeByUuid(args.id).catch(() => null);
        if (!flat) {
          throw new AdapterError(`No document with id ${args.id}`, {
            code: 'NOT_FOUND',
            status: 404,
          });
        }
        const path = aliasOf(flat);
        return {
          id: flat.id,
          path,
          url: `${this.cmsBaseUrl}${path}`,
          title: flat.attributes.title,
        };
      }

      default:
        return super.dispatch(intent, args);
    }
  }

  /** Find the menu link id that represents a path, for use as a parent. */
  async linkIdForPath(pathValue) {
    const node = await this.nodeByAlias(pathValue);
    const link = (await this.allMenuLinks()).find(
      (l) => l.relationships.node?.id === node.id,
    );
    return link ? link.id : null;
  }

  /** Put a node under a parent path in the menu tree, creating or re-parenting. */
  async linkNode(nodeId, parentPath) {
    const parentLinkId =
      parentPath === '/' || !parentPath ? null : await this.linkIdForPath(parentPath);
    const existing = (await this.allMenuLinks()).find(
      (l) => l.relationships.node?.id === nodeId,
    );
    const parentRel = parentLinkId
      ? { type: 'menu_link_content--menu_link_content', id: parentLinkId }
      : null;

    if (existing) {
      await this.fetchJson(
        `/jsonapi/menu_link_content/menu_link_content/${existing.id}`,
        {
          method: 'PATCH',
          body: {
            data: {
              type: 'menu_link_content--menu_link_content',
              id: existing.id,
              relationships: { parent: { data: parentRel } },
            },
          },
        },
      );
      return existing.id;
    }

    const created = await this.fetchJson(
      '/jsonapi/menu_link_content/menu_link_content',
      {
        method: 'POST',
        body: {
          data: {
            type: 'menu_link_content--menu_link_content',
            attributes: { weight: 0 },
            relationships: {
              node: { data: { type: `node--${this.bundle}`, id: nodeId } },
              parent: { data: parentRel },
            },
          },
        },
      },
    );
    return created?.data?.id ?? null;
  }
}

export default DrupalAdapter;
