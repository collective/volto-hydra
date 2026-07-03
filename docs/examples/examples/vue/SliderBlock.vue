<template>
  <div :data-block-uid="block['@uid']" class="slider-block">
    <div
      v-for="(slide, i) in slides"
      :key="slide['@id']"
      :data-block-uid="slide['@id']"
      class="slide"
      v-show="i === current"
    >
      <img
        v-if="slide.preview_image"
        data-edit-media="preview_image"
        :src="getImageUrl(slide.preview_image)"
        alt=""
      />
      <span data-edit-text="head_title">{{ slide.head_title }}</span>
      <h2 data-edit-text="title">{{ slide.title }}</h2>
      <p data-edit-text="description">{{ slide.description }}</p>
      <button data-edit-text="buttonText">{{ slide.buttonText }}</button>
    </div>
    <div class="slider-dots">
      <button
        v-for="(_, i) in slides"
        :key="i"
        @click="current = i"
        :class="{ active: i === current }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });
const current = ref(0);
// Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide's @uid.
const slides = computed(() => expandTemplatesSync(props.block.slides || [], { idField: '@id' }));
</script>
