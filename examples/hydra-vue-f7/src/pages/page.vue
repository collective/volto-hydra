


<template>

  <f7-page>
    <f7-navbar :sliding="false">
      <f7-nav-title sliding>{{data.title}}</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-ios="f7:menu" icon-aurora="f7:menu" icon-md="material:menu" @click="changePanelFoo" panel-open="right"></f7-link>
      </f7-nav-right>
      <f7-nav-title-large>{{data.title}}</f7-nav-title-large>
    </f7-navbar>

    <template v-for="block_uid in data.blocks_layout.items">
      <f7-block-title v-if="data.blocks[block_uid]['@type']=='title'">{{ data.blocks[block_uid]['title']}}</f7-block-title>
      <f7-block v-if="data.blocks[block_uid]['@type']=='slate'">
        <RichText v-for="node in data.blocks[block_uid]['value']" :key="node" :node="node" />
      </f7-block>
    </template>
  </f7-page>

</template>


<script>
  import SideNav from './sidenav.vue';
  import RichText from '../components/richtext.vue';
  export default {
    components: {
      RichText
    },
    mounted() {
      this.$root.panelComponent = SideNav;
      this.$root.panelProps = {
        navigation: this.data['@components'].navigation.items,
      }
    },
    methods: {
      changePanelFoo() {
        //this.$root.panelProps.data = data;
      },
    },
    props: {
      data: Object,
    }
  }
</script>
