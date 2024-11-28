<template>
    <Head>
        <Title>{{ data.page?.title }}</Title>
        <Meta name="description" :content="data.page?.description" />
    </Head>
        <Header :data="data"></Header>
        <main class="pt-8 pb-16 lg:pt-16 lg:pb-24 bg-white dark:bg-gray-900 antialiased">
        <!-- <div class="flex justify-between px-4 mx-auto max-w-screen-xl "> -->
            <!-- <article class="mx-auto w-full max-w-2xl format format-sm sm:format-base lg:format-lg format-blue dark:format-invert"> -->
        <!-- <h1 class="text-center" data-editable-metadata="title">{{data?.title}}</h1> -->
        <!-- <NuxtLink to="/blog/">Read the blog!</NuxtLink> -->

                <h1 v-if="route.path === '/'" class="sr-only">{{ data.page?.title }}</h1>
                <section v-if="data.page?.blocks_layout" v-for="section in getSections(data.page)" :class="section.style">
                    <div class="flex justify-between px-4 mx-auto max-w-screen-xl ">
                        <div class="mx-auto w-full format format-sm sm:format-base lg:format-lg format-blue dark:format-invert">
                            <div class="mx-auto" :class="{'max-w-4xl':block.block['@type'] != 'slider'}" v-for="block in section.blocks">
                                <Block  :block_uid="block.id" :block="block.block" :data="data.page"></Block>
                            </div>
                        </div>
                    </div>
                </section>

                <div v-else-if="data?.page">
                    <h1>{{ data.page?.title }}</h1>
                    <p v-if="data.page?.description"> {{ data.page.description }}</p>
                    <NuxtLink v-if="data.page['@type'] == 'Link'" :to="data.page.remoteUrl">{{ data.page.remoteUrl }}</NuxtLink>
                    <NuxtImg v-else-if="data.page['@type'] == 'Image'" :src="imageProps(data.page).url"/>
                    <pre v-else> {{ data.page }} </pre>
                </div>
                <div v-else>
                    Error: No page loaded
                </div>
    

    <!-- </article> -->
    <!-- </div> -->
    </main>
    <footer class="bg-white rounded-lg shadow m-4 dark:bg-gray-800">
        <div class="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
        <span class="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2023 <a href="https://flowbite.com/" class="hover:underline">Flowbite™</a>. All Rights Reserved.
        </span>
        <ul class="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
            <li>
                <a href="https://github.com/collective/volto-hydra" class="hover:underline me-4 md:me-6">About</a>
            </li>
            <li>
                <a href="https://github.com/collective/volto-hydra" class="hover:underline">Contact</a>
            </li>
        </ul>
        </div>
    </footer>   
</template>


<script setup>

import { initBridge } from '../packages/hydra.js';

// initialize components based on data attribute selectors
onMounted(() => {
    useFlowbite(() => {
        initFlowbite();
    })

    if (import.meta.client) {
        const url = new URL(window.location.href);
        const isEdit = url.searchParams.get("_edit");

        if (isEdit) {

            const bridge = initBridge("https://hydra.pretagov.com", {allowedBlocks: ['slate', 'image', 'video', 'gridBlock', 'teaser']});
            bridge.onEditChange((page) => {
                if (page) {
                    data.value.page = page;
                }
                });
        }
    }
});

// to get access to the "slug" dynamic param
const route = useRoute()
var path = [];
var pages = {};
console.log(route.params.slug);
for (var part of route.params.slug) {
    if (part.startsWith("@pg_")) {
        const [_,bid,page] = part.split("_");
        pages[bid] = Number(page);
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



useSeoMeta({
  ogTitle: data.page?.title,
  description: data.page?.description,
  ogDescription: data.page?.description,
  ogImage: 'https://example.com/image.png',
  twitterCard: 'summary_large_image',
})

function getSections(page) {
    if (!page?.blocks_layout) {
        return []
    }
    var section = {blocks:[], style:null};
    var sections = [section];
    // find all with the same styles and group them
    for (let i in page.blocks_layout.items) {
        var block_id = page.blocks_layout.items[i];
        var block = page.blocks[block_id];
        var style = block?.styles?.backgroundColor == 'grey'? {'bg-slate-300':true} : {};
        if (section.style != null && JSON.stringify(section.style) !== JSON.stringify(style)) {
            section = {blocks:[], style:null};
            sections.push(section);
        }
        section.style = style;
        section.blocks.push({id:block_id, block:block});
    }
    return sections;
}


// if (error) {
//     showError(error)
//     data = {title:"Error"}
// }



// if the slug does not correspond to any articles,
// return a 404 page with the "Page Not Found" message
// if (!data.value?.article) {
//   throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
// }
</script>