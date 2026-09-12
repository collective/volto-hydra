# Cookie Consent Block

A consent banner and a preferences dialog, written by one block. It is the worked example for **revealing the place a FIELD is edited** — `data-block-selector="uid#fieldName"`.

This is a **custom** block — register it via `initBridge`.

**Demonstrates:** [Rendering Containers in Your Frontend](../container-blocks.md#rendering-containers-in-your-frontend) — where the handle syntax, and the rest of `data-block-selector`, is specified.

## Why this block needs field-grained handles

Most blocks are somewhere. This one is in three places at once:

| what | where it lives | on screen? |
|---|---|---|
| the bar | where the block renders | always |
| the **banner**, holding `message` | outside the block's element, usually portalled to `<body>` | until the visitor chooses |
| the **preferences dialog**, holding `analyticsPurpose` | outside the block's element, usually portalled to `<body>` | only when opened |

Two consequences follow, and they are the whole lesson:

1. **"Is the block visible?" answers nothing.** The bar is on screen whatever the other two are doing, so the ordinary reveal — select a block, and if it is hidden, click its handle — finds nothing to do, while the wording an author came to edit stays out of sight.
2. **One handle cannot serve two halves.** `data-block-selector="uid"` is one element and one click. Whichever half it opened, the fields in the other would stay unreachable from the sidebar.

So each trigger names the field its half holds — and so does the half itself:

<!-- codeExample: html -->
```html
<div data-block-uid="{uid}">
  <button data-block-selector="{uid}#message">Show the banner</button>
  <button data-block-selector="{uid}#analyticsPurpose">Show cookie preferences</button>
</div>

<div class="cookie-banner" data-block-selector="{uid}#message" hidden>
  <p data-edit-text="message">…</p>
</div>
<div class="cookie-dialog" data-block-selector="{uid}#analyticsPurpose" hidden>
  <p data-edit-text="analyticsPurpose">…</p>
</div>
```

Put the cursor in **Banner message** in the sidebar and the bridge opens the banner, so it is on screen while its wording is written. Put it in **Analytics cookies — what they are for** and the dialog opens instead. Reaching for a field that is already visible opens nothing at all: the reveal fires only where a handle names that exact field.

**The two sides do different jobs, and both are needed.**

- *On the trigger*, the handle is what the bridge **clicks**. Several elements may carry the same token; the bridge takes the first one that is **on screen**, so the hidden half is never the thing it tries to click.
- *On the half*, the handle is what makes the wording inside it **belong to the block at all**. The editable text is annotated where it is read — inside the banner, inside the dialog — and those elements are nowhere near the block's own element. A `data-edit-*` resolves to the block it is inside, or to the block named by the nearest enclosing `data-block-selector`; with neither, it belongs to nothing and is not editable. Naming the field rather than the bare uid keeps the two halves distinct.

## Schema

```json
{
  "cookieConsent": {
    "id": "cookieConsent",
    "title": "Cookie consent",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "message",
            "analyticsPurpose"
          ]
        }
      ],
      "properties": {
        "message": {
          "title": "Banner message",
          "widget": "slate",
          "description": "Shown in the consent banner, at the foot of every page, until a visitor chooses."
        },
        "analyticsPurpose": {
          "title": "Analytics cookies \u2014 what they are for",
          "widget": "textarea",
          "description": "Shown beside the analytics tick box, inside the preferences dialog."
        }
      },
      "required": []
    }
  }
}
```

## JSON Block Data

```json
{
  "@type": "cookieConsent",
  "message": [
    {
      "type": "p",
      "children": [
        {
          "text": "We use essential cookies to make this site work, and analytics cookies to see how it is used. You can "
        },
        {
          "type": "link",
          "data": {
            "url": "/cookies"
          },
          "children": [
            {
              "text": "manage your cookie settings"
            }
          ]
        },
        {
          "text": " at any time."
        }
      ]
    }
  ],
  "analyticsPurpose": "Counts visits and pages, so we can see what is worth improving. Never used to identify you."
}
```

## Rendering

### React

<!-- file: examples/react/CookieConsentBlock.jsx -->
```jsx
// A block drawn in three places, two of them hidden.
//
// Cookie consent is the everyday case for `data-block-selector="uid#field"`.
// The block's own element is a bar; its `message` is read in a BANNER at the
// foot of the page, and its `analyticsPurpose` beside a tick box inside a
// PREFERENCES DIALOG. Both sit OUTSIDE the block's element — a real frontend
// usually portals them to <body>, which is where a design system's own
// JavaScript puts them — and both are hidden until their trigger is pressed.
//
// So "is the block visible?" is the wrong question: the bar is always visible,
// and neither half of what an author writes is. Each trigger therefore names
// the FIELD its half holds, and the bridge opens the half whose field the
// author reached for in the sidebar.
function CookieConsentBlock({ block }) {
  const uid = block['@uid'];
  const [showBanner, setShowBanner] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      {/* The block's own element: always on screen, and the way back to two
          halves a visitor may already have dismissed. */}
      <div data-block-uid={uid} className="cookie-consent__bar">
        <strong>Cookie consent</strong>
        <button
          type="button"
          // "I reveal where `message` is edited." Put the cursor in Banner
          // message in the sidebar and the bridge clicks this, so the banner is
          // on screen while its wording is written.
          data-block-selector={`${uid}#message`}
          onClick={() => setShowBanner(true)}
        >
          Show the banner
        </button>
        <button
          type="button"
          // The other half. One handle could not serve both: it is one click,
          // and whichever it opened, the other half's wording would stay
          // unreachable from the sidebar.
          data-block-selector={`${uid}#analyticsPurpose`}
          onClick={() => setShowDialog(true)}
        >
          Show cookie preferences
        </button>
      </div>

      {/* Outside the block's element, and annotated where the text is READ.
          Each half advertises the field it holds, as well as the bar's trigger doing so.
          Without that the wording inside belongs to no block — it sits outside the block's
          element, so `data-edit-text` there resolves to nothing and cannot be edited. The
          trigger in the bar is still what the bridge CLICKS: a hidden handle cannot open
          anything, so the bridge takes the first one that is on screen. */}
      <div
        className="cookie-banner"
        data-block-selector={`${uid}#message`}
        hidden={!showBanner}
        role="alert"
      >
        <p data-edit-text="message">{slateToText(block.message)}</p>
        <button type="button" onClick={() => setShowBanner(false)}>
          Accept all
        </button>
        <button type="button" onClick={() => setShowDialog(true)}>
          Manage preferences
        </button>
      </div>

      <div
        className="cookie-dialog"
        data-block-selector={`${uid}#analyticsPurpose`}
        hidden={!showDialog}
        role="dialog"
      >
        <h2>Manage cookie preferences</h2>
        <label>
          <input type="checkbox" name="analytics" />
          Analytics
        </label>
        <p data-edit-text="analyticsPurpose">{block.analyticsPurpose}</p>
        <button type="button" onClick={() => setShowDialog(false)}>
          Save
        </button>
      </div>
    </>
  );
}

// Slate is an array of nodes; the banner shows its text. A real frontend would
// render the marks and links too — kept flat here so the pattern stays visible.
function slateToText(value) {
  if (!Array.isArray(value)) return '';
  return value
    .map(node => (node.text ?? (node.children || []).map(c => c.text ?? '').join('')))
    .join('');
}
```

### Vue

<!-- file: examples/vue/CookieConsentBlock.vue -->
```vue
<template>
  <!--
    A block drawn in three places, two of them hidden.

    The block's own element is the bar; its `message` is read in a BANNER at the
    foot of the page and its `analyticsPurpose` beside a tick box in a
    PREFERENCES DIALOG. Both sit OUTSIDE the block's element — a real frontend
    usually teleports them to <body>, where a design system's own JavaScript
    puts them — and both are hidden until their trigger is pressed. So "is the block visible?" is the wrong question, and each trigger
    names the FIELD its half holds instead.
  -->
  <div class="cookie-consent">
    <div :data-block-uid="block['@uid']" class="cookie-consent__bar">
      <strong>Cookie consent</strong>
      <!-- "I reveal where `message` is edited": focusing Banner message in the
           sidebar makes the bridge click this, so the banner is on screen while
           its wording is written. -->
      <button type="button"
        :data-block-selector="`${block['@uid']}#message`"
        @click="showBanner = true">Show the banner</button>
      <!-- The other half. One handle is one click, so a block-level handle
           could only ever open one of the two. -->
      <button type="button"
        :data-block-selector="`${block['@uid']}#analyticsPurpose`"
        @click="showDialog = true">Show cookie preferences</button>
    </div>

    <!-- Both halves live outside this block's DOM, so their editable text is
         annotated where it is READ. A real frontend often teleports these to
         <body>, where a design system's own JavaScript puts them; sibling
         elements are the same thing as far as the bridge is concerned — outside
         the block's element, and hidden. -->
      <div class="cookie-banner" :data-block-selector="`${block['@uid']}#message`"
        :hidden="!showBanner" role="alert">
        <p data-edit-text="message">{{ slateToText(block.message) }}</p>
        <button type="button" @click="showBanner = false">Accept all</button>
        <button type="button" @click="showDialog = true">Manage preferences</button>
      </div>
      <div class="cookie-dialog" :data-block-selector="`${block['@uid']}#analyticsPurpose`"
        :hidden="!showDialog" role="dialog">
        <h2>Manage cookie preferences</h2>
        <label><input type="checkbox" name="analytics" /> Analytics</label>
        <p data-edit-text="analyticsPurpose">{{ block.analyticsPurpose }}</p>
        <button type="button" @click="showDialog = false">Save</button>
      </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ block: Object });
const showBanner = ref(true);
const showDialog = ref(false);

// Slate is an array of nodes; the banner shows its text. A real frontend would
// render the marks and links too — kept flat here so the pattern stays visible.
function slateToText(value) {
  if (!Array.isArray(value)) return '';
  return value
    .map((node) => node.text ?? (node.children || []).map((c) => c.text ?? '').join(''))
    .join('');
}
</script>
```

### Svelte

<!-- file: examples/svelte/CookieConsentBlock.svelte -->
```svelte
<script>
  // A block drawn in three places, two of them hidden. The bar is the block's
  // own element; `message` is read in a banner at the foot of the page and
  // `analyticsPurpose` beside a tick box in a preferences dialog, both hidden
  // until their trigger is pressed. Each trigger names the FIELD its half holds,
  // because one block-level handle is one click and could open only one of them.
  export let block;

  let showBanner = true;
  let showDialog = false;

  // Slate is an array of nodes; the banner shows its text.
  function slateToText(value) {
    if (!Array.isArray(value)) return '';
    return value
      .map((node) => node.text ?? (node.children || []).map((c) => c.text ?? '').join(''))
      .join('');
  }
</script>

<div data-block-uid={block['@uid']} class="cookie-consent">
  <div class="cookie-consent__bar">
    <strong>Cookie consent</strong>
    <button type="button"
      data-block-selector={`${block['@uid']}#message`}
      on:click={() => (showBanner = true)}>Show the banner</button>
    <button type="button"
      data-block-selector={`${block['@uid']}#analyticsPurpose`}
      on:click={() => (showDialog = true)}>Show cookie preferences</button>
  </div>
</div>

<!-- Svelte renders these where they are written; a real frontend would portal
     them to <body>, as the React and Vue examples do. What matters for the
     pattern is that they are OUTSIDE the block's element and hidden. -->
<div class="cookie-banner" data-block-selector={`${block['@uid']}#message`}
  hidden={!showBanner} role="alert">
  <p data-edit-text="message">{slateToText(block.message)}</p>
  <button type="button" on:click={() => (showBanner = false)}>Accept all</button>
  <button type="button" on:click={() => (showDialog = true)}>Manage preferences</button>
</div>

<div class="cookie-dialog" data-block-selector={`${block['@uid']}#analyticsPurpose`}
  hidden={!showDialog} role="dialog">
  <h2>Manage cookie preferences</h2>
  <label><input type="checkbox" name="analytics" /> Analytics</label>
  <p data-edit-text="analyticsPurpose">{block.analyticsPurpose}</p>
  <button type="button" on:click={() => (showDialog = false)}>Save</button>
</div>
```

### Astro

<!-- file: examples/astro/CookieConsentBlock.astro -->
```astro
---
/**
 * Cookie consent — a block drawn in three places, two of them hidden.
 *
 * The bar is the block's own element. Its `message` is read in a banner at the
 * foot of the page, and its `analyticsPurpose` beside a tick box in a
 * preferences dialog: both outside this block's DOM, both hidden until their
 * trigger is pressed. So asking whether the BLOCK is visible answers nothing —
 * the bar always is — and each trigger names the FIELD its half holds, so the
 * bridge can open the half whose field the author reached for in the sidebar.
 *
 * Server-rendered: the halves ship hidden and a small inline script opens them,
 * which is also what lets the bridge reveal one by clicking its trigger.
 */
const { block } = Astro.props;
const uid = block['@uid'];
const slateToText = (value: any) =>
  Array.isArray(value)
    ? value
        .map((node: any) => node.text ?? (node.children || []).map((c: any) => c.text ?? '').join(''))
        .join('')
    : '';
---
<div data-block-uid={uid} class="cookie-consent">
  <div class="cookie-consent__bar">
    <strong>Cookie consent</strong>
    <button type="button" data-block-selector={`${uid}#message`} data-opens="cookie-banner">
      Show the banner
    </button>
    <button type="button" data-block-selector={`${uid}#analyticsPurpose`} data-opens="cookie-dialog">
      Show cookie preferences
    </button>
  </div>
</div>

<div class="cookie-banner" id="cookie-banner" data-block-selector={`${uid}#message`} role="alert">
  <p data-edit-text="message">{slateToText(block.message)}</p>
</div>

<div class="cookie-dialog" id="cookie-dialog" data-block-selector={`${uid}#analyticsPurpose`} role="dialog" hidden>
  <h2>Manage cookie preferences</h2>
  <label><input type="checkbox" name="analytics" /> Analytics</label>
  <p data-edit-text="analyticsPurpose">{block.analyticsPurpose}</p>
</div>

<script>
  // The component's own behaviour. The bridge never knows about it: it clicks
  // the trigger, and whatever the component does in response is what reveals
  // the half.
  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement)?.closest?.('[data-opens]');
    if (!trigger) return;
    document.getElementById(trigger.getAttribute('data-opens')!)?.removeAttribute('hidden');
  });
</script>
```
