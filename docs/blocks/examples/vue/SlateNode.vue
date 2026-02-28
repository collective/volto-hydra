<template>
  <p v-if="node.type === 'p'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></p>
  <h1 v-else-if="node.type === 'h1'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h1>
  <h2 v-else-if="node.type === 'h2'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h2>
  <h3 v-else-if="node.type === 'h3'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h3>
  <blockquote v-else-if="node.type === 'blockquote'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></blockquote>
  <ul v-else-if="node.type === 'ul'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></ul>
  <ol v-else-if="node.type === 'ol'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></ol>
  <li v-else-if="node.type === 'li'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></li>
  <a v-else-if="node.type === 'link'" :href="node.data?.url"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></a>
  <strong v-else-if="node.type === 'strong'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></strong>
  <em v-else-if="node.type === 'em'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></em>
  <del v-else-if="node.type === 'del'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></del>
  <u v-else-if="node.type === 'u'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></u>
  <code v-else-if="node.type === 'code'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></code>
  <template v-else>{{ node.text }}</template>
</template>

<script setup>
defineProps({ node: Object });
</script>
