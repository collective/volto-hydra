<template>
    <Header :data="data"></Header>
    <section>
        <!-- <h1 class="text-center" data-editable-metadata="title">{{data?.title}}</h1> -->
        <!-- <NuxtLink to="/blog/">Read the blog!</NuxtLink> -->

    
      <Block v-if="data?.page.blocks_layout" v-for="block_uid in data.page.blocks_layout.items"  :block_uid="block_uid" :block="data.page.blocks[block_uid]" :data="data.page"></Block>

      <div v-else>
        <h1>{{ data?.page.title }}</h1>
      </div>
      <pre>{{ data.page.blocks_layout }}</pre>

    </section>
    <footer class="bg-white rounded-lg shadow m-4 dark:bg-gray-800">
        <div class="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
        <span class="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2023 <a href="https://flowbite.com/" class="hover:underline">Flowbite™</a>. All Rights Reserved.
        </span>
        <ul class="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
            <li>
                <a href="#" class="hover:underline me-4 md:me-6">About</a>
            </li>
            <li>
                <a href="#" class="hover:underline me-4 md:me-6">Privacy Policy</a>
            </li>
            <li>
                <a href="#" class="hover:underline me-4 md:me-6">Licensing</a>
            </li>
            <li>
                <a href="#" class="hover:underline">Contact</a>
            </li>
        </ul>
        </div>
    </footer>
</template>


<script setup>
import { initBridge } from './hydra.js';

// initialize components based on data attribute selectors
onMounted(() => {
    useFlowbite(() => {
        initFlowbite();
    })

});

// to get access to the "slug" dynamic param
const route = useRoute()
var path = [];
var pages = {};
console.log(route.params.slug);
for (var part of route.params.slug) {
    if (part.startsWith("@pg_")) {
        const [_,bid,page] = part.split("_");
        pages[bid] = page;
    } else {
        path.push(part);
    }
}

// retrieve the data associated with an article
// based on its slug
const { data, error } = await ploneApi({
  path: path,
  pages: pages
});

const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video', 'gridBlock', 'teaser']});
bridge.onEditChange((page) => {
      if (page) {
        data.value.page = page;
      }
    });

// https://stackoverflow.com/questions/72419491/nested-usefetch-in-nuxt-3
// Need to get all the listings here.

// if (error) {
//     showError(error)
//     data = {title:"Error"}
// }

//const nav = data["@components"].navigation.items;


// if the slug does not correspond to any articles,
// return a 404 page with the "Page Not Found" message
// if (!data.value?.article) {
//   throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
// }
</script>