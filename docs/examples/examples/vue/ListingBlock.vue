<template>
  <div :data-block-uid="blockId" class="listing-block">
    <BlockRenderer v-for="(item, i) in items" :key="i" :block="item" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ block: Object, blockId: String });
const items = ref([]);

watch(() => props.block.querystring, async () => {
  const fetchItems = ploneFetchItems({ apiUrl: API_URL });
  const result = await expandListingBlocks([props.blockId], {
    blocks: { [props.blockId]: props.block },
    fetchItems: { listing: fetchItems },
    itemTypeField: 'variation',
  });
  items.value = result.items;
}, { immediate: true });
</script>
