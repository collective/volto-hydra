---
"@type": Document
UID: bd2b39d2745847db82ed197a4eb1effc
allow_discussion: false
contributors: []
creators:
  - admin
description: The teaser block allows you to add an element that teases existing
  website content with an image, a title and a description.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: teaser
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/teaser/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Teaser
blocks-assignments:
  - { uid: b986b92c-e180-42d3-b755-4728854e5a50 }
  - { uid: ref-teaser-description }
  - { uid: editor-screenshot }
  - { uid: 61f0e286-0527-43a7-b8fe-29f1be40a8c3 }
  - { uid: 03fd3352-0845-4c70-9d01-805996bd127b }
  - { uid: 530939e1-8579-4d37-a111-716475c00cac }
  - { uid: 95648579-7116-401f-a448-e48938c88246 }
  - { uid: b798dde4-6a5d-4cef-9e25-fd532e1ea9a7 }
  - { uid: 620f0540-8c3d-422d-a1c6-47037b5dbfbc }
  - { uid: ref-teaser-schema }
  - { id: ref-teaser-schema-javascript-bfff08 }
  - { uid: ref-teaser-json-data }
  - { id: ref-teaser-json-data-json-7f117c }
  - { uid: ref-teaser-rendering }
  - { id: ref-teaser-rendering-jsx-d1dd76 }
  - { id: ref-teaser-rendering-vue-fc123a }
  - { id: ref-teaser-rendering-svelte-bf19cf }
  - { id: ref-teaser-rendering-astro-a9659f }
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
blocks-tagged: |
  <block type="teaser" title="${h/text}" href="${h/link}" description="${p/text}" />
---

# 

A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values.

<block type="image" url="/docs/images/teaser-edit" alt="The teaser example block being edited in Volto Hydra" align="center" size="l" />

<fields title="Headline H2" data-json='{"href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}]}'>

<fields head_title="Head title">

<block type="teaser" data-json='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.","styles":{"align":"center"}}' />

<fields data-json='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea."}'>

<block type="teaser" data-json='{"styles":{"align":"left"}}' />

<block type="teaser" data-json='{"styles":{"align":"right"}}' />

</fields>

</fields>

<block type="teaser" data-json='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.","styles":{"align":"center","backgroundColor":"grey"}}' />

<fields data-json='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea."}'>

<block type="teaser" data-json='{"styles":{"align":"left","backgroundColor":"grey"}}' />

<block type="teaser" data-json='{"styles":{"align":"right","backgroundColor":"grey"}}' />

</fields>

</fields>

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "teaser": {
    "fieldMappings": {
      "@default": {
        "@id": "href",
        "title": "title",
        "description": "description",
        "image": "preview_image"
      }
    },
    "blockSchema": {
      "properties": {
        "href": {
          "title": "Target",
          "widget": "object_browser",
          "mode": "link"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "preview_image": {
          "title": "Preview Image",
          "widget": "image"
        },
        "overwrite": {
          "title": "Overwrite target content",
          "type": "boolean"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "teaser",
  "href": [
    {
      "@id": "/news/my-article",
      "title": "My Article",
      "description": "A short summary of the article",
      "hasPreviewImage": true
    }
  ],
  "title": "Custom Title",
  "description": "Custom description overriding the target",
  "preview_image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2399bbdd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2718%27%3ETeaser%3C/text%3E%3C/svg%3E",
  "overwrite": true
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/TeaserBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/TeaserBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/TeaserBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/TeaserBlock.astro
:language: astro
```

</block>

</fields>
