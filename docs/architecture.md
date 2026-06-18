# How Hydra Works

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing a two way communication channel is opened across an iframe so that the editing UI is no longer part of the frontend code. Instead a small JS file called hydra.js is included in your frontend during editing that handles the iframe bridge communication to Hydra which is running in the same browser window.

---

## Architecture Overview

You could think of it as splitting Volto into two parts, Rendering and CMS UI/Admin UI while keeping the same UI and then making the Rendering part easily replaceable with other implementations.

<!-- codeExample: bash label="Architecture" -->
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
          │   │    Hydra     │◄─────────────────────────┘
          │   └──────────────┘

              ┌──────────────┐                       ┌─────────────┐
 Anon         │   Frontend   │◄──────────────────────┤    Plone    │
              └──────────────┘                       └─────────────┘
```

## The iframe ↔ admin bridge

During editing the frontend is loaded inside an iframe owned by Hydra's admin UI. The two communicate via `postMessage` over the iframe boundary:

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

## URL flattening and `publicURL`

Volto's stock URL helpers (`flattenToAppURL`, `isInternalURL`, `toPublicURL`) assume there's one "public URL" — usually the same origin the admin runs on, configured via `RAZZLE_PUBLIC_URL`. In Hydra the admin and the published frontend(s) live on different origins, and the editor switches between published frontends at will, so there is no single public URL.

**Do not set `RAZZLE_PUBLIC_URL`** in a Hydra deployment. Pinning `settings.publicURL` to one value would break flattening for every other frontend — pastes from them would be misrecognised as external and saved verbatim instead of as `/path` references.

Hydra makes `settings.publicURL` follow the currently active iframe frontend:

- **Boot** — `applyConfig` reads the `iframe_url_<port>` cookie (set by `View.jsx` on previous visits), looks up the matching saved-frontends entry, and writes `settings.publicURL = entry.publishUrl || entry.url`. A returning editor sees the right value before they open the switcher.
- **Switch** — when the editor picks a different frontend in the toolbar switcher (`FrontendSwitcherPanel`), it dispatches `setFrontendPreviewUrl(url)`. Hydra's `publicUrlSync` Redux middleware intercepts the action and updates `settings.publicURL` before the next render.
- **Other frontends** — `flattenToAppURL` and `isInternalURL` are shadowed to strip `publicURL` (the active frontend) **plus** every other saved frontend's edit / publish URL, so a paste from a frontend you're not currently viewing still flattens cleanly.

Saved frontends come from two sources, merged: the `RAZZLE_DEFAULT_IFRAME_URL` env (baseline list shipped with the deployment, format `Name|EditURL[|PublishURL],…`) and the `saved_urls_<port>` cookie (per-editor additions made via the toolbar Settings modal). The optional third slot in each entry is for setups where the published site lives at a different origin than the edit-mode frontend (e.g. `edit.example.com` for previews, `www.example.com` for production).

What we deliberately did NOT shadow: `UniversalLink`'s fallback `href` when an item is empty, Volto's admin-side `Robots.txt` / `Sitemap.xml` generators, `ContentMetadataTags` / `AlternateHrefLangs` in the admin's `<head>`, and the `RegistryImageWidget` site-logo URL. All of these inherit the dynamic `publicURL` transparently, and in a Hydra deployment the authoritative `robots.txt` / `sitemap.xml` / SEO tags are served by the frontends, not the admin.

## Building a frontend

The steps for creating a Hydra-compatible frontend are the same across frameworks: catch-all route → fetch page from Plone REST API → render blocks recursively → add `data-block-uid` and `data-edit-*` attributes on editable elements → load `hydra.js` only inside the admin iframe.

See [Build a frontend](build-a-frontend.md) for the full step-by-step guide, or the example frontends: [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter), [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs), [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7).

## Layers of adoption

Hydra is **additive**: each layer below works on its own, and each next row enhances editing without breaking what came before. You can ship at any row, mix rows on the same site, and add the next layer when you're ready.

| Step | What you wire up | What editors get |
| ---- | ---------------- | ---------------- |
| **Plain headless** | Frontend fetches the Plone REST API. No `hydra.js` involved. | Sidebar editing in Volto, frontend reloads on save. Editors flip between the Volto edit tab and a frontend tab to see results — works fine, but loses inline editing and realtime preview. |
| **Bridge installed** | Load `hydra.js`, call `initBridge({ page: { schema: { properties: { ... } } } })`. See [Live Preview › Setting Up the Bridge](live-preview.md#setting-up-the-bridge). | Frontend follows admin navigation (and vice versa). Frontend renders private content via shared auth ([Authentication](advanced.md#authentication)). Page metadata (title, description, etc.) editable from the admin. |
| **Custom block types** | Add a `blocks: { ... }` config to `initBridge`. See [Custom Blocks › `initBridge()` Reference](custom-blocks.md#initbridge-reference). | Editors can add, configure, and convert your custom block types — schema renders in the sidebar without touching Volto. Cross-block conversion ([fieldMappings](custom-blocks.md#block-conversion--fieldmappings)) becomes possible. |
| **Block selection in preview** | Add `data-block-uid` to your rendered blocks. See [Visual Editing › HTML Annotations](visual-editing.md#html-annotations-for-visual-editing). | Click-to-select on the preview. Quanta Toolbar above selected blocks. Sidebar↔preview selection scrolls into view. Multi-select with Shift/Ctrl-click. |
| **Realtime preview** | Register `onEditChange` and render from the `formData` it gives you instead of from the API. | Preview updates as the editor types. Drag-and-drop, slash menu, container ops (wrap, unwrap, edge-drag, convert) all unlock — see the [Editor Guide](what-editors-will-experience/index.md). |
| **Direct field editing** | Add `data-edit-text`, `data-edit-link`, `data-edit-media` to specific elements. | Click rendered text and start typing. Click an image to pick or upload. Click a link to open the link picker. Markdown shortcuts (`##`, `**bold**`, etc.). |
| **Templates and layouts** | Configure `allowedTemplates` / `allowedLayouts` on a region; use `expandTemplates` at render time. See [Templates](templates.md). | Editors pick layouts from a dropdown, insert template snippets via the BlockChooser, recognise locked vs editable vs slot blocks. |
| **Listings and dynamic content** | Configure listing block types and pass `fetchItems` to `expandListingBlocks`. See [Listings](listings.md). | A `fieldMapping` widget on listing blocks maps query results to item fields. Listings render as repeated blocks, editable per item. |
| **Custom UI / advanced** | Override Volto components, or drive frontend-side editing via `sendBlockUpdate` / `sendBlockAction`. See [Advanced](advanced.md#custom-sidebar-and-cms-ui). | Bespoke widgets, custom block edit forms, in-frontend interactions for blocks Hydra's defaults don't fit. |

Different parts of the same site can sit at different rows — inline-editable headlines on a marketing page, sidebar-only editing on a complex catalog page.
