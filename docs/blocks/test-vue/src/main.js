import { createApp, reactive } from 'vue';
import { initBridge, expandListingBlocks, ploneFetchItems } from '$hydra';
import docPageDefinitions from '$schemas';
const docBlocksConfig = Object.fromEntries(
  Object.values(docPageDefinitions).flatMap(page => Object.entries(page.blocks))
);
import App from './App.vue';

// Expose hydra.js helpers globally for doc example components
window.expandListingBlocks = expandListingBlocks;
window.ploneFetchItems = ploneFetchItems;
window._API_URL = 'http://localhost:8888';

const state = reactive({ items: [], content: {} });

const app = createApp(App, { items: state.items, content: state.content });
app.mount('#app');

function renderApp(content) {
  const layout = content.blocks_layout?.items || [];
  const blocks = content.blocks || {};
  state.items.splice(0, state.items.length, ...layout.map(id => ({ ...blocks[id], '@uid': id })));
  Object.assign(state.content, { title: content.title, description: content.description, blocks: content.blocks, blocks_layout: content.blocks_layout });
}

// Init bridge — Volto sends content via onEditChange, no API fetch needed
window.bridge = initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: {
          title: 'Blocks',
          allowedBlocks: Object.keys(docBlocksConfig),
        },
      },
    },
  },
  blocks: { ...docBlocksConfig },
  onEditChange: async (formData) => {
    if (formData.title) {
      document.getElementById('page-title').textContent = formData.title;
    }
    if (formData.blocks && formData.blocks_layout) {
      renderApp(formData);
    }
  },
});
