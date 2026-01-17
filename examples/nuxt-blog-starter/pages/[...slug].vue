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

                <!-- Render blocks - listing-type blocks use AsyncListingBlock which handles its own Suspense -->
                <template v-if="data.page?.blocks_layout">
                    <section v-for="section in getSections(data.page)" :class="section.style">
                        <div class="flex justify-between px-4 mx-auto max-w-screen-xl ">
                            <div class="mx-auto w-full format format-sm sm:format-base lg:format-lg format-blue dark:format-invert">
                                <template v-for="block in section.blocks" :key="block.id">
                                    <!-- Listing-type blocks: use AsyncListingBlock (handles its own Suspense internally) -->
                                    <div v-if="isListingType(block.block['@type'])" class="mx-auto" :class="{'max-w-4xl': block.block['@type'] !== 'slider'}">
                                        <AsyncListingBlock :block_uid="block.id" :block="block.block" :data="data.page" :api-url="apiUrl" />
                                    </div>
                                    <!-- Static blocks: render immediately -->
                                    <!-- Pass apiUrl for search blocks that contain async listing children -->
                                    <div v-else class="mx-auto" :class="{'max-w-4xl': block.block['@type'] !== 'slider'}">
                                        <Block :block_uid="block.id" :block="block.block" :data="data.page" :api-url="apiUrl"></Block>
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

import { initBridge } from '@hydra-js/hydra.js';
import { useRuntimeConfig } from "#imports"

const runtimeConfig = useRuntimeConfig();
const adminUrl = runtimeConfig.public.adminUrl;
const apiUrl = runtimeConfig.public.backendBaseUrl || runtimeConfig.public.apiUrl || '';

// Block types that require async expansion (contain listings or queries)
// Each gets its own Suspense at page level; inside containers they share paging
// Note: 'search' blocks render via Block.vue which has the proper search UI (headline, facets)
// The listing child inside search will be rendered by Block recursively
const LISTING_BLOCK_TYPES = ['listing', 'gridBlock'];

/**
 * Check if a block type requires async expansion.
 * @param {string} blockType - The @type of the block
 * @returns {boolean}
 */
function isListingType(blockType) {
  return LISTING_BLOCK_TYPES.includes(blockType);
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
                // variation field is added by schemaEnhancer, don't put it in fieldsets
                // NO DEFAULT - children are independent until a type is selected
                gridBlock: {
                    blockSchema: {
                        properties: {
                            variation: {
                                title: 'Item Type',
                                widget: 'block_type',
                                allowedTypes: ['teaser', 'image'],
                            },
                        },
                    },
                    schemaEnhancer: {
                        type: 'inheritSchemaFrom',
                        config: { typeField: 'variation', defaultsField: 'itemDefaults' },
                    },
                },
                // Teaser block: use Volto's TeaserSchema (has href with object_browser)
                // Only send schemaEnhancer for hideParentOwnedFields when inside a grid
                teaser: {
                    schemaEnhancer: {
                        type: 'hideParentOwnedFields',
                        config: {
                            defaultsField: 'itemDefaults',
                            editableFields: ['href', 'title', 'description', 'preview_image', 'overwrite'],
                        },
                    },
                },
                // Image block: configure which fields are editable on child vs parent
                image: {
                    schemaEnhancer: {
                        type: 'hideParentOwnedFields',
                        config: {
                            defaultsField: 'itemDefaults',
                            editableFields: ['url', 'alt', 'href'],
                        },
                    },
                },
            };
            // Page-level blocks (column is only allowed inside columns, not at page level)
            const pageLevelBlocks = Object.keys(newBlocks).filter(k => k !== 'column');
            const bridge = initBridge(adminUrl, {
                allowedBlocks: ["slate", "image", "video", "gridBlock", "teaser", ...pageLevelBlocks],
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
                    // Update page data - AsyncListingBlock components will
                    // re-render and expand listings via their own Suspense
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

// Note: Listing expansion is now handled by AsyncListingBlock component
// which uses Suspense for streaming SSR

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
    for (let i in page.blocks_layout?.items) {
        var block_id = page.blocks_layout?.items[i];
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