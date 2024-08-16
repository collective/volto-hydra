<template>
    <f7-link v-if="node.type =='link'" :href="node.data.url" external :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></f7-link>
    <p v-else-if="node.type =='p'" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></p>
    <h1 v-else-if="node.type =='h1'" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></h1>
    <h2 v-else-if="node.type =='h2'" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></h2>
    <li v-else-if="node.type =='li'" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></li>
    <ul v-else-if="node.type =='ul'" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></ul>
    <template v-else :is="node.type" :data-node-id="node['node-id']">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></template>
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