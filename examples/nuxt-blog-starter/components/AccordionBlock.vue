<template>
  <div :data-block-uid="block_uid" class="accordion-block">
    <div v-for="panel in expand(block.panels || [], null, '@id')" :key="panel['@uid']"
         :data-block-uid="panel['@uid']"
         class="border border-gray-200 dark:border-gray-700">
      <h2>
        <button type="button"
          class="flex items-center justify-between w-full p-5 font-medium rtl:text-right text-gray-500 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3"
          :class="{ 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white': openPanels[panel['@uid']] }"
          :aria-expanded="openPanels[panel['@uid']] ? 'true' : 'false'"
          @click="toggle(panel['@uid'])">
          <span data-edit-text="title">{{ panel.title }}</span>
          <svg class="w-3 h-3 shrink-0 transition-transform" :class="{ 'rotate-180': !openPanels[panel['@uid']] }"
               aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5 5 1 1 5" />
          </svg>
        </button>
      </h2>
      <div v-show="openPanels[panel['@uid']]">
        <div class="p-5 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <Block v-for="item in expand(panel.blocks_layout?.items || [], panel.blocks || {})"
                 :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, inject } from 'vue';
import { expandTemplatesSync } from '@hydra-js/hydra.js';

const props = defineProps({
  block_uid: { type: String, required: true },
  block: { type: Object, required: true },
  data: { type: Object, default: () => ({}) },
});

// Inject template context for child block expansion (same as Block.vue)
const injectedTemplates = inject('templates', {});
const templateState = inject('templateState', {});

const expand = (layout, blocks, idField) => expandTemplatesSync(layout, {
  blocks, templateState, templates: injectedTemplates,
  ...(idField && { idField }),
});

// Track which panels are open — first panel starts expanded
const openPanels = reactive({});
const panels = props.block.panels || [];
if (panels.length > 0) {
  openPanels[panels[0]['@id']] = true;
}

function toggle(id) {
  openPanels[id] = !openPanels[id];
}
</script>
