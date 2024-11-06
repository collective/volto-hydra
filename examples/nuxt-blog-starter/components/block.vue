<template>
    <div v-if="block['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
    </div>

    <h1 v-else-if="block['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</h1>

    <div v-else-if="block['@type']=='image'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(block)]" :src="props.url" :class="['image-size-'+props.size, 'image-align-'+props.align]" :srcset="props.srcset" />
    </div>

    <div v-else-if="block['@type']=='gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontail,5"
      :class="['grid', 'grid-cols-'+block.blocks_layout.items.length, 'gap-4', 'grid-rows-1', 'bg-'+(block.styles.backgroundColor||'none')]">
          <Block v-for="uid in block.blocks_layout.items" :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block>
    </div>

    <div v-else-if="block['@type']=='teaser'" class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"  :data-block-uid="block_uid">
       <NuxtLink :to="getUrl(block.href[0])" v-if="block.href.hasPreviewImage">
        <img class="rounded-t-lg"  :src="block.href.hasPreviewImage" alt="" />
       </NuxtLink>
       <div class="p-5">
          <NuxtLink :to="getUrl(block.href[0])">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white" data-editable-field="title">{{block.title}}</h5>
           </NuxtLink>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-editable-field="description">{{block.description}}</p>
          <NuxtLink :to="getUrl(block.href[0])" data-editable-field="href" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            Read more
             <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
            </svg>
          </NuxtLink>
        </div>
     </div>

    <div v-else-if="block['@type']=='slider'" id="default-carousel" class="relative w-full" data-carousel="static"  :data-block-uid="block_uid">
    <!-- Carousel wrapper -->
    <div class="relative h-56 overflow-hidden rounded-lg md:h-96">
        <div class="hidden duration-700 ease-linear" data-carousel-item v-for="block in block.slides">
          <div :class="['bg-center', 'bg-no-repeat', 'bg-[url(\''+imageProps(block.preview_image[0]).url+'\')]', 'bg-gray-700', 'bg-blend-multiply']">
            <div class="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
              <NuxtLink :to="getUrl(block.href[0])">
                  <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white" data-editable-field="title">{{block.title}}</h5>
              </NuxtLink>
              <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{block.description}}</p>
              <div>{{ block.head_title }}</div>
              <NuxtLink :to="getUrl(block.href[0])" data-editable-field="href">{{block.buttonText}}</NuxtLink>
            </div>
          </div>
        </div>
    </div>
    <!-- Slider indicators -->
    <div class="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
        <button type="button" class="w-3 h-3 rounded-full" aria-current="true" aria-label="Slide 1" data-carousel-slide-to="0"></button>
        <button type="button" class="w-3 h-3 rounded-full" aria-current="false" aria-label="Slide 2" data-carousel-slide-to="1"></button>
        <button type="button" class="w-3 h-3 rounded-full" aria-current="false" aria-label="Slide 3" data-carousel-slide-to="2"></button>
        <button type="button" class="w-3 h-3 rounded-full" aria-current="false" aria-label="Slide 4" data-carousel-slide-to="3"></button>
        <button type="button" class="w-3 h-3 rounded-full" aria-current="false" aria-label="Slide 5" data-carousel-slide-to="4"></button>
    </div>
    <!-- Slider controls -->
    <button type="button" class="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" data-carousel-prev>
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
            <svg class="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 1 1 5l4 4"/>
            </svg>
            <span class="sr-only">Previous</span>
        </span>
    </button>
    <button type="button" class="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" data-carousel-next>
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
            <svg class="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
            </svg>
            <span class="sr-only">Next</span>
        </span>
    </button>
   </div>



    <hr v-else-if="block['@type']=='separator'" :data-block-uid="block_uid"></hr>


    
    <div id="accordion-collapse" data-accordion="collapse" v-else-if="block['@type']=='accordian'" :data-block-uid="block_uid">
      <template v-for="block in blocks">
        <h2 id="accordion-collapse-heading-1" :data-block-uid="block_uid">
          <button type="button" class="flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3" data-accordion-target="#accordion-collapse-body-1" aria-expanded="true" aria-controls="accordion-collapse-body-1">
            <span>{{block.title}}</span>
            <svg data-accordion-icon class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/>
            </svg>
          </button>
        </h2>
        <div id="accordion-collapse-body-1" class="hidden" aria-labelledby="accordion-collapse-heading-1">
          <div class="p-5 border border-b-0 border-gray-200 dark:border-gray-700 dark:bg-gray-900">
            <div v-for="uid in block.blocks_layout.items"><Block :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block></div>
          </div>
        </div>
      </template>
    </div>

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
      // https://demo.plone.org/images/penguin1.jpg/@@images/image-32-cecef57e6c78570023eb042501b45dc2.jpeg
      // https://hydra-api.pretagov.com/images/penguin1.jpg/++api++/@@images/image-1800-31be5b7f53648238b68cae0a3ec45dec.jpeg
        var image_url = block.url ? block.url : block['@id']; 
        image_url = image_url.startsWith("/") ? `https://hydra-api.pretagov.com${image_url}/@@images/image`: image_url;
        var srcset = "";

        if (block?.image_scales) {
          srcset = Object.keys(block.image_scales.image[0].scales).map((name) => {
              const scale = block.image_scales.image[0].scales[name];
              return `${image_url}/${scale.download} w${scale.width}`;
          }).join(", ");
          //image_url = image_url +  "/@@images/image";
          image_url = `${image_url}/${block.image_scales.image[0].download}`;

        }

        const size = block.size;
        const align = block.align;
        return {
          url: image_url,
          size: size,
          align: align,
          srcset: srcset
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