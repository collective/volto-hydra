<template>
  <!-- Caller controls item rendering via scoped slot -->
  <slot :items="items" />
  <!-- Render own paging when no shared paging was passed in -->
  <Paging v-if="ownsPaging && paging.totalPages > 1" :paging="paging" :build-url="buildPagingUrl" />
</template>

<script setup>
import { inject, ref, reactive, watch } from 'vue';
import { expandListingBlocks, ploneFetchItems } from '@hydra-js/hydra.js';

const props = defineProps({
  id: { type: String, required: true },
  block: { type: Object, required: true },
  // Shared paging state (for combined paging in containers like gridBlock).
  // When null, the listing creates and owns its own paging.
  paging: { type: Object, default: null },
  // Number of items already seen by prior staticBlocks calls (for grid position tracking)
  seen: { type: Number, default: 0 },
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
const paging = props.paging || reactive({ start: listingPage * listingPageSize, size: listingPageSize });

async function fetchListing(query) {
  return await expandListingBlocks([props.id], {
    blocks: { [props.id]: props.block },
    fetchItems: { listing: ploneFetchItems({ apiUrl: props.apiUrl, contextPath: props.contextPath, extraCriteria: buildExtraCriteria(query) }) },
    paging: { start: paging.start, size: paging.size },
    seen: props.seen,
    itemTypeField: 'variation',
  });
}

// Initial fetch
const result = await fetchListing(route.query);
const items = ref(result.items);
Object.assign(paging, result.paging);

// Re-fetch when route query changes (e.g. header search on search page).
// No mutation dance needed — expandListingBlocks returns a fresh paging object.
watch(() => route.query, async (newQuery) => {
  const result = await fetchListing(newQuery);
  items.value = result.items;
  Object.assign(paging, result.paging);
});

// Build paging URL for own paging (per-listing)
let contextPath = props.contextPath;
const buildPagingUrl = (page) => {
  if (page === 0) return contextPath;
  return `${contextPath}/@pg_${props.id}_${page}`;
};
</script>
