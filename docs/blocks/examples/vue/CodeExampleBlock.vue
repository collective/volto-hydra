<template>
  <div :data-block-uid="block['@uid']" class="code-example">
    <h3 v-if="block.title" data-edit-text="title">{{ block.title }}</h3>
    <pre data-edit-text="code" style="background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.875rem;">
      <code :class="block.language ? `language-${block.language}` : undefined">{{ block.code || '' }}</code>
    </pre>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
