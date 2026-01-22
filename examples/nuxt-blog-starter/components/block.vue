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
    <a v-if="block.href" :href="getUrl(block.href)" class="image-link" data-linkable-field="href">
      <NuxtImg v-for="props in [imageProps(block)]" data-media-field="url" :src="props.url" :width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
    </a>
    <NuxtImg v-else v-for="props in [imageProps(block)]" data-media-field="url" data-linkable-field="href" :src="props.url" :width="props.width"
      :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
  </div>
  <div v-else-if="block['@type'] == 'image' && !contained" :data-block-uid="block_uid">
    <figure>
      <a v-if="block.href" :href="getUrl(block.href)" class="image-link" data-linkable-field="href">
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

  <!-- Hero block - uses comment syntax for field selectors (tests hydra comment parser) -->
  <!-- hydra editable-field=heading(.hero-heading) editable-field=subheading(.hero-subheading) media-field=image(.hero-image) editable-field=buttonText(.hero-button) linkable-field=buttonLink(.hero-button) -->
  <div v-else-if="block['@type'] == 'hero'" :data-block-uid="block_uid"
       class="hero-block p-5 bg-gray-100 rounded-lg">
    <!-- Image - uses class for selector, no data-media-field -->
    <img v-if="block.image" class="hero-image w-full h-auto max-h-64 object-cover mb-4 rounded"
         :src="getImageUrl(block.image)"
         alt="Hero image" />
    <div v-else class="hero-image w-full h-40 bg-gray-200 mb-4 rounded cursor-pointer">
    </div>
    <h1 class="hero-heading text-3xl font-bold mb-2">{{ block.heading }}</h1>
    <p class="hero-subheading text-xl text-gray-600 mb-4">{{ block.subheading }}</p>
    <div class="hero-description mb-4" data-editable-field="description">
      <RichText v-for="node in (block.description || [])" :key="node" :node="node" />
    </div>
    <!-- Button - uses class for selectors -->
    <a class="hero-button inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 no-underline"
       :href="getUrl(block.buttonLink)">
      {{ block.buttonText }}
    </a>
  </div>
  <!-- /hydra -->

  <div v-else-if="block['@type'] == 'gridBlock'" :data-block-uid="block_uid"
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
    <div v-if="block.top_images_layout?.items?.length" class="top-images-row flex gap-4 mb-4">
      <Block v-for="imgId in block.top_images_layout.items" :key="imgId"
             :block_uid="imgId" :block="block.top_images[imgId]" :data="data" :contained="true"
             data-block-add="right" />
    </div>

    <!-- Columns row - horizontal layout -->
    <div class="columns-row flex gap-4">
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
    :data-block-uid="block._blockUid || block_uid">
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
      <!-- Note: listing items are marked readonly via comment syntax in AsyncListingBlock -->
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
        <span>
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
      <div class="p-5 border border-b-0 border-gray-200 dark:border-gray-700 dark:bg-gray-900">
        <Block v-for="uid in (block.content_layout?.items || [])" :key="uid"
               :block_uid="uid" :block="block.content?.[uid]" :data="data" />
      </div>
    </div>
  </div>



  <!-- Note: listing blocks are expanded by expandListingBlocks() into individual
       teaser/image blocks BEFORE rendering, so 'listing' case should never be hit -->

  <!-- Search block: container with facets (object_list) and listing child -->
  <!-- Variations: facetsLeftSide, facetsRightSide, facetsTopSide (default) -->
  <div v-else-if="block['@type'] == 'search'" :data-block-uid="block_uid" class="search-block">
    <!-- Headline -->
    <h2 v-if="block.headline" data-editable-field="headline" class="text-2xl font-bold mb-4">{{ block.headline }}</h2>

    <!-- Search controls -->
    <div v-if="block.showSearchInput" class="search-controls mb-4">
      <form class="search-form flex gap-2" @submit.prevent="handleSearchSubmit">
        <input type="text" name="SearchableText" placeholder="Search..." :value="currentSearchText"
          class="search-input-field flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        <button type="submit"
          class="search-submit-button px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Search
        </button>
      </form>
    </div>

    <!-- Facets on top (default or facetsTopSide) -->
    <template v-if="!block.variation || block.variation === 'facetsTopSide'">
      <!-- Facets horizontal -->
      <div v-if="block.facets?.length" class="search-facets mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4">
        <div v-for="(facet, idx) in block.facets" :key="facet['@id'] || idx"
             :data-block-uid="facet['@id']" data-block-add="right"
             class="facet-item p-3 border border-gray-200 rounded min-w-48">
          <div data-editable-field="title" class="facet-label font-medium text-sm mb-2">{{ facet.title }}</div>
          <template v-if="facet.type === 'selectFacet'">
            <select class="facet-select w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    :data-field="getFacetField(facet)" @change="handleFacetSelectChange" data-linkable-allow>
              <option value="">Select...</option>
              <option v-for="opt in getFacetOptions(facet)" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
            </select>
          </template>
          <template v-else-if="facet.type === 'checkboxFacet' || !facet.type">
            <div class="facet-checkboxes space-y-1" data-linkable-allow>
              <label v-for="opt in getFacetOptions(facet)" :key="opt.value" class="flex items-center gap-2 text-sm">
                <input type="checkbox" :value="opt.value" class="facet-checkbox rounded border-gray-300"
                       :data-field="getFacetField(facet)" :checked="isFacetChecked(facet, opt.value)"
                       @change="handleFacetCheckboxChange" />
                {{ opt.title }}
              </label>
            </div>
          </template>
        </div>
      </div>

      <!-- Sort and results count -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <p v-if="block.showTotalResults && getListingTotalResults(block)" class="text-gray-600">
          {{ getListingTotalResults(block) }} results
        </p>
        <div v-if="block.showSortOn && block.sortOnOptions?.length" class="search-sort">
          <label class="text-sm text-gray-600 mr-2">Sort by:</label>
          <select class="px-3 py-1 border border-gray-300 rounded text-sm" @change="handleSortChange" data-linkable-allow>
            <option v-for="opt in block.sortOnOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </div>

      <!-- Results -->
      <div class="search-results">
        <template v-for="uid in (block.listing_layout?.items || [])" :key="uid">
          <AsyncListingBlock v-if="block.listing?.[uid]" :block_uid="uid" :block="block.listing[uid]"
            :data="data" :api-url="apiUrl" />
        </template>
      </div>
    </template>

    <!-- Facets on left or right side -->
    <template v-else-if="block.variation === 'facetsLeftSide' || block.variation === 'facetsRightSide'">
      <div class="flex flex-col md:flex-row gap-6" :class="{ 'md:flex-row-reverse': block.variation === 'facetsRightSide' }">
        <!-- Sidebar: facets -->
        <aside v-if="block.facets?.length" class="search-facets w-full md:w-64 shrink-0">
          <div class="p-4 bg-gray-50 rounded-lg sticky top-4">
            <h3 v-if="block.facetsTitle" class="font-semibold mb-3 text-gray-700">{{ block.facetsTitle }}</h3>
            <div v-for="(facet, idx) in block.facets" :key="facet['@id'] || idx"
                 :data-block-uid="facet['@id']" data-block-add="bottom"
                 class="facet-item mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
              <div data-editable-field="title" class="facet-label font-medium text-sm mb-2">{{ facet.title }}</div>
              <template v-if="facet.type === 'selectFacet'">
                <select class="facet-select w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        :data-field="getFacetField(facet)" @change="handleFacetSelectChange" data-linkable-allow>
                  <option value="">Select...</option>
                  <option v-for="opt in getFacetOptions(facet)" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
                </select>
              </template>
              <template v-else-if="facet.type === 'checkboxFacet' || !facet.type">
                <div class="facet-checkboxes space-y-1" data-linkable-allow>
                  <label v-for="opt in getFacetOptions(facet)" :key="opt.value" class="flex items-center gap-2 text-sm">
                    <input type="checkbox" :value="opt.value" class="facet-checkbox rounded border-gray-300"
                           :data-field="getFacetField(facet)" :checked="isFacetChecked(facet, opt.value)"
                           @change="handleFacetCheckboxChange" />
                    {{ opt.title }}
                  </label>
                </div>
              </template>
            </div>
          </div>
        </aside>

        <!-- Main: results -->
        <div class="search-results flex-1">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p v-if="block.showTotalResults && getListingTotalResults(block)" class="text-gray-600">
              {{ getListingTotalResults(block) }} results
            </p>
            <div v-if="block.showSortOn && block.sortOnOptions?.length" class="search-sort">
              <label class="text-sm text-gray-600 mr-2">Sort by:</label>
              <select class="px-3 py-1 border border-gray-300 rounded text-sm" @change="handleSortChange" data-linkable-allow>
                <option v-for="opt in block.sortOnOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
          </div>
          <template v-for="uid in (block.listing_layout?.items || [])" :key="uid">
            <AsyncListingBlock v-if="block.listing?.[uid]" :block_uid="uid" :block="block.listing[uid]"
              :data="data" :api-url="apiUrl" />
          </template>
        </div>
      </div>
    </template>
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
import { ref, watch, nextTick, computed, toRefs } from 'vue';
import RichText from './richtext.vue';

const props = defineProps({
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
  },
  apiUrl: {
    type: String,
    required: false,
    default: ''
  }
});

// Use toRefs to maintain reactivity (destructuring props directly can lose reactivity in Vue 3)
const { block_uid, block, data, contained, apiUrl } = toRefs(props);

// Slider state: track active slide and detect new slides
const activeSlideIndex = ref(0);
const prevSlideCount = ref(block.value?.slides?.length || 0);

// Watch for slide count changes to detect new slides and reinitialize Flowbite
watch(
  () => block.value?.slides?.length,
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

// Teaser helpers: use block data if overwrite is set OR if hrefObj has no content data
// This ensures listing-expanded teasers (which have block data but empty hrefObj) display correctly
// When overwrite is enabled but custom value not set yet, fall back to href value for editing
const getTeaserTitle = (block) => {
  const hrefObj = block.href?.[0];
  const hrefObjHasContentData = hrefObj?.title !== undefined;
  const useBlockData = block.overwrite || !hrefObjHasContentData;
  if (useBlockData) {
    // When customizing, use block title or fall back to href title for initial editing
    return block.title || hrefObj?.title || '';
  }
  return hrefObj?.title || '';
};

const getTeaserDescription = (block) => {
  const hrefObj = block.href?.[0];
  const hrefObjHasContentData = hrefObj?.title !== undefined;
  const useBlockData = block.overwrite || !hrefObjHasContentData;
  if (useBlockData) {
    // When customizing, use block description or fall back to href description for initial editing
    return block.description || hrefObj?.description || '';
  }
  return hrefObj?.description || '';
};

// Search block helpers
const getListingTotalResults = (searchBlock) => {
  // Get total results from the listing child block
  const listingUid = searchBlock.listing_layout?.items?.[0];
  if (!listingUid) return null;
  const listingBlock = searchBlock.listing?.[listingUid];
  return listingBlock?._paging?.totalItems || listingBlock?.items_total || null;
};

// Get current search text from URL (for preserving in input field)
const currentSearchText = computed(() => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('SearchableText') || '';
});

const handleSearchSubmit = (event) => {
  const formData = new FormData(event.target);
  const searchText = formData.get('SearchableText');
  const url = new URL(window.location.href);
  if (searchText) {
    url.searchParams.set('SearchableText', searchText);
  } else {
    url.searchParams.delete('SearchableText');
  }
  window.location.href = url.toString();
};

const handleSortChange = (event) => {
  const sortOn = event.target.value;
  const url = new URL(window.location.href);
  url.searchParams.set('sort_on', sortOn);
  window.location.href = url.toString();
};

// Facet field options - maps field name to available options
const FACET_FIELD_OPTIONS = {
  'review_state': [
    { value: 'private', title: 'Private' },
    { value: 'pending', title: 'Pending' },
    { value: 'published', title: 'Published' },
  ],
  'portal_type': [
    { value: 'Document', title: 'Page' },
    { value: 'News Item', title: 'News Item' },
    { value: 'Event', title: 'Event' },
    { value: 'Image', title: 'Image' },
    { value: 'File', title: 'File' },
    { value: 'Link', title: 'Link' },
  ],
};

// Get facet field value (handles object { label, value } or plain string)
const getFacetField = (facet) => {
  if (typeof facet.field === 'object') {
    return facet.field?.value || '';
  }
  return facet.field || '';
};

// Get facet options based on field
const getFacetOptions = (facet) => {
  const field = getFacetField(facet);
  return FACET_FIELD_OPTIONS[field] || [];
};

// Check if a facet value is currently selected (from URL params)
const isFacetChecked = (facet, value) => {
  if (typeof window === 'undefined') return false;
  const field = getFacetField(facet);
  const params = new URLSearchParams(window.location.search);
  const currentValues = params.getAll(`facet.${field}`);
  return currentValues.includes(value);
};

// Handle facet checkbox change
const handleFacetCheckboxChange = (event) => {
  const checkbox = event.target;
  const field = checkbox.dataset.field;
  const value = checkbox.value;
  const url = new URL(window.location.href);
  const paramKey = `facet.${field}`;

  const currentValues = url.searchParams.getAll(paramKey);

  if (checkbox.checked) {
    if (!currentValues.includes(value)) {
      url.searchParams.append(paramKey, value);
    }
  } else {
    url.searchParams.delete(paramKey);
    currentValues.filter(v => v !== value).forEach(v => {
      url.searchParams.append(paramKey, v);
    });
  }

  window.location.href = url.toString();
};

// Handle facet select change
const handleFacetSelectChange = (event) => {
  const select = event.target;
  const field = select.dataset.field;
  const value = select.value;
  const url = new URL(window.location.href);
  const paramKey = `facet.${field}`;

  if (value) {
    url.searchParams.set(paramKey, value);
  } else {
    url.searchParams.delete(paramKey);
  }

  window.location.href = url.toString();
};

</script>