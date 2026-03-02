import { createApp, reactive } from 'vue';
import { initBridge, expandListingBlocks, ploneFetchItems } from '$hydra';
import { sharedBlocksConfig } from '$schemas';
import App from './App.vue';

// Expose hydra.js helpers globally for doc example components
window.expandListingBlocks = expandListingBlocks;
window.ploneFetchItems = ploneFetchItems;
window._API_URL = 'http://localhost:8888';

const state = reactive({ items: [] });

const app = createApp(App, { items: state.items });
app.mount('#app');

function renderApp(content) {
  const layout = content.blocks_layout?.items || [];
  const blocks = content.blocks || {};
  state.items.splice(0, state.items.length, ...layout.map(id => ({ ...blocks[id], '@uid': id })));
}

// Init bridge — Volto sends content via onEditChange, no API fetch needed
window.bridge = initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: {
          title: 'Blocks',
          allowedBlocks: Object.keys(sharedBlocksConfig),
        },
      },
    },
  },
  blocks: { ...sharedBlocksConfig },
  onEditChange: async (formData) => {
    if (formData.title) {
      document.getElementById('page-title').textContent = formData.title;
    }
    if (formData.blocks && formData.blocks_layout) {
      renderApp(formData);
    }
  },
});
