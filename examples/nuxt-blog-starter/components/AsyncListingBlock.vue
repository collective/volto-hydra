<template>
  <!-- Grid blocks: single grid container, static + dynamic items flow together -->
  <div v-if="isGridBlock" :data-block-uid="block_uid" :class="containerClass">
    <div class="grid-row grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <!-- Static items render immediately (already processed through staticBlocks) -->
      <Block v-for="item in staticItems" :key="item['@uid']"
             :block_uid="item['@uid']" :block="item" :data="data" :contained="true"
             class="grid-cell p-4" :class="gridCellClass" />

      <!-- Dynamic blocks stream in via Suspense, display:contents makes them grid items -->
      <!-- :key forces remount on page/block change for client-side navigation and edit mode -->
      <Suspense v-if="dynamicBlocksList.length" :key="`grid-${pageFromUrl}-${blocksFingerprint}`">
        <template #default>
          <AsyncExpandedItems
            :blocks="dynamicBlocksMap"
            :layout="dynamicLayout"
            :paging="makePaging()"
            :api-url="apiUrl"
            :context-path="contextPath"
            :paging-key="block_uid">
            <template #default="{ items, paging: pagingResult, buildPagingUrl }">
              <!-- display:contents: children flow as grid items in parent grid -->
              <div style="display: contents">
                <template v-for="item in items" :key="item['@uid']">
                  <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
                  <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="true"
                         class="grid-cell p-4" :class="gridCellClass" />
                </template>
              </div>
              <!-- Paging spans full width -->
              <nav v-if="pagingResult.totalPages > 1" aria-label="Grid Navigation" class="grid-paging mt-4 col-span-full">
                <ul class="inline-flex -space-x-px text-sm">
                  <li v-if="pagingResult.prev !== null">
                    <NuxtLink :to="buildPagingUrl(pagingResult.prev)" data-linkable-allow
                      class="paging-prev flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100">
                      Previous
                    </NuxtLink>
                  </li>
                  <li v-for="page in pagingResult.pages" :key="page.page">
                    <NuxtLink :to="buildPagingUrl(page.page - 1)" data-linkable-allow
                      :class="['paging-page', pagingResult.currentPage === page.page - 1 ? 'current bg-blue-100' : 'bg-white']"
                      class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 border border-gray-300 hover:bg-gray-100">
                      {{ page.page }}
                    </NuxtLink>
                  </li>
                  <li v-if="pagingResult.next !== null">
                    <NuxtLink :to="buildPagingUrl(pagingResult.next)" data-linkable-allow
                      class="paging-next flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100">
                      Next
                    </NuxtLink>
                  </li>
                </ul>
              </nav>
            </template>
          </AsyncExpandedItems>
        </template>
        <template #fallback>
          <!-- Skeleton items also use display:contents to flow in grid -->
          <div style="display: contents" class="animate-pulse">
            <div v-for="i in 3" :key="i" :data-block-uid="block_uid" class="bg-gray-200 dark:bg-gray-700 h-48 rounded grid-cell"></div>
          </div>
        </template>
      </Suspense>
    </div>
  </div>

  <!-- Non-grid: sequential layout with streaming -->
  <!-- Note: For standalone listings, don't add data-block-uid here - the expanded items have it -->
  <div v-else>
    <!-- Static items render immediately -->
    <Block v-for="item in staticItems" :key="item['@uid']"
           :block_uid="item['@uid']" :block="item" :data="data" :contained="true" />

    <!-- Dynamic blocks stream in -->
    <!-- :key forces remount on page/block change for client-side navigation and edit mode -->
    <Suspense v-if="dynamicBlocksList.length" :key="`listing-${pageFromUrl}-${blocksFingerprint}`">
      <template #default>
        <AsyncExpandedItems
          :blocks="dynamicBlocksMap"
          :layout="dynamicLayout"
          :paging="makePaging()"
          :api-url="apiUrl"
          :context-path="contextPath"
          :paging-key="block_uid">
          <template #default="{ items, paging: pagingResult, buildPagingUrl }">
            <div class="expanded-items">
              <template v-for="item in items" :key="item['@uid']">
                <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
                <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="true" />
              </template>
            </div>
            <!-- Paging controls -->
            <nav v-if="pagingResult.totalPages > 1" aria-label="Listing Navigation" class="listing-paging mt-4">
              <ul class="inline-flex -space-x-px text-sm">
                <li v-if="pagingResult.prev !== null">
                  <NuxtLink :to="buildPagingUrl(pagingResult.prev)" data-linkable-allow
                    class="paging-prev flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100">
                    Previous
                  </NuxtLink>
                </li>
                <li v-for="page in pagingResult.pages" :key="page.page">
                  <NuxtLink :to="buildPagingUrl(page.page - 1)" data-linkable-allow
                    :class="['paging-page', pagingResult.currentPage === page.page - 1 ? 'current bg-blue-100' : 'bg-white']"
                    class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 border border-gray-300 hover:bg-gray-100">
                    {{ page.page }}
                  </NuxtLink>
                </li>
                <li v-if="pagingResult.next !== null">
                  <NuxtLink :to="buildPagingUrl(pagingResult.next)" data-linkable-allow
                    class="paging-next flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100">
                    Next
                  </NuxtLink>
                </li>
              </ul>
            </nav>
          </template>
        </AsyncExpandedItems>
      </template>
      <template #fallback>
        <div class="animate-pulse">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="i in 3" :key="i" :data-block-uid="block_uid" class="bg-gray-200 dark:bg-gray-700 h-48 rounded"></div>
          </div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { staticBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  block_uid: { type: String, required: true },
  block: { type: Object, required: true },
  data: { type: Object, required: true },
  apiUrl: { type: String, required: true },
});

// Block types that need async expansion
const LISTING_TYPES = ['listing', 'gridBlock', 'search'];

// Get context path from page data
let contextPath = props.data['@id'] || '/';
if (contextPath.startsWith('http')) {
  contextPath = new URL(contextPath).pathname;
}

// Layout helpers
const isGridBlock = props.block['@type'] === 'gridBlock';
const containerClass = isGridBlock ? `mt-6 mb-6 bg-${props.block.styles?.backgroundColor || 'white'}-700` : '';
const gridCellClass = isGridBlock ? `bg-${!props.block.styles?.backgroundColor ? 'grey' : 'white'}-700` : '';

// Computed block lists - reactive to props.block changes for edit mode
const isStandaloneListing = computed(() => props.block['@type'] === 'listing');

const allBlocks = computed(() => {
  if (isStandaloneListing.value) {
    // Standalone listing - the block itself needs expansion
    return [{ id: props.block_uid, block: props.block }];
  } else {
    // Container - get children
    const blocks = props.block.blocks || props.block.listing || {};
    const layout = props.block.blocks_layout?.items || props.block.listing_layout?.items || [];
    return layout.map(id => ({ id, block: blocks[id] })).filter(item => item.block);
  }
});

// Split into static (before first listing) and dynamic (listing + after)
const blockLists = computed(() => {
  let foundListing = false;
  const staticList = [];
  const dynamicList = [];

  for (const item of allBlocks.value) {
    if (!foundListing && LISTING_TYPES.includes(item.block['@type'])) {
      foundListing = true;
    }
    if (foundListing) {
      dynamicList.push(item);
    } else {
      staticList.push(item);
    }
  }
  return { staticList, dynamicList };
});

const staticBlocksList = computed(() => blockLists.value.staticList);
const dynamicBlocksList = computed(() => blockLists.value.dynamicList);

// Convert to maps for the helpers
const staticBlocksMap = computed(() => Object.fromEntries(staticBlocksList.value.map(({ id, block }) => [id, block])));
const staticLayout = computed(() => staticBlocksList.value.map(({ id }) => id));
const dynamicBlocksMap = computed(() => Object.fromEntries(dynamicBlocksList.value.map(({ id, block }) => [id, block])));
const dynamicLayout = computed(() => dynamicBlocksList.value.map(({ id }) => id));

// Reactive paging based on route query - enables client-side navigation
const route = useRoute();
const pageSize = 6;

// Computed page number from URL - reacts to client-side navigation
const pageFromUrl = computed(() => parseInt(route.query[`pg_${props.block_uid}`] || '0', 10));

// Fingerprint of block data - forces re-render when any block property changes in edit mode
const blocksFingerprint = computed(() => JSON.stringify(props.block));

// Computed static items - recomputed when page or blocks change
const staticItems = computed(() => {
  const paging = { start: pageFromUrl.value * pageSize, size: pageSize, total: 0, _seen: 0 };
  const { items } = staticBlocks(staticBlocksMap.value, staticLayout.value, paging);
  return items;
});

// Create fresh paging object for async component (called when component mounts/remounts)
const makePaging = () => ({
  start: pageFromUrl.value * pageSize,
  size: pageSize,
  total: 0,
  _seen: staticBlocksList.value.length, // Account for static blocks already processed
});
</script>
