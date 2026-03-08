<script>
  import BlockRenderer from '$examples/BlockRenderer.svelte';

  export let items = [];
  export let content = {};
</script>

<div id="content">
  {#each items as block (block['@uid'])}
    <BlockRenderer {block} {content} />
  {/each}
</div>
