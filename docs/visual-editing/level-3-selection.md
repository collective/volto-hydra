# Level 3: Frontend Block Selection and Quanta Toolbar

Now that you have defined your blocks and your frontend renders them, in edit mode you can make blocks selectable using a tag that the bridge will use to locate which HTML represents your block.

## Editor Capabilities at Level 3

- **Click directly** on your block on the frontend preview to select it and edit the block settings in the sidebar
  - The block will be highlighted and a toolbar (called the Quanta Toolbar) will appear above it
- **Selecting a block in the sidebar** will highlight that block on the frontend and scroll it into view
- If your block is rendered as **multiple items**, give each one the same `data-block-uid`. Selecting one will select all of them.

## Adding Block UIDs

In your frontend, insert the `data-block-uid={<<BLOCK_UID>>}` attribute to your outermost HTML element of the rendered block HTML. (Note: this only needs to be done during editing.)

For our slider example, while editing we render our slider to include these extra data attributes:

```html
<div class="slider" data-block-uid="....">
  <div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      <img src="/big_news.jpg"/>
      <h2>Big News</h2>
      <div>Check out <b data-node-id="...">hydra</b>, it will change everything</div>
      <div><a href="/big_news">Read more</a><div>
    </div>
    <div class="slide" data-block-uid="...." data-block-add="right">
      ...
    </div>
  </div>
  <a data-block-selector="-1" link="">Prev></a>
  <a data-block-selector="+1" link="">Next></a>
</div>
```

Hydra.js will find these block markers and register click handlers and show a blue line around your blocks when selected.

## Comment Syntax

If you can't modify the markup (e.g., using a 3rd party component library), use comment syntax to specify block attributes:

```html
<!-- hydra block-uid=block-123 edit-text=title(.card-title) edit-media=url(img) edit-link=href(a.link) -->
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

## Sub Blocks

You don't need to mark the element sub-blocks live in — just render the blocks with the uid like top-level blocks.

```{note}
- `data-block-add="bottom|right"` is useful if blocks are going to be added in a non-standard direction. By default it will be the opposite of its parent.
- If your blocks are rendered with paging, you can enable the UI to allow selection of a block from the sidebar by tagging your paging buttons with `data-block-selector="-x|+y|<<block_uid>>"`.
```

### Empty Blocks

A blocks field can never be left empty. If the last child block is deleted, either the `defaultBlockType` will be added, or a special block of type `"empty"` will be added.

- These will be stripped out before saving
- They will have `@type: "empty"` and a random id
- You can render them however you like but ensure they take up the space a typical sub-block would
- Hydra will put a "+" button in its middle which the user can use to replace this block
  - You can override the look by rendering something else inside the empty block and adding `data-block-add="button"` to it
