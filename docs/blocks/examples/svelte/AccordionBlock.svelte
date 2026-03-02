<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  let openPanels = {};
  function toggle(id) { openPanels[id] = !openPanels[id]; openPanels = openPanels; }
</script>

<div data-block-uid={block['@uid']} class="accordion-block">
  {#each block.panels || [] as panel (panel['@id'])}
    <div data-block-uid={panel['@id']} class="accordion-panel">
      <button on:click={() => toggle(panel['@id'])} class="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{openPanels[panel['@id']] ? '▲' : '▼'}</span>
      </button>
      {#if openPanels[panel['@id']]}
        <div class="accordion-content">
          {#each panel.blocks_layout?.items || [] as id (id)}
            <BlockRenderer block={{ ...panel.blocks[id], '@uid': id }} />
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
