# Hydra as a CMS-agnostic universal headless editor

## Context

Volto Hydra today is hard-bound to Plone: the admin shell makes ~30 distinct Plone-REST patterns via one Redux `apiMiddleware`, and the bridge to the iframe is push-only (admin→iframe). The goal of this work is to turn Hydra into a universal visual editor for headless CMSes — WordPress, Drupal, Strapi, Wagtail, … — with Plone becoming one peer adapter among others.

Strategic choices already made (via clarifying questions + user feedback):

- **Deliverable**: framework + 1 reference adapter (WordPress) end-to-end. Other adapters land later.
- **First adapter**: WordPress.
- **Plone**: becomes a peer adapter (`@hydra-adapters/plone`), not the canonical baseline.
- **Hosting model**: Hydra is hosted standalone (e.g. `hydra.example.com`).
- **Hydra is CMS-blind**: the admin shell holds zero knowledge of any CMS. The user picks a saved **frontend root URL** (one or two per Hydra deployment, persisted in cookie). The frontend bundles its own adapter + handles its own auth and registers the adapter with the bridge at INIT.
- **No WP plugin in the default path**: vanilla `/wp-json/wp/v2/*` is enough. Blocks stored inside `post_content` as Gutenberg-style HTML-comment blocks. Plugin reserved as an optional extension.
- **Timeline**: 1–2 months for framework + WP MVP.

## Target architecture

Three origins involved:

- **Admin shell** at `hydra.example.com`. Pure SPA. Holds NO credentials and NO CMS-specific code. Has one input: the frontend URL to iframe.
- **Iframe (frontend in edit mode)**. Loaded at the frontend's own origin (typically same-origin as the CMS). Bundles `hydra-js` + exactly one adapter (`@hydra-adapters/{plone,wordpress,...}`). The frontend's bootstrap calls `initBridge({ adapter, cmsBaseUrl, ...resolveCredential() })`. The bridge announces `capabilities` and identity in the INIT/AUTH_STATE handshake.
- **CMS** at e.g. `cms.acme.com` (typically same-origin as the frontend). For WordPress: vanilla install. For Plone: vanilla `plone.restapi`. No CMS-side plugin required for the default same-origin path.

Data flow inversion: every Plone-style REST call the admin makes today becomes a `BACKEND_REQUEST` over the bridge. The iframe's adapter executes the call (with the user's existing CMS session — typically a cookie + nonce), normalises the response, and returns it via `BACKEND_RESPONSE`. The admin holds zero credentials and makes zero direct CMS calls.

### Two ways into the editor

The user doesn't paste edit URLs one at a time — they pick once and browse:

1. **Saved frontend roots** (cookie-persisted, 1-2 entries typical for most users — a single CMS with one or two frontends). First-run prompts for a root URL; subsequent sessions auto-load the most recent. A small dropdown appears when more than one is saved; an "Add another frontend root" link surfaces additional entries. Multi-site / multi-CMS users get this for free without a heavyweight SitePicker.

2. **Volto's content browser is retained.** The existing contents view at `/path/contents` keeps working — it just renders through the bridge via the adapter's `content.list` / `search` intents instead of fetching Plone directly. Users browse the folder/list to find a page and click Edit, exactly as today. A richer tree view is a post-MVP enhancement; the current flat-per-folder list is enough for MVP.

3. **Browse the live site.** The frontend in view mode can render an "Edit this page" toggle. Clicking it loads the iframe into edit mode. Useful for "I'm reading this page and want to fix a typo" flows. Adapter-independent — the frontend implements the toggle however it wants.

### Auth methods supported (the user stays in Hydra)

We do NOT redirect users to the CMS's native login page. That breaks the "start at Hydra, end at Hydra" experience and would force per-CMS customization for the round-trip. Instead, the adapter **declares** an `authMethod` in its handshake, and Hydra renders the appropriate UI inside the admin shell. The adapter implements the actual auth call (or OAuth exchange) via the bridge. Hydra stays CMS-blind because the form is schema-data, not hardcoded UI.

Four supported auth methods (an adapter picks one as primary, can advertise more as fallbacks):

| Method | When the adapter picks it | What Hydra renders | Adapter's job |
| --- | --- | --- | --- |
| `cookie-passthrough` | Iframe is same-origin to CMS AND user already has a session cookie | Nothing — direct to editor | Just probe `whoami`; emit `ADAPTER_READY` on success |
| `form` | The CMS exposes a credentialled REST endpoint (WP: `/jwt-auth/v1/token` from a JWT plugin; OR the user pastes an app-password; Plone: `@login`) | Schema-driven login form (username / password / app-password fields per adapter's declared schema) | On submit, performs the login HTTP call (same-origin to CMS), stores resulting token in frontend-origin `localStorage`, retries `whoami` |
| `oauth` | The CMS supports OAuth/OIDC (WP w/ "WP OAuth Server" plugin, Plone w/ `pas.plugins.authomatic`, Drupal core OAuth, Strapi providers) | "Sign in with {CMS}" button that opens a popup window | Drives the OAuth dance (popup → CMS authorize → callback at frontend's origin → `postMessage` code → exchange for token); stores token |
| `device-code` | (Future) Headless / TV-style flow | Code + "go to URL X and enter code Y" | Polls token endpoint until user approves |

The adapter announces its preferred method in `ADAPTER_READY`. Hydra's admin shell has ONE generic component, `<AuthChallenge schema={…} kind={…}>`, that renders whichever the adapter asked for. No CMS-specific code in Hydra.

#### Login flow (the biggest UX shift)

Today (Volto-Plone), Hydra itself owns login: there's a `/login` route, Volto stores a Plone JWT in a cookie, every action's `api.js` middleware reads that JWT and sends it as `Authorization: Bearer …`. The admin shell is the auth principal.

In the new architecture, Hydra has **no login UI at all**. Authentication happens entirely between the user and their CMS, in a tab/origin Hydra doesn't see. The adapter (in the iframe) is the only thing that knows or carries credentials. The bridge transports zero credentials. Comparison:

| Concern | Today (Volto-Plone) | New (Universal) |
| --- | --- | --- |
| Login UI is rendered by | Volto admin (`/login` route, hardcoded form) | Hydra admin (`<AuthChallenge>` generic, schema-driven by adapter) |
| Login UI is configured by | Hardcoded in Volto | Adapter declares `authMethod` + schema in `ADAPTER_READY` |
| Credential stored in | Volto cookie / localStorage | The frontend's origin's localStorage (set by adapter after successful auth) |
| Credential sent with API call | Volto reads + injects in every request | Adapter reads from its origin and adds the header (Bearer JWT, X-WP-Nonce, X-CSRF-Token, etc.); bridge carries nothing |
| Session expiry handling | Volto detects 401, redirects to `/login` | Adapter detects 401, emits `AUTH_REQUIRED`; admin re-renders `<AuthChallenge>` modal over editor (changes preserved in Redux) |
| Anonymous view mode | Volto can render | Hydra is always-authenticated; no anonymous mode (it's an editor, not a CMS) |
| Multi-CMS in one session | Not supported | Trivial — each iframe carries its own origin's auth; user can have several Hydra tabs open against different CMSes |

#### Flow A — happy path, same-origin

1. User logs into their CMS normally (visits `wp.acme.com/wp-admin`, signs in, cookie set on `.acme.com`).
2. User opens `hydra.example.com`. Hydra shows a single input: "Frontend URL".
3. User pastes `https://wp.acme.com/news/post-1/edit` (or a previously-bookmarked URL).
4. Iframe loads at `wp.acme.com/news/post-1/edit`. The cookie is sent automatically (same-origin).
5. Frontend's bootstrap calls `initBridge({ adapter: wpAdapter, cmsBaseUrl: location.origin })`.
6. Adapter's `init()` calls `auth.whoami` → `GET /wp-json/wp/v2/users/me` succeeds (cookie present, nonce from `window.wpApiSettings.nonce`).
7. Bridge sends `ADAPTER_READY { user, capabilities, extensions }` to admin.
8. Admin renders editor chrome around the iframe. Done — zero login UI shown.

#### Flow B — not logged in (the user stays in Hydra)

1. Steps 1-5 as above, but user has no session cookie.
2. Adapter's `whoami` returns 401.
3. Adapter emits `AUTH_REQUIRED { method: 'form', schema: { fields: [{ name: 'username', label: 'Username', type: 'text' }, { name: 'appPassword', label: 'Application Password', type: 'password', hint: 'Generate one in WP Admin → Users → Profile → Application Passwords' }] }, title: 'Sign in to WordPress' }`.
4. Hydra renders `<AuthChallenge>` IN PLACE of the iframe chrome — a clean modal with the schema-driven form.
5. User fills in username + app-password, hits Sign In.
6. Hydra sends `bridge.request('auth.login', { username, appPassword })`.
7. Adapter (in the iframe) makes a same-origin POST to `/wp-json/wp/v2/users/me` with `Authorization: Basic base64(username:appPassword)` to validate, then stores `{ username, appPassword }` in `localStorage` keyed by origin.
8. Adapter re-runs `whoami` → emits new `ADAPTER_READY` → admin replaces `<AuthChallenge>` with the editor. User never left Hydra.

For OAuth-capable adapters (`AUTH_REQUIRED { method: 'oauth', authorizeUrl, clientId, scopes, redirectUri }`), the same `<AuthChallenge>` shows a "Sign in with WordPress" button → popup → callback → back to editor — also without leaving Hydra.

#### Flow C — session expires mid-edit

1. User is editing; an hour passes; token expires.
2. Next save: adapter `content.update` returns 401.
3. Adapter emits `AUTH_REQUIRED` with the same schema as Flow B.
4. Admin shows a non-destructive `<AuthChallenge>` modal OVER the editor (editor visible but disabled). The editor stays open with unsaved changes intact in Redux.
5. User re-enters credentials (or the form pre-fills the username from `localStorage`, only password is fresh).
6. Adapter retries the queued save automatically once auth succeeds. Pending edits never lost. User stayed in Hydra throughout.

#### Flow D — cross-origin frontend (e.g. frontend at `preview.acme.com`, CMS at `cms.different.com`)

Same as Flow B from the user's perspective — they fill in a form inside Hydra. Behind the scenes, the adapter's login POST is cross-origin (needs CORS on the CMS — vanilla WP doesn't have it; either install the optional `hydra-bridge` plugin or use a reverse-proxy to add headers). Once a token is obtained, it's stored in the frontend's origin `localStorage` and used as a Bearer header on subsequent API calls (also cross-origin, also needing CORS). Token storage and CORS are the only differences; the UI flow is identical.

All three actors retain their natural responsibilities: the CMS owns identity (it validates credentials), the frontend's origin owns credential storage (Hydra never sees or stores them), Hydra owns presentation (renders the schema-driven form).

#### What's removed from Volto

- `/login` route in [core/packages/volto/src/routes.js](core/packages/volto/src/routes.js)
- `[Login.jsx](core/packages/volto/src/components/manage/Login/Login.jsx)` (the login form)
- `auth` reducer's cookie-storing logic
- The `Authorization` header injection in [api.js](core/packages/volto/src/middleware/api.js) — the adapter handles it, admin doesn't know what header to use
- `/logout` route — clicking "Sign out" in Hydra just clears Hydra's selected-frontend cache; the actual CMS logout requires going to the CMS

These deletions are part of Phase 2 (middleware redirect). Behind the `useBridgeBackend` flag, Volto's login flow is bypassed in favour of the adapter's session.

## Phase 0 — Bidirectional bridge-RPC

Today's bridge is push-only with one-off correlation patterns (`requestId`/`formatRequestId` on `SLATE_TRANSFORM_REQUEST` ↔ `FORM_DATA`; the OPEN_OBJECT_BROWSER fake-RPC). This phase formalises bidirectional RPC alongside the existing fire-and-forget traffic.

New message envelope (admin→iframe):

- `BACKEND_REQUEST { requestId, intent, args, meta: { timeoutMs } }`
- response (iframe→admin): `BACKEND_RESPONSE { requestId, ok, result | error: { code, status, message, data } }`

Iframe→admin unsolicited:

- `ADAPTER_READY { name, capabilities: ['content','search','vocabulary','workflow',...], cmsBaseUrl, user }` — sent right after the iframe's bootstrap calls `initBridge({ adapter, … })`. Tells the admin which UI affordances to render (no Workflow button if `'workflow'` absent, etc.).
- `AUTH_STATE { user, expiresAt, anonymous }` (heartbeat after each successful call)
- `AUTH_REQUIRED { reason, loginUrl? }` (on 401 / token expiry — admin shows non-destructive toast pointing to the loginUrl)

Shared helper: `class BridgeRPC` with a `Map<requestId, {resolve, reject, timer}>`. Default timeout 30 s; per-intent override (uploads 120 s).

Protocol-version handshake added to the existing `INIT` message: bridge advertises `capabilities: ['backend-rpc']`. Admin reads the capability set and falls back to direct fetch when missing (preserves old-style iframes during transition).

Files to touch:

- [packages/hydra-js/hydra.src.js](packages/hydra-js/hydra.src.js) — receiver-side BridgeRPC; adapter dispatch
- [packages/volto-hydra/src/components/Iframe/View.jsx](packages/volto-hydra/src/components/Iframe/View.jsx) — sender-side BridgeRPC; expose `window.__hydraBridge.request(intent, args)` for the middleware; consume ADAPTER_READY to gate UI affordances
- New: `packages/hydra-js/src/bridgeRpc.js` (envelope, error codes, version probe)
- New: `packages/volto-hydra/src/bridge/BridgeRPC.client.js` (admin-side)

Reuse: the INIT handshake site in [View.jsx](packages/volto-hydra/src/components/Iframe/View.jsx), the existing `requestId` correlation pattern from `FLUSH_BUFFER` and `SLATE_TRANSFORM_REQUEST` flows, and `iframeOriginRef` for postMessage targeting.

## Phase 1 — Adapter contract + canonical shapes

Adapter shape (declared by the frontend, registered at bridge init):

```ts
interface HydraAdapter {
  name: string;
  capabilities: Set<Capability>; // 'workflow' | 'sharing' | 'versioning' | 'comments' | ...
  init(ctx: AdapterContext): Promise<void>;
  whoami(): Promise<User | null>;
  getAdminUrl(panel: string): URL | null;  // for controlpanel delegation
  dispatch(intent: Intent, args: any): Promise<any>;
}

interface AdapterContext {
  cmsBaseUrl: string;
  emit: (event: 'auth-required' | 'auth-state', payload: any) => void;
  // No credential field — adapter resolves auth from its own origin (cookie, JWT in localStorage, etc.)
}
```

Frontend bootstrap (one-liner addition for the frontend developer):

```js
import { initBridge } from 'hydra-js'
import wpAdapter from '@hydra-adapters/wordpress'

if (window.name.startsWith('hydra')) {
  initBridge({
    adapter: wpAdapter,
    cmsBaseUrl: window.location.origin,  // same-origin WP
    // Vue/Svelte/React reactivity path is unaffected — adapter only handles
    // BACKEND_REQUEST traffic. onEditChange / renderEndpoint still apply.
  })
}
```

Intent enum (MVP set):

- Content: `content.get`, `content.create`, `content.update`, `content.delete`, `content.order`, `content.move`
- Schema/types: `types.list`, `types.getSchema`
- Search/listing: `search`, `navigation.get`, `breadcrumbs.get`
- Vocab: `vocabulary.get` (autocomplete-critical)
- Upload: `asset.upload`, `asset.imageUrl(field, scale)` (for variant URLs)
- Permissions + state (unified — see "Permissions & State" section): `state.get`, `state.transition`, `permissions.get`, optionally `permissions.update`
- Query language: `querystring.getIndexes` (returns the adapter's supported indexes + per-index operations + vocabularies — feeds Volto's existing QueryWidget which is already dynamic via `state.querystring.indexes`), `querystringSearch` (executes a Plone-shaped query payload against the adapter's CMS, translating to native filter syntax)
- Hierarchy: `tree.list({ parent })` (adapter returns whatever children make sense — Plone returns folder children; WP can return posts-in-category or pages-with-this-parent; Strapi returns collection items; Drupal returns menu children or content by type — capability-gated subfeatures: `move`, `reorder`)
- Auth: `auth.whoami`
- Escape hatch: `http` (raw `{method, path, body, headers}` passthrough — used by Plone adapter for the long tail of unmigrated calls; permanent transport for Plone-only features)

**Concepts explicitly dropped from the canonical layer** (scoping decisions from design conversation):

- `@components` expanders — collapsed into discrete intent calls. Adapter may batch internally; no special "expander" mechanism in the bridge.
- `@actions` catalog — Plone-specific UI fluff (Print, Contact, …). Not surfaced.
- Behaviors — implementation detail of how Plone assembles schemas. From Hydra's perspective, fields just exist; schema discovery covers it.
- Multilingual — outside the editor. CMS-native admin handles it; editor just edits whatever document was selected in whatever language.
- Working copy — folds into state lifecycle as a state, not a separate concept.
- Content rules / @rules — outside the editor. Delegated to native admin.

Canonical shapes — neutralised from Plone-isms:

- `Document = { id, path, type, title, language, blocks, blocksLayout, fields, _adapter: { raw } }`. `@id` → `path` (CMS-relative URL fragment), UID surfaces as `id` (opaque). `++api++` prefix lives only inside Plone adapter.
- `Schema = { fieldsets, properties, required }`. WP adapter synthesises this from `/wp/v2/types/{type}` registration.
- `User = { id, username, fullname, email, roles[] }`
- `SearchResult = { items: Document[], total, batching: { next, prev } }`
- `Vocabulary = { items: [{ token, title }], total }`

New packages (all under `packages/`):

- `hydra-types/` — pure TS types, zero runtime
- `hydra-adapters-core/` — base class, error helpers, URL utils, retry-on-401 wrapper

## Phase 2 — Middleware redirect + Plone adapter extraction

Cut over [core/packages/volto/src/middleware/api.js](core/packages/volto/src/middleware/api.js) so that, when running inside an iframe and the handshake reports `backend-rpc` capability, the existing `{op, path, data, headers}` becomes a `BACKEND_REQUEST { intent: 'http', args: { op, path, data, headers } }` instead of a direct fetch. Action creators stay unchanged in MVP — the `http` passthrough lets the Plone adapter mirror today's behaviour with zero refactor of the ~30 URL templates scattered across [core/packages/volto/src/actions/](core/packages/volto/src/actions/).

### The `http` passthrough intent (MVP migration shortcut)

**Important: ALL Plone API calls go through the bridge.** The admin shell holds zero credentials and makes zero direct fetches to any CMS — same rule as for WordPress. What differs is only the *shape* of the message on the wire.

The intent enum lists ~14 semantic intents (`content.get`, `search`, …) plus one passthrough: `http` with args `{op, path, data, headers}`. The passthrough exists for one reason — to avoid an all-or-nothing refactor cliff where nothing ships until every one of the ~30 URL templates scattered across the Volto action creators has been rewritten to emit a semantic intent.

How a Plone call flows in the new architecture (note: every step is identical to a WP call, except step 3):

1. Redux action dispatched in admin (e.g. `getContent('/news/post-1')`).
2. Action creator emits `action.request = { op:'get', path:'/news/post-1', headers:{Accept:'application/json'} }` — unchanged from today.
3. `api.js` middleware wraps it as `BACKEND_REQUEST { intent:'http', args: action.request }` and sends it over the bridge. (For WP, the equivalent step is `BACKEND_REQUEST { intent:'content.get', args:{path:'/news/post-1'} }` — semantic, not passthrough.)
4. Bridge routes it to the iframe's adapter (Plone adapter in this case).
5. Plone adapter executes the fetch: `fetch('${cmsBaseUrl}/++api++/news/post-1', { headers, credentials:'include' })`. This is the ONLY place a CMS-bound HTTP call happens.
6. Plone-shaped JSON response flows back as `BACKEND_RESPONSE` → middleware → Redux reducer → UI. Reducers see `@id` / `UID` / `@components` exactly as today; zero reducer changes needed.

Compare with a WP call: same bridge round-trip; only the adapter's translation step is different (it has to map `content.get` → `/wp-json/wp/v2/posts/{id}` and normalise the response). The Plone adapter's "translation" is trivial because the admin already speaks Plone's URL shape.

Why this matters for shipping: with `http` passthrough, the Plone test suite passes on day 1 of the cutover (`useBridgeBackend=true`), because nothing semantic changed — only the transport (direct fetch → bridge). Without it, we'd have to rewrite ~30 URL templates AND every reducer that consumes their responses, all before shipping anything.

What `http` is NOT:

- NOT "Plone skips the bridge" — it doesn't. All API traffic goes through it.
- NOT "the admin makes direct fetches when on Plone" — it doesn't. The admin never fetches a CMS directly.
- NOT permanent — it's a migration shortcut. Each action creator migrates from `{op, path}` → semantic intent in lockstep with non-Plone adapter coverage. Eventually `http` is unused and removed.

WP adapter does NOT implement `http` (it advertises `capabilities` but not a passthrough flag). When the admin would emit `http` against WP, the unmigrated action creator wasn't migrated because the WP flow doesn't exercise it — so the UI affordance that would trigger it is hidden via capability gating. No 501s in practice.

Migration cadence:

- **MVP**: migrate ONLY the action creators the WP adapter needs (content CRUD, search, vocab, types, upload, whoami) to emit semantic intents. Everything else stays on `http`. Plone fully works; WP works for the migrated subset.
- **Post-MVP**: migrate more action creators (workflow, sharing, history, …) as adapters opt in. Each migration is a small PR. When the last `http` user is migrated, drop the passthrough.

Feature flag: `config.settings.useBridgeBackend` in `api.js`. SSR path always uses direct fetch (no iframe at SSR; the Hydra editor route becomes client-only in standalone mode — add an `editorRoutes` flag to the SSR renderer to short-circuit).

Rollout sequence:

1. Phase 0 lands dark (protocol scaffold, no callers).
2. Middleware switch lands behind flag, default off.
3. Run the existing Plone Cypress suite with `useBridgeBackend=true` — proves the bridge is a transparent shim against the same backend.
4. Extract Plone URL templates from action creators into `packages/hydra-adapters-plone/` (`content.ts`, `types.ts`, `search.ts`, …). Each module knows `@types`, `@workflow`, `++api++`. **Defer semantic-intent extraction past MVP**; ship Plone adapter with the `http` passthrough only.

New package: `packages/hydra-adapters-plone/`.

## Phase 3 — WordPress adapter (no plugin)

The default WP integration ships WITHOUT a plugin. The standard `/wp-json/wp/v2/*` surface covers everything we need; blocks live inside `post_content` as a Gutenberg-style HTML comment block that Gutenberg parses gracefully (it renders as "unknown block" but never strips the JSON). Auth uses the standard WP cookie + `X-WP-Nonce` flow, which works automatically when the frontend is served from the same origin as wp-admin (the typical WP setup).

### Block storage in `post_content`

On save, the adapter wraps the canonical `{blocks, blocksLayout}` JSON in a single block-comment:

```html
<!-- wp:hydra-blocks/document {"v":1,"blocks":{...},"blocksLayout":{...}} /-->
```

On read, the adapter scans `post_content` for the marker and extracts the JSON. The rest of `post_content` (if any) is exposed as `Document.fields.legacyContent` for adapter-internal use. WP saves preserve the comment verbatim; Gutenberg ignores it; classic editor shows it as raw text. Hydra's `content.update` always rewrites the comment.

### Intent → wp-json mapping (no plugin required)

- `content.get(path)` → `GET /wp-json/wp/v2/{type}/{id}?_embed`; parse `post_content` for hydra-blocks comment
- `content.update` → `POST /wp-json/wp/v2/{type}/{id}` with `content` (re-serialised hydra-blocks block + any preserved legacy content) and `title`
- `content.create` / `delete` → standard `/wp/v2/{type}` endpoints
- `search` → `GET /wp/v2/search?term=...`
- `vocabulary.get('users'|'categories'|'tags'|'types'|'taxonomies')` → corresponding `/wp/v2/*` endpoints
- `asset.upload` → `POST /wp/v2/media`
- `types.list` → `GET /wp/v2/types` (returns object keyed by post type)
- `types.getSchema(type)` → `GET /wp/v2/types/{type}` (built-in returns capability set + supports + REST endpoint schema)
- `auth.whoami` → `GET /wp/v2/users/me`

Capabilities the adapter advertises: `['content','search','vocabulary','upload','types','navigation']`. Notably ABSENT in MVP: `workflow`, `sharing`, `versioning`, `comments`, `relations` — admin UI gates those affordances off the capability set.

### Auth — two paths, both first-class

WP integration covers two equally-supported deployment shapes:

1. **Same-origin (frontend served by WP itself)**. Cookie + `X-WP-Nonce` flows naturally; adapter reads `window.wpApiSettings.nonce` if present, falls back to probing `whoami` if not. No extra config.
2. **Headless (frontend on a different origin from WP, e.g. Next.js at `acme.com`, WP at `cms.acme.com`)**. This is the bigger market for Hydra and is treated equally. Auth uses application passwords (WP core feature since 5.6). User generates one in `wp-admin → Users → Profile → Application Passwords`; Hydra's `<AuthChallenge>` form prompts for username + app-password; adapter stores in frontend-origin `localStorage` and sends as `Authorization: Basic`. Plugin needed for CORS (one of: the optional `hydra-bridge` plugin, OR an existing CORS plugin, OR `.htaccess` headers).

Neither is "primary" — both are documented as first-class. Adapter probes which is available at init time.

### Optional plugin (post-MVP / cross-origin extension)

A small `hydra-bridge` PHP plugin remains an OPTIONAL addon for two cases:

1. **Cross-origin hosting** (frontend on a different domain from WP): plugin adds CORS headers + supports app-password bearer auth.
2. **Richer schema discovery** (e.g. ACF fields): plugin exposes `/wp-json/hydra/v1/schema/{type}` returning a Hydra-canonical schema including ACF/CMB2 fields. Adapter probes for it and falls back to vanilla `/wp/v2/types` when absent.

Neither is required for MVP.

New package: `packages/hydra-adapters-wordpress/`.

## Phase 4 — Adapter-declared UI extensions

Generalize controlpanel delegation into a single adapter contract that declares ALL extra UI: per-content actions (Plone's sharing/workflow/history/aliases; WP's preview/revisions), top-level admin entries (Plone's controlpanels; WP's users/media/menus/settings), and toolbar buttons. Hydra renders the chrome and click-handlers; the adapter is the source of truth for what's there and how each opens.

### Extension contract

```ts
interface HydraAdapter {
  // ... existing methods
  getExtensions(): AdapterExtensions;
}

interface AdapterExtensions {
  /** Per-content actions: rendered in the "More" menu when editing a document.
   *  Each entry is shown only if its `capability` (if set) is in the adapter's
   *  capability set, so capability-gating is automatic. */
  contentActions: ExtensionEntry[];
  /** Top-level admin entries: rendered in the global admin menu
   *  (replaces today's /controlpanel/* tree). */
  adminActions: ExtensionEntry[];
  /** Toolbar buttons added next to Edit/Save (e.g. WP's "Preview"). */
  toolbarActions?: ExtensionEntry[];
}

interface ExtensionEntry {
  id: string;
  label: string;
  icon?: string;
  capability?: string;  // hidden if adapter.capabilities lacks it
  render:
    | { kind: 'open-url'; url: (ctx: { content?: Document; user: User }) => string }
    | { kind: 'iframe-modal'; url: (ctx) => string; size?: 'sm'|'md'|'lg'|'full' }
    | { kind: 'intent'; intent: string; args?: any };  // canonical Hydra UI
}
```

Two rendering kinds in MVP:

- `open-url` — new tab. The default for site-wide admin pages (users, plugins, settings).
- `intent` — dispatch a canonical intent via bridge and show a Hydra-rendered UI (e.g. Volto's existing Workflow React UI driven by `workflow.get`/`workflow.transition` intents from the Plone adapter). Requires the adapter to implement the intent AND advertise the capability.

(`iframe-modal` was considered for embedding native CMS admin pages inside Hydra modals — dropped from MVP because native pages have themes that clash with Hydra, can't reliably postMessage-close, and Volto already has React UIs for the common cases like Workflow and Sharing. If a future adapter genuinely needs to surface a CMS-native form, `open-url` to new tab is the realistic answer.)

### Registration + dispatch flow (runtime)

1. **Frontend bootstrap** calls `initBridge({ adapter, cmsBaseUrl })`.
2. **Bridge sends `ADAPTER_READY`** to admin in the same handshake exchange as the existing INIT. Payload: `{ name, capabilities, cmsBaseUrl, user, extensions: adapter.getExtensions() }`. Extensions travel with the handshake so the admin renders the right chrome on first paint — no extra round trip.
3. **Admin caches the extensions object** in Redux (`state.hydra.adapter`). Selectors expose `contentActions`, `adminActions`, `toolbarActions`.
4. **UI components** ([More menu](core/packages/volto/src/components/manage/Toolbar/), [admin nav](core/packages/volto/src/components/manage/Controlpanels/), [Toolbar bar](core/packages/volto/src/components/manage/Toolbar/Toolbar.jsx)) consume those selectors. Filtering by capability is automatic — entries whose `capability` field isn't in the adapter's `capabilities` set are dropped at selector time.
5. **On click**, the action's `render.kind` decides what happens:
   - `open-url` → `window.open(render.url({ content, user }), '_blank', 'noopener,noreferrer')`. `content` is the currently-edited document for content actions; absent for admin actions.
   - `intent` → `bridge.request(render.intent, render.args)`. Hydra's existing React UI for that domain consumes the result (e.g. the Workflow component reads `workflow.get` and dispatches `workflow.transition`). Errors bubble through standard AUTH_REQUIRED / toast flow.
6. **Dynamic updates**: an adapter can call `bridge.updateExtensions(newExtensions)` at any time to re-broadcast. Admin re-renders. Useful if extensions depend on the current document type (e.g. only show "Translations" if the current item supports `multilingual`).

What this gives us: zero hardcoded controlpanel routes in Hydra, zero per-feature switches in the chrome, and adapters can ship NEW menu items without any Hydra release.

Files to modify:

- [core/packages/volto/src/components/manage/Toolbar/](core/packages/volto/src/components/manage/Toolbar/) — `MoreMenu`, top-bar — consume `getExtensions().contentActions`, `.toolbarActions`
- [core/packages/volto/src/components/manage/Controlpanels/Controlpanel.jsx](core/packages/volto/src/components/manage/Controlpanels/Controlpanel.jsx) — render `getExtensions().adminActions` instead of the hardcoded Plone list; route fallback when the path doesn't match a declared entry
- [core/packages/volto/src/routes.js](core/packages/volto/src/routes.js) — drop hardcoded `/controlpanel/dexterity-types` etc. routes in favour of a single `/admin/:id` route that looks up via `getExtensions().adminActions[id]`
- (No `IframeModal` component — dropped from MVP; `open-url` and `intent` cover the real cases.)

### WordPress adapter extensions

```ts
getExtensions: () => ({
  contentActions: [
    { id: 'preview',   label: 'Preview',   render: { kind: 'open-url',
        url: ({content}) => `${content.path}?preview=true&preview_id=${content.id}` } },
    { id: 'revisions', label: 'Revisions', capability: 'versioning',
        render: { kind: 'open-url',
          url: ({content}) => `/wp-admin/revision.php?revision=${content.id}` } },
    { id: 'view-comments', label: 'Comments', capability: 'comments',
        render: { kind: 'open-url',
          url: ({content}) => `/wp-admin/edit-comments.php?p=${content.id}` } },
  ],
  adminActions: [
    { id: 'users',     label: 'Users',         render: { kind: 'open-url', url: () => '/wp-admin/users.php' } },
    { id: 'media',     label: 'Media Library', render: { kind: 'open-url', url: () => '/wp-admin/upload.php' } },
    { id: 'menus',     label: 'Menus',         render: { kind: 'open-url', url: () => '/wp-admin/nav-menus.php' } },
    { id: 'site-editor', label: 'Site Editor', render: { kind: 'open-url', url: () => '/wp-admin/site-editor.php' } },
    { id: 'plugins',   label: 'Plugins',       render: { kind: 'open-url', url: () => '/wp-admin/plugins.php' } },
    { id: 'themes',    label: 'Themes',        render: { kind: 'open-url', url: () => '/wp-admin/themes.php' } },
    { id: 'settings',  label: 'Settings',      render: { kind: 'open-url', url: () => '/wp-admin/options-general.php' } },
    { id: 'tools',     label: 'Tools',         render: { kind: 'open-url', url: () => '/wp-admin/tools.php' } },
    { id: 'profile',   label: 'Profile',       render: { kind: 'open-url', url: () => '/wp-admin/profile.php' } },
    { id: 'comments-moderation', label: 'Moderate Comments', capability: 'comments',
        render: { kind: 'open-url', url: () => '/wp-admin/edit-comments.php' } },
  ],
}),
```

### Plone adapter extensions (preserving today's behaviour)

```ts
getExtensions: () => ({
  contentActions: [
    { id: 'sharing',  label: 'Sharing',  capability: 'sharing',
        render: { kind: 'open-url', url: ({content}) => `${ploneAdminUrl(content.path)}/sharing` } },
    { id: 'workflow', label: 'State',    capability: 'workflow',
        render: { kind: 'intent', intent: 'workflow.get' } },  // Volto's existing React workflow UI consumes this
    { id: 'history',  label: 'History',  capability: 'versioning',
        render: { kind: 'open-url', url: ({content}) => `${ploneAdminUrl(content.path)}/historyview` } },
    { id: 'aliases',  label: 'Aliases',  capability: 'aliases',
        render: { kind: 'open-url', url: ({content}) => `${ploneAdminUrl(content.path)}/aliases` } },
    { id: 'rules',    label: 'Rules',    capability: 'content-rules',
        render: { kind: 'open-url', url: ({content}) => `${ploneAdminUrl(content.path)}/rules` } },
    { id: 'translations', label: 'Translations', capability: 'multilingual',
        render: { kind: 'open-url', url: ({content}) => `${ploneAdminUrl(content.path)}/manage-translations` } },
  ],
  adminActions: [
    { id: 'users',     label: 'Users & Groups', render: { kind: 'open-url', url: () => '/@@usergroup-userprefs' } },
    { id: 'types',     label: 'Content Types',  render: { kind: 'open-url', url: () => '/@@dexterity-types' } },
    { id: 'rules',     label: 'Content Rules',  render: { kind: 'open-url', url: () => '/@@rules-controlpanel' } },
    { id: 'aliases',   label: 'URL Aliases',    render: { kind: 'open-url', url: () => '/@@redirection-controlpanel' } },
    { id: 'addons',    label: 'Add-ons',        render: { kind: 'open-url', url: () => '/@@addons-controlpanel' } },
    { id: 'site',      label: 'Site Settings',  render: { kind: 'open-url', url: () => '/@@site-controlpanel' } },
    { id: 'undo',      label: 'Undo',           render: { kind: 'open-url', url: () => '/@@undo' } },
  ],
}),
```

Capabilities the Plone adapter advertises: `['content','search','vocabulary','upload','types','navigation','workflow','sharing','versioning','aliases','content-rules','multilingual','comments','relations']` — the full superset Plone supports today. WP advertises only what wp-json supports (`['content','search','vocabulary','upload','types','navigation','versioning','comments']` — note: no workflow, no sharing, no aliases, no content-rules, no multilingual without plugins).

### Future: canonical intents for high-commonality features

Post-MVP, if cross-CMS commonality is high enough, promote a feature from "open-url per adapter" to "canonical Hydra UI via intent":

- **Sharing** — most CMSes have principals/roles. Canonical model: `{ principal: 'user:x' | 'group:y' | 'role:editor', permissions: ['view','edit'] }`. Intent: `sharing.get(uid)` / `sharing.update(uid, entries)`. Adapter maps to native.
- **Versioning** — list of `{ id, timestamp, user, message }`; revert by id. Universal-ish.
- **Workflow** — too divergent (Plone's state machines vs WP's simple post_status). Keep as native-link.
- **Aliases** — universal model is just `[{ from, to }]`. Promote post-MVP.

For each promoted feature: define canonical types in `packages/hydra-types/`, the canonical UI in Hydra, the intents in adapters that opt in. Adapters that don't implement the intent keep their `open-url` entry — both can coexist (Hydra renders the canonical UI if `intent` is in `render`, otherwise falls back).

## Permissions & State (unified model)

Plone separates workflow (state machine + transitions) and sharing (per-content roles). They're separate UIs but they answer the same underlying question: "who can do what, when". Hydra collapses them into one canonical model with one UI surface. Each CMS lights up the parts it supports; capabilities gate the rest.

```ts
type PermissionsAndState = {
  // Lifecycle position — always present.
  state: { name: string; label: string };
  // What transitions are available to the current user right now.
  // The "Publish"/"Submit"/"Reject" buttons render from this; not a separate workflow concept.
  transitions: Array<{ id: string; label: string; targetState: string }>;
  // What the current user can do on this content right now.
  // This is the surface Hydra UI gates on for visible/enabled buttons.
  effective: { canEdit: boolean; canPublish: boolean; canDelete: boolean;
               canShare: boolean; canComment: boolean };
  // Optional: per-content principal-permission entries. Only adapters that
  // advertise the `per-content-permissions` capability return this; others
  // return null and the Sharing UI hides.
  shareEntries?: Array<{
    principal: { type: 'user' | 'group' | 'role'; id: string; label: string };
    permissions: ('read' | 'edit' | 'publish' | 'delete')[];
    inherited: boolean;  // see hierarchical caveat below
  }>;
};
```

Intents: `state.get` returns the whole structure; `state.transition({id})` performs a transition; `permissions.update(shareEntries)` writes if capability allows.

Per-CMS mapping:

| CMS | `state` | `transitions` | `effective` | `shareEntries` |
| --- | --- | --- | --- | --- |
| Plone | `@workflow.state` | `@workflow.transitions` | computed from workflow + sharing | from `@sharing` |
| WordPress | `post.status` | core: draft↔publish↔private↔future; richer via plugins | derived from `user.capabilities + post.author` | usually null; some plugins add |
| Strapi | `publishedAt` (null = draft) | publish ↔ unpublish | from role-collection-action permissions | null |
| Drupal | `moderation_state` (Content Moderation) | from configured workflow | from entity access rules | null in core; from Group module if installed |

**Capability flags for non-binary granularity:**

- `state` — has lifecycle states / transitions
- `per-content-permissions` — supports per-document principal grants (Plone yes, WP-via-plugin maybe, Drupal-via-Group maybe, Strapi no)
- `hierarchical-permissions` — supports inherit-from-parent / break-inheritance semantics. **Plone-only in practice.** When absent, `shareEntries[].inherited` is always `false` and the "break inheritance" / "inherit from parent" UI controls hide. Each adapter author thinks of permissions as flat; only Plone surfaces the hierarchy controls.

Even though state and sharing are now one model, the UI panel can still visually separate "what state am I in / what can I transition to" from "who has access". The UNIFICATION is in the data + the capability story; the presentation can stay familiar to Plone users.

## Save UX (the small thing that's easy to get wrong)

Save and workflow are SEPARATE concerns and stay separate in the UI:

- **Save** stays as today: explicit `[Save]` button writes the document via `content.update`. Per-CMS differences are minor — every CMS supports "PATCH this document with this state". Autosave is **post-MVP** (a per-save debounce + indicator); don't force it now.
- **Workflow / publishing** lives in its own UI element (the State / Workflow indicator), driven by `workflow.get` / `workflow.transition` intents. Capability-gated: hidden when adapter doesn't advertise `workflow`. WP's `draft`/`publish`/`pending`/`private` map to a simpler dropdown via the same intents.
- **Working copy / revisions** UI exists in Volto today (or can be added easily) — driven by `revisions.list` / `revisions.diff` / `revisions.revert` intents. Capability-gated.

The "save semantics differ per CMS" critique was overblown: Plone, WP, Strapi, and Drupal all expose "update this document" as a single API call. The visible differences (state names, schedule publish, revision creation) live in adjacent UI elements driven by separate intents, NOT crammed into Save.

## MVP scope (in / out)

**In** (1–2 month target):

- Bidirectional bridge-RPC + handshake versioning + `ADAPTER_READY` + `AUTH_REQUIRED`
- Middleware switch behind `useBridgeBackend` flag
- Plone adapter via `http` passthrough intent only (proves bridge; no Plone URL template refactor in MVP)
- WordPress adapter (no plugin) covering: content CRUD via `post_content`-wrapped blocks, search, vocab autocompletes (users/categories/tags/types/taxonomies), `types.getSchema` from vanilla `/wp/v2/types`, asset.upload, whoami
- Cookie + nonce auth for same-origin WP; AUTH_REQUIRED toast for missing/expired session
- Hydra admin UI: a single "Frontend URL" input + the iframe; NO site picker, NO login UI, NO per-adapter config
- UI affordances gated by `adapter.capabilities` (no Workflow button when adapter doesn't advertise `workflow`)
- `target=_blank` controlpanel delegation; all per-content "More" menu non-edit actions either delegate or hide

**Out** (deferred):

- WP plugin (becomes optional post-MVP for cross-origin / richer schema)
- Workflow / sharing UI / history diff / comments / relations / content rules
- Native Gutenberg block round-tripping — `hydra-blocks` comment is opaque to Gutenberg (renders as unknown block)
- Plone-adapter semantic intents (post-MVP; `http` keeps Plone working)
- Cursor/streaming search
- Multilingual / translations
- SSR for the Hydra editor route (route is client-only in standalone mode)

## Open risks

1. **Same-origin assumption for WP**. The no-plugin path requires the frontend to be served same-origin to wp-admin. Many WP installs satisfy this; some don't (decoupled WP setups). Mitigation: detect (try `auth.whoami` on init) → fall back to AUTH_REQUIRED toast + plugin-needed message. **Prototype week 1**.
2. **Gutenberg's `wp:hydra-blocks` block**. WP saves preserve the comment verbatim by default, but a content-filter plugin could strip unknown blocks. Mitigation: register the block name as "valid but unrendered" via a 1-line `register_block_type('hydra/blocks')` in `functions.php` (theme-side, not plugin), or accept that some WP environments need the optional plugin. Document the constraint.
3. **Bridge throughput**. `FORM_DATA` runs hot during typing; backend RPC adds traffic on the same channel. Mitigation: backend RPC is low-rate (saves, searches, opens). If contention appears in cypress traces, move RPC to its own `MessageChannel`.
4. **Action-creator coupling to Plone shapes**. Reducers expect `@id`, `UID`, `review_state`, `@components`. Mitigation in MVP: WP adapter synthesises matching keys (`@id = full URL`, `UID = post ID stringified`, `review_state = 'published'|'draft'`). True canonicalisation post-MVP.
5. **Hydra UI tries to load before ADAPTER_READY**. Admin shell must render a loading state until the bridge handshake completes — no greying-out blank page. Mitigation: explicit "Waiting for frontend…" / "Adapter not registered (is this frontend in edit mode?)" states.
6. **Session expiry mid-edit**. Adapter detects 401 → emits AUTH_REQUIRED → admin shows non-destructive toast → user re-logs into CMS in a new tab → adapter retries pending save on next user action. Pending edits stay in admin Redux until next successful save.
7. **Bookmarkable Hydra URLs**. Admin URL should carry the frontend URL as a query param (`hydra.example.com?frontend=https://acme.com/news/post-123/edit`) so a user can share a deep link. Implement via URL search param; no server-side routing change.

## Plone shape is the de-facto canonical for MVP (and what that means for other adapters)

Honesty check: Volto's reducers, widgets, and components today consume Plone-shaped JSON deeply — `data['@id']`, `data.UID`, `data['@components'].workflow.review_state`, `properties[field].widget`, vocabulary refs like `plone.app.vocabularies.Catalog`. The "neutralised canonical shape" goal in this plan is real long-term direction but **MVP cannot fully achieve it** without rewriting the form/widget layer and every reducer. So for MVP:

**Plone JSON shape IS the canonical shape that non-Plone adapters must produce.** WP / Strapi / Drupal adapters synthesize Plone-style keys (`@id` = full URL, `UID` = stringified id, `review_state` = mapped from native state, `@components.navigation.items` = an array even if the source uses a different name). This is unglamorous but it's the only way to ship in 1-2 months.

**Auditable list of "what adapters must produce"** — this audit is part of Phase 1 and is the single most important non-obvious task:

- **Reducer-consumed fields**: grep `core/packages/volto/src/reducers/**` for every field accessed on `action.result` / `state.data`. Categorize: required-for-MVP vs nice-to-have vs Plone-isms-that-can-be-faked. Produce a `CANONICAL_FIELDS.md` listing every field name + its semantics, so adapter authors have a contract.
- **Widget-consumed schema**: grep widgets in `core/packages/volto/src/components/manage/Widgets/` for every `schema[field].something` lookup. Each unique key becomes part of the canonical Schema spec. Plone-specific widget names (`BehaviorCheckbox`, Plone RichText) move into the Plone adapter as overlay registrations.
- **`@components` requirements**: grep for `data['@components']`. List every `@component.foo.bar` path that has UI dependencies. For each: define canonical name, decide if adapter must produce it (e.g. `breadcrumbs`, `navigation`) or it's Plone-only (and gets capability-gated).
- **`@id` parsing assumptions**: code in many places splits `@id` to derive paths, types, parent paths. The full-URL faking strategy works only if all parsers handle `https://wp.acme.com/news/post-1` the same as today's `http://localhost:8080/Plone/news/post-1`. Audit needed.
- **`UID` usage**: where reducers / components index by UID, ensure WP-id-stringified works (it's already a string in WP; just `String(id)`).

Once this audit is done, the adapter authoring guide can say: "your adapter MUST produce these fields with these semantics; you MAY skip these if you advertise capabilities-not-supported". Without this audit, every adapter is a guessing game and breaks silently when reducers add new field reads.

Output of audit: `docs-dev/canonical-fields.md` (in a new gitignored dev-docs folder so we iterate without committing prematurely; promoted to `docs/adapters/` once stable). Every new field a Volto reducer adds becomes a change request to that contract.

Alongside it: `docs-dev/concept-map.md` — for each Plone concept, the canonical name + shape, capability flag, and per-CMS mapping (Plone, WP, Strapi, Drupal). Sections include: document identity (id+path), hierarchy, content type / schema, permissions+state (the unified model), search + query, vocabularies, media upload + image variants. Explicitly out: behaviors (just schema), `@components` (just call-batching), `@actions` (UI fluff), multilingual + working-copy + content rules (outside editor).

## Volto's reliance on content-type schemas

Volto is deeply schema-driven for content-type metadata (the page-level sidebar form). Block-level schemas, by contrast, are frontend-defined in `initBridge({ blocks })` and have zero CMS involvement. The split matters because it determines how much non-Plone-adapter work is "trivial mapping" vs "meaningful translation".

**Schema-dependent surfaces in Volto today:**

| Surface | Driven by | Universal-design status |
| --- | --- | --- |
| Page-level metadata form (title / description / tags / SEO fields / per-type custom fields) | `@types/{type}` schema — fieldsets, properties, widgets | **Deepest dependency.** Each adapter must produce canonical Schema for every editable content type. |
| Block settings sidebar | Frontend-defined `blockSchema` | **No change.** Already CMS-agnostic. |
| Add menu (`@types` → `addable_types`) | `@types/${folder}` | Adapter's `types.list`. Mechanical. |
| Object browser (pick internal link / related content) | `@search` | Adapter's `search`. Mechanical. |
| Vocabulary autocompletes (select / tag widgets) | `@vocabularies/{name}` | Adapter's `vocabulary.get`. Canonical vocab names (`vocab:users`, `vocab:tags`, `vocab:categories`) map to per-CMS endpoints. |
| Widget components (text / textarea / richtext / relation / image / tags / email / url / datetime / select) | `properties[field].widget` | Most are generic; a few Plone-isms (`BehaviorCheckbox`, Plone-specific RichText) need to either be dropped from the canonical Hydra widget vocabulary or moved into the Plone adapter as Plone-specific extensions. |

**Canonical Hydra schema** (already close to today's Plone schema shape, which is itself close to JSON Schema):

```json
{
  "fieldsets": [
    { "id": "default", "title": "Default", "fields": ["title", "description"] }
  ],
  "properties": {
    "title":       { "type": "string", "widget": "text",     "title": "Title" },
    "description": { "type": "string", "widget": "textarea", "title": "Description" },
    "tags":        { "type": "array",  "widget": "tags",     "title": "Tags",
                     "vocabulary": "vocab:tags" }
  },
  "required": ["title"]
}
```

Adapter responsibilities (one per adapter, per content type):

- Translate the CMS's native field metadata to this shape.
- Map CMS-native widget names to the canonical widget vocabulary.
- Convert CMS-native vocab references (`plone.app.vocabularies.Catalog`, `wp:taxonomy:category`, …) to canonical names (`vocab:category-tree`, `vocab:tags`).

**Schema discovery feasibility per CMS:**

- **Plone** — `@types/{type}` returns this shape directly (minor canonical-widget-name remapping needed for a handful of Plone-specific widgets). Easy.
- **WordPress** — `/wp/v2/types/{type}` returns `supports: [...]` + `taxonomies` + a basic REST schema. Adapter synthesizes Hydra Schema for built-in post types (Post, Page) from this. Custom fields (ACF, CMB2) need EITHER the optional plugin OR static-schema bundling.
- **Strapi** — `/api/content-type-builder` returns rich field metadata, but requires admin role. Realistic default for MVP: static-schema bundling per Strapi project; dynamic discovery as an opt-in once the role situation is solved.
- **Drupal** — no native Hydra-shaped endpoint exists. **Static-schema bundling is the default**; an optional Drupal module could expose `/jsonapi/_hydra/schema/{bundle}` for dynamic discovery.

**Refactor implications for Volto** (revisions to Phase 1 / 2 of the plan):

- The Volto form components ([Form.jsx](core/packages/volto/src/components/manage/Form/Form.jsx), [BlockDataForm.jsx](core/packages/volto/src/components/manage/Blocks/Block/BlockDataForm.jsx), [Sidebar](core/packages/volto/src/components/manage/Sidebar/)) keep their generic schema-consumption logic but the widget registry decouples Plone-specific widgets into the Plone adapter package (or the Plone adapter ships its own widget registry overlay).
- A canonical widget vocabulary lives in `packages/hydra-types/widgets.ts`. The default registry maps each canonical widget to a generic Semantic-UI-React component. Adapters can register overrides (e.g. Plone's RichTextWidget for the `richtext` widget when on Plone).
- Page-level metadata in Redux still stores Plone-shaped JSON during the `http`-passthrough phase. Once an action creator migrates to a semantic intent (`content.get` returning canonical Document), reducers consume the canonical shape too — and WP-shaped pages flow through the same path.

**Schema as biggest non-trivial adapter cost**: roughly equal to or slightly larger than auth + CORS + block-storage combined. For MVP scoping this means: WP adapter ships with hardcoded schemas for `post` + `page` (synthesized at build time from a known wp-json shape), defers ACF / custom-field discovery to a post-MVP plugin pass.

## Plone's "URL == tree position == single canonical URL" assumption

Plone's invariant: a content item's URL path IS its position in the tree, and every item has exactly one canonical URL. Volto code assumes this throughout — splitting `@id` to derive parent paths, "Add inside this folder" workflows that construct child @ids by appending to the parent, breadcrumbs from URL segments, routing in the admin.

That invariant doesn't hold for other CMSes:

- **WordPress** — a Post's URL comes from permalinks + categories; the post can be reached via multiple URLs (`/category-a/post-1`, `/category-b/post-1`, `/?p=123`). Pages have a parent (limited tree). Posts have no parent at all. Tags don't form a hierarchy.
- **Strapi** — no URL concept in the data layer at all. Frontends define URLs from content fields. The "canonical URL" is whatever the frontend says it is.
- **Drupal** — URL alias is separate from node id (`/news/post-1` aliases to `/node/123`; multiple redirects can point at the same node). Hierarchy lives in Menu module, not in the node entity itself.

What this breaks if we synthesize `@id` from "current canonical URL":

- "Add inside" workflows. In Plone you click a folder → "Add Page" → child path is `parent.@id + '/new-page'`. In WP "add inside" of Posts means "create a new post in this collection" — no parent path needed. Adapter must intercept the synthesised "child @id" construction and produce the right "create" call shape.
- Drag-content-into-folder reorganisation. Plone moves are URL-changing. WP/Strapi have no notion of moves between containers (Posts can't be re-parented). Capability `move` gates the drag affordance off.
- Manual reordering of children within a parent. Plone supports it; WP doesn't natively (Posts ordered by date); Strapi has manual sort if enabled. Capability `reorder` gates the drag-to-reorder handles.
- Breadcrumb generation from URL path. Plone splits `@id` on `/`. WP/Strapi don't have nested URLs. Adapter must populate `breadcrumbs.get` explicitly — not from URL parsing.
- Multiple URLs per content. Hydra picks ONE canonical URL (whatever the adapter declares as `path` in the canonical Document); other URLs (WP category-relative paths, Drupal redirects) are ignored. Lossy but acceptable for MVP.

Risk: this assumption is so deeply baked into Volto that the cross-CMS-concept-map document needs an entire section on "every place in Volto that splits `@id` to derive structure" — likely uncovered during the canonical-fields audit. Some of these will surface only when running the WP adapter against real content.

## Generalization check (Strapi + Drupal)

The plan was designed against WordPress + Plone but the user asked it be evaluated against Strapi and Drupal too. Walk-through:

**Strapi.** API `/api/{collection}/{id}`, JWT via `/api/auth/local`, JSON field for blocks. Bridge protocol, adapter contract, extensions, canonical shapes all hold. Notable differences:

- Strapi is typically **cross-origin** from the frontend (Strapi as a separate API host). Cross-origin must be first-class, not "advanced".
- `cookie-passthrough` auth doesn't apply (bearer-JWT); `form` is primary, `oauth` available via `users-permissions` plugin.
- Strapi has **no full-text search built in** — adapter advertises `search-filter` (filter-based) not `search-fulltext`. UI gates the full-text search box accordingly; filter-style faceted search remains.

**Drupal.** JSON:API core since 8.7, JSON field via core `json_native` or contrib, OAuth2 via Simple OAuth or cookie+CSRF. Bridge protocol etc. all hold. Notable differences:

- Schema discovery is awkward — JSON:API doesn't expose canonical schemas. Adapter uses **static-schema fallback**: ship a `schema.json` bundled with the frontend deployment, OR an optional Drupal module for a Hydra-shaped schema endpoint.
- Write operations need a CSRF token from `/session/token` — standard adapter responsibility.
- JSON:API responses are deeply nested with `included` relationships — adapter does heavier normalization than other adapters.
- Same `search-filter` vs `search-fulltext` capability distinction (no full-text without `search_api` contrib).

**Adjustments needed to the plan** (applied below in this section, not retroactively to earlier sections, to avoid churn):

1. **Cross-origin is a first-class deployment mode.** The plan's "same-origin happy path" is one of several supported configurations. Adapters declare which they support; the `cookie-passthrough` method only applies when same-origin AND the CMS uses cookie auth. For Strapi (always cross-origin) and Drupal (often cross-origin), `form` or `oauth` is the primary path.

2. **`search` capability subdivides** into `search-fulltext` and `search-filter`. UI components consult the more specific capability before rendering a full-text search box vs a filter builder. Adapters advertise whichever they truly support (no false advertising).

3. **Schema discovery has a static-schema fallback.** Adapters that can't discover from the CMS dynamically may ship a static schema (bundled with the frontend deployment). `types.getSchema(type)` returns the static entry. Documented as a supported pattern, not a workaround.

4. **Block storage is adapter-defined.** The "Gutenberg-comment in post_content" approach is WP-specific. For Strapi: JSON field on collection. For Drupal: JSON field on node bundle. For Plone: native `blocks` field on Document. All return canonical `{blocks, blocksLayout}` from `content.get`. Hydra is unaware of where the blocks physically live.

5. **No-plugin claim is per-CMS:**
   - Plone — no plugin (plone.restapi is built-in to modern Plone).
   - WordPress — no plugin (vanilla `/wp-json/wp/v2/*`, blocks in post_content comment, cookie+nonce or app-password).
   - Strapi — no plugin (REST + JSON field built-in; CORS is admin-configurable per-environment).
   - Drupal — no plugin for content/search/upload (JSON:API is core); optional module for schema discovery.
   - All four ship a working MVP without forcing CMS-side installs, though each has an optional plugin that improves UX.

**Verdict**: the design generalizes. The five adjustments above are clarifications, not redesigns — bridge protocol, adapter contract, extensions, auth, capabilities, and canonical shapes all hold across four very different CMSes. The single biggest risk surfaced by this exercise is **schema discovery in Drupal** — flag for prototyping against a real Drupal install in week 1 alongside the WP cross-origin check.

## Verification

```bash
# 1. Plone-via-bridge transparency test (proves the inversion is a faithful shim)
USE_BRIDGE_BACKEND=true pnpm cypress run --spec 'core/packages/volto/cypress/tests/blocks/*.spec.js'
# Expect: identical pass rate to baseline.

# 2. Bridge-RPC protocol contract unit tests
pnpm --filter @hydra-js test:rpc
# Expect: request/response correlation, timeout, error-coding, version-mismatch fallback all green.

# 3. New WP integration suite (against docker compose: vanilla WP, NO plugin)
docker compose -f tests-playwright/wordpress/docker-compose.yml up -d
pnpm exec playwright test tests-playwright/wordpress/ --project=wp-vanilla
# Expect: paste frontend URL → iframe loads → drag block → save → reload → hydra-blocks
# comment in post_content round-trips → Gutenberg side preserves it.

# 4. Manual smoke
# - Session expiry mid-edit (log out of wp-admin in another tab; verify AUTH_REQUIRED toast)
# - Image upload > 5 MB (verify timeout override on asset.upload)
# - Vocab autocomplete on a 10k-term taxonomy (verify search-as-you-type stays usable)
# - Capability gating: WP adapter doesn't advertise `workflow` → Workflow button absent
# - Cross-origin WP: confirm fallback path (AUTH_REQUIRED with "plugin needed" hint) when nonce missing
```

## Critical files

Existing files to modify:

- [core/packages/volto/src/middleware/api.js](core/packages/volto/src/middleware/api.js) — middleware switch behind `useBridgeBackend`
- [packages/hydra-js/hydra.src.js](packages/hydra-js/hydra.src.js) — BridgeRPC receiver + adapter dispatch
- [packages/volto-hydra/src/components/Iframe/View.jsx](packages/volto-hydra/src/components/Iframe/View.jsx) — BridgeRPC sender + capability handshake + ADAPTER_READY consumer; gate UI affordances on `adapter.capabilities`
- [core/packages/volto/src/components/manage/Controlpanels/Controlpanel.jsx](core/packages/volto/src/components/manage/Controlpanels/Controlpanel.jsx) — adapter.getAdminUrl delegation
- [core/packages/volto/src/actions/](core/packages/volto/src/actions/) — action creators continue to work via `http` passthrough; semantic-intent migration deferred

New packages / files:

- `packages/hydra-types/` — canonical TS types
- `packages/hydra-adapters-core/` — base class, helpers (retry-on-401, URL utils)
- `packages/hydra-adapters-plone/` — Plone adapter (MVP: `http` passthrough only)
- `packages/hydra-adapters-wordpress/` — WP adapter (no plugin required)
- `packages/hydra-js/src/bridgeRpc.js` — shared envelope
- `packages/volto-hydra/src/bridge/BridgeRPC.client.js` — admin-side
- `packages/volto-hydra/src/components/FrontendUrlInput/` — the one piece of Hydra-side UI: a URL bar + connect button + loading/error states

Functions/utilities to reuse:

- The `requestId` correlation pattern from `SLATE_TRANSFORM_REQUEST` ↔ `FORM_DATA` already in [View.jsx](packages/volto-hydra/src/components/Iframe/View.jsx)
- `iframeOriginRef` for targeted postMessage
- `INIT` handshake site for the new `capabilities`/`protocolVersion` exchange and ADAPTER_READY response
- `apiMiddlewareFactory` in [api.js](core/packages/volto/src/middleware/api.js) — keep the `{op, path, data, headers}` shape; only the transport changes
