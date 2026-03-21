<script>
  import { getImageUrl } from './utils.js';
  export let block;

  $: hrefObj = block.href?.[0] || null;
  $: useBlockData = block.overwrite || !hrefObj?.title;
  $: title = useBlockData ? block.title : hrefObj?.title || '';
  $: description = useBlockData ? block.description : hrefObj?.description || '';
  $: href = hrefObj?.['@id'] || '';
  $: imageSrc = block.preview_image
    ? getImageUrl(block.preview_image)
    : (hrefObj?.hasPreviewImage ? getImageUrl(`${href}/@@images/preview_image`) : '');
</script>

{#if !href}
  <div data-block-uid={block['@uid']} class="teaser-placeholder">
    <p>Select a target page for this teaser</p>
  </div>
{:else}
  <div data-block-uid={block['@uid']} class="teaser-block">
    {#if imageSrc}
      <img data-edit-media="preview_image" src={imageSrc} alt="" />
    {/if}
    <h3 data-edit-text="title">{title}</h3>
    <p data-edit-text="description">{description}</p>
    <a {href} data-edit-link="href">Read more</a>
  </div>
{/if}
