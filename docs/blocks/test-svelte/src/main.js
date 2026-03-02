import { initBridge, expandListingBlocks, ploneFetchItems } from '$hydra';
import docPageDefinitions from '$schemas';
const docBlocksConfig = Object.fromEntries(
  Object.values(docPageDefinitions).flatMap(page => Object.entries(page.blocks))
);
import App from './App.svelte';

// Expose hydra.js helpers globally for doc example components
window.expandListingBlocks = expandListingBlocks;
window.ploneFetchItems = ploneFetchItems;
window._API_URL = 'http://localhost:8888';

let app;

function renderApp(content) {
  const layout = content.blocks_layout?.items || [];
  const blocks = content.blocks || {};
  const items = layout.map(id => ({ ...blocks[id], '@uid': id }));

  if (app) {
    app.$set({ items, content });
  } else {
    app = new App({
      target: document.getElementById('app'),
      props: { items, content },
    });
  }
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
