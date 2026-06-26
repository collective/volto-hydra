<template>
  <nav
    :data-block-uid="block['@uid']"
    :aria-label="block.ariaLabel || 'Section navigation'"
    class="context-navigation"
  >
    <ul role="list" class="context-navigation-list">
      <li v-for="id in (block.blocks_layout?.items || [])" :key="id">
        <NavItem :block="{ ...blocks[id], '@uid': id }" />
      </li>
    </ul>
  </nav>
</template>

<script setup>
import NavItem from './NavItem.vue';
defineProps({ block: Object, blocks: Object });
</script>
