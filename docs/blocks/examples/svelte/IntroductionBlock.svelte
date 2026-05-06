<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="introduction-block">
  <div class="introduction-body" data-edit-text="value">
    {#each block.value || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
</div>
