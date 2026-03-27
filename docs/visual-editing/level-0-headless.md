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

## Editor Capabilities at Level 0

At this point, an editor can:

- **Login to Hydra** and see the frontend in an iframe — the result will look similar to Volto
  - But they can't see private pages yet because your renderer is not yet logged in
- **Browse in Hydra** (contents view) and your frontend page will change
  - But browsing in your frontend won't yet change the CMS context as it can't detect the page switch
- **Add a page** in Hydra
  - Since pages are created private, you won't see a preview unless you publish first
  - You now need to create a page and give it a title before editing
    - This has the benefit that images added during editing always default to being contained inside the page
- **Edit a page**
  - Selecting, adding, editing and rearranging the block layout is all done via the sidebar
    - You will see more fields than normal Volto to make this possible
  - Only after you save will it reload the iframe and the changes will appear on your frontend
- **Remove a page**
- All other CMS features such as site setup, contents, workflow will work the same as Volto
  - History won't show a visual diff
