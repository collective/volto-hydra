<template>
  <template v-if="node.type === 'link'">
    <NuxtLink :to="getUrl(node.data)" class="underline" external :data-node-id="node.nodeId">
      {{ node.text }}
      <RichText v-for="child in subs" :key="child.nodeId" :node="child" />
    </NuxtLink>
  </template>
  <ul v-if="node.type === 'ul'" class="list-disc list-inside mx-4">
    {{ node.text }}
    <RichText v-for="child in subs" :key="child.nodeId" :node="child" />
  </ul>
  <span v-else-if="!node.type" :data-node-id="node.nodeId">
    {{ node.text }}
  </span>
  <component v-else :is="node.type" :data-node-id="node.nodeId">
    {{ node.text }}
    <RichText v-for="child in subs" :key="child.nodeId" :node="child" />
  </component>
</template>

<script>
export default {
  name: 'RichText',
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  computed: {
    subs() {
      const { children } = this.node;
      return (children && children) || [];
    },
  },
};
</script>
