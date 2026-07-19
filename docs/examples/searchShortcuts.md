# Search Shortcuts Block

Renders a set of values as links into a faceted search — a "tag cloud" of shortcuts. Each value links to a search page with `?facet.<index>=<value>` pre-set, which a [Search block](./search.md) reads from the URL.

This is a **custom** example block — register its fetcher via `initBridge` (see below).

## Schema

```json
{
  "searchShortcuts": {
    "id": "searchShortcuts",
    "title": "Search Shortcuts",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "index",
            "pageField",
            "searchUrl",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "index": {
          "title": "Index",
          "widget": "select_querystring_field",
          "vocabulary": {
            "@id": "plone.app.contenttypes.metadatafields"
          },
          "default": "Subject"
        },
        "pageField": {
          "title": "This page field (optional)",
          "widget": "schemaFieldSelect",
          "fieldType": "keyword"
        },
        "searchUrl": {
          "title": "Search page URL",
          "widget": "url"
        },
        "variation": {
          "title": "Item Type",
          "widget": "blockTypeSelect",
          "filterConvertibleFrom": "@default",
          "default": "default"
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
  "@type": "searchShortcuts",
  "index": "Subject",
  "pageField": "subjects",
  "searchUrl": "/search",
  "variation": "default"
}
```

## Rendering

Every list-style block renders the **same way**: call `expandListingBlocks`, then map over the items. Each Search Shortcuts result's `@id` is already the facet-search URL, so the default `@id → href` mapping turns it into a link — nothing renderer-side is special. The **only** block-specific line is which fetcher you register (`searchShortcutsFetcher`); `apiUrl`/`contextPath` come from your app config. The component is generic — call it a `FetchedList`, not a "listing".

Pick the `index` with the existing `select_querystring_field` widget (e.g. `Subject`). Link an optional `pageField` (via `schemaFieldSelect`, `fieldType: 'keyword'`) to show **this page's** values of that field; leave it empty for all unique values of the index **site-wide** (from its vocabulary, e.g. `Keywords` for `Subject`). See [Listings › Example fetchers](../listings.md#example-fetchers).

### React

```jsx
import { useState, useEffect } from 'react';
import { expandListingBlocks, searchShortcutsFetcher } from '@hydra-js/helpers';

function FetchedList({ block, blockId, apiUrl, contextPath }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }) }, // ← only block-specific line
      itemTypeField: 'variation',
    }).then((r) => setItems(r.items));
  }, [block.index, block.pageField]);

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
import { expandListingBlocks, searchShortcutsFetcher } from '@hydra-js/helpers';

const props = defineProps({ block: Object, blockId: String, apiUrl: String, contextPath: String });
const items = ref([]);
watch(() => [props.block.index, props.block.pageField], async () => {
  const r = await expandListingBlocks([props.blockId], {
    blocks: { [props.blockId]: props.block },
    fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl: props.apiUrl, contextPath: props.contextPath }) },
    itemTypeField: 'variation',
  });
  items.value = r.items;
}, { immediate: true });
</script>
```

### Svelte

```svelte
<script>
  import { expandListingBlocks, searchShortcutsFetcher } from '@hydra-js/helpers';
  import BlockRenderer from './BlockRenderer.svelte';
  export let block; export let blockId; export let apiUrl; export let contextPath;
  let items = [];
  $: block.index, block.pageField, load();
  async function load() {
    const r = await expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }) },
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
import { expandListingBlocks, searchShortcutsFetcher } from '@hydra-js/helpers';
import BlockRenderer from './BlockRenderer.astro';
const { block, apiUrl, contextPath } = Astro.props;
const blockId = block['@uid'];
const { items } = await expandListingBlocks([{ ...block, '@uid': blockId }], {
  fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }) },
  itemTypeField: 'variation',
});
---
<div data-block-uid={blockId}>
  {items.map((item) => <BlockRenderer block={item} />)}
</div>
```
