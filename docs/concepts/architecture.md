# How Hydra Works

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing a two way communication channel is opened across an iframe so that the editing UI is no longer part of the frontend code. Instead a small JS file called hydra.js is included in your frontend during editing that handles the iframe bridge communication to Hydra which is running in the same browser window.

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

The benefit: a frontend's CSS can never break the editing UI, because the editing UI doesn't live in the frontend. Switching frontends mid-edit (Nuxt → Next → Astro) works because the bridge protocol is the same — only the rendered DOM changes.

## Slate (rich text) transforms

When the editor types in a slate field, the frontend doesn't compute the new slate value itself — the admin does, by running the slate transform against the previous slate value. The frontend's job is to:

1. Receive the new slate value via `SLATE_TRANSFORM_RESULT` and re-render.
2. Send slate node `data-node-id` attributes back so the admin can place the cursor at the right node after re-render.

This is why every slate node needs a `data-node-id` attribute on its rendered HTML — without one, the admin can't track the cursor across re-renders. See [Visual Editing › Renderer Node-ID Rules](visual-editing.md#renderer-node-id-rules).

## Building a frontend

The steps for creating a Hydra-compatible frontend are the same across frameworks: catch-all route → fetch page from Plone REST API → render blocks recursively → add `data-block-uid` and `data-edit-*` attributes on editable elements → load `hydra.js` only inside the admin iframe.

See [Building a Frontend for Headless Plone](../frontend-guide/index.md) for the full step-by-step guide, or the example frontends: [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter), [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs), [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7).
