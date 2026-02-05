<template>
  <!-- Scoped slot: parent controls layout, we provide expanded items -->
  <slot :items="expandedItems" :paging="paging" />
</template>

<script setup>
import { expandTemplates, expandListingBlocks } from '@hydra-js/hydra.js';

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

// Template loader
const loadTemplate = async (templateId) => {
  const baseUrl = runtimeConfig.public.backendBaseUrl;
  const url = `${baseUrl}/++api++${templateId}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${templateId}`);
  }
  return response.json();
};

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
const { items: expandedItems, paging } = await expandListingBlocks(templateItems, {
  apiUrl: props.apiUrl,
  contextPath: props.contextPath,
  paging: pagingObj,
  itemTypeField: 'variation',
  extraCriteria,
});
</script>
