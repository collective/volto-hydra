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

<block type="search" headline="Search with Facets" listingBodyTemplate="summary" facetsTitle="Filter by" data-json='{"facets":[{"@id":"facet-type","type":"checkboxFacet","title":"Content Type","field":{"value":"portal_type","label":"Type"},"multiple":true,"hidden":false},{"@id":"facet-subject","type":"checkboxFacet","title":"Tags","field":{"value":"Subject","label":"Tags"},"multiple":true,"hidden":false}],"query":{"b_size":"4","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"},"showSearchInput":true,"showSortOn":true,"showTotalResults":true,"blocks":{"facet-listing":{"@type":"listing","variation":"summary","querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}},"blocks_layout":{"listing":["facet-listing"]}}' />

<block type="search" headline="Simple Search" data-json='{"query":{"b_size":"4","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"},"showSearchInput":true,"showSortOn":true,"showTotalResults":true,"blocks":{"simple-listing":{"@type":"listing","variation":"default","querystring":{"query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/"}],"sort_on":"effective","sort_order":"descending"}}},"blocks_layout":{"listing":["simple-listing"]}}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="schema">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="json-data">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-search" slotId="rendering">

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

### Astro

```astro
---
/**
 * Search/facets block. The embedded listing is fetched at runtime in the
 * svelte version; here SSR shows only the static chrome (headline, facets,
 * search input, and the listing wrapper). Facets render typed inputs with
 * `data-block-uid` so per-facet selection works.
 */
import BlockRenderer from './BlockRenderer.astro';
const { block } = Astro.props;
const visibleFacets = (block.facets || []).filter((f: any) => !f.hidden);
const listingId = block.blocks_layout?.listing?.[0];
const listingBlock = listingId ? block.blocks?.[listingId] : null;
---
<div class="search-block">
  {block.headline && <h2 data-edit-text="headline">{block.headline}</h2>}
  <input type="search" placeholder="Search..." />

  {visibleFacets.length > 0 && (
    <div class="facets">
      <h4 data-edit-text="facetsTitle">{block.facetsTitle || 'Filter'}</h4>
      {visibleFacets.map((facet: any) => (
        <>
          {facet.type === 'checkboxFacet' && (
            <fieldset data-block-uid={facet['@id']}>
              <legend data-edit-text="title">{facet.title}</legend>
            </fieldset>
          )}
          {facet.type === 'selectFacet' && (
            <label data-block-uid={facet['@id']}>
              <span data-edit-text="title">{facet.title}</span>
              <select></select>
            </label>
          )}
          {facet.type === 'daterangeFacet' && (
            <label data-block-uid={facet['@id']}>
              <span data-edit-text="title">{facet.title}</span>
              <input type="date" /> – <input type="date" />
            </label>
          )}
          {facet.type === 'toggleFacet' && (
            <label data-block-uid={facet['@id']}>
              <input type="checkbox" /> <span data-edit-text="title">{facet.title}</span>
            </label>
          )}
        </>
      ))}
    </div>
  )}

  {listingBlock && (
    <BlockRenderer block={{ ...listingBlock, '@uid': listingId }} />
  )}
</div>
```

</block>
