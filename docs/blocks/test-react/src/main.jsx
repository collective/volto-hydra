import React from 'react';
import { createRoot } from 'react-dom/client';
import { initBridge, expandListingBlocks } from '$hydra';
import { sharedBlocksConfig } from '$schemas';
import App from './App.jsx';

// Expose expandListingBlocks globally for doc example components
window._expandListingBlocks = expandListingBlocks;

const root = createRoot(document.getElementById('root'));

function renderApp(content) {
  const layout = content.blocks_layout?.items || [];
  const blocks = content.blocks || {};
  const items = layout.map(id => ({ ...blocks[id], '@uid': id }));
  root.render(<App items={items} />);
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
