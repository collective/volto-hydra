<script>
  import NavItem from './NavItem.svelte';
  export let block;
  export let blocks;
  $: items = block.blocks_layout?.items || [];
</script>

<nav
  data-block-uid={block['@uid']}
  aria-label={block.ariaLabel || 'Section navigation'}
  class="context-navigation"
>
  <ul role="list" class="context-navigation-list">
    {#each items as id (id)}
      <li>
        <NavItem block={{ ...blocks[id], '@uid': id }} />
      </li>
    {/each}
  </ul>
</nav>
