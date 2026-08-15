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
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Grid-image block
assignments:
  - { uid: a1c1ca3e-6643-4e39-abda-3bf7846daeef, type: title }
  - { uid: f285924d-8f1c-4cc6-8505-5d506cf5fb7f, type: gridBlock }
  - { uid: 313a4e76-dc52-4c36-b8bf-5aac8b605eca, type: image }
  - { uid: 83675906-07fc-468d-b0f3-71536fcb81eb, type: gridBlock }
  - { uid: df0eac4f-de62-444e-9ee0-9a30cf53bce3, type: image }
  - { uid: 10dcdda6-cbbc-4de7-9542-fb9ca7df4638, type: image }
  - { uid: c76741bb-803f-4680-8bee-cb4bdaedf284, type: gridBlock }
  - { uid: f6af399c-afa2-4f21-8cd8-0c7fd1178d89, type: image }
  - { uid: eaa34549-1998-45a4-957e-2ea5d7cf41c4, type: image }
  - { uid: b4ca1a34-cf52-45c7-963a-6e0b09d46e49, type: image }
  - { uid: f2bea32a-e68e-496e-8c47-8ba97c7a0203, type: gridBlock }
  - { uid: 5026c16c-7ed3-4c0d-9417-1d242980a9c0, type: image }
  - { uid: da85c8f3-5de2-4d66-822d-a177e42821ff, type: image }
  - { uid: b6bc575a-f53b-4ce6-8a83-1340aa5bddb7, type: image }
  - { uid: 005c5f82-50a6-43b5-a2a0-2e2d79575a7a, type: image }
  - { uid: 9c34ee64-05bd-470f-ba3c-de604ec47591, type: gridBlock }
  - { uid: fbb92003-0e22-4937-92af-3a8f3d061f60, type: image }
  - { uid: 527d1573-85c1-47c7-928a-8dea32153e83, type: gridBlock }
  - { uid: abd3504f-b4dd-48a9-97e2-923f2e63a957, type: image }
  - { uid: 5e227a15-09e6-49f7-8679-e0b588059e1f, type: image }
  - { uid: 14b875e3-8bda-4610-98dc-ebbd03b8c929, type: gridBlock }
  - { uid: b1015ec4-9ddf-4e59-b6bf-214fc12c3a3d, type: image }
  - { uid: 34340073-e534-42ad-9cfb-8eab299228a9, type: image }
  - { uid: e800de8b-25f2-4a40-a3c6-189bec399a45, type: image }
  - { uid: b769baa0-8834-4434-b1d6-4b612aa6f714, type: gridBlock }
  - { uid: d8ed659a-020b-4688-9d72-42c518677d4a, type: image }
  - { uid: f4117857-1464-41c6-8e74-70f82f393891, type: image }
  - { uid: ab3542da-d0d1-450e-abf3-a5f9e6f3eb97, type: image }
  - { uid: a7d1d9b8-1caa-41cd-825e-15d4564a57f6, type: image }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="gridBlock">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h2/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="gridBlock" headline="Block Title">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock" headline="Block Title" data='{"blocks":[{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image - Light","url":"/docs/examples/content-types/image-light"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image - Light","url":"/docs/examples/content-types/image-light"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image","url":"/docs/examples/content-types/image-dark"},{"@type":"image","align":"center","credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.","image_field":"image","size":"l","title":"Image - Light","url":"/docs/examples/content-types/image-light"}],"styles":{"backgroundColor":"grey"}}' />
