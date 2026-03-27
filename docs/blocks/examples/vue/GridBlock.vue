<template>
  <div :data-block-uid="id" class="grid-block">
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1rem' }">
      <div v-for="col in columns" :key="col['@id']" :data-block-uid="col['@id']" class="grid-column">
        <Block v-for="item in expand(col.blocks_layout?.items || [], col.blocks, col['@id'])"
          :key="item['@uid']" :data="item" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { expandListingBlocks } from '@hydra-js/hydra.js';
const props = defineProps({ block: Object, id: String });
const columns = computed(() => props.block.columns || []);
function expand(layout, blocks, containerId) {
  return expandListingBlocks(layout, { blocks, containerId });
}
</script>
