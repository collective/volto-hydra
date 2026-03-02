<template>
  <div :data-block-uid="block['@uid']" class="introduction-block">
    <h1 data-edit-text="/title">{{ content.title }}</h1>
    <p v-if="content.description" data-edit-text="/description" class="description">{{ content.description }}</p>
  </div>
</template>

<script setup>
defineProps({ block: Object, content: Object });
</script>
