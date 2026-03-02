<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
  $: ctaLink = block.cta_link?.[0]?.['@id'] || '';
</script>

<section
  data-block-uid={block['@uid']}
  class="highlight-block"
  style={block.image ? `background-image: url(${block.image})` : ''}
>
  <div class="highlight-overlay">
    <h2 data-edit-text="title">{block.title}</h2>
    <div class="highlight-body">
      {#each block.description || [] as node, i (i)}
        <SlateNode {node} />
      {/each}
    </div>
    {#if block.cta_title}
      <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" class="highlight-cta">
        {block.cta_title}
      </a>
    {/if}
  </div>
</section>
