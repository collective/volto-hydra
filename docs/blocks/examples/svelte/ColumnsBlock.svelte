<script>
  import ColumnBlock from './ColumnBlock.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="columns-block">
  <div style="display: flex; gap: 1rem">
    {#each block.columns?.items || [] as id (id)}
      <ColumnBlock block={{ ...block.blocks?.[id], '@uid': id }} />
    {/each}
  </div>
</div>
