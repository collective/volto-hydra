<!-- pages/[...slug].vue -->
<template>
  <!-- data-block-uid: makes block selectable, draggable, and editable -->
  <div v-for="id in page?.blocks_layout?.items" :key="id"
       :data-block-uid="editing ? id : undefined">
    <!-- data-edit-link: click to edit link URL in sidebar -->
    <a :href="page.blocks[id].link"
       :data-edit-link="editing ? 'link' : undefined">
      <!-- data-edit-media: click to pick/upload image in sidebar -->
      <img :src="page.blocks[id].image"
           :data-edit-media="editing ? 'image' : undefined" />
      <!-- data-edit-text: edit text directly in the preview -->
      <h3 :data-edit-text="editing ? 'title' : undefined">
        {{ page.blocks[id].title }}
      </h3>
      <p :data-edit-text="editing ? 'description' : undefined">
        {{ page.blocks[id].description }}
      </p>
    </a>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { initBridge } from 'hydra-js'

const page = ref(null)
const editing = ref(false)

onMounted(async () => {
  // Only init bridge when loaded inside the editor
  if (window.name.startsWith('hydra')) {
    editing.value = true
    initBridge({
      // Register custom block types with their field schemas
      blocks: {
        card: { blockSchema: { properties: {
          image: { widget: 'image' },
          title: { type: 'string' },
          description: { type: 'string' },
          link: { widget: 'url' },
        }}}
      },
      // Receive live updates as editor changes content
      onEditChange: (data) => { page.value = data }
    })
  } else {
    const res = await fetch(`/++api++${useRoute().path}`)
    page.value = await res.json()
  }
})
</script>
