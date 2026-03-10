<script>
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href;
</script>

<div data-block-uid={block['@uid']}>
  {#if href}
    <a {href} data-edit-link="href">
      <img data-edit-media="url" src={block.url} alt={block.alt} />
    </a>
  {:else}
    <img data-edit-media="url" src={block.url} alt={block.alt} />
  {/if}
</div>
