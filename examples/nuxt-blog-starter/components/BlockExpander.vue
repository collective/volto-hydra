<template>
  <!-- Static items render immediately -->
  <template v-for="item in staticItems" :key="item['@uid']">
    <slot name="item" :item="item">
      <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
    </slot>
  </template>

  <!-- Dynamic items via Suspense -->
  <!-- :key forces remount on page/block change for client-side navigation and edit mode -->
  <Suspense v-if="dynamicBlocksList.length" :key="`expand-${pageFromUrl}-${blocksFingerprint}`">
    <template #default>
      <AsyncExpandedItems
        :blocks="dynamicBlocksMap"
        :layout="dynamicLayout"
        :paging="makePaging()"
        :api-url="apiUrl"
        :context-path="contextPath"
        :paging-key="pagingKey">
        <template #default="{ items, paging: pagingResult, buildPagingUrl }">
          <!-- display:contents: children flow into parent layout (e.g., grid) -->
          <div style="display: contents">
            <template v-for="item in items" :key="item['@uid']">
              <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
              <slot name="item" :item="item">
                <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
              </slot>
            </template>
          </div>
          <Paging v-if="pagingResult.totalPages > 1"
                  :paging="pagingResult" :build-url="buildPagingUrl" class="col-span-full" />
        </template>
      </AsyncExpandedItems>
    </template>
    <template #fallback>
      <div style="display: contents" class="animate-pulse">
        <div v-for="i in 3" :key="i" :data-block-uid="block_uid || undefined"
             class="bg-gray-200 dark:bg-gray-700 h-48 rounded"></div>
      </div>
    </template>
  </Suspense>
</template>

<script setup>
import { computed } from 'vue';
import { staticBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  block_uid: { type: String, default: null },   // For block mode (grid, listing)
  block: { type: Object, default: null },        // For block mode
  items: { type: Array, default: null },         // For items mode (container fields)
  data: { type: Object, required: true },
  apiUrl: { type: String, required: true },
  contained: { type: Boolean, default: false },
});

// Block types that need async expansion
const LISTING_TYPES = ['listing', 'gridBlock'];

// Get context path from page data
let contextPath = props.data['@id'] || '/';
if (contextPath.startsWith('http')) {
  contextPath = new URL(contextPath).pathname;
}

// Computed block lists - reactive to props changes for edit mode
const allBlocks = computed(() => {
  if (props.items) {
    // Items mode: items are already expanded via expandTemplatesSync()
    return props.items.map(item => ({ id: item['@uid'], block: item }));
  }
  // Block mode
  const isStandaloneListing = props.block['@type'] === 'listing';
  if (isStandaloneListing) {
    // Standalone listing - the block itself needs expansion
    return [{ id: props.block_uid, block: props.block }];
  } else {
    // Container (gridBlock etc.) - get children
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

// Paging key: use block_uid when available, otherwise first dynamic block's id
const pagingKey = computed(() => props.block_uid || dynamicBlocksList.value[0]?.id || 'default');

// Reactive paging based on route query - enables client-side navigation
const route = useRoute();
const pageSize = 6;

// Computed page number from URL - reacts to client-side navigation
const pageFromUrl = computed(() => {
  if (!props.block_uid) return 0;  // No paging in items mode
  return parseInt(route.query[`pg_${props.block_uid}`] || '0', 10);
});

// Fingerprint of block data - forces re-render when any block property changes in edit mode
const blocksFingerprint = computed(() => JSON.stringify(props.items || props.block));

// Computed static items - recomputed when page or blocks change
const staticItems = computed(() => {
  const paging = { start: pageFromUrl.value * pageSize, size: pageSize, total: 0, _seen: 0 };
  const { items } = staticBlocks(staticLayout.value, { blocks: staticBlocksMap.value, paging });
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
