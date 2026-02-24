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

                <!-- Render blocks with template expansion (sync - templates pre-loaded) -->
                <!-- In edit mode, wait for admin data (with nodeIds) before rendering -->
                <BlocksRenderer
                    v-if="data.page?.blocks_layout && shouldRenderBlocks"
                    :key="JSON.stringify(data.page?.blocks_layout?.items || [])"
                    :blocks="data.page?.blocks || {}"
                    :layout="data.page?.blocks_layout?.items || []"
                    :templates="data.templates || {}"
                    :allowed-layouts="mainBlocksAllowedLayouts"
                    v-slot="{ items }"
                >
                    <section v-for="styleGroup in groupByStyle(items)" :key="styleGroup.key" :class="styleGroup.style">
                        <div class="flex justify-between px-4 mx-auto max-w-screen-xl">
                            <div class="mx-auto w-full format format-sm sm:format-base lg:format-lg format-blue dark:format-invert">
                                <template v-for="block in styleGroup.blocks" :key="block['@uid']">
                                    <!-- Listing blocks: expand async with paging -->
                                    <div v-if="block['@type'] === 'listing'" class="mx-auto max-w-4xl">
                                        <BlockExpander :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                                    </div>
                                    <!-- Static blocks: render immediately -->
                                    <div v-else class="mx-auto" :class="{'max-w-4xl': block['@type'] !== 'slider'}">
                                        <Block :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                                    </div>
                                </template>
                            </div>
                        </div>
                    </section>
                </BlocksRenderer>

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
        <!-- Dynamic footer_blocks content (sync - templates pre-loaded) -->
        <div id="footer-content" class="w-full mx-auto max-w-screen-xl p-4">
            <BlocksRenderer
                v-if="(data.page?.footer_blocks || footerAllowedLayouts) && shouldRenderBlocks"
                :key="JSON.stringify(data.page?.footer_blocks?.items || [])"
                :blocks="data.page?.blocks || {}"
                :layout="data.page?.footer_blocks?.items || []"
                :templates="data.templates || {}"
                :allowed-layouts="footerAllowedLayouts"
                v-slot="{ items }"
            >
                <template v-for="block in items" :key="block['@uid']">
                    <!-- Listing blocks: expand async with paging -->
                    <BlockExpander v-if="block['@type'] === 'listing'"
                           :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                    <!-- Static blocks: render immediately -->
                    <Block v-else
                           :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                </template>
            </BlocksRenderer>
        </div>
        <!-- Static footer content -->
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

import { ref, computed, provide } from 'vue';
import { initBridge } from '@hydra-js/hydra.js';
import { sharedBlocksConfig } from '@test-fixtures/shared-block-schemas.js';
import { useRuntimeConfig } from "#imports"

const runtimeConfig = useRuntimeConfig();
const apiUrl = runtimeConfig.public.backendBaseUrl || runtimeConfig.public.apiUrl || '';
const route = useRoute();

// Context path for paging URLs
const contextPath = computed(() => {
    const pageId = data.value?.page?.['@id'] || '/';
    if (pageId.startsWith('http')) {
        return new URL(pageId).pathname;
    }
    return pageId;
});

// Track if we've received admin data (with nodeIds) - needed for inline editing sync
const hasAdminData = ref(false);

// Detect edit mode - check URL param (works in SSR) and window.name (client only)
const isInEditMode = computed(() => {
    if (route.query._edit === 'true') return true;
    if (typeof window !== 'undefined') {
        return window.name.startsWith('hydra-edit:');
    }
    return false;
});

// Render blocks immediately - no need to wait for admin data since hydra.js
// also initializes in onMounted, so no interaction is possible before then.
// Admin data (with nodeIds) will trigger a re-render when it arrives.
const shouldRenderBlocks = computed(() => {
    return true;
});

/**
 * Group blocks by their background style (for visual sectioning).
 * Takes an array of expanded blocks and returns groups that share the same style.
 */
function groupByStyle(items) {
    if (!items?.length) {
        return [];
    }
    let groupIndex = 0;
    let currentGroup = { blocks: [], style: null, key: `style-${groupIndex}` };
    const groups = [currentGroup];

    for (const item of items) {
        const style = item?.styles?.backgroundColor === 'grey' ? { 'bg-slate-300': true } : {};
        const styleKey = JSON.stringify(style);

        if (currentGroup.style !== null && JSON.stringify(currentGroup.style) !== styleKey) {
            groupIndex++;
            currentGroup = { blocks: [], style: null, key: `style-${groupIndex}` };
            groups.push(currentGroup);
        }
        currentGroup.style = style;
        currentGroup.blocks.push(item);
    }
    return groups;
}

// Initialize Flowbite components based on data attribute selectors.
// Safe to call initFlowbite() (which includes initCarousels) because block.vue
// removes data-carousel after init, so initCarousels() finds no elements here.
onMounted(() => {
    useFlowbite((flowbite) => {
        flowbite.initFlowbite();
    })

    if (import.meta.client) {
        // Check window.name to detect if we're in the Hydra admin iframe
        // Format: hydra-edit:<origin> or hydra-view:<origin>
        const isHydraIframe = window.name.startsWith('hydra-edit:') || window.name.startsWith('hydra-view:');
        console.log('[NUXT] window.name:', window.name, 'isHydraIframe:', isHydraIframe);

        if (isHydraIframe) {
            const newBlocks = {
                hello_from_the_other_side: {
                    id: 'hello_from_the_other_side',
                    title: 'Hello from the other side',
                    group: 'common',
                    icon: 'test', // Invalid icon string - fallback to block.svg
                    blockSchema: {
                        required: ['title'],
                        fieldsets: [
                            {
                                id: 'default',
                                title: 'Default',
                                fields: ['title'],
                                required: ['title'],
                            },
                        ],
                        properties: {
                            title: {
                                title: "My field title",
                            },
                        },
                    },
                },
                ...sharedBlocksConfig,
            };
            // Page-level blocks (column is only allowed inside columns, not at page level)
            const pageLevelBlocks = Object.keys(newBlocks).filter(k => k !== 'column');
            const bridge = initBridge({
                debug: new URLSearchParams(window.location.search).has('_hydra_debug'),
                pageBlocksFields: [
                    {
                        fieldName: 'blocks_layout',
                        title: 'Blocks',
                        allowedBlocks: [...new Set(['slate', 'image', 'video', 'gridBlock', 'teaser', 'listing', ...pageLevelBlocks])],
                        allowedTemplates: ['/_test_data/templates/test-layout'],
                        allowedLayouts: [null, '/_test_data/templates/test-layout', '/_test_data/templates/header-footer-layout', '/_test_data/templates/header-only-layout', '/_test_data/templates/editable-fixed-layout'],
                    },
                    {
                        fieldName: 'footer_blocks',
                        title: 'Footer',
                        allowedBlocks: ['slate', 'image'],
                        // Force footer layout on /another-page (same as mock frontend)
                        allowedLayouts: route.path === '/_test_data/another-page' ? ['/_test_data/templates/footer-layout'] : null,
                    },
                ],
                voltoConfig: {
                    blocks: {
                        blocksConfig: newBlocks,
                    }
                },
                // Transform frontend path to API path by stripping paging segments
                // e.g., /test-page/@pg_block-8-grid_1 -> /test-page
                pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
                // Pass onEditChange before init() sends INIT to avoid race condition
                onEditChange: (page) => {
                    if (page) {
                        // Mark that we have admin data with nodeIds
                        hasAdminData.value = true;
                        // Update page data - BlockExpander components will
                        // re-render and expand listings via their own Suspense
                        data.value.page = page;
                    }
                },
            });
        }
    }
});

// Determine footer allowedLayouts based on path (same as mock frontend)
const footerAllowedLayouts = computed(() => {
    // Use startsWith to handle trailing slashes and normalize
    const normalizedPath = route.path.replace(/\/$/, '');
    return normalizedPath === '/_test_data/another-page' ? ['/_test_data/templates/footer-layout'] : null;
});

// Main blocks allowedLayouts (same as bridge config)
const mainBlocksAllowedLayouts = computed(() => {
    return [null, '/_test_data/templates/test-layout', '/_test_data/templates/header-footer-layout', '/_test_data/templates/header-only-layout', '/_test_data/templates/editable-fixed-layout'];
});

// Templates to eagerly pre-load (forced layouts that won't appear in page data)
const preloadTemplates = [
    ...(footerAllowedLayouts.value || []).filter(Boolean),
];

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
// based on its slug (pre-loads templates for sync expansion)
const { data, error } = await ploneApi({
  path: path,
  pages: pages,
  preloadTemplates,
});

// Provide templates, apiUrl, contextPath, templateState for nested components (grids, etc.)
provide('templates', computed(() => data.value?.templates || {}));
provide('templateState', {});  // Shared across all expandTemplatesSync calls
provide('apiUrl', apiUrl);
provide('contextPath', contextPath);

useSeoMeta({
  ogTitle: data.page?.title,
  description: data.page?.description,
  ogDescription: data.page?.description,
  ogImage: 'https://example.com/image.png',
  twitterCard: 'summary_large_image',
})



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