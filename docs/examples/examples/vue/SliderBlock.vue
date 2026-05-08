<template>
  <div :data-block-uid="block['@uid']" class="slider-block">
    <div
      v-for="(slide, i) in block.slides || []"
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
        v-for="(_, i) in block.slides || []"
        :key="i"
        @click="current = i"
        :class="{ active: i === current }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getImageUrl } from './utils.js';
defineProps({ block: Object });
const current = ref(0);
</script>
