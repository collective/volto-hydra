<script>
  export let block;
  export let content;
</script>

<div data-block-uid={block['@uid']} class="introduction-block">
  <h1 data-edit-text="/title">{content.title}</h1>
  {#if content.description}<p data-edit-text="/description" class="description">{content.description}</p>{/if}
</div>
