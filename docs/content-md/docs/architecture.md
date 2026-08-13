---
"@type": Document
UID: docs-architecture-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Instead of combining editing and rendering into one framework and
  codebase, these are separated and during editing a two way communication
  channel is opened across an iframe so that the editing UI is no longer part of
  the frontend code. Instead a small JS file called hydra.js is included in your
  frontend during editing that handles the iframe bridge communication to Inka
  which is running in the same browser window.
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: architecture
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - frontend
  - editing
title: How Inka Works
blocks:
  - title-1: title
  - p-1: slate
  - sep-2: separator
  - h-3: slate
  - p-4: slate
  - ce-5: codeExample
  - h-6: slate
  - p-7: slate
  - ul-8: slate
  - p-9: slate
  - h-10: slate
  - p-11: slate
  - ol-12: slate
  - p-13: slate
  - h-14: slate
  - p-15: slate
  - ol-16: slate
  - p-17: slate
  - h-18: slate
  - p-19: slate
  - ul-20: slate
  - p-21: slate
  - p-22: slate
  - ul-23: slate
  - p-24: slate
  - p-25: slate
  - ol-26: slate
  - p-27: slate
  - h-28: slate
  - p-29: slate
  - p-30: slate
  - p-31: slate
  - ul-32: slate
  - p-33: slate
  - p-34: slate
  - h-35: slate
  - p-36: slate
  - p-37: slate
  - h-38: slate
  - p-39: slate
  - tbl-40: slateTable
  - p-41: slate
---

<block type="title" uid="title-1" />

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing a two way communication channel is opened across an iframe so that the editing UI is no longer part of the frontend code. Instead a small JS file called hydra.js is included in your frontend during editing that handles the iframe bridge communication to Inka which is running in the same browser window.

<block type="separator" uid="sep-2" />

## Architecture Overview

You could think of it as splitting Volto into two parts, Rendering and CMS UI/Admin UI while keeping the same UI and then making the Rendering part easily replaceable with other implementations.

<block type="codeExample" uid="ce-5">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ce-5-bash-56c4ae"}]}'>

### Architecture

```bash
                  Browser            RestAPI             Server

              ┌──────────────┐                       ┌─────────────┐
 Anon/Editing │    Volto     │◄─────────────────────►│    Plone    │
              └──────────────┘                       └─────────────┘

──────────────────────────────────────────────────────────────────────────

          │   ┌──────────────┐                       ┌─────────────┐
          │   │   Frontend   │◄──────────────────────┤    Plone    │
          │   └──hydra.js────┘                       └─────────────┘
          │          ▲                                  ▲
 Editing UI          │ iFrame Bridge                    │
          │          ▼                                  │
          │   ┌──────────────┐                          │
          │   │    Inka     │◄─────────────────────────┘
          │   └──────────────┘

              ┌──────────────┐                       ┌─────────────┐
 Anon         │   Frontend   │◄──────────────────────┤    Plone    │
              └──────────────┘                       └─────────────┘
```

</region>

</block>

## The iframe ↔ admin bridge

During editing the frontend is loaded inside an iframe owned by Inka's admin UI. The two communicate via `postMessage` over the iframe boundary:

- **Admin → frontend**: form-data updates, selection changes, route changes.
- **Frontend → admin**: which block was clicked (selection), which slate node holds the cursor, where blocks live in the rendered DOM, slate transform requests so the admin can compute the new value.

This split lets the frontend stay 100% headless when not in admin (just renders content), while the admin gets full visual editing without the frontend having to know any React, any block-form widgets, or any sidebar UI.

## The chrome pattern

Selection outlines, the Quanta toolbar, drag handles, edge handles, the empty-block "+" — none of these are rendered by the frontend. They're rendered in the admin (React) layered above the iframe. The frontend only:

1. Adds the data attributes that mark editable elements (`data-block-uid`, `data-edit-text`, `data-edit-link`, `data-edit-media`, `data-node-id`).
2. Captures pointer events through invisible elements so the admin's chrome stays interactive.
3. Reports element rects on demand so the chrome can position itself.

The benefit: a frontend's CSS can never break the editing UI, because the editing UI doesn't live in the frontend. Switching frontends mid-edit (Nuxt → Next → Astro) works because the bridge protocol is the same — only the rendered DOM changes. Server-only frameworks without client-side reactivity (Astro, PHP, Django, Rails) participate via the [server-render pattern](./server-rendered-frontends.md) — same bridge protocol, plus a small HTTP endpoint the bridge POSTs to.

## Slate (rich text) transforms

When the editor types in a slate field, the frontend doesn't compute the new slate value itself — the admin does, by running the slate transform against the previous slate value. The frontend's job is to:

1. Receive the new slate value via `SLATE_TRANSFORM_RESULT` and re-render.
2. Send slate node `data-node-id` attributes back so the admin can place the cursor at the right node after re-render.

This is why every slate node needs a `data-node-id` attribute on its rendered HTML — without one, the admin can't track the cursor across re-renders. See [Visual Editing › Renderer Node-ID Rules](visual-editing.md#renderer-node-id-rules).

## Template membership (edit-side slot assignment)

A block's template membership — `templateId`, `templateInstanceId`, `slotId`, `fixed`, `readOnly` — is not intrinsic to the block; the admin **assigns** it at edit time. The [merge](templates.md#how-the-merge-works) reads these fields to place content at render time. Crucially, assignment is **gated on edit mode** — editing a template is a different act from moving content around inside a template you're *not* editing:

- **Normal editing** (you are *not* editing the template): a block's slot is **implicit**, derived from position. A moved/pasted block **takes on the membership of wherever it lands and carries nothing from where it came from**. Drag direction is irrelevant — a given drop position always yields the same membership.
- **Template edit mode** (you *are* editing the template, having unlocked it): the `slotId` is **explicit** — there's a `slotId` field, and you *rename* slots rather than change them by dragging. So a move that stays **inside** the template **keeps** its `slotId`; you can even build an invalid arrangement this way (save/lock validation, not the drag, is what refuses it). A move **out** of the template still **strips** it — dragging out exits, even while editing.

Fixed template blocks are only movable in template edit mode and their slot/`fixed` identity *is* the template, so they always keep their membership.

**Deriving membership from position** (the normal-mode path, and the "is this inside the template" test) — `getTemplateInfoFromNeighbors` in `blockSync.js` (reached via `applyBlockDefaultsWithContext`). Given a position in a container region it inspects the immediate neighbours and asks whether a slot *faces this gap*:

- a **non-fixed slot neighbour** on either side → join its `slotId`;
- a **fixed anchor** whose slot region faces the gap — the block *before* the gap via its `nextSlotId` (a trailing slot), or the block *after* it via its `prevSlotId` (a leading slot). `nextSlotId`/`prevSlotId` are an anchor's record of an *empty* adjacent slot (when the slot has content, the non-fixed neighbour above already covers it); they are mirror images, for top- vs bottom-anchored layouts;
- otherwise, if the **container itself is a template instance** (e.g. a `columns` block carrying a `templateId`), the block joins that instance and is given a freshly generated `slotId`.

If none apply, the position is **outside every template** and the function returns `undefined` — plain page content. A slot member is never fixed, so membership derived this way is always `fixed: false`.

**Applying it on a move or paste** — the `MOVE_BLOCKS` handler and the add/paste helper in `View.jsx`. Four things make the gated rule actually happen:

1. **Strip the source membership — but only when the destination should re-derive it.** A moved/pasted non-fixed block has its `templateId` / `templateInstanceId` / `slotId` / `readOnly` deleted *before* the recompute, so `applyBlockDefaultsWithContext` can only refill them from the destination. This runs in **normal mode**, and in **template edit mode only when the block lands *outside* the template** (a same-instance block no longer sits both before and after the landing gap) — that's the drag-out exit. For an **in-template move while editing**, the strip is skipped, so the recompute's *prefer-existing-`slotId`* keeps the authored slot. **Fixed** blocks are never stripped.
2. **Exclude the block from its own neighbour scan.** On a move the block already sits in the layout at its new index, so a naïve `getNeighborData(position)` returns the block itself — it would offer its own stale slot back to itself. The recompute filters the moved block out and treats `position` as the insertion gap between its real prev/next neighbours (also the basis of the "inside the template?" test above).
3. **Write back against the original.** The update guard compares the recompute result to the *originally stored* block, not the stripped copy — otherwise a block whose stripped recompute is a structural no-op is never written back and the stale membership survives.
4. **`templateEditModeRef` for the mode check.** The handler reads the current set of unlocked template instances from a ref (not the effect-closure value), so the gate sees the live edit-mode state.

In normal mode the net effect matches the merge's own placement rules (a top/bottom slot outside a fixed anchor): dropping a block past a **free** edge flows it into that slot; dropping it past a **both-anchored** edge exits it to the surrounding page region. The drag scan that decides the drop position lives in `hydra.js` and, on a distance tie between coincident edges, prefers the deeper (inner) edge so a reorder inside a container isn't ejected to the outer level.

## URL flattening and `publicURL`

Volto's stock URL helpers (`flattenToAppURL`, `isInternalURL`, `toPublicURL`) assume there's one "public URL" — usually the same origin the admin runs on, configured via `RAZZLE_PUBLIC_URL`. In Inka the admin and the published frontend(s) live on different origins, and the editor switches between published frontends at will, so there is no single public URL.

**Do not set `RAZZLE_PUBLIC_URL`** in an Inka deployment. Pinning `settings.publicURL` to one value would break flattening for every other frontend — pastes from them would be misrecognised as external and saved verbatim instead of as `/path` references.

Inka makes `settings.publicURL` follow the currently active iframe frontend:

- **Boot** — `applyConfig` reads the `iframe_url_<port>` cookie (set by `View.jsx` on previous visits), looks up the matching saved-frontends entry, and writes `settings.publicURL = entry.publishUrl || entry.url`. A returning editor sees the right value before they open the switcher.
- **Switch** — when the editor picks a different frontend in the toolbar switcher (`FrontendSwitcherPanel`), it dispatches `setFrontendPreviewUrl(url)`. Inka's `publicUrlSync` Redux middleware intercepts the action and updates `settings.publicURL` before the next render.
- **Other frontends** — `flattenToAppURL` and `isInternalURL` are shadowed to strip `publicURL` (the active frontend) **plus** every other saved frontend's edit / publish URL, so a paste from a frontend you're not currently viewing still flattens cleanly.

Saved frontends come from two sources, merged: the `RAZZLE_DEFAULT_IFRAME_URL` env (baseline list shipped with the deployment, format `Name|EditURL[|PublishURL],…`) and the `saved_urls_<port>` cookie (per-editor additions made via the toolbar Settings modal). The optional third slot in each entry is for setups where the published site lives at a different origin than the edit-mode frontend (e.g. `edit.example.com` for previews, `www.example.com` for production).

What we deliberately did NOT shadow: `UniversalLink`'s fallback `href` when an item is empty, Volto's admin-side `Robots.txt` / `Sitemap.xml` generators, `ContentMetadataTags` / `AlternateHrefLangs` in the admin's `<head>`, and the `RegistryImageWidget` site-logo URL. All of these inherit the dynamic `publicURL` transparently, and in an Inka deployment the authoritative `robots.txt` / `sitemap.xml` / SEO tags are served by the frontends, not the admin.

## Building a frontend

The steps for creating an Inka-compatible frontend are the same across frameworks: catch-all route → fetch page from Plone REST API → render blocks recursively → add `data-block-uid` and `data-edit-*` attributes on editable elements → load `hydra.js` only inside the admin iframe.

See [Build a frontend](build-a-frontend.md) for the full step-by-step guide, or the example frontends: [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter), [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs), [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7).

## Layers of adoption

Inka is **additive**: each layer below works on its own, and each next row enhances editing without breaking what came before. You can ship at any row, mix rows on the same site, and add the next layer when you're ready.

<block type="slateTable" uid="tbl-40" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-40-r0","cells":[{"key":"tbl-40-r0c0","type":"header","value":[{"type":"p","children":[{"text":"Step"}]}]},{"key":"tbl-40-r0c1","type":"header","value":[{"type":"p","children":[{"text":"What you wire up"}]}]},{"key":"tbl-40-r0c2","type":"header","value":[{"type":"p","children":[{"text":"What editors get"}]}]}]},{"key":"tbl-40-r1","cells":[{"key":"tbl-40-r1c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Plain headless"}]}]}]},{"key":"tbl-40-r1c1","type":"data","value":[{"type":"p","children":[{"text":"Frontend fetches the Plone REST API. No "},{"type":"code","children":[{"text":"hydra.js"}]},{"text":" involved."}]}]},{"key":"tbl-40-r1c2","type":"data","value":[{"type":"p","children":[{"text":"Sidebar editing in Volto, frontend reloads on save. Editors flip between the Volto edit tab and a frontend tab to see results — works fine, but loses inline editing and realtime preview."}]}]}]},{"key":"tbl-40-r2","cells":[{"key":"tbl-40-r2c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Bridge installed"}]}]}]},{"key":"tbl-40-r2c1","type":"data","value":[{"type":"p","children":[{"text":"Load "},{"type":"code","children":[{"text":"hydra.js"}]},{"text":", call "},{"type":"code","children":[{"text":"initBridge({ page: { schema: { properties: { ... } } } })"}]},{"text":". See "},{"type":"link","data":{"url":"live-preview.md#setting-up-the-bridge"},"children":[{"text":"Live Preview › Setting Up the Bridge"}]},{"text":"."}]}]},{"key":"tbl-40-r2c2","type":"data","value":[{"type":"p","children":[{"text":"Frontend follows admin navigation (and vice versa). Frontend renders private content via shared auth ("},{"type":"link","data":{"url":"advanced.md#authentication"},"children":[{"text":"Authentication"}]},{"text":"). Page metadata (title, description, etc.) editable from the admin."}]}]}]},{"key":"tbl-40-r3","cells":[{"key":"tbl-40-r3c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Custom block types"}]}]}]},{"key":"tbl-40-r3c1","type":"data","value":[{"type":"p","children":[{"text":"Add a "},{"type":"code","children":[{"text":"blocks: { ... }"}]},{"text":" config to "},{"type":"code","children":[{"text":"initBridge"}]},{"text":". See "},{"type":"link","data":{"url":"custom-blocks.md#initbridge-reference"},"children":[{"text":"Custom Blocks › "},{"type":"code","children":[{"text":"initBridge()"}]},{"text":" Reference"}]},{"text":"."}]}]},{"key":"tbl-40-r3c2","type":"data","value":[{"type":"p","children":[{"text":"Editors can add, configure, and convert your custom block types — schema renders in the sidebar without touching Volto. Cross-block conversion ("},{"type":"link","data":{"url":"custom-blocks.md#block-conversion--fieldmappings"},"children":[{"text":"fieldMappings"}]},{"text":") becomes possible."}]}]}]},{"key":"tbl-40-r4","cells":[{"key":"tbl-40-r4c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Block selection in preview"}]}]}]},{"key":"tbl-40-r4c1","type":"data","value":[{"type":"p","children":[{"text":"Add "},{"type":"code","children":[{"text":"data-block-uid"}]},{"text":" to your rendered blocks. See "},{"type":"link","data":{"url":"visual-editing.md#html-annotations-for-visual-editing"},"children":[{"text":"Visual Editing › HTML Annotations"}]},{"text":"."}]}]},{"key":"tbl-40-r4c2","type":"data","value":[{"type":"p","children":[{"text":"Click-to-select on the preview. Quanta Toolbar above selected blocks. Sidebar↔preview selection scrolls into view. Multi-select with Shift/Ctrl-click."}]}]}]},{"key":"tbl-40-r5","cells":[{"key":"tbl-40-r5c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Realtime preview"}]}]}]},{"key":"tbl-40-r5c1","type":"data","value":[{"type":"p","children":[{"text":"Register "},{"type":"code","children":[{"text":"onEditChange"}]},{"text":" and render from the "},{"type":"code","children":[{"text":"formData"}]},{"text":" it gives you instead of from the API."}]}]},{"key":"tbl-40-r5c2","type":"data","value":[{"type":"p","children":[{"text":"Preview updates as the editor types. Drag-and-drop, slash menu, container ops (wrap, unwrap, edge-drag, convert) all unlock — see the "},{"type":"link","data":{"url":"what-editors-will-experience/index.md"},"children":[{"text":"Editor Guide"}]},{"text":"."}]}]}]},{"key":"tbl-40-r6","cells":[{"key":"tbl-40-r6c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Direct field editing"}]}]}]},{"key":"tbl-40-r6c1","type":"data","value":[{"type":"p","children":[{"text":"Add "},{"type":"code","children":[{"text":"data-edit-text"}]},{"text":", "},{"type":"code","children":[{"text":"data-edit-link"}]},{"text":", "},{"type":"code","children":[{"text":"data-edit-media"}]},{"text":" to specific elements."}]}]},{"key":"tbl-40-r6c2","type":"data","value":[{"type":"p","children":[{"text":"Click rendered text and start typing. Click an image to pick or upload. Click a link to open the link picker. Markdown shortcuts ("},{"type":"code","children":[{"text":"##"}]},{"text":", "},{"type":"code","children":[{"text":"**bold**"}]},{"text":", etc.)."}]}]}]},{"key":"tbl-40-r7","cells":[{"key":"tbl-40-r7c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Templates and layouts"}]}]}]},{"key":"tbl-40-r7c1","type":"data","value":[{"type":"p","children":[{"text":"Configure "},{"type":"code","children":[{"text":"allowedTemplates"}]},{"text":" / "},{"type":"code","children":[{"text":"allowedLayouts"}]},{"text":" on a region; use "},{"type":"code","children":[{"text":"expandTemplates"}]},{"text":" at render time. See "},{"type":"link","data":{"url":"templates.md"},"children":[{"text":"Templates"}]},{"text":"."}]}]},{"key":"tbl-40-r7c2","type":"data","value":[{"type":"p","children":[{"text":"Editors pick layouts from a dropdown, insert template snippets via the BlockChooser, recognise locked vs editable vs slot blocks."}]}]}]},{"key":"tbl-40-r8","cells":[{"key":"tbl-40-r8c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Listings and dynamic content"}]}]}]},{"key":"tbl-40-r8c1","type":"data","value":[{"type":"p","children":[{"text":"Configure listing block types and pass "},{"type":"code","children":[{"text":"fetchItems"}]},{"text":" to "},{"type":"code","children":[{"text":"expandListingBlocks"}]},{"text":". See "},{"type":"link","data":{"url":"listings.md"},"children":[{"text":"Listings"}]},{"text":"."}]}]},{"key":"tbl-40-r8c2","type":"data","value":[{"type":"p","children":[{"text":"A "},{"type":"code","children":[{"text":"fieldMapping"}]},{"text":" widget on listing blocks maps query results to item fields. Listings render as repeated blocks, editable per item."}]}]}]},{"key":"tbl-40-r9","cells":[{"key":"tbl-40-r9c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"Custom UI / advanced"}]}]}]},{"key":"tbl-40-r9c1","type":"data","value":[{"type":"p","children":[{"text":"Override Volto components, or drive frontend-side editing via "},{"type":"code","children":[{"text":"sendBlockUpdate"}]},{"text":" / "},{"type":"code","children":[{"text":"sendBlockAction"}]},{"text":". See "},{"type":"link","data":{"url":"advanced.md#custom-sidebar-and-cms-ui"},"children":[{"text":"Advanced"}]},{"text":"."}]}]},{"key":"tbl-40-r9c2","type":"data","value":[{"type":"p","children":[{"text":"Bespoke widgets, custom block edit forms, in-frontend interactions for blocks Inka&#39;s defaults don&#39;t fit."}]}]}]}]}}' />

Different parts of the same site can sit at different rows — inline-editable headlines on a marketing page, sidebar-only editing on a complex catalog page.
