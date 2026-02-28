<script>
  import SlateNode from './SlateNode.svelte';
  export let block;

  $: subheadingHtml = (block.subheading || '').replace(/\n/g, '<br>');
  $: buttonLink = block.buttonLink?.[0]?.['@id'] || '';
</script>

<div data-block-uid={block['@uid']} class="hero-block">
  {#if block.image}
    <img data-edit-media="image" src={block.image} alt="Hero image" />
  {/if}
  <h1 data-edit-text="heading">{block.heading}</h1>
  <p data-edit-text="subheading">{@html subheadingHtml}</p>
  <div class="hero-description">
    {#each block.description || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
  <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
    {block.buttonText}
  </a>
</div>
