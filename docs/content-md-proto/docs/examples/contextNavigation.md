---
"@type": Document
UID: docs-examples-contextNavigation-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A vertical navigation list for grouped pages — a left sidebar on
  desktop and a collapsible disclosure at the top on mobile. Each row is a
  navItem (hand-added link) and/or a listing (auto-populated from a path query).
  The active link is detected from the current URL and gets aria-current="page"
  plus a .current class. Named after Plone's @contextnavigation endpoint, which
  serves the same purpose.
effective: null
exclude_from_nav: false
expires: null
id: contextNavigation
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - navigation
  - templates
title: Context Navigation Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-contextNavigation-description }
  - { uid: ref-contextNavigation-schema }
  - { id: ref-contextNavigation-schema-javascript-38f58f }
  - { uid: ref-contextNavigation-json-data }
  - { id: ref-contextNavigation-json-data-json-62b3b4 }
  - { uid: ref-contextNavigation-rendering }
  - { id: ref-contextNavigation-rendering-jsx-25968a }
  - { id: ref-contextNavigation-rendering-vue-af752b }
  - { id: ref-contextNavigation-rendering-svelte-a27836 }
  - { id: ref-contextNavigation-rendering-astro-7718b9 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Context Navigation Block

A vertical navigation list for grouped pages — a left sidebar on desktop and a collapsible disclosure at the top on mobile. Each row is a navItem (hand-added link) and/or a listing (auto-populated from a path query). The active link is detected from the current URL and gets aria-current="page" plus a .current class. Named after Plone's @contextnavigation endpoint, which serves the same purpose.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "contextNavigation": {
    "blockSchema": {
      "properties": {
        "ariaLabel": {
          "title": "Aria label",
          "default": "Section navigation"
        },
        "expandCurrentOnly": {
          "title": "Expand current section only",
          "type": "boolean",
          "default": true
        },
        "includeTop": {
          "title": "Include section root",
          "type": "boolean",
          "default": false
        },
        "items": {
          "title": "Items",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "navItem",
            "listing"
          ]
        }
      }
    }
  },
  "navItem": {
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
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
  "@type": "contextNavigation",
  "ariaLabel": "Section navigation",
  "blocks": {
    "nav-1": {
      "@type": "navItem",
      "label": "Introduction",
      "href": [
        {
          "@id": "/docs/introduction"
        }
      ]
    },
    "nav-2": {
      "@type": "navItem",
      "label": "Custom blocks",
      "href": [
        {
          "@id": "/docs/custom-blocks"
        }
      ]
    },
    "nav-2a": {
      "@type": "navItem",
      "label": "Schema",
      "href": [
        {
          "@id": "/docs/custom-blocks/schema"
        }
      ]
    },
    "nav-2b": {
      "@type": "navItem",
      "label": "Rendering",
      "href": [
        {
          "@id": "/docs/custom-blocks/rendering"
        }
      ]
    },
    "nav-3": {
      "@type": "navItem",
      "label": "Listings",
      "href": [
        {
          "@id": "/docs/listings"
        }
      ]
    }
  },
  "blocks_layout": {
    "items": [
      "nav-1",
      "nav-2",
      "nav-2a",
      "nav-2b",
      "nav-3"
    ]
  }
}

{
  "@type": "contextNavigation",
  "items": { "items": ["cnav-listing"] },
  "blocks": {
    "cnav-listing": {
      "@type": "listing",
      "variation": "navItem",
      "querystring": {
        "query": [
          { "i": "path",
            "o": "plone.app.querystring.operation.string.relativePath",
            "v": "." },
          { "i": "exclude_from_nav",
            "o": "plone.app.querystring.operation.boolean.isFalse",
            "v": "" }
        ],
        "sort_on": "getObjPositionInParent",
        "depth": 2
      }
    }
  }
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/ContextNavigationBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/ContextNavigationBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/ContextNavigationBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/ContextNavigationBlock.astro
:language: astro
```

</block>

</fields>
