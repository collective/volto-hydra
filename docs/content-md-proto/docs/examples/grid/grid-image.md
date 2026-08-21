---
"@type": Document
UID: 28cc586c504d436aa26fd2aa12f16f84
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The Grid block allows adding multi-column blocks. A grid block can contain
  between one and four columns of different blocks. Text, teasers, images and
  videos can be added in a grid block.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: grid-image
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Grid-image block
blocks-assignments:
  - { uid: a1c1ca3e-6643-4e39-abda-3bf7846daeef }
  - { uid: f285924d-8f1c-4cc6-8505-5d506cf5fb7f }
  - { uid: 313a4e76-dc52-4c36-b8bf-5aac8b605eca }
  - { uid: 83675906-07fc-468d-b0f3-71536fcb81eb }
  - { uid: df0eac4f-de62-444e-9ee0-9a30cf53bce3 }
  - { uid: 10dcdda6-cbbc-4de7-9542-fb9ca7df4638 }
  - { uid: c76741bb-803f-4680-8bee-cb4bdaedf284 }
  - { uid: f6af399c-afa2-4f21-8cd8-0c7fd1178d89 }
  - { uid: eaa34549-1998-45a4-957e-2ea5d7cf41c4 }
  - { uid: b4ca1a34-cf52-45c7-963a-6e0b09d46e49 }
  - { uid: f2bea32a-e68e-496e-8c47-8ba97c7a0203 }
  - { uid: 5026c16c-7ed3-4c0d-9417-1d242980a9c0 }
  - { uid: da85c8f3-5de2-4d66-822d-a177e42821ff }
  - { uid: b6bc575a-f53b-4ce6-8a83-1340aa5bddb7 }
  - { uid: 005c5f82-50a6-43b5-a2a0-2e2d79575a7a }
  - { uid: 9c34ee64-05bd-470f-ba3c-de604ec47591 }
  - { uid: fbb92003-0e22-4937-92af-3a8f3d061f60 }
  - { uid: 527d1573-85c1-47c7-928a-8dea32153e83 }
  - { uid: abd3504f-b4dd-48a9-97e2-923f2e63a957 }
  - { uid: 5e227a15-09e6-49f7-8679-e0b588059e1f }
  - { uid: 14b875e3-8bda-4610-98dc-ebbd03b8c929 }
  - { uid: b1015ec4-9ddf-4e59-b6bf-214fc12c3a3d }
  - { uid: 34340073-e534-42ad-9cfb-8eab299228a9 }
  - { uid: e800de8b-25f2-4a40-a3c6-189bec399a45 }
  - { uid: b769baa0-8834-4434-b1d6-4b612aa6f714 }
  - { uid: d8ed659a-020b-4688-9d72-42c518677d4a }
  - { uid: f4117857-1464-41c6-8e74-70f82f393891 }
  - { uid: ab3542da-d0d1-450e-abf3-a5f9e6f3eb97 }
  - { uid: a7d1d9b8-1caa-41cd-825e-15d4564a57f6 }
blocks-matched: |
  <block type="title" _="${h1}" />
  <block type="image" description="${p?/text}" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="image" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
blocks-tagged: |
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
---

# Grid-image block

<block type="gridBlock">

## Block Title

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<fields data-json='{"styles":{"backgroundColor":"grey"}}'>

<block type="gridBlock">

## Block Title

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data-json='{"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

</fields>
