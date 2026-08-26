# M3: WordPress adapter, unified Permissions & State, and the journey test

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A person logs into WordPress, creates a page in Hydra, edits it with
blocks, publishes it, and an anonymous visitor can read it.

**Prerequisite:** M2b (`2026-08-26-cms-adapters-m2b-iframe-hoist.md`). The Add
route deadlocks until that lands, and step 2 of the journey is Add.

**Tech:** `@wp-playground/cli` (real WordPress on PHP-WASM, SQLite, blueprint-seeded),
`@wordpress/e2e-test-utils-playwright` for fixtures.

---

## The journey is the headline test

Everything else in this milestone exists to make this pass. Write it first, let
it fail for real reasons, and work backwards.

```
1. log in     blueprint seeds a logged-in WP cookie   → Flow A: no login UI at all
2. create     toolbar Add → content.create           → the post exists in WP
3. edit       drag a block, type into it             → content.update
4. verify     reload                                 → blocks survive in post_content
5. publish    state.transition draft → publish       → the combined panel
6. confirm    fetch the public URL ANONYMOUSLY       → the block's text is on the page
```

Step 6 is what makes it real. It leaves Hydra entirely and asks WordPress, as a
reader with no session, whether the thing was actually published. None of the 44
contract assertions can lie their way past that.

**Why the journey and not only slices.** Six isolated specs localise failures
well but never exercise ordering, and every defect found in M1/M2 was an
ordering or lifetime bug: transport chosen before the bridge existed, an adapter
whose host was gated behind the request it had to answer, a re-announcement
missing on SPA navigation. A journey test would have hit the bootstrap deadlock
at step 2 on day one. Keep both: the journey answers *does it work*, the slices
answer *where did it break*.

## Task 1: The journey spec, failing

**Files:**
- Create: `tests-adapters/e2e/journey-wordpress.spec.ts`

- [ ] **Step 1: Write all six steps end to end**

Assert against the seed, not per-CMS literals, exactly as the contract suite
does. Step 6 must use a fresh browser context with no storage state — reusing
the authenticated context would let a draft render and pass.

- [ ] **Step 2: Run it and read the failure**

Expected: fails at step 1 or 2. Record which. Do not fix anything yet.

## Task 2: WordPress target

**Files:**
- Create: `tests-adapters/targets/wordpress.ts`
- Create: `tests-adapters/fixtures/wp-blueprint.json`
- Modify: `tests-adapters/targets/index.ts` (register in `TARGETS`)

- [ ] **Step 1: Generate the blueprint from `seed.json`**

Same rule as `project-plone.mjs`: `seed.json` is the source of truth and each
target projects it. Do not hand-author WordPress content.

- [ ] **Step 2: Implement the `Target` interface**

The Plone target defines what is needed — `start/stop/seed`, `types`,
`vocabularies`, `capabilities`, `expireSession`, `fetchAsSession`, plus the port
preflight that refuses to reuse a server it did not start.

| Member | WordPress |
| --- | --- |
| `types` | `page → page`, `folder → page`, `image → attachment` |
| `vocabularies` | `categories → categories` |
| `capabilities` | content, search-fulltext, vocabulary, schema, asset, **state** |
| `expireSession` | invalidate the nonce |
| `fetchAsSession` | cookie + `X-WP-Nonce` |

Note `per-content-permissions` is absent: vanilla WP has no per-post grants, so
the sharing half of the panel must hide. `capabilities.spec.ts` enforces this.

- [ ] **Step 3: Run the existing contract suite against it**

Run: `TARGET=wordpress pnpm test:contract 2>&1 | tee /tmp/wp-contract.log`
Expected: red, one intent at a time. Work through them; do NOT weaken an
assertion to get green without first checking the assertion is genuinely
CMS-specific — that judgement is what produced the slug and breadcrumb
corrections in M2.

## Task 3: Permissions & State — intents and the combined panel

**Files:**
- Create: `tests-adapters/contract/state.spec.ts`
- Modify: `packages/hydra-adapters-plone/index.js`, `packages/hydra-adapters-wordpress/index.js`
- Create: `packages/volto-hydra/src/components/PermissionsPanel/`

- [ ] **Step 1: Contract spec for `state.get` / `state.transition`**

Assert the canonical `PermissionsAndState` shape; that a draft seed document
reports a draft state and offers a transition to published; that performing it
changes `state.name`; and that `shareEntries` is null when
`per-content-permissions` is not advertised.

- [ ] **Step 2: Implement for Plone and WordPress**

```js
// WordPress — the whole of publish
case 'state.transition':
  return this.fetchJson(`/wp/v2/${type}/${id}`, {
    method: 'POST', body: { status: args.id },
  });
```
```js
// Plone
case 'state.transition':
  return this.fetchJson(`${args.path}/@workflow/${args.id}`, { method: 'POST' });
```

The mock Plone API has `@workflow` for reads but no transition endpoint — add
one, the same way M2 added DELETE, `@types` 404s and session blobs. Each of
those was a place the mock had drifted from real Plone and made an intent
untestable.

- [ ] **Step 3: The combined panel**

One panel, two halves, per spec §8a: lifecycle ("what state am I in, where can
I go") above access ("who can see and edit this"). Each half renders only if its
capability is advertised — so on WordPress the panel shows a status control and
no sharing, with no WP-specific code in the admin.

Transitions render from `transitions[]`. Do not hardcode a Publish button:
the point of the model is that the adapter says what is possible.

- [ ] **Step 4: Run the journey again**

Expected: reaches step 5 and publishes.

## Task 4: Slices, and the probe

- [ ] **Step 1: The six focused specs**

connect · round-trip · Gutenberg coexistence · session expiry · capability
gating · asset upload. Coexistence is the one only real WordPress can answer:
open the post in Gutenberg, save there, assert the `hydra-blocks` comment
survived.

- [ ] **Step 2: Falsification probe — NOT optional**

Remove the adapter registration from the test frontend and re-run the journey.
It MUST fail. M2's first bridge run passed 20/20 while the bridge carried no
traffic at all; a green run is not evidence the bridge did anything. Restore
afterwards.

- [ ] **Step 3: `attach` over the bridge**

`BridgeApi` forwards superagent's `attach` but nothing consumes it, so multipart
uploads do not cross the bridge. The contract suite missed this because
`asset.upload` sends base64 JSON. Either implement multipart transfer over the
bridge or make it fail loudly — silently dropping an upload is the worst option.

## Known scope

- Vanilla WordPress, no plugin. Blocks live in `post_content` as
  `<!-- wp:hydra-blocks/document {…} /-->`.
- Same-origin cookie + nonce is the happy path. Flow B (app password via the
  schema-driven `<AuthChallenge>`) gets its own spec; blueprints can seed a
  logged-out state to reach it.
- `per-content-permissions` stays unadvertised for WordPress.
