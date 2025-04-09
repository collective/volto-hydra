<template>

    <p v-if="!items.length">Empty Listing</p>
    <template v-for="item in items">
      <NuxtLink :to="getUrl(item)"
        class="flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow md:flex-row md:max-w-xl hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
        <template v-for="props in [imageProps(item)]">

          <NuxtImg :src="props.url" alt="" v-if="props.url"
            class="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg"></NuxtImg>
        </template>

        <div class="flex flex-col justify-between p-4 leading-normal">
          <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ item.title }}</h5>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ item.description }}.</p>
        </div>
      </NuxtLink>
    </template>

    <nav aria-label="Listing Navigation" v-if="batching?.last">
      <ul class="inline-flex -space-x-px text-sm">
        <li>
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_0`"
            class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            Previous</NuxtLink>
        </li>
        <li v-for="page in batching.pages">
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${page.start}`"
            class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            {{ page.page }}</NuxtLink>
        </li>
        <li>
          <NuxtLink :to="`${getUrl(data)}/@pg_${block_uid}_${batching.last}`"
            class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
            Next</NuxtLink>
        </li>
      </ul>
    </nav>

</template>
<script setup>

const { block_uid, query, data } = defineProps({
  block_uid: {
    type: String,
    required: true
  },
  query: {
    type: Object,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
});

const items = ref([]);
const batching = ref({});
const items_total = ref(0);
const pages = data._listing_pages;
const cur_page = (block_uid in pages) ? pages[block_uid] : 0;
var b_size = 0;

if ("b_size" in query) {
    b_size = Number(query.b_size);
}

if (query?.query) {
  // https://stackoverflow.com/questions/72419491/nested-usefetch-in-nuxt-3

  if (!query.query.Length) {
      query.query = [
        {
            "i": "path",
            "o": "plone.app.querystring.operation.string.absolutePath",
            "v": "/"
        }
      ];
  }

  ploneApi({
    path: `${data['@id']}/++api++/@querystring-search`,
    query: { ...query, ...{ b_size: b_size, b_start: cur_page * b_size, metadata_fields: "_all" } },
    _default: { batching: {}, items: [], items_total: 0 }
  }).then(({ data }) => {
    //const data = qdata;
    items.value = data.value.items;
    items_total.value = Number(data.value.items_total);
  });
}
else if (data?.items) {
  items.value = data.items;
  items_total.value = data.items.length;
} else {
  items.value = []
  items_total.value = 0;
}

b_size = b_size ? b_size : items_total.value;
//batching.value = data.value.batching;
const max_page = Math.ceil(items_total.value / b_size);
var batches = max_page ? [...Array(max_page).keys()].map(i => {
  return { start: (i), page: i + 1 }
}) : [];
batching.value.pages = batches.slice(Math.max(cur_page - 2, 0), Math.min(cur_page + 3, max_page - 1))
batching.value.last = items_total.value ? batches[batches.length - 1].start : 0;
batching.value.next = batches[Math.min(cur_page + 1, max_page - 1)]?.start;
batching.value.prev = batches[Math.max(cur_page - 1, 0)]?.start;
console.log(batching.value);



</script>