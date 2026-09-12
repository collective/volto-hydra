# Callout Block

A labelled admonition box — **note**, **tip**, **warning**, or **important** — with a rich-text body. Use it for asides, gotchas, and warnings inside a page.

This is a **custom** block — register it via `initBridge`.

The level is the block's `variation`; it drives the label and colour. The body is a `slate` value, so it takes the same inline formatting as any slate block. This mirrors the myst `` ```{note} `` / `` ```{warning} `` directives, so docs authored as blocks keep their callouts (and a `<block>`→myst emitter maps `variation` back to the directive).

**Demonstrates:** [HTML Annotations for Visual Editing](../visual-editing.md#html-annotations-for-visual-editing) — a slate body annotated where it is read.

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
        "value": {
          "title": "Body",
          "widget": "slate",
          "type": "array"
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
  "value": [
    {
      "type": "p",
      "children": [
        {
          "text": "Inka is a Work in Progress. It should not be used in production yet."
        }
      ]
    }
  ]
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
  const body = block.value || [];
  return (
    <aside
      data-block-uid={block['@uid']}
      className={`callout callout--${block.variation || 'note'}`}
      style={{ borderLeft: `4px solid ${level.color}`, background: level.bg, padding: '12px 16px', borderRadius: '4px', margin: '1em 0' }}
    >
      <div className="callout__label" style={{ fontWeight: 700, color: level.color, textTransform: 'uppercase', fontSize: '0.8em', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {level.label}
      </div>
      <div className="callout__body" data-edit-text="value">
        {body.map((node, i) => (
          <SlateNode key={i} node={node} />
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
    <div class="callout__body" data-edit-text="value">
      <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });

const calloutLevels = {
  note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
  tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
  warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
  important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
};
const level = computed(() => calloutLevels[props.block.variation] || calloutLevels.note);
</script>
```

### Svelte

<!-- file: examples/svelte/CalloutBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;

  const calloutLevels = {
    note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
    tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
    warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
    important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
  };
  $: level = calloutLevels[block.variation] || calloutLevels.note;
</script>

<aside
  data-block-uid={block['@uid']}
  class="callout callout--{block.variation || 'note'}"
  style="border-left:4px solid {level.color};background:{level.bg};padding:12px 16px;border-radius:4px;margin:1em 0"
>
  <div class="callout__label" style="font-weight:700;color:{level.color};text-transform:uppercase;font-size:0.8em;letter-spacing:0.05em;margin-bottom:4px">
    {level.label}
  </div>
  <div class="callout__body" data-edit-text="value">
    {#each block.value || [] as node, i (i)}
      <SlateNode {node} />
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
 * The level is block.variation; the body is a slate value. No data-block-uid:
 * BlockRenderer.astro wraps every block in <div data-block-uid={uid}>.
 */
import SlateNode from './SlateNode.astro';
const { block } = Astro.props;
const calloutLevels: Record<string, { label: string; color: string; bg: string }> = {
  note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
  tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
  warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
  important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
};
const level = calloutLevels[block.variation] || calloutLevels.note;
const body = block.value || [];
---
<aside
  class={`callout callout--${block.variation || 'note'}`}
  style={`border-left:4px solid ${level.color};background:${level.bg};padding:12px 16px;border-radius:4px;margin:1em 0`}
>
  <div class="callout__label" style={`font-weight:700;color:${level.color};text-transform:uppercase;font-size:0.8em;letter-spacing:0.05em;margin-bottom:4px`}>
    {level.label}
  </div>
  <div class="callout__body" data-edit-text="value">
    {body.map((node: any) => <SlateNode node={node} />)}
  </div>
</aside>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-text="value"` | Makes the callout body inline-editable |
