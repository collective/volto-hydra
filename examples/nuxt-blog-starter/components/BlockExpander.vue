<template>
  <template v-for="entry in processed.blocks" :key="entry.id">
    <!-- Listing: expand async in its own Suspense -->
    <Suspense v-if="entry.listing" :key="`${entry.id}-${pageFromUrl}-${blocksFingerprint}`">
      <AsyncExpandedItems :id="entry.id" :block="entry.block" :paging="processed.paging"
        :api-url="apiUrl" :context-path="contextPath">
        <template #default="{ items }">
          <div style="display: contents">
            <template v-for="item in items" :key="item['@uid']">
              <template v-if="item.readOnly"><!-- hydra block-readonly --></template>
              <slot name="item" :item="item">
                <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
              </slot>
            </template>
          </div>
        </template>
      </AsyncExpandedItems>
      <template #fallback>
        <div style="display: contents" class="animate-pulse">
          <div v-for="i in 3" :key="i" :data-block-uid="block_uid || undefined"
               class="bg-gray-200 dark:bg-gray-700 h-48 rounded"></div>
        </div>
      </template>
    </Suspense>
    <!-- Static block: render immediately (staticBlocks tracks position in paging) -->
    <template v-else v-for="item in entry.items" :key="item['@uid']">
      <slot name="item" :item="item">
        <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
      </slot>
    </template>
  </template>
  <!-- Paging: awaits _ready from expandListingBlocks -->
  <Suspense v-if="hasListings" :key="`paging-${pageFromUrl}-${blocksFingerprint}`">
    <AsyncPaging :paging="processed.paging" :build-url="buildPagingUrl" />
  </Suspense>
</template>

<script setup>
import { computed } from 'vue';
import { staticBlocks } from '@hydra-js/hydra.js';

const props = defineProps({
  block_uid: { type: String, default: null },
  block: { type: Object, default: null },
  items: { type: Array, default: null },
  data: { type: Object, required: true },
  apiUrl: { type: String, required: true },
  contained: { type: Boolean, default: false },
});

const LISTING_TYPES = ['listing'];

let contextPath = props.data['@id'] || '/';
if (contextPath.startsWith('http')) contextPath = new URL(contextPath).pathname;

// Compute block list from props
const allBlocks = computed(() => {
  if (props.items) {
    return props.items.map(item => ({ id: item['@uid'], block: item }));
  }
  if (props.block['@type'] === 'listing') {
    return [{ id: props.block_uid, block: props.block }];
  }
  const blocks = props.block.blocks || {};
  const layout = props.block.blocks_layout?.items || props.block.listing?.items || [];
  return layout.map(id => ({ id, block: blocks[id] })).filter(item => item.block);
});

const hasListings = computed(() => allBlocks.value.some(({ block }) => LISTING_TYPES.includes(block['@type'])));

// Process blocks: staticBlocks for non-listings (tracks _seen in paging), listings passed through
// Fresh paging created each recompute (like React creating it each render)
const processed = computed(() => {
  const paging = { start: pageFromUrl.value * pageSize, size: pageSize };
  const blocks = allBlocks.value.map(({ id, block }) => {
    if (LISTING_TYPES.includes(block['@type'])) {
      return { id, block, listing: true };
    }
    const items = staticBlocks([id], { blocks: { [id]: block }, paging });
    return { id, block, listing: false, items };
  });
  return { blocks, paging };
});

// Paging
const route = useRoute();
const pageSize = 6;
const pageFromUrl = computed(() => {
  if (!props.block_uid) return 0;
  return parseInt(route.query[`pg_${props.block_uid}`] || '0', 10);
});
const blocksFingerprint = computed(() => JSON.stringify(props.items || props.block));
const buildPagingUrl = (page) => {
  if (page === 0) return contextPath;
  return `${contextPath}?pg_${props.block_uid || allBlocks.value[0]?.id || 'default'}=${page}`;
};
</script>
