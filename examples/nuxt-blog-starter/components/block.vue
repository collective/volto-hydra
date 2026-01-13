<template>
  <div v-if="block['@type'] == 'slate'" class="bg-transparent" :data-block-uid="block_uid" data-editable-field="value">
    <RichText v-for="node in block['value']" :key="node" :node="node" />
  </div>

  <div v-else-if="block['@type'] == 'introduction'" :data-block-uid="block_uid" data-editable-field="value">
    <hr />
    <RichText v-for="node in block['value']" :key="node" :node="node" />
    <hr />
  </div>

  <h1 v-else-if="block['@type'] == 'title'" :data-block-uid="block_uid" data-editable-field="/title">{{ data.title }}
  </h1>

  <p v-else-if="block['@type'] == 'description'" :data-block-uid="block_uid" data-editable-field="/description"><i>{{
    data.description }}</i></p>

  <div v-else-if="block['@type'] == 'image' && contained" :data-block-uid="block_uid">
    <a v-if="block.href" :href="block.href" class="image-link" data-linkable-field="href">
      <NuxtImg v-for="props in [imageProps(block)]" data-media-field="url" :src="props.url" :width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
    </a>
    <NuxtImg v-else v-for="props in [imageProps(block)]" data-media-field="url" data-linkable-field="href" :src="props.url" :width="props.width"
      :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
  </div>
  <div v-else-if="block['@type'] == 'image' && !contained" :data-block-uid="block_uid">
    <figure>
      <a v-if="block.href" :href="block.href" class="image-link" data-linkable-field="href">
        <NuxtImg v-for="props in [imageProps(block)]" data-media-field="url" :src="props.url" _width="props.width"
          :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
      </a>
      <NuxtImg v-else v-for="props in [imageProps(block)]" data-media-field="url" data-linkable-field="href" :src="props.url" _width="props.width"
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

  <!-- Hero block - simple landing page hero section -->
  <div v-else-if="block['@type'] == 'hero'" :data-block-uid="block_uid"
       class="hero-block p-5 bg-gray-100 rounded-lg">
    <!-- Image with data-media-field for inline image selection -->
    <!-- Use getImageUrl to handle array/object formats and add @@images suffix for Plone paths -->
    <img v-if="block.image" data-media-field="image"
         :src="getImageUrl(block.image)"
         alt="Hero image"
         class="w-full h-auto max-h-64 object-cover mb-4 rounded" />
    <div v-else data-media-field="image"
         class="w-full h-40 bg-gray-200 mb-4 rounded cursor-pointer">
    </div>
    <h1 data-editable-field="heading" class="text-3xl font-bold mb-2">{{ block.heading }}</h1>
    <p data-editable-field="subheading" class="text-xl text-gray-600 mb-4">{{ block.subheading }}</p>
    <div class="hero-description mb-4" data-editable-field="description">
      <RichText v-for="node in (block.description || [])" :key="node" :node="node" />
    </div>
    <!-- Button with both data-editable-field and data-linkable-field -->
    <a data-editable-field="buttonText" data-linkable-field="buttonLink"
       :href="getUrl(block.buttonLink)"
       class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 no-underline">
      {{ block.buttonText }}
    </a>
  </div>

  <div v-else-if="block['@type'] == 'gridBlock'" :data-block-uid="block_uid" data-container-blocks="blocks,horizontal,5"
    class="mt-6 mb-6"
    :class="[`bg-${block.styles?.backgroundColor || 'white'}-700`]">
    <!-- Grid that wraps to multiple rows -->
    <div class="grid-row grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <template v-for="uid in (block.blocks_layout?.items || [])" :key="uid">
        <Block v-if="block.blocks?.[uid]"
          :block_uid="block.blocks[uid]._blockUid || uid"
          :block="block.blocks[uid]" :data="data" :contained="true"
          class="grid-cell p-4" :class="[`bg-${!block.styles?.backgroundColor ? 'grey' : 'white'}-700`]" />
      </template>
    </div>
    <!-- Paging controls using URL scheme @pg_blockId_pageNumber -->
    <!-- data-linkable-allow tells hydra.js to allow navigation without beforeunload warning -->
    <nav v-if="block._paging?.totalPages > 1" aria-label="Grid Navigation" class="grid-paging mt-4">
      <ul class="inline-flex -space-x-px text-sm">
        <li v-if="block._paging.prev !== null">
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${block._paging.prev}`" data-linkable-allow
            class="paging-prev flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100">
            Previous
          </NuxtLink>
        </li>
        <li v-for="page in block._paging.pages" :key="page.page">
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${page.page - 1}`" data-linkable-allow
            :class="['paging-page', block._paging.currentPage === page.page - 1 ? 'current bg-blue-100' : 'bg-white']"
            class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 border border-gray-300 hover:bg-gray-100">
            {{ page.page }}
          </NuxtLink>
        </li>
        <li v-if="block._paging.next !== null">
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${block._paging.next}`" data-linkable-allow
            class="paging-next flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100">
            Next
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>

  <!-- Columns container block -->
  <div v-else-if="block['@type'] == 'columns'" :data-block-uid="block_uid" class="columns-block my-4">
    <!-- Title for columns block (always rendered for inline editing) -->
    <h3 data-editable-field="title" class="columns-title mb-2 font-semibold">{{ block.title }}</h3>

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
    class="teaser-block max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
    :data-block-uid="block._blockUid || block_uid"
    :data-block-readonly="block._blockUid ? true : undefined">
    <!-- Preview image: use block.preview_image if set, otherwise use target's image -->
    <!-- data-linkable-field prevents navigation in edit mode -->
    <NuxtLink :to="getUrl(block.href)" v-if="block.preview_image || block.href?.[0]?.hasPreviewImage" data-linkable-field="href">
      <NuxtImg class="rounded-t-lg" v-if="block.preview_image" v-for="props in [imageProps(block.preview_image)]" :src="props.url" alt="" />
      <NuxtImg class="rounded-t-lg" v-else-if="block.href?.[0]?.hasPreviewImage" v-for="props in [imageProps(block.href[0])]" :src="props.url" alt="" />
    </NuxtLink>
    <div class="p-5">
      <!-- Title: use block.title only if overwrite, otherwise use target's title -->
      <!-- Only add data-editable-field when overwrite is true (field is customizable) -->
      <!-- Title link is also linkable (clicking it shows link editor for href) -->
      <!-- Key forces Vue to recreate element when overwrite changes (avoids stale contenteditable text) -->
      <!-- Note: data-block-readonly on parent handles disabling these for listing items -->
      <NuxtLink :to="getUrl(block.href)" v-if="getTeaserTitle(block)" data-linkable-field="href">
        <div>{{ block.head_title }}</div>
        <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
          :key="`title-${block.overwrite}`"
          :data-editable-field="block.overwrite ? 'title' : undefined">{{ getTeaserTitle(block) }}</h5>
      </NuxtLink>
      <!-- Description: use block.description only if overwrite, otherwise use target's description -->
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400"
        :key="`description-${block.overwrite}`"
        :data-editable-field="block.overwrite ? 'description' : undefined"
        v-if="getTeaserDescription(block)">{{ getTeaserDescription(block) }}</p>
      <NuxtLink :to="getUrl(block.href)" data-linkable-field="href"
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
    class="max-w-4xl mx-auto" data-carousel="static" >
    <div class="relative w-full">
      <!-- Carousel wrapper -->
      <div class="relative h-56 overflow-hidden rounded-lg md:h-96">
        <div v-for="(slide, index) in block.slides" :key="slide['@id']" :data-block-uid="slide['@id']"
          class="slide duration-700 ease-linear bg-center items-center absolute inset-0"
          :class="[
            isSlideActive(index) ? 'flex' : 'hidden',
            { 'bg-gray-700': !slide.preview_image, 'bg-blend-multiply': !slide.preview_image, 'bg-no-repeat': !slide.preview_image, 'bg-cover': slide.preview_image }
          ]"
          data-carousel-item :style="slide.preview_image ? imageProps(slide, true).class : ''"
          data-block-add="right">
          <!-- Clickable overlay for preview_image editing -->
          <div data-media-field="preview_image" class="absolute inset-0 cursor-pointer" style="z-index: 1;"></div>
          <div
            class="max-w-sm p-6 bg-slate-200/90 border border-gray-200 m-12 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 absolute"
            :class="{ 'right-0': slide.flagAlign == 'right' }" style="z-index: 2;">
            <div data-editable-field="head_title">{{ slide.head_title }}</div>
            <h5 :id="`heading-${slide['@id']}`"
              class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white" data-editable-field="title">
              {{ slide.title }}</h5>
            <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-editable-field="description">
              {{ slide.description }}</p>
            <NuxtLink v-if="slide.href" :to="getUrl(slide.href[0])" data-editable-field="buttonText" data-linkable-field="href"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              :aria-describedby="`heading-${slide['@id']}`">
              {{ slide.buttonText || 'Read More' }}</NuxtLink>
            <a v-else href="#" data-editable-field="buttonText" data-linkable-field="href"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              :aria-describedby="`heading-${slide['@id']}`">
              {{ slide.buttonText || 'Read More' }}</a>
          </div>
        </div>
      </div>
      <!-- Slider indicators -->
      <div class="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
        <button v-for="(slide, index) in block.slides" :key="slide['@id']" type="button" class="w-3 h-3 rounded-full" aria-current="true"
          :aria-label="`Slide ${index + 1}`" :data-carousel-slide-to="index" :data-block-selector="slide['@id']"></button>
      </div>
      <!-- Slider controls -->
      <button type="button"
        class="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
        data-carousel-prev data-block-selector="-1">
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
        data-carousel-next data-block-selector="+1">
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
    <h2 :id="block_uid">
      <button type="button"
        class="flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3"
        :data-accordion-target="`#accordion-collapse-body-${block_uid}`" aria-expanded="true"
        :aria-controls="`accordion-collapse-body-${block_uid}`">
        <span data-block-field="header">
          <Block v-for="uid in (block.header_layout?.items || [])" :key="uid"
                 :block_uid="uid" :block="block.header?.[uid]" :data="data" />
        </span>
        <svg data-accordion-icon class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5 5 1 1 5" />
        </svg>
      </button>
    </h2>
    <div :id="`accordion-collapse-body-${block_uid}`" class="hidden" :aria-labelledby="block_uid">
      <div class="p-5 border border-b-0 border-gray-200 dark:border-gray-700 dark:bg-gray-900" data-block-field="content">
        <Block v-for="uid in (block.content_layout?.items || [])" :key="uid"
               :block_uid="uid" :block="block.content?.[uid]" :data="data" />
      </div>
    </div>
  </div>



  <!-- Listing: already expanded at page level, this handles static items only -->
  <template v-else-if="block['@type'] == 'listing'">
    <h2 v-if="block.headline" :is="block.headlineTag" :data-block-uid="block_uid">{{ block.headline }}</h2>
    <Listing :block_uid="block_uid" :items="block.items || []" />
  </template>

  <!-- Search: already expanded at page level, this handles static results only -->
  <div v-else-if="block['@type'] == 'search'" :data-block-uid="block_uid">
    <ClientOnly fallback-tag="div" fallback="Loading search...">
      <form>
        <input name="searchableText" v-if="block.showSearchInput">
      </form>
      <Listing :block_uid="block_uid" :items="block.items || []" />
    </ClientOnly>
  </div>

  <template v-else-if="block['@type'] == 'heading'" :data-block-uid="block_uid">
    <h2 data-editable-field="heading">{{ block.heading }}</h2>
  </template>

  <div v-else-if="block['@type'] == 'slateTable'" class="data-table" :data-block-uid="block_uid">
    <table>
      <tr v-for="(row) in block.table?.rows" :key="row.key" :data-block-uid="row.key" data-block-add="bottom">
        <component
          v-for="(cell) in row.cells"
          :key="cell.key"
          :is="(cell.type == 'header') ? 'th' : 'td'"
          :data-block-uid="cell.key"
          data-block-add="right"
        >
          <RichText v-for="(node, idx) in cell.value" :key="idx" :node="node" data-editable-field="value" />
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
    <iframe v-if="block.url?.startsWith('https://www.youtube')" width="420" height="315"
      :src="`https://www.youtube.com/embed/${block.url?.split('v=')[1]}?controls=0`"></iframe>
    <video v-else-if="block.url" class="w-full h-auto max-w-full" controls>
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
import { ref, watch, nextTick } from 'vue';
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

// Slider state: track active slide and detect new slides
const activeSlideIndex = ref(0);
const prevSlideCount = ref(block.slides?.length || 0);

// Watch for slide count changes to detect new slides and reinitialize Flowbite
watch(
  () => block.slides?.length,
  async (newCount, oldCount) => {
    // Only detect new slides after initial render (when oldCount is defined)
    if (oldCount !== undefined && newCount > oldCount) {
      // New slide added - show it (it's at the end)
      activeSlideIndex.value = newCount - 1;

      // Reinitialize Flowbite carousel to recognize new slides
      if (process.client) {
        await nextTick();
        const flowbite = await import('flowbite');
        flowbite.initCarousels();
      }
    }
    prevSlideCount.value = newCount || 0;
  },
  { immediate: true }
);

// Helper to check if a slide should be visible
const isSlideActive = (index) => index === activeSlideIndex.value;

// Helper to get image URL from various formats (string, array, or object with @id)
// Also adds @@images/image suffix for Plone internal paths
const getImageUrl = (value) => {
  if (!value) return '';
  const runtimeConfig = useRuntimeConfig();
  const backendBaseUrl = runtimeConfig.public.backendBaseUrl;

  // Extract URL from array or object format (like getUrl does)
  let url = value;
  if (Array.isArray(value) && value.length) {
    url = value[0];
  }
  if (url?.['@id']) {
    url = url['@id'];
  }
  if (typeof url !== 'string') {
    return '';
  }

  // Add @@images/image suffix for Plone internal paths
  // Handles both relative paths (/) and full URLs with backend base URL
  const needsImageSuffix = !url.includes('@@images');
  const isRelativePath = url.startsWith('/');
  const isBackendUrl = backendBaseUrl && url.startsWith(backendBaseUrl);

  if (needsImageSuffix && (isRelativePath || isBackendUrl)) {
    return url + '/@@images/image';
  }
  return url;
};

// Teaser helpers: show target content by default, only use block values if overwrite is set
const getTeaserTitle = (block) => {
  if (block.overwrite && block.title) {
    return block.title;
  }
  return block.href?.[0]?.title || '';
};

const getTeaserDescription = (block) => {
  if (block.overwrite && block.description) {
    return block.description;
  }
  return block.href?.[0]?.description || '';
};

</script>