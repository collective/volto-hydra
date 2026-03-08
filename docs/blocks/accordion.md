# Accordion Block

A collapsible panel group. Each panel is an `object_list` item with a title and a content area that holds child blocks.

This is a **custom** block — register it via `initBridge`.

## Schema

```json
{
  "accordion": {
    "blockSchema": {
      "properties": {
        "panels": {
          "title": "Panels",
          "widget": "object_list",
          "schema": {
            "properties": {
              "title": {
                "title": "Title"
              },
              "blocks_layout": {
                "title": "Content",
                "widget": "blocks_layout",
                "allowedBlocks": [
                  "slate",
                  "image"
                ],
                "defaultBlockType": "slate"
              }
            }
          }
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "accordion",
  "panels": [
    {
      "@id": "panel-1",
      "title": "Frequently Asked Questions",
      "blocks": {
        "content-text-1": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "Here are the answers to common questions."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "content-text-1"
        ]
      }
    }
  ]
}
```

## Rendering

### React

<!-- file: examples/react/AccordionBlock.jsx -->
```jsx
function AccordionBlock({ block }) {
  const panels = block.panels || [];

  return (
    <div data-block-uid={block['@uid']} className="accordion-block">
      {panels.map(panel => {
        const panelId = panel['@id'];
        return <AccordionPanel key={panelId} panel={panel} panelId={panelId} />;
      })}
    </div>
  );
}

function AccordionPanel({ panel, panelId }) {
  const [open, setOpen] = useState(!panel.collapsed);
  const contentBlocks = panel.blocks || {};
  const contentLayout = panel.blocks_layout?.items || [];

  return (
    <div data-block-uid={panelId} className="accordion-panel">
      <button onClick={() => setOpen(!open)} className="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-content">
          {contentLayout.map(id => (
            <BlockRenderer key={id} block={{ ...contentBlocks[id], '@uid': id }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/AccordionBlock.vue -->
```vue
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
```

### Svelte

<!-- file: examples/svelte/AccordionBlock.svelte -->
```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  let openPanels = Object.fromEntries((block.panels || []).filter(p => !p.collapsed).map(p => [p['@id'], true]));
  function toggle(id) { openPanels[id] = !openPanels[id]; openPanels = openPanels; }
</script>

<div data-block-uid={block['@uid']} class="accordion-block">
  {#each block.panels || [] as panel (panel['@id'])}
    <div data-block-uid={panel['@id']} class="accordion-panel">
      <button on:click={() => toggle(panel['@id'])} class="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{openPanels[panel['@id']] ? '▲' : '▼'}</span>
      </button>
      {#if openPanels[panel['@id']]}
        <div class="accordion-content">
          {#each panel.blocks_layout?.items || [] as id (id)}
            <BlockRenderer block={{ ...panel.blocks[id], '@uid': id }} />
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
```
