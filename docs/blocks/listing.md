# Listing Block

Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are `default` (title + description) and `summary` (title + description + image).

This is a **built-in** block.

## Schema

The listing block uses `inheritSchemaFrom` to let editors choose an item type. You also need to define the item type blocks (`summary`, `default`) with `fieldMappings['@default']` so the listing knows how to map query results to item fields.

```js
blocks: {
  listing: {
    schemaEnhancer: {
      inheritSchemaFrom: {
        typeField: 'variation',
        mappingField: 'fieldMapping',
        defaultsField: 'itemDefaults',
        filterConvertibleFrom: '@default',
        title: 'Item Type',
        default: 'summary',
      },
    },
  },
  summary: {
    fieldMappings: {
      '@default': { '@id': 'href', title: 'title', description: 'description', image: 'image' },
    },
    blockSchema: {
      properties: {
        href:        { title: 'Link', widget: 'url' },
        title:       { title: 'Title' },
        description: { title: 'Description', widget: 'textarea' },
        image:       { title: 'Image', widget: 'url' },
      },
    },
  },
  default: {
    fieldMappings: {
      '@default': { '@id': 'href', title: 'title', description: 'description' },
    },
    blockSchema: {
      properties: {
        href:        { title: 'Link', widget: 'url' },
        title:       { title: 'Title' },
        description: { title: 'Description', widget: 'textarea' },
      },
    },
  },
}
```

The `filterConvertibleFrom: '@default'` means only block types with `fieldMappings['@default']` appear as item type choices. Other block types like `teaser` and `image` that already define `fieldMappings['@default']` will also be available as listing variations.

## JSON Block Data

```json
{
  "@type": "listing",
  "variation": "summary",
  "querystring": {
    "query": [
      {
        "i": "portal_type",
        "o": "plone.app.querystring.operation.selection.any",
        "v": ["Document"]
      }
    ],
    "sort_on": "effective",
    "sort_order": "descending"
  }
}
```

After the query is resolved, each item looks like:

```json
{
  "@uid": "item-1",
  "@type": "summary",
  "href": "/news/my-article",
  "title": "My Article",
  "description": "Article summary text",
  "image": "/news/my-article/@@images/image-800x600.jpg"
}
```

## Rendering

The listing block fetches items and renders each one based on the `variation`. Hydra's `expandListingBlocks` helper handles the fetch and field mapping.

### React

<!-- file: examples/react/ListingBlock.jsx -->
```jsx
function ListingBlock({ block, blockId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const fetchItems = ploneFetchItems({ apiUrl: API_URL });
      const result = await expandListingBlocks([blockId], {
        blocks: { [blockId]: block },
        fetchItems: { listing: fetchItems },
        itemTypeField: 'variation',
      });
      setItems(result);
    }
    load();
  }, [block.querystring]);

  return (
    <div data-block-uid={blockId} className="listing-block">
      {items.map((item, i) => (
        <BlockRenderer key={i} block={item} />
      ))}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/ListingBlock.vue -->
```vue
<template>
  <div :data-block-uid="blockId" class="listing-block">
    <BlockRenderer v-for="(item, i) in items" :key="i" :block="item" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ block: Object, blockId: String });
const items = ref([]);

watch(() => props.block.querystring, async () => {
  const fetchItems = ploneFetchItems({ apiUrl: API_URL });
  const result = await expandListingBlocks([props.blockId], {
    blocks: { [props.blockId]: props.block },
    fetchItems: { listing: fetchItems },
    itemTypeField: 'variation',
  });
  items.value = result;
}, { immediate: true });
</script>
```

### Svelte

<!-- file: examples/svelte/ListingBlock.svelte -->
```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';

  export let block;
  export let blockId;

  let items = [];

  $: block.querystring, loadItems();

  async function loadItems() {
    const fetchItems = ploneFetchItems({ apiUrl: API_URL });
    const result = await expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { listing: fetchItems },
      itemTypeField: 'variation',
    });
    items = result;
  }
</script>

<div data-block-uid={blockId} class="listing-block">
  {#each items as item, i (i)}
    <BlockRenderer block={item} />
  {/each}
</div>
```
