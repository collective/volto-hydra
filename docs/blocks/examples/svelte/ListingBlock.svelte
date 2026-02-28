<script>
  export let block;
  export let blockId;

  let items = [];

  $: block.querystring, loadItems();

  async function loadItems() {
    const result = await expandListingBlocks(
      { [blockId]: block },
      [blockId],
      blockId,
    );
    items = result.items;
  }
</script>

<div data-block-uid={blockId} class="listing-block">
  {#each items as item (item['@uid'])}
    <div data-block-uid={item['@uid']} class="listing-item">
      {#if block.variation === 'summary' && item.image}
        <img src={item.image} alt="" />
      {/if}
      <h3><a href={item.href}>{item.title}</a></h3>
      <p>{item.description}</p>
    </div>
  {/each}
</div>
