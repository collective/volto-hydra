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
is_folderish: true
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
assignments:
  - { uid: 43068b6d-d8e9-4acc-912b-eabcdc650939, type: title }
  - { uid: ref-listing-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 24280e07-e962-4414-8ee5-cdaf58ca5f35, type: listing }
  - { uid: 53ececaa-4219-42a9-861d-862be364fd60, type: listing }
  - { uid: 2a597dde-dd2b-4c66-816c-09e243a188f5, type: gridBlock }
  - { uid: grid-listing-1, type: listing }
  - { uid: c2eaacd0-4e96-4344-a0ac-26ed644fc503, type: slider }
  - { uid: ref-listing-schema, type: codeExample }
  - { id: ref-listing-schema-javascript-bd0476 }
  - { uid: ref-listing-json-data, type: codeExample }
  - { id: ref-listing-json-data-json-829696 }
  - { uid: ref-listing-rendering, type: codeExample }
  - { id: ref-listing-rendering-jsx-f33c73 }
  - { id: ref-listing-rendering-vue-3c4a00 }
  - { id: ref-listing-rendering-svelte-aca768 }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="slate">

Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are default (title + description) and summary (title + description + image).

</block>

<block type="image" url="/docs/images/listing-edit" alt="The listing example block being edited in Volto Hydra" align="center" size="l" />

<block type="listing" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Default" headlineTag="h2" variation="default" data='{"query":[],"querystring":{"b_size":"4","limit":"10","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"transparent"}}' />

<block type="listing" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Summary" headlineTag="h2" variation="summary" data='{"query":[],"querystring":{"limit":"5","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" headline="Listing: Grid (Teaser)" headlineTag="h2" data='{"blocks":[{"@type":"listing","querystring":{"limit":"6","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"variation":"teaser"}],"styles":{"backgroundColor":"transparent"}}' />

<block type="slider" headline="Listing: Image Slider" headlineTag="h2" data='{"autoplayDelay":4000,"autoplayEnabled":false,"autoplayJump":false,"slides":[{"@id":"slider-listing-1","@type":"listing","fieldMapping":{"@id":"href","title":"alt","image":"url"},"querystring":{"query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Image"]}],"sort_order":"ascending"},"variation":"image"}],"styles":{}}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="schema">

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="json-data">

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="rendering">

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

</block>
