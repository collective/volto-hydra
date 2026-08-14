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
  - { uid: 83675906-07fc-468d-b0f3-71536fcb81eb, type: gridBlock }
  - { uid: c76741bb-803f-4680-8bee-cb4bdaedf284, type: gridBlock }
  - { uid: f2bea32a-e68e-496e-8c47-8ba97c7a0203, type: gridBlock }
  - { uid: 9c34ee64-05bd-470f-ba3c-de604ec47591, type: gridBlock }
  - { uid: 527d1573-85c1-47c7-928a-8dea32153e83, type: gridBlock }
  - { uid: 14b875e3-8bda-4610-98dc-ebbd03b8c929, type: gridBlock }
  - { uid: b769baa0-8834-4434-b1d6-4b612aa6f714, type: gridBlock }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />
  <block type="gridBlock"  headline="${text}">
    <region name="blocks" widget="blocks_layout" />
  </block>
---

# Grid-image block

<block type="gridBlock" headline="Block Title">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

</block>

<block type="gridBlock">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

<block type="image" uid="10dcdda6-cbbc-4de7-9542-fb9ca7df4638" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

<block type="image" uid="eaa34549-1998-45a4-957e-2ea5d7cf41c4" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

</block>

<block type="gridBlock">

<block type="image" uid="5026c16c-7ed3-4c0d-9417-1d242980a9c0" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

<block type="image" uid="005c5f82-50a6-43b5-a2a0-2e2d79575a7a" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock" headline="Block Title">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

</block>

<block type="gridBlock">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

<block type="image" uid="5e227a15-09e6-49f7-8679-e0b588059e1f" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>

<block type="gridBlock">

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

</block>

<block type="gridBlock">

<block type="image" uid="d8ed659a-020b-4688-9d72-42c518677d4a" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.

![](/docs/examples/content-types/image-dark)

<block type="image" uid="a7d1d9b8-1caa-41cd-825e-15d4564a57f6" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" data='{"credit":{},"description":" The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

</block>
