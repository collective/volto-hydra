---
"@type": Plone Site
UID: plone_site_root
allow_discussion: null
contributors: []
creators:
  - admin
description: Design-system-first page building. Strike the right balance for
  your site — make it easy for editors to create engagement while staying
  compliant.
effective: null
exclude_from_nav: false
expires: null
id: Plone
is_folderish: true
language: "##DEFAULT##"
review_state: null
rights: ""
subjects: []
table_of_contents: null
title: Inka
assignments:
  - { uid: hero-headline, type: slate }
  - { uid: hero-subhead, type: slate }
  - { uid: hero-cta, type: slate }
  - { uid: why-hydra-heading, type: slate }
  - { uid: why-hydra-tagline, type: slate }
  - { uid: why-hydra-quadrant, type: image }
  - { uid: why-hydra-grid, type: gridBlock }
  - { uid: box-visual, type: slate }
  - { uid: box-frontend, type: slate }
  - { uid: box-enterprise, type: slate }
  - { uid: box-opensource, type: slate }
  - { uid: quickstart-heading, type: slate }
  - { uid: quickstart-code, type: codeExample }
  - { id: tab-nuxt }
  - { id: tab-nextjs }
  - { id: tab-svelte }
  - { id: tab-vanilla }
  - { id: tab-astro }
  - { uid: 303984b4-693a-408f-83f7-5a88b243d7db, type: slider }
  - { uid: fae599f3-e7d4-451b-a413-84355c796b7e, type: gridBlock }
  - { uid: c9f92df8-81fd-4259-a149-5c8798735350, type: slate }
  - { uid: d78b666f-b07b-4036-9853-efe6263515aa, type: slate }
  - { uid: d105783c-fa27-4c92-a3d9-6323adbe5e72, type: slate }
  - { uid: 0ab1a8f7-2d26-4933-800c-2f10474afe63, type: separator }
  - { uid: e972541f-b114-494b-a51e-cc8b11c8207d, type: slate }
  - { uid: 9567ae6d-191c-43f1-91cc-4288bbb98f88, type: slate }
  - { uid: 0d0c0506-f9bb-48d8-af0a-1352d81b45de, type: slate }
  - { uid: 2fac7e5d-affb-4a8e-969f-2fac4d08e0fd, type: slate }
prototypes: |
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
order:
  - templates
  - images
  - docs
  - search
blobs:
  - file: image.png
    uid: a5bf990b119747c4b2855fedc1ea0185
    id: plone-foundation.png
    title: Plone Foundation Logo
    exclude_from_nav: false
---

<block type="slate">

# Design-system-first page building

</block>

Strike the right balance for your site. Make it easy for editors to create engagement — while staying compliant.

<block type="slate">

[Try the demo](https://hydra.pretagov.com/login?return_url=/)  ·  [Source on GitHub](https://github.com/collective/volto-hydra)

<fields data='{"styles":{"backgroundColor":"grey"}}' />

</block>

## Why Inka

Compliance or engagement is a false choice. You decide where the dial sits for each site.

<block type="image" align="center" size="l" url="/images/quadrant/@@download/image/quadrant.svg" />

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"children":[{"text":"Visual Editing"}],"type":"strong"}],"type":"p"},{"children":[{"text":"True WYSIWYG with drag-and-drop blocks. No special frontend framework required — just HTML attributes."}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"children":[{"text":"Multi frontend, multi backend"}],"type":"strong"}],"type":"p"},{"children":[{"text":"Use React, Vue, Nuxt, Next.js or any stack, and switch channels mid-edit."}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"children":[{"text":"Truly Decoupled"}],"type":"strong"}],"type":"p"},{"children":[{"text":"Your frontend is independent code you own. Upgrade the CMS without rewriting your site; switch frameworks and get the same editing experience."}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"children":[{"text":"Open Source"}],"type":"strong"}],"type":"p"},{"children":[{"text":"Secure, scalable Plone backend. Host anywhere, control your costs and security."}],"type":"p"}]}' />

</block>

## Quick Start

<block type="codeExample">

### Nuxt.js

```vue
<!-- pages/[...slug].vue -->
<template>
  <!-- data-block-uid: makes block selectable, draggable, and editable -->
  <div v-for="id in page?.blocks_layout?.items" :key="id"
       :data-block-uid="editing ? id : undefined">
    <!-- data-edit-link: click to edit link URL in sidebar -->
    <a :href="page.blocks[id].link"
       :data-edit-link="editing ? 'link' : undefined">
      <!-- data-edit-media: click to pick/upload image in sidebar -->
      <img :src="page.blocks[id].image"
           :data-edit-media="editing ? 'image' : undefined" />
      <!-- data-edit-text: edit text directly in the preview -->
      <h3 :data-edit-text="editing ? 'title' : undefined">
        {{ page.blocks[id].title }}
      </h3>
      <p :data-edit-text="editing ? 'description' : undefined">
        {{ page.blocks[id].description }}
      </p>
    </a>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { initBridge } from 'hydra-js'

const page = ref(null)
const editing = ref(false)

onMounted(async () => {
  // Only init bridge when loaded inside the editor
  if (window.name.startsWith('hydra')) {
    editing.value = true
    initBridge({
      // Register custom block types with their field schemas
      blocks: {
        card: { blockSchema: { properties: {
          image: { widget: 'image' },
          title: { type: 'string' },
          description: { type: 'string' },
          link: { widget: 'url' },
        }}}
      },
      // Receive live updates as editor changes content
      onEditChange: (data) => { page.value = data }
    })
  } else {
    const res = await fetch(`/++api++${useRoute().path}`)
    page.value = await res.json()
  }
})
</script>
```

### Next.js

```jsx
// app/[...slug]/page.jsx
'use client'
import { useState, useEffect } from 'react'
import { initBridge } from 'hydra-js'

export default function Page({ params }) {
  const [page, setPage] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    // Only init bridge when loaded inside the editor
    if (window.name.startsWith('hydra')) {
      setEditing(true)
      initBridge({
        // Register custom block types with their field schemas
        blocks: {
          card: { blockSchema: { properties: {
            image: { widget: 'image' },
            title: { type: 'string' },
            description: { type: 'string' },
            link: { widget: 'url' },
          }}}
        },
        // Receive live updates as editor changes content
        onEditChange: setPage
      })
    } else {
      fetch(`/++api++/${params.slug?.join('/') || ''}`)
        .then(r => r.json()).then(setPage)
    }
  }, [])

  if (!page) return <div>Loading...</div>

  return page.blocks_layout?.items?.map(id => {
    const block = page.blocks[id]
    return (
      // data-block-uid: makes block selectable, draggable, and editable
      <div key={id} data-block-uid={editing ? id : undefined}>
        {/* data-edit-link: click to edit link URL in sidebar */}
        <a href={block.link}
           data-edit-link={editing ? 'link' : undefined}>
          {/* data-edit-media: click to pick/upload image in sidebar */}
          <img src={block.image}
               data-edit-media={editing ? 'image' : undefined} />
          {/* data-edit-text: edit text directly in the preview */}
          <h3 data-edit-text={editing ? 'title' : undefined}>
            {block.title}
          </h3>
          <p data-edit-text={editing ? 'description' : undefined}>
            {block.description}
          </p>
        </a>
      </div>
    )
  })
}
```

### SvelteKit

```svelte
<!-- src/routes/[...slug]/+page.svelte -->
<script>
  import { onMount } from 'svelte'
  import { initBridge } from 'hydra-js'

  let page = $state(null)
  let editing = $state(false)

  onMount(async () => {
    // Only init bridge when loaded inside the editor
    if (window.name.startsWith('hydra')) {
      editing = true
      initBridge({
        // Register custom block types with their field schemas
        blocks: {
          card: { blockSchema: { properties: {
            image: { widget: 'image' },
            title: { type: 'string' },
            description: { type: 'string' },
            link: { widget: 'url' },
          }}}
        },
        // Receive live updates as editor changes content
        onEditChange: (data) => { page = data }
      })
    } else {
      const res = await fetch(`/++api++${window.location.pathname}`)
      page = await res.json()
    }
  })
</script>

{#if page}
  {#each page.blocks_layout?.items ?? [] as id}
    <!-- data-block-uid: makes block selectable, draggable, and editable -->
    <div data-block-uid={editing ? id : undefined}>
      <!-- data-edit-link: click to edit link URL in sidebar -->
      <a href={page.blocks[id].link}
         data-edit-link={editing ? 'link' : undefined}>
        <!-- data-edit-media: click to pick/upload image in sidebar -->
        <img src={page.blocks[id].image}
             data-edit-media={editing ? 'image' : undefined} />
        <!-- data-edit-text: edit text directly in the preview -->
        <h3 data-edit-text={editing ? 'title' : undefined}>
          {page.blocks[id].title}
        </h3>
        <p data-edit-text={editing ? 'description' : undefined}>
          {page.blocks[id].description}
        </p>
      </a>
    </div>
  {/each}
{/if}
```

### HTML/JS

```html
<!-- index.html -->
<div id="content"></div>
<script type="module">
  import { initBridge } from 'hydra-js'

  let editing = false

  // Only init bridge when loaded inside the editor
  if (window.name.startsWith('hydra')) {
    editing = true
    initBridge({
      // Register custom block types with their field schemas
      blocks: {
        card: { blockSchema: { properties: {
          image: { widget: 'image' },
          title: { type: 'string' },
          description: { type: 'string' },
          link: { widget: 'url' },
        }}}
      },
      // Receive live updates as editor changes content
      onEditChange: renderPage
    })
  } else {
    const res = await fetch(`/++api++${location.pathname}`)
    renderPage(await res.json())
  }

  function renderPage(page) {
    const el = document.getElementById('content')
    el.innerHTML = page.blocks_layout.items.map(id => {
      const b = page.blocks[id]
      return `
        <!-- data-block-uid: makes block selectable, draggable, and editable -->
        <div ${editing ? `data-block-uid="${id}"` : ''}>
          <!-- data-edit-link: click to edit link URL in sidebar -->
          <a href="${b.link}"
             ${editing ? 'data-edit-link="link"' : ''}>
            <!-- data-edit-media: click to pick/upload image in sidebar -->
            <img src="${b.image}"
                 ${editing ? 'data-edit-media="image"' : ''} />
            <!-- data-edit-text: edit text directly in the preview -->
            <h3 ${editing ? 'data-edit-text="title"' : ''}>
              ${b.title}
            </h3>
            <p ${editing ? 'data-edit-text="description"' : ''}>
              ${b.description}
            </p>
          </a>
        </div>`
    }).join('')
  }
</script>
```

### Astro

```astro
<!-- src/pages/[...slug].astro
     First paint and every subsequent render come from /api/render —
     blocks are rendered server-side by .astro components via Astro's
     Container API. Same pattern works for PHP, Django, Rails, Laravel:
     see docs/server-rendered-frontends.md -->
<!DOCTYPE html>
<html>
  <body>
    <div id="content"></div>
    <script>
      import { initBridge } from 'hydra-js'
      if (window.name.startsWith('hydra')) {
        initBridge({
          // Register custom block types with their field schemas
          blocks: {
            card: { blockSchema: { properties: {
              image: { widget: 'image' },
              title: { type: 'string' },
              description: { type: 'string' },
              link: { widget: 'url' },
            }}}
          },
          // Server-render mode (Storyblok-style): the bridge POSTs each
          // smallest-changed-unit to renderEndpoint and swaps the
          // returned HTML into renderContainer.
          renderEndpoint: '/api/render',
          renderContainer: '#content',
        })
      }
    </script>
  </body>
</html>

// src/pages/api/render.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import BlockRenderer from '../../components/BlockRenderer.astro'

export const POST = async ({ request }) => {
  const { unit, formData } = await request.json()
  const container = await AstroContainer.create()
  // BlockRenderer.astro emits data-block-uid + data-edit-* attributes —
  // same DOM contract as the other tabs, just produced server-side.
  const html = await container.renderToString(BlockRenderer, {
    props: { unit, formData },
  })
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
```

</block>

<block type="slider" data='{"autoplayDelay":4000,"autoplayEnabled":false,"autoplayJump":false,"slides":[{"@id":"b09f39ea-36c3-4f09-9a18-30aef3565a22","buttonText":"See all Content Types","description":"You can log in and experience currently working features (Volto like but on any frontend)","flagAlign":"left","head_title":"Welcome to Inka","href":[{"@id":"/docs/examples/content-types","@type":"Document","Description":"This section has a sample of content types available in this site.","Title":"Content Types","hasPreviewImage":null,"head_title":null,"image_field":"image","title":"Content Types"}],"preview_image":[{"@id":"/images/penguin1.jpg","@type":"Image","CreationDate":"2024-03-07T12:29:54+01:00","Creator":"admin","Date":"2024-03-07T12:30:08+01:00","Description":"","EffectiveDate":"None","ExpirationDate":"None","ModificationDate":"2024-03-07T12:30:08+01:00","Subject":[],"Title":"testimage","Type":"Bild","UID":"9abc1a813bcf46388e565b277bd8c6bf","author_name":null,"cmf_uid":null,"commentators":[],"created":"2024-03-07T11:29:54+00:00","description":"","effective":"1969-12-30T23:00:00+00:00","end":null,"exclude_from_nav":false,"expires":"2499-12-30T23:00:00+00:00","getIcon":true,"getId":"testimage.jpg","getObjSize":"2.0 MB","getPath":"/Plone/testimage.jpg","getRemoteUrl":null,"getURL":"http://localhost:3000/testimage.jpg","hasPreviewImage":null,"head_title":null,"id":"testimage.jpg","image_field":"image","in_response_to":null,"is_folderish":false,"last_comment_date":null,"listCreators":["admin"],"location":null,"mime_type":"image/jpeg","modified":"2024-03-07T11:30:08+00:00","nav_title":null,"portal_type":"Image","review_state":null,"start":null,"sync_uid":null,"title":"testimage","total_comments":0,"type_title":"Bild"}],"title":"You can use this site to test Inka"},{"@id":"ef8ceecc-7c1d-4e0a-9b67-a56e7d03f6e3","buttonText":"See all blocks","description":"Frontend freedom makes it easy to create beautiful and fast experiences","flagAlign":"right","head_title":"Welcome to Inka&#39;s many frontends","hideButton":false,"href":[{"@id":"/docs/examples","@type":"Document","Description":"","Title":"Blocks","hasPreviewImage":null,"head_title":null,"image_field":"","title":"Blocks"}],"preview_image":[{"@id":"/images/penguin2.jpg","@type":"Image","CreationDate":"2024-03-08T13:05:46+01:00","Creator":"admin","Date":"2024-03-08T13:05:46+01:00","Description":"","EffectiveDate":"None","ExpirationDate":"None","ModificationDate":"2024-03-08T13:05:46+01:00","Subject":[],"Title":"penguin2.jpg","Type":"Bild","UID":"05bace45294c45d5ab93de883e7ce702","author_name":null,"cmf_uid":null,"commentators":[],"created":"2024-03-08T12:05:46+00:00","description":"","effective":"1969-12-30T23:00:00+00:00","end":null,"exclude_from_nav":false,"expires":"2499-12-30T23:00:00+00:00","getIcon":true,"getId":"penguin2.jpg","getObjSize":"2.8 MB","getPath":"/Plone/images/penguin2.jpg","getRemoteUrl":null,"getURL":"http://localhost:3000/images/penguin2.jpg","hasPreviewImage":null,"head_title":null,"id":"penguin2.jpg","image_field":"image","in_response_to":null,"is_folderish":false,"last_comment_date":null,"listCreators":["admin"],"location":null,"mime_type":"image/jpeg","modified":"2024-03-08T12:05:46+00:00","nav_title":null,"portal_type":"Image","review_state":null,"start":null,"sync_uid":null,"title":"penguin2.jpg","total_comments":0,"type_title":"Bild"}],"title":"You are enjoying one of many possible frontends"}],"styles":{}}' />

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":""},{"text":"You can use this site to test Inka Edit."}],"type":"p"},{"children":[{"text":""},{"children":[{"text":"Disclaimer"}],"type":"strong"},{"text":": This instance is reset every night, so all changes will be lost afterwards."}],"type":"p"}]}' />

You can **log in** and use it as an admin user using these **credentials**:\
\
username: **admin**\
password: **admin**

<block type="slate" data='{"value":[{"children":[{"text":"This site uses some recommended "},{"children":[{"text":"add-ons"}],"type":"strong"},{"text":":"}],"type":"p"},{"children":[{"children":[{"text":"Some blocks that are suitable to be used with volto-light-theme."}],"type":"li"},{"children":[{"text":""},{"children":[{"text":"volto-form-block"}],"data":{"url":"https://github.com/collective/volto-form-block"},"type":"link"},{"text":""}],"type":"li"}],"type":"ul"}]}' />

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

## View this site in other frameworks

- [NUXT.js Example](https://hydra-nuxt-flowbrite.netlify.app/)
- [Framework7 Example (mobile app)](https://hydra-vue-f7.netlify.app/)
- [Next.js Example](https://hydra-blogsite-nextjs.vercel.app)
- [Edit either of these frontends: hydra.pretagov.com](https://hydra.pretagov.com)

## Find out more about Inka

- [Inka on GitHub — source code, issues, and documentation](https://github.com/collective/volto-hydra)
- [Plone 6 Documentation](https://6.docs.plone.org)
- [Plone Community Forum](https://community.plone.org)
