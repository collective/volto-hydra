<template>
  <div :data-block-uid="blockId" class="listing-block">
    <div v-for="item in items" :key="item['@uid']" :data-block-uid="item['@uid']" class="listing-item">
      <img v-if="block.variation === 'summary' && item.image" :src="item.image" alt="" />
      <h3><a :href="item.href">{{ item.title }}</a></h3>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ block: Object, blockId: String });
const items = ref([]);

watch(() => props.block.querystring, async () => {
  const result = await expandListingBlocks(
    { [props.blockId]: props.block },
    [props.blockId],
    props.blockId,
  );
  items.value = result.items;
}, { immediate: true });
</script>
