# Search Block

A search interface with faceted filtering. Contains a child listing block for results and typed facets (checkbox, select, date range, toggle) for filtering.

This is a **built-in** block. The facet types are custom sub-blocks.

## Schema

```json
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


## JSON Block Data

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
  "listing": {
    "items": [
      "listing-1"
    ]
  }
}
```

## Rendering

### React

<!-- file: examples/react/SearchBlock.jsx -->
```jsx
function SearchBlock({ block, blockId }) {
  const [query, setQuery] = useState('');

  const facets = (block.facets || []).filter(f => !f.hidden);
  const listing = block.listing || {};
  const listingId = listing.items?.[0];
  const listingBlock = listingId ? (block.blocks?.[listingId]) : null;

  return (
    <div data-block-uid={blockId} className="search-block">
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

<!-- file: examples/vue/SearchBlock.vue -->
```vue
<template>
  <div :data-block-uid="blockId" class="search-block">
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
const listingId = computed(() => props.block.listing?.items?.[0]);
const listingBlock = computed(() => listingId.value ? props.block.blocks?.[listingId.value] : null);
</script>
```

### Svelte

<!-- file: examples/svelte/SearchBlock.svelte -->
```svelte
<script>
  import ListingBlock from './ListingBlock.svelte';
  export let block;
  export let blockId;

  let query = '';

  $: visibleFacets = (block.facets || []).filter(f => !f.hidden);
  $: listingId = block.listing?.items?.[0];
  $: listingBlock = listingId ? block.blocks?.[listingId] : null;
</script>

<div data-block-uid={blockId} class="search-block">
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
