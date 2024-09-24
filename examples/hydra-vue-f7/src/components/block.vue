<template>
    <div v-if="block['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
    </div>
    <!-- <f7-block-title v-else-if="block['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</f7-block-title> -->
    <f7-block v-else-if="block['@type']=='image'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(block)]" :src="props.url" :class="['image-size-'+props.size, 'image-align-'+props.align]" />
    </f7-block>
    <f7-block v-else-if="block['@type']=='gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontail,5">
        <div :class="['grid', 'grid-cols-'+block.blocks_layout.items.length, 'grid-gap', 'column', 'style-bg-'+(block.styles.backgroundColor||'none')]">
            <Block v-for="uid in block.blocks_layout.items" :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block>
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
    <swiper-container :pagination="true" class="demo-swiper-multiple" :space-between="50"
    :speed="block.autoplayDelay ? block.autoplayEnabled : ''" v-else-if="block['@type']=='slider'" :data-block-uid="block_uid">
      <swiper-slide v-for="block in block.slides">
        <div :style="{'background-image': imageProps(block.preview_image[0]).url}">
        <f7-card>
          <div>{{ block.head_title }}</div>
        <f7-card-header
            valign="bottom"
             data-editable-field="title"
            >{{block.title}}</f7-card-header
        >
        <f7-card-content>
            <p data-editable-field="description">{{block.description}}</p>
        </f7-card-content>
        <f7-card-footer>
            <f7-link :href="getUrl(block.href[0])" data-editable-field="href">{{block.buttonText}}</f7-link> 
        </f7-card-footer>
        </f7-card>
       </div>
      </swiper-slide >
    </swiper-container>
    <hr v-else-if="block['@type']=='separator'" :data-block-uid="block_uid"></hr>
    <f7-list strong  inset-md accordion-list  v-else-if="block['@type']=='accordian'" :data-block-uid="block_uid">
      <f7-list-item v-for="block in blocks" accordion-item :title="block.title" :data-block-uid="block_uid">
        <f7-accordion-content>
          <f7-block>
            <div v-for="uid in block.blocks_layout.items"><Block :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block></div>
          </f7-block>
        </f7-accordion-content>
      </f7-list-item>
    </f7-list>
</template>
<script>
  import RichText from './richtext.vue';
  // Import Swiper Vue.js components
  import { Swiper, SwiperSlide } from 'swiper/vue';

  // Import Swiper styles
  import 'swiper/css';

export default {
  name: 'Block',
  components: {
      RichText,
      Swiper,
      SwiperSlide,
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
        var id = block.url ? block?.url : block['@id']; 
        var image_url = block?.image_scales
            ? `${id}/++api++/${block?.image_scales.image[0].download}`
            : id;
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