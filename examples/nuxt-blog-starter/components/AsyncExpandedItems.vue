<template>
  <!-- Scoped slot: parent controls layout, we provide expanded items -->
  <slot :items="items" />
</template>

<script setup>
import { expandListingBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  id: { type: String, required: true },
  block: { type: Object, required: true },
  paging: { type: Object, required: true },
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
});

// Read facet/search params from URL to pass as extraCriteria
const route = useRoute();
const extraCriteria = {};
for (const [key, value] of Object.entries(route.query)) {
  if (key === 'SearchableText' || key === 'sort_on' || key.startsWith('facet.')) {
    extraCriteria[key] = value;
  }
}

const items = await expandListingBlocks([props.id], {
  blocks: { [props.id]: props.block },
  apiUrl: props.apiUrl,
  contextPath: props.contextPath,
  paging: props.paging,
  itemTypeField: 'variation',
  extraCriteria,
});
</script>
