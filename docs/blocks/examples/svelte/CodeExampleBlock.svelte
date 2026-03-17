<script>
  export let block;
  let activeTab = 0;
  $: tabs = block.tabs || [];
</script>

<div data-block-uid={block['@uid']} class="code-example" data-block-container='{JSON.stringify({add:"horizontal"})}'>
  {#if tabs.length > 1}
    <div data-tab-bar style="display:flex; background:#1f2937; border-bottom:1px solid #374151">
      {#each tabs as tab, i}
        <button data-block-uid={tab['@id']} data-linkable-allow
          on:click={() => activeTab = i}
          style="padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; border:none; cursor:pointer; background:{activeTab === i ? '#111827' : 'transparent'}; color:{activeTab === i ? '#fff' : '#9ca3af'}; border-bottom:{activeTab === i ? '2px solid #60a5fa' : '2px solid transparent'}">
          <span data-edit-text="label">{tab.label || tab.language || `Tab ${i + 1}`}</span>
        </button>
      {/each}
    </div>
  {/if}
  {#each tabs as tab, i}
    <div data-block-uid={tab['@id']} data-block-add="right"
      style="display:{activeTab === i ? 'block' : 'none'}">
      <pre data-edit-text="code" style="background:#1e1e1e; color:#d4d4d4; padding:1rem; border-radius:{tabs.length > 1 ? '0' : '8px'}; overflow:auto; font-size:0.875rem; margin:0; white-space:pre-wrap">
        <code class={tab.language ? `language-${tab.language}` : undefined}>{tab.code || ''}</code>
      </pre>
    </div>
  {/each}
</div>
