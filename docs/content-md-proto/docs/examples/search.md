---
"@type": Document
UID: 928010d84e5d4df2b2282f3e179d6b1a
allow_discussion: false
contributors: []
creators:
  - admin
description: The search block allows the content of the website to be listed.
  Users can use so-called facets to select certain properties of the listed
  content in order to filter them (e.g. filtering the news of 2022).
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: search
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/search/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - listings
  - navigation
title: Search
blocks-assignments:
  - { uid: f6d35d7e-6422-4496-8a65-f7cfd42fb519 }
  - { uid: ref-search-description }
  - { uid: editor-screenshot }
  - { uid: 42b7d589-4d35-4b81-9fe9-ea17437beb81 }
  - { uid: 518c46e7-9823-4e03-aa3a-d2a9ec1746dd }
  - { uid: ref-search-schema }
  - { id: ref-search-schema-javascript-8711ec }
  - { uid: ref-search-json-data }
  - { id: ref-search-json-data-json-155258 }
  - { uid: ref-search-rendering }
  - { id: ref-search-rendering-jsx-dd082e }
  - { id: ref-search-rendering-vue-3c1873 }
  - { id: ref-search-rendering-svelte-7ba7ad }
  - { id: ref-search-rendering-astro-014919 }
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

A search interface with faceted filtering. Contains a child listing block for results and typed facets (checkbox, select, date range, toggle) for filtering.

<block type="image" url="/docs/images/search-edit" alt="The search example block being edited in Volto Hydra" align="center" size="l" />

<fields data-json='{"query":{"b_size":"4","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"},"showSearchInput":true,"showSortOn":true,"showTotalResults":true}'>

<block type="search" headline="Search with Facets" listingBodyTemplate="summary" facetsTitle="Filter by" data-json='{"facets":[{"@id":"facet-type","type":"checkboxFacet","title":"Content Type","field":{"value":"portal_type","label":"Type"},"multiple":true,"hidden":false},{"@id":"facet-subject","type":"checkboxFacet","title":"Tags","field":{"value":"Subject","label":"Tags"},"multiple":true,"hidden":false}],"blocks":{"facet-listing":{"@type":"listing","variation":"summary","querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}},"blocks_layout":{"listing":["facet-listing"]}}' />

<block type="search" headline="Simple Search" data-json='{"blocks":{"simple-listing":{"@type":"listing","variation":"default","querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}},"blocks_layout":{"listing":["simple-listing"]}}' />

</fields>

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "search": {
    "blockSchema": {
      "properties": {
        "facetsTitle": {
          "title": "Facets Title"
        },
        "facets": {
          "title": "Facets",
          "widget": "object_list",
          "typeField": "type",
          "allowedBlocks": [
            "checkboxFacet",
            "selectFacet",
            "daterangeFacet",
            "toggleFacet"
          ]
        },
        "listing": {
          "title": "Listing",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "listing"
          ]
        }
      }
    }
  },
  "checkboxFacet": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "field": {
          "title": "Field",
          "widget": "select_querystring_field"
        },
        "multiple": {
          "title": "Multiple choices?",
          "type": "boolean",
          "default": false
        },
        "hidden": {
          "title": "Hide facet?",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "selectFacet": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "field": {
          "title": "Field",
          "widget": "select_querystring_field"
        },
        "hidden": {
          "title": "Hide facet?",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "daterangeFacet": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "field": {
          "title": "Field",
          "widget": "select_querystring_field"
        },
        "hidden": {
          "title": "Hide facet?",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "toggleFacet": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "field": {
          "title": "Field",
          "widget": "select_querystring_field"
        },
        "hidden": {
          "title": "Hide facet?",
          "type": "boolean",
          "default": false
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
  "@type": "search",
  "facetsTitle": "Filter by",
  "facets": [
    {
      "@id": "facet-1",
      "type": "checkboxFacet",
      "title": "Content Type",
      "field": "portal_type",
      "multiple": true,
      "hidden": false
    },
    {
      "@id": "facet-2",
      "type": "daterangeFacet",
      "title": "Date Range",
      "field": "effective",
      "hidden": false
    }
  ],
  "blocks": {
    "listing-1": {
      "@type": "listing",
      "variation": "summary",
      "querystring": {
        "query": [
          {
            "i": "portal_type",
            "o": "plone.app.querystring.operation.selection.any",
            "v": [
              "Document",
              "News Item"
            ]
          }
        ]
      }
    }
  },
  "blocks_layout": {
    "listing": [
      "listing-1"
    ]
  }
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/SearchBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/SearchBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/SearchBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/SearchBlock.astro
:language: astro
```

</block>

</fields>
