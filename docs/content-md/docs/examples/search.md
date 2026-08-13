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
blocks:
  - f6d35d7e-6422-4496-8a65-f7cfd42fb519: title
  - ref-search-description: slate
  - editor-screenshot: image
  - 42b7d589-4d35-4b81-9fe9-ea17437beb81: search
  - 518c46e7-9823-4e03-aa3a-d2a9ec1746dd: search
  - ref-search-schema: codeExample
  - ref-search-json-data: codeExample
  - ref-search-rendering: codeExample
---

<block type="title" uid="f6d35d7e-6422-4496-8a65-f7cfd42fb519" />

A search interface with faceted filtering. Contains a child listing block for results and typed facets (checkbox, select, date range, toggle) for filtering.

<block type="image" uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}">

![The search example block being edited in Volto Hydra](/docs/images/search-edit)

</block>

<block type="search" uid="42b7d589-4d35-4b81-9fe9-ea17437beb81" headline="Search with Facets" listingBodyTemplate="summary" facetsTitle="Filter by" data='{"showSearchInput":true,"showSortOn":true,"showTotalResults":true,"facets":[{"@id":"facet-type","type":"checkboxFacet","title":"Content Type","field":{"value":"portal_type","label":"Type"},"multiple":true,"hidden":false},{"@id":"facet-subject","type":"checkboxFacet","title":"Tags","field":{"value":"Subject","label":"Tags"},"multiple":true,"hidden":false}],"query":{"b_size":"4","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}'>

<region name="listing" widget="blocks_layout">

<block type="listing" uid="facet-listing" variation="summary" data='{"querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}' />

</region>

</block>

<block type="search" uid="518c46e7-9823-4e03-aa3a-d2a9ec1746dd" headline="Simple Search" data='{"showSearchInput":true,"showSortOn":true,"showTotalResults":true,"query":{"b_size":"4","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}'>

<region name="listing" widget="blocks_layout">

<block type="listing" uid="simple-listing" variation="default" data='{"querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}' />

</region>

</block>

<block type="codeExample" uid="ref-search-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-search-schema-javascript-8711ec"}]}'>

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

</region>

</block>

<block type="codeExample" uid="ref-search-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-search-json-data-json-155258"}]}'>

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

</region>

</block>

<block type="codeExample" uid="ref-search-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-search-rendering-jsx-dd082e"},{"@id":"ref-search-rendering-vue-3c1873"},{"@id":"ref-search-rendering-svelte-7ba7ad"}]}'>

### React

```jsx
function SearchBlock({ block, blockId }) {
  const [query, setQuery] = useState('');

  const facets = (block.facets || []).filter(f => !f.hidden);
  const listing = block.blocks_layout?.listing || [];
  const listingId = listing[0];
  const listingBlock = listingId ? (block.blocks?.[listingId]) : null;

  return (
    <div data-block-uid={blockId} className="search-block">
      {block.headline && <h2 data-edit-text="headline">{block.headline}</h2>}
      <input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {facets.length > 0 && (
        <div className="facets">
          <h4 data-edit-text="facetsTitle">{block.facetsTitle || 'Filter'}</h4>
          {facets.map(facet => (
            <FacetRenderer key={facet['@id']} facet={facet} />
          ))}
        </div>
      )}

      {listingBlock && (
        <ListingBlock block={listingBlock} blockId={listingId} />
      )}
    </div>
  );
}

function FacetRenderer({ facet }) {
  switch (facet.type) {
    case 'checkboxFacet':
      return <fieldset data-block-uid={facet['@id']}><legend data-edit-text="title">{facet.title}</legend>{/* checkbox options */}</fieldset>;
    case 'selectFacet':
      return <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><select>{/* options */}</select></label>;
    case 'daterangeFacet':
      return <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><input type="date" /> – <input type="date" /></label>;
    case 'toggleFacet':
      return <label data-block-uid={facet['@id']}><input type="checkbox" /> <span data-edit-text="title">{facet.title}</span></label>;
    default:
      return null;
  }
}
```

### Vue

```vue
<template>
  <div :data-block-uid="blockId" class="search-block">
    <h2 v-if="block.headline" data-edit-text="headline">{{ block.headline }}</h2>
    <input type="search" placeholder="Search..." v-model="query" />

    <div v-if="visibleFacets.length" class="facets">
      <h4 data-edit-text="facetsTitle">{{ block.facetsTitle || 'Filter' }}</h4>
      <template v-for="facet in visibleFacets" :key="facet['@id']">
        <fieldset v-if="facet.type === 'checkboxFacet'" :data-block-uid="facet['@id']">
          <legend data-edit-text="title">{{ facet.title }}</legend>
          <!-- checkbox options -->
        </fieldset>
        <label v-else-if="facet.type === 'selectFacet'" :data-block-uid="facet['@id']">
          <span data-edit-text="title">{{ facet.title }}</span><select><!-- options --></select>
        </label>
        <label v-else-if="facet.type === 'daterangeFacet'" :data-block-uid="facet['@id']">
          <span data-edit-text="title">{{ facet.title }}</span><input type="date" /> – <input type="date" />
        </label>
        <label v-else-if="facet.type === 'toggleFacet'" :data-block-uid="facet['@id']">
          <input type="checkbox" /> <span data-edit-text="title">{{ facet.title }}</span>
        </label>
      </template>
    </div>

    <ListingBlock
      v-if="listingBlock"
      :block="listingBlock"
      :block-id="listingId"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ block: Object, blockId: String });
const query = ref('');
const visibleFacets = computed(() => (props.block.facets || []).filter(f => !f.hidden));
const listingId = computed(() => props.block.blocks_layout?.listing?.[0]);
const listingBlock = computed(() => listingId.value ? props.block.blocks?.[listingId.value] : null);
</script>
```

### Svelte

```svelte
<script>
  import ListingBlock from './ListingBlock.svelte';
  export let block;
  export let blockId;

  let query = '';

  $: visibleFacets = (block.facets || []).filter(f => !f.hidden);
  $: listingId = block.blocks_layout?.listing?.[0];
  $: listingBlock = listingId ? block.blocks?.[listingId] : null;
</script>

<div data-block-uid={blockId} class="search-block">
  {#if block.headline}<h2 data-edit-text="headline">{block.headline}</h2>{/if}
  <input type="search" placeholder="Search..." bind:value={query} />

  {#if visibleFacets.length}
    <div class="facets">
      <h4 data-edit-text="facetsTitle">{block.facetsTitle || 'Filter'}</h4>
      {#each visibleFacets as facet (facet['@id'])}
        {#if facet.type === 'checkboxFacet'}
          <fieldset data-block-uid={facet['@id']}><legend data-edit-text="title">{facet.title}</legend><!-- checkbox options --></fieldset>
        {:else if facet.type === 'selectFacet'}
          <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><select><!-- options --></select></label>
        {:else if facet.type === 'daterangeFacet'}
          <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><input type="date" /> – <input type="date" /></label>
        {:else if facet.type === 'toggleFacet'}
          <label data-block-uid={facet['@id']}><input type="checkbox" /> <span data-edit-text="title">{facet.title}</span></label>
        {/if}
      {/each}
    </div>
  {/if}

  {#if listingBlock}
    <ListingBlock block={listingBlock} blockId={listingId} />
  {/if}
</div>
```

</region>

</block>
