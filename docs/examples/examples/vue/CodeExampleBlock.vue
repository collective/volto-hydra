<template>
  <div :data-block-uid="block['@uid']" class="code-example" data-block-container='{"add":"horizontal"}'>
    <div v-if="tabs.length > 1" data-tab-bar style="display:flex; background:#1f2937; border-bottom:1px solid #374151">
      <button v-for="(tab, i) in tabs" :key="tab['@id']"
        :data-block-uid="tab['@id']" data-linkable-allow
        @click="activeTab = i"
        :style="{
          padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
          border: 'none', cursor: 'pointer',
          background: activeTab === i ? '#111827' : 'transparent',
          color: activeTab === i ? '#fff' : '#9ca3af',
          borderBottom: activeTab === i ? '2px solid #60a5fa' : '2px solid transparent',
        }">
        <span data-edit-text="label">{{ tab.label || tab.language || `Tab ${i + 1}` }}</span>
      </button>
    </div>
    <div v-for="(tab, i) in tabs" :key="tab['@id']"
      :data-block-uid="tab['@id']" data-block-add="right"
      :style="{ display: activeTab === i ? 'block' : 'none' }">
      <pre data-edit-text="code" :style="{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: tabs.length > 1 ? '0' : '8px', overflow: 'auto', fontSize: '0.875rem', margin: 0, whiteSpace: 'pre-wrap' }">
        <code :class="tab.language ? `language-${tab.language}` : undefined">{{ tab.code || '' }}</code>
      </pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ block: Object });
const activeTab = ref(0);
const tabs = computed(() => props.block.tabs || []);
</script>
