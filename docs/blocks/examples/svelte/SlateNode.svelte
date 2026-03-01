<script>
  export let node;
</script>

{#if node.type === 'p'}
  <p>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</p>
{:else if node.type === 'h1'}
  <h1>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h1>
{:else if node.type === 'h2'}
  <h2>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h2>
{:else if node.type === 'h3'}
  <h3>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</h3>
{:else if node.type === 'blockquote'}
  <blockquote>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</blockquote>
{:else if node.type === 'ul'}
  <ul>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</ul>
{:else if node.type === 'ol'}
  <ol>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</ol>
{:else if node.type === 'li'}
  <li>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</li>
{:else if node.type === 'link'}
  <a href={node.data?.url}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</a>
{:else if node.type === 'strong'}
  <strong>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</strong>
{:else if node.type === 'em'}
  <em>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</em>
{:else if node.type === 'del'}
  <del>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</del>
{:else if node.type === 'u'}
  <u>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</u>
{:else if node.type === 'code'}
  <code>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</code>
{:else}
  {node.text}
{/if}
