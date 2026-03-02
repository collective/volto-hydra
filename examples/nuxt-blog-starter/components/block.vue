<template>
  <div v-if="block['@type'] == 'slate'" class="slate-block" :data-block-uid="block_uid" data-edit-text="value">
    <RichText v-for="node in block['value']" :key="node" :node="node" />
  </div>

  <div v-else-if="block['@type'] == 'introduction'" :data-block-uid="block_uid"
       data-edit-text="value" class="text-xl text-gray-600 leading-relaxed my-6 border-t border-b border-gray-200 py-4">
    <RichText v-for="node in block['value']" :key="node" :node="node" />
  </div>

  <h1 v-else-if="block['@type'] == 'title'" :data-block-uid="block_uid" data-edit-text="/title">{{ data.title }}
  </h1>

  <p v-else-if="block['@type'] == 'description'" :data-block-uid="block_uid"
     data-edit-text="/description"
     class="text-lg text-gray-500 mb-6">{{ data.description }}</p>

  <div v-else-if="block['@type'] == 'image' && contained" :data-block-uid="block_uid">
    <a v-if="block.href" :href="getUrl(block.href)" class="image-link" data-edit-link="href">
      <NuxtImg v-for="props in [imageProps(block)]" data-edit-media="url" :src="props.url" :width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
    </a>
    <NuxtImg v-else v-for="props in [imageProps(block)]" data-edit-media="url" data-edit-link="href" :src="props.url" :width="props.width"
      :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
  </div>
  <div v-else-if="block['@type'] == 'image' && !contained" :data-block-uid="block_uid">
    <figure>
      <a v-if="block.href" :href="getUrl(block.href)" class="image-link" data-edit-link="href">
        <NuxtImg v-for="props in [imageProps(block)]" data-edit-media="url" :src="props.url" _width="props.width"
          :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
      </a>
      <NuxtImg v-else v-for="props in [imageProps(block)]" data-edit-media="url" data-edit-link="href" :src="props.url" _width="props.width"
        :alt="block.alt" :class="['image-size-' + props.size, 'image-align-' + props.align]" />
    </figure>
  </div>

  <div v-else-if="block['@type'] == 'leadimage'" :data-block-uid="block_uid" class="mb-6">
    <NuxtImg v-for="props in [imageProps(data)]" :src="props.url"
      class="w-full rounded-lg object-cover max-h-96" loading="lazy" decoding="async" />
  </div>

  <!-- Hero block - uses comment syntax for field selectors (tests hydra comment parser) -->
  <!-- hydra edit-text=heading(.hero-heading) edit-text=subheading(.hero-subheading) edit-media=image(.hero-image) edit-text=buttonText(.hero-button) edit-link=buttonLink(.hero-button) -->
  <div v-else-if="block['@type'] == 'hero'" :data-block-uid="block_uid"
       class="hero-block p-5 bg-gray-100 rounded-lg">
    <!-- Image - uses class for selector, no data-edit-media -->
    <img v-if="block.image" class="hero-image w-full h-auto max-h-64 object-cover mb-4 rounded"
         :src="getImageUrl(block.image)"
         alt="Hero image" />
    <div v-else class="hero-image w-full h-40 bg-gray-200 mb-4 rounded cursor-pointer">
    </div>
    <h1 class="hero-heading text-3xl font-bold mb-2">{{ block.heading }}</h1>
    <p class="hero-subheading text-xl text-gray-600 mb-4">{{ block.subheading }}</p>
    <div class="hero-description mb-4" data-edit-text="description">
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
       class="mt-6 mb-6 rounded-lg" :style="gridBgStyle(block)">
    <div :class="['grid-row grid gap-4 grid-cols-1', ...gridColsClass(block)]">
      <template v-for="entry in gridChildren" :key="entry.id">
        <!-- Listing child: async expand in Suspense, with shared paging -->
        <Suspense v-if="entry.isListing" :key="`grid-listing-${entry.id}-pg${gridPageFromUrl}-${JSON.stringify(entry.block)}`">
          <ListingBlock :id="entry.id" :block="entry.block" :paging="gridPaging"
            :api-url="effectiveApiUrl" :context-path="effectiveContextPath">
            <template #default="{ items }">
              <template v-for="item in items" :key="item['@uid']">
                <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
                <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="true"
                       class="grid-cell p-4"
                       :style="!block.styles?.backgroundColor ? { backgroundColor: '#f1f5f9' } : {}" />
              </template>
            </template>
          </ListingBlock>
          <template #fallback>
            <div class="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded grid-cell p-4"></div>
          </template>
        </Suspense>
        <!-- Static child: filtered by paging window -->
        <template v-else v-for="item in entry.items" :key="item['@uid']">
          <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="true"
                 class="grid-cell p-4"
                 :style="!block.styles?.backgroundColor ? { backgroundColor: '#f1f5f9' } : {}" />
        </template>
      </template>
    </div>
    <!-- Combined paging: awaits _ready from all listings -->
    <Suspense :key="`grid-paging-${gridPageFromUrl}`">
      <AsyncPaging :paging="gridPaging" :build-url="gridBuildPagingUrl" />
    </Suspense>
  </div>

  <!-- Columns container block -->
  <div v-else-if="block['@type'] == 'columns'" :data-block-uid="block_uid" class="columns-block my-4">
    <!-- Title for columns block (always rendered for inline editing) -->
    <h3 data-edit-text="title" class="columns-title mb-2 font-semibold">{{ block.title }}</h3>

    <!-- Top images row - horizontal layout for images above columns -->
    <div v-if="block.top_images?.items?.length" class="top-images-row flex gap-4 mb-4">
      <Block v-for="item in expand(block.top_images.items, block.blocks || {})"
             :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" :contained="true" data-block-add="right" />
    </div>

    <!-- Columns row - horizontal layout -->
    <div class="columns-row flex gap-4">
      <div v-for="columnId in (block.columns?.items || [])" :key="columnId"
           :data-block-uid="columnId" data-block-add="right"
           class="column flex-1 p-3 border border-dashed border-gray-300 rounded">
        <!-- Column title -->
        <h4 v-if="block.blocks?.[columnId]?.title" data-edit-text="title"
            class="column-title mb-2 text-sm font-medium">{{ block.blocks[columnId].title }}</h4>
        <!-- Column content blocks -->
        <Block v-for="item in expand(block.blocks?.[columnId]?.blocks_layout?.items || [], block.blocks?.[columnId]?.blocks || {})"
               :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" :contained="true" />
      </div>
    </div>
  </div>

  <div v-else-if="block['@type'] == 'teaser'"
    class="teaser-block max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
    :data-block-uid="block._blockUid || block_uid"
    :data-block-readonly="block.overwrite ? undefined : ''">
    <!-- Preview image: use block.preview_image if set, otherwise use target's image -->
    <!-- data-edit-link prevents navigation in edit mode, data-edit-media enables image picker overlay -->
    <NuxtLink :to="getUrl(block.href)" v-if="block.preview_image || block.href?.[0]?.hasPreviewImage" data-edit-link="href">
      <NuxtImg class="rounded-t-lg" data-edit-media="preview_image" v-if="block.preview_image" v-for="props in [imageProps(block.preview_image)]" :src="props.url" alt="" />
      <NuxtImg class="rounded-t-lg" data-edit-media="preview_image" v-else-if="block.href?.[0]?.hasPreviewImage" v-for="props in [imageProps(block.href[0])]" :src="props.url" alt="" />
    </NuxtLink>
    <div v-else data-edit-media="preview_image" class="rounded-t-lg bg-gray-200 flex items-center justify-center" style="height: 200px; cursor: pointer;">
      <span class="text-gray-400">Click to add image</span>
    </div>
    <div class="p-5">
      <!-- data-block-readonly on the wrapper controls editability — hydra.js respects it -->
      <!-- Key forces Vue to recreate element when overwrite changes (clears stale contenteditable text) -->
      <NuxtLink :to="getUrl(block.href)" v-if="getTeaserTitle(block)" data-edit-link="href">
        <div>{{ block.head_title }}</div>
        <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
          :key="`title-${block.overwrite}`"
          data-edit-text="title">{{ getTeaserTitle(block) }}</h5>
      </NuxtLink>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400"
        :key="`description-${block.overwrite}`"
        data-edit-text="description"
        v-if="getTeaserDescription(block)">{{ getTeaserDescription(block) }}</p>
      <NuxtLink :to="getUrl(block.href)" data-edit-link="href"
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

  <section ref="carouselRef" v-else-if="block['@type'] == 'slider'" :data-block-uid="block_uid" data-block-container="{allowed:['Slide'],add:'horizontal'}"
    class="max-w-4xl mx-auto" data-carousel="static" >
    <div class="relative w-full">
      <!-- Carousel wrapper -->
      <div class="relative h-56 overflow-hidden rounded-lg md:h-96">
        <div v-for="(slide, index) in block.slides" :key="slide['@id']" :data-block-uid="slide['@id']"
          class="slide duration-700 ease-linear bg-center items-center absolute inset-0"
          :class="[
            { 'bg-gray-700': !slide.preview_image, 'bg-blend-multiply': !slide.preview_image, 'bg-no-repeat': !slide.preview_image, 'bg-cover': slide.preview_image }
          ]"
          :data-carousel-item="index === activeSlideIndex ? 'active' : ''"
          :style="slide.preview_image ? imageProps(slide, true).class : ''"
          data-block-add="right">
          <!-- Clickable overlay for preview_image editing -->
          <div data-edit-media="preview_image" class="absolute inset-0 cursor-pointer" style="z-index: 1;"></div>
          <div
            class="max-w-sm p-6 bg-slate-200/90 border border-gray-200 m-12 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 absolute"
            :class="{ 'right-0': slide.flagAlign == 'right' }" style="z-index: 2;">
            <div data-edit-text="head_title">{{ slide.head_title }}</div>
            <h5 :id="`heading-${slide['@id']}`"
              class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white" data-edit-text="title">
              {{ slide.title }}</h5>
            <p class="mb-3 font-normal text-gray-700 dark:text-gray-400" data-edit-text="description">
              {{ slide.description }}</p>
            <NuxtLink v-if="slide.href" :to="getUrl(slide.href[0])" data-edit-text="buttonText" data-edit-link="href"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              :aria-describedby="`heading-${slide['@id']}`">
              {{ slide.buttonText || 'Read More' }}</NuxtLink>
            <a v-else href="#" data-edit-text="buttonText" data-edit-link="href"
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



  <div v-else-if="block['@type'] == 'separator'" :data-block-uid="block_uid"
       :class="['my-6', {
           'mx-auto max-w-xs': block.styles?.align === 'center',
           'mr-auto max-w-xs': block.styles?.align === 'left'
       }]">
    <hr v-if="!block.styles?.noLine" class="border-gray-300" />
    <div v-else class="py-4"></div>
  </div>



  <AccordionBlock v-else-if="block['@type'] == 'accordion'" :block_uid="block_uid" :block="block" :data="data" />



  <!-- Listing block: async expansion with own paging (or shared paging from container) -->
  <Suspense v-else-if="block['@type'] === 'listing'" :key="`listing-${block_uid}-pg${injectedPages[block_uid] || 0}-${JSON.stringify(block)}`">
    <ListingBlock :id="block_uid" :block="block" :paging="paging"
      :api-url="effectiveApiUrl" :context-path="effectiveContextPath">
      <template #default="{ items }">
        <template v-for="item in items" :key="item['@uid']">
          <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
          <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
        </template>
      </template>
    </ListingBlock>
    <template #fallback>
      <div style="display: contents" class="animate-pulse">
        <div v-for="i in 3" :key="i" :data-block-uid="block_uid"
             class="bg-gray-200 dark:bg-gray-700 h-48 rounded"></div>
      </div>
    </template>
  </Suspense>

  <!-- Search block: container with facets (object_list) and listing child -->
  <!-- Variations: facetsLeftSide, facetsRightSide, facetsTopSide (default) -->
  <div v-else-if="block['@type'] == 'search'" :data-block-uid="block_uid" class="search-block">
    <!-- Headline -->
    <h2 v-if="block.headline" data-edit-text="headline" class="text-2xl font-bold mb-4">{{ block.headline }}</h2>

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
        <template v-for="(facet, idx) in block.facets" :key="facet['@id'] || idx">
          <!-- Non-facet types (slate, image) rendered as generic blocks -->
          <template v-if="facet.type === 'slate' || facet.type === 'image'">
            <div :data-block-uid="facet['@id']" data-block-add="bottom" class="p-3 border border-gray-200 rounded min-w-48">
              <Block :block="facet" :block_uid="facet['@id']" :data="data" :api-url="effectiveApiUrl" />
            </div>
          </template>
          <!-- Facet types -->
          <div v-else :data-block-uid="facet['@id']" :data-block-type="facet.type" data-block-add="bottom"
               class="facet-item p-3 border border-gray-200 rounded min-w-48">
            <div data-edit-text="title" class="facet-label font-medium text-sm mb-2">{{ facet.title }}</div>
            <template v-if="facet.type === 'selectFacet'">
              <select class="facet-select w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      :data-field="getFacetField(facet)" @change="handleFacetSelectChange" data-linkable-allow>
                <option value="">Select...</option>
                <option v-for="opt in getFacetOptions(facet)" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
              </select>
            </template>
            <template v-else-if="facet.type === 'daterangeFacet'">
              <div class="facet-daterange flex gap-2 mt-1">
                <input type="date" class="px-2 py-1 border border-gray-300 rounded text-sm" />
                <span class="text-gray-400">—</span>
                <input type="date" class="px-2 py-1 border border-gray-300 rounded text-sm" />
              </div>
            </template>
            <template v-else-if="facet.type === 'toggleFacet'">
              <div class="facet-toggle mt-1">
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="rounded border-gray-300" />
                  {{ getFacetOptions(facet)?.[0]?.title || 'Toggle' }}
                </label>
              </div>
            </template>
            <template v-else>
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
        </template>
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
        <Block v-for="item in expand(block.listing?.items || [], block.blocks || {})"
               :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
      </div>
    </template>

    <!-- Facets on left or right side -->
    <template v-else-if="block.variation === 'facetsLeftSide' || block.variation === 'facetsRightSide'">
      <div class="flex flex-col md:flex-row gap-6" :class="{ 'md:flex-row-reverse': block.variation === 'facetsRightSide' }">
        <!-- Sidebar: facets -->
        <aside v-if="block.facets?.length" class="search-facets w-full md:w-64 shrink-0">
          <div class="p-4 bg-gray-50 rounded-lg sticky top-4">
            <h3 v-if="block.facetsTitle" class="font-semibold mb-3 text-gray-700">{{ block.facetsTitle }}</h3>
            <template v-for="(facet, idx) in block.facets" :key="facet['@id'] || idx">
              <!-- Non-facet types (slate, image) rendered as generic blocks -->
              <template v-if="facet.type === 'slate' || facet.type === 'image'">
                <div :data-block-uid="facet['@id']" data-block-add="bottom"
                     class="mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                  <Block :block="facet" :block_uid="facet['@id']" :data="data" :api-url="effectiveApiUrl" />
                </div>
              </template>
              <!-- Facet types -->
              <div v-else :data-block-uid="facet['@id']" :data-block-type="facet.type" data-block-add="bottom"
                   class="facet-item mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                <div data-edit-text="title" class="facet-label font-medium text-sm mb-2">{{ facet.title }}</div>
                <template v-if="facet.type === 'selectFacet'">
                  <select class="facet-select w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          :data-field="getFacetField(facet)" @change="handleFacetSelectChange" data-linkable-allow>
                    <option value="">Select...</option>
                    <option v-for="opt in getFacetOptions(facet)" :key="opt.value" :value="opt.value">{{ opt.title }}</option>
                  </select>
                </template>
                <template v-else-if="facet.type === 'daterangeFacet'">
                  <div class="facet-daterange flex gap-2 mt-1">
                    <input type="date" class="px-2 py-1 border border-gray-300 rounded text-sm" />
                    <span class="text-gray-400">—</span>
                    <input type="date" class="px-2 py-1 border border-gray-300 rounded text-sm" />
                  </div>
                </template>
                <template v-else-if="facet.type === 'toggleFacet'">
                  <div class="facet-toggle mt-1">
                    <label class="flex items-center gap-2 text-sm">
                      <input type="checkbox" class="rounded border-gray-300" />
                      {{ getFacetOptions(facet)?.[0]?.title || 'Toggle' }}
                    </label>
                  </div>
                </template>
                <template v-else>
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
            </template>
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
          <Block v-for="item in expand(block.listing?.items || [], block.blocks || {})"
                 :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
        </div>
      </div>
    </template>
  </div>

  <component v-else-if="block['@type'] == 'heading'" :is="block.tag || 'h2'"
    :data-block-uid="block_uid" data-edit-text="heading"
    :class="{ 'text-center': block.alignment === 'center', 'text-right': block.alignment === 'right' }">
    {{ block.heading }}
  </component>

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
          <RichText v-for="(node, idx) in cell.value" :key="idx" :node="node" data-edit-text="value" />
        </component>
      </tr>
    </table>
  </div>

  <div v-else-if="block['@type'] == '__button'" :data-block-uid="block_uid"
       :class="['my-4', {
           'text-center': block.inneralign === 'center',
           'text-right': block.inneralign === 'right'
       }]">
    <NuxtLink :to="getUrl(block.href)"
      class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
      data-edit-text="title">
      {{ block.title || 'Read more' }}
    </NuxtLink>
  </div>

  <div v-else-if="block['@type'] == 'video'" :data-block-uid="block_uid" class="my-4">
    <div v-if="getYouTubeId(block.url)" class="relative w-full pb-[56.25%]">
      <iframe class="absolute inset-0 w-full h-full rounded-lg"
          :src="`https://www.youtube.com/embed/${getYouTubeId(block.url)}`"
          frameborder="0" allowfullscreen></iframe>
    </div>
    <video v-else-if="block.url" class="w-full h-auto max-w-full rounded-lg" controls>
      <source :src="block.url" type="video/mp4">
    </video>
  </div>

  <section v-else-if="block['@type'] == 'highlight'" :data-block-uid="block_uid"
           class="relative overflow-hidden rounded-lg my-6">
    <div v-for="props in [imageProps(block)]" :key="props.url"
         class="absolute inset-0 bg-cover bg-center"
         :style="props.url ? { backgroundImage: `url(${props.url})` } : {}" />
    <div class="absolute inset-0 bg-black/50"></div>
    <div class="relative py-16 px-4 mx-auto max-w-screen-xl text-center lg:py-24">
      <h2 class="mb-4 text-4xl font-extrabold text-white md:text-5xl lg:text-6xl">
        {{ block.title }}</h2>
      <div class="mb-8 text-lg text-gray-200 lg:text-xl sm:px-16 lg:px-48">
        <RichText v-for="node in block['value']" :key="node" :node="node" />
      </div>
      <NuxtLink v-if="block.button" :to="getUrl(block.buttonLink)"
          class="py-3 px-5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800">
        {{ block.buttonText }}
      </NuxtLink>
    </div>
    <div v-if="!imageProps(block).url" class="absolute inset-0 -z-10"
         :class="highlightGradient(block.styles?.descriptionColor)"></div>
  </section>

  <!-- Table of Contents block -->
  <nav v-else-if="block['@type'] == 'toc'" :data-block-uid="block_uid" class="toc-block my-6 p-4 bg-gray-50 rounded-lg">
    <h3 class="text-lg font-semibold mb-2">Table of Contents</h3>
    <ul class="list-disc pl-5 space-y-1">
      <template v-for="(b, bid) in data.blocks" :key="bid">
        <li v-if="b['@type'] === 'heading' && b.heading">
          <a :href="`#${bid}`" class="text-blue-600 hover:underline">{{ b.heading }}</a>
        </li>
      </template>
    </ul>
  </nav>

  <!-- Default listing item: title + description -->
  <div v-else-if="block['@type'] == 'default'" :data-block-uid="block_uid"
       class="default-item-block py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
    <NuxtLink :to="getUrl(block.href)" class="text-decoration-none">
      <h4 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{{ block.title }}</h4>
    </NuxtLink>
    <p v-if="block.description" class="text-gray-600 dark:text-gray-400 text-sm">{{ block.description }}</p>
  </div>

  <!-- Summary listing item: image thumbnail + title + description -->
  <div v-else-if="block['@type'] == 'summary'" :data-block-uid="block_uid"
       class="summary-item-block py-4 border-b border-gray-200 flex items-start gap-4 hover:bg-gray-50 transition-colors">
    <template v-if="block.image" v-for="props in [imageProps(block.image)]" :key="props.url">
      <NuxtImg v-if="props.url" :src="props.url" alt=""
        class="w-32 h-24 object-cover rounded shrink-0" />
    </template>
    <div class="flex-1">
      <NuxtLink :to="getUrl(block.href)" class="text-decoration-none">
        <h4 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{{ block.title }}</h4>
      </NuxtLink>
      <p v-if="block.description" class="text-gray-600 dark:text-gray-400 text-sm">{{ block.description }}</p>
    </div>
  </div>

  <!-- Form block: renders subblocks as form fields, POSTs to /@submit-form -->
  <div v-else-if="block['@type'] == 'form'" :data-block-uid="block_uid" class="my-6">
    <h3 v-if="block.title" data-edit-text="title" class="text-xl font-semibold mb-4">{{ block.title }}</h3>
    <div v-if="formState[block_uid]?.success" class="form-success p-4 bg-green-50 text-green-800 rounded-lg mb-4">
      {{ block.send_message || 'Form submitted successfully.' }}
    </div>
    <form v-else @submit.prevent="handleFormSubmit($event, block)" novalidate class="space-y-4">
      <template v-for="field in block.subblocks" :key="field.field_id">
        <div :data-block-uid="field.field_id" :data-block-type="field.field_type" data-block-add="bottom"
             class="form-field">
          <!-- Text -->
          <template v-if="field.field_type === 'text'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <input type="text" :name="field.field_id" :value="getFormValue(block_uid, field.field_id)"
                   @input="setFormValue(block_uid, field.field_id, $event.target.value)"
                   :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']" />
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Textarea -->
          <template v-else-if="field.field_type === 'textarea'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <textarea :name="field.field_id" rows="4" :value="getFormValue(block_uid, field.field_id)"
                      @input="setFormValue(block_uid, field.field_id, $event.target.value)"
                      :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                               formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']"></textarea>
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Number -->
          <template v-else-if="field.field_type === 'number'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <input type="number" :name="field.field_id" :value="getFormValue(block_uid, field.field_id)"
                   @input="setFormValue(block_uid, field.field_id, $event.target.value)"
                   :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']" />
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Select (List) -->
          <template v-else-if="field.field_type === 'select'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <select :name="field.field_id" :value="getFormValue(block_uid, field.field_id)"
                    @change="setFormValue(block_uid, field.field_id, $event.target.value)"
                    :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                             formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']">
              <option value="">Select...</option>
              <option v-for="opt in field.input_values" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Single Choice (Radio) -->
          <template v-else-if="field.field_type === 'single_choice'">
            <fieldset>
              <legend class="block text-sm font-medium text-gray-700 mb-1">
                {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
              </legend>
              <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
              <div class="space-y-1">
                <label v-for="opt in field.input_values" :key="opt" class="flex items-center gap-2 text-sm">
                  <input type="radio" :name="field.field_id" :value="opt"
                         :checked="getFormValue(block_uid, field.field_id) === opt"
                         @change="setFormValue(block_uid, field.field_id, opt)" class="border-gray-300" />
                  {{ opt }}
                </label>
              </div>
              <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
            </fieldset>
          </template>
          <!-- Multiple Choice (Checkboxes) -->
          <template v-else-if="field.field_type === 'multiple_choice'">
            <fieldset>
              <legend class="block text-sm font-medium text-gray-700 mb-1">
                {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
              </legend>
              <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
              <div class="space-y-1">
                <label v-for="opt in field.input_values" :key="opt" class="flex items-center gap-2 text-sm">
                  <input type="checkbox" :name="field.field_id" :value="opt"
                         :checked="(getFormValue(block_uid, field.field_id) || []).includes(opt)"
                         @change="toggleMultiChoice(block_uid, field.field_id, opt, $event.target.checked)"
                         class="rounded border-gray-300" />
                  {{ opt }}
                </label>
              </div>
              <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
            </fieldset>
          </template>
          <!-- Checkbox -->
          <template v-else-if="field.field_type === 'checkbox'">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" :name="field.field_id"
                     :checked="!!getFormValue(block_uid, field.field_id)"
                     @change="setFormValue(block_uid, field.field_id, $event.target.checked)"
                     class="rounded border-gray-300" />
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mt-0.5">{{ field.description }}</p>
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Date -->
          <template v-else-if="field.field_type === 'date'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <input type="date" :name="field.field_id" :value="getFormValue(block_uid, field.field_id)"
                   @input="setFormValue(block_uid, field.field_id, $event.target.value)"
                   :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']" />
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Email (from) -->
          <template v-else-if="field.field_type === 'from'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <input type="email" :name="field.field_id" :value="getFormValue(block_uid, field.field_id)"
                   @input="setFormValue(block_uid, field.field_id, $event.target.value)"
                   :class="['w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            formFieldError(block_uid, field.field_id) ? 'border-red-500' : 'border-gray-300']" />
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Attachment -->
          <template v-else-if="field.field_type === 'attachment'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ field.label }}<span v-if="field.required" class="text-red-500 ml-0.5">*</span>
            </label>
            <p v-if="field.description" class="text-xs text-gray-500 mb-1">{{ field.description }}</p>
            <input type="file" :name="field.field_id"
                   @change="setFormValue(block_uid, field.field_id, $event.target.files?.[0]?.name || '')"
                   class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <p v-if="formFieldError(block_uid, field.field_id)" class="form-error text-red-500 text-xs mt-1">{{ formFieldError(block_uid, field.field_id) }}</p>
          </template>
          <!-- Static text -->
          <template v-else-if="field.field_type === 'static_text'">
            <div class="text-sm text-gray-600">
              <strong v-if="field.label">{{ field.label }}</strong>
              <p v-if="field.description">{{ field.description }}</p>
            </div>
          </template>
          <!-- Hidden -->
          <template v-else-if="field.field_type === 'hidden'">
            <input type="hidden" :name="field.field_id" :value="field.value || ''" />
          </template>
        </div>
      </template>
      <div class="flex gap-3 pt-2">
        <button type="submit" data-edit-text="submit_label"
                class="form-submit px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300">
          {{ block.submit_label || 'Submit' }}
        </button>
        <button v-if="block.show_cancel" type="reset" data-edit-text="cancel_label"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          {{ block.cancel_label || 'Cancel' }}
        </button>
      </div>
    </form>
  </div>

  <!-- Code example block: tabbed code with syntax highlighting -->
  <CodeExample v-else-if="block['@type'] == 'codeExample'" :block_uid="block_uid" :block="block" />

  <!-- Empty block - placeholder for deleted blocks in containers -->
  <div v-else-if="block['@type'] == 'empty'" :data-block-uid="block_uid" class="empty-block min-h-[60px]">
  </div>

  <div v-else :data-block-uid="block_uid">
    {{ 'Not implemented Block: @type=' + block['@type'] }}
    <pre>{{ block }}</pre>
  </div>

</template>
<script setup>
import { ref, watch, nextTick, computed, toRefs, inject, onMounted } from 'vue';
import { expandTemplatesSync, staticBlocks, isEditMode } from '@hydra-js/hydra.js';
import RichText from './richtext.vue';

// Inject page-level context for nested components
const injectedApiUrl = inject('apiUrl', '');
const injectedContextPath = inject('contextPath', '/');
const injectedTemplates = inject('templates', {});
const templateState = inject('templateState', {});
const injectedPages = inject('pages', {});

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
  },
  // Shared paging object (for combined paging in containers like gridBlock).
  // When null, listing blocks create and own their own paging.
  paging: {
    type: Object,
    default: null,
  }
});

// Use toRefs to maintain reactivity (destructuring props directly can lose reactivity in Vue 3)
const { block_uid, block, data, contained, apiUrl } = toRefs(props);


// Use prop apiUrl if provided, otherwise injected value
const effectiveApiUrl = computed(() => apiUrl.value || injectedApiUrl);
const effectiveContextPath = computed(() => {
  const pageId = data.value?.['@id'] || injectedContextPath;
  if (typeof pageId === 'string' && pageId.startsWith('http')) {
    return new URL(pageId).pathname;
  }
  return pageId;
});


const route = useRoute();

// Sync fallback for templates not in the pre-loaded map
function syncLoadTemplate(templateId) {
  const tplPath = templateId.startsWith('http')
    ? new URL(templateId).pathname
    : `/${templateId.replace(/^\//, '')}`;
  const url = `${effectiveApiUrl.value}${tplPath}`;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send();
  if (xhr.status === 200) return JSON.parse(xhr.responseText);
  throw new Error(`Sync template load failed: ${templateId} (${xhr.status})`);
}

// Expand child blocks: wraps expandTemplatesSync with injected context
const expand = (layout, blocks) => expandTemplatesSync(layout, {
  blocks, templateState, templates: injectedTemplates, loadTemplate: syncLoadTemplate,
});

// Grid block: combined paging across all children (mirrors README Grid pattern)
// Stable object so expandListingBlocks can mutate _ready/_pending/total on it
const GRID_PAGE_SIZE = 6;
const gridPageFromUrl = computed(() => {
  const pages = injectedPages.value || injectedPages;
  return pages[block_uid.value] || 0;
});
const gridPaging = { start: 0, size: GRID_PAGE_SIZE };
const gridBuildPagingUrl = (page) => {
  if (page === 0) return effectiveContextPath.value;
  return `${effectiveContextPath.value}/@pg_${block_uid.value}_${page}`;
};

// Process grid children: listings marked for Suspense, static blocks filtered by paging window
// This is the Vue equivalent of the README's inline JSX pattern:
//   blocks[id]['@type'] === 'listing' ? <Suspense><ListingItems/></Suspense>
//                                     : staticBlocks([id], { blocks, paging }).map(...)
const LISTING_TYPES = ['listing'];
const gridChildren = computed(() => {
  const layout = block.value.blocks_layout?.items || [];
  const blocks = block.value.blocks || {};
  // Read page number (reactive dependency) and update paging start
  gridPaging.start = gridPageFromUrl.value * GRID_PAGE_SIZE;
  gridPaging._seen = 0;
  gridPaging.total = 0;
  return layout.map(id => {
    const child = blocks[id];
    if (!child) return null;
    if (LISTING_TYPES.includes(child['@type'])) {
      return { id, block: child, isListing: true };
    }
    const items = staticBlocks([id], { blocks, paging: gridPaging });
    return { id, block: child, isListing: false, items };
  }).filter(Boolean);
});

// Slider state: track active slide and detect new slides
const activeSlideIndex = ref(0);
const carouselRef = ref(null);
const prevSlideCount = ref(block.value?.slides?.length || 0);

// On mount: hide non-active slides and initialize Flowbite carousel.
// Vue's reactive :class is NOT used for visibility to avoid fighting
// with Flowbite's imperative DOM manipulation during transitions.
onMounted(async () => {
  if (block.value?.['@type'] !== 'slider' || !process.client) return;
  const section = carouselRef.value;
  if (!section) return;
  // Immediately remove data-carousel to prevent ANY other initCarousels() call
  // from re-initializing this carousel. Each initCarousels() creates a NEW Carousel
  // whose constructor calls slideTo(defaultPosition), resetting position and adding
  // duplicate click handlers. Sources: page-level initFlowbite(), window load event.
  // We restore the attribute only for our single initCarousels() call below.
  const carouselType = section.getAttribute('data-carousel');
  section.removeAttribute('data-carousel');
  // Hide non-active slides before Flowbite inits (prevents flash)
  const slides = section.querySelectorAll('[data-carousel-item]');
  slides.forEach((slide, i) => {
    if (i !== activeSlideIndex.value) slide.classList.add('hidden');
    else slide.classList.add('flex');
  });
  await nextTick();
  const flowbite = await import('flowbite');
  section.setAttribute('data-carousel', carouselType);
  flowbite.initCarousels();
  section.removeAttribute('data-carousel');
});

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
        const section = carouselRef.value;
        if (section) {
          // Restore data-carousel so initCarousels() finds it, then remove again
          section.setAttribute('data-carousel', 'static');
          const flowbite = await import('flowbite');
          flowbite.initCarousels();
          section.removeAttribute('data-carousel');
        }
      }
    }
    prevSlideCount.value = newCount || 0;
  },
  { immediate: true }
);

// Grid block helpers
const gridBgStyle = (block) => {
  const bg = block.styles?.backgroundColor;
  if (!bg || bg === 'white') return {};
  const colorMap = { grey: '#f1f5f9', blue: '#1d4ed8', red: '#b91c1c', green: '#15803d' };
  return { backgroundColor: colorMap[bg] || bg };
};

const gridColsClass = (block) => {
  const count = block.blocks_layout?.items?.length || 4;
  const cols = Math.min(count, 4);
  return [`sm:grid-cols-${Math.min(cols, 2)}`, `md:grid-cols-${Math.min(cols, 3)}`, `lg:grid-cols-${cols}`];
};

// Helper to extract YouTube video ID from various URL formats
const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match?.[1] || null;
};

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

// Map highlight descriptionColor styles to Tailwind gradient classes
const highlightGradient = (colorClass) => {
  const gradients = {
    'highlight-custom-color-1': 'bg-gradient-to-r from-blue-800 to-blue-600',
    'highlight-custom-color-2': 'bg-gradient-to-r from-emerald-800 to-emerald-600',
    'highlight-custom-color-3': 'bg-gradient-to-r from-purple-800 to-purple-600',
    'highlight-custom-color-4': 'bg-gradient-to-r from-amber-800 to-amber-600',
    'highlight-custom-color-5': 'bg-gradient-to-r from-rose-800 to-rose-600',
  };
  return gradients[colorClass] || gradients['highlight-custom-color-1'];
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
  // Get total results from the listing child block (shared blocks dict)
  const listingUid = searchBlock.listing?.items?.[0];
  if (!listingUid) return null;
  const listingBlock = searchBlock.blocks?.[listingUid];
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

// Form block: per-block state for errors, success, and user input values.
// Values are tracked in reactive state because admin FORM_DATA updates can
// re-render the iframe, which would lose DOM-only input values.
const formState = ref({});
const formValues = ref({});

const formFieldError = (blockUid, fieldId) => {
  return formState.value[blockUid]?.errors?.[fieldId] || '';
};

const getFormValue = (blockUid, fieldId) => {
  return formValues.value[blockUid]?.[fieldId] ?? '';
};

const setFormValue = (blockUid, fieldId, value) => {
  if (!formValues.value[blockUid]) {
    formValues.value[blockUid] = {};
  }
  formValues.value[blockUid][fieldId] = value;
};

const toggleMultiChoice = (blockUid, fieldId, opt, checked) => {
  const current = getFormValue(blockUid, fieldId) || [];
  const arr = Array.isArray(current) ? [...current] : [];
  if (checked) {
    if (!arr.includes(opt)) arr.push(opt);
  } else {
    const idx = arr.indexOf(opt);
    if (idx >= 0) arr.splice(idx, 1);
  }
  setFormValue(blockUid, fieldId, arr);
};

const validateFormValues = (blockUid, fields) => {
  const errors = {};
  const vals = formValues.value[blockUid] || {};
  for (const field of fields) {
    if (!field.required) continue;
    if (field.field_type === 'static_text' || field.field_type === 'hidden') continue;
    const value = vals[field.field_id];
    const hasValue = Array.isArray(value) ? value.length > 0 : (value !== '' && value !== undefined && value !== false);
    if (!hasValue) {
      errors[field.field_id] = `${field.label} is required.`;
    }
  }
  // Email format validation for 'from' fields
  for (const field of fields) {
    if (field.field_type !== 'from') continue;
    const value = vals[field.field_id];
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.field_id] = 'Please enter a valid email address.';
    }
  }
  return errors;
};

const handleFormSubmit = async (event, formBlock) => {
  const fields = formBlock.subblocks || [];
  const uid = block_uid.value;

  // Validate from reactive state
  const errors = validateFormValues(uid, fields);
  if (Object.keys(errors).length > 0) {
    formState.value = { ...formState.value, [uid]: { errors } };
    return;
  }

  // Collect submission data from reactive state
  const vals = formValues.value[uid] || {};
  const submitData = fields
    .filter(f => f.field_type !== 'static_text')
    .map(f => ({
      field_id: f.field_id,
      label: f.label,
      value: vals[f.field_id] ?? '',
    }));

  const apiUrl = effectiveApiUrl.value;
  const contextPath = effectiveContextPath.value;
  const response = await fetch(`${apiUrl}${contextPath}/@submit-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ block_id: uid, data: submitData }),
  });
  if (response.ok || response.status === 204) {
    formState.value = { ...formState.value, [uid]: { success: true } };
  }
};

</script>