# Context Navigation Block

A vertical navigation list for grouped pages — a left sidebar on desktop and a collapsible disclosure at the top on mobile. Each row is a `navItem` (hand-added link) and/or a `listing` (auto-populated from a path query). The active link is detected from the current URL and gets `aria-current="page"` plus a `.current` class. Named after Plone's `@contextnavigation` endpoint, which serves the same purpose.

This is a **custom** block — register it via `initBridge`. Pair it with `navItem` (a restricted child block).

## Schema

```json
{
  "contextNavigation": {
    "blockSchema": {
      "properties": {
        "ariaLabel": {
          "title": "Aria label",
          "default": "Section navigation"
        },
        "expandCurrentOnly": {
          "title": "Expand current section only",
          "type": "boolean",
          "default": true
        },
        "includeTop": {
          "title": "Include section root",
          "type": "boolean",
          "default": false
        },
        "items": {
          "title": "Items",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "navItem",
            "listing"
          ]
        }
      }
    }
  },
  "navItem": {
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    }
  }
}
```


## JSON Block Data

A hand-built nav. Two of the links share a URL depth and render at the same indent; the third points one segment deeper and renders one level in.

```json
{
  "@type": "contextNavigation",
  "ariaLabel": "Section navigation",
  "blocks": {
    "nav-1": {
      "@type": "navItem",
      "label": "Introduction",
      "href": [
        {
          "@id": "/docs/introduction"
        }
      ]
    },
    "nav-2": {
      "@type": "navItem",
      "label": "Custom blocks",
      "href": [
        {
          "@id": "/docs/custom-blocks"
        }
      ]
    },
    "nav-2a": {
      "@type": "navItem",
      "label": "Schema",
      "href": [
        {
          "@id": "/docs/custom-blocks/schema"
        }
      ]
    },
    "nav-2b": {
      "@type": "navItem",
      "label": "Rendering",
      "href": [
        {
          "@id": "/docs/custom-blocks/rendering"
        }
      ]
    },
    "nav-3": {
      "@type": "navItem",
      "label": "Listings",
      "href": [
        {
          "@id": "/docs/listings"
        }
      ]
    }
  },
  "items": {
    "items": [
      "nav-1",
      "nav-2",
      "nav-2a",
      "nav-2b",
      "nav-3"
    ]
  }
}
```

### Auto-populated alternative

Replace the manual `navItem` children with a single `listing` child configured to fetch from a path. The listing's `querystring.depth` constrains how deep the tree goes; the renderer derives the indent level from each result's `@id` path depth. Add an `exclude_from_nav: isFalse` criterion so pages hidden from navigation (e.g. example or scratch pages) don't appear in the nav.

```json
{
  "@type": "contextNavigation",
  "items": { "items": ["cnav-listing"] },
  "blocks": {
    "cnav-listing": {
      "@type": "listing",
      "variation": "navItem",
      "querystring": {
        "query": [
          { "i": "path",
            "o": "plone.app.querystring.operation.string.relativePath",
            "v": "." },
          { "i": "exclude_from_nav",
            "o": "plone.app.querystring.operation.boolean.isFalse",
            "v": "" }
        ],
        "sort_on": "getObjPositionInParent",
        "depth": 2
      }
    }
  }
}
```

`ploneFetchItems` always calls `@querystring-search`; when `sort_on === 'getObjPositionInParent'` it post-sorts the flat result into a parent-then-children hierarchical order. There is no special-case routing to `@navigation` — frontends are free to swap endpoints, but the default pipeline is "search + post-sort".

## Rendering

The block wraps its children in `<nav><ul>`. Each `navItem` (or listing-synthesised item) renders as a `<a class="nav-item">`. Indent is a `level-N` class, the active row gets `aria-current="page"` and a `.current` class, and an ancestor of the current page gets `.in-path`.

### React

<!-- file: examples/react/ContextNavigationBlock.jsx -->
```jsx
function ContextNavigationBlock({ block, blocks }) {
  const items = block.items?.items || [];
  return (
    <nav
      data-block-uid={block['@uid']}
      aria-label={block.ariaLabel || 'Section navigation'}
      className="context-navigation"
    >
      <ul role="list" className="context-navigation-list">
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
  // Both manual and listing-synth items share shape: `href` is the
  // object_browser array `[{ '@id': string }]` (the listing variation's
  // fieldMappings.@default maps `@id` → `href` via type='link'). `label`
  // is a string. `_level` is set by the parent ContextNavigationBlock
  // after computing minDepth across all sibling hrefs.
  const here = window.location.pathname.replace(/\/edit$/, '');
  const itemPath = new URL(block.href[0]['@id'], window.location.origin).pathname;
  const active = itemPath === here;
  const inPath = !active && here.startsWith(itemPath + '/');
  return (
    <li>
      <a
        href={itemPath}
        data-block-uid={block['@uid']}
        data-edit-link="href"
        className={`nav-item level-${block._level} ${active ? 'current' : ''} ${inPath ? 'in-path' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <span data-edit-text="label">{block.label}</span>
      </a>
    </li>
  );
}
```

### Vue

<!-- file: examples/vue/ContextNavigationBlock.vue -->
```vue
<template>
  <nav
    :data-block-uid="block['@uid']"
    :aria-label="block.ariaLabel || 'Section navigation'"
    class="context-navigation"
  >
    <ul role="list" class="context-navigation-list">
      <li v-for="id in (block.items?.items || [])" :key="id">
        <NavItem :block="{ ...blocks[id], '@uid': id }" />
      </li>
    </ul>
  </nav>
</template>

<script setup>
import NavItem from './NavItem.vue';
defineProps({ block: Object, blocks: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/ContextNavigationBlock.svelte -->
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
  class="context-navigation"
>
  <ul role="list" class="context-navigation-list">
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

The shipped CSS is intentionally minimal — production frontends override. The structural class names (`.context-navigation`, `.nav-item`, `.level-1/2/3`, `.current`, `.in-path`) are stable; only the visual rules vary.
