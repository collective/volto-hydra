<template>
  <div id="content">
    <BlockRenderer v-for="block in items" :key="block['@uid']" :block="block" :content="content" />
  </div>
</template>

<script setup>
import BlockRenderer from '$examples/BlockRenderer.vue';

defineProps({
  items: { type: Array, default: () => [] },
  content: { type: Object, default: () => ({}) },
});
</script>
