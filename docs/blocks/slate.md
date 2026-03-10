# Slate (Text) Block

Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links).

This is a **built-in** block — no schema registration is needed. It's available by default when you include `'slate'` in your page's `allowedBlocks`.

## Schema

```json
{
  "slate": {
    "blockSchema": {
      "properties": {
        "value": {
          "title": "Text",
          "widget": "slate"
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "slate",
  "value": [
    {
      "type": "h2",
      "children": [
        {
          "text": "Welcome"
        }
      ]
    },
    {
      "type": "p",
      "children": [
        {
          "text": "This is "
        },
        {
          "type": "strong",
          "children": [
            {
              "text": "bold"
            }
          ]
        },
        {
          "text": " and "
        },
        {
          "type": "em",
          "children": [
            {
              "text": "italic"
            }
          ]
        },
        {
          "text": " text."
        }
      ]
    },
    {
      "type": "ul",
      "children": [
        {
          "type": "li",
          "children": [
            {
              "text": "First item"
            }
          ]
        },
        {
          "type": "li",
          "children": [
            {
              "text": "Second item"
            }
          ]
        }
      ]
    },
    {
      "type": "p",
      "children": [
        {
          "text": "Visit "
        },
        {
          "type": "link",
          "data": {
            "url": "https://example.com"
          },
          "children": [
            {
              "text": "our site"
            }
          ]
        },
        {
          "text": " for more."
        }
      ]
    }
  ]
}
```

### Node Types

| Type | Renders as |
|------|-----------|
| `p` | `<p>` paragraph |
| `h1`–`h6` | `<h1>`–`<h6>` headings |
| `ul` / `ol` | `<ul>` / `<ol>` lists (children are `li` nodes) |
| `blockquote` | `<blockquote>` |
| `link` | `<a>` (has `data.url`) |
| `strong` | Bold inline |
| `em` | Italic inline |
| `del` | Strikethrough inline |
| `u` | Underline inline |
| `code` | `<code>` inline |

## Rendering

### React

<!-- file: examples/react/SlateBlock.jsx -->
```jsx
function SlateBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} data-edit-text="value">
      {(block.value || []).map((node, i) => (
        <SlateNode key={i} node={node} />
      ))}
    </div>
  );
}
```

<!-- file: examples/react/SlateNode.jsx -->
```jsx
function SlateNode({ node }) {
  if (node.text !== undefined) return <>{node.text}</>;
  const children = (node.children || []).map((c, i) => <SlateNode key={i} node={c} />);
  const Tag = node.type === 'link' ? 'a' : node.type;
  const props = { 'data-node-id': node.nodeId };
  if (node.type === 'link') props.href = node.data?.url;
  return <Tag {...props}>{children}</Tag>;
}
```

### Vue

<!-- file: examples/vue/SlateBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" data-edit-text="value">
    <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

<!-- file: examples/vue/SlateNode.vue -->
```vue
<template>
  <template v-if="!node.type">{{ node.text }}</template>
  <a v-else-if="node.type === 'link'" :href="node.data?.url" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </a>
  <component v-else :is="node.type" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </component>
</template>

<script setup>
defineProps({ node: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/SlateBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} data-edit-text="value">
  {#each block.value || [] as node, i (i)}
    <SlateNode {node} />
  {/each}
</div>
```

<!-- file: examples/svelte/SlateNode.svelte -->
```svelte
<script>
  export let node;
</script>

{#if node.text !== undefined}
  {node.text}
{:else if node.type === 'link'}
  <a href={node.data?.url} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</a>
{:else}
  <svelte:element this={node.type} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</svelte:element>
{/if}
```
