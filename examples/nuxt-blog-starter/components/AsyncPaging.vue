<template>
  <Paging v-if="paging.totalPages > 1" :paging="paging" :build-url="buildUrl" />
</template>

<script setup>
const props = defineProps({
  paging: { type: Object, required: true },
  buildUrl: { type: Function, required: true },
});

// Await the _ready promise so this component stays in Suspense
// until computePagingUI has run (after staticBlocks or expandListingBlocks)
if (props.paging._ready) {
  await props.paging._ready;
}
</script>
