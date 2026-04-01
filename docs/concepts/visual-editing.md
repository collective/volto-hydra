# Visual Editing

Add data attributes to your rendered HTML to enable progressively richer visual editing:

- **`data-block-uid="blockId"`** — Click-to-select blocks. Hydra.js adds click handlers and shows a blue outline and Quanta toolbar on selected blocks.
- **`data-edit-text="fieldName"`** — Inline text editing. For simple text, click and type directly. For rich text (slate widget), select text to apply formatting via the Quanta toolbar.
- **`data-edit-media="fieldName"`** — Visual media uploading. Editors can upload, pick or drag-and-drop images directly onto the element.
- **`data-edit-link="fieldName"`** — Link editing. Click behaviour is replaced with a link picker to select content, enter an external URL, or open the link.

Example of a fully annotated slide block:

<!-- codeExample: html -->
```html
<div class="slide" data-block-uid="slide-1">
    <img data-edit-media="image" src="/big_news.jpg"/>
    <h2 data-edit-text="title">Big News</h2>
    <div data-edit-text="description">
        Check out <b>hydra</b>, it will change everything
    </div>
    <a data-edit-link="url"
       data-edit-text="buttonText"
       href="/big_news">Read more</a>
</div>
```

## Comment Syntax

If you can't modify the markup (e.g., using a 3rd party component library), use comment syntax to specify block attributes:

<!-- codeExample: html -->
```html
<!-- hydra block-uid=block-123
     edit-text=title(.card-title)
     edit-media=url(img)
     edit-link=href(a.link) -->
<div class="third-party-card">
  <h3 class="card-title">Title</h3>
  <img src="image.jpg">
  <a class="link" href="...">Read more</a>
</div>
<!-- /hydra -->
```

- Attributes without selectors apply to the root element: `block-uid=xxx`
- Attributes with selectors target child elements: `edit-text=title(.card-title)`
- Closing `<!-- /hydra -->` marks end of scope
- Self-closing `<!-- hydra block-uid=xxx /-->` applies only to next sibling element

Supported attributes: `block-uid`, `block-readonly`, `edit-text`, `edit-link`, `edit-media`, `block-add`

## Allowed Navigation (data-linkable-allow)

Add `data-linkable-allow` to elements that should navigate during edit mode (paging links, facet controls, etc.):

<!-- codeExample: html -->
```html
<a href="/page?pg=2" data-linkable-allow>Next</a>
<select data-linkable-allow @change="handleFilter">...</select>
```

## Path Syntax for Parent/Page Fields

The `data-edit-text|edit-media|edit-link` attributes support Unix-style paths to edit fields outside the current block:

- **`fieldName`** — edit the block's own field (default)
- **`../fieldName`** — edit the parent block's field
- **`../../fieldName`** — edit the grandparent's field
- **`/fieldName`** — edit the page metadata field

<!-- codeExample: html -->
```html
<!-- Edit the page title (not inside any block) -->
<h1 data-edit-text="/title">My Page Title</h1>

<!-- Edit the page description -->
<p data-edit-text="/description">Page description here</p>

<!-- Inside a nested block, edit the parent container's title -->
<h3 data-edit-text="../title">Column Title</h3>
```

This allows fixed parts of the page (like headers) to be editable without being inside a block.

## Readonly Regions

Add `data-block-readonly` (or `<!-- hydra block-readonly -->` comment) to disable inline editing for all fields inside an element:

<!-- codeExample: html -->
```html
<div class="teaser" data-block-uid="teaser-1">
  <div data-block-readonly>
    <h2 data-edit-text="title">Target Page Title</h2>
  </div>
  <a data-edit-link="href" href="/target">Read more</a>
</div>
```

Or using comment syntax:

<!-- codeExample: html -->
```html
<!-- hydra block-readonly -->
<div class="listing-item" data-block-uid="item-1">...</div>
```

## Renderer Node-ID Rules

When rendering Slate nodes to DOM, your renderer must follow these rules for `data-node-id`:

1. Element nodes (`p`, `strong`, `em`, etc.) must have `data-node-id` matching the Slate node's `nodeId`
2. Wrapper elements — If you add extra wrapper elements around a Slate node, ALL wrappers must have the same `data-node-id` as the inner element

hydra.js uses node-ids to map between Slate's data model and your DOM. When restoring cursor position after formatting changes, it walks your DOM counting Slate children.

<!-- codeExample: html -->
```html
Valid wrapper pattern:
<strong data-node-id="0.1"><b data-node-id="0.1">bold</b></strong>
Both elements have the same node-id, so they count as one Slate child.

Invalid (missing node-id on wrapper):
<span class="my-style"><strong data-node-id="0.1">bold</strong></span>
This breaks cursor positioning because hydra.js can't correlate DOM structure to Slate structure.
```

## Complete Slate Rendering Example

Slate data structure (value is an array but always contains a single root node):

<!-- codeExample: json -->
```json
{
  "value": [
    {
      "type": "p", "nodeId": "0",
      "children": [
        { "text": "Hello " },
        { "type": "strong", "nodeId": "0.1",
          "children": [{ "text": "world" }] },
        { "text": "! Visit " },
        { "type": "link", "nodeId": "0.3",
          "data": { "url": "/about" },
          "children": [{ "text": "our page" }] }
      ]
    }
  ]
}
```

Renderer:

<!-- codeExample: javascript -->
```javascript
function renderSlate(nodes) {
  return (nodes || []).map(node => {
    if (node.text !== undefined) return escapeHtml(node.text);
    const tag = { p:'p', h1:'h1', h2:'h2', strong:'strong',
                  em:'em', link:'a' }[node.type] || 'span';
    const attrs = node.type === 'link'
      ? ` href="${node.data?.url || '#'}"` : '';
    return `<${tag} data-node-id="${node.nodeId}"${attrs}>${renderSlate(node.children)}</${tag}>`;
  }).join('');
}
```

Usage:

<!-- codeExample: html -->
```html
<div data-block-uid="block-1" data-edit-text="value">
  <!-- renderSlate(block.value) output goes here -->
</div>
```
