<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']}>
  <table>
    <tbody>
      {#each block.table?.rows || [] as row (row.key)}
        <tr data-block-uid={row.key}>
          {#each row.cells as cell (cell.key)}
            <td data-block-uid={cell.key} data-edit-text="value">
              {#each cell.value || [] as node, i (i)}
                <SlateNode {node} />
              {/each}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
