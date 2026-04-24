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
  {#if block.headline}<h2 data-edit-text="headline">{block.headline}</h2>{/if}
  <input type="search" placeholder="Search..." bind:value={query} />

  {#if visibleFacets.length}
    <div class="facets">
      <h4 data-edit-text="facetsTitle">{block.facetsTitle || 'Filter'}</h4>
      {#each visibleFacets as facet (facet['@id'])}
        {#if facet.type === 'checkboxFacet'}
          <fieldset data-block-uid={facet['@id']}><legend data-edit-text="title">{facet.title}</legend><!-- checkbox options --></fieldset>
        {:else if facet.type === 'selectFacet'}
          <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><select><!-- options --></select></label>
        {:else if facet.type === 'daterangeFacet'}
          <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><input type="date" /> – <input type="date" /></label>
        {:else if facet.type === 'toggleFacet'}
          <label data-block-uid={facet['@id']}><input type="checkbox" /> <span data-edit-text="title">{facet.title}</span></label>
        {/if}
      {/each}
    </div>
  {/if}

  {#if listingBlock}
    <ListingBlock block={listingBlock} blockId={listingId} />
  {/if}
</div>
