<template>
    <a v-if="node.type =='link'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></a>
    <p v-else-if="node.type =='p'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></p>
    <h1 v-else-if="node.type =='h1'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></h1>
    <h2 v-else-if="node.type =='h2'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></h2>
    <li v-else-if="node.type =='li'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></li>
    <ul v-else-if="node.type =='ul'">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></ul>
    <template v-else :is="node.type">{{ node.text }}<RichText v-for="child in subs" :key="child" :node="child"/></template>
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