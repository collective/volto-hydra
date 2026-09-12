# Callout Block

A labelled admonition box — **note**, **tip**, **warning**, or **important** — with a rich-text body. Use it for asides, gotchas, and warnings inside a page.

This is a **custom** block — register it via `initBridge`.

The level is the block's `variation`; it drives the label and colour. The body is a **region** of child blocks (a `blocks_layout` field named `items`), so it holds real markdown — multiple paragraphs, lists, code — authored as blocks rather than a single slate value or a `data-json` blob. This mirrors the myst `` ```{note} `` / `` ```{warning} `` directives, so docs authored as blocks keep their callouts (and a `<block>`→myst emitter maps `variation` back to the directive).

## Schema

```json
{
  "callout": {
    "blockSchema": {
      "properties": {
        "variation": {
          "title": "Level",
          "choices": [
            ["note", "Note"],
            ["tip", "Tip"],
            ["warning", "Warning"],
            ["important", "Important"]
          ],
          "default": "note"
        },
        "items": {
          "widget": "blocks_layout",
          "allowedBlocks": ["slate"]
        }
      }
    }
  }
}
```

## JSON Block Data

```json
{
  "@type": "callout",
  "variation": "warning",
  "blocks": {
    "co-body-1": {
      "@type": "slate",
      "value": [
        {
          "type": "p",
          "children": [
            { "text": "Inka is a Work in Progress. It should not be used in production yet." }
          ]
        }
      ]
    }
  },
  "blocks_layout": { "items": ["co-body-1"] }
}
```

## Rendering

### React

<!-- file: examples/react/CalloutBlock.jsx -->
```jsx
const calloutLevels = {
  note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
  tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
  warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
  important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
};

function CalloutBlock({ block }) {
  const level = calloutLevels[block.variation] || calloutLevels.note;
  const blocks = block.blocks || {};
  const items = block.blocks_layout?.items || [];
  return (
    <aside
      data-block-uid={block['@uid']}
      className={`callout callout--${block.variation || 'note'}`}
      style={{ borderLeft: `4px solid ${level.color}`, background: level.bg, padding: '12px 16px', borderRadius: '4px', margin: '1em 0' }}
    >
      <div className="callout__label" style={{ fontWeight: 700, color: level.color, textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {level.label}
      </div>
      <div className="callout__body">
        {items.map((id) => (
          <BlockRenderer key={id} block={{ ...blocks[id], '@uid': id }} />
        ))}
      </div>
    </aside>
  );
}
```

### Vue

<!-- file: examples/vue/CalloutBlock.vue -->
```vue
<template>
  <aside
    :data-block-uid="block['@uid']"
    :class="`callout callout--${block.variation || 'note'}`"
    :style="{ borderLeft: `4px solid ${level.color}`, background: level.bg, padding: '12px 16px', borderRadius: '4px', margin: '1em 0' }"
  >
    <div
      class="callout__label"
      :style="{ fontWeight: 700, color: level.color, textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '0.05em', marginBottom: '4px' }"
    >
      {{ level.label }}
    </div>
    <div class="callout__body">
      <BlockRenderer v-for="id in items" :key="id" :block="{ ...block.blocks?.[id], '@uid': id }" />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import BlockRenderer from './BlockRenderer.vue';
const props = defineProps({ block: Object });

const calloutLevels = {
  note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
  tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
  warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
  important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
};
const level = computed(() => calloutLevels[props.block.variation] || calloutLevels.note);
const items = computed(() => props.block.blocks_layout?.items || []);
</script>
```

### Svelte

<!-- file: examples/svelte/CalloutBlock.svelte -->
```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  const calloutLevels = {
    note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
    tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
    warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
    important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
  };
  $: level = calloutLevels[block.variation] || calloutLevels.note;
  $: blocks = block.blocks || {};
  $: items = block.blocks_layout?.items || [];
</script>

<aside
  data-block-uid={block['@uid']}
  class="callout callout--{block.variation || 'note'}"
  style="border-left:4px solid {level.color};background:{level.bg};padding:12px 16px;border-radius:4px;margin:1em 0"
>
  <div class="callout__label" style="font-weight:700;color:{level.color};text-transform:uppercase;font-size:0.8em;letter-spacing:0.05em;margin-bottom:4px">
    {level.label}
  </div>
  <div class="callout__body">
    {#each items as id (id)}
      <BlockRenderer block={{ ...blocks[id], '@uid': id }} />
    {/each}
  </div>
</aside>
```

### Astro

<!-- file: examples/astro/CalloutBlock.astro -->
```astro
---
/**
 * Callout block — a labelled admonition box (note / tip / warning / important).
 * The level is block.variation; the body is a region of child blocks (items),
 * each rendered by BlockRenderer. No data-block-uid: BlockRenderer.astro wraps
 * every block in <div data-block-uid={uid}>.
 */
import BlockRenderer from './BlockRenderer.astro';
const { block } = Astro.props;
const calloutLevels: Record<string, { label: string; color: string; bg: string }> = {
  note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
  tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
  warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
  important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
};
const level = calloutLevels[block.variation] || calloutLevels.note;
const subBlocks = block.blocks || {};
const items = block.blocks_layout?.items || [];
---
<aside
  class={`callout callout--${block.variation || 'note'}`}
  style={`border-left:4px solid ${level.color};background:${level.bg};padding:12px 16px;border-radius:4px;margin:1em 0`}
>
  <div class="callout__label" style={`font-weight:700;color:${level.color};text-transform:uppercase;font-size:0.8em;letter-spacing:0.05em;margin-bottom:4px`}>
    {level.label}
  </div>
  <div class="callout__body">
    {items.map((id: string) => <BlockRenderer block={{ ...subBlocks[id], '@uid': id }} />)}
  </div>
</aside>
```

### Data Attributes

The body's child blocks carry their own editing annotations (e.g. a slate block is inline-editable on its own); the callout wrapper adds none.
