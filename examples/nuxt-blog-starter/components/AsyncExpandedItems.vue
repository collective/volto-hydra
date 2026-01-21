<template>
  <!-- Scoped slot: parent controls layout, we provide items + paging -->
  <slot :items="expandedItems" :paging="paging" :buildPagingUrl="buildPagingUrl" />
</template>

<script setup>
import { expandListingBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  blocks: { type: Object, required: true },  // { blockId: block, ... }
  layout: { type: Array, required: true },   // [blockId, ...]
  paging: { type: Object, required: true },  // Shared paging object
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
  pagingKey: { type: String, required: true },
});

// Read facet/search params from URL to pass as extraCriteria
const route = useRoute();
const extraCriteria = {};

// Pass through SearchableText, sort_on, and facet.* params
for (const [key, value] of Object.entries(route.query)) {
  if (key === 'SearchableText' || key === 'sort_on' || key.startsWith('facet.')) {
    extraCriteria[key] = value;
  }
}

// Expand dynamic blocks - uses shared paging object
const { items: expandedItems, paging } = await expandListingBlocks(
  props.blocks,
  props.layout,
  { apiUrl: props.apiUrl, contextPath: props.contextPath, paging: props.paging, itemTypeField: 'variation', extraCriteria }
);

// Build paging URL
const buildPagingUrl = (page) => {
  if (page === 0) return props.contextPath;
  return `${props.contextPath}?pg_${props.pagingKey}=${page}`;
};
</script>
