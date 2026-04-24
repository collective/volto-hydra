<template>
  <div :data-block-uid="block['@uid']" class="introduction-block">
    <div class="introduction-body" data-edit-text="value">
      <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
    </div>
  </div>
</template>

<script setup>
import SlateNode from './SlateNode.vue';
defineProps({ block: Object });
</script>
