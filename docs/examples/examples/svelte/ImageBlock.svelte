<script>
  import { getImageUrl } from './utils.js';
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href;
  $: imgSrc = getImageUrl(block.url);
</script>

<div data-block-uid={block['@uid']}>
  {#if href}
    <a {href} data-edit-link="href">
      <img data-edit-media="url" src={imgSrc} alt={block.alt} />
    </a>
  {:else}
    <img data-edit-media="url" src={imgSrc} alt={block.alt} />
  {/if}
</div>
