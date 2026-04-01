# Level 5: Direct Edit in Your Frontend

This is the most unique element of Hydra. Instead of the editor having to work out where on the sidebar they need to go to make a change on their page, they can click directly on text, images and links and make those changes directly on the frontend.

This requires no special components or choice of frontend framework.

This is done using `data-edit-text|edit-media|edit-link="<<fieldname>>"` and the element it is applied to will now allow direct HTML changes in your frontend which are then sent back to the CMS and reflected in the settings in the sidebar.

```html
<div class="slide" data-block-uid="....">
  <img data-edit-media="image" src="/big_news.jpg"/>
  <h2 data-edit-text="title">Big News</h2>
  <div data-edit-text="description">Check out <b>hydra</b>, it will change everything</div>
  <div><a data-edit-link="url" href="/big_news" data-edit-text="buttonText">Read more</a><div>
</div>
```

## Visual Text Editing

### Simple Text Fields

If the field is simple text (no slate widget), an editor can:

- Click into the rendered text on the frontend and type, adding, removing and cut/pasting
- Type a "/" shortcut to change an empty text block
- Use the Enter key to split the block into two text blocks and Backspace to join them

### Slate (Rich Text) Fields

If the widget is `slate`, an editor can additionally:

- Select text to see what formatting has been applied via buttons on the Quanta Toolbar
- Select text and apply character styles (currently **BOLD**, *ITALIC* & ~~STRIKETHROUGH~~)
- Create or edit linked text
- Apply paragraph formatting
- Use markdown shortcuts like bullet and heading codes (TODO)
- Paste rich text from the clipboard (TODO)

For rich text (slate), add `data-edit-text` to the HTML element that contains the rich text. Additionally, you will need to insert `data-node-id` on each formatting element in your rendered slate text. This lets hydra.js map your custom HTML to the internal data structure so formatting works as expected.

```{note}
These `nodeId`s are only present in data returned by `onEditChange`.
```

### Renderer Node-ID Rules

When rendering Slate nodes to DOM, your renderer must follow these rules for `data-node-id`:

1. **Element nodes** (p, strong, em, etc.) must have `data-node-id` attribute matching the Slate node's `nodeId`
2. **Wrapper elements** — if you add extra wrapper elements around a Slate node, ALL wrapper elements must have the **same** `data-node-id` as the inner element

**Valid wrapper pattern:**
```html
<!-- Slate: { type: "strong", nodeId: "0.1", children: [{ text: "bold" }] } -->
<strong data-node-id="0.1"><b data-node-id="0.1">bold</b></strong>
```

**Invalid (missing node-id on wrapper):**
```html
<!-- DON'T do this - span wrapper has no node-id -->
<span class="my-style"><strong data-node-id="0.1">bold</strong></span>
```

### Complete Slate Rendering Example

**Slate data structure** (note: `value` is an array but always contains a single root node):

```json
{
  "value": [
    {
      "type": "p", "nodeId": "0",
      "children": [
        { "text": "Hello " },
        { "type": "strong", "nodeId": "0.1", "children": [{ "text": "world" }] },
        { "text": "! Visit " },
        { "type": "link", "nodeId": "0.3", "data": { "url": "/about" },
          "children": [{ "text": "our page" }] }
      ]
    }
  ]
}
```

**Renderer:**
```js
function renderSlate(nodes) {
  return (nodes || []).map(node => {
    if (node.text !== undefined) return escapeHtml(node.text);
    const tag = { p:'p', h1:'h1', h2:'h2', strong:'strong', em:'em', link:'a' }[node.type] || 'span';
    const attrs = node.type === 'link' ? ` href="${node.data?.url || '#'}"` : '';
    return `<${tag} data-node-id="${node.nodeId}"${attrs}>${renderSlate(node.children)}</${tag}>`;
  }).join('');
}
```

**Usage:**
```html
<div data-block-uid="block-1" data-edit-text="value">
  <!-- renderSlate(block.value) output goes here -->
</div>
```

## Visual Media Uploading

An editor can:

- Be presented with an empty media element on the frontend with a prompt to upload or pick media
- Remove the currently selected media to pick a different one
- Drag-and-drop an image directly onto a media element on the frontend preview

## Visual Link Editing

You might have a block with a link field like the Slide block. Using `data-edit-link`, in edit mode the click behaviour of that element will be disabled and instead the editor can pick content to link to, enter an external URL, or open the URL in a separate tab.

### Allowed Navigation (`data-linkable-allow`)

Add `data-linkable-allow` to elements that should navigate during edit mode (paging links, facet controls, etc.):

```html
<a href="/page?pg=2" data-linkable-allow>Next</a>
<select data-linkable-allow @change="handleFilter">...</select>
```

## Path Syntax for Editing Parent or Page Fields

The `data-edit-text|edit-media|edit-link` attribute supports Unix-style paths to edit fields outside the current block:

| Path | Target |
|------|--------|
| `fieldName` | The block's own field (default) |
| `../fieldName` | The parent block's field |
| `../../fieldName` | The grandparent's field |
| `/fieldName` | The page metadata field |

```html
<!-- Edit the page title (not inside any block) -->
<h1 data-edit-text="/title">My Page Title</h1>

<!-- Edit the page description -->
<p data-edit-text="/description">Page description here</p>

<!-- Inside a nested block, edit the parent container's title -->
<h3 data-edit-text="../title">Column Title</h3>
```

## Readonly Regions

Add `data-block-readonly` (or `<!-- hydra block-readonly -->` comment) to disable inline editing for all fields inside an element:

```html
<div class="teaser" data-block-uid="teaser-1">
  <div data-block-readonly>
    <h2 data-edit-text="title">Target Page Title</h2>
  </div>
  <a data-edit-link="href" href="/target">Read more</a>
</div>
```
