<template>
  <nav :data-block-uid="blockId"
       :aria-label="block.ariaLabel"
       class="context-navigation">
    <button type="button"
            class="context-navigation-toggle"
            :aria-expanded="open ? 'true' : 'false'"
            :aria-controls="`${blockId}-list`"
            @click="open = !open">
      Menu
    </button>
    <ul role="list" :id="`${blockId}-list`" class="context-navigation-list">
      <li v-for="entry in entries" :key="entry.blockId">
        <a :href="entry.itemPath"
           :data-block-uid="entry.blockId"
           :class="entry.classes"
           :aria-current="entry.active ? 'page' : null"
           data-edit-link="href">
          <span data-edit-text="label">{{ entry.block.label }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
// contextNavigation parent renderer.
//
// Walks block.items.items; for each navItem, keeps it as-is; for each
// listing, expands via expandListingBlocks (with the listing's
// fieldMappings.@default mapping @id→href via type='link' and title→label).
// Output: a single flat list. Level for each entry is derived from
// pathDepth(href) relative to the shallowest sibling — the visual indent
// matches URL nesting without any manual `level` field on navItem.
//
// Wrapped in <Suspense> from block.vue because the listing expansion is
// async (fetches via the Plone REST API).
// `ref` from vue; `useRoute` is a Nuxt auto-import composable so no explicit
// import is needed for it (same pattern as ListingBlock.vue).
import { ref } from 'vue';
import { expandListingBlocks, ploneFetchItems } from '@hydra-js/hydra.js';

const props = defineProps({
  blockId: { type: String, required: true },
  block: { type: Object, required: true },
  apiUrl: { type: String, required: true },
  contextPath: { type: String, required: true },
});

const open = ref(true);
const route = useRoute();

const NAV_LISTING_SIZE = 1000;

async function expandChildren() {
  const flat = [];
  for (const childId of props.block.items.items) {
    const child = props.block.blocks[childId];
    if (child['@type'] === 'navItem') {
      flat.push({ block: child, blockId: childId });
    } else if (child['@type'] === 'listing') {
      const result = await expandListingBlocks([childId], {
        blocks: { [childId]: child },
        fetchItems: {
          listing: ploneFetchItems({
            apiUrl: props.apiUrl,
            contextPath: props.contextPath,
          }),
        },
        paging: { start: 0, size: NAV_LISTING_SIZE },
        itemTypeField: 'variation',
      });
      for (const item of result.items) {
        flat.push({ block: item, blockId: item['@uid'] });
      }
    } else {
      throw new Error(`contextNavigation child of @type "${child['@type']}" is not allowed (expected navItem or listing)`);
    }
  }

  const here = route.path.replace(/\/$/, '');
  const pathOf = (entry) =>
    new URL(entry.block.href[0]['@id'], 'http://placeholder').pathname;
  const segsOf = (p) => p.split('/').filter(Boolean);

  const paths = flat.map(pathOf);
  const segs = paths.map(segsOf);
  const depths = segs.map((s) => s.length);
  const minDepth = Math.min(...depths);

  // Smart-expansion filter (default true): drop entries that are
  // descendants of unrelated siblings — typical docs sidebar UX.
  // Mirrors filterByCurrentPath in renderer.js.
  const expandCurrentOnly = props.block.expandCurrentOnly !== false;
  const currSegs = here.split('/').filter(Boolean);
  const startIdx = minDepth - 1;
  const passes = (itemSegs) => {
    if (!expandCurrentOnly) return true;
    const lastItemIdx = itemSegs.length - 1;
    for (let i = startIdx; i < itemSegs.length; i++) {
      if (i >= currSegs.length) return true; // descendant of current
      if (itemSegs[i] !== currSegs[i]) return i === lastItemIdx; // sibling at ancestor level
    }
    return true; // ancestor of current (or current)
  };

  return flat.flatMap((entry, i) => {
    if (!passes(segs[i])) return [];
    const itemPath = paths[i];
    const stripped = itemPath.replace(/\/$/, '');
    const active = stripped === here;
    const inPath = !active && here.startsWith(stripped + '/');
    const level = Math.max(1, Math.min(3, depths[i] - minDepth + 1));
    return [{
      block: entry.block,
      blockId: entry.blockId,
      itemPath,
      active,
      classes: [
        'nav-item',
        `level-${level}`,
        active ? 'current' : '',
        inPath ? 'in-path' : '',
      ].filter(Boolean),
    }];
  });
}

const entries = await expandChildren();
</script>
