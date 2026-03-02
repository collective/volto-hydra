<template>
  <section
    :data-block-uid="block['@uid']"
    class="highlight-block"
    :style="{ backgroundImage: block.image ? `url(${block.image})` : undefined }"
  >
    <div class="highlight-overlay">
      <h2 data-edit-text="title">{{ block.title }}</h2>
      <div class="highlight-body">
        <SlateNode v-for="(node, i) in block.description || []" :key="i" :node="node" />
      </div>
      <a
        v-if="block.cta_title"
        :href="ctaLink"
        data-edit-text="cta_title"
        data-edit-link="cta_link"
        class="highlight-cta"
      >
        {{ block.cta_title }}
      </a>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const ctaLink = computed(() => props.block.cta_link?.[0]?.['@id'] || '');
</script>
