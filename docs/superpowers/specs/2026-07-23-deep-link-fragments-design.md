# Deep-link fragments (linkable anchors)

## Problem

When editing a link, an author can pick a target page but cannot deep-link to a
*fragment* within it (a heading, a section). Volto has no notion of the anchors a
page exposes. We want the link picker to offer a target page's in-page anchors, so a
link can resolve to `path#fragment`.

## Frontend contract

The frontend marks each deep-linkable element with:

- a real `id` attribute — the `#fragment` the browser scrolls to, and
- `data-linkable-id="Friendly Name"` — the human label shown in the picker.

```html
<h2 id="our-services" data-linkable-id="Our Services">Our Services</h2>
```

Both attributes must survive into the *published* render for the anchor to resolve at
runtime — that is the frontend's responsibility. Hydra only harvests them in edit mode.

`linkable-id` is registered in hydra's existing tag family (the `attrMap` in
`applyHydraAttributes`, hydra.js:1007) alongside `block-uid`, `edit-text`, `edit-link`,
etc., so the frontend can also declare it via a hydra-comment selector rather than a
literal attribute.

## Data shape (per-block, in `blocks`)

Anchors persist **inside the block** that contains them:

```jsonc
"blocks": {
  "text-1": {
    "@type": "slate",
    "value": [ ... ],
    "_linkableAnchors": [
      { "id": "our-services", "name": "Our Services" }
    ]
  }
}
```

Chosen because the registered `blocks` behavior field rides through Plone's REST
serializer verbatim; an ad-hoc top-level field would be dropped on save. The
`_linkableAnchors` key is omitted entirely when a block has no anchors (no churn, no
bloat). The `_` prefix follows the existing hydra block-metadata convention
(`_customFields`, `_editSequence`).

## Write path — collect on render (echo-guarded)

Collection reuses hydra's existing DOM-tag scanning; there is **no** save-time
round-trip and **no** MutationObserver.

In hydra's render-complete pass, `collectLinkableAnchors()`:

1. `document.querySelectorAll('[data-linkable-id]')`.
2. For each element: `owner = el.closest('[data-block-uid]')`. Skip if no owner.
   Skip if the element has no `id` (there is no fragment target without one).
   Anchor = `{ id: el.id, name: el.getAttribute('data-linkable-id') }`.
3. Group by owner uid. Nearest-ancestor grouping means a container block never
   absorbs its child blocks' anchors (each anchor belongs to exactly one block).
4. For each affected block, write `block._linkableAnchors` into formData **only when
   the value changed** (deep-equal guard), using `getBlockData`/`updateBlockById` so
   nested blocks resolve via `blockPathMap`. Push the change to the admin so it lands
   in the admin's canonical formData and persists on the normal save.

The change-guard is load-bearing: the FORM_DATA pipeline is sensitive to echo loops, so
an unconditional write each render would thrash. Unlike `nodeId`s (injected then
stripped before save), `_linkableAnchors` is intentionally persisted.

**Staleness:** anchors reflect the last render+save. If the frontend stops emitting a
tag, the block keeps the old anchor until the next render+save. Acceptable — it is a
"saved list", matching the design intent.

## Read path — expand in the object browser

Both link surfaces route through Volto's `ObjectBrowser` — the sidebar `object_browser`
link widget and the canvas inline text-link editor (`AddLinkForm` via
`withObjectBrowser`). So the affordance is implemented **once** in `ObjectBrowserBody`
(customization already exists at
`src/customizations/volto/components/manage/Sidebar/ObjectBrowserBody.jsx`).

Per browsable item, an "expand anchors" control:

1. REST GET the **full object** (`getContent`), not the catalog search item — the object
   browser lists via `searchContent`, whose metadata does *not* carry block data. The
   expand action fetches the target's full `blocks`/`blocks_layout`.
2. `buildBlockPathMap(targetFormData, blocksConfig)`, then walk blocks in **layout
   order** — an ordered DFS from the page root via `getChildBlockIds` /
   `getChildBlockIdsInField`, recursing into containers. Never `Object.keys(blocks)`
   (arbitrary order, flat — misses nesting).
3. Collect each block's `_linkableAnchors` in traversal order → a flat, document-ordered
   `[{id, name}]` list.
4. Render the list; picking an anchor yields the link value `targetPath#id`. Picking the
   page itself (no anchor) is unchanged.

## Addendum — transient store + tag-driven (final architecture)

Two problems surfaced in implementation and reshaped the design.

**1. Live-edited anchors.** A heading's `id` is renderer-computed, and inline editing
doesn't re-render, so a freshly-typed heading's `id`/`data-linkable-id` go stale. The
frontend (its choice) keeps them fresh with a small `input` listener, and the bridge
harvests on `flushPendingTextUpdates` (content update) as well as `afterContentRender`.

**2. Anchors must NOT live in the blocks during editing.** Writing `_linkableAnchors`
into `formData` on every harvest re-rendered the iframe (cursor loss, echo — broke the
metadata title-edit and cursor-stability tests). So anchors are held **outside the
blocks** while editing:

- A transient Redux slice (`linkableAnchors`, `{ [blockUid]: [{id,name}] }`), driven by
  `View`. The `LINKABLE_ANCHORS` handler only `dispatch`es — no `formData` mutation, no
  re-render, no echo.
- **On load**, the slice is seeded from the blocks' saved `_linkableAnchors`.
- **On save**, `Form.onSubmit` merges the slice back into `formData.blocks` (and passes
  that merged formData through `getOnlyFormModifiedValues`, which otherwise defaults to
  the unmerged `state.formData`).
- **Object browser** reads the slice for the page being edited (ordered against its block
  layout), `getContent` for other pages.

**Tag-driven, block-agnostic.** Harvest and refresh key off the `data-linkable-id` tag
only — any element, multiple per block, never element/block/field type. The frontend tags
what it wants (headings here); the page title has no tag, so it is never touched (no
special-casing). The refresh listener only refreshes already-tagged elements.

## Testing (TDD — red first)

- **Fixture:** `test-frontend` renderer emits a block whose element carries `id` +
  `data-linkable-id`, including a nested/container case.
- **Unit (`collectLinkableAnchors`):** nearest-ancestor grouping; skip elements with no
  `id`; container does not absorb child-block anchors; unchanged input produces no write
  (echo guard).
- **Unit (read traversal):** ordered collection across nested blocks returns anchors in
  document order, not dict order.
- **Integration:** edit a page → `blocks[...]._linkableAnchors` populated; save + reload
  → persists (rides the `blocks` field); object-browser expand lists the target's
  anchors in order; picking one produces `path#id`.

## Risks

- **Echo loop** on the anchor write is the highest-leverage detail; cover with the
  "unchanged input → no write" unit test before wiring the render hook.
- **`buildBlockPathMap` shape** must be built from the *target* page's formData +
  registry `blocksConfig`; confirm the browse-time REST response carries full block data.
- **Frontend responsibility**: if the published render omits `id`/`data-linkable-id`, the
  anchor resolves in the picker but not at runtime — document the contract clearly.

## Out of scope

- Auto-generating `id`s or slugs (the frontend owns anchor identity).
- Cross-site / external-URL anchors (internal targets only, consistent with the existing
  internal-link pull path).
- Anchor `id` uniqueness within a page — the frontend owns it; duplicates just produce
  duplicate picker entries pointing at the same `#fragment`.
