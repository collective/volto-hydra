<template>
  <!-- Caller controls item rendering via scoped slot -->
  <slot :items="items" />
  <!-- Render own paging when no shared paging was passed in -->
  <Paging v-if="ownsPaging && paging.totalPages > 1" :paging="paging" :build-url="buildPagingUrl" />
</template>

<script setup>
import { inject, ref, watch } from 'vue';
import { expandListingBlocks, ploneFetchItems } from '@hydra-js/hydra.js';

const props = defineProps({
  id: { type: String, required: true },
  block: { type: Object, required: true },
  // Shared paging object (for combined paging in containers like gridBlock).
  // When null, the listing creates and owns its own paging.
  paging: { type: Object, default: null },
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
});

const DEFAULT_PAGE_SIZE = 6;
const injectedPages = inject('pages', {});

const route = useRoute();

function buildExtraCriteria(query) {
  const criteria = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'SearchableText' || key === 'sort_on' || key.startsWith('facet.')) {
      criteria[key] = value;
    }
  }
  return criteria;
}

// Create own paging if none shared
const ownsPaging = !props.paging;
const listingPageSize = props.block.b_size || DEFAULT_PAGE_SIZE;
const listingPage = ownsPaging
  ? ((injectedPages.value || injectedPages)[props.id] || 0)
  : 0;
const paging = props.paging || { start: listingPage * listingPageSize, size: listingPageSize };

async function fetchItems(extraCriteria) {
  // Create fresh paging object each call — expandListingBlocks mutates it
  const fetchPaging = { start: paging.start, size: paging.size };
  return await expandListingBlocks([props.id], {
    blocks: { [props.id]: props.block },
    fetchItems: { listing: ploneFetchItems({ apiUrl: props.apiUrl, contextPath: props.contextPath, extraCriteria }) },
    paging: fetchPaging,
    itemTypeField: 'variation',
  });
}

const items = ref(await fetchItems(buildExtraCriteria(route.query)));

// Re-fetch when route query changes (e.g. header search on search page)
watch(() => route.query, async (newQuery) => {
  items.value = await fetchItems(buildExtraCriteria(newQuery));
});

// Build paging URL for own paging (per-listing)
let contextPath = props.contextPath;
const buildPagingUrl = (page) => {
  if (page === 0) return contextPath;
  return `${contextPath}/@pg_${props.id}_${page}`;
};
</script>
