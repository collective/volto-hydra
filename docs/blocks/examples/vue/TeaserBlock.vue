<template>
  <div :data-block-uid="block['@uid']" class="teaser-block">
    <div v-if="!href" class="teaser-placeholder">
      <p>Select a target page for this teaser</p>
    </div>
    <template v-else>
      <img v-if="imageSrc" data-edit-media="preview_image" :src="imageSrc" alt="" />
      <h3 data-edit-text="title">{{ title }}</h3>
      <p data-edit-text="description">{{ description }}</p>
      <a :href="href" data-edit-link="href">Read more</a>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });

const hrefObj = computed(() => props.block.href?.[0] || null);
const useBlockData = computed(() => props.block.overwrite || !hrefObj.value?.title);
const title = computed(() => useBlockData.value ? props.block.title : hrefObj.value?.title || '');
const description = computed(() => useBlockData.value ? props.block.description : hrefObj.value?.description || '');
const href = computed(() => hrefObj.value?.['@id'] || '');
const imageSrc = computed(() => {
  if (props.block.preview_image) {
    return getImageUrl(props.block.preview_image);
  }
  return hrefObj.value?.hasPreviewImage ? getImageUrl(`${href.value}/@@images/preview_image`) : '';
});
</script>
