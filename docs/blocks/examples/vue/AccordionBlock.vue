<template>
  <div :data-block-uid="block['@uid']" class="accordion-block">
    <div
      v-for="panel in block.panels || []"
      :key="panel['@id']"
      :data-block-uid="panel['@id']"
      class="accordion-panel"
    >
      <button @click="toggle(panel['@id'])" class="accordion-header">
        <span data-edit-text="title">{{ panel.title }}</span>
        <span>{{ openPanels[panel['@id']] ? '▲' : '▼' }}</span>
      </button>
      <div v-if="openPanels[panel['@id']]" class="accordion-content">
        <BlockRenderer
          v-for="id in panel.blocks_layout?.items || []"
          :key="id"
          :block="{ ...panel.blocks[id], '@uid': id }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
const props = defineProps({ block: Object });
const openPanels = reactive(Object.fromEntries((props.block.panels || []).filter(p => !p.collapsed).map(p => [p['@id'], true])));
function toggle(id) { openPanels[id] = !openPanels[id]; }
</script>
