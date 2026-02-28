# Listing Block

Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are `default` (title + description) and `summary` (title + description + image).

This is a **built-in** block.

## Schema

The listing block's schema is built up by Hydra's `schemaEnhancer`. The key fields are:

```js
{
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['querystring', 'variation'] }
    ],
    properties: {
      querystring: {
        title: 'Query',
        widget: 'query',
      },
      variation: {
        title: 'Item Type',
        // Choices are computed from allowedBlocks that have fieldMappings['@default']
        // Built-in options: 'default', 'summary', 'teaser', 'image'
      },
    },
  },
}
```

### Item Type Schemas

The `variation` field selects which block type renders each result item. Each item type has its own schema:

**`default`** — Title + description + link:
```js
{
  properties: {
    href:        { title: 'Link', widget: 'url' },
    title:       { title: 'Title' },
    description: { title: 'Description', widget: 'textarea' },
  },
}
```

**`summary`** — Title + description + image + link:
```js
{
  properties: {
    href:        { title: 'Link', widget: 'url' },
    title:       { title: 'Title' },
    description: { title: 'Description', widget: 'textarea' },
    image:       { title: 'Image', widget: 'url' },
  },
}
```

### Field Mappings

Query results are mapped to item fields via `fieldMappings['@default']`:

| Query result field | `default` item field | `summary` item field |
|-------------------|---------------------|---------------------|
| `@id` | `href` | `href` |
| `title` | `title` | `title` |
| `description` | `description` | `description` |
| `image` | — | `image` |

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

```jsx
function ListingBlock({ block, blockId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // expandListingBlocks fetches from the API and maps fields
    async function load() {
      const result = await expandListingBlocks(
        { [blockId]: block },
        [blockId],
        blockId,
      );
      setItems(result.items);
    }
    load();
  }, [block.querystring]);

  return (
    <div data-block-uid={blockId} className="listing-block">
      {items.map(item => (
        <ListingItem key={item['@uid']} item={item} variation={block.variation} />
      ))}
    </div>
  );
}

function ListingItem({ item, variation }) {
  return (
    <div data-block-uid={item['@uid']} className="listing-item">
      {variation === 'summary' && item.image && (
        <img src={item.image} alt="" />
      )}
      <h3><a href={item.href}>{item.title}</a></h3>
      <p>{item.description}</p>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="blockId" class="listing-block">
    <div v-for="item in items" :key="item['@uid']" :data-block-uid="item['@uid']" class="listing-item">
      <img v-if="block.variation === 'summary' && item.image" :src="item.image" alt="" />
      <h3><a :href="item.href">{{ item.title }}</a></h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ block: Object, blockId: String });
const items = ref([]);

watch(() => props.block.querystring, async () => {
  const result = await expandListingBlocks(
    { [props.blockId]: props.block },
    [props.blockId],
    props.blockId,
  );
  items.value = result.items;
}, { immediate: true });
</script>
```

### Svelte

```svelte
<script>
  export let block;
  export let blockId;

  let items = [];

  $: block.querystring, loadItems();

  async function loadItems() {
    const result = await expandListingBlocks(
      { [blockId]: block },
      [blockId],
      blockId,
    );
    items = result.items;
  }
</script>

<div data-block-uid={blockId} class="listing-block">
  {#each items as item (item['@uid'])}
    <div data-block-uid={item['@uid']} class="listing-item">
      {#if block.variation === 'summary' && item.image}
        <img src={item.image} alt="" />
      {/if}
      <h3><a href={item.href}>{item.title}</a></h3>
      <p>{item.description}</p>
    </div>
  {/each}
</div>
```
