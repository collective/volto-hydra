/**
 * Canonical shapes exchanged over the Hydra bridge.
 *
 * These are the CMS-neutral types every adapter must produce. They are
 * deliberately free of Plone-isms (`@id`, `UID`, `@components`): translating
 * to whatever the Volto admin currently consumes is `plonify()`'s job on the
 * admin side, not the adapter's.
 *
 * Types only — this package has no runtime and no build step.
 */

export type Capability =
  | 'content'
  | 'search-fulltext'
  | 'search-filter'
  | 'vocabulary'
  | 'schema'
  | 'asset'
  /** Has lifecycle states and transitions at all. */
  | 'state'
  /** Supports per-document principal grants (Plone yes, Strapi no). */
  | 'per-content-permissions'
  /** Supports inherit-from-parent / break-inheritance. Plone-only in practice. */
  | 'hierarchical-permissions'
  | 'versioning'
  | 'sharing'
  | 'comments';

export type Intent =
  | 'content.get'
  | 'content.create'
  | 'content.update'
  | 'content.delete'
  | 'content.order'
  | 'content.move'
  | 'types.list'
  | 'types.getSchema'
  | 'search'
  | 'navigation.get'
  | 'breadcrumbs.get'
  | 'tree.list'
  | 'vocabulary.get'
  | 'asset.upload'
  | 'asset.imageUrl'
  | 'auth.whoami'
  /**
   * Turn a stable document id into something renderable, and back. Links
   * between documents MUST be stored by id, never by path: a path changes when
   * the target is renamed or moved and every link to it dies silently. Plone
   * solved this with resolveuid; WordPress has no native equivalent, so its
   * adapter has to supply one.
   */
  | 'reference.resolve'
  /**
   * Listings. `querystring.getIndexes` describes what can be queried and how;
   * `querystringSearch` runs one. Together they are the second highest volume
   * call in a normal editing session after schema, because every listing,
   * search and teaser block consults them.
   */
  | 'querystring.getIndexes'
  | 'querystringSearch'
  /** Lifecycle position, available transitions and effective permissions. */
  | 'state.get'
  | 'state.transition'
  | 'permissions.update'
  | 'http';

export interface Document {
  /** Opaque CMS id (Plone UID, WP post id, Drupal uuid) — always a string. */
  id: string;
  /** CMS-relative path, leading slash, never an absolute URL. */
  path: string;
  type: string;
  title: string;
  language?: string;
  blocks: Record<string, unknown>;
  blocksLayout: { items: string[] };
  fields: Record<string, unknown>;
  /** Canonical workflow state, mapped by the adapter from its CMS's names. */
  state?: string;
  /** Escape hatch for adapter-internal use. Never read by the admin. */
  _adapter?: { raw: unknown };
}

export interface Schema {
  fieldsets: Array<{ id: string; title: string; fields: string[] }>;
  properties: Record<string, unknown>;
  required: string[];
}

export interface User {
  id: string;
  username: string;
  fullname?: string;
  email?: string;
  roles: string[];
}

export interface SearchResult {
  items: Document[];
  total: number;
  batching?: { next?: string; prev?: string };
}

/**
 * A stored pointer from one document to another.
 *
 * `id` is the contract; `path` and `url` are conveniences valid only at the
 * moment of resolution and must never be persisted in their place.
 */
export interface Reference {
  id: string;
  path: string;
  url: string;
  title: string;
}

/**
 * One queryable field, and what may be done with it.
 *
 * Index NAMES are CMS-specific (Plone portal_type, WordPress post_type), the
 * same way content type names are — callers discover them here rather than
 * hardcoding. Operations are canonical so the query builder is CMS-neutral.
 */
export interface QueryIndex {
  title: string;
  description?: string;
  group?: string;
  enabled: boolean;
  sortable: boolean;
  /** Canonical operation ids this index supports, e.g. 'selection.any'. */
  operations: string[];
  /** Selectable values, when the index is an enumeration. */
  values?: Record<string, { title: string }>;
}

/** One criterion: index, operation, value. */
export interface QueryCriterion {
  i: string;
  o: string;
  v?: unknown;
}

export interface Vocabulary {
  items: Array<{ token: string; title: string }>;
  total: number;
}

/**
 * Workflow and sharing unified.
 *
 * Plone keeps them as separate UIs, but they answer one question: who can do
 * what, when. Modelling them separately would force every adapter to invent a
 * mapping twice, and most CMSes do not have two concepts to map. Each CMS
 * lights up the parts it supports; capabilities gate the rest.
 */
export interface PermissionsAndState {
  /** Lifecycle position. Always present. */
  state: { name: string; label: string };
  /**
   * Transitions available to the current user right now. The Publish / Submit
   * / Reject buttons render from this — there is no separate workflow concept.
   */
  transitions: Array<{ id: string; label: string; targetState: string }>;
  /** What the current user may do. UI gates visible/enabled controls on this. */
  effective: {
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComment: boolean;
  };
  /**
   * Per-document principal grants. Only adapters advertising
   * `per-content-permissions` return this; others return null and the sharing
   * half of the panel hides. `inherited` is always false unless the adapter
   * also advertises `hierarchical-permissions`.
   */
  shareEntries?: Array<{
    principal: { type: 'user' | 'group' | 'role'; id: string; label: string };
    permissions: Array<'read' | 'edit' | 'publish' | 'delete'>;
    inherited: boolean;
  }> | null;
}

export interface AdapterContext {
  cmsBaseUrl: string;
  emit(event: 'auth-required' | 'auth-state', payload: unknown): void;
}

export interface HydraAdapter {
  name: string;
  capabilities: Capability[];
  init(ctx: AdapterContext): Promise<void>;
  whoami(): Promise<User | null>;
  getAdminUrl(panel: string): string | null;
  dispatch(intent: Intent, args: unknown): Promise<unknown>;
}
