<template>
  <div id="content">
    <BlockRenderer v-for="block in items" :key="block['@uid']" :block="block" />
  </div>
</template>

<script setup>
import BlockRenderer from '$examples/BlockRenderer.vue';

defineProps({ items: { type: Array, default: () => [] } });
</script>
