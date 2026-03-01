<template>
  <div :data-block-uid="block['@uid']" style="flex: 1">
    <h4 v-if="block.title" data-edit-text="title">{{ block.title }}</h4>
    <BlockRenderer
      v-for="id in block.blocks_layout?.items || []"
      :key="id"
      :block="{ ...block.blocks_layout.blocks[id], '@uid': id }"
    />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
