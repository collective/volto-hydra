<template>
  <div :data-block-uid="block['@uid']" class="hero-block">
    <img v-if="block.image" data-edit-media="image" :src="heroImageSrc" alt="Hero image" />
    <h1 data-edit-text="heading">{{ block.heading }}</h1>
    <p data-edit-text="subheading" v-html="subheadingHtml" />
    <div class="hero-description">
      <SlateNode v-for="(node, i) in block.description || []" :key="i" :node="node" />
    </div>
    <a data-edit-text="buttonText" data-edit-link="buttonLink" :href="buttonLink">
      {{ block.buttonText }}
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });
const subheadingHtml = computed(() => (props.block.subheading || '').replace(/\n/g, '<br>'));
const buttonLink = computed(() => props.block.buttonLink?.[0]?.['@id'] || '');
const heroImageSrc = computed(() => getImageUrl(props.block.image));
</script>
