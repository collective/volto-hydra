<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} class="maps-block">
  {#if block.url}
    <iframe
      src={block.url}
      title={block.title || 'Map'}
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
  {:else}
    <p>No map URL set</p>
  {/if}
</div>
