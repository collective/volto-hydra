<template>
  <slot :items="items" />
</template>

<script setup>
import { computed, inject } from 'vue';
import { expandTemplatesSync, isEditMode } from '@hydra-js/hydra.js';

const props = defineProps({
  blocks: { type: Object, default: () => ({}) },
  layout: { type: Array, default: () => [] },
  templates: { type: Object, default: () => ({}) },
  allowedLayouts: { type: Array, default: null },
});

// Inject shared templateState from page level
const templateState = inject('templateState', {});

const items = computed(() => {
  // In edit mode, admin handles template merging - just pass through with @uid
  if (isEditMode()) {
    return props.layout.map(id => {
      const block = props.blocks[id];
      return block ? { ...block, '@uid': id } : null;
    }).filter(Boolean);
  }

  // Expand templates synchronously using pre-loaded templates
  return expandTemplatesSync(props.layout, {
    blocks: props.blocks,
    templateState,
    templates: props.templates,
    allowedLayouts: props.allowedLayouts,
  });
});
</script>
