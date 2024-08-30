<template>
    <f7-block-title v-if="block['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</f7-block-title>
    <div v-else-if="block['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
    </div>
    <f7-block v-else-if="block['@type']=='image'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(block)]" :src="props.url" :class="['image-size-'+props.size, 'image-align-'+props.align]" />
    </f7-block>
    <f7-block v-else-if="block['@type']=='gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontail,5">
        <div :class="['grid', 'grid-cols-'+block.blocks_layout, 'grid-gap']">
            <div v-for="uid in block.blocks_layout"><Block :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block></div>
        </div>
    </f7-block>
    <f7-card v-else-if="block['@type']=='teaser'" :data-block-uid="block_uid">
        <f7-card-header
            valign="bottom"
            :style="{'background-image': ('url()' ? block.href.hasPreviewImage : false)}" data-editable-field="title"
            >{{block.title}}</f7-card-header
        >
        <f7-card-content>
            <p data-editable-field="description">{{block.description}}</p>
        </f7-card-content>
        <f7-card-footer>
            <f7-link :href="getUrl(block.href[0])" data-editable-field="href">Read more</f7-link> 
        </f7-card-footer>
    </f7-card>
</template>
<script>
  import RichText from './richtext.vue';

export default {
  name: 'Block',
  components: {
      RichText,
    },
  props: {
    block_uid: {
      type: String,
      required: true
    },
    block: {
      type: Object,
      required: true
    },
    data: {
      type: Object,
      required: true
    }
  },
  methods: {
    getUrl(href) {
        if (href['@id']) {
            const url = new URL(href['@id']);
            return url.pathname;
        } else {
            return href
        }

    },
    imageProps(block) {
        var image_url = block?.image_scales
            ? `${block.url}/++api++/${block?.image_scales.image[0].download}`
            : block.url;
        image_url = image_url.startsWith("https://hydra.pretagov.com") ? image_url + "/@@images/image" : image_url;
        const size = block.size;
        const align = block.align;
        return {
          url: image_url,
          size: size,
          align: align
        }
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