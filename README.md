# Volto Hydra (volto-hydra)

A Visual Headless CMS using Plone/Nick as a server, an Administration interface (based on Volto).
Hydra provides true visual editor with drag and drop blocks and editable text but with any frontend stack you choose. 
No assumptions. No learning curve.

Why Headless CMS
- You want a very custom website using frontend technologies you likely already know such as Next/Nuxt/Astro, 
    - inc. the ability to easily integrate 3rd party components not specifically designed for a CMS.
- You don't want to learn how to customise the CMS to get your custom site
- You don't want to have to redeploy your CMS every time you make a frontend change.
- You want your frontend and CMS to be able to be upgraded independently.
- You may have many frontends for the same content (omni-channel)

When not to use Headless
- You want a no-code solution "non custom" website. Site builders like wix or squarespace are better for this. 
- Or pick an open source CMS with an off the shelf theme or sitebuilder plugin.

Why Visual Headless CMS
- Your editors don't want to think about how it's going to look when they are editing. 
- Editors want direct DnD editing.
- Editors who want more control over page layout offered by blocks based editing.

Why Hydra
- A unique CMS by being Visual and true Headless and Open source
- Quick to enable Visual editing of frontend blocks regardless of framework by just using tags. No required React or Vue in your frontend.
- Switch between multiple frontends mid visual edit. Perfect for omni-channel.
- Enterpise features such as versioning, i18n, workflow and automated content rules.
- Unique hierarchical database letting you mix and match collections and trees for storage
- Easier to implement design systems that enforce governance of content and design.
- Customisable Administration Interface
- Choice of python or javascript for your server
- Scalable and Secure with a mature battle hardened backend used by both CIA and FBI.
- Open source means you have the flexibility to host where and how you want and optimise costs and security how you want.

Note: It is a [Work in Progress: Hydra Project](https://github.com/orgs/collective/projects/3/views/4).
It shouldn't be used in production. It was kicked off as a GSoC project.


## Does it work? Try the online demo

You can try out the editing experience now by logging into https://hydra.pretagov.com. 
- Go to user preferences in the bottom left
- select one of the available preset frontends 
- or paste in your own frontend url to test.

Note that the default is a Nuxt.js frontend, deployed as a [SSG](https://hydra-nuxt-flowbrite.netlify.app/) 
to demonstrate scale-to-zero editing (free hosting) see [SSG/SSR with Hydra](./ssg_ssr_with_hydra)

## Quick Start

To make a site editable with hydra you will need to break up your page into

- blocks layout - areas of the page that contain a list of blocks that make up your page content
- blocks - a discrete visual element of the page with a schema and settings that can be moved around and edited
  - type, title, icon etc so the user can pick from a menu 
  - fields: string, image, link etc each with their own sidebar widget
    - slate is a special field that contains json representing a single paragraph, heading etc. 
    - blocks fields: enables a block to hold other blocks 

With a hydra instance running, go to user preferences and enter the url of your frontend.

Modify your front end to work with the editor by loading the hydra bridge and define your 
blocks and page.

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
  footer_blocks_layout: { items: ['footer-1'] }
}
```

Finally augment the frontend's rendered html telling hydra where your blocks are and where
the fields are.

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

Note you can just embed the hydra tags directly if you want,
e.g. `<p data-edit-text="title">A caption</p>`


## Run locally

Clone the Volto-Hydra repository from GitHub:

```bash
git clone https://github.com/collective/volto-hydra.git
cd volto-hydra
```

Start the Plone RESTAPI/Database
```bash
docker run -it -d --rm --name=api -p 8080:8080 -e SITE=Plone -e CORS_ALLOW_ORIGIN='*' plone/server-dev:6
```

Start a frontend. In this case we will use the Nuxt.js example
```bash
cd examples/nuxt-blog-starter
pnpm install
NUXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8080/Plone pnpm run dev
```
The frontend is at http://localhost:3000

To Edit, start the Hydra Admin interface
```bash
cd ../..
make install
RAZZLE_API_PATH="http://localhost:8080/Plone" RAZZLE_DEFAULT_IFRAME_URL=http://localhost:3000 pnpm start
```

Now you can login to Hydra to edit
- http://localhost:3001

## Run local frontend only

You can develop your frontend locally against a deployed CMS, for example.

```bash
    cd examples/nuxt-blog-starter
    pnpm install
    NUXT_PUBLIC_BACKEND_BASE_URL=https://hydra-api.pretagov.com pnpm run dev
```

Login to https://hydra.pretagov.com/ and in personal preferences add your front url of https://localhost:3000


## Building your Frontend

The actual code you will write will depend on the framework you choose. You can look these examples to help you.

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

The steps involved in creating a frontend are roughly the same for all these frameworks so we have written a [guide to 
building a Headless Frontend to Plone RESTAPI](./#building-a-frontend-for-headless-plone)

## Deployment

### SPA/Hybrid with Hydra

Hydra requires a SPA or Hybrid frontend if you want to have full Visual Editing.

- Deploy your frontend in as either a Single Page App (SPA) or Hybrid (Server side rendering with client side rendering after first load)
- Deploy Hydra and the plone api server.
- Login in to hydra and set your frontend url.

### SSG/SSR with Hydra

It is still possible to achieve the speed and cost savings of Server Side Generation (SSG)
while still getting the benefits of Visual Editing with Hydra. Or you might require a
pure Server Side Rendered (SSR) mode.

To achieve this

- deploy your production frontend in SSG or SSR mode
- deploy Hydra and Plone api server
  - note this only has to run during editing so scale-to-zero/serverless is an option
- deploy your same frontend in SPA mode to another url which is only used in Hydra for editing
- For SSG you will also need [c.webhook](https://github.com/collective/collective.webhook) and configure this to rebuild your SSG on edit.
  - For a SSR frontend c.webhook is not needed 

For example, fro the default Nuxt.js demo frontend:

- The production frontend is deployed as a [SSG on netlify](https://hydra-nuxt-flowbrite.netlify.app/).
  - Images and listings are all statically generated
  - Search can't be SSG but with scale-to-zero and suspend hosting the cold start delay of a search might be an acceptable tradeoff.
- The Administration interface (https://hydra.pretagrov.com) and Plone server is deployed to fly.io using scale-to-zero so the cost is free or minimal
- During editing, a different deployment ([SPA on netlify](https://hydra-nuxt-flowbrite-edit.netlify.app/)) of the same frontend is used

### Two-Window editing (without hydra)

You can use Plone Headless without Hydra using Volto instead

- Deploy the Plone api server
- Deploy your frontend
- Deploy a Volto site with a default theme
- Setup your content types and block types
  - Currently adding new blocks requires a custom Volto theme to be deployed.
  - Content types can be added by site setup
- During Editing
  - You will use Volto which will come with an out of the box theme so it won't look the same as your frontend
  - Any new blocks you create will have a skeleton presentation within the preview
  - Any header/footer css etc won't reflect your frontend
  - Once done editing a page, you can ask users to switch to another tab and use the frontend URL and see how the changes look on your frontend
    - if the page is private you will additionally have to implement a way to login on your frontend to see these pages
- If you need a more WYSIWYG editing experience
  - Use Volto theming to recreate design inside volto, or close enough so your editors are happy.
    - this would be a duplicate any effort you did on the frontend.
  - Or just use Hydra

## Enabling Visual Editing (with hydra)

Hydra provides a live preview of your frontend using an iframe which is in the middle of the screen.
By adding simple optional levels of hints in your frontend code, hydra will add overlays so 
Visual DND editing is enabled.


```
CMS-Toolbar           Frontend in iframe (hydra adds minimal block select/edit UI)             CMS-Sidebar               
                                                                                                                         
┌───────┐───────────────────────────────────────────────────────────────────────────────┌───────────────────────────────┐
│       │                                                                               │                               │
│ ┌──┐  │                                                                               │   Page                        │
│ │  │  │                                                                               │                               │
│ └──┘  │      ┌──┬┬──┬┬──┐                                                             │     Title                     │
│ ┌──┐  │      │::││  ││…⋎│                                                             │     ┌────────────────────┐    │
│ │  │  │      └──┴┴──┴┴──┘                                                             │     │ My Page Title      │    │
│ └──┘  │      ┌──────────────────────────────────────────────────────────┐┌───┐        │     └────────────────────┘    │
│       │      │                              ┌─────────────────────────┐ ││ + │        │                               │
│       │      │  Big News                    │                         │ │└───┘        │                               │
│       │      │                              │                         │ │             │   Slider Block                │
│       │      │  Checkout hydra, it will     │                         │ │             │                               │
│       │    < │  change everything           │                         │ │ >           │     Slide delay               │
│       │      │                              │                         │ │             │     ┌──────────┐              │
│       │      │  ┌───────────┐               │                         │ │             │     │ 5        │              │
│       │      │  │ Read more │               │                         │ │             │     └──────────┘              │
│       │      │  └───────────┘               └─────────────────────────┘ │             │                               │
│       │      └──────────────────────────────────────────────────────────┘             │                               │
│       │                                 1 2 3 4                                       │   Slide Block                 │
│       │                                                                               │                               │
│       │                                                                               │     Slide Title               │
│       │                                                                               │     ┌────────────────────┐    │
│       │      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed             │     │ Big News           │    │
│       │                                                                               │     └────────────────────┘    │
│       │      do eiusmod tempor incididunt ut labore et dolore magna aliqua.           │                               │
│       │                                                                               │     Image                     │
│       │      Ut enim ad minim veniam, quis nostrud exercitation ullamco               │     ┌────────────────────┐    │
│       │                                                                               │     │                    │    │
│       │      laboris nisi ut aliquip ex ea commodo consequat.                         │     │                    │    │
│       │                                                                               │     │                    │    │
│       │                                                                               │     │                    │    │
│       │                                                                               │     └────────────────────┘    │
│       │                                                                               │                               │
│       │                                                                               │                               │
└───────┘───────────────────────────────────────────────────────────────────────────────└───────────────────────────────┘
```

- With no integration the preview frontend tracks CMS navigation and refresh after save.
- Level 1: tracks frontend to navigate to change CMS context to quickly edit the current page including private pages
- Level 2: allows your frontend to define custom content types and block types
- Level 3: will allow you to select blocks inside this preview but not see any changes
- Level 4: allows you to see changes in realtime and lets you manage blocks
- Level 5: lets the user edit text, images and links directly on the preview
- Level 6: if needed, customise CMS UI or more complex visual editing in the frontend

### Level 0: Headless frontend with vanilla volto (no hydra visual editing)

First is to start with a frontend technology of your choice.
Since our goal is to not modify the CMS we will initially be stuck with the out of the box CMS block types and content types.

You can use whatever frontend technology you want but a basic vue.js example might be

"[...slug].vue"
``` vue.js
<template>
    <Header :data="data"/>
    <content>
            <Block  :block_id="block_id" :block="data.blocks[block_id]" :data="data" v-for="block_id in data.blocks_layout.items"/>
    </content>
    <Footer :data="data/>  
</template>
<script setup>
const { data, error } = await ploneApi({});
</script>
```

Now you have true headless site where the deployment of your frontend is not tightly integrated with your editor.

At this your Editor can :-

- login to hydra and see the frontend in an iframe. The result will look similar to Volto.
  - but they can't see private pages yet because your renderer is not yet logged in 
- browse in hydra (contents view) and your frontend page will change. 
  - but browse in your frontend and the CMS won't yet change context as it can't detect the page switch
- add a page in hydra.
  - Note: since pages are created private you won't see a preview unless you publish first.
  - Note: You now need to create a page and give it a title before editing.
    - This has the benefit that images added during editing always default to being contained inside the page.  
- edit a page
  - selecting, adding, editing and rearranging the block layout all is done via the sidebar
    - You will see more fields than normal volto to make this possible 
  - only after you save it will reload the iframe and the changes will appear on your frontend.
  - (later it should be possible do live updates even with SSR but via the RESTAPI) - TODO
- remove a page.
- all other CMS features such as site setup, contents, worklow will work the same as Volto
  - History won't show a visual diff (TODO explore if there is a way...) 

### Level 1: Preview with Page Switching and authentication

We include the hydra iframe bridge which creates a two way link between the hydra editor and your frontend.

- Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) frome hydra-js package and include it in your frontend
- During admin, initilize it with Volto settings

  ```js
  import { initBridge } from './hydra.js';
  const bridge = initBridge({
    page: {
      schema: {
        properties: {
          blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'video'] },
        },
      },
    },
  });
  ```

- To know you are in being managed by hydra by an extra url param is added to your frontend ```_edit=``` (see [Lazy Loading](#lazy-load-the-bridge)) or ```window.name``` starts with hydra.
- To see private content you will need to [change your authentication token]((#authenticatitee-frontend-to-access-private-content))

This will enable an Editor to :-

- browse in your frontend and Hydra will change context so AdminUI actions are on the current page you are seeing.
- add a page in hydra and it will appear.
  - now the frontend has the same editor authentication it can see private content
- edit a page the content still won't change until after save

- Note either hashbang ```/#!/path``` or normal ```/path``` style paths are supported.

#### Path Transformation (pathToApiPath)

If your frontend embeds state in the URL path (like pagination), you need to tell hydra.js how to transform the frontend path to the API/admin path. Otherwise, the admin will try to navigate to URLs that don't exist in the CMS.

```js
const bridge = initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'video'] },
      },
    },
  },
  // Transform frontend path to API path by stripping paging segments
  // e.g., /test-page/@pg_block-8-grid_1 -> /test-page
  pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
});
```

The `pathToApiPath` function is called whenever hydra.js sends a `PATH_CHANGE` message to the admin, allowing your frontend to strip or transform URL segments that are frontend-specific (like pagination, filters, or other client-side state).

### Level 2: Block Definitions

During the initialisation you can have full control over the blocks that will be stored,
their schema and where to can be added.

- `page` > `schema` > `properties`: lets you specify regions of the page where blocks can be added. The default is `blocks_layout`
  - `allowedBlocks`: you can enable or disable any builtin blocks (note this will stop
      new blocks being added by not filter blocks already saved.)
  - Note you can't currently change the page metadata schema itself.  
    - Currently custom content types are created via "Site Setup > Content types".
- `blocks`: Override settings of builtin blocks or add new block definitions
  - `blockSchema` > `properties`: field definitions for your block such as `title`, `type` or `widget`. 
- `voltoConfig`: in the future will let you change other settings like slate formats
  ([TODO](https://github.com/collective/volto-hydra/issues/109)) or toolbar actions.
-  

Let's take a specific example of a slider block you want to have available for your editors. This is not a default block type so 
you will need to add it custom. Normally this would require developing a volto plugin and installing it into your custom volto instance.

For our slider example, we can configure this new block directly in the frontend

```js
import { initBridge } from './hydra.js';

const bridge = initBridge({
  page: {
    schema: {
      properties: {
        'blocks_layout': {
          title: 'Content',
          widget: 'blocks_layout', 
          allowedBlocks: ['slate', 'image', 'video', 'slider'] 
        },
      }
    }
  },
  blocks: {
    slider: {
      id: 'slider', // The name (id) of the block
      title: 'Slider', // The display name of the block
      icon: 'data:...', // The icon used in the block chooser
      group: 'common', // The group (blocks can be grouped, displayed in the chooser)
      restricted: false,
      mostUsed: true, // A meta group `most used`, appearing at the top of the chooser
      sidebarSchemaOnly: false, // Some volto plugins might Set true to disable Edit component in sidebar (use schema form only)
      blockSchema: {
        properties: {
          slider_timing: {
            title: "time",
            widget: 'float',
          },
          slides: {
            title: "Slides",
            widget: 'blocks_layout',
            allowedBlocks: ['slide', 'image'],
            defaultBlockType: 'slide',
            maxLength: 10,
          }
        },
      }
    },
    // Child block types must be defined at the top level of `blocks`
    slide: {
      id: 'slide',
      title: 'Slide',
      blockSchema: {
        fieldsets: [
          {
            id: 'default',
            title: "Settings",
            fields: ['url', 'title', 'image', 'description'],
          },
        ],
        properties: {
          url: {
            title: "Link",
            widget: 'url',
          },
          title: {
            title: "Title",
          },
          image: {
            title: "Image",
            widget: "image"
          },
          description: {
            title: "Description",
            widget: "slate"
          },
        },
        required: [],
      },
    },
  },
});
```

Now we can add a slider block using the sidebar and slides to the slider block. 
Once saved the page data will include a block json

```json
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First Slide", "image": "..." },
    "slide-2": { "@type": "image", "title": "Second Slide", "image": "..." }
  },
  "slides": { "items": ["slide-1", "slide-2"] }
}
```

Which we can render (in this case it's a vue.js example)

"Block.vue"
``` js
<template>
    ...
    <div v-else-if="block['@type'] == 'slider'" class="slider">
      <div>
        <div class="slide" v-for="slide_id in block.slides.items">
          <img :src="block.blocks[slide_id].image"/>
          <h2>{{block.blocks[slide_id].title}</h2>
          <div><RichText v-for="node in block.blocks[slide_id].description" :key="node" :node="node" /></div>
          <div><a :href="block.blocks[slide_id].url">block.blocks[slide_id].link_text</a><div>
        </div>
      </div>
      <a link="">Prev></a><a link="">Next></a>
    </div>
    ...
```

#### Container Blocks

Container blocks are ones that have one or more block fields which can container other blocks.
These blocks can added, removed and DND around the page.

There are two formats you can use in your block schema to define blocks fields. Both look the same in the editing UI and blocks can be dragged between them.

##### `blocks_layout` — typed blocks with separate schemas

Each child block has its own `@type` and schema (looked up from `blocks`).
Child blocks are stored in a shared `blocks` dict on the parent block, with the field holding `{ items: [...] }` for ordering.

```js
slides: {
  title: "Slides",
  widget: 'blocks_layout',
  allowedBlocks: ['slide', 'image'],
  defaultBlockType: 'slide',
  maxLength: 10,
}
```

Resulting data:

```json
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First Slide", "image": "..." },
    "slide-2": { "@type": "image", "title": "Second Slide", "image": "..." }
  },
  "slides": { "items": ["slide-1", "slide-2"] }
}
```

Note: All `blocks_layout` fields on the same block share the same `blocks` dict. This means a block can have multiple container fields (e.g., `header` and `footer`) whose child blocks all live in the parent's `blocks`.

##### `object_list` — items sharing a single schema

All items share one inline schema. Stored as an array with an ID field.

```js
slides: {
  title: "Slides",
  widget: 'object_list',
  idField: '@id',  // Field used as unique identifier (default: '@id')
  dataPath: ['data', 'rows'],  // optional path when data is nested
  schema: {
    properties: {
      title: { title: "Title" },
      image: { title: "Image", widget: "image" },
      description: { title: "Description", widget: "slate" }
    }
  }
}
```

Resulting data:

```json
{
  "@type": "slider",
  "data": {
    "slides": [
      { "@id": "slide-1", "title": "First Slide", "image": "..." },
      { "@id": "slide-2", "title": "Second Slide", "image": "..." }
    ]
  }
}
```

##### `object_list` with `allowedBlocks` — typed items

When `allowedBlocks` is set on an `object_list`, items can have different types
(like `blocks_layout`) but are still stored as an array. Each item's type is
stored in the field specified by `typeField` (defaults to `'@type'`) and its
schema is looked up from `blocks`.

```js
facets: {
  title: "Facets",
  widget: 'object_list',
  allowedBlocks: ['checkboxFacet', 'selectFacet'],
  typeField: 'type',  // which field holds the block type (default: '@type')
  defaultBlockType: 'checkboxFacet',
}
```

Resulting data:

```json
{
  "@type": "search",
  "facets": [
    { "@id": "facet-1", "type": "checkboxFacet", "title": "Content Type", "field": "portal_type" },
    { "@id": "facet-2", "type": "selectFacet", "title": "Subject", "field": "Subject" }
  ]
}
```

This is useful when you want the array storage format of `object_list` but need
multiple block types like `blocks_layout`.

Both `blocks_layout` and `object_list` look the same in the editing UI and
blocks can be dragged between them — data is automatically adapted when moving
between formats (ID fields added/stripped, type fields set appropriately)


#### Table Mode (addMode: 'table')

For table like structures (rows then cells, or columns then cells) you can enable table mode to make it easy for the user to add and remove columns as easily as they can add rows.

```js
rows: {
  widget: 'object_list',
  idField: 'key',
  addMode: 'table',  // Enable table-aware behavior
  dataPath: ['table', 'rows'],
  schema: {
    properties: {
      cells: {
        widget: 'object_list',
        idField: 'key',
        schema: {
          properties: {
            value: { title: 'Content', widget: 'slate' }
          }
        }
      }
    }
  }
}
```



#### Schema Enhancers

Schema enhancers modify block schemas dynamically:

```js
const bridge = initBridge({
  blocks: {
    // Conditional field visibility
    myBlock: {
      blockSchema: {
        properties: {
          mode: { title: 'Mode', widget: 'select', choices: [['simple', 'Simple'], ['advanced', 'Advanced']] },
          advancedOptions: { title: 'Advanced Options', type: 'string' },
        },
      },
      schemaEnhancer: {
        skiplogic: {
          advancedOptions: { field: 'mode', is: 'advanced' },
        },
      },
    },
  },
});
```

**`skiplogic`**: Conditionally show/hide fields based on other field values.
- `field`: Field to check (use `../field` for parent/page fields)
- Operators: `is`, `isNot`, `isSet`, `isNotSet`, `gt`, `gte`, `lt`, `lte`

#### Block conversion

If a block type has a `fieldMappings` defined it will enable a "Convert to..." UI action.
You specify either conversions to a specific type, or to a generic search result schema
(@id, title, preview-image, description)

```js
teaser: {
  fieldMappings: {
    @default: { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
    image: { 'href': 'href', 'alt': 'title', 'url': 'preview_image' },
  },
},
image: {
  fieldMappings: {
    @default: { '@id': 'href', 'title': 'alt', 'image': 'url' },
    teaser: { 'href': 'href', 'title': 'alt', 'preview_image': 'url' },
  },
},
```

Note it will perform transitive conversions by using paths through intermediate types (hero → teaser → image). Any fields that don't match will still be kept in the data so if the block
is converted back that data will reappear.


#### Synchronised block types in a container

You might want to have one container
type that can hold different types of blocks but you want to constrain them to all have
be the same type with synchronised settings.
A field on the parent will let the editor select the type and all the blocks will get
converted to that new type using ```fieldMappings```.


```js
const bridge = initBridge({
  blocks: {
    // Parent container: controls child type via 'variation' field
    // inheritSchemaFrom creates the typeField with computed choices
    gridBlock: {
      allowedBlocks: ['teaser', 'image'],  // Allowed child block types
      schemaEnhancer: {
        inheritSchemaFrom: {
          typeField: 'variation',
        },
      },
    },
    // Child block: hides fields that parent controls
    teaser: {
      schemaEnhancer: {
        childBlockConfig: {
          editableFields: ['href', 'title', 'description'],
        },
      },
      fieldMappings: {
        default: { '@id': 'href', 'title': 'title', 'image': 'preview_image' }
      },
    },
  },
});
```

**`inheritSchemaFrom`**: Parent inherits schema from selected child type. When `variation` changes, child blocks sync to new type.
- `typeField`: Field name for selecting child type (e.g., `'variation'`)
- `defaultsField`: Field name for storing inherited defaults (e.g., `'itemDefaults'`)
- `blocksField`: Which blocks field the sub-blocks will be in. Used to get the list
     of `allowedBlocks`. It can be set to ".." to use the parents `allowedBlocks`
- `filterConvertibleFrom`: only allow selecting a block type which can convert from the specified type.

**`childBlockConfig`**: Child hides fields except `editableFields` when inside a parent with `inheritSchemaFrom`.

#### HTML Paste support (TODO)

To support the user pasting rich text into the editor and having appear as you custom
block type you can use a special field mapping of `css:<selector>`

```js
video: {
  fieldMappings: {
    'css:video': { 'src': 'url', 'caption[@class="alt"]': 'alt'},
  },
},
```

TODO: need to do this via htmlTagsToSlate to bypass conversion to slate or handle encoding into slate so we don't lose attributes and classes we need? 
TODO: how this works for container blocks.

### Level 3: Enable Frontend block selection and Quanta Toolbar

Now that you have defined your blocks you get your frontend to render them.
In edit mode you can make blocks selectable using a tag that the bridge will
use to locate which html represents your block

This will enable an Editor to :-

- click directly on your block on the frontend preview to select it and edit the block settings in the sidebar.
  - The block will be highlighted and a toolbar (called the quanta toolbar) will appear above it.
- selecting a block in the sidebar will highlight that block on the frontend and scroll it 
  into view.
- If your block is rendered as multiple items give each one the same `data-block-uid`. 
  Selecting one will select all of them.

In your frontend insert the `data-block-uid={<<BLOCK_UID>>}` attribute to your outer most html element of the rendered block html.
(Note, this only needs to be done during editing)

So for our slider example, while editing we render our slider to include these extra data attributes.

``` html
<div class="slider" data-block-uid="....">
  <div>
    <div class="slide" data-block-uid="....">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b>hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide" data-block-uid="....">
      ...
    </div>
  </div>
  <a link="">Prev></a><a link="">Next></a>
</div>
```

Hydra.js will find these block markers and register click handlers and show a blue line around your blocks when selected.

#### Comment Syntax

If you can't modify the markup (e.g., using a 3rd party component library), use comment syntax to specify block attributes:

``` html
<!-- hydra block-uid=block-123 edit-text=title(.card-title) edit-media=url(img) edit-link=href(a.link) -->
<div class="third-party-card">
  <h3 class="card-title">Title</h3>
  <img src="image.jpg">
  <a class="link" href="...">Read more</a>
</div>
<!-- /hydra -->
```

- Attributes without selectors apply to the root element: `block-uid=xxx`
- Attributes with selectors target child elements: `edit-text=title(.card-title)`
- Closing `<!-- /hydra -->` marks end of scope
- Self-closing `<!-- hydra block-uid=xxx /-->` applies only to next sibling element

Supported attributes: `block-uid`, `block-readonly`, `edit-text`, `edit-link`, `edit-media`, `block-add`

#### Sub Blocks

You don't need a mark the element sub-blocks live in, but just render the blocks
with the uid like top level blocks.


``` html
<div class="slider" data-block-uid="....">
  <div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b data-node-id="...">hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      ...
    </div>
  </div>
  <a data-block-selector="-1" link="">Prev></a>
  <a data-block-selector="+1" link="">Next></a>
</div>
```

Note: 

- ```data-block-add="bottom|right"``` is useful if blocks are going to be added in a non standard direction. By default it will be the opposite of its parent.
- If you blocks are rendered with paging you can enable the UI allow selection of a block
  from the sidebar by tagging your paging buttons with 
  ```data-block-selector="-x|+y|<<block_uid>>>"```

##### Empty Blocks

For the UI work a blocks field can never be left empty. If the last child block
is deleted then while editing either the defaultBlockType will be added,
or if not defined a special block of type "empty" will be added.

- These will be stripped out before saving.
- they will have @type: "empty" and have a random id like any other block.
- You can render then how you like but ensure they take up teh space of a typical sub-block would
- hydra will put a "+" button in it's middle which the user can use to replace this block with the block type of their choice.
  - you can override the look of this button by rendering something else inside the empty block and adding ```data-block-add="button"``` to it.

### Level 4: Realtime changes while editing

Without this step any edits in the sidebar won't result in the preview pane changing.

To enable realtime preview first ensure the frontend used for editing is SPA or hydra,
ie can rerender the whole page client-side. 
(Note: you can still use SSG or SSR for your production frontend by using a different 
build of your frontend with client-side renderer enabled.)

Next the `onEditChange` callback can be registered with the hydra.js bridge at initialisation. Your frontend can now disable loading content via the api in editmode
and instead rely on content sent over the bridge via the callback in exactly the same
format as the content api 
[ploneClient](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

e.g.

``` js
const bridge = initBridge(..., onEditChange(handleEditChange));
```

Since the data structure is that same as returned by the contents [RESTApi](https://6.docs.plone.org/plone.restapi/docs/source/index.html) it's normally easy to rerender your page dynamically using the same
code your frontend used to render the page previously.

In addition to the preview changing as you type in the sidebar:

- click on '+' Icon directly on the frontend to add a block after the current block. This will make the BlockChooser popup appear.
   - The '+' Icon appears outside the corner of the element with ```data-block-uid="<<BLOCK_UID>>>"``` in the direction the block will be added.
- remove a block via the Quanta toolbar dropdown
- drag and drop and cut, copy and paste on the preview
- open or close the block settings
- multiple block selection to move, delete, or copy in bulk ([TODO](https://github.com/collective/volto-hydra/issues/104))
- and more ([TODO](https://github.com/collective/volto-hydra/issues/4))


### Level 5: Direct edit in your frontend

This is the most unique element of Hydra. Instead of the editor having to
work out where on the sidebar they need to go to make a change on their page
they can click directly on text, images and links and make those changes
directly on the frontend.

This requires no special components or choice of frontend framework.

This is done using ```data-edit-text|edit-media|edit-link="<<fieldname>>"``` and the element it is applied will now allow
direct html changes in your frontend which are then sent back to the CMS and reflected in the settings in the sidebar.

``` html
<div class="slide" data-block-uid="....">
  <img data-edit-media="image" src="/big_news.jpg"/>
  <h2 data-edit-text="title">Big News</h2>
  <div data-edit-text="description">Check out <b>hydra</b>, it will change everything</div>
  <div><a data-edit-link="url" href="/big_news" data-edit-text="buttonText">Read more</a><div>
</div>
```


#### Visual Text editing

If the field is simple text (no slate widget) the this will enable an Editor to :-
- click into the rendered text on the frontend and type, adding, removing and cut and pasting.
- type a "/" shortcut to change an empty text block
    - Using the enter key to split the block into two text blocks and backspace to join them

If the widget is slate, then Editor can also :-
- select text to see what formatting has been applied and can be applied via buttons on the quanta toolbar
- select text and apply character styles (currently BOLD, ITALIC & STRIKETHROUGH)
- create or edit linked text.
- apply paragraph formatting 
- use markdown shortcuts like bullet and heading codes ([TODO](https://github.com/collective/volto-hydra/issues/105))
- paste rich text from the clipboard (TODO)
- and more ([TODO](https://github.com/collective/volto-hydra/issues/5))

For rich text (slate) you add ```data-edit-text``` to the html element contains the rich text but in addition you
will also need insert ```data-node-id``` on each formatting element in your rendered slate text. This let's hydra.js
map your custom html to the internal data structure so formatting works as expected. (note these nodeids are only in
data returned by ```onEditChange```)

#### Renderer Node-ID Rules

When rendering Slate nodes to DOM, your renderer must follow these rules for `data-node-id`:

1. **Element nodes** (p, strong, em, etc.) must have `data-node-id` attribute matching the Slate node's `nodeId`
2. **Wrapper elements** - If you add extra wrapper elements around a Slate node (for styling or framework reasons),
   ALL wrapper elements must have the **same** `data-node-id` as the inner element representing the Slate node

**Why this matters:** hydra.js uses node-ids to map between Slate's data model and your DOM. When restoring cursor
position after formatting changes, it walks your DOM counting Slate children. Text nodes count as children, and
elements with unique node-ids count as children. Elements with duplicate node-ids (wrappers) are skipped.

**Example - Valid wrapper pattern:**
```html
<!-- Slate: { type: "strong", nodeId: "0.1", children: [{ text: "bold" }] } -->
<strong data-node-id="0.1"><b data-node-id="0.1">bold</b></strong>
```
Both `<strong>` and `<b>` have the same node-id, so they count as one Slate child.

**Example - Invalid (missing node-id on wrapper):**
```html
<!-- DON'T do this - span wrapper has no node-id -->
<span class="my-style"><strong data-node-id="0.1">bold</strong></span>
```
This breaks cursor positioning because hydra.js can't correlate DOM structure to Slate structure.

#### Complete Slate Rendering Example

**Slate data structure** (note: `value` is an array but always contains a single root node):
```json
{
  "value": [
    {
      "type": "p", "nodeId": "0",
      "children": [
        { "text": "Hello " },
        { "type": "strong", "nodeId": "0.1", "children": [{ "text": "world" }] },
        { "text": "! Visit " },
        { "type": "link", "nodeId": "0.3", "data": { "url": "/about" },
          "children": [{ "text": "our page" }] }
      ]
    }
  ]
}
```

**Renderer:**
```js
function renderSlate(nodes) {
  return (nodes || []).map(node => {
    if (node.text !== undefined) return escapeHtml(node.text);
    const tag = { p:'p', h1:'h1', h2:'h2', strong:'strong', em:'em', link:'a' }[node.type] || 'span';
    const attrs = node.type === 'link' ? ` href="${node.data?.url || '#'}"` : '';
    return `<${tag} data-node-id="${node.nodeId}"${attrs}>${renderSlate(node.children)}</${tag}>`;
  }).join('');
}
```

**Usage:**
```html
<div data-block-uid="block-1" data-edit-text="value">
  <!-- renderSlate(block.value) output goes here -->
</div>
```

Additionally your frontend can
- specify parts of the text that aren't editable by the user which could be needed for some use-cases where style includes text that needs to appear. (TODO)


#### Visual media uploading

This will enable an Editor to :-
- Be presented with a empty media element on the frontend and and a prompt to upload or pick media
- Remove the currently selected media to pick a different one 
- DND an image directly onto a media element on the frontend preview

#### Visual link editing


You might have a block with a link field like the Slide block. You can also make this visually
editable using ```data-edit-link```. In edit mode the click behaviour of that element will be disabled and instead
the editor can pick content to link to, enter an external url of open the url in a separate tab.


#### Allowed Navigation (data-linkable-allow)

Add `data-linkable-allow` to elements that should navigate during edit mode (paging links, facet controls, etc.):

``` html
<a href="/page?pg=2" data-linkable-allow>Next</a>
<select data-linkable-allow @change="handleFilter">...</select>
```


#### Path Syntax for Editing Parent or Page Fields

The `data-edit-text|edit-media|edit-link` attribute supports Unix-style paths to edit fields outside the current block:

- `fieldName` - edit the block's own field (default)
- `../fieldName` - edit the parent block's field
- `../../fieldName` - edit the grandparent's field
- `/fieldName` - edit the page metadata field

``` html
<!-- Edit the page title (not inside any block) -->
<h1 data-edit-text="/title">My Page Title</h1>

<!-- Edit the page description -->
<p data-edit-text="/description">Page description here</p>

<!-- Inside a nested block, edit the parent container's title -->
<h3 data-edit-text="../title">Column Title</h3>
```

This allows fixed parts of the page (like headers) to be editable without being inside a block.

#### Readonly Regions

Add `data-block-readonly` (or `<!-- hydra block-readonly -->` comment) to disable inline editing for all fields inside an element:

``` html
<div class="teaser" data-block-uid="teaser-1">
  <div data-block-readonly>
    <h2 data-edit-text="title">Target Page Title</h2>
  </div>
  <a data-edit-link="href" href="/target">Read more</a>
</div>
```

Or using comment syntax:

``` html
<!-- hydra block-readonly -->
<div class="listing-item" data-block-uid="item-1">...</div>
```


### Level 6: Custom UI

#### Custom sidebar/CMS UI

If the autogenerated sidebar UI of the block or content schemas is not suitable there is an addon system for the React Volto framework
to override CMS components. This could be at a widget level, block settings level or even whole views like contents or site settings.
For example you might want to provide a special map editor.

- https://6.docs.plone.org/volto/blocks/editcomponent.html

Note: Volto is built as a monolith CMS framework so ignore that parts of the documentation that apply to the presentation layer.

#### Custom Visual Editing (TODO)
In some cases you might want to provide editors with more visual editing inside the preview than hydra currently supports. For example a newly created table block 
might display a form to set the initial number of columns and rows. In this case you can use
- ```sendBlockUpdate``` hydra.js api to send an updated version of the block after changes. (TODO)
- ```sendBlockAction``` hydra.hs api to do actions like select,add, move, copy or remove blocks or perform custom actions on the Volto block edit component.
- You can disable hydra handling of selection, DND or other actions if you'd like to replace some parts of hydra and no others (TODO).

#### Custom API endpoints

With an open source headless CMS you have a choice between creating custom server side functionality as 
- a separately deployed microservice or 
- by [adding API endpoints as addons](https://2022.training.plone.org/mastering-plone/endpoints.html) to the backend api server. 



## How Hydra works

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing
a two way communication channel is opened across an iframe so that the editing UI is no longer
part of the frontend code. Instead a small js file called ```hydra.js``` is included in your frontend during editing
that handles the iframe bridge communication to hydra which is running in the same browser window. Hydra.js also 
handles small parts of UI that need to be displayed on the frontend during editing.

You could think of it as splitting Volto into two parts, Rendering and CMSUI/AdminUI while keeping the same UI and then 
making the Rendering part easily replaceable with other implementations.

```
                          Browser            RestAPI             Server              
                                                                                     
                                                                                     
                      ┌──────────────┐                       ┌─────────────┐         
                      │              │                       │             │         
   Anon/Editing       │    Volto     │◄─────────────────────►│    Plone    │         
                      │              │                       │             │         
                      └──────────────┘                       └─────────────┘         
                                                                                     
                                                                                     
─────────────────────────────────────────────────────────────────────────────────────
                                                                                     
                                                                                     
                  │   ┌──────────────┐                       ┌─────────────┐         
                  │   │              │                       │             │         
                  │   │   Frontend   │◄──────────────────────┤    Plone    │         
                  │   │              │                       │             │         
                  │   └──hydra.js────┘                       └─────────────┘         
                  │          ▲                                  ▲                    
   Editing       UI          │ iFrame Bridge                    │                    
                  │          ▼                                  │                    
                  │   ┌──────────────┐                          │                    
                  │   │              │                          │                    
                  │   │    Hydra     │◄─────────────────────────┘                    
                  │   │              │                                               
                  │   └──────────────┘                                               
                                                                                     
                                                                                     
                      ┌──────────────┐                       ┌─────────────┐         
                      │              │                       │             │         
   Anon               │   Frontend   │◄──────────────────────┤    Plone    │         
                      │              │                       │             │         
                      └──────────────┘                       └─────────────┘         
             
```
 
## Building a Frontend for Headless Plone

The actual code you will write will depend on the framework you choose. You can look these examples to help you.

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

The steps involved in creating a frontend are roughly the same for all these frameworks

1. Create a route for any path which goes to a single page.
   - e.g. in Nuxt.js you create a file ```pages/[..slug].vue```
2. The page has a template with the static parts of your theme like header and footer etc.
   1. You might also check the content type to render each differently.
3. On page setup it takes the path, does a [RESTAPI call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the json for this page
   - You can either use plone/client for this 
   - but in some frameworks, such as Nuxt.js, is better to use their inbuilt fetch.
   - You can also [Plone GraphQL api](https://2022.training.plone.org/gatsby/data.html) 
     - however note this is just a wrapper on the RESTAPI rather than a server side implementation so it's not more efficient than using the RESTAPI directly.
4. In your page template fill title etc from the content metadata
5. For navigation
   1. adjust the contents api call to use [@expand](https://6.docs.plone.org/volto/configuration/expanders.html) and return [navigation data](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) in the same call
   2. Create a component for your top level nav that uses this nav json to create a menu
6. For Blocks
   1. create Block component that takes the id and block json as arguments
   2. You can use a bunch of if statements to check the Block type to determine how to render than block
   3. If the block is a container you can call the Block component recursively
   4. In your page iterate down the ```blocks_layout``` list and render a Block component for each
   5. Rendering Slate you will want to split into a separate component as it's used in many blocks and is also recursive
7. There are several helper functions get reused in many blocks
   1. Generating a url for links. All RESTAPI urls are relative to the api url, so you need to convert these to the right frontend url. 
   2. Generating a url for an image. The blocks have image data in many formats so a helper function for this is useful.
      1. You maybe also decide to use your framework or hosting solution for image resizing
8. Listing Blocks
   - Use the [Listing Helpers](#listing-helpers) or do your own [RESTAPI call to query the items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)
   - You can come up with your own pagination scheme (e.g., embed page in URL for static generation)
   - Render the items and pagination
9. Redirects
   1. if your contents call results in a redirect then you will need also do an internal redirect in the framework so the path shown is correct
   2. if you are using SSG then you will need to some special code to [query all the redirects](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/aliases.html#listing-all-available-aliases-via-json) at generate time add in redirect routes
10. Error Pages
    1. If your [RESTAPI call returns an error](https://6.docs.plone.org/plone.restapi/docs/source/http-status-codes.html) you will need to handle this within the framework to display the error and set the status code
11. Search Blocks
    - if you choose to allow Voltos builtin Search Block for end user customisable search
    - you will need to render Facets/Filters (currently not as subblocks but this could change in the future)
    - build your query and do [RESTAPI call to query the items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html) 
12. Form Blocks
    - Form-block is a plugin that allows a visual form builder
    - Currently not a container with sub-blocks but this could change in the future
    - Render each field type component (or limit which are available)
    - Produce a compatible json submission to the form-block endpoint
    - handle field validation errors
    - handle thank you page


## Listings and dynamic blocks

A listing block fetches content from the server (e.g. latest news) and renders each result as a separate block. Since the query runs client-side, Hydra provides two helpers to handle this:

- **`staticBlocks(ids, { blocks, paging })`** — returns block objects you can render immediately
- **`expandListingBlocks(ids, { blocks, paging, ... })`** — async; fetches query results and returns expanded block objects

Both take an array of block IDs and return an array of block objects with `@uid` (the block ID for `data-block-uid`) and `@type` (the block type for choosing a renderer). Both accept a shared `paging` object that gets mutated with page totals.

### How expandListingBlocks works

`expandListingBlocks` is backend-agnostic. You provide a `fetchItems` callback that fetches content items from your backend — Hydra handles shared paging across multiple listings and maps results to block objects via `fieldMapping`.

**Fetching — sequential single-pass**

`expandListingBlocks` walks listings in layout order, fetching each one sequentially. Each `fetchItems` call returns `{ items, total }`, so the total is learned from the response and used to compute where the next listing starts — no separate "get totals" phase needed. This means one request per listing instead of two. Listings before or after the page window are fetched with `size: 0` (total only).

For Plone backends, use the provided `ploneFetchItems` helper:

```js
import { expandListingBlocks, ploneFetchItems } from '@volto-hydra/hydra-js';

const items = await expandListingBlocks(layout, {
  blocks, paging,
  fetchItems: ploneFetchItems({ apiUrl, contextPath, extraCriteria }),
});
```

For non-Plone backends, provide your own `fetchItems`:

```js
const items = await expandListingBlocks(layout, {
  blocks, paging,
  fetchItems: async (block, { start, size }) => {
    const res = await fetch(`/api/search?offset=${start}&limit=${size}`);
    const data = await res.json();
    return { items: data.results, total: data.count };
  },
});
```

**Mapping (generic)**

After fetching, each query result is converted to a block object using `fieldMapping` — a whitelist stored on the listing block data. Only mapped fields end up on the item block:

- Each result becomes a block with `@type` set to the listing's item type (`variation` field, default `summaryItem`)
- `fieldMapping` keys are source fields from query results; values specify the target field and optional type conversion
- Values can be a plain string (`"title": "title"` — simple rename) or an object with `field` and `type` (`"@id": { "field": "href", "type": "link" }` — rename + type conversion)
- `itemDefaults` (from the listing's `itemDefaults_*` flat keys) are spread onto each item block
- If no `fieldMapping` is saved, a built-in default is used: `{ "@id": "href", "title": "title", "description": "description", "image": "image" }`

**Type conversions**

When a mapping specifies a `type`, `expandListingBlocks` converts the source value to match the target block field's expected format:

| Type | Conversion |
|------|-----------|
| `string` | Arrays → joined with `", "`; image objects → resolved URL string; others → `String(value)` |
| `link` | Wraps string URL as Volto link array: `[{ "@id": url }]`; arrays pass through |
| `image` | Pass through (use with `ploneFetchItems` which packages image data as `{ "@id", image_field, image_scales }`) |
| `array` | Wraps non-arrays in `[value]`; arrays pass through |
| _(none)_ | No conversion — value is copied as-is |

The admin UI's `FieldMappingWidget` automatically detects the target field type from the block schema (e.g., `object_browser` with `mode=link` → `link`, `widget=image` → `image`) and stores the `{ field, type }` format.

### Example: Mixing listings, blocks and paging

A grid has a mix of listing and other blocks but we want a single pager
at the bottom. The listings use suspense so they load client-side.

```jsx
import { Suspense } from 'react';
import { staticBlocks, expandListingBlocks, ploneFetchItems } from '@volto-hydra/hydra-js';

function Grid({ blocks, blocks_layout, pageNum }) {
  const paging = { start: pageNum * 6, size: 6 };
  const fetchItems = ploneFetchItems({ apiUrl, contextPath });

  return (
    <div className="grid">
      {blocks_layout.items.map(id =>
        blocks[id]['@type'] === 'listing' ? (
          <Suspense key={id} fallback={<div>Loading...</div>}>
            <ListingItems id={id} blocks={blocks} paging={paging} fetchItems={fetchItems} />
          </Suspense>
        ) : (
          staticBlocks([id], { blocks, paging }).map(item =>
            <Block key={item['@uid']} block={item} />
          )
        )
      )}
      <Suspense>
        <PagingWhenReady paging={paging} />
      </Suspense>
    </div>
  );
}

async function ListingItems({ id, blocks, paging, fetchItems }) {
  const items = await expandListingBlocks([id], {
    blocks, paging, fetchItems,
  });
  return items.map(item => <Block key={item['@uid']} block={item} />);
}

async function PagingWhenReady({ paging }) {
  await paging._ready;  // resolves after all expandListingBlocks calls complete
  if (paging.totalPages <= 1) return null;
  return (
    <nav>
      {paging.prev != null && <a href={`?start=${paging.prev * paging.size}`}>Prev</a>}
      {paging.pages.map(p =>
        <a key={p.page} href={`?start=${p.start}`}
           className={p.page === paging.currentPage + 1 ? 'active' : ''}>
          {p.page}
        </a>
      )}
      {paging.next != null && <a href={`?start=${paging.next * paging.size}`}>Next</a>}
    </nav>
  );
}
```

See [BlockExpander.vue](./examples/nuxt-blog-starter/components/BlockExpander.vue) for a Vue equivalent.

### expandListingBlocks options

| Option | Default | Description |
|--------|---------|-------------|
| `blocks` | — | Map of blockId to block data |
| `paging` | — | Shared paging object `{ start, size }` (mutated in-place with computed values — see below) |
| `fetchItems` | — | `async (block, { start, size }) => { items, total }` — fetches content items from your backend |
| `itemTypeField` | `'itemType'` | Field on the listing block that holds the item type |
| `defaultItemType` | `'summaryItem'` | Fallback type when field is not set |

### ploneFetchItems options

`ploneFetchItems` is a factory that returns a `fetchItems` callback for Plone's `@querystring-search` endpoint:

| Option | Default | Description |
|--------|---------|-------------|
| `apiUrl` | — | Plone site URL (e.g., `'http://localhost:8080/Plone'`) |
| `contextPath` | `'/'` | Path for relative queries |
| `extraCriteria` | `{}` | Additional query params — `SearchableText`, `sort_on`, `sort_order`, `facet.*` keys |

Internally uses `buildQuerystringSearchBody` to construct Plone query bodies. A listing with no `querystring` defaults to showing current folder contents in folder order (`relativePath: '.'`, `sort_on: 'getObjPositionInParent'`).

**Image normalization**: `ploneFetchItems` packages Plone's `image_field` + `image_scales` into a self-contained `image` object on each result item. The item's `@id` is duplicated inside the image object (needed by `imageProps` as a base URL for resolving relative `download` paths):

```js
// Plone search result:
{ "@id": "/news/article", image_field: "image", image_scales: { image: [{ ... }] }, ... }

// After ploneFetchItems normalization:
{ "@id": "/news/article", image: { "@id": "/news/article", image_field: "image", image_scales: { image: [{ ... }] } }, ... }
```

This means `fieldMapping` can map `"image"` to any image-type field and frontends can use `imageProps(item.image)` to resolve URLs with scale support. For non-Plone backends, your `fetchItems` should return items with whatever image format your frontend expects.

### fetchItems contract

Your `fetchItems` callback receives a listing block object and a `{ start, size }` pair:

- **`start`**: zero-based offset into this listing's results
- **`size`**: number of items to return (0 means return no items, just the total)
- **Returns**: `{ items: [...], total: number }` where `total` is the full count (not just this page)

Each item in `items` should have the fields referenced in the listing block's `fieldMapping` (typically `@id`, `title`, `description`, and `image`). For Plone, `ploneFetchItems` normalizes image data into a self-contained `image` object (see above). For other backends, return items with whatever field names and formats your frontend expects.

### Item type and field mapping

Each expanded listing item gets `@type` from the listing block's `variation` field (or `itemType` — controlled by `itemTypeField` option), defaulting to `'default'`. The item's fields are populated from query results via the listing block's `fieldMapping`.

The admin UI computes `fieldMapping` automatically from the selected item type's `fieldMappings['@default']` (see [Block conversion](#block-conversion)). For example, selecting `teaser` as the variation auto-populates:

```json
"fieldMapping": {
  "@id": { "field": "href", "type": "link" },
  "title": "title",
  "description": "description",
  "image": "preview_image"
}
```

Values are either a string (simple rename) or `{ field, type }` (rename + type conversion). The `type` is auto-detected from the target block's schema — e.g., an `object_browser` field with `mode=link` gets type `"link"`, which tells `expandListingBlocks` to wrap the `@id` string as `[{ "@id": value }]`.

This mapping is saved to the block data, so `expandListingBlocks` can apply it without access to the block registry. It acts as a whitelist: only source fields listed in the mapping end up on the item block.

**Built-in item types:**

| Type | Fields | Description |
|------|--------|-------------|
| `default` | `title`, `description`, `href` | Title + description |
| `summary` | `title`, `description`, `href`, `image` | Title + description + image thumbnail |
| `teaser` | `title`, `description`, `href`, `preview_image` | Full teaser card |

You can add custom item types or use `inheritSchemaFrom` to let editors choose:

```js
listing: {
  schemaEnhancer: inheritSchemaFrom('variation', 'fieldMapping', 'itemDefaults', {
    filterConvertibleFrom: '@default',
    title: 'Item Type',
    default: 'summaryItem',
  }),
}
```

### Paging values

You pass `{ start, size }` — both helpers mutate it with computed values:

| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | `number` | Zero-based current page index |
| `totalPages` | `number` | Total number of pages |
| `totalItems` | `number` | Total item count across all blocks |
| `prev` | `number \| null` | Previous page index, or `null` on first page |
| `next` | `number \| null` | Next page index, or `null` on last page |
| `pages` | `array` | Window of ~5 page objects: `{ start, page }` where `page` is 1-based |
| `_ready` | `Promise` | Resolves after all `expandListingBlocks` calls complete (for async paging UI) |

### Notes

- Expanded listing items share the listing block's `@uid`. Selecting any expanded item selects the parent listing block.
- `fieldMapping` must be persisted in the block data. The admin UI computes it from the item type's `fieldMappings['@default']` and saves it. Without a saved `fieldMapping`, `expandListingBlocks` falls back to a built-in default mapping: `{ "@id": "href", "title": "title", "description": "description", "image": "image" }`.
- The `fieldMapping` format supports both legacy string values (`"title": "title"`) and the new `{ field, type }` format (`"@id": { "field": "href", "type": "link" }`). The admin UI's `FieldMappingWidget` auto-detects the type from the target block schema and saves the appropriate format.

## Templates

Templates allow editors to centrally control content and reuse content. They allow
a developer to not have to hard code some layout decisions and instead can use rules
to apply user layouts in template content stored separate from the page, or give the 
user a choice on which layout they want.

Templates

- can be created from any blocks
- are always edited in-context in the current page 
  (user can switch in and out of template edit mode)
- are saved along side the page into normal content so editing template
  permissions can use content permissions
- allowedTemplates and allowedLayouts applied to the blocks schema let the 
  developer control loading templates, which templates are available for use 
  which templates are automatically applied as layouts or available for switching.
- During rendering frontend can use the provided helper to refresh templates found 
  in the page content from the template content, apply layouts based on rules (such 
  as fixing a layout based on content type, or metadata. Alternatively they can write
  their own merge logic.


### Template Concepts

Templates are alagous to blocks themselves but are made up of blocks themselves 
with special properties:
- **Fixed + ReadOnly**: Can't be edited or moved (e.g., branded headers/footers)
  - similar to a blocks fixed hard coded html 
- **Fixed**: Can be edited but not moved (e.g., required sections)
  - similar to a block field 
- **Placeholder**: Named slots where editors can add their own blocks
  - similar to a block field 

```json
{
  "blocks": {
    "header": { "@type": "slate", "fixed": true, "readOnly": true, "placeholder": "header" },
    "content": { "@type": "slate", "placeholder": "default" },
    "footer": { "@type": "slate", "fixed": true, "readOnly": true, "placeholder": "footer" }
  }
}
```

### allowedTemplates vs allowedLayouts

Configure templates in `page.schema.properties`:

```js
initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: {
          allowedTemplates: ['/templates/form-snippet'],   // Insert via BlockChooser
          allowedLayouts: ['/templates/article-layout'],   // Apply via Layout dropdown
        },
      },
    },
  },
});
```

- **allowedTemplates**: Templates shown in BlockChooser's "Templates" group, inserted as blocks
- **allowedLayouts**: Templates shown in Layout dropdown, replace/merge entire container content. A value of `null` allows for a no template option. If none of those templates are already set as the layout then during editing, the first is applied automatically.

### Applying Merge rules

Use `expandTemplates` (async) or `expandTemplatesSync` (sync with pre-fetched templates) to merge template content during rendering.

**Edit Mode:** These functions automatically detect edit mode via `isEditMode()` and pass blocks through unchanged (just adding `@uid`). This is because the admin handles template merging and adds `nodeId` attributes for inline editing. On SSR (no `window`), `isEditMode()` returns `false` so templates are expanded - this is correct since edit mode only exists in the browser iframe.

**Sync vs Async:**
- `expandTemplatesSync` - Use when templates are pre-fetched at page load. Better for Vue computed properties since it's synchronous.
- `expandTemplates` - Use when you need to lazy-load templates on demand. Handles on-demand loading of forced layouts not in page data.

**Pre-loading with `loadTemplates`:**

`loadTemplates(data, loadTemplate)` scans page data for `templateId` references and loads them all in parallel. It follows nested references (templates referencing other templates) and has a 5s per-template timeout. It only loads templates actually in the page data — `allowedLayouts` options are loaded on demand when a forced layout is applied.

All frontends and the admin use this with their own fetch callback:

```js
import { loadTemplates, expandTemplatesSync, expandTemplates } from '@hydra-js/hydra.js';

const loadTemplate = async (id) => fetch(`${apiBase}${id}`).then(r => r.json());

// Sync approach: pre-fetch templates at page level, use in computed properties
const templates = await loadTemplates(pageData, loadTemplate);
const templateState = {};  // Share across all expandTemplatesSync calls
const items = expandTemplatesSync(layout, { blocks, templateState, templates });

// Async approach: load templates on demand
const items = await expandTemplates(layout, {
  blocks,
  templateState: {},
  loadTemplate: async (id) => fetch(id).then(r => r.json())
});

// Render items - each has @uid for the block ID
for (const item of items) {
  renderBlock(item['@uid'], item);
}
```

**Options:**
- `blocks`: Map of blockId -> block data
- `templateState`: Pass `{}` and share across calls - tracks state for nested containers
- `templates`: (sync only) Pre-fetched map of templateId -> template data
- `loadTemplate(id)`: (async only) Function to fetch template content
- `allowedLayouts`: Force a layout when container has no template applied

The merge algorithm follows these rules

1. Remove the blocks with the templateid to replace, storing any that aren't fixed and
   readonly by placeholder name.
2. insert in their place the template content
   - if fixed and readonly just insert it
   - if fixed, copy the block content not including block fields from a page block with 
    the same placeholder name
   - if a placeholder then don't insert it, but insert the previous blocks with the same
    placeholder name
3. Recursively replace any block fields using the same rules.
4. Any placeholder blocks left over are inserted at the end of a special placeholder called
  ```default``` if it exits, otherwise are dropped.

When are layout is applied the rules are the same but applied across a whole blocks field.
So any content in the blocks field is removed first and if it doesn't already have a 
placeholder name (due to a different template previously applied), then it will end up
- in the default placeholder if it exists, else
- in the bottom placeholder outside the last fixed template block if it exists, else
- in the the top placeholder outside the first fixed template block if it exists, else
- it is dropped

This allows for templates with shared placeholder names to rearrange user content.

```
Before:  [User Block A] [User Block B]
Layout:  [Fixed Header] [default] [Fixed Footer] [post_footer]
After:   [Fixed Header] [User Block A] [User Block B] [Fixed Footer]
```

Your frontend might want to force a layout to apply regardless of whether one is saved,
for example to ensure a footer layout. Pass `allowedLayouts`:

```js
// Sync (with pre-fetched templates)
const items = expandTemplatesSync(layout, {
  blocks, templateState, templates,
  allowedLayouts: ['/templates/footer-layout'],
});

// Async
const items = await expandTemplates(layout, {
  blocks, templateState: {}, loadTemplate,
  allowedLayouts: ['/templates/footer-layout'],
});
```

Note, during editing admin side will load the templates so in order to apply the 
same rules of forcing a layout you will need to set `allowedLayouts` in `page.schema.properties`
to ensure the page loads with the right template.


## Advanced

#### Lazy Load the Hydra.js Bridge

Detect the admin iframe and load the bridge only when needed:

**`window.name`** is set by Hydra to indicate mode:
- `hydra-edit:<origin>` - edit mode (e.g., `hydra-edit:http://localhost:3001`)
- `hydra-view:<origin>` - view mode (e.g., `hydra-view:http://localhost:3001`)

This persists across SPA navigation within the iframe, allowing your frontend to detect it's in the admin even after client-side route changes.

In view mode, render from your API immediately but still load the bridge for navigation tracking.
In edit mode, wait for `onEditChange` before rendering.

```js
function loadBridge(callback) {
    const existingScript = document.getElementById("hydraBridge");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "your-hydra-js-path";
      script.id = "hydraBridge";
      document.body.appendChild(script);
      script.onload = () => callback();
    } else {
      callback();
    }
}

const isHydraEdit = window.name.startsWith('hydra-edit:');
const isHydraView = window.name.startsWith('hydra-view:');
const inAdminIframe = isHydraEdit || isHydraView;

// View mode or not in admin: render from API
if (!isHydraEdit) {
    renderPage(await fetchContent(path));
}

// Load bridge only in admin iframe
if (inAdminIframe) {
    loadBridge(() => {
        initBridge({
            onEditChange: (formData) => renderPage(formData),
        });
    });
}
```


#### Authenticate frontend to access private content

As soon as the editor logs into the hydra editor it will load up the frontend into an iframe.
Your frontend should now use the same auth token so the you access the restapi with the same privileges and
can render the same content including private content.

The `access_token` is passed as a URL parameter on initial load and automatically stored in sessionStorage by hydra.js. This means:
- On initial load, the token is in the URL and stored to sessionStorage
- On SPA navigation (client-side route changes), the URL param is gone but the token persists in sessionStorage

Use the `getAccessToken()` helper from hydra.js which handles both cases:
```js
import { getAccessToken } from '@hydra-js/hydra.js';

const token = getAccessToken();
// Returns token from URL param (if present) or sessionStorage (for SPA navigation)
```

Example using nextjs 14 and ploneClient:
```js
// nextjs 14 using ploneClient
import ploneClient from "@plone/client";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from '@hydra-js/hydra.js';

export default function Blog({ params }) {
  const token = getAccessToken();

  const client = ploneClient.initialize({
    apiPath: "http://localhost:8080/Plone/", // Plone backend
    token: token,
  });

  const { getContentQuery } = client;
  const { data, isLoading } = useQuery(getContentQuery({ path: '/blogs' }));

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <div> {data.title}</div>
  )
}
```

#### Preventing reloads ([TODO](https://github.com/collective/volto-hydra/issues/55))
If you wish to make the editing experience smoother you can register for ```onRoute``` callbacks to prevent the frontend being forced to reload
at certain times using the hydra editor.

