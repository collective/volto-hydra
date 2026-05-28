<template>
  <div :data-block-uid="block['@uid']">
    <table>
      <tbody>
        <tr v-for="row in block.table?.rows || []" :key="row.key" :data-block-uid="row.key">
          <td v-for="cell in row.cells" :key="cell.key" :data-block-uid="cell.key" data-edit-text="value">
            <SlateNode v-for="(node, i) in cell.value || []" :key="i" :node="node" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
