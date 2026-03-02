<template>
  <nav :data-block-uid="block['@uid']" class="toc-block">
    <ul>
      <li>Table of Contents (generated from page headings)</li>
    </ul>
  </nav>
</template>

<script setup>
defineProps({ block: Object });
</script>
