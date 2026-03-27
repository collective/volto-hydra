<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;
  $: blocks = block.blocks || {};
  $: items = block.blocks_layout?.items || [];
</script>

<div data-block-uid={block['@uid']} class="grid-block">
  <div style="display: grid; grid-template-columns: repeat({items.length}, 1fr); gap: 1rem">
    {#each items as id (id)}
      <div class="grid-cell">
        <BlockRenderer block={{ ...blocks[id], '@uid': id }} />
      </div>
    {/each}
  </div>
</div>
