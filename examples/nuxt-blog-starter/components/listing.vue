<template>
  <!-- Multi-element listing: each item gets data-block-uid for combined selection -->
  <p v-if="!items.length" :data-block-uid="block_uid">Empty Listing</p>
  <template v-for="item in items" :key="item['@id']">
    <NuxtLink :to="getUrl(item)"
      :data-block-uid="block_uid"
      class="flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow md:flex-row md:max-w-xl hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
      <template v-for="props in [imageProps(item)]" :key="props.url">
        <NuxtImg :src="props.url" alt="" v-if="props.url"
          class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg" />
      </template>
      <div class="flex flex-col justify-between p-4 leading-normal">
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ item.title }}</h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ item.description }}</p>
      </div>
    </NuxtLink>
  </template>
</template>

<script setup>
defineProps({
  block_uid: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  }
});
</script>
