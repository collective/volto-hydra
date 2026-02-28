<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} data-edit-text="value">
  {#each block.value || [] as node, i (i)}
    <svelte:self node={node} />
  {/each}
</div>
