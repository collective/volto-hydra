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

// Expand dynamic blocks - uses shared paging object
const { items: expandedItems, paging } = await expandListingBlocks(
  props.blocks,
  props.layout,
  { apiUrl: props.apiUrl, contextPath: props.contextPath, paging: props.paging, itemTypeField: 'variation' }
);

// Build paging URL
const buildPagingUrl = (page) => {
  if (page === 0) return props.contextPath;
  return `${props.contextPath}?pg_${props.pagingKey}=${page}`;
};
</script>
