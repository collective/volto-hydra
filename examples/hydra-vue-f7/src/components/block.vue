<template>
      <f7-block-title v-if="block['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</f7-block-title>
      <div v-if="block['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
      </div>
      <f7-block v-if="block['@type']=='image'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(block)]" :src="props.url" :class="['image-size-'+props.size, 'image-align-'+props.align]" />
      </f7-block>
      <f7-block v-if="block['@type']=='gridBlock'" :data-block-uid="block_uid">
        <div :class="['grid', 'grid-cols-'+block.blocks_layout, 'grid-gap']">
          <div v-for="uid in block.blocks_layout"><Block :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block></div>
        </div>
      </f7-block>
      <f7-card v-if="block['@type']=='teaser'" :data-block-uid="block_uid">
      <f7-card-header
        valign="bottom"
        style="background-image: url(https://cdn.framework7.io/placeholder/people-1000x600-6.jpg)"
        >{{block.title}}</f7-card-header
      >
      <f7-card-content>
        <p>{{block.Description}}</p>
      </f7-card-content>
      <f7-card-footer>
        <f7-link>Like</f7-link>
        <f7-link>Read more</f7-link>
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