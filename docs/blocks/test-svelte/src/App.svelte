<script>
  import BlockRenderer from '$examples/BlockRenderer.svelte';

  export let items = [];
</script>

<div id="content">
  {#each items as block (block['@uid'])}
    <BlockRenderer {block} />
  {/each}
</div>
