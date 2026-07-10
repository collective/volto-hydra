<script>
  import { getImageUrl } from './utils.js';
  export let block;
  let current = 0;
  // Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide's @uid.
  $: slides = expandTemplatesSync(block.slides || [], { idField: '@id' });
</script>

<div data-block-uid={block['@uid']} class="slider-block">
  {#each slides as slide, i (slide['@id'])}
    <div
      data-block-uid={slide['@id']}
      class="slide"
      style:display={i === current ? 'block' : 'none'}
    >
      {#if slide.preview_image}
        <img
          data-edit-media="preview_image"
          src={getImageUrl(slide.preview_image)}
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
    {#each slides as _, i}
      <button on:click={() => current = i} class:active={i === current} />
    {/each}
  </div>
</div>
