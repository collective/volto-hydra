---
"@type": Document
UID: e090d954d0a448bca81c1a646e673a12
allow_discussion: false
contributors: []
creators:
  - admin
description: The maps block can have embeded a Map (Google Maps, OpenMaps, etc).
effective: 2023-09-22T16:09:00
exclude_from_nav: false
expires: null
id: maps
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Maps
assignments:
  - { uid: 68370edd-bfe5-47fb-937e-16a19a3a92ad, type: title }
  - { uid: ref-maps-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: e36a9020-5e7e-4ef5-97f7-862c45fea81c, type: maps }
  - { uid: 96789bf6-953b-4777-a022-0f4cd852be64, type: separator }
  - { uid: ce3be1bc-5e35-409d-971b-194bb084db4a, type: slate }
  - { uid: 7248c659-f678-4e2f-8ac7-5bc5a8abf729, type: slate }
  - { uid: bd950eb2-f462-4146-9d4a-3c8139abbb94, type: maps }
  - { uid: d5fe5f6d-2a9b-4e65-b5bf-2faded6073b7, type: separator }
  - { uid: b94908e2-0600-493a-8a92-0b8a23e2938b, type: slate }
  - { uid: 6ce27ed7-7470-4f83-a418-31b2c23e7f50, type: maps }
  - { uid: 0e3611aa-3dfe-421b-a8dc-c45ec3cf7262, type: slate }
  - { uid: 3dac46d2-adca-4557-bcab-9a85015804cf, type: slate }
  - { uid: fa7180fb-feab-42fc-adb4-eafc20f8b1c6, type: slate }
  - { uid: 642c75ac-0c4a-4138-8ad7-954a3fa561e6, type: maps }
  - { uid: aaf7adb1-00b2-4cc2-8729-91c33ea8fe6a, type: slate }
  - { uid: 43a4b392-f0c3-4b8d-a17d-9b4ddea3f0f0, type: slate }
  - { uid: 2df07c02-09d1-4da5-b3ad-ce58f5629fb8, type: slate }
  - { uid: a469581f-f805-4e31-a880-3fc05b3959f2, type: slate }
  - { uid: ceee1cfa-80ff-44f1-b3af-3cfd4be3f4ba, type: maps }
  - { uid: f9dec030-b72d-4940-af4c-6dc123cea7a6, type: slate }
  - { uid: ref-maps-schema, type: codeExample }
  - { id: ref-maps-schema-javascript-45f9f0 }
  - { uid: ref-maps-json-data, type: codeExample }
  - { id: ref-maps-json-data-json-04466f }
  - { uid: ref-maps-rendering, type: codeExample }
  - { id: ref-maps-rendering-jsx-7fbc14 }
  - { id: ref-maps-rendering-vue-85ab6d }
  - { id: ref-maps-rendering-svelte-4d9083 }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Embeds a map from a URL (Google Maps, OpenStreetMap, etc.) using an iframe. The url field should contain the embed URL, and title provides an accessible label.

<block type="image" url="/docs/images/maps-edit" alt="The maps example block being edited in Volto Hydra" align="center" size="l" />

<block type="maps" align="wide" title="Plone Conference 2024 Location" data='{"styles":{},"url":"https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d48400.376998388674!2d-47.9029345500163!3d-15.808744945878342!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sde!2sde!4v1710241027280!5m2!1sde!2sde"}' />

<block type="separator" data='{"styles":{"align":"full"}}' />

## Text Heading H2&#x20;

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="maps" align="center" title="Ploneconf 2022 was in Namur, Belgium " data='{"styles":{},"url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2468.496805908769!2d4.867355714504337!3d50.46334407876937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c1996d6ee4733f%3A0x1e62003289f50ea5!2zVGjDqcOidHJlIGRlIE5hbXVy!5e1!3m2!1sde!2sde!4v1710240653269!5m2!1sde!2sde"}' />

<block type="separator" data='{"styles":{"align":"left"}}' />

### Text Heading H3

<block type="maps" align="right" title="Ploneconf 2023 was in Eibar, Basque Country" data='{"styles":{},"url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11636.817018227113!2d-2.482132780659554!3d43.184224884135176!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd4e2a88f426a197%3A0x4d516b1201c5b562!2s20600%20Eibar%2C%20Gipuzkoa%2C%20Spanien!5e0!3m2!1sde!2sde!4v1710240766721!5m2!1sde!2sde"}' />

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore

blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore

blandit praesent luptatum zzril qui.

<block type="maps" align="left" title="Ploneconf 2018 was in Tokyo, Japan" url="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d205767.4968598755!2d139.73212733058264!3d35.74059553032941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sde!2sde!4v1710240866243!5m2!1sde!2sde" data='{"styles":{}}' />

### Text Heading H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore

blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore

blandit praesent luptatum zzril qui.

<block type="maps" align="full" title="Ploneconf 2019 was in Ferrara, Italy" data='{"styles":{},"url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d22634.237371369458!2d11.585803356749143!3d44.83623754078171!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477e4e0bde2b11dd%3A0x3c3b79ae53712b2e!2sFerrara%2C%20Italien!5e0!3m2!1sde!2sde!4v1710240969607!5m2!1sde!2sde"}' />

<block type="slate" />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-maps" slotId="schema">

### Schema

```javascript
{
  "maps": {
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Map Embed URL"
        },
        "title": {
          "title": "Title",
          "type": "string"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-maps" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "maps",
  "url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2468.496805908769!2d4.867355714504337!3d50.46334407876937!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c1996d6ee4733f%3A0x1e62003289f50ea5!2zVGjDqcOidHJlIGRlIE5hbXVy!5e1!3m2!1sde!2sde!4v1710240653269!5m2!1sde!2sde",
  "title": "Ploneconf 2022 was in Namur, Belgium"
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-maps" slotId="rendering">

### React

```jsx
function MapsBlock({ block }) {
  const url = block.url || '';

  return (
    <div data-block-uid={block['@uid']} className="maps-block">
      {url ? (
        <iframe
          src={url}
          title={block.title || 'Map'}
          allowFullScreen
          loading="lazy"
          style={{ width: '100%', height: '450px', border: 'none' }}
        />
      ) : (
        <p>No map URL set</p>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="maps-block">
    <iframe
      v-if="block.url"
      :src="block.url"
      :title="block.title || 'Map'"
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
    <p v-else>No map URL set</p>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

```svelte
<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} class="maps-block">
  {#if block.url}
    <iframe
      src={block.url}
      title={block.title || 'Map'}
      allowfullscreen
      loading="lazy"
      style="width: 100%; height: 450px; border: none"
    />
  {:else}
    <p>No map URL set</p>
  {/if}
</div>
```

</block>
