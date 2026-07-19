# Related Items Block

Renders the current page's *related items* relation field (default `relatedItems`) as a list, reusing the listing machinery — each related item is rendered with a configurable item type (variation).

This is a **custom** example block — register its fetcher via `initBridge` (see below).

## Schema

```json
{
  "relatedItemsListing": {
    "id": "relatedItemsListing",
    "title": "Related Items",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "relationField",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "relationField": {
          "title": "Relation field",
          "widget": "schemaFieldSelect",
          "fieldType": "relation"
        },
        "variation": {
          "title": "Item Type",
          "widget": "blockTypeSelect",
          "filterConvertibleFrom": "@default",
          "default": "summary"
        }
      }
    },
    "schemaEnhancer": {
      "inheritSchemaFrom": {
        "typeField": "variation",
        "mappingField": "fieldMapping",
        "defaultsField": "itemDefaults"
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "relatedItemsListing",
  "variation": "summary",
  "relationField": "relatedItems"
}
```

## Rendering

Every list-style block renders the **same way**: call `expandListingBlocks`, then map over the items. `expandListingBlocks` picks the fetcher out of your `fetchItems` map by the block's `@type`, so the component never reads `relationField` itself — the fetcher does. The **only** block-specific line is which fetcher you register (`relatedItemsFetcher`); `apiUrl`/`contextPath` come from your app config. The component is generic — call it a `FetchedList`, not a "listing".

The fetcher reads the current page's `relationField` (default `relatedItems`) — Plone serializes relations as summaries (`@id`/`title`/`description`/`image`), so no catalog query is needed. The optional field picker (`schemaFieldSelect`, `fieldType: 'relation'`) lists the content type's relation fields from `/@types`. See [Listings › Example fetchers](../listings.md#example-fetchers).

### React

```jsx
import { useState, useEffect } from 'react';
import { expandListingBlocks, relatedItemsFetcher } from '@hydra-js/helpers';

function FetchedList({ block, blockId, apiUrl, contextPath }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }) }, // ← only block-specific line
      itemTypeField: 'variation',
    }).then((r) => setItems(r.items));
  }, [block.relationField]);

  return (
    <div data-block-uid={blockId}>
      {items.map((item, i) => <BlockRenderer key={i} block={item} />)}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="blockId">
    <BlockRenderer v-for="(item, i) in items" :key="i" :block="item" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { expandListingBlocks, relatedItemsFetcher } from '@hydra-js/helpers';

const props = defineProps({ block: Object, blockId: String, apiUrl: String, contextPath: String });
const items = ref([]);
watch(() => props.block.relationField, async () => {
  const r = await expandListingBlocks([props.blockId], {
    blocks: { [props.blockId]: props.block },
    fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl: props.apiUrl, contextPath: props.contextPath }) },
    itemTypeField: 'variation',
  });
  items.value = r.items;
}, { immediate: true });
</script>
```

### Svelte

```svelte
<script>
  import { expandListingBlocks, relatedItemsFetcher } from '@hydra-js/helpers';
  import BlockRenderer from './BlockRenderer.svelte';
  export let block; export let blockId; export let apiUrl; export let contextPath;
  let items = [];
  $: block.relationField, load();
  async function load() {
    const r = await expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }) },
      itemTypeField: 'variation',
    });
    items = r.items;
  }
</script>

<div data-block-uid={blockId}>
  {#each items as item, i (i)}<BlockRenderer block={item} />{/each}
</div>
```

### Astro (server-rendered)

```astro
---
import { expandListingBlocks, relatedItemsFetcher } from '@hydra-js/helpers';
import BlockRenderer from './BlockRenderer.astro';
const { block, apiUrl, contextPath } = Astro.props;
const blockId = block['@uid'];
const { items } = await expandListingBlocks([{ ...block, '@uid': blockId }], {
  fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }) },
  itemTypeField: 'variation',
});
---
<div data-block-uid={blockId}>
  {items.map((item) => <BlockRenderer block={item} />)}
</div>
```
