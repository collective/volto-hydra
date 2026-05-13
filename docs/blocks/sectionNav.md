# Section Navigation Block

A vertical navigation list for grouped pages — typically a left sidebar on desktop and a top-of-page collapsible disclosure on mobile. Each row is a `navItem` (hand-added link) and/or a `listing` (auto-populated from a path query). The active link is detected from the current URL and gets `aria-current="page"` plus a `.current` class.

This is a **custom** block — register it via `initBridge`. Pair it with `navItem` (a restricted child block).

## Schema

```json
{
  "sectionNav": {
    "blockSchema": {
      "properties": {
        "ariaLabel": {
          "title": "Aria label",
          "default": "Section navigation"
        },
        "placement": {
          "title": "Placement",
          "widget": "select",
          "choices": [
            ["sidebar", "Sidebar (top on mobile)"],
            ["top", "Top of content"]
          ],
          "default": "sidebar"
        },
        "items": {
          "title": "Items",
          "widget": "blocks_layout",
          "allowedBlocks": ["navItem", "listing"]
        }
      }
    }
  },
  "navItem": {
    "blockSchema": {
      "properties": {
        "label":  { "title": "Label" },
        "href":   { "title": "Link", "widget": "object_browser", "mode": "link" },
        "level":  { "title": "Indent level", "default": 1, "choices": [[1, "1"], [2, "2"], [3, "3"]] }
      }
    }
  }
}
```

## JSON Block Data

A hand-built nav with five labelled links at two indent levels:

```json
{
  "@type": "sectionNav",
  "ariaLabel": "Section navigation",
  "placement": "sidebar",
  "blocks": {
    "nav-1": {
      "@type": "navItem",
      "label": "Introduction",
      "href": [{ "@id": "/docs/introduction" }],
      "level": 1
    },
    "nav-2": {
      "@type": "navItem",
      "label": "Custom blocks",
      "href": [{ "@id": "/docs/custom-blocks" }],
      "level": 1
    },
    "nav-2a": {
      "@type": "navItem",
      "label": "Schema",
      "href": [{ "@id": "/docs/custom-blocks/schema" }],
      "level": 2
    }
  },
  "items": {
    "items": ["nav-1", "nav-2", "nav-2a"]
  }
}
```

### Auto-populated alternative

Replace the manual `navItem` children with a single `listing` child configured to fetch from a path. The listing's `querystring.depth` constrains how deep the tree goes; the renderer derives the indent level from each result's `@id` path depth.

```json
{
  "@type": "sectionNav",
  "items": { "items": ["snav-listing"] },
  "blocks": {
    "snav-listing": {
      "@type": "listing",
      "variation": "nav",
      "querystring": {
        "query": [
          { "i": "path",
            "o": "plone.app.querystring.operation.string.relativePath",
            "v": "." }
        ],
        "sort_on": "getObjPositionInParent",
        "depth": 2
      }
    }
  }
}
```

## Rendering

The block wraps its children in `<nav><ul>`. Each `navItem` (or listing-synthesised item) renders as a `<a class="nav-item">`. Indent is a `level-N` class, the active row gets `aria-current="page"` and a `.current` class, and an ancestor of the current page gets `.in-path`.

### React

<!-- file: examples/react/SectionNavBlock.jsx -->
```jsx
function SectionNavBlock({ block, blocks }) {
  const items = block.items?.items || [];
  return (
    <nav
      data-block-uid={block['@uid']}
      aria-label={block.ariaLabel || 'Section navigation'}
      className={`section-nav section-nav-${block.placement || 'sidebar'}`}
    >
      <ul role="list" className="section-nav-list">
        {items.map(id => {
          const child = blocks[id];
          if (!child) return null;
          if (child['@type'] === 'listing') {
            return <ListingNav key={id} block={child} blockId={id} />;
          }
          return <NavItem key={id} block={{ ...child, '@uid': id }} />;
        })}
      </ul>
    </nav>
  );
}

function NavItem({ block }) {
  const here = window.location.pathname.replace(/\/edit$/, '');
  const href = Array.isArray(block.href) ? block.href[0]?.['@id'] : block.href || block['@id'];
  const itemPath = href ? new URL(href, window.location.origin).pathname : '#';
  const active = itemPath === here;
  const inPath = !active && here.startsWith(itemPath + '/');
  const level = Math.max(1, Math.min(3, block.level || 1));
  return (
    <li>
      <a
        href={itemPath}
        data-block-uid={block['@uid']}
        className={`nav-item level-${level} ${active ? 'current' : ''} ${inPath ? 'in-path' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span data-edit-text="label">{block.label || block.title}</span>
      </a>
    </li>
  );
}
```

### Vue

<!-- file: examples/vue/SectionNavBlock.vue -->
```vue
<template>
  <nav
    :data-block-uid="block['@uid']"
    :aria-label="block.ariaLabel || 'Section navigation'"
    :class="['section-nav', `section-nav-${block.placement || 'sidebar'}`]"
  >
    <ul role="list" class="section-nav-list">
      <li v-for="id in (block.items?.items || [])" :key="id">
        <NavItem :block="{ ...blocks[id], '@uid': id }" />
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';
import NavItem from './NavItem.vue';
defineProps({ block: Object, blocks: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/SectionNavBlock.svelte -->
```svelte
<script>
  import NavItem from './NavItem.svelte';
  export let block;
  export let blocks;
  $: items = block.items?.items || [];
</script>

<nav
  data-block-uid={block['@uid']}
  aria-label={block.ariaLabel || 'Section navigation'}
  class="section-nav section-nav-{block.placement || 'sidebar'}"
>
  <ul role="list" class="section-nav-list">
    {#each items as id (id)}
      <li>
        <NavItem block={{ ...blocks[id], '@uid': id }} />
      </li>
    {/each}
  </ul>
</nav>
```

## Accessibility

- Outer element is `<nav aria-label="…">` — screen readers announce the region.
- Current page row sets `aria-current="page"` AND has a visible style cue (bold).
- Mobile disclosure uses a real `<button aria-expanded="…" aria-controls="…">`.
- Tab order follows DOM order; no focus traps.
- Expand/collapse animation respects `prefers-reduced-motion`.

The shipped CSS is intentionally minimal — production frontends override. The structural class names (`.section-nav`, `.nav-item`, `.level-1/2/3`, `.current`, `.in-path`) are stable; only the visual rules vary.
