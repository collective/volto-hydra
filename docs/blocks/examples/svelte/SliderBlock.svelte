<script>
  export let block;
  let current = 0;
</script>

<div data-block-uid={block['@uid']} class="slider-block">
  {#each block.slides || [] as slide, i (slide['@id'])}
    <div
      data-block-uid={slide['@id']}
      class="slide"
      style:display={i === current ? 'block' : 'none'}
    >
      {#if slide.preview_image}
        <img
          data-edit-media="preview_image"
          src={slide.preview_image[0]?.['@id'] || slide.preview_image}
          alt=""
        />
      {/if}
      <span data-edit-text="head_title">{slide.head_title}</span>
      <h2 data-edit-text="title">{slide.title}</h2>
      <p data-edit-text="description">{slide.description}</p>
      <button data-edit-text="buttonText">{slide.buttonText}</button>
    </div>
  {/each}
  <div class="slider-dots">
    {#each block.slides || [] as _, i}
      <button on:click={() => current = i} class:active={i === current} />
    {/each}
  </div>
</div>
