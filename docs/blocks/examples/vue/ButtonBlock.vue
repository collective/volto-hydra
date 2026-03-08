<template>
  <div :data-block-uid="block['@uid']" class="button-block">
    <a :href="href" data-edit-text="title" data-edit-link="href" class="btn">
      {{ block.title || 'Button' }}
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const href = computed(() => props.block.href?.[0]?.['@id'] || props.block.href || '#');
</script>
