# RSS Feed Block

Renders entries from an external RSS feed, reusing the listing machinery. Each entry is rendered with a configurable item type (variation).

This is a **custom** example block — register its fetcher via `initBridge` (see below).

## Schema

```json
{
  "rssFeed": {
    "id": "rssFeed",
    "title": "RSS Feed",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "feedUrl",
            "count",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "feedUrl": {
          "title": "Feed URL",
          "widget": "url"
        },
        "count": {
          "title": "Max items",
          "type": "number",
          "default": 6
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
  "@type": "rssFeed",
  "feedUrl": "https://example.com/feed.xml",
  "count": 6,
  "variation": "summary"
}
```

## Rendering

Every list-style block renders the **same way**: call `expandListingBlocks`, then map over the items it hands back. `expandListingBlocks` picks the fetcher out of your `fetchItems` map by the block's `@type`, so the component never reads `feedUrl` itself — the fetcher does. The **only** block-specific line is which fetcher you register (`rssFetcher`). The component is generic — call it a `FetchedList`, not a "listing".

RSS is client-side and best-effort: most feeds block cross-origin requests, so a CORS/parse failure degrades to an empty feed. For production, proxy the feed through your own server route. See [Listings › Example fetchers](../listings.md#example-fetchers).

### React

```jsx
import { useState, useEffect } from 'react';
import { expandListingBlocks, rssFetcher } from '@hydra-js/helpers';

function FetchedList({ block, blockId }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { rssFeed: rssFetcher() }, // ← the only block-specific line
      itemTypeField: 'variation',
    }).then((r) => setItems(r.items));
  }, [block.feedUrl]);

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
import { expandListingBlocks, rssFetcher } from '@hydra-js/helpers';

const props = defineProps({ block: Object, blockId: String });
const items = ref([]);
watch(() => props.block.feedUrl, async () => {
  const r = await expandListingBlocks([props.blockId], {
    blocks: { [props.blockId]: props.block },
    fetchItems: { rssFeed: rssFetcher() }, // ← the only block-specific line
    itemTypeField: 'variation',
  });
  items.value = r.items;
}, { immediate: true });
</script>
```

### Svelte

```svelte
<script>
  import { expandListingBlocks, rssFetcher } from '@hydra-js/helpers';
  import BlockRenderer from './BlockRenderer.svelte';
  export let block; export let blockId;
  let items = [];
  $: block.feedUrl, load();
  async function load() {
    const r = await expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { rssFeed: rssFetcher() }, // ← the only block-specific line
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
import { expandListingBlocks, rssFetcher } from '@hydra-js/helpers';
import BlockRenderer from './BlockRenderer.astro';
const { block } = Astro.props;
const blockId = block['@uid'];
const { items } = await expandListingBlocks([{ ...block, '@uid': blockId }], {
  fetchItems: { rssFeed: rssFetcher() }, // ← the only block-specific line
  itemTypeField: 'variation',
});
---
<div data-block-uid={blockId}>
  {items.map((item) => <BlockRenderer block={item} />)}
</div>
```
