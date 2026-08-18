---
"@type": Document
UID: 8416628543f146ff9a18d281c03e2399
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The highlight block allows you to highlight and tease a single piece of
  content. The content is displayed with a large image and a title and
  description in a banderole.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: highlight
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/highlight/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - text
title: Highlight
blocks-assignments:
  - { uid: af3c704a-1f80-48c8-843b-dc29368d43d9 }
  - { uid: ref-highlight-description }
  - { uid: editor-screenshot }
  - { uid: 8d932379-1247-4281-bd30-dfecd5b3c378 }
  - { uid: 417e7343-af04-4da4-96bf-29321a3e0fc6 }
  - { uid: 67a6a73a-5ae7-4e14-a11b-bd0139e56513 }
  - { uid: 25a0a1b5-3ce9-468f-8968-9a7f83ca4e53 }
  - { uid: 94655cc3-817d-48ba-bc20-6e9f7796dc46 }
  - { uid: ref-highlight-schema }
  - { id: ref-highlight-schema-javascript-80590c }
  - { uid: ref-highlight-json-data }
  - { id: ref-highlight-json-data-json-a2bfa3 }
  - { uid: ref-highlight-rendering }
  - { id: ref-highlight-rendering-jsx-659b6c }
  - { id: ref-highlight-rendering-vue-dd8730 }
  - { id: ref-highlight-rendering-svelte-d3a4c8 }
  - { id: ref-highlight-rendering-astro-5277f3 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A prominent content section with a background image, overlay, title, rich text body, and an optional call-to-action link. Used for feature callouts and banners.

<block type="image" url="/docs/images/highlight-edit" alt="The highlight example block being edited in Volto Hydra" align="center" size="l" />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-1"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-2"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-3"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-4"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-5"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="schema">

### Schema

```javascript
{
  "highlight": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "slate"
        },
        "image": {
          "title": "Background Image",
          "widget": "image"
        },
        "cta_title": {
          "title": "CTA Text"
        },
        "cta_link": {
          "title": "CTA Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "highlight",
  "title": "Featured Content",
  "description": [
    {
      "type": "p",
      "children": [
        {
          "text": "Discover the latest updates and features available in this release."
        }
      ]
    }
  ],
  "image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23334455%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHighlight BG%3C/text%3E%3C/svg%3E",
  "cta_title": "Read More",
  "cta_link": [
    {
      "@id": "/news/latest"
    }
  ]
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/HighlightBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/HighlightBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/HighlightBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/HighlightBlock.astro
:language: astro
```

</block>
