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

```{note}
The Astro examples below omit `data-block-uid` on the block's root element because `BlockRenderer.astro` wraps every block in `<div data-block-uid={uid}>`. See [Server-rendered frontends](../server-rendered-frontends.md) for why.
```

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

### Astro

<!-- file: examples/astro/SlateBlock.astro -->
```astro
---
/**
 * Slate block: a rich-text editor's value tree. Renders the value array
 * recursively via SlateNode. The `data-edit-text="value"` attribute is
 * the hook the bridge's selection sync uses to pair this DOM element
 * with the block's `value` field for inline editing.
 *
 * Note: this component does NOT set `data-block-uid` — the wrapper in
 * BlockRenderer.astro handles that. Mirrors test-svelte's SlateBlock
 * minus the outer wrapper (which is BlockRenderer's job here).
 */
import SlateNode from './SlateNode.astro';
const { block } = Astro.props;
const value = block?.value || [];
---
<div data-edit-text="value">
  {value.map((node: any) => <SlateNode node={node} />)}
</div>
```

<!-- file: examples/astro/SlateNode.astro -->
```astro
---
/**
 * Recursive slate node renderer.
 *
 * Self-recursion: Astro supports a component importing itself, which is
 * how children of a non-link element render. Svelte uses <svelte:self/>
 * for the same purpose — different syntax, same result.
 *
 * Three cases match the bridge's slate transform output:
 *   - text leaf: just its text content
 *   - link: <a href="..." data-node-id="...">
 *   - any other element: <Tag data-node-id="...">  (h1/p/em/strong/...)
 *
 * `data-node-id` is what the bridge's selection sync uses to map
 * iframe DOM nodes back to slate node paths during editing — it MUST
 * end up on the rendered tag.
 */
import Self from './SlateNode.astro';
const { node } = Astro.props;
const Tag = node?.type;
---
{node?.text !== undefined ? (
  node.text
) : node?.type === 'link' ? (
  <a href={node.data?.url} data-node-id={node.nodeId}>
    {(node.children || []).map((c: any) => <Self node={c} />)}
  </a>
) : (
  <Tag data-node-id={node.nodeId}>
    {(node.children || []).map((c: any) => <Self node={c} />)}
  </Tag>
)}
```
