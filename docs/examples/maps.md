# Maps Block

Embeds a map from a URL (Google Maps, OpenStreetMap, etc.) using an iframe. The `url` field should contain the embed URL, and `title` provides an accessible label.

This is a **built-in** block.

## Schema

```json
{
  "maps": {
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Map Embed URL",
          "widget": "url"
        },
        "title": {
          "title": "Title",
          "type": "string"
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "maps",
  "url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2468.496805908769!2d4.867355714504337!3d50.46334407876937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c1996d6ee4733f%3A0x1e62003289f50ea5!2zVGjDqcOidHJlIGRlIE5hbXVy!5e1!3m2!1sde!2sde!4v1710240653269!5m2!1sde!2sde",
  "title": "Ploneconf 2022 was in Namur, Belgium"
}
```

## Rendering

### React

<!-- file: examples/react/MapsBlock.jsx -->
```jsx
function MapsBlock({ block }) {
  const url = block.url || '';

  return (
    <div data-block-uid={block['@uid']} className="maps-block">
      {url ? (
        <iframe
          src={url}
          title={block.title || 'Map'}
          allowFullScreen
          loading="lazy"
          style={{ width: '100%', height: '450px', border: 'none' }}
        />
      ) : (
        <p>No map URL set</p>
      )}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/MapsBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="maps-block">
    <iframe
      v-if="block.url"
      :src="block.url"
      :title="block.title || 'Map'"
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
    <p v-else>No map URL set</p>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/MapsBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} class="maps-block">
  {#if block.url}
    <iframe
      src={block.url}
      title={block.title || 'Map'}
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
  {:else}
    <p>No map URL set</p>
  {/if}
</div>
```

### Astro

<!-- file: examples/astro/MapsBlock.astro -->
```astro
---
const { block } = Astro.props;
---
<div class="maps-block">
  {block.url ? (
    <iframe
      src={block.url}
      title={block.title || 'Map'}
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
  ) : (
    <p>No map URL set</p>
  )}
</div>
```

## Embeds behind a custom element (shadow DOM)

The implementations above put the `<iframe>` straight in the block. Production
embed components often don't: `<pdfjs-viewer-element>`, `<lite-youtube>` and the
consent-gating map wrappers are custom elements that build the third-party frame
inside a **shadow root**, so its markup and styles stay isolated from the page.

Hydra supports that shape, and the test frontend renders maps this way on
purpose so it stays covered
(`tests-playwright/fixtures/test-frontend/renderer.js`):

```html
<div class="maps-block">
  <map-embed src="https://…" frame-title="Sydney"></map-embed>
</div>
```

```js
customElements.define(
  'map-embed',
  class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      const frame = document.createElement('iframe');
      frame.src = this.getAttribute('src') || '';
      frame.title = this.getAttribute('frame-title') || 'Map';
      root.appendChild(frame);
    }
  },
);
```

Two consequences worth knowing when you write a block this way:

- **The frame is not reachable by ordinary traversal.** `querySelector()` from
  the block element stops at the shadow boundary, and the iframe's `closest()`
  cannot reach back out to the block. Keep `data-block-uid` on an element
  *outside* the shadow root — as the markup above does — or hydra has nothing to
  anchor the block to.
- **Focus reports the host.** When the author clicks into the embed,
  `document.activeElement` is the `<map-embed>` host, not the iframe. That is
  what lets hydra select a block whose body is an embed: a click inside a nested
  browsing context never reaches the page's document, so the focus change is the
  only signal. The same detection tells the admin the block holds an embed, so
  the toolbar does not fade away while the author is using it.

Nothing extra is required of your block: use `mode: 'open'` for the shadow root
(closed roots are invisible to the page, and hydra cannot see through them
either) and keep the block's `data-block-uid` on the light-DOM wrapper.

Covered by `tests-playwright/bridge/iframe-block-selection.spec.ts`.
