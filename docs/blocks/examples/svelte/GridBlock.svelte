<script>
  import BlockRenderer from './BlockRenderer.svelte';
  import { expandListingBlocks } from '@hydra-js/hydra.js';
  export let block;
  export let blockId;
  $: columns = block.columns || [];
  function expand(layout, blocks, containerId) {
    return expandListingBlocks(layout, { blocks, containerId });
  }
</script>

<div data-block-uid={blockId} class="grid-block">
  <div style="display: grid; grid-template-columns: repeat({columns.length}, 1fr); gap: 1rem">
    {#each columns as col (col['@id'])}
      <div data-block-uid={col['@id']} class="grid-column">
        {#each expand(col.blocks_layout?.items || [], col.blocks, col['@id']) as item (item['@uid'])}
          <BlockRenderer block={item} />
        {/each}
      </div>
    {/each}
  </div>
</div>
