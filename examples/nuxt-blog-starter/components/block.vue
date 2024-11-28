<template>
  <div v-if="block['@type'] == 'slate'" class="bg-transparent" :data-block-uid="block_uid" data-editable-field="value">
    <RichText v-for="node in block['value']" :key="node" :node="node" />
  </div>

  <div v-else-if="block['@type'] == 'introduction'" :data-block-uid="block_uid" data-editable-field="value">
    <hr />
    <RichText v-for="node in block['value']" :key="node" :node="node" />
    <hr />
  </div>

  <h1 v-else-if="block['@type'] == 'title'" :data-block-uid="block_uid" data-editable-metadata="title">{{ data.title }}
  </h1>

  <p v-else-if="block['@type'] == 'description'" :data-block-uid="block_uid" data-editable-metadata="description"><i>{{
    data.description }}</i></p>

  <div v-else-if="block['@type'] == 'image' && contained" :data-block-uid="block_uid">
    <NuxtImg v-for="props in [imageProps(block)]" :src="props.url" :width="props.width"
      :class="['image-size-' + props.size, 'image-align-' + props.align]" />
  </div>
  <div v-else-if="block['@type'] == 'image' && !contained" :data-block-uid="block_uid">
    <figure>
      <NuxtImg v-for="props in [imageProps(block)]" :src="props.url" _width="props.width"
        :class="['image-size-' + props.size, 'image-align-' + props.align]" />
      <figcaption>
        <h2>{{ block.title }}</h2>
        <div v-if="block?.description" data-editable-field="description">
          <p>{{ block.description }}</p>
        </div>
      </figcaption>
    </figure>
  </div>

  <div v-else-if="block['@type'] == 'leadimage'" :data-block-uid="block_uid">
    <NuxtImg v-for="props in [imageProps(data)]" :src="props.url"
      :class="['image-size-' + props.size, 'image-align-' + props.align]" loading="lazy" decoding="async" />
  </div>

  <div v-else-if="block['@type'] == 'gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontal,5"
    class="grid grid-flow-col gap-4 mt-6 mb-6"
    :class="['grid-cols-' + block.blocks_layout.items.length, `bg-${block.styles.backgroundColor || 'white'}-700`]">
    <div v-for="uid in block.blocks_layout.items" class="p-4"
      :class="[`bg-${!block.styles.backgroundColor ? 'grey' : 'white'}-700`]">
      <Block :block_uid="uid" :block="block.blocks[uid]" :data="data" :contained="true"></Block>
    </div>

  </div>

  <div v-else-if="block['@type'] == 'teaser'"
    class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
    :data-block-uid="block_uid">
    <NuxtLink :to="getUrl(block.href[0])" v-if="block.href.hasPreviewImage">
      <NuxtImg class="rounded-t-lg" v-for="props in [imageProps(block.href[0])]" :src="props.url" alt=""
        v-if="block.href[0].hasPreviewImage" />
    </NuxtLink>
    <div class="p-5">
      <NuxtLink :to="getUrl(block.href[0])" v-if="block?.title">
        <div>{{ block.head_title }}</div>
        <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
          data-editable-field="title">{{ block.title }}</h5>
      </NuxtLink>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-editable-field="description"
        v-if="block?.description">{{ block.description }}</p>
      <NuxtLink :to="getUrl(block.href[0])" data-editable-field="href"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
        Read more
        <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 14 10">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M1 5h12m0 0L9 1m4 4L9 9" />
        </svg>
      </NuxtLink>
    </div>
  </div>

  <section v-else-if="block['@type'] == 'slider'" :data-block-uid="block_uid" data-block-container="{allowed:['Slide'],add:'horizontal'}"
    class=" w-full mx-auto" data-carousel="static" >
    <div class="relative w-full">
      <!-- Carousel wrapper -->
      <div class="relative h-56 overflow-hidden rounded-lg md:h-96">
        <div v-for="block in block.slides" data-block-uid="block['@id']"
          class="hidden duration-700 ease-linear bg-center flex items-center"
          :class="{ 'bg-gray-700': !block.preview_image, 'bg-blend-multiply': !block.preview_image, 'bg-no-repeat': !block.preview_image, 'bg-cover': block.preview_image }"
          data-carousel-item :style="imageProps(block.preview_image[0], true).class">
          <div
            class="max-w-sm p-6 bg-slate-200/90 border border-gray-200 m-12 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 absolute"
            :class="{ 'right-0': block.flagAlign == 'right' }">
            <div>{{ block.head_title }}</div>
            <h5 :id="`heading-${block['@id']}`"
              class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white" data-editable-field="title">
              {{ block.title }}</h5>
            <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-editable-field="description">
              {{ block.description }}</p>
              <NuxtLink v-if="block.href" :to="getUrl(block.href[0])" data-editable-field="buttonText"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              :aria-describedby="`heading-${block['@id']}`">
              
              {{ block.buttonText || 'Read More' }}</NuxtLink>
          </div>
        </div>
      </div>
      <!-- Slider indicators -->
      <div class="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
        <button v-for="(block, index) in block.slides" type="button" class="w-3 h-3 rounded-full" aria-current="true"
          aria-label="Slide 1" :data-carousel-slide-to="index"></button>
      </div>
      <!-- Slider controls -->
      <button type="button"
        class="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
        data-carousel-prev>
        <span
          class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
          <svg class="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 1 1 5l4 4" />
          </svg>
          <span class="sr-only">Previous</span>
        </span>
      </button>
      <button type="button"
        class="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
        data-carousel-next>
        <span
          class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
          <svg class="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="m1 9 4-4-4-4" />
          </svg>
          <span class="sr-only">Next</span>
        </span>
      </button>
    </div>
  </section>



  <hr v-else-if="block['@type'] == 'separator'" :data-block-uid="block_uid">
  </hr>



  <div v-else-if="block['@type'] == 'accordion'" data-accordion="collapse" :data-block-uid="block_uid">
    <template v-for="panelid in block.data.blocks_layout.items">
      <h2 :id="panelid" :data-block-uid="panelid">
        <button type="button"
          class="flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3"
          :data-accordion-target="`#accordion-collapse-body-${panelid}`" aria-expanded="true"
          aria-controls="accordion-collapse-body-1">
          <span data-editable-field="title">{{ block.data.blocks[panelid].title }}</span>
          <svg data-accordion-icon class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5 5 1 1 5" />
          </svg>
        </button>
      </h2>
      <div :id="`accordion-collapse-body-${panelid}`" class="hidden" :aria-labelledby="panelid">
        <div class="p-5 border border-b-0 border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <div v-for="uid in block.data.blocks[panelid].blocks_layout.items">
            <Block :block_uid="uid" :block="block.data.blocks[panelid].blocks[uid]" :data="data"></Block>
          </div>
        </div>
      </div>
    </template>
  </div>



  <div v-else-if="block['@type'] == 'listing'" :data-block-uid="block_uid">
    <h2 :is="block.headlineTag">{{ block.headline }}</h2>
    <p v-if="!items.length">Empty Listing</p>
    <template v-for="item in items">
      <NuxtLink :to="getUrl(item)"
        class="flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow md:flex-row md:max-w-xl hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
        <template v-for="props in [imageProps(item)]">

          <NuxtImg :src="props.url" alt="" v-if="props.url"
            class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg"></NuxtImg>
        </template>

        <div class="flex flex-col justify-between p-4 leading-normal">
          <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ item.title }}</h5>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ item.description }}.</p>
        </div>
      </NuxtLink>
    </template>

    <nav aria-label="Listing Navigation" v-if="batching?.last">
      <ul class="inline-flex -space-x-px text-sm">
        <li>
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_0`"
            class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            Previous</NuxtLink>
        </li>
        <li v-for="page in batching.pages">
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${page.start}`"
            class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            {{ page.page }}</NuxtLink>
        </li>
        <li>
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${batching.last}`"
            class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            Next</NuxtLink>
        </li>
      </ul>
    </nav>

  </div>

  <template v-else-if="block['@type'] == 'heading'" :data-block-uid="block_uid">
    <h2 data-editable-field="heading">{{ block.heading }}</h2>
  </template>

  <div v-else-if="block['@type'] == 'slateTable'" class="data-table" :data-block-uid="block_uid">
    <table>
      <tr v-for="(row) in block.table.rows">
        <component v-for="(cell) in row.cells" :key="cell.key" :is="(cell.type == 'header') ? 'th' : 'td'">
          <RichText v-for="(node) in cell.value" :node="node" />
        </component>
      </tr>
    </table>
  </div>

  <div v-else-if="block['@type'] == '__button'">
    <NuxtLink :to="getUrl(block.href)" :data-block-uid="block_uid"
      class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
      data-editable-field="title">
      {{ block.title || 'Read more' }}
    </NuxtLink>
  </div>

  <template v-else-if="block['@type'] == 'video'" :data-block-uid="block_uid">
    <iframe v-if="block.url.startsWith('https://www.youtube')" width="420" height="315"
      :src="`https://www.youtube.com/embed/${block.url.split('v=')[1]}?controls=0`"></iframe>
    <video v-else class="w-full h-auto max-w-full" controls>
      <source :src="block.url" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  </template>

  <section v-else-if="block['@type'] == 'highlight'" class="bg-white dark:bg-gray-900">
    <div class="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
      <NuxtImg v-for="props in [imageProps(block)]" :src="props.url" />
      <h1
        class="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
        {{ block.title }}</h1>
      <p class="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
      </p>
      <div class="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
        <NuxtLink v-if="block.button" :to="getUrl(block.buttonLink)"
          class="py-3 px-5 sm:ms-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
          {{ block.buttonText }}
        </NuxtLink>
      </div>
    </div>
  </section>

  <div v-else :data-block-uid="block_uid">
    {{ 'Not implemented Block: @type=' + block['@type'] }}
    <pre>{{ block }}</pre>
  </div>

</template>
<script setup>
import RichText from './richtext.vue';

const { block_uid, block, data } = defineProps({
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
  },
  contained: {
    type: Boolean,
    required: false,
    default: false
  }
});

const items = ref([]);
const batching = ref({});
const items_total = ref(0);
const pages = data._listing_pages;
const cur_page = (block_uid in pages) ? pages[block_uid] : 0;
var b_size = 0;

if ("querystring" in block) {
  // https://stackoverflow.com/questions/72419491/nested-usefetch-in-nuxt-3
  if ("b_size" in block.querystring) {
    b_size = Number(block.querystring.b_size);
  }
  ploneApi({
    path: `${data['@id']}/++api++/@querystring-search`,
    query: { ...block.querystring, ...{ b_size: b_size, b_start: cur_page * b_size, metadata_fields: "_all" } },
    _default: { batching: {}, items: [], items_total: 0 }
  }).then(({ data }) => {
    //const data = qdata;
    items.value = data.value.items;
    items_total.value = Number(data.value.items_total);
    b_size = b_size ? b_size : items_total.value;
    //batching.value = data.value.batching;
    const max_page = Math.ceil(items_total.value / b_size);
    var batches = max_page ? [...Array(max_page).keys()].map(i => {
      return { start: (i), page: i + 1 }
    }) : [];
    batching.value.pages = batches.slice(Math.max(cur_page - 2, 0), Math.min(cur_page + 3, max_page - 1))
    batching.value.last = data.value.items_total ? batches[batches.length - 1].start : 0;
    batching.value.next = batches[Math.min(cur_page + 1, max_page - 1)]?.start;
    batching.value.prev = batches[Math.max(cur_page - 1, 0)]?.start;
    console.log(batching.value);
  });
}
else {
  items.value = data.items;
  items_total.value = data.items.Length;
}




</script>