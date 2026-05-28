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
          "title": "Map Embed URL"
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
