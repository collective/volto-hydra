<template>
    <header>
<nav class="bg-white border-b border-gray-200 dark:bg-gray-900 relative">
    <div class="flex flex-wrap items-center justify-between max-w-screen-xl mx-auto p-4">
        <NuxtLink to="/" class="flex items-center space-x-3 rtl:space-x-reverse">
            <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Hydra Nuxt Example</span>
        </NuxtLink>
        <div class="flex items-center md:order-2 space-x-1 md:space-x-2 rtl:space-x-reverse">
            <NuxtLink :to="`${adminUrl}/login`" class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2 md:px-5 md:py-2.5 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800">Login</NuxtLink>
            <NuxtLink :to="`${adminUrl}/register`" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 md:px-5 md:py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Sign up</NuxtLink>
            <button @click="mobileMenuOpen = !mobileMenuOpen" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600">
                <span class="sr-only">Open main menu</span>
                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
                </svg>
            </button>
        </div>
        <div :class="{ hidden: !mobileMenuOpen }" class="items-center justify-between w-full md:flex md:w-auto md:order-1">
            <ul class="flex flex-col mt-4 font-medium md:flex-row md:mt-0 md:space-x-8 rtl:space-x-reverse">
                <li v-for="item in nav(data)" :key="getId(item)">
                    <button
                        type="button"
                        class="block py-2 px-3 font-medium border-b border-gray-100 md:border-0 md:p-0 dark:border-gray-700 cursor-pointer"
                        :class="openPanel === getId(item)
                            ? 'text-blue-600 dark:text-blue-500'
                            : 'text-gray-900 hover:text-blue-600 dark:text-white md:dark:hover:text-blue-500'"
                        @click="togglePanel(item)"
                    >{{ item.title }}</button>
                </li>
            </ul>
        </div>
    </div>

    <!-- Full-width mega menu panel -->
    <div v-if="openPanel && openPanelItem" class="absolute left-0 right-0 z-50 bg-gray-100 border-t border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div class="max-w-screen-xl mx-auto px-4 py-6">
            <div class="flex items-center justify-between mb-6">
                <NuxtLink :to="getUrl(openPanelItem)" class="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                    {{ openPanelItem.title }}
                </NuxtLink>
                <button @click="openPanel = null" class="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div v-for="child in openPanelItem.items" :key="getId(child)" class="border-l-2 border-gray-300 pl-4">
                    <NuxtLink :to="getUrl(child)" class="block font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-500 mb-2">
                        {{ child.title }}
                    </NuxtLink>
                    <ul v-if="child.items && child.items.length" class="space-y-1">
                        <li v-for="grandchild in child.items" :key="getId(grandchild)">
                            <NuxtLink :to="getUrl(grandchild)" class="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                                {{ grandchild.title }}
                            </NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</nav>
</header>
</template>

<script setup>
const { data } = defineProps({
    data: {
      type: Object,
      required: true,
    },
});

const runtimeConfig = useRuntimeConfig();
const adminUrl = runtimeConfig.public.adminUrl;

const openPanel = ref(null);
const openPanelItem = ref(null);
const mobileMenuOpen = ref(false);

function nav(data) {
    if (!data) return [];
    return data?.navigation?.items;
}

function togglePanel(item) {
    const id = getId(item);
    if (item.items && item.items.length) {
        // Has children — toggle the mega panel
        if (openPanel.value === id) {
            openPanel.value = null;
            openPanelItem.value = null;
        } else {
            openPanel.value = id;
            openPanelItem.value = item;
        }
    } else {
        // No children — navigate directly
        openPanel.value = null;
        openPanelItem.value = null;
        navigateTo(getUrl(item));
    }
}

function getUrl(item) {
    return item['@id'].replace(runtimeConfig.public.backendBaseUrl, '');
}

function getId(item) {
    return item['@id'].replace(runtimeConfig.public.backendBaseUrl, '');
}
</script>
