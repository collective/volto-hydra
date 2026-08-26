# Universal CMS adapters: WordPress + Drupal

Design spec. Supersedes the WordPress-only sections of `hydra-plan.md` where they
conflict; `hydra-plan.md` remains the reference for the auth flows (A–D), the
adapter-declared UI extension contract, and the permissions/state model, none of
which this spec changes.

**Status:** approved design, not yet implemented.
**Branch:** `cms-adapters` (worktree). **Not to be pushed** until the repo move.

## 1. Goal

Turn Hydra from a Plone-bound visual editor into a CMS-agnostic one, with three
peer adapters — Plone, WordPress, Drupal — verified by a single conformance
suite that all three must pass.

The deliverable is not "a WordPress adapter". It is **an executable definition of
what an adapter is**, plus three implementations of it. If the definition is
right, a fourth CMS is a week of work by someone who has never read this repo.

## 2. Decisions

Five decisions were taken during design. Each is recorded with the reasoning,
because each has a plausible alternative that was rejected for a specific reason.

### 2.1 The harness runs real WordPress and a captured-fixture Drupal mock

WordPress runs for real, via `@wp-playground/cli` (v3.1.51) — actual WordPress
PHP compiled to WASM, running under Node with SQLite. It boots in seconds, needs
no Docker, and is seeded declaratively by a blueprint. Because it executes real
WordPress code, it can answer the question a mock never can: *does a vanilla WP
install preserve our block comment when the post is saved through Gutenberg?*
That is the riskiest claim in the whole design.

Drupal has no equivalent — there is no maintained PHP-WASM Drupal — so it gets a
mock: `mock-drupal-api.cjs`, in the same style as the existing
`mock-plone-api.cjs`.

**The mock's fixtures are captured, never hand-written.** `capture/capture-drupal.sh`
stands up a throwaway `drupal:11` container, applies the site config, seeds the
canonical content set, and records the real JSON:API responses. The mock replays
those. The script stays in-repo and is re-runnable, so the mock is *derived from
reality* on day one and can be re-derived when Drupal changes. Hand-writing the
mock would encode our beliefs about JSON:API rather than JSON:API's behaviour —
and JSON:API normalization is precisely where this adapter is most likely to be
wrong.

*Accepted cost:* nothing ever proves the Drupal adapter works against a live
Drupal. Mitigated but not eliminated by the capture script. A CI job that
re-captures and fails on diff is a cheap later addition, and is the right fix if
drift ever bites.

### 2.2 Assertions are layered: contract suite + thin E2E

The bulk of the assertions live in a headless Node contract suite that drives
adapters **directly** — no browser, no bridge, no Volto. A failure names the
intent that broke. On top of that sit roughly six Playwright specs per CMS that
prove the whole chain end to end.

The alternative — everything through Playwright, matching the existing
`tests-playwright/bridge` pattern — was rejected because a failing assertion
there could be the admin, the bridge, the adapter or the CMS, and every intent
costs a page load. The alternative in the other direction — contract suite only —
was rejected because it would never exercise the Gutenberg coexistence risk.

### 2.3 Adapters emit canonical shapes; one shared `plonify()` adapts to Volto

`hydra-plan.md` proposed that adapters synthesize Plone-shaped JSON (`@id`, `UID`,
`review_state`, `@components.*`) so Volto's reducers need no change. That is
correct arithmetic for one non-Plone adapter and wrong arithmetic for two: the
same Plone-isms get re-implemented per adapter, the conformance suite ends up
asserting Plone trivia rather than editor semantics, and every new field a Volto
reducer reads breaks every adapter silently.

Instead: adapters emit clean canonical shapes, and a single `plonify()` module
converts canonical → Plone-shaped on the way into the reducers.

**`plonify()` is admin-side** (`packages/volto-hydra/src/bridge/plonify.ts`), not
in `hydra-adapters-core`. Three consequences, all wanted:

- The wire carries canonical shapes only.
- Frontends never bundle Plone-isms — a WordPress site's JS has no idea Plone exists.
- When the reducers are eventually fixed to consume canonical shapes directly,
  one file is deleted and nothing else changes.

The Plone adapter's `http` passthrough returns raw Plone JSON. Its response
envelope carries `raw: true`, and `plonify()` is skipped for those. This is what
makes the transparency proof (§9, M2) meaningful: with the flag on, reducers see
byte-identical bytes to today.

### 2.4 Drupal stores blocks in a dedicated `string_long` field

`hydra-plan.md` claims Drupal can store blocks in "a JSON field via core
`json_native` or contrib" and that Drupal needs no module for content. **The core
half of that is false.** Drupal 11 core ships no JSON field type — its field
plugins are Boolean, Changed, Created, Decimal, Email, EntityReference, Float,
Integer, Language, Map, Password, String, StringLong, Timestamp, Uri, Uuid (plus
the text types in the `text` core module). `json_field` / `json_native` is
[contrib](https://www.drupal.org/project/json_field).

Blocks therefore live in `field_hydra_blocks`, a core `string_long` field added
to the node bundle by configuration:

```bash
drush field:create node --bundle=page \
  --field-name=field_hydra_blocks --field-type=string_long
```

JSON:API then exposes it at `data.attributes.field_hydra_blocks` as a raw JSON
string, with no normalization surprises.

This is site-building, not a module install, so the "no contrib required" claim
survives honestly. Rejected alternatives: the `body` field with an HTML-comment
wrapper (mirrors WordPress and needs zero setup, but shares a field with real
content where text filters can reach it); `json_field` contrib (proper typed
storage, but drops the no-module claim and adds a composer dependency).

### 2.5 The contract suite is written first, against Plone

Sequence: contract suite → Plone green → WordPress green → Drupal green.

The suite must go green against **today's Plone behaviour** before any new
adapter exists. That is the whole point: it proves the suite describes the editor
we actually have rather than an editor we imagined. If it can't go green on
Plone, the suite is wrong and the suite gets fixed — not the CMS.

After that, each adapter is a pure red→green exercise against an already-trusted
target.

## 3. Architecture

```
Volto admin  (reducers, widgets, action creators)
     |  action.request { op, path, data, headers }        <- unchanged
     v
api.js middleware  ---- config.settings.useBridgeBackend
     |
     v
BridgeRPC.client   <--- plonify(canonical)  ------+       <- ONE module, admin-side
     |                                            |
     |  postMessage                               |
     v                                            |
hydra-js BridgeRPC (iframe)  ---------------------+
     |
     v   HydraAdapter.dispatch(intent, args)
  +--+--------+----------+
plone         wp       drupal
  |            |          |
  v            v          v
 CMS          CMS        CMS
```

The frontend owns the adapter and registers it at init:

```js
import { initBridge } from 'hydra-js'
import drupalAdapter from '@hydra-adapters/drupal'

initBridge({ adapter: drupalAdapter, cmsBaseUrl: location.origin })
```

The adapter therefore executes on the frontend's origin with the frontend's
cookies. The admin makes zero CMS requests and holds zero credentials.

**Version skew is real and expected.** The adapter ships with the frontend's
deployment, not with Hydra, so a site can run a six-month-old adapter against a
current Hydra. That is what the `protocolVersion` + `capabilities` handshake is
for: Hydra degrades affordances rather than breaking. The contract suite pins and
tests a specific protocol version, not "whatever is current".

### 3.1 Packages

| Package | Purpose | Depends on |
| --- | --- | --- |
| `hydra-types` | canonical TS types, zero runtime | — |
| `hydra-adapters-core` | `BaseAdapter`, error codes, retry-on-401, URL utils, block-envelope codec | types |
| `hydra-adapters-plone` | Plone adapter (`http` passthrough + semantic intents) | core |
| `hydra-adapters-wordpress` | WordPress adapter | core |
| `hydra-adapters-drupal` | Drupal adapter | core |
| `hydra-js/src/bridgeRpc.js` | envelope + iframe-side dispatch | types |
| `volto-hydra/src/bridge/` | admin RPC client **+ `plonify()`** | types |

Each unit is independently testable: `hydra-types` has no behaviour,
`adapters-core` is unit-testable without a CMS, each adapter is exercised by the
contract suite without a browser, `bridgeRpc` is exercised by Tier-0 without a
CMS, and `plonify()` is unit-tested per reducer-consumed field.

### 3.2 Message envelope

Unchanged from `hydra-plan.md` Phase 0, with one addition:

- `BACKEND_REQUEST { requestId, intent, args, meta: { timeoutMs } }`
- `BACKEND_RESPONSE { requestId, ok, raw?, result | error: { code, status, message, data } }`

`raw: true` marks a response that must bypass `plonify()` — set by the Plone
adapter's `http` passthrough.

Unsolicited iframe→admin: `ADAPTER_READY`, `AUTH_STATE`, `AUTH_REQUIRED`, as in
`hydra-plan.md`.

## 4. Test harness

### Tier 0 — protocol unit (vitest, no CMS, no browser)

`BridgeRPC` envelope behaviour only: requestId correlation, default 30s timeout,
per-intent timeout override, error coding, version-mismatch fallback,
`raw` passthrough marking.

### Tier 1 — the contract suite (vitest, headless Node)

This is the spec in executable form.

```
tests-adapters/
  contract/
    content-crud.spec.ts       get / create / update / delete / order / move
    search.spec.ts             search, navigation, breadcrumbs, tree.list
    schema.spec.ts             types.list, types.getSchema
    vocabulary.spec.ts         vocabulary.get, incl. 10k-term autocomplete
    asset.spec.ts              asset.upload, asset.imageUrl variants
    auth.spec.ts               whoami, 401 -> AUTH_REQUIRED, retry-on-401
    blocks-roundtrip.spec.ts   blocks survive write -> read -> write
    capabilities.spec.ts       advertised capabilities match actual behaviour
  targets/
    plone.ts       -> existing mock-plone-api.cjs        :8888
    wordpress.ts   -> @wp-playground/cli server          :8890   (real WP)
    drupal.ts      -> mock-drupal-api.cjs                :8891   (captured)
  fixtures/
    seed.json            <- ONE canonical content set, source of truth
    wp-blueprint.json    <- generated from seed.json
    drupal-seed/         <- generated from seed.json
  capture/
    capture-drupal.sh    <- one-off vs docker drupal:11; regenerates the mock
```

Each target module exports `{ start(), stop(), seed(), adapter }`. Run as
`TARGET=wordpress pnpm test:contract`, or across all three.

**The rule that makes one suite serve three CMSes: one seed set, three
projections.** `fixtures/seed.json` is the source of truth — a nested folder, a
draft and a published document, an image, and a 10 000-term taxonomy for the
autocomplete assertion. Each target's seeder projects it into its CMS. Every
assertion is written against the seed, never against per-CMS literals. If an
assertion needs a `wp-` prefix to pass, the abstraction has leaked and the suite
says so immediately.

`capabilities.spec.ts` deserves its own note: for every capability an adapter
advertises, the suite exercises the corresponding intent and asserts it works;
for every capability it does *not* advertise, the suite asserts the intent fails
cleanly. This makes false advertising a test failure rather than a UI bug.

### Tier 2 — E2E round-trip (Playwright)

Six specs, run per CMS, reusing the existing `tests-playwright` infrastructure
and helpers (`AdminUIHelper`, `BlockVerificationHelper`, `fixtures.ts`):

1. **connect** — frontend URL → iframe → `ADAPTER_READY` → editor chrome renders
2. **round-trip** — edit, save, reload; block content survives in the real store
3. **native-editor coexistence** — open the same post in Gutenberg, save there,
   assert the `hydra-blocks` comment survived. Only real WordPress can answer
   this, and it is the riskiest claim in the design.
4. **session expiry** — kill the session mid-edit; `AUTH_REQUIRED` toast appears,
   pending edits are preserved
5. **capability gating** — adapter without `workflow` → no Workflow button
6. **asset upload** — upload an image, assert the variant URL resolves

Test frontend: reuse `tests-playwright/fixtures/test-frontend`, parameterized
`?adapter=wp|drupal|plone`. One frontend, three adapter bundles. No new demo
applications.

## 5. WordPress adapter

| Concern | Approach |
| --- | --- |
| Test backing | `@wp-playground/cli server` — real WP on PHP-WASM, SQLite, blueprint-seeded from `seed.json` |
| E2E fixtures | `@wordpress/e2e-test-utils-playwright` `RequestUtils` for REST-based create/cleanup |
| Block storage | `<!-- wp:hydra-blocks/document {…} /-->` in `post_content`; codec shared from `adapters-core` |
| Auth | cookie + `X-WP-Nonce` same-origin; application password via the `form` method as fallback |
| Schema | synthesized from `/wp/v2/types/{type}` |
| Capabilities | `search-fulltext`, no `workflow` in MVP |
| Escape hatch | if WASM PHP proves unfaithful, swap `targets/wordpress.ts` to `@wordpress/env` (Docker) — same blueprint, no test changes |

## 6. Drupal adapter

| Concern | Approach |
| --- | --- |
| Test backing | `mock-drupal-api.cjs` serving `/jsonapi/*`, fixtures captured by `capture/capture-drupal.sh` from `drupal:11` |
| Block storage | `field_hydra_blocks` (core `string_long`), created by config in the seed script |
| Schema | static-schema fallback: `types.getSchema()` reads a bundled `schema.json`, **generated by the capture script** from live field config — derived, not invented |
| Normalization | JSON:API `data`/`included` flattening isolated in one `normalize.ts`; the heaviest adapter code in the project |
| Auth | cookie + `/session/token` CSRF; `basic_auth` (core module) for the contract suite |
| Capabilities | `search-filter`, **not** `search-fulltext` — no `search_api` contrib |

## 7. Milestones

| | Deliverable | Done when |
| --- | --- | --- |
| **M1** | `hydra-types`, `hydra-adapters-core`, `bridgeRpc`, admin `BridgeRPC.client`, `plonify()`, `ADAPTER_READY` / `AUTH_REQUIRED`, Tier-0 tests | lands dark behind `useBridgeBackend`, no callers |
| **M2** | Contract suite written, `targets/plone.ts`, Plone adapter | suite green on Plone **and** the existing Playwright suite green with `useBridgeBackend=true` |
| **M3** | wp-playground target, blueprint generator, WordPress adapter | same suite green on WordPress |
| **M4** | capture script, Drupal mock, Drupal adapter | same suite green on Drupal |
| **M5** | six E2E specs × three targets, test-frontend parameterization | Gutenberg coexistence proven against real WordPress |

M2 is load-bearing. Everything downstream assumes the suite is trustworthy, and
the only evidence for that is it passing unchanged against the CMS we already
know works.

## 8. Risks

1. **PHP-WASM fidelity.** WP Playground's PHP differs subtly from a LAMP stack.
   *Mitigation:* `@wordpress/env` swap behind the same target interface — a
   one-file change.
2. **Drupal mock drift.** The accepted cost of §2.1. *Mitigation:* the capture
   script stays in-repo and re-runnable; an opt-in CI job that re-captures and
   fails on diff is the fix if drift bites.
3. **`plonify()` completeness.** The `CANONICAL_FIELDS.md` audit is still
   required — grep every field read on `action.result` / `state.data` across
   `core/packages/volto/src/reducers/**` — but it is now one module's problem
   rather than three adapters'. *Mitigation:* a `plonify` unit test per
   reducer-consumed field, derived from that grep.
4. **Bridge contention.** `FORM_DATA` runs hot during typing and backend RPC
   shares the channel. *Mitigation:* move RPC to its own `MessageChannel` if
   traces show it.
5. **Drupal has no full-text search.** The UI must honour `search-filter` vs
   `search-fulltext` or the search box lies to the user. Covered by
   `capabilities.spec.ts`.
6. **Adapter / Hydra version skew.** Handled by the handshake, but the contract
   suite must pin a protocol version rather than tracking `main`.

## 9. Out of scope

Unchanged from `hydra-plan.md`: workflow/sharing/history UI, comments, relations,
content rules, native Gutenberg block round-tripping, multilingual, cursor
search, SSR for the editor route, autosave. Strapi and Wagtail adapters are
deferred — the contract is designed to admit them, but nothing here builds them.

## 10. Workflow constraints

Built in the `cms-adapters` worktree at
`~/.config/superpowers/worktrees/inka/cms-adapters`. Commits are local only.
**Nothing is pushed** until the repos are moved. This spec lives in the worktree
so it travels with the branch through the move.
