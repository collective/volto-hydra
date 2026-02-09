<template>
  <slot :items="expandedItems" :paging="paging" :buildPagingUrl="buildPagingUrl" />
</template>

<script setup>
import { expandListingBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  block: { type: Object, required: true },
  blockUid: { type: String, required: true },
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
  paging: { type: Object, default: null }, // Optional shared paging object
});

// Read facet/search params from URL to pass as extraCriteria
const route = useRoute();
const extraCriteria = {};
for (const [key, value] of Object.entries(route.query)) {
  if (key === 'SearchableText' || key === 'sort_on' || key.startsWith('facet.')) {
    extraCriteria[key] = value;
  }
}

// Use provided paging or create own
const pageSize = 6;
const pagingIn = props.paging || (() => {
  const pageFromUrl = parseInt(route.query[`pg_${props.blockUid}`] || '0', 10);
  return { start: pageFromUrl * pageSize, size: pageSize, total: 0, _seen: 0 };
})();

// Expand the listing block
const { items: expandedItems, paging } = await expandListingBlocks([props.blockUid], {
  blocks: { [props.blockUid]: props.block },
  apiUrl: props.apiUrl,
  contextPath: props.contextPath,
  paging: pagingIn,
  itemTypeField: 'variation',
  extraCriteria,
});

// Build paging URL
const buildPagingUrl = (page) => {
  if (page === 0) return props.contextPath;
  return `${props.contextPath}?pg_${props.blockUid}=${page}`;
};
</script>
