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
assignments:
  - { uid: 43068b6d-d8e9-4acc-912b-eabcdc650939, type: title }
  - { uid: ref-listing-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 24280e07-e962-4414-8ee5-cdaf58ca5f35, type: listing }
  - { uid: 53ececaa-4219-42a9-861d-862be364fd60, type: listing }
  - { uid: 2a597dde-dd2b-4c66-816c-09e243a188f5, type: gridBlock }
  - { uid: c2eaacd0-4e96-4344-a0ac-26ed644fc503, type: slider }
  - { uid: ref-listing-schema, type: codeExample }
  - { uid: ref-listing-json-data, type: codeExample }
  - { uid: ref-listing-rendering, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are default (title + description) and summary (title + description + image).

<block type="image" url="/docs/images/listing-edit" alt="The listing example block being edited in Volto Hydra" align="center" size="l" />

<block type="listing" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Default" headlineTag="h2" variation="default" data='{"query":[],"querystring":{"b_size":"4","limit":"10","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"transparent"}}' />

<block type="listing" block="24280e07-e962-4414-8ee5-cdaf58ca5f35" headline="Listing: Summary" headlineTag="h2" variation="summary" data='{"query":[],"querystring":{"limit":"5","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" headline="Listing: Grid (Teaser)" headlineTag="h2" data='{"blocks":{"grid-listing-1":{"@type":"listing","querystring":{"limit":"6","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Document"]},{"i":"Subject","o":"plone.app.querystring.operation.selection.none","v":["main folder"]}],"sort_on":"getId","sort_order":"ascending"},"variation":"teaser"}},"blocks_layout":{"items":["grid-listing-1"]},"styles":{"backgroundColor":"transparent"}}' />

<block type="slider" headline="Listing: Image Slider" headlineTag="h2" data='{"autoplayDelay":4000,"autoplayEnabled":false,"autoplayJump":false,"slides":[{"@id":"slider-listing-1","@type":"listing","fieldMapping":{"@id":"href","title":"alt","image":"url"},"querystring":{"query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["Image"]}],"sort_order":"ascending"},"variation":"image"}],"styles":{}}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="schema" data='{"tabs":[{"@id":"ref-listing-schema-javascript-bd0476","label":"Schema","language":"javascript","code":"{\n  \"listing\": {\n    \"itemTypeField\": \"variation\",\n    \"schemaEnhancer\": {\n      \"inheritSchemaFrom\": {\n        \"mappingField\": \"fieldMapping\",\n        \"defaultsField\": \"itemDefaults\",\n        \"filterConvertibleFrom\": \"@default\",\n        \"title\": \"Item Type\",\n        \"default\": \"summary\"\n      }\n    }\n  },\n  \"summary\": {\n    \"fieldMappings\": {\n      \"@default\": {\n        \"@id\": \"href\",\n        \"title\": \"title\",\n        \"description\": \"description\",\n        \"image\": \"image\"\n      }\n    },\n    \"blockSchema\": {\n      \"properties\": {\n        \"href\": {\n          \"title\": \"Link\",\n          \"widget\": \"url\"\n        },\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"textarea\"\n        },\n        \"image\": {\n          \"title\": \"Image\",\n          \"widget\": \"url\"\n        },\n        \"date\": {\n          \"title\": \"Date\",\n          \"widget\": \"date\"\n        }\n      }\n    }\n  },\n  \"default\": {\n    \"fieldMappings\": {\n      \"@default\": {\n        \"@id\": \"href\",\n        \"title\": \"title\",\n        \"description\": \"description\"\n      }\n    },\n    \"blockSchema\": {\n      \"properties\": {\n        \"href\": {\n          \"title\": \"Link\",\n          \"widget\": \"url\"\n        },\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"textarea\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="json-data" data='{"tabs":[{"@id":"ref-listing-json-data-json-829696","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"listing\",\n  \"variation\": \"summary\",\n  \"querystring\": {\n    \"query\": [\n      {\n        \"i\": \"portal_type\",\n        \"o\": \"plone.app.querystring.operation.selection.any\",\n        \"v\": [\n          \"Document\"\n        ]\n      }\n    ],\n    \"sort_on\": \"effective\",\n    \"sort_order\": \"descending\"\n  }\n}\n\n{\n  \"@uid\": \"item-1\",\n  \"@type\": \"summary\",\n  \"href\": \"/news/my-article\",\n  \"title\": \"My Article\",\n  \"description\": \"Article summary text\",\n  \"image\": \"/news/my-article/@@images/image-800x600.jpg\"\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-listing" slotId="rendering" data='{"tabs":[{"@id":"ref-listing-rendering-jsx-f33c73","label":"React","language":"jsx","code":"function ListingBlock({ block, blockId }) {\n  const [items, setItems] = useState([]);\n\n  useEffect(() => {\n    async function load() {\n      const fetchItems = ploneFetchItems({ apiUrl: API_URL });\n      const result = await expandListingBlocks([blockId], {\n        blocks: { [blockId]: block },\n        fetchItems: { listing: fetchItems },\n        itemTypeField: &#39;variation&#39;,\n      });\n      setItems(result.items);\n    }\n    load();\n  }, [block.querystring]);\n\n  return (\n    <div data-block-uid={blockId} className=\"listing-block\">\n      {items.map((item, i) => (\n        <BlockRenderer key={i} block={item} />\n      ))}\n    </div>\n  );\n}"},{"@id":"ref-listing-rendering-vue-3c4a00","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"blockId\" class=\"listing-block\">\n    <BlockRenderer v-for=\"(item, i) in items\" :key=\"i\" :block=\"item\" />\n  </div>\n</template>\n\n<script setup>\nimport { ref, watch } from &#39;vue&#39;;\n\nconst props = defineProps({ block: Object, blockId: String });\nconst items = ref([]);\n\nwatch(() => props.block.querystring, async () => {\n  const fetchItems = ploneFetchItems({ apiUrl: API_URL });\n  const result = await expandListingBlocks([props.blockId], {\n    blocks: { [props.blockId]: props.block },\n    fetchItems: { listing: fetchItems },\n    itemTypeField: &#39;variation&#39;,\n  });\n  items.value = result.items;\n}, { immediate: true });\n</script>"},{"@id":"ref-listing-rendering-svelte-aca768","label":"Svelte","language":"svelte","code":"<script>\n  import BlockRenderer from &#39;./BlockRenderer.svelte&#39;;\n\n  export let block;\n  export let blockId;\n\n  let items = [];\n\n  $: block.querystring, loadItems();\n\n  async function loadItems() {\n    const fetchItems = ploneFetchItems({ apiUrl: API_URL });\n    const result = await expandListingBlocks([blockId], {\n      blocks: { [blockId]: block },\n      fetchItems: { listing: fetchItems },\n      itemTypeField: &#39;variation&#39;,\n    });\n    items = result.items;\n  }\n</script>\n\n<div data-block-uid={blockId} class=\"listing-block\">\n  {#each items as item, i (i)}\n    <BlockRenderer block={item} />\n  {/each}\n</div>"}]}' />
