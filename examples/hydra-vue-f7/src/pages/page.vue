


<template>

  <f7-page>
    <f7-navbar :sliding="false">
      <f7-nav-title sliding>{{data.title}}</f7-nav-title>
      <f7-nav-right>
        <f7-link icon-ios="f7:menu" icon-aurora="f7:menu" icon-md="material:menu" @click="changePanelFoo" panel-open="right"></f7-link>
      </f7-nav-right>
      <f7-nav-title-large>{{data.title}}</f7-nav-title-large>
    </f7-navbar>

    <template v-for="block_uid in data.blocks_layout.items" v-bind="data.blocks[block_uid]">
      <f7-block-title v-if="data.blocks[block_uid]['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</f7-block-title>
      <f7-block v-if="data.blocks[block_uid]['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in data.blocks[block_uid]['value']" :key="node" :node="node" />
      </f7-block>
      <f7-block v-if="data.blocks[block_uid]['@type']=='image'" :data-block-uid="block_uid">
        <img :src="data.blocks[block_uid].url+'/@@images/image'"/>
      </f7-block>
    </template>
  </f7-page>

</template>


<script>
  import SideNav from './sidenav.vue';
  import RichText from '../components/richtext.vue';
  import { useStore } from 'framework7-vue';
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
      imageProps(block) {
        const image_url = data.blocks[id]?.image_scales
            ? `${data.blocks[id].url}/++api++/${data.blocks[id]?.image_scales.image[0].download}`
            : data.blocks[id].url;
        const size = data.blocks[id].size;
        const align = data.blocks[id].align;
        return {
          url: image_url,
          size: size,
          align: align
        }
      }
    },
    props: {
    },
    data() {
      
      return {
        data: useStore('content'),
      }
    }

  }
</script>
