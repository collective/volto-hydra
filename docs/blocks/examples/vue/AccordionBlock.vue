<template>
  <div :data-block-uid="block['@uid']" class="accordion-block">
    <button @click="open = !open" class="accordion-header">
      <BlockRenderer
        v-for="id in block.header?.items || []"
        :key="id"
        :block="{ ...block.header.blocks[id], '@uid': id }"
      />
      <span>{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="accordion-content">
      <BlockRenderer
        v-for="id in block.content?.items || []"
        :key="id"
        :block="{ ...block.content.blocks[id], '@uid': id }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ block: Object });
const open = ref(false);
</script>
