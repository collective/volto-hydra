<template>
  <template v-for="entry in processed.blocks" :key="entry.id">
    <!-- Listing: expand async in its own Suspense -->
    <Suspense v-if="entry.listing" :key="`${entry.id}-${entry.paging.start}-${blocksFingerprint}`">
      <AsyncExpandedItems :id="entry.id" :block="entry.block" :paging="entry.paging"
        :api-url="effectiveApiUrl" :context-path="contextPath">
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
    <!-- Per-listing paging (only when not using combined paging) -->
    <Suspense v-if="entry.listing && !usePaging" :key="`paging-${entry.id}-${entry.paging.start}-${blocksFingerprint}`">
      <AsyncPaging :paging="entry.paging" :build-url="(pg) => buildListingPagingUrl(entry.id, pg)" />
    </Suspense>
    <!-- Static block: render immediately (staticBlocks tracks position when paging) -->
    <template v-else-if="!entry.listing" v-for="item in entry.items" :key="item['@uid']">
      <slot name="item" :item="item">
        <Block :block_uid="item['@uid']" :block="item" :data="data" :contained="contained" />
      </slot>
    </template>
  </template>
  <!-- Combined paging: shared across all blocks (only when pageSize > 0) -->
  <slot v-if="usePaging && hasListings" name="paging" :paging="processed.paging" :build-url="buildCombinedPagingUrl">
    <Suspense :key="`paging-${pageFromUrl}-${blocksFingerprint}`">
      <AsyncPaging :paging="processed.paging" :build-url="buildCombinedPagingUrl" />
    </Suspense>
  </slot>
</template>

<script setup>
import { computed, inject } from 'vue';
import { expandTemplatesSync, staticBlocks, isEditMode } from '@hydra-js/hydra.js';

const props = defineProps({
  // Template expansion inputs (blocks + layout mode, used by containers)
  blocks: { type: Object, default: null },
  layout: { type: Array, default: null },
  templates: { type: Object, default: null },
  allowedLayouts: { type: Array, default: null },
  // Pre-expanded items (items mode, used by page after style grouping)
  items: { type: Array, default: null },
  // Rendering context
  data: { type: Object, required: true },
  apiUrl: { type: String, default: '' },
  block_uid: { type: String, default: null },
  contained: { type: Boolean, default: false },
  // Combined paging: 0 = per-listing paging (default), > 0 = combined paging across all blocks
  pageSize: { type: Number, default: 0 },
});

// Inject shared context from page level
const templateState = inject('templateState', {});
const injectedApiUrl = inject('apiUrl', '');
const injectedTemplates = inject('templates', {});
const effectiveApiUrl = computed(() => props.apiUrl || injectedApiUrl);
const effectiveTemplates = computed(() => props.templates || injectedTemplates);

const LISTING_TYPES = ['listing'];
const DEFAULT_LISTING_PAGE_SIZE = 6;

let contextPath = props.data?.['@id'] || '/';
if (contextPath.startsWith('http')) contextPath = new URL(contextPath).pathname;

// Sync fallback for templates not in the pre-loaded map (e.g. forced layouts).
function syncLoadTemplate(templateId) {
  const tplPath = templateId.startsWith('http')
    ? new URL(templateId).pathname
    : `/${templateId.replace(/^\//, '')}`;
  const url = `${effectiveApiUrl.value}${tplPath}`;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send();
  if (xhr.status === 200) {
    return JSON.parse(xhr.responseText);
  }
  throw new Error(`Sync template load failed: ${templateId} (${xhr.status})`);
}

// Step 1: Get expanded items — either pre-provided or from blocks+layout with template expansion
const expandedItems = computed(() => {
  if (props.items) return props.items;

  const layout = props.layout || [];
  const blocks = props.blocks || {};

  if (isEditMode()) {
    return layout.map(id => {
      const block = blocks[id];
      return block ? { ...block, '@uid': id } : null;
    }).filter(Boolean);
  }

  return expandTemplatesSync(layout, {
    blocks,
    templateState,
    templates: effectiveTemplates.value,
    allowedLayouts: props.allowedLayouts,
    loadTemplate: syncLoadTemplate,
  });
});

// Step 2: Static/listing split + paging
const allBlocks = computed(() =>
  expandedItems.value.map(item => ({ id: item['@uid'], block: item }))
);

const hasListings = computed(() =>
  allBlocks.value.some(({ block }) => LISTING_TYPES.includes(block['@type']))
);

const usePaging = computed(() => props.pageSize > 0);

const route = useRoute();

// Per-listing page number from URL (keyed by listing block ID)
function listingPageFromUrl(listingId) {
  return parseInt(route.query[`pg_${listingId}`] || '0', 10);
}

// Combined page number from URL (keyed by container block_uid)
const pageFromUrl = computed(() => {
  if (!usePaging.value) return 0;
  return parseInt(route.query[`pg_${props.block_uid}`] || '0', 10);
});

const processed = computed(() => {
  if (usePaging.value) {
    // Combined paging: shared paging object across static + listing blocks
    const paging = { start: pageFromUrl.value * props.pageSize, size: props.pageSize };
    const blocks = allBlocks.value.map(({ id, block }) => {
      if (LISTING_TYPES.includes(block['@type'])) {
        return { id, block, listing: true, paging };
      }
      const items = staticBlocks([id], { blocks: { [id]: block }, paging });
      return { id, block, listing: false, items };
    });
    return { blocks, paging };
  } else {
    // Per-listing paging: each listing gets its own paging object, static blocks render all
    const noPaging = { start: 0, size: Infinity };
    const blocks = allBlocks.value.map(({ id, block }) => {
      if (LISTING_TYPES.includes(block['@type'])) {
        const listingSize = block.b_size || DEFAULT_LISTING_PAGE_SIZE;
        const listingPage = listingPageFromUrl(id);
        const paging = { start: listingPage * listingSize, size: listingSize };
        return { id, block, listing: true, paging };
      }
      const items = staticBlocks([id], { blocks: { [id]: block }, paging: noPaging });
      return { id, block, listing: false, items };
    });
    return { blocks, paging: noPaging };
  }
});

const blocksFingerprint = computed(() => JSON.stringify(props.items || props.blocks));

// URL builders
const buildCombinedPagingUrl = (page) => {
  if (page === 0) return contextPath;
  return `${contextPath}?pg_${props.block_uid || allBlocks.value[0]?.id || 'default'}=${page}`;
};

const buildListingPagingUrl = (listingId, page) => {
  if (page === 0) return contextPath;
  return `${contextPath}?pg_${listingId}=${page}`;
};
</script>
