<template>
  <div :data-block-uid="block['@uid']">
    <a v-if="href" :href="href" data-edit-link="href">
      <img data-edit-media="url" :src="block.url" :alt="block.alt" />
    </a>
    <img v-else data-edit-media="url" :src="block.url" :alt="block.alt" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const href = computed(() => props.block.href?.[0]?.['@id'] || props.block.href);
</script>
