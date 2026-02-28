<template>
  <div :data-block-uid="block['@uid']" class="columns-block">
    <div style="display: flex; gap: 1rem">
      <ColumnBlock
        v-for="id in block.columns?.items || []"
        :key="id"
        :block="{ ...block.columns.blocks[id], '@uid': id }"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
