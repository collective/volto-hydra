---
"@type": Document
UID: 6bd32a3367ea4254b295db642655b9d3
allow_discussion: false
contributors: []
creators:
  - admin
description: The listing block allows the display of various listings of
  content. Editors can configure a number of criteria for listing content (e.g.
  all news from 2022 with the keyword 'research').
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: listing
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: Listing
blocks:
  - 43068b6d-d8e9-4acc-912b-eabcdc650939: title
  - ref-listing-description: slate
  - editor-screenshot: image
  - 24280e07-e962-4414-8ee5-cdaf58ca5f35: listing
  - 53ececaa-4219-42a9-861d-862be364fd60: listing
  - 2a597dde-dd2b-4c66-816c-09e243a188f5: gridBlock
  - c2eaacd0-4e96-4344-a0ac-26ed644fc503: slider
  - ref-listing-schema: codeExample
  - ref-listing-json-data: codeExample
  - ref-listing-rendering: codeExample
---

<block type="title" uid="43068b6d-d8e9-4acc-912b-eabcdc650939" />

Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are default (title + description) and summary (title + description + image).

<block type="image" uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}">

![The listing example block being edited in Volto Hydra](/docs/images/listing-edit)

</block>

<block type="listing" uid="24280e07-e962-4414-8ee5-cdaf58ca5f35" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Default" headlineTag="h2" variation="default" data='{"query":[],"querystring":{"b_size":"4","limit":"10","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"transparent"}}' />

<block type="listing" uid="53ececaa-4219-42a9-861d-862be364fd60" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Summary" headlineTag="h2" variation="summary" data='{"query":[],"querystring":{"limit":"5","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" uid="2a597dde-dd2b-4c66-816c-09e243a188f5" headline="Listing: Grid (Teaser)" headlineTag="h2" data='{"styles":{"backgroundColor":"transparent"}}'>

<block type="listing" uid="grid-listing-1" variation="teaser" data='{"querystring":{"limit":"6","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"}}' />

</block>

<block type="slider" uid="c2eaacd0-4e96-4344-a0ac-26ed644fc503" headline="Listing: Image Slider" headlineTag="h2" data='{"autoplayDelay":4000,"autoplayEnabled":false,"autoplayJump":false,"styles":{}}'>

<region name="slides" widget="object_list">

<block type="listing" uid="slider-listing-1" variation="image" data='{"fieldMapping":{"@id":"href","title":"alt","image":"url"},"querystring":{"query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Image"]}],"sort_order":"ascending"}}' />

</region>

</block>

<block type="codeExample" uid="ref-listing-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-listing-schema-javascript-bd0476"}]}'>

### Schema

```javascript
{
  "listing": {
    "itemTypeField": "variation",
    "schemaEnhancer": {
      "inheritSchemaFrom": {
        "mappingField": "fieldMapping",
        "defaultsField": "itemDefaults",
        "filterConvertibleFrom": "@default",
        "title": "Item Type",
        "default": "summary"
      }
    }
  },
  "summary": {
    "fieldMappings": {
      "@default": {
        "@id": "href",
        "title": "title",
        "description": "description",
        "image": "image"
      }
    },
    "blockSchema": {
      "properties": {
        "href": {
          "title": "Link",
          "widget": "url"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "image": {
          "title": "Image",
          "widget": "url"
        },
        "date": {
          "title": "Date",
          "widget": "date"
        }
      }
    }
  },
  "default": {
    "fieldMappings": {
      "@default": {
        "@id": "href",
        "title": "title",
        "description": "description"
      }
    },
    "blockSchema": {
      "properties": {
        "href": {
          "title": "Link",
          "widget": "url"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        }
      }
    }
  }
}
```

</region>

</block>

<block type="codeExample" uid="ref-listing-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-listing-json-data-json-829696"}]}'>

### JSON Block Data

```json
{
  "@type": "listing",
  "variation": "summary",
  "querystring": {
    "query": [
      {
        "i": "portal_type",
        "o": "plone.app.querystring.operation.selection.any",
        "v": [
          "Document"
        ]
      }
    ],
    "sort_on": "effective",
    "sort_order": "descending"
  }
}

{
  "@uid": "item-1",
  "@type": "summary",
  "href": "/news/my-article",
  "title": "My Article",
  "description": "Article summary text",
  "image": "/news/my-article/@@images/image-800x600.jpg"
}
```

</region>

</block>

<block type="codeExample" uid="ref-listing-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-listing-rendering-jsx-f33c73"},{"@id":"ref-listing-rendering-vue-3c4a00"},{"@id":"ref-listing-rendering-svelte-aca768"}]}'>

### React

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
      setItems(result.items);
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
  items.value = result.items;
}, { immediate: true });
</script>
```

### Svelte

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
    items = result.items;
  }
</script>

<div data-block-uid={blockId} class="listing-block">
  {#each items as item, i (i)}
    <BlockRenderer block={item} />
  {/each}
</div>
```

</region>

</block>
