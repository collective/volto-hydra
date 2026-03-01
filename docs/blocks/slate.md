# Slate (Text) Block

Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links).

This is a **built-in** block — no schema registration is needed. It's available by default when you include `'slate'` in your page's `allowedBlocks`.

## Schema

The slate block schema is registered internally by Hydra. If you wanted to reproduce it as a custom block, the schema would look like:

```js
{
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['value'] }
    ],
    properties: {
      value: {
        title: 'Body',
        widget: 'slate',
      },
    },
  },
}
```

The `widget: 'slate'` field stores content as a Slate JSON tree (not HTML).

## JSON Block Data

```json
{
  "@type": "slate",
  "value": [
    {
      "type": "h2",
      "children": [{ "text": "Welcome" }]
    },
    {
      "type": "p",
      "children": [
        { "text": "This is " },
        { "type": "strong", "children": [{ "text": "bold" }] },
        { "text": " and " },
        { "type": "em", "children": [{ "text": "italic" }] },
        { "text": " text." }
      ]
    },
    {
      "type": "ul",
      "children": [
        { "type": "li", "children": [{ "text": "First item" }] },
        { "type": "li", "children": [{ "text": "Second item" }] }
      ]
    },
    {
      "type": "p",
      "children": [
        { "text": "Visit " },
        {
          "type": "link",
          "data": { "url": "https://example.com" },
          "children": [{ "text": "our site" }]
        },
        { "text": " for more." }
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
  const children = (node.children || []).map((child, i) => (
    <SlateNode key={i} node={child} />
  ));

  switch (node.type) {
    case 'p':         return <p>{children}</p>;
    case 'h1':        return <h1>{children}</h1>;
    case 'h2':        return <h2>{children}</h2>;
    case 'h3':        return <h3>{children}</h3>;
    case 'blockquote': return <blockquote>{children}</blockquote>;
    case 'ul':        return <ul>{children}</ul>;
    case 'ol':        return <ol>{children}</ol>;
    case 'li':        return <li>{children}</li>;
    case 'link':      return <a href={node.data?.url}>{children}</a>;
    case 'strong':    return <strong>{children}</strong>;
    case 'em':        return <em>{children}</em>;
    case 'del':       return <del>{children}</del>;
    case 'u':         return <u>{children}</u>;
    case 'code':      return <code>{children}</code>;
    default:
      // Leaf text node
      if (node.text !== undefined) return <>{node.text}</>;
      return <span>{children}</span>;
  }
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
  <p v-if="node.type === 'p'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></p>
  <h1 v-else-if="node.type === 'h1'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h1>
  <h2 v-else-if="node.type === 'h2'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h2>
  <h3 v-else-if="node.type === 'h3'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></h3>
  <blockquote v-else-if="node.type === 'blockquote'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></blockquote>
  <ul v-else-if="node.type === 'ul'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></ul>
  <ol v-else-if="node.type === 'ol'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></ol>
  <li v-else-if="node.type === 'li'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></li>
  <a v-else-if="node.type === 'link'" :href="node.data?.url"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></a>
  <strong v-else-if="node.type === 'strong'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></strong>
  <em v-else-if="node.type === 'em'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></em>
  <del v-else-if="node.type === 'del'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></del>
  <u v-else-if="node.type === 'u'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></u>
  <code v-else-if="node.type === 'code'"><SlateNode v-for="(c, i) in node.children" :key="i" :node="c" /></code>
  <template v-else>{{ node.text }}</template>
</template>

<script setup>
defineProps({ node: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/SlateBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} data-edit-text="value">
  {#each block.value || [] as node, i (i)}
    <svelte:self node={node} />
  {/each}
</div>
```

<!-- file: examples/svelte/SlateNode.svelte -->
```svelte
<script>
  export let node;
</script>

{#if node.type === 'p'}
  <p>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</p>
{:else if node.type === 'h1'}
  <h1>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h1>
{:else if node.type === 'h2'}
  <h2>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h2>
{:else if node.type === 'h3'}
  <h3>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h3>
{:else if node.type === 'blockquote'}
  <blockquote>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</blockquote>
{:else if node.type === 'ul'}
  <ul>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</ul>
{:else if node.type === 'ol'}
  <ol>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</ol>
{:else if node.type === 'li'}
  <li>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</li>
{:else if node.type === 'link'}
  <a href={node.data?.url}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</a>
{:else if node.type === 'strong'}
  <strong>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</strong>
{:else if node.type === 'em'}
  <em>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</em>
{:else if node.type === 'del'}
  <del>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</del>
{:else if node.type === 'u'}
  <u>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</u>
{:else if node.type === 'code'}
  <code>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</code>
{:else}
  {node.text}
{/if}
```
