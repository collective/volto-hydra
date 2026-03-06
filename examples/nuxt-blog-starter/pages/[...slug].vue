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

                <!-- Render blocks: template expansion in computed, style grouping, then iterate per group -->
                <template v-if="data.page?.blocks_layout && shouldRenderBlocks">
                    <section v-for="styleGroup in mainStyleGroups" :key="styleGroup.key" :class="styleGroup.style">
                        <div class="flex justify-between px-4 mx-auto max-w-screen-xl">
                            <div class="mx-auto w-full format format-sm sm:format-base lg:format-lg format-blue dark:format-invert">
                                <template v-for="item in styleGroup.blocks" :key="item['@uid']">
                                    <div class="mx-auto" :class="{'max-w-4xl': item['@type'] !== 'slider'}">
                                        <Block :block_uid="item['@uid']" :block="item" :data="data.page" :api-url="apiUrl" />
                                    </div>
                                </template>
                            </div>
                        </div>
                    </section>
                </template>

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
        <div id="footer-content" class="w-full mx-auto max-w-screen-xl p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <template v-if="(data.page?.footer_blocks || footerAllowedLayouts) && shouldRenderBlocks">
                <Block v-for="item in footerExpandedItems" :key="item['@uid']"
                       :block_uid="item['@uid']" :block="item" :data="data.page" :api-url="apiUrl" />
            </template>
        </div>
    </footer>   
</template>


<script setup>

import { ref, computed, provide, inject } from 'vue';
import { initBridge, expandTemplatesSync, isEditMode } from '@hydra-js/hydra.js';
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

// Shared templateState for all expandTemplatesSync calls (page + nested containers)
const templateState = {};

const mainExpandedItems = computed(() => {
    const layout = data.value?.page?.blocks_layout?.items || [];
    const blocks = data.value?.page?.blocks || {};
    if (!layout.length) return [];
    return expandTemplatesSync(layout, {
        blocks,
        templateState,
        templates: data.value?.templates || {},
        allowedLayouts: mainBlocksAllowedLayouts.value,
    });
});

const mainStyleGroups = computed(() => groupByStyle(mainExpandedItems.value));

const footerExpandedItems = computed(() => {
    const layout = data.value?.page?.footer_blocks?.items || [];
    const blocks = data.value?.page?.blocks || {};
    // Don't early-return on empty layout — allowedLayouts forces a template
    // even when the page has no footer_blocks content yet.
    if (!layout.length && !footerAllowedLayouts.value) return [];
    return expandTemplatesSync(layout, {
        blocks,
        templateState,
        templates: data.value?.templates || {},
        allowedLayouts: footerAllowedLayouts.value,
    });
});

// Content-type-specific layout templates (enforced in edit mode via initBridge allowedLayouts).
// Document is the default case — no entry needed.
const CONTENT_TYPE_LAYOUTS = {
    'Event': ['/templates/event-view'],
    'News Item': ['/templates/newsitem-view'],
};

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
                eventMetadata: {
                    id: 'eventMetadata',
                    title: 'Event Metadata',
                    group: 'common',
                    restricted: true,  // Not in add-block picker — part of event layout template
                    blockSchema: {
                        fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
                        properties: {},
                    },
                },
                dateField: {
                    id: 'dateField',
                    title: 'Date',
                    group: 'common',
                    restricted: true,  // Not in add-block picker — added via content-type templates
                    blockSchema: {
                        fieldsets: [{ id: 'default', title: 'Default', fields: ['dateField', 'showTime'] }],
                        properties: {
                            dateField: {
                                title: 'Date field',
                                type: 'string',
                                widget: 'select',
                                choices: [
                                    ['effective', 'Publication date'],
                                    ['expires', 'Expiration date'],
                                    ['created', 'Creation date'],
                                    ['modified', 'Last modified date'],
                                    ['start', 'Event start'],
                                    ['end', 'Event end'],
                                ],
                            },
                            showTime: {
                                title: 'Show time',
                                type: 'boolean',
                            },
                        },
                    },
                },
                socialLinks: {
                    restricted: true,  // Only used in footer template
                    blockSchema: {
                        properties: {
                            links: {
                                title: 'Links',
                                widget: 'object_list',
                                schema: {
                                    properties: {
                                        url: {
                                            title: 'URL',
                                            widget: 'url',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                ...sharedBlocksConfig,
            };
            // Content-type-aware page-level blocks:
            // - Always exclude 'column' (only inside columns block)
            // - Restricted blocks are excluded unless they match the current content type
            const pageType = data.value?.page?.['@type'];
            const pageLevelBlocks = Object.keys(newBlocks).filter(k => {
                if (k === 'column') return false;
                if (newBlocks[k]?.restricted) {
                    if (k === 'eventMetadata') return pageType === 'Event';
                    if (k === 'dateField') return pageType === 'News Item';
                    return false;
                }
                return true;
            });
            const bridge = initBridge({
                debug: new URLSearchParams(window.location.search).has('_hydra_debug'),
                page: {
                    schema: {
                        properties: {
                            blocks_layout: {
                                title: 'Blocks',
                                allowedBlocks: [...new Set(['slate', 'image', 'video', 'gridBlock', 'teaser', 'listing', ...pageLevelBlocks])],
                                allowedTemplates: ['/_test_data/templates/test-layout'],
                                allowedLayouts: CONTENT_TYPE_LAYOUTS[pageType] || [null, '/_test_data/templates/test-layout', '/_test_data/templates/header-footer-layout', '/_test_data/templates/header-only-layout', '/_test_data/templates/editable-fixed-layout'],
                            },
                            footer_blocks: {
                                title: 'Footer',
                                allowedBlocks: ['slate', 'image', 'socialLinks'],
                                allowedLayouts: route.path === '/_test_data/another-page'
                                    ? ['/_test_data/templates/footer-layout']
                                    : ['/templates/site-footer'],
                            },
                        },
                    },
                },
                blocks: newBlocks,
                pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
                // Pass onEditChange before init() sends INIT to avoid race condition
                onEditChange: (page) => {
                    if (page) {
                        // Mark that we have admin data with nodeIds
                        hasAdminData.value = true;
                        // Update page data - ListingBlock components will
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
    const normalizedPath = route.path.replace(/\/$/, '');
    // Test page uses its own test footer layout
    if (normalizedPath === '/_test_data/another-page') {
        return ['/_test_data/templates/footer-layout'];
    }
    // All other pages get the site footer
    return ['/templates/site-footer'];
});

// Main blocks allowedLayouts for expandTemplatesSync (view mode / SSR)
// Content-type pages use null — their blocks_layout already contains the right blocks.
// The CONTENT_TYPE_LAYOUTS templates are enforced in edit mode via initBridge only.
const mainBlocksAllowedLayouts = computed(() => {
    const pageType = data.value?.page?.['@type'];
    if (CONTENT_TYPE_LAYOUTS[pageType]) {
        return null;  // Use page's own blocks_layout directly
    }
    return [null, '/_test_data/templates/test-layout', '/_test_data/templates/header-footer-layout', '/_test_data/templates/header-only-layout', '/_test_data/templates/editable-fixed-layout'];
});

// Templates to eagerly pre-load (forced layouts that won't appear in page data)
const preloadTemplates = [
    ...(footerAllowedLayouts.value || []).filter(Boolean),
    // Content-type forced layouts (not referenced in page data but applied by expandTemplatesSync)
    ...Object.values(CONTENT_TYPE_LAYOUTS).flat(),
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
provide('templateState', templateState);  // Shared across all expandTemplatesSync calls
provide('apiUrl', apiUrl);
provide('contextPath', contextPath);
// Reactive pages: re-parses @pg_ segments when route changes (SPA paging navigation)
provide('pages', computed(() => {
    const result = {};
    for (const part of route.params.slug || []) {
        if (part.startsWith("@pg_")) {
            const [_, bid, page] = part.split("_");
            result[bid] = Number(page);
        }
    }
    return result;
}));

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