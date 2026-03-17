<template>
  <f7-page>
    <f7-navbar :sliding="false">
      <f7-nav-title sliding>{{data?.title}}</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-ios="f7:menu" icon-aurora="f7:menu" icon-md="material:menu" @click="changePanelFoo" panel-open="right"></f7-link>
      </f7-nav-right>
      <f7-nav-title-large data-editable-metadata="title">{{data?.title}}</f7-nav-title-large>
    </f7-navbar>

    <f7-block v-if="data?.blocks_layout?.items">
      <Block v-for="block_uid in data.blocks_layout.items" :key="block_uid" :block_uid="block_uid" :block="data.blocks[block_uid]" :data="data"></Block>
    </f7-block>
  </f7-page>
</template>

<script>
  import { provide, reactive } from 'vue';
  import Block from '../components/block.vue';
  import { useStore } from 'framework7-vue';

  export default {
    components: {
      Block
    },
    props: {
      f7route: Object,
      f7router: Object,
    },
    setup() {
      const data = useStore('content');
      const templates = useStore('templates') || {};
      const apiBase = useStore('apiBase') || '';
      const contextPath = useStore('contextPath') || '/';
      const templateState = reactive({});

      provide('templates', templates);
      provide('templateState', templateState);
      provide('apiBase', apiBase);
      provide('contextPath', contextPath);

      return { data };
    },
    methods: {
      changePanelFoo() {}
    },
  }
</script>
