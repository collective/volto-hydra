<template>
    <div v-if="block['@type']=='slate'" :data-block-uid="block_uid" data-editable-field="value">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
    </div>

    <div v-else-if="block['@type']=='introduction'" :data-block-uid="block_uid" data-editable-field="value">
      <hr/>
        <RichText v-for="node in block['value']" :key="node" :node="node" />
      <hr/>  
    </div>

    <h1 v-else-if="block['@type']=='title'" :data-block-uid="block_uid">{{ data.title}}</h1>

    <p v-else-if="block['@type']=='description'" :data-block-uid="block_uid"><i>{{ data.value}}</i></p>

    <div v-else-if="block['@type']=='image'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(block)]" :src="props.url" :width="props.width" :class="['image-size-'+props.size, 'image-align-'+props.align]" :srcset="props.srcset" />
    </div>

    <div v-else-if="block['@type']=='leadimage'" :data-block-uid="block_uid">
        <img v-for="props in [imageProps(data)]" :src="props.url" :class="['image-size-'+props.size, 'image-align-'+props.align]" :srcset="props.srcset" loading="lazy" decoding="async" />
    </div>

    <div v-else-if="block['@type']=='gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontail,5"
      :class="['grid', 'grid-cols-'+block.blocks_layout.items.length, 'gap-4', 'grid-rows-1', 'bg-'+(block.styles.backgroundColor||'none')]">
          <Block v-for="uid in block.blocks_layout.items" :block_uid="uid" :block="block.blocks[uid]" :data="data"></Block>
    </div>

    <div v-else-if="block['@type']=='teaser'" class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"  :data-block-uid="block_uid">
       <NuxtLink :to="getUrl(block.href[0])" v-if="block.href.hasPreviewImage">
        <img class="rounded-t-lg" v-for="props in [imageProps(block.href[0])]"  :src="props.url" :srcset="props.srcset" alt="" v-if="block.href[0].hasPreviewImage"/>
       </NuxtLink>
       <div class="p-5">
          <NuxtLink :to="getUrl(block.href[0])" v-if="block?.title">
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white" data-editable-field="title">{{block.title}}</h5>
           </NuxtLink>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-editable-field="description" v-if="block?.description">{{block.description}}</p>
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
        <div :class="['bg-center', 'bg-no-repeat', 'bg-gray-700', 'bg-blend-multiply',imageProps(block).bg,  'hidden', 'duration-700', 'ease-linear']"  data-carousel-item v-for="block in block.slides">
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
    <!-- Slider indicators -->
    <div class="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
        <button v-for="(block, index) in block.slides" type="button" class="w-3 h-3 rounded-full" aria-current="true" aria-label="Slide 1" :data-carousel-slide-to="index"></button>
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


    
    <div v-else-if="block['@type']=='accordion'"  data-accordion="collapse"  :data-block-uid="block_uid">
      <template v-for="panelid in block.data.blocks_layout.items">
        <h2 :id="panelid" :data-block-uid="panelid">
          <button type="button" class="flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3" 
          :data-accordion-target="`#accordion-collapse-body-${ panelid }`" aria-expanded="true" aria-controls="accordion-collapse-body-1">
            <span>{{block.data.blocks[panelid].title}}</span>
            <svg data-accordion-icon class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/>
            </svg>
          </button>
        </h2>
        <div :id="`accordion-collapse-body-${ panelid }`" class="hidden" :aria-labelledby="panelid">
          <div class="p-5 border border-b-0 border-gray-200 dark:border-gray-700 dark:bg-gray-900">
            <div v-for="uid in block.data.blocks[panelid].blocks_layout.items">
              <Block :block_uid="uid" :block="block.data.blocks[panelid].blocks[uid]" :data="data"></Block>
            </div>
          </div>
        </div>
      </template>
    </div>



    <div v-else-if="block['@type']=='listing'" :data-block-uid="block_uid">
      <template  v-for="item in items" >
        <NuxtLink :to="getUrl(item)" class="flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow md:flex-row md:max-w-xl hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
          <img class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg" :src="props.url" alt="" v-if="props?.url" v-for="props in [imageProps(item)]">
          <div class="flex flex-col justify-between p-4 leading-normal">
            <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{item.title}}</h5>
            <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ item.description }}.</p>
          </div>
        </NuxtLink>
      </template>
    </div>

    <template v-else-if="block['@type']=='heading'" :data-block-uid="block_uid">
      <h2>{{ block.heading }}</h2>
    </template>

    <div v-else-if="block['@type']=='slateTable'" class="data-table" :data-block-uid="block_uid">
      <table >
        <tr v-for="(row) in block.table.rows" >
          <component v-for="(cell) in row.cells" :key="cell.key" :is="(cell.type=='header')? 'th':'td'">
            <RichText v-for="(node) in cell.value"  :node="node" />
          </component>
        </tr>
      </table>
    </div>

    <NuxtLink v-else-if="block['@type']=='__button'" :to="getUrl(block.href)" :data-block-uid="block_uid" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
      {{block.title}}
    </NuxtLink>

    <template v-else-if="block['@type']=='video'"  :data-block-uid="block_uid">
      <iframe v-if="block.url.startsWith('https://www.youtube')" width="420" height="315" 
        :src="`https://www.youtube.com/embed/${block.url.split('v=')[1]}?controls=0`"></iframe>
      <video v-else class="w-full h-auto max-w-full" controls >
        <source :src="block.url" type="video/mp4">
            Your browser does not support the video tag.
      </video>
    </template>

    <div v-else :data-block-uid="block_uid">
      {{ 'Not implemented Block: @type=' + block['@type'] }}
      <pre>{{ block }}</pre>
    </div>

</template>
<script setup>
  import RichText from './richtext.vue';

  const {block_uid, block, data} = defineProps({
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
  });
  
  const {status, data: {batching, items, items_total}} = block?.querystring ? await ploneApi({
            path: `${data['@id']}/++api++/@querystring-search`,
            query: block.querystring,
            _default: {batching: {}, items: [], items_total: 0}
          }) : {status:null, data:{batching:{}, items:data.items, items_total: data.items.Length}};

  function getUrl(href) {
        if (href === undefined) {
          return "#"
        }
        href = href?.value ? href?.value : href;
        href = href?.url ? href?.url : href;
        if (!href) {
          return "#"
        }
        if (href?.Length) {
          href = href[0]
        }
        if (typeof href === 'string') {
          return href;
        }
        else if ('@id' in href) {
            if (href['@id'].startsWith("http")) {
              const url = new URL(href['@id']);
              return url.pathname;
            }
            return href['@id'];
        }
        return href

    };



</script>