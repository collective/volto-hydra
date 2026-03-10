<template>
  <div :data-block-uid="block['@uid']" class="video-block">
    <iframe
      v-if="youtubeId"
      :src="`https://www.youtube.com/embed/${youtubeId}`"
      allowfullscreen
      style="width: 100%; aspect-ratio: 16/9; border: none"
    />
    <video v-else-if="block.url" :src="block.url" controls style="width: 100%" />
    <p v-else>No video URL set</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const youtubeId = computed(() => {
  const url = props.block.url || '';
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];
});
</script>
