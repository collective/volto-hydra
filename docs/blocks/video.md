# Video Block

Embeds a video from a URL. Detects YouTube links and renders an iframe embed; otherwise falls back to an HTML5 `<video>` element.

This is a **built-in** block.

## Schema

```json
{
  "video": {
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Video URL"
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "video",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

## Rendering

### React

<!-- file: examples/react/VideoBlock.jsx -->
```jsx
function VideoBlock({ block }) {
  const url = block.url || '';
  const youtubeId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];

  return (
    <div data-block-uid={block['@uid']} className="video-block">
      {youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          allowFullScreen
          style={{ width: '100%', aspectRatio: '16/9', border: 'none' }}
        />
      ) : url ? (
        <video src={url} controls style={{ width: '100%' }} />
      ) : (
        <p>No video URL set</p>
      )}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/VideoBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="video-block">
    <iframe
      v-if="youtubeId"
      :src="`https://www.youtube.com/embed/${youtubeId}`"
      allowfullscreen
      style="width: 100%; aspect-ratio: 16/9; border: none"
    />
    <video v-else-if="block.url" :src="block.url" controls style="width: 100%" />
    <p v-else>No video URL set</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const youtubeId = computed(() => {
  const url = props.block.url || '';
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];
});
</script>
```

### Svelte

<!-- file: examples/svelte/VideoBlock.svelte -->
```svelte
<script>
  export let block;
  $: url = block.url || '';
  $: youtubeId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];
</script>

<div data-block-uid={block['@uid']} class="video-block">
  {#if youtubeId}
    <iframe
      src="https://www.youtube.com/embed/{youtubeId}"
      allowfullscreen
      style="width: 100%; aspect-ratio: 16/9; border: none"
      title="Video"
    />
  {:else if url}
    <video src={url} controls style="width: 100%">
      <track kind="captions" />
    </video>
  {:else}
    <p>No video URL set</p>
  {/if}
</div>
```
