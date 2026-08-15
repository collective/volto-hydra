---
"@type": Document
UID: docs-build-a-frontend-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "The actual code you write will depend on the framework you choose.
  You can look at these examples to help you:"
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: build-a-frontend
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - frontend
title: Build a frontend
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: ul-2, type: slate }
  - { uid: h-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: p-5, type: slate }
  - { uid: ul-6, type: slate }
  - { uid: p-7, type: slate }
  - { uid: ce-8, type: codeExample }
  - { id: ce-8-js-bf605e }
  - { uid: p-9, type: slate }
  - { uid: ce-10, type: codeExample }
  - { id: ce-10-js-2e9648 }
  - { uid: p-11, type: slate }
  - { uid: ce-12, type: codeExample }
  - { id: ce-12-html-e0187e }
  - { uid: h-13, type: slate }
  - { uid: p-14, type: slate }
  - { uid: ul-15, type: slate }
  - { uid: ce-16, type: codeExample }
  - { id: ce-16-html-5cddab }
  - { uid: p-17, type: slate }
  - { uid: p-18, type: slate }
  - { uid: p-19, type: slate }
  - { uid: h-20, type: slate }
  - { uid: p-21, type: slate }
  - { uid: bq-22, type: slate }
  - { uid: p-23, type: slate }
  - { uid: h-24, type: slate }
  - { uid: p-25, type: slate }
  - { uid: h-26, type: slate }
  - { uid: p-27, type: slate }
  - { uid: p-28, type: slate }
  - { uid: h-29, type: slate }
  - { uid: p-30, type: slate }
  - { uid: h-31, type: slate }
  - { uid: p-32, type: slate }
  - { uid: ul-33, type: slate }
  - { uid: h-34, type: slate }
  - { uid: p-35, type: slate }
  - { uid: h-36, type: slate }
  - { uid: ol-37, type: slate }
  - { uid: h-38, type: slate }
  - { uid: ol-39, type: slate }
  - { uid: p-40, type: slate }
  - { uid: h-41, type: slate }
  - { uid: p-42, type: slate }
  - { uid: ol-43, type: slate }
  - { uid: h-44, type: slate }
  - { uid: ul-45, type: slate }
  - { uid: h-46, type: slate }
  - { uid: ol-47, type: slate }
  - { uid: h-48, type: slate }
  - { uid: p-49, type: slate }
  - { uid: h-50, type: slate }
  - { uid: p-51, type: slate }
  - { uid: ul-52, type: slate }
  - { uid: h-53, type: slate }
  - { uid: p-54, type: slate }
  - { uid: ul-55, type: slate }
  - { uid: h-56, type: slate }
  - { uid: p-57, type: slate }
  - { uid: h-58, type: slate }
  - { uid: p-59, type: slate }
  - { uid: ol-60, type: slate }
  - { uid: p-61, type: slate }
  - { uid: h-62, type: slate }
  - { uid: p-63, type: slate }
  - { uid: ol-64, type: slate }
  - { uid: h-65, type: slate }
  - { uid: p-66, type: slate }
  - { uid: ul-67, type: slate }
  - { uid: p-68, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

<block type="slate">

The actual code you write will depend on the framework you choose. You can look at these examples to help you:

</block>

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

## What an integrated frontend looks like

<block type="slate">

Before you dive into the steps, here's what your frontend ends up doing.

</block>

<block type="slate">

To make a site editable with Inka you break a page into:

</block>

<block type="slate" data='{"value":[{"type":"ul","children":[{"type":"li","children":[{"type":"strong","children":[{"text":"Blocks fields"}]},{"text":" — one or more named, ordered lists of blocks. Each is a schema property with "},{"type":"code","children":[{"text":"widget: &#39;blocks_layout&#39;"}]},{"text":"; the field name is a key inside the page&#39;s "},{"type":"code","children":[{"text":"blocks_layout"}]},{"text":" dict (the default field is "},{"type":"code","children":[{"text":"items"}]},{"text":", plus e.g. "},{"type":"code","children":[{"text":"header"}]},{"text":", "},{"type":"code","children":[{"text":"footer"}]},{"text":"). Every field&#39;s blocks live in the page&#39;s single shared "},{"type":"code","children":[{"text":"blocks"}]},{"text":" dict; the field only records ordering."}]},{"type":"li","children":[{"type":"strong","children":[{"text":"Blocks"}]},{"text":" — discrete visual elements with a schema and settings that can be moved and edited."},{"type":"ul","children":[{"type":"li","children":[{"text":"Type, title, icon etc. so the user can pick from a menu."}]},{"type":"li","children":[{"text":"Fields: string, image, link etc. each with their own sidebar widget."},{"type":"ul","children":[{"type":"li","children":[{"type":"code","children":[{"text":"slate"}]},{"text":" is a special field that contains JSON for a paragraph, heading etc."}]},{"type":"li","children":[{"type":"code","children":[{"text":"blocks"}]},{"text":" fields let a block hold other blocks."}]}]}]}]}]}]}]}' />

<block type="slate">

When the page loads inside Inka's edit iframe, you initialise the bridge and declare your blocks; otherwise you render normally from the API:

</block>

<block type="codeExample">

### Js

```js
let bridge;

if (window.name.startsWith('hydra')) {
    bridge = initBridge({
      page: {
        schema: {
          // Each blocks field (widget: 'blocks_layout') is a named list of
          // blocks. The field name is the key inside the `blocks_layout` dict;
          // the default field is `items`. Each has its own allowedBlocks.
          properties: {
            items:  { widget: 'blocks_layout', allowedBlocks: ['slate', 'grid', 'myimage'] },
            header: { widget: 'blocks_layout', allowedBlocks: ['slate', 'image'], maxLength: 3 },
            footer: { widget: 'blocks_layout', allowedBlocks: ['slate', 'link'] },
          },
        },
      },
      blocks: {
        // we can add custom blocks (or alter builtin ones)
        myimage: {
          blockSchema: {
            properties: {
              image: { widget: 'image' },
              url: { widget: 'url' },
              caption: { type: 'string' },
            }
          }
        }
      },
      onEditChange: (formData) => renderPage(formData),
    });
}
else {
    // When not editing, render from the server api
    renderPage(await fetchContent(path));
}
```

</block>

<block type="slate">

Page data ends up shaped like this — one shared `blocks` dict, and a region per named list inside `blocks_layout`:

</block>

<block type="codeExample">

### Js

```js
{
  ...
  blocks: {
    'text-1': { '@type': 'slate', ... },
    'header-1': { '@type': 'image', ... },
    'footer-1': { '@type': 'slate', ... }
  },
  blocks_layout: {
    items: ['text-1'],     // main content region (the default)
    header: ['header-1'],  // header region
    footer: ['footer-1']   // footer region
  }
}
```

</block>

<block type="slate">

Then you augment the rendered HTML with `data-` attributes (or `<!-- hydra ... -->` comments) so Inka can find your blocks and editable fields:

</block>

<block type="codeExample">

### Html

```html
<!-- hydra edit-text=title -->
<div>Page Title</div>

<div id=content>
  <!-- hydra block-uid="1234" edit-text=title(p) edit-media=image(img) edit-link=url -->
  <a href="http://go.to">
    <img src="http://my.img"/>
    <p>A caption</p>
  </a>
</div>
```

</block>

### Deep-link anchors (fragments)

<block type="slate">

To let editors link to a spot *inside* a page, mark the element with a real `id` (the `#fragment` the browser scrolls to) **and** a linkable-anchor attribute carrying the label shown in the link picker. The attribute you pick also records the anchor's **level**, so the picker (and consumers like an in-page navigation block) can show a hierarchy:

</block>

- `data-linkable-h1` … `data-linkable-h6="Label"` — a heading anchor **at that level**. Use these on your headings; the suffix is the level.
- `data-linkable-id="Label"` — a **level-less** anchor (a figure, a defined term, any non-heading target).

<block type="codeExample">

### Html

```html
<h2 id="pricing" data-linkable-h2="Pricing">Pricing</h2>
<h3 id="enterprise" data-linkable-h3="Enterprise plan">Enterprise plan</h3>
<figure id="fig-1" data-linkable-id="Figure 1">…</figure>
```

</block>

<block type="slate">

Inka harvests these per block on render as `{ id, name, level }` and stores them in the block's data, so the object browser offers them as `path#pricing` link targets — as a nested list reflecting the page's structure. Both attributes must survive into your **published** render for the anchor to resolve at runtime — Inka only reads them in edit mode.

</block>

<block type="slate">

**Level is optional / automatic.** If you use plain `data-linkable-id` on an element that is *itself* an `h1`–`h6`, Inka infers the level from the tag — so tagging every heading with `data-linkable-id` still yields a hierarchy for free. Precedence is: explicit `data-linkable-h{n}` > the element's heading tag > none (a level-less leaf). Given the flat, document-ordered anchor list, `buildAnchorTree` (in `@volto-hydra/hydra-js`) turns the levels into a nested contents tree; no levels means a flat list.

</block>

<block type="slate">

It's your choice which elements are linkable — a common pattern is to tag every heading, deriving its `id` from a slug of the heading text. If you want a heading to be linkable *while it's being edited* (before save), keep its `id`/`data-linkable-id` current as the text changes — e.g. a small `input` listener that re-slugifies the heading. Inka harvests anchors both on render **and** when inline edits flush, merging them into the edit form's `block._linkableAnchors` so a freshly-typed heading becomes linkable on the page being edited without saving first; other pages use their last saved anchors.

</block>

#### Building an in-page navigation

<block type="slate">

To build something *from* the anchors — an in-page navigation ("On this page") block — **derive the list from the page content you already render**, the same way you stamp the heading `id`s. That works identically published (no bridge, JS off) and while editing: structural edits (adding, removing, reordering heading blocks) re-render your frontend with fresh content, so the nav follows them. There is no bridge callback for this — the anchors ride in the ordinary edit-form data (`block._linkableAnchors`), which is what the object browser's link picker reads; a nav rebuilds itself from content on the next render.

</block>

<block type="slate" data='{"value":[{"type":"blockquote","children":[{"text":"One consequence: text typed into an "},{"type":"em","children":[{"text":"existing"}]},{"text":" heading updates the nav on the next render (when you blur the block), not on every keystroke — inline text edits don&#39;t re-render the frontend until they&#39;re flushed. Adding or removing headings updates it immediately."}]}]}' />

<block type="slate">

If your anchors carry levels, pair the derived list with `buildAnchorTree(anchors)` (from `@volto-hydra/hydra-js`) to render a nested contents list; no levels means a flat list.

</block>

## The steps

<block type="slate">

The steps involved in creating a frontend are roughly the same for all these frameworks:

</block>

## 1. Create a Catch-All Route

<block type="slate">

Create a route for any path which goes to a single page.

</block>

<block type="slate">

For example, in Nuxt.js you create a file `pages/[..slug].vue`.

</block>

## 2. Build the Page Template

<block type="slate">

The page has a template with the static parts of your theme like header and footer. You might also check the content type to render each differently.

</block>

## 3. Fetch Content from Plone REST API

<block type="slate">

On page setup, take the path and make a [REST API call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the JSON for this page.

</block>

<block type="slate" data='{"value":[{"type":"ul","children":[{"type":"li","children":[{"text":"You can use "},{"type":"code","children":[{"text":"@plone/client"}]},{"text":" for this"}]},{"type":"li","children":[{"text":"In some frameworks (such as Nuxt.js) it&#39;s better to use their built-in fetch"}]},{"type":"li","children":[{"text":"You can also use the "},{"type":"link","data":{"url":"https://2022.training.plone.org/gatsby/data.html"},"children":[{"text":"Plone GraphQL API"}]},{"type":"ul","children":[{"type":"li","children":[{"text":"Note: this is just a wrapper on the REST API rather than a server-side implementation, so it&#39;s not more efficient than using the REST API directly"}]}]}]}]}]}' />

## 4. Render Page Metadata

<block type="slate">

In your page template, fill title etc. from the content metadata.

</block>

## 5. Navigation

1. Adjust the contents API call to use [`@expand`](https://6.docs.plone.org/volto/configuration/expanders.html) and return [navigation data](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) in the same call
2. Create a component for your top-level nav that uses this nav JSON to create a menu

## 6. Blocks

1. Create a `Block` component that takes the id and block JSON as arguments
2. Use if statements to check the block type and determine how to render that block
3. If the block is a container, call the `Block` component recursively
4. In your page, iterate down the `blocks_layout` list and render a `Block` component for each
5. Rendering Slate — split into a separate component as it's used in many blocks and is also recursive

<block type="slate">

Give `Block` an `@type: "empty"` case: a container region with no `defaultBlockType` and more than one `allowedBlocks` seeds an `empty` placeholder for the user to type in place, and any custom container renderer must route its children through `Block` so `empty` is handled rather than rejected. See [Empty Blocks](container-blocks.md#empty-blocks).

</block>

## 7. Helper Functions

<block type="slate">

Several helper functions get reused in many blocks:

</block>

<block type="slate" data='{"value":[{"type":"ol","children":[{"type":"li","children":[{"type":"strong","children":[{"text":"Generating a URL for links"}]},{"text":" — all REST API URLs are relative to the API URL, so you need to convert these to the right frontend URL"}]},{"type":"li","children":[{"type":"strong","children":[{"text":"Generating a URL for an image"}]},{"text":" — blocks have image data in many formats so a helper function is useful"},{"type":"ul","children":[{"type":"li","children":[{"text":"You may also decide to use your framework or hosting solution for image resizing"}]}]}]}]}]}' />

## 8. Listing Blocks

- Use the [Listing Helpers](listings.md) or make your own [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)
- Create your own pagination scheme (e.g., embed page in URL for static generation)
- Render the items and pagination

## 9. Redirects

1. If your contents call results in a redirect, you will need to do an internal redirect in the framework so the path shown is correct
2. If you are using SSG, you will need special code to [query all the redirects](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/aliases.html#listing-all-available-aliases-via-json) at generate time and add redirect routes

## 10. Error Pages

<block type="slate">

If your [REST API call returns an error](https://6.docs.plone.org/plone.restapi/docs/source/http-status-codes.html), handle this within the framework to display the error and set the status code.

</block>

## 11. Search Blocks

<block type="slate">

If you choose to allow Volto's built-in Search Block for end-user customisable search:

</block>

- Render Facets/Filters (currently not as sub-blocks but this could change)
- Build your query and make a [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)

## 12. Form Blocks

<block type="slate">

Form-block is a plugin that allows a visual form builder:

</block>

- Currently not a container with sub-blocks but this could change
- Render each field type component (or limit which are available)
- Produce a compatible JSON submission to the form-block endpoint
- Handle field validation errors
- Handle the thank-you page

## Deployment patterns

<block type="slate">

Inka separates your production frontend from the editing experience, which gives you choice in how each is deployed.

</block>

### SPA / Hybrid — full visual editing

<block type="slate">

The simplest setup — your frontend handles both production and editing:

</block>

1. Deploy your frontend as SPA or Hybrid (SSR + client-side hydration).
2. Deploy Inka and the Plone API server.
3. Log in to Inka, go to user preferences, set your frontend URL.

<block type="slate">

This gives you all visual editing features including inline text editing, drag and drop, and realtime preview.

</block>

### SSG / SSR — production speed + visual editing

<block type="slate">

Get the speed of static generation while keeping visual editing. Deploy two versions of the same frontend:

</block>

1. **Production** — deploy your frontend in SSG or SSR mode (fast, cacheable).
2. **Editing** — deploy the same frontend in SPA mode to a separate URL (used only inside Inka).
3. **Inka + Plone** — only needs to run during editing, so scale-to-zero / serverless works.
4. **SSG rebuild** — for SSG, configure [collective.webhook](https://github.com/collective/collective.webhook) to trigger a rebuild on edit. SSR doesn't need this.

### Example: the Nuxt.js demo

<block type="slate">

The default Inka demo uses exactly the SSG / SSR pattern above:

</block>

- **Production** — [SSG on Netlify](https://hydra-nuxt-flowbrite.netlify.app/). All pages statically generated, images optimized, fast globally.
- **Editing** — same Nuxt codebase deployed as SPA to a different Netlify URL. Only loaded inside Inka's iframe.
- **Inka + Plone** — deployed to [fly.io](https://hydra.pretagov.com) with scale-to-zero. Cost is free or minimal since it only runs during editing.

<block type="slate">

For most frameworks, switching between SSG / SSR and SPA is just a config toggle, so you get the best of both worlds with minimal effort.

</block>
