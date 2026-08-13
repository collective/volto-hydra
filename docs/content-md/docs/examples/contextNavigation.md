---
"@type": Document
UID: docs-examples-contextNavigation-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A vertical navigation list for grouped pages — a left sidebar on
  desktop and a collapsible disclosure at the top on mobile. Each row is a
  navItem (hand-added link) and/or a listing (auto-populated from a path query).
  The active link is detected from the current URL and gets aria-current="page"
  plus a .current class. Named after Plone's @contextnavigation endpoint, which
  serves the same purpose.
effective: null
exclude_from_nav: false
expires: null
id: contextNavigation
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - navigation
  - templates
title: Context Navigation Block
blocks:
  - title-1: title
  - ref-contextNavigation-description: slate
  - ref-contextNavigation-schema: codeExample
  - ref-contextNavigation-json-data: codeExample
  - ref-contextNavigation-rendering: codeExample
---

:::title{uid="title-1"}
:::

A vertical navigation list for grouped pages — a left sidebar on desktop and a collapsible disclosure at the top on mobile. Each row is a navItem (hand-added link) and/or a listing (auto-populated from a path query). The active link is detected from the current URL and gets aria-current="page" plus a .current class. Named after Plone's @contextnavigation endpoint, which serves the same purpose.

:::codeExample{uid="ref-contextNavigation-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="schema"}
::::tabs[object_list]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-contextNavigation-schema-javascript-38f58f"]}
### Schema

```javascript
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
::::
:::

:::codeExample{uid="ref-contextNavigation-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="json-data"}
::::tabs[object_list]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-contextNavigation-json-data-json-62b3b4"]}
### JSON Block Data

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
  "blocks_layout": {
    "items": [
      "nav-1",
      "nav-2",
      "nav-2a",
      "nav-2b",
      "nav-3"
    ]
  }
}

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
::::
:::

:::codeExample{uid="ref-contextNavigation-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="rendering"}
::::tabs[object_list]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-contextNavigation-rendering-jsx-25968a","ref-contextNavigation-rendering-vue-af752b","ref-contextNavigation-rendering-svelte-a27836"]}
### React

```jsx
function ContextNavigationBlock({ block, blocks }) {
  const items = block.blocks_layout?.items || [];
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

```vue
<template>
  <nav
    :data-block-uid="block['@uid']"
    :aria-label="block.ariaLabel || 'Section navigation'"
    class="context-navigation"
  >
    <ul role="list" class="context-navigation-list">
      <li v-for="id in (block.blocks_layout?.items || [])" :key="id">
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

```svelte
<script>
  import NavItem from './NavItem.svelte';
  export let block;
  export let blocks;
  $: items = block.blocks_layout?.items || [];
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
::::
:::
