<template>
  <div :data-block-uid="block['@uid']" :class="'separator-block separator-' + (block.styles?.align || 'full')">
    <hr />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
