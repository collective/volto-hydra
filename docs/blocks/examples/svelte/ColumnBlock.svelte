<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} style="flex: 1">
  {#if block.title}
    <h4 data-edit-text="title">{block.title}</h4>
  {/if}
  {#each block.blocks_layout?.items || [] as id (id)}
    <BlockRenderer block={{ ...block.blocks?.[id], '@uid': id }} />
  {/each}
</div>
