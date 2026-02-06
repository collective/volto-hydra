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
                                    <!-- Static blocks: render immediately -->
                                    <div v-if="block['@type'] !== 'listing'" class="mx-auto" :class="{'max-w-4xl': block['@type'] !== 'slider'}">
                                        <Block :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                                    </div>
                                    <!-- Listing blocks: expand async with own paging -->
                                    <div v-else class="mx-auto max-w-4xl">
                                        <Suspense>
                                            <ListingExpander
                                                :block="block"
                                                :block-uid="block['@uid']"
                                                :api-url="apiUrl"
                                                :context-path="contextPath"
                                                v-slot="{ items: expandedItems, paging: listingPaging, buildPagingUrl }"
                                            >
                                                <Block v-for="item in expandedItems" :key="item['@uid']"
                                                       :block_uid="item['@uid']" :block="item" :data="data.page" :api-url="apiUrl" />
                                                <Paging :paging="listingPaging" :build-url="buildPagingUrl" />
                                            </ListingExpander>
                                        </Suspense>
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
                :key="JSON.stringify(data.page?.footer_blocks_layout?.items || [])"
                :blocks="data.page?.footer_blocks || {}"
                :layout="data.page?.footer_blocks_layout?.items || []"
                :templates="data.templates || {}"
                :allowed-layouts="footerAllowedLayouts"
                v-slot="{ items }"
            >
                <template v-for="block in items" :key="block['@uid']">
                    <!-- Static blocks: render immediately -->
                    <Block v-if="block['@type'] !== 'listing'"
                           :block_uid="block['@uid']" :block="block" :data="data.page" :api-url="apiUrl" />
                    <!-- Listing blocks: expand async -->
                    <Suspense v-else>
                        <ListingExpander
                            :block="block"
                            :block-uid="block['@uid']"
                            :api-url="apiUrl"
                            :context-path="contextPath"
                            v-slot="{ items: expandedItems, paging, buildPagingUrl }"
                        >
                            <Block v-for="item in expandedItems" :key="item['@uid']"
                                   :block_uid="item['@uid']" :block="item" :data="data.page" :api-url="apiUrl" />
                            <Paging :paging="paging" :build-url="buildPagingUrl" />
                        </ListingExpander>
                    </Suspense>
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

// Whether we should render blocks - in edit mode, wait for admin data
const shouldRenderBlocks = computed(() => {
    if (!isInEditMode.value) return true;  // View mode: render from API
    return hasAdminData.value;  // Edit mode: wait for admin data with nodeIds
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

// initialize components based on data attribute selectors
onMounted(() => {
    useFlowbite(() => {
        initFlowbite();
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
                // Hero block: simple landing page hero section
                hero: {
                    id: 'hero',
                    title: 'Hero',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
                    group: 'common',
                    mostUsed: true,
                    blockSchema: {
                        fieldsets: [
                            {
                                id: 'default',
                                title: 'Default',
                                fields: ['heading', 'subheading', 'buttonText', 'buttonLink', 'image', 'description'],
                            },
                        ],
                        properties: {
                            heading: {
                                title: 'Heading',
                                type: 'string',
                            },
                            subheading: {
                                title: 'Subheading',
                                type: 'string',
                                widget: 'textarea',
                            },
                            buttonText: {
                                title: 'Button Text',
                                type: 'string',
                            },
                            buttonLink: {
                                title: 'Button Link',
                                widget: 'object_browser',
                                mode: 'link',
                                allowExternals: true,
                            },
                            image: {
                                title: 'Image',
                                widget: 'image',
                            },
                            description: {
                                title: 'Description',
                                type: 'array',
                                widget: 'slate',
                            },
                        },
                        required: [],
                    },
                    // fieldMappings for transitive conversion: image → teaser → hero
                    fieldMappings: {
                        default: {
                            'title': 'heading',
                            'description': 'subheading',
                            '@id': 'buttonLink',
                            'image': 'image',
                        },
                        teaser: {
                            'title': 'heading',
                            'description': 'subheading',
                            'href': 'buttonLink',
                            'preview_image': 'image',
                        },
                    },
                },
                // Container block: columns contains column children AND top_images
                columns: {
                    id: 'columns',
                    title: 'Columns',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>',
                    group: 'common',
                    blockSchema: {
                        fieldsets: [
                            {
                                id: 'default',
                                title: 'Default',
                                fields: ['title', 'top_images', 'columns'],
                            },
                        ],
                        properties: {
                            title: {
                                title: 'Title',
                                type: 'string',
                            },
                            top_images: {
                                title: 'Top Images',
                                type: 'blocks',
                                allowedBlocks: ['image'],
                                defaultBlock: 'image',
                            },
                            columns: {
                                title: 'Columns',
                                type: 'blocks',
                                allowedBlocks: ['column'],
                                maxLength: 4,
                            },
                        },
                        required: [],
                    },
                },
                // Nested container: column contains content blocks
                column: {
                    id: 'column',
                    title: 'Column',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="1"/></svg>',
                    group: 'common',
                    blockSchema: {
                        fieldsets: [
                            {
                                id: 'default',
                                title: 'Default',
                                fields: ['title', 'blocks'],
                            },
                        ],
                        properties: {
                            title: {
                                title: 'Title',
                                type: 'string',
                            },
                            blocks: {
                                title: 'Content',
                                type: 'blocks',
                                allowedBlocks: ['slate', 'image'],
                                defaultBlock: 'slate',
                            },
                        },
                        required: [],
                    },
                },
                // Slider container: uses object_list widget (volto-slider-block format)
                slider: {
                    id: 'slider',
                    title: 'Slider',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>',
                    group: 'common',
                    blockSchema: {
                        fieldsets: [
                            {
                                id: 'default',
                                title: 'Default',
                                fields: ['slides', 'autoplayEnabled', 'autoplayDelay', 'autoplayJump'],
                            },
                        ],
                        properties: {
                            slides: {
                                title: 'Slides',
                                widget: 'object_list',
                                schema: {
                                    title: 'Slide',
                                    fieldsets: [{ id: 'default', title: 'Default', fields: ['head_title', 'title', 'description', 'preview_image', 'buttonText', 'hideButton'] }],
                                    properties: {
                                        head_title: { title: 'Kicker', type: 'string' },
                                        title: { title: 'Title', type: 'string' },
                                        description: { title: 'Description', type: 'string', widget: 'textarea' },
                                        preview_image: { title: 'Image Override', widget: 'object_browser', mode: 'image', allowExternals: true },
                                        buttonText: { title: 'Button Text', type: 'string' },
                                        hideButton: { title: 'Hide Button', type: 'boolean' },
                                    },
                                },
                            },
                            autoplayEnabled: {
                                title: 'Autoplay Enabled',
                                type: 'boolean',
                                default: false,
                            },
                            autoplayDelay: {
                                title: 'Autoplay Delay',
                                type: 'integer',
                                default: 4000,
                            },
                            autoplayJump: {
                                title: 'Autoplay Jump',
                                type: 'boolean',
                                default: false,
                            },
                        },
                        required: [],
                    },
                },
                // Grid block: add schema inheritance recipe
                // variation field is created by inheritSchemaFrom with computed choices
                // NO DEFAULT - children are independent until a type is selected
                gridBlock: {
                    schemaEnhancer: {
                        inheritSchemaFrom: {
                            typeField: 'variation',
                            defaultsField: 'itemDefaults',
                            allowedBlocks: ['teaser', 'image'],
                            title: 'Item Type',
                        },
                    },
                },
                // Teaser block: use Volto's TeaserSchema (has href with object_browser)
                // childBlockConfig hides fields that parent controls when inside a grid
                teaser: {
                    schemaEnhancer: {
                        childBlockConfig: {
                            defaultsField: 'itemDefaults',
                            editableFields: ['href', 'title', 'description', 'preview_image', 'overwrite'],
                        },
                    },
                },
                // Image block: configure which fields are editable on child vs parent
                image: {
                    schemaEnhancer: {
                        childBlockConfig: {
                            defaultsField: 'itemDefaults',
                            editableFields: ['url', 'alt', 'href'],
                        },
                    },
                },
                // Skiplogic test block: demonstrates conditional field visibility
                skiplogicTest: {
                    id: 'skiplogicTest',
                    title: 'Skiplogic Test',
                    group: 'common',
                    blockSchema: {
                        properties: {
                            mode: {
                                title: 'Mode',
                                widget: 'select',
                                choices: [['simple', 'Simple'], ['advanced', 'Advanced']],
                            },
                            columns: {
                                title: 'Columns',
                                type: 'integer',
                                default: 1,
                            },
                            basicTitle: {
                                title: 'Basic Title',
                                type: 'string',
                            },
                            advancedOptions: {
                                title: 'Advanced Options',
                                type: 'string',
                            },
                            simpleWarning: {
                                title: 'Simple Warning',
                                type: 'string',
                            },
                            columnLayout: {
                                title: 'Column Layout',
                                widget: 'select',
                                choices: [['equal', 'Equal'], ['weighted', 'Weighted']],
                            },
                            pageNotice: {
                                title: 'Page Notice',
                                type: 'string',
                                description: 'Only visible when page has a description',
                            },
                        },
                    },
                    schemaEnhancer: {
                        skiplogic: {
                            advancedOptions: { field: 'mode', is: 'advanced' },
                            simpleWarning: { field: 'mode', isNot: 'advanced' },
                            columnLayout: { field: 'columns', gte: 2 },
                            pageNotice: { field: '../description', isSet: true },
                        },
                    },
                },
            };
            // Page-level blocks (column is only allowed inside columns, not at page level)
            const pageLevelBlocks = Object.keys(newBlocks).filter(k => k !== 'column');
            const bridge = initBridge({
                pageBlocksFields: [
                    {
                        fieldName: 'blocks',
                        title: 'Blocks',
                        allowedBlocks: [...new Set(['slate', 'image', 'video', 'gridBlock', 'teaser', 'listing', ...pageLevelBlocks])],
                        allowedTemplates: ['/templates/test-layout'],
                        allowedLayouts: [null, '/templates/test-layout', '/templates/header-footer-layout', '/templates/header-only-layout', '/templates/editable-fixed-layout'],
                    },
                    {
                        fieldName: 'footer_blocks',
                        title: 'Footer',
                        allowedBlocks: ['slate', 'image'],
                        // Force footer layout on /another-page (same as mock frontend)
                        allowedLayouts: route.path === '/another-page' ? ['/templates/footer-layout'] : null,
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
            });
            bridge.onEditChange((page) => {
                if (page) {
                    // Mark that we have admin data with nodeIds
                    hasAdminData.value = true;
                    // Update page data - AsyncListingBlock components will
                    // re-render and expand listings via their own Suspense
                    data.value.page = page;
                }
            });
        }
    }
});

// Determine footer allowedLayouts based on path (same as mock frontend)
const footerAllowedLayouts = computed(() => {
    // Use startsWith to handle trailing slashes and normalize
    const normalizedPath = route.path.replace(/\/$/, '');
    return normalizedPath === '/another-page' ? ['/templates/footer-layout'] : null;
});

// Main blocks allowedLayouts (same as bridge config)
const mainBlocksAllowedLayouts = computed(() => {
    return [null, '/templates/test-layout', '/templates/header-footer-layout', '/templates/header-only-layout', '/templates/editable-fixed-layout'];
});

// Collect all allowedLayouts for template pre-loading
const allAllowedLayouts = [
    ...(mainBlocksAllowedLayouts.value || []).filter(Boolean),
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
  allowedLayouts: allAllowedLayouts,
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