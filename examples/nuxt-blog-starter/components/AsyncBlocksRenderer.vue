<template>
  <!-- Scoped slot: parent controls layout, we provide expanded items -->
  <slot :items="expandedItems" :paging="currentPaging" />
</template>

<script setup>
import { ref, watch, toRef } from 'vue';
import { expandTemplates, expandListingBlocks, getAccessToken } from '@hydra-js/hydra.js';

const props = defineProps({
  blocks: { type: Object, default: () => ({}) },
  layout: { type: Array, default: () => [] },
  allowedLayouts: { type: Array, default: null },
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
  paging: { type: Object, default: null },
  pagingKey: { type: String, default: '' },
});

const runtimeConfig = useRuntimeConfig();
const route = useRoute();

// Reactive state for expanded items
const expandedItems = ref([]);
const currentPaging = ref(props.paging || { start: 0, size: 10, total: 0 });

// Template loader
const loadTemplate = async (templateId) => {
  const baseUrl = runtimeConfig.public.backendBaseUrl;
  const url = `${baseUrl}/++api++${templateId}`;
  const headers = { Accept: 'application/json' };

  // getAccessToken() works client-side (checks URL and sessionStorage)
  // For SSR, fall back to route.query.access_token
  const token = getAccessToken() || route.query.access_token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${templateId}`);
  }
  return response.json();
};

// Expand templates and listings
async function expand() {
  // Step 1: Expand templates
  const templateState = {};
  const templateItems = await expandTemplates(props.layout, {
    blocks: props.blocks,
    templateState,
    loadTemplate,
    allowedLayouts: props.allowedLayouts,
  });

  // Read facet/search params from URL to pass as extraCriteria
  const extraCriteria = {};
  for (const [key, value] of Object.entries(route.query)) {
    if (key === 'SearchableText' || key === 'sort_on' || key.startsWith('facet.')) {
      extraCriteria[key] = value;
    }
  }

  // Step 2: Expand listings (takes items from expandTemplates directly)
  const pagingObj = props.paging || { start: 0, size: 10, total: 0 };
  const result = await expandListingBlocks(templateItems, {
    apiUrl: props.apiUrl,
    contextPath: props.contextPath,
    paging: pagingObj,
    itemTypeField: 'variation',
    extraCriteria,
  });

  expandedItems.value = result.items;
  currentPaging.value = result.paging;
}

// Initial expansion (for SSR)
await expand();

// Re-expand when blocks change (for onEditChange updates with nodeIds)
watch(() => props.blocks, expand, { deep: true });
</script>
