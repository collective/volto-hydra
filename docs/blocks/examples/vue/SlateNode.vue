<template>
  <template v-if="!node.type">{{ node.text }}</template>
  <a v-else-if="node.type === 'link'" :href="node.data?.url" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </a>
  <component v-else :is="node.type" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </component>
</template>

<script setup>
defineProps({ node: Object });
</script>
