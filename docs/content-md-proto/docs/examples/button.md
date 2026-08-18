---
"@type": Document
UID: 405582582e70493c96a6c549444a1eaa
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The button block shows a button for which a link (internal or external) can be
  stored. The button can be displayed left, right or center and have a
  background color.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: button
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
title: Button
blocks-assignments:
  - { uid: f3ee132b-6215-4e42-b26b-713f668eea61 }
  - { uid: ref-button-description }
  - { uid: editor-screenshot }
  - { uid: eab7123b-6a41-4537-8979-09e4fbbf317b }
  - { uid: b03e7ce7-b7b5-4413-bd2e-d42bff4bba9a }
  - { uid: 1cfea1d8-13df-4bcd-9220-07252085dad7 }
  - { uid: a8d191e1-5b3a-4ef6-b38f-6cb9af33ff85 }
  - { uid: 1e658fdd-1de8-4c00-80e7-5f91155a2a8a }
  - { uid: 9aa3c0c3-6565-4e9c-8e27-d07eeedf4314 }
  - { uid: 5b8d1979-adec-479a-ad8d-466fd3012fe5 }
  - { uid: 18db9de3-b9a3-4ada-a79a-39c7734c1291 }
  - { uid: beef7c11-acca-4e40-8477-e6f2e42d0f06 }
  - { uid: 022174c5-3f65-44b7-99de-c8037ff61598 }
  - { uid: 23608517-868c-47e7-b7ac-3dfb015acefe }
  - { uid: 31dcaf51-715a-4458-b11b-5d03a085b90d }
  - { uid: 50e24e21-a7fc-478c-9c65-152b5f86352f }
  - { uid: e5e36303-3541-41d0-8eff-053f90a6d75f }
  - { uid: e150d94a-7a54-451b-8019-31349d98d957 }
  - { uid: a0e70eab-97f8-4221-9e1e-e4cfef9ab58d }
  - { uid: 634edc58-3600-4918-b6e5-0924dce67591 }
  - { uid: 0d3d0bd6-ee66-44a3-9da8-b5e84ba797e4 }
  - { uid: 561ce253-b5a1-4868-91ce-3f6024cf3a0d }
  - { uid: 0b8a95f2-1320-4f44-a21d-4cfada6bd222 }
  - { uid: 46d0b71e-b9ee-481f-a4bf-b98cd7d1a452 }
  - { uid: dd9dc0eb-821a-4581-97af-7e59afc249e1 }
  - { uid: fa9321f8-ab68-4ca8-92de-23c5f0662c93 }
  - { uid: 35741452-106a-428f-864d-678be9822d87 }
  - { uid: f62e21a3-b906-4c0c-bef8-f42cd9631967 }
  - { uid: 108ab524-ac76-4127-b0e6-7227f5ea1549 }
  - { uid: 738b4894-1ed9-4556-8d5e-2d5f5a5e09ae }
  - { uid: e20c3c62-3c1d-4e45-a5c4-649b81b47a46 }
  - { uid: 7760c976-1716-45d0-a22b-527bed9e8de9 }
  - { uid: 2fa5b869-89cd-4d15-aee9-80b4e1bf11a2 }
  - { uid: fc0ddcf5-4acc-4f9b-8c5c-992db47399ce }
  - { uid: ref-button-schema }
  - { id: ref-button-schema-javascript-8aa182 }
  - { uid: ref-button-json-data }
  - { id: ref-button-json-data-json-ed3030 }
  - { uid: ref-button-rendering }
  - { id: ref-button-rendering-jsx-ab4e0b }
  - { id: ref-button-rendering-vue-e704dd }
  - { id: ref-button-rendering-svelte-a8e495 }
  - { id: ref-button-rendering-astro-1ee456 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
blocks-tagged: |
  <block type="button" title="${p/text}" href="${p/link}" />
---

# 

A call-to-action button with an editable label and link.

<block type="image" url="/docs/images/button-edit" alt="The button example block being edited in Volto Hydra" align="center" size="l" />

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="left" data-json='{"styles":{"buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="center" data-json='{"styles":{"buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="right" data-json='{"styles":{"align":"full","buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nib euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="button">

[Button](/)

<fields inneralign="left" data-json='{"styles":{}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="button">

[Button](/)

<fields inneralign="center" data-json='{"styles":{}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="button">

[Button](/)

<fields inneralign="right" data-json='{"styles":{}}' />

</block>

<block type="heading" alignment="left" heading="Button Block" tag="h2" data-json='{"styles":{"backgroundColor":"grey"}}' />

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="left" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="center" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="right" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"wide"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nib euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields data-json='{"styles":{"backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="left" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"center"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nib euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields data-json='{"styles":{"backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="center" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"center"}}' />

</block>

<block type="separator">

---

<fields data-json='{"styles":{"align":"full","backgroundColor":"grey"}}' />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nib euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields data-json='{"styles":{"backgroundColor":"grey"}}' />

</block>

<block type="button">

[Button](/)

<fields inneralign="right" data-json='{"styles":{"backgroundColor":"grey","buttonAlign":"center"}}' />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-button" slotId="schema">

### Schema

```javascript
{
  "button": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
        },
        "inneralign": {
          "title": "Alignment",
          "widget": "select",
          "choices": [
            [
              "left",
              "Left"
            ],
            [
              "center",
              "Center"
            ],
            [
              "right",
              "Right"
            ]
          ],
          "default": "left"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-button" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "button",
  "title": "Learn More",
  "href": [
    {
      "@id": "/about-us"
    }
  ]
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-button" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/ButtonBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/ButtonBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/ButtonBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/ButtonBlock.astro
:language: astro
```

</block>
