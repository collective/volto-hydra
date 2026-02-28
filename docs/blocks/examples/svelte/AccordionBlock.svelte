<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  let open = false;
</script>

<div data-block-uid={block['@uid']} class="accordion-block">
  <button on:click={() => open = !open} class="accordion-header">
    {#each block.header?.items || [] as id (id)}
      <BlockRenderer block={{ ...block.header.blocks[id], '@uid': id }} />
    {/each}
    <span>{open ? '▲' : '▼'}</span>
  </button>
  {#if open}
    <div class="accordion-content">
      {#each block.content?.items || [] as id (id)}
        <BlockRenderer block={{ ...block.content.blocks[id], '@uid': id }} />
      {/each}
    </div>
  {/if}
</div>
