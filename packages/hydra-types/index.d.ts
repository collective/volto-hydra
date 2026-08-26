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
  | 'workflow'
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

export interface Vocabulary {
  items: Array<{ token: string; title: string }>;
  total: number;
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
