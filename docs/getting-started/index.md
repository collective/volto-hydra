# Getting Started

## What is Volto Hydra?

Volto Hydra is a Visual Headless CMS using Plone/Nick as a server and an Administration interface (based on Volto). Hydra provides a true visual editor with drag-and-drop blocks and editable text — but with any frontend stack you choose. No assumptions. No learning curve.

### Why Headless CMS?

- You want a very custom website using frontend technologies you likely already know such as Next/Nuxt/Astro
  - Including the ability to easily integrate 3rd party components not specifically designed for a CMS
- You don't want to learn how to customise the CMS to get your custom site
- You don't want to have to redeploy your CMS every time you make a frontend change
- You want your frontend and CMS to be able to be upgraded independently
- You may have many frontends for the same content (omni-channel)

### When Not to Use Headless

- You want a no-code solution "non custom" website. Site builders like Wix or Squarespace are better for this.
- Or pick an open source CMS with an off-the-shelf theme or site builder plugin.

### Why Visual Headless CMS?

- Your editors don't want to think about how content will look when they are editing
- Editors want direct drag-and-drop editing
- Editors who want more control over page layout offered by blocks-based editing

### Why Hydra?

- A unique CMS by being Visual and true Headless and Open source
- Quick to enable visual editing of frontend blocks regardless of framework by just using tags. No required React or Vue in your frontend
- Switch between multiple frontends mid visual edit — perfect for omni-channel
- Enterprise features such as versioning, i18n, workflow and automated content rules
- Unique hierarchical database letting you mix and match collections and trees for storage
- Easier to implement design systems that enforce governance of content and design
- Customisable Administration Interface
- Choice of Python or JavaScript for your server
- Scalable and secure with a mature battle-hardened backend used by both CIA and FBI
- Open source means you have the flexibility to host where and how you want

## Try the Online Demo

You can try out the editing experience now by logging into <https://hydra.pretagov.com>.

- Go to user preferences in the bottom left
- Select one of the available preset frontends
- Or paste in your own frontend URL to test

```{note}
The default is a Nuxt.js frontend, deployed as a [SSG](https://hydra-nuxt-flowbrite.netlify.app/)
to demonstrate scale-to-zero editing (free hosting). See {doc}`../deployment/index` for details.
```

## Quick Start

To make a site editable with Hydra you will need to break up your page into:

- **Blocks layout** — areas of the page that contain a list of blocks that make up your page content
- **Blocks** — a discrete visual element of the page with a schema and settings that can be moved around and edited
  - Type, title, icon etc. so the user can pick from a menu
  - Fields: string, image, link etc. each with their own sidebar widget
    - `slate` is a special field that contains JSON representing a single paragraph, heading etc.
    - `blocks` fields: enables a block to hold other blocks

With a Hydra instance running, go to user preferences and enter the URL of your frontend.

Modify your frontend to work with the editor by loading the Hydra bridge and defining your blocks and page:

```js
let bridge;

if (window.name.startsWith('hydra')) {
    bridge = initBridge({
      page: {
        schema: {
          properties: {
            blocks_layout: { allowedBlocks: ['slate', 'grid', 'myimage'] },
            header_blocks: { allowedBlocks: ['slate', 'image'], maxLength: 3 },
            footer_blocks: { allowedBlocks: ['slate', 'link'] },
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

The page data structure becomes:

```js
{
  ...
  blocks: {
    'text-1': { '@type': 'slate', ... },
    'header-1': { '@type': 'image', ... },
    'footer-1': { '@type': 'slate', ... }
  },
  blocks_layout: { items: ['text-1'] },
  header_blocks: { items: ['header-1'] },
  footer_blocks: { items: ['footer-1'] }
}
```

Finally augment the frontend's rendered HTML telling Hydra where your blocks are and where the fields are:

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

## Run Locally

Clone the Volto-Hydra repository from GitHub:

```bash
git clone https://github.com/collective/volto-hydra.git
cd volto-hydra
```

Start the Plone RESTAPI/Database:

```bash
docker run -it -d --rm --name=api -p 8080:8080 -e SITE=Plone -e CORS_ALLOW_ORIGIN='*' plone/server-dev:6
```

Start a frontend. In this case we will use the Nuxt.js example:

```bash
cd examples/nuxt-blog-starter
pnpm install
NUXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8080/Plone pnpm run dev
```

The frontend is at <http://localhost:3000>

To edit, start the Hydra Admin interface:

```bash
cd ../..
make install
RAZZLE_API_PATH="http://localhost:8080/Plone" RAZZLE_DEFAULT_IFRAME_URL=http://localhost:3000 pnpm start
```

Now you can login to Hydra to edit at <http://localhost:3001>

## Run Local Frontend Only

You can develop your frontend locally against a deployed CMS:

```bash
cd examples/nuxt-blog-starter
pnpm install
NUXT_PUBLIC_BACKEND_BASE_URL=https://hydra-api.pretagov.com pnpm run dev
```

Login to <https://hydra.pretagov.com/> and in personal preferences add your frontend URL of `https://localhost:3000`.

## Example Frontends

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)
