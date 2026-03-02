<script>
  import ListingBlock from './ListingBlock.svelte';
  export let block;
  export let blockId;

  let query = '';

  $: visibleFacets = (block.facets || []).filter(f => !f.hidden);
  $: listingId = block.listing?.items?.[0];
  $: listingBlock = listingId ? block.blocks?.[listingId] : null;
</script>

<div data-block-uid={blockId} class="search-block">
  <input type="search" placeholder="Search..." bind:value={query} />

  {#if visibleFacets.length}
    <div class="facets">
      <h4>{block.facetsTitle || 'Filter'}</h4>
      {#each visibleFacets as facet (facet['@id'])}
        {#if facet.type === 'checkboxFacet'}
          <fieldset><legend>{facet.title}</legend><!-- checkbox options --></fieldset>
        {:else if facet.type === 'selectFacet'}
          <label>{facet.title}<select><!-- options --></select></label>
        {:else if facet.type === 'daterangeFacet'}
          <label>{facet.title}<input type="date" /> – <input type="date" /></label>
        {:else if facet.type === 'toggleFacet'}
          <label><input type="checkbox" /> {facet.title}</label>
        {/if}
      {/each}
    </div>
  {/if}

  {#if listingBlock}
    <ListingBlock block={listingBlock} blockId={listingId} />
  {/if}
</div>
