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
blocks:
  - title-1: title
  - p-1: slate
  - ul-2: slate
  - h-3: slate
  - p-4: slate
  - p-5: slate
  - ul-6: slate
  - p-7: slate
  - ce-8: codeExample
  - p-9: slate
  - ce-10: codeExample
  - p-11: slate
  - ce-12: codeExample
  - h-13: slate
  - p-14: slate
  - ul-15: slate
  - ce-16: codeExample
  - p-17: slate
  - p-18: slate
  - p-19: slate
  - h-20: slate
  - p-21: slate
  - bq-22: slate
  - p-23: slate
  - h-24: slate
  - p-25: slate
  - h-26: slate
  - p-27: slate
  - p-28: slate
  - h-29: slate
  - p-30: slate
  - h-31: slate
  - p-32: slate
  - ul-33: slate
  - h-34: slate
  - p-35: slate
  - h-36: slate
  - ol-37: slate
  - h-38: slate
  - ol-39: slate
  - p-40: slate
  - h-41: slate
  - p-42: slate
  - ol-43: slate
  - h-44: slate
  - ul-45: slate
  - h-46: slate
  - ol-47: slate
  - h-48: slate
  - p-49: slate
  - h-50: slate
  - p-51: slate
  - ul-52: slate
  - h-53: slate
  - p-54: slate
  - ul-55: slate
  - h-56: slate
  - p-57: slate
  - h-58: slate
  - p-59: slate
  - ol-60: slate
  - p-61: slate
  - h-62: slate
  - p-63: slate
  - ol-64: slate
  - h-65: slate
  - p-66: slate
  - ul-67: slate
  - p-68: slate
---

<block type="title" uid="title-1" />

The actual code you write will depend on the framework you choose. You can look at these examples to help you:

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

## What an integrated frontend looks like

Before you dive into the steps, here's what your frontend ends up doing.

To make a site editable with Inka you break a page into:

<block type="slate" uid="ul-6">

```field-json:value
[
 {
  "type": "ul",
  "children": [
   {
    "type": "li",
    "children": [
     {
      "type": "strong",
      "children": [
       {
        "text": "Blocks fields"
       }
      ]
     },
     {
      "text": " — one or more named, ordered lists of blocks. Each is a schema property with "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "widget: 'blocks_layout'"
       }
      ]
     },
     {
      "text": "; the field name is a key inside the page's "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "blocks_layout"
       }
      ]
     },
     {
      "text": " dict (the default field is "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "items"
       }
      ]
     },
     {
      "text": ", plus e.g. "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "header"
       }
      ]
     },
     {
      "text": ", "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "footer"
       }
      ]
     },
     {
      "text": "). Every field's blocks live in the page's single shared "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "blocks"
       }
      ]
     },
     {
      "text": " dict; the field only records ordering."
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "type": "strong",
      "children": [
       {
        "text": "Blocks"
       }
      ]
     },
     {
      "text": " — discrete visual elements with a schema and settings that can be moved and edited."
     },
     {
      "type": "ul",
      "children": [
       {
        "type": "li",
        "children": [
         {
          "text": "Type, title, icon etc. so the user can pick from a menu."
         }
        ]
       },
       {
        "type": "li",
        "children": [
         {
          "text": "Fields: string, image, link etc. each with their own sidebar widget."
         },
         {
          "type": "ul",
          "children": [
           {
            "type": "li",
            "children": [
             {
              "type": "code",
              "children": [
               {
                "text": "slate"
               }
              ]
             },
             {
              "text": " is a special field that contains JSON for a paragraph, heading etc."
             }
            ]
           },
           {
            "type": "li",
            "children": [
             {
              "type": "code",
              "children": [
               {
                "text": "blocks"
               }
              ]
             },
             {
              "text": " fields let a block hold other blocks."
             }
            ]
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
]
```

</block>

When the page loads inside Inka's edit iframe, you initialise the bridge and declare your blocks; otherwise you render normally from the API:

<block type="codeExample" uid="ce-8">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ce-8-js-bf605e"]}'>

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

</region>

</block>

Page data ends up shaped like this — one shared `blocks` dict, and a region per named list inside `blocks_layout`:

<block type="codeExample" uid="ce-10">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ce-10-js-2e9648"]}'>

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

</region>

</block>

Then you augment the rendered HTML with `data-` attributes (or `<!-- hydra ... -->` comments) so Inka can find your blocks and editable fields:

<block type="codeExample" uid="ce-12">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ce-12-html-e0187e"]}'>

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

</region>

</block>

### Deep-link anchors (fragments)

To let editors link to a spot *inside* a page, mark the element with a real `id` (the `#fragment` the browser scrolls to) **and** a linkable-anchor attribute carrying the label shown in the link picker. The attribute you pick also records the anchor's **level**, so the picker (and consumers like an in-page navigation block) can show a hierarchy:

- `data-linkable-h1` … `data-linkable-h6="Label"` — a heading anchor **at that level**. Use these on your headings; the suffix is the level.
- `data-linkable-id="Label"` — a **level-less** anchor (a figure, a defined term, any non-heading target).

<block type="codeExample" uid="ce-16">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ce-16-html-5cddab"]}'>

### Html

```html
<h2 id="pricing" data-linkable-h2="Pricing">Pricing</h2>
<h3 id="enterprise" data-linkable-h3="Enterprise plan">Enterprise plan</h3>
<figure id="fig-1" data-linkable-id="Figure 1">…</figure>
```

</region>

</block>

Inka harvests these per block on render as `{ id, name, level }` and stores them in the block's data, so the object browser offers them as `path#pricing` link targets — as a nested list reflecting the page's structure. Both attributes must survive into your **published** render for the anchor to resolve at runtime — Inka only reads them in edit mode.

**Level is optional / automatic.** If you use plain `data-linkable-id` on an element that is *itself* an `h1`–`h6`, Inka infers the level from the tag — so tagging every heading with `data-linkable-id` still yields a hierarchy for free. Precedence is: explicit `data-linkable-h{n}` > the element's heading tag > none (a level-less leaf). Given the flat, document-ordered anchor list, `buildAnchorTree` (in `@volto-hydra/hydra-js`) turns the levels into a nested contents tree; no levels means a flat list.

It's your choice which elements are linkable — a common pattern is to tag every heading, deriving its `id` from a slug of the heading text. If you want a heading to be linkable *while it's being edited* (before save), keep its `id`/`data-linkable-id` current as the text changes — e.g. a small `input` listener that re-slugifies the heading. Inka harvests anchors both on render **and** when inline edits flush, merging them into the edit form's `block._linkableAnchors` so a freshly-typed heading becomes linkable on the page being edited without saving first; other pages use their last saved anchors.

#### Building an in-page navigation

To build something *from* the anchors — an in-page navigation ("On this page") block — **derive the list from the page content you already render**, the same way you stamp the heading `id`s. That works identically published (no bridge, JS off) and while editing: structural edits (adding, removing, reordering heading blocks) re-render your frontend with fresh content, so the nav follows them. There is no bridge callback for this — the anchors ride in the ordinary edit-form data (`block._linkableAnchors`), which is what the object browser's link picker reads; a nav rebuilds itself from content on the next render.

<block type="slate" uid="bq-22">

```field-json:value
[
 {
  "type": "blockquote",
  "children": [
   {
    "text": "One consequence: text typed into an "
   },
   {
    "type": "em",
    "children": [
     {
      "text": "existing"
     }
    ]
   },
   {
    "text": " heading updates the nav on the next render (when you blur the block), not on every keystroke — inline text edits don't re-render the frontend until they're flushed. Adding or removing headings updates it immediately."
   }
  ]
 }
]
```

</block>

If your anchors carry levels, pair the derived list with `buildAnchorTree(anchors)` (from `@volto-hydra/hydra-js`) to render a nested contents list; no levels means a flat list.

## The steps

The steps involved in creating a frontend are roughly the same for all these frameworks:

## 1. Create a Catch-All Route

Create a route for any path which goes to a single page.

For example, in Nuxt.js you create a file `pages/[..slug].vue`.

## 2. Build the Page Template

The page has a template with the static parts of your theme like header and footer. You might also check the content type to render each differently.

## 3. Fetch Content from Plone REST API

On page setup, take the path and make a [REST API call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the JSON for this page.

<block type="slate" uid="ul-33">

```field-json:value
[
 {
  "type": "ul",
  "children": [
   {
    "type": "li",
    "children": [
     {
      "text": "You can use "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "@plone/client"
       }
      ]
     },
     {
      "text": " for this"
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "text": "In some frameworks (such as Nuxt.js) it's better to use their built-in fetch"
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "text": "You can also use the "
     },
     {
      "type": "link",
      "data": {
       "url": "https://2022.training.plone.org/gatsby/data.html"
      },
      "children": [
       {
        "text": "Plone GraphQL API"
       }
      ]
     },
     {
      "type": "ul",
      "children": [
       {
        "type": "li",
        "children": [
         {
          "text": "Note: this is just a wrapper on the REST API rather than a server-side implementation, so it's not more efficient than using the REST API directly"
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
]
```

</block>

## 4. Render Page Metadata

In your page template, fill title etc. from the content metadata.

## 5. Navigation

1. Adjust the contents API call to use [`@expand`](https://6.docs.plone.org/volto/configuration/expanders.html) and return [navigation data](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) in the same call
2. Create a component for your top-level nav that uses this nav JSON to create a menu

## 6. Blocks

1. Create a `Block` component that takes the id and block JSON as arguments
2. Use if statements to check the block type and determine how to render that block
3. If the block is a container, call the `Block` component recursively
4. In your page, iterate down the `blocks_layout` list and render a `Block` component for each
5. Rendering Slate — split into a separate component as it's used in many blocks and is also recursive

Give `Block` an `@type: "empty"` case: a container region with no `defaultBlockType` and more than one `allowedBlocks` seeds an `empty` placeholder for the user to type in place, and any custom container renderer must route its children through `Block` so `empty` is handled rather than rejected. See [Empty Blocks](container-blocks.md#empty-blocks).

## 7. Helper Functions

Several helper functions get reused in many blocks:

<block type="slate" uid="ol-43">

```field-json:value
[
 {
  "type": "ol",
  "children": [
   {
    "type": "li",
    "children": [
     {
      "type": "strong",
      "children": [
       {
        "text": "Generating a URL for links"
       }
      ]
     },
     {
      "text": " — all REST API URLs are relative to the API URL, so you need to convert these to the right frontend URL"
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "type": "strong",
      "children": [
       {
        "text": "Generating a URL for an image"
       }
      ]
     },
     {
      "text": " — blocks have image data in many formats so a helper function is useful"
     },
     {
      "type": "ul",
      "children": [
       {
        "type": "li",
        "children": [
         {
          "text": "You may also decide to use your framework or hosting solution for image resizing"
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
]
```

</block>

## 8. Listing Blocks

- Use the [Listing Helpers](listings.md) or make your own [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)
- Create your own pagination scheme (e.g., embed page in URL for static generation)
- Render the items and pagination

## 9. Redirects

1. If your contents call results in a redirect, you will need to do an internal redirect in the framework so the path shown is correct
2. If you are using SSG, you will need special code to [query all the redirects](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/aliases.html#listing-all-available-aliases-via-json) at generate time and add redirect routes

## 10. Error Pages

If your [REST API call returns an error](https://6.docs.plone.org/plone.restapi/docs/source/http-status-codes.html), handle this within the framework to display the error and set the status code.

## 11. Search Blocks

If you choose to allow Volto's built-in Search Block for end-user customisable search:

- Render Facets/Filters (currently not as sub-blocks but this could change)
- Build your query and make a [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)

## 12. Form Blocks

Form-block is a plugin that allows a visual form builder:

- Currently not a container with sub-blocks but this could change
- Render each field type component (or limit which are available)
- Produce a compatible JSON submission to the form-block endpoint
- Handle field validation errors
- Handle the thank-you page

## Deployment patterns

Inka separates your production frontend from the editing experience, which gives you choice in how each is deployed.

### SPA / Hybrid — full visual editing

The simplest setup — your frontend handles both production and editing:

1. Deploy your frontend as SPA or Hybrid (SSR + client-side hydration).
2. Deploy Inka and the Plone API server.
3. Log in to Inka, go to user preferences, set your frontend URL.

This gives you all visual editing features including inline text editing, drag and drop, and realtime preview.

### SSG / SSR — production speed + visual editing

Get the speed of static generation while keeping visual editing. Deploy two versions of the same frontend:

1. **Production** — deploy your frontend in SSG or SSR mode (fast, cacheable).
2. **Editing** — deploy the same frontend in SPA mode to a separate URL (used only inside Inka).
3. **Inka + Plone** — only needs to run during editing, so scale-to-zero / serverless works.
4. **SSG rebuild** — for SSG, configure [collective.webhook](https://github.com/collective/collective.webhook) to trigger a rebuild on edit. SSR doesn't need this.

### Example: the Nuxt.js demo

The default Inka demo uses exactly the SSG / SSR pattern above:

- **Production** — [SSG on Netlify](https://hydra-nuxt-flowbrite.netlify.app/). All pages statically generated, images optimized, fast globally.
- **Editing** — same Nuxt codebase deployed as SPA to a different Netlify URL. Only loaded inside Inka's iframe.
- **Inka + Plone** — deployed to [fly.io](https://hydra.pretagov.com) with scale-to-zero. Cost is free or minimal since it only runs during editing.

For most frameworks, switching between SSG / SSR and SPA is just a config toggle, so you get the best of both worlds with minimal effort.
