# Build a frontend

The actual code you write will depend on the framework you choose. You can look at these examples to help you:

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

```{note}
This guide describes the integration pattern for frameworks with client-side
reactivity (React, Vue, Svelte, Solid, Next, Nuxt, etc.) — your component
tree consumes `formData` and re-renders, the framework's virtual DOM
diff handles the per-block update.

For server-only frameworks without client-side reactivity (Astro, PHP,
Django, Rails, Laravel, Symfony, Go templates), use the
[server-render pattern](./server-rendered-frontends.md) instead — one config
option on `initBridge` plus one small HTTP endpoint.
```

## What an integrated frontend looks like

Before you dive into the steps, here's what your frontend ends up doing.

To make a site editable with Hydra you break a page into:

- **Blocks fields** — one or more named, ordered lists of blocks. Each is a schema property with `widget: 'blocks_layout'`; the field name is a key inside the page's `blocks_layout` dict (the default field is `items`, plus e.g. `header`, `footer`). Every field's blocks live in the page's single shared `blocks` dict; the field only records ordering.
- **Blocks** — discrete visual elements with a schema and settings that can be moved and edited.
  - Type, title, icon etc. so the user can pick from a menu.
  - Fields: string, image, link etc. each with their own sidebar widget.
    - `slate` is a special field that contains JSON for a paragraph, heading etc.
    - `blocks` fields let a block hold other blocks.

When the page loads inside Hydra's edit iframe, you initialise the bridge and declare your blocks; otherwise you render normally from the API:

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

Page data ends up shaped like this — one shared `blocks` dict, and a region per named list inside `blocks_layout`:

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

```{note}
Regions are sub-keys of `blocks_layout` — **not** separate top-level fields — because that is what makes them persist. `blocks_layout` is a registered backend field (a Plone behavior field), so the whole dict, including every region, is saved verbatim. A separate top-level field such as `footer_blocks` would be **silently dropped** by the backend on save, because it isn't a registered field. See [Container blocks](container-blocks.md) for the data model in full.
```

Then you augment the rendered HTML with `data-` attributes (or `<!-- hydra ... -->` comments) so Hydra can find your blocks and editable fields:

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

```{tip}
You can embed the Hydra tags directly if you want:
`<p data-edit-text="title">A caption</p>`
```

## The steps

The steps involved in creating a frontend are roughly the same for all these frameworks:

## 1. Create a Catch-All Route

Create a route for any path which goes to a single page.

For example, in Nuxt.js you create a file `pages/[..slug].vue`.

## 2. Build the Page Template

The page has a template with the static parts of your theme like header and footer. You might also check the content type to render each differently.

## 3. Fetch Content from Plone REST API

On page setup, take the path and make a [REST API call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the JSON for this page.

- You can use `@plone/client` for this
- In some frameworks (such as Nuxt.js) it's better to use their built-in fetch
- You can also use the [Plone GraphQL API](https://2022.training.plone.org/gatsby/data.html)
  - Note: this is just a wrapper on the REST API rather than a server-side implementation, so it's not more efficient than using the REST API directly

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

1. **Generating a URL for links** — all REST API URLs are relative to the API URL, so you need to convert these to the right frontend URL
2. **Generating a URL for an image** — blocks have image data in many formats so a helper function is useful
   - You may also decide to use your framework or hosting solution for image resizing

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

Hydra separates your production frontend from the editing experience, which gives you choice in how each is deployed.

### SPA / Hybrid — full visual editing

The simplest setup — your frontend handles both production and editing:

1. Deploy your frontend as SPA or Hybrid (SSR + client-side hydration).
2. Deploy Hydra and the Plone API server.
3. Log in to Hydra, go to user preferences, set your frontend URL.

This gives you all visual editing features including inline text editing, drag and drop, and realtime preview.

### SSG / SSR — production speed + visual editing

Get the speed of static generation while keeping visual editing. Deploy two versions of the same frontend:

1. **Production** — deploy your frontend in SSG or SSR mode (fast, cacheable).
2. **Editing** — deploy the same frontend in SPA mode to a separate URL (used only inside Hydra).
3. **Hydra + Plone** — only needs to run during editing, so scale-to-zero / serverless works.
4. **SSG rebuild** — for SSG, configure [collective.webhook](https://github.com/collective/collective.webhook) to trigger a rebuild on edit. SSR doesn't need this.

### Example: the Nuxt.js demo

The default Hydra demo uses exactly the SSG / SSR pattern above:

- **Production** — [SSG on Netlify](https://hydra-nuxt-flowbrite.netlify.app/). All pages statically generated, images optimized, fast globally.
- **Editing** — same Nuxt codebase deployed as SPA to a different Netlify URL. Only loaded inside Hydra's iframe.
- **Hydra + Plone** — deployed to [fly.io](https://hydra.pretagov.com) with scale-to-zero. Cost is free or minimal since it only runs during editing.

For most frameworks, switching between SSG / SSR and SPA is just a config toggle, so you get the best of both worlds with minimal effort.
