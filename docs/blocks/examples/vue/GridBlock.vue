<template>
  <div :data-block-uid="block['@uid']" class="grid-block">
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1rem' }">
      <div v-for="id in items" :key="id" class="grid-cell">
        <BlockRenderer :block="{ ...block.blocks?.[id], '@uid': id }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BlockRenderer from './BlockRenderer.vue';
const props = defineProps({ block: Object });
const items = computed(() => props.block.blocks_layout?.items || []);
</script>
