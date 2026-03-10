<script>
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href || '#';
</script>

<div data-block-uid={block['@uid']} class="button-block">
  <a {href} data-edit-text="title" data-edit-link="href" class="btn">
    {block.title || 'Button'}
  </a>
</div>
