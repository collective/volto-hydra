<script>
  import SlateNode from './SlateNode.svelte';
  export let block;

  const calloutLevels = {
    note:      { label: 'Note',      color: '#2563eb', bg: '#eff6ff' },
    tip:       { label: 'Tip',       color: '#059669', bg: '#ecfdf5' },
    warning:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
    important: { label: 'Important', color: '#dc2626', bg: '#fef2f2' },
  };
  $: level = calloutLevels[block.variation] || calloutLevels.note;
</script>

<aside
  data-block-uid={block['@uid']}
  class="callout callout--{block.variation || 'note'}"
  style="border-left:4px solid {level.color};background:{level.bg};padding:12px 16px;border-radius:4px;margin:1em 0"
>
  <div class="callout__label" style="font-weight:700;color:{level.color};text-transform:uppercase;font-size:0.8em;letter-spacing:0.05em;margin-bottom:4px">
    {level.label}
  </div>
  <div class="callout__body" data-edit-text="value">
    {#each block.value || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
</aside>
