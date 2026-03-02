<script>
  import BlockRenderer from './BlockRenderer.svelte';

  export let block;
  export let blockId;

  let items = [];

  $: block.querystring, loadItems();

  async function loadItems() {
    const fetchItems = ploneFetchItems({ apiUrl: API_URL });
    const result = await expandListingBlocks([blockId], {
      blocks: { [blockId]: block },
      fetchItems: { listing: fetchItems },
      itemTypeField: 'variation',
    });
    items = result;
  }
</script>

<div data-block-uid={blockId} class="listing-block">
  {#each items as item, i (i)}
    <BlockRenderer block={item} />
  {/each}
</div>
