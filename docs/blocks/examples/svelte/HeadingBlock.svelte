<script>
  export let block;
</script>

<svelte:element this={block.tag || 'h2'} data-block-uid={block['@uid']} data-edit-text="heading">
  {block.heading}
</svelte:element>
