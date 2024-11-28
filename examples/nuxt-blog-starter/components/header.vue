<template>
    <header>
<nav class="bg-white border-gray-200 dark:bg-gray-900">


    <div class="flex flex-wrap items-center justify-between max-w-screen-xl mx-auto p-4">
        <NuxtLink to="/" class="flex items-center space-x-3 rtl:space-x-reverse">
            <!-- <img src="https://flowbite.com/docs/images/logo.svg" class="h-8" alt="Flowbite Logo" /> -->
            <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Hydra Nuxt Example</span>
        </NuxtLink>
        <div class="flex items-center md:order-2 space-x-1 md:space-x-2 rtl:space-x-reverse">
            <NuxtLink to="https://hydra.pretagov.com/login" class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2 md:px-5 md:py-2.5 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800">Login</NuxtLink>
            <NuxtLink to="https://hydra.pretagov.com/register" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 md:px-5 md:py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Sign up</NuxtLink>
            <button data-collapse-toggle="mega-menu" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="mega-menu" aria-expanded="false">
                <span class="sr-only">Open main menu</span>
                <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
                </svg>
            </button>
        </div>
        <div id="mega-menu" class="items-center justify-between hidden w-full md:flex md:w-auto md:order-1">
            <ul class="flex flex-col mt-4 font-medium md:flex-row md:mt-0 md:space-x-8 rtl:space-x-reverse" >
                <template v-for="(item) in nav(data)">
                <li v-if="!item.items.length">
                    <NuxtLink :to="getUrl(item)" class="block py-2 px-3 text-blue-600 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-blue-600 md:p-0 dark:text-blue-500 md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-blue-500 md:dark:hover:bg-transparent dark:border-gray-700" aria-current="page">{{ item.title }}</NuxtLink>
                </li>
                <li v-else >
                    <button :id="`mega-menu-dropdown-button-${getId(item)}`" :data-dropdown-toggle="getId(item)" class="flex items-center z-30 justify-between w-full py-2 px-3 font-medium text-gray-900 border-b border-gray-100 md:w-auto hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-blue-600 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-blue-500 md:dark:hover:bg-transparent dark:border-gray-700">
                        {{item.title}} <svg class="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4"/>
                        </svg>
                    </button>
                    <div :id="getId(item)" class="absolute z-40 grid hidden w-auto grid-cols-2 text-sm bg-white border border-gray-100 rounded-lg shadow-md dark:border-gray-700 md:grid-cols-3 dark:bg-gray-700">
                        <div v-for="(chunk) in chunkArray(item.items, 4)" class="p-4 pb-0 text-gray-900 md:pb-4 dark:text-white">
                            <ul class="space-y-4" >
                                <li v-for="(item) in chunk">
                                    <NuxtLink :to="getUrl(item)"  class="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500">
                                        {{ item.title }}
                                    </NuxtLink>
                                </li>
                            </ul>
                        </div>
                    </div>
                </li>
            </template>                
            </ul>
        </div>
    </div>
</nav>
</header>
</template>

<script setup>

const {block_uid, block, data} = defineProps({
    data: {
      type: Object,
      required: true,
    },
});

function nav(data) {
        if (!data) {
            return []
        }
        return data?.navigation?.items;
    };
function getUrl(item) {
        return item['@id'].replace('https://hydra-api.pretagov.com/', '/').replace('https://hydra-api.pretagov.com', '/')
    };
function getId(item) {
        return item['@id'].replace('https://hydra-api.pretagov.com/', '/').replace('https://hydra-api.pretagov.com', '/')
    };

function chunkArray(array, chunkSize) {
        if (chunkSize <= 0) throw new Error("Chunk size must be greater than 0");
  
        const result = [];
        
        for (let i = 0; i < array.length; i += chunkSize) {
            const chunk = array.slice(i, i + chunkSize);
            result.push(chunk);
        }
        return result;
    };
</script>
