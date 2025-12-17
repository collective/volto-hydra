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
    <a v-if="block.href" :href="block.href" class="image-link">
      <NuxtImg v-for="props in [imageProps(block)]" :src="props.url" :width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
    </a>
    <NuxtImg v-else v-for="props in [imageProps(block)]" :src="props.url" :width="props.width"
      :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
  </div>
  <div v-else-if="block['@type'] == 'image' && !contained" :data-block-uid="block_uid">
    <figure>
      <a v-if="block.href" :href="block.href" class="image-link">
        <NuxtImg v-for="props in [imageProps(block)]" :src="props.url" _width="props.width"
          :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
      </a>
      <NuxtImg v-else v-for="props in [imageProps(block)]" :src="props.url" _width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
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
    class="mt-6 mb-6"
    :class="[`bg-${block.styles?.backgroundColor || 'white'}-700`]">
    <div class="grid-row grid grid-flow-col gap-4" :class="['grid-cols-' + block.blocks_layout.items.length]">
      <Block v-for="uid in block.blocks_layout.items" :key="uid"
        :block_uid="uid" :block="block.blocks[uid]" :data="data" :contained="true"
        class="p-4" :class="[`bg-${!block.styles?.backgroundColor ? 'grey' : 'white'}-700`]" />
    </div>
  </div>

  <!-- Columns container block -->
  <div v-else-if="block['@type'] == 'columns'" :data-block-uid="block_uid" class="columns-block my-4">
    <!-- Optional title for columns block -->
    <h3 v-if="block.title" data-editable-field="title" class="columns-title mb-2 font-semibold">{{ block.title }}</h3>

    <!-- Top images row - horizontal layout for images above columns -->
    <div v-if="block.top_images_layout?.items?.length" class="top-images-row flex gap-4 mb-4" data-block-field="top_images">
      <Block v-for="imgId in block.top_images_layout.items" :key="imgId"
             :block_uid="imgId" :block="block.top_images[imgId]" :data="data" :contained="true"
             data-block-add="right" />
    </div>

    <!-- Columns row - horizontal layout -->
    <div class="columns-row flex gap-4" data-block-field="columns">
      <div v-for="columnId in (block.columns_layout?.items || [])" :key="columnId"
           :data-block-uid="columnId" data-block-add="right"
           class="column flex-1 p-3 border border-dashed border-gray-300 rounded">
        <!-- Column title -->
        <h4 v-if="block.columns?.[columnId]?.title" data-editable-field="title"
            class="column-title mb-2 text-sm font-medium">{{ block.columns[columnId].title }}</h4>
        <!-- Column content blocks - vertical layout, Block component adds data-block-uid -->
        <Block v-for="blockId in (block.columns?.[columnId]?.blocks_layout?.items || [])" :key="blockId"
               :block_uid="blockId" :block="block.columns[columnId].blocks[blockId]" :data="data" :contained="true" />
      </div>
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
    <Listing :block_uid="block_uid" :data="data" :query="block?.querystring ? block?.querystring : {}"></Listing>
  </div>

  <div v-else-if="block['@type'] == 'search'" :data-block-uid="block_uid">
    <ClientOnly fallback-tag="div" fallback="Loading search...">
      <form>
        <input name="searchableText" v-if="block.showSearchInput">
      </form>
      <Listing :block_uid="block_uid" :data="data" :query="block?.query"></Listing>
    </ClientOnly>
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

  <!-- Empty block - placeholder for deleted blocks in containers -->
  <div v-else-if="block['@type'] == 'empty'" :data-block-uid="block_uid" class="empty-block min-h-[60px]">
  </div>

  <div v-else :data-block-uid="block_uid">
    {{ 'Not implemented Block: @type=' + block['@type'] }}
    <pre>{{ block }}</pre>
  </div>

</template>
<script setup>
import RichText from './richtext.vue';
import Listing from './listing.vue';

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





</script>