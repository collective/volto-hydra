<template>
  <div :data-block-uid="blockId" class="search-block">
    <input type="search" placeholder="Search..." v-model="query" />

    <div v-if="visibleFacets.length" class="facets">
      <h4>{{ block.facetsTitle || 'Filter' }}</h4>
      <template v-for="facet in visibleFacets" :key="facet['@id']">
        <fieldset v-if="facet.type === 'checkboxFacet'">
          <legend>{{ facet.title }}</legend>
          <!-- checkbox options -->
        </fieldset>
        <label v-else-if="facet.type === 'selectFacet'">
          {{ facet.title }}<select><!-- options --></select>
        </label>
        <label v-else-if="facet.type === 'daterangeFacet'">
          {{ facet.title }}<input type="date" /> – <input type="date" />
        </label>
        <label v-else-if="facet.type === 'toggleFacet'">
          <input type="checkbox" /> {{ facet.title }}
        </label>
      </template>
    </div>

    <ListingBlock
      v-if="listingBlock"
      :block="listingBlock"
      :block-id="listingId"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
const props = defineProps({ block: Object, blockId: String });
const query = ref('');
const visibleFacets = computed(() => (props.block.facets || []).filter(f => !f.hidden));
const listingId = computed(() => props.block.listing?.items?.[0]);
const listingBlock = computed(() => listingId.value ? props.block.blocks?.[listingId.value] : null);
</script>
