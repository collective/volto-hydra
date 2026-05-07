# Level 0: Headless Frontend (No Hydra Visual Editing)

First, start with a frontend technology of your choice. Since our goal is to not modify the CMS, we will initially be stuck with the out-of-the-box CMS block types and content types.

You can use whatever frontend technology you want, but a basic Vue.js example might be:

`[...slug].vue`:

```vue
<template>
    <Header :data="data"/>
    <content>
            <Block  :block_id="block_id" :block="data.blocks[block_id]" :data="data" v-for="block_id in data.blocks_layout.items"/>
    </content>
    <Footer :data="data/>
</template>
<script setup>
const { data, error } = await ploneApi({});
</script>
```

Now you have a true headless site where the deployment of your frontend is not tightly integrated with your editor.

## What editors can do at Level 0

The frontend is a true headless site — its deployment isn't tied to the CMS. With no Hydra integration yet, the editing experience is **sidebar-driven**:

- All block selection, editing, and rearrangement happens in the sidebar (no clicking in the preview).
- The preview reloads after save; until then, sidebar changes don't appear in it.
- Browsing in Hydra navigates the iframe, but browsing in the frontend doesn't update Hydra's context (no bridge yet).
- Pages must be created and titled before they can be edited.
- Private pages don't render in the preview yet (the frontend isn't authenticated — see Level 1).
- Live updates with SSR via REST API are still on the roadmap (TODO).
- All other CMS features (site setup, content tree, workflow) work the same as standard Volto. (Visual diff in history is still a TODO.)

Editors who want any of the visual interactions described in the [Editor Guide](../editor-guide/index.md) (click-to-select, inline text editing, drag-and-drop, etc.) need at least Level 3 integration — see the next levels.
