<template>
  <nav v-if="paging.totalPages > 1" aria-label="Page Navigation" class="paging mt-4">
    <ul class="inline-flex -space-x-px text-sm">
      <li v-if="paging.prev !== null">
        <NuxtLink :to="buildUrl(paging.prev)" data-linkable-allow
          class="paging-prev flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100">
          Previous
        </NuxtLink>
      </li>
      <li v-for="page in paging.pages" :key="page.page">
        <NuxtLink :to="buildUrl(page.page - 1)" data-linkable-allow
          :class="['paging-page', paging.currentPage === page.page - 1 ? 'current bg-blue-100' : 'bg-white']"
          class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 border border-gray-300 hover:bg-gray-100">
          {{ page.page }}
        </NuxtLink>
      </li>
      <li v-if="paging.next !== null">
        <NuxtLink :to="buildUrl(paging.next)" data-linkable-allow
          class="paging-next flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100">
          Next
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup>
const props = defineProps({
  paging: { type: Object, required: true },
  buildUrl: { type: Function, required: true },
});
</script>
