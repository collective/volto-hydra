<template>
    <f7-link v-if="node.type =='link'" :href="node.data.url" external :data-node-id="node['nodeId']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></f7-link>
    <template v-else-if="!node.type">{{ node.text }}</template>
    <component v-else :is="node.type" :data-node-id="node['nodeId']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></component>
</template>
<script>
export default {
  name: 'RichText',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  computed: {
    subs() {
      const { children } = this.node
      return children && children || []
    }
  }
}
</script>