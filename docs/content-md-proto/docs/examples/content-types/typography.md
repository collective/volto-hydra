---
"@type": Document
UID: 49d22a94521c4883a1bb448ac7863cdd
allow_discussion: false
contributors: []
creators:
  - admin
description: This page has a sample of the typography available in the theme.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: typography
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - content
title: Typography - Page Title (H1, 48/56px)
assignments:
  - { uid: a6cad3f3-57e8-4bb7-8ac2-b12096e974d2, type: title }
  - { uid: 8fe8fc9b-221c-4c74-b66f-671d638222f3, type: heading }
  - { uid: 4be85eba-b165-4a87-8585-d8697616004d, type: gridBlock }
  - { uid: e5a7baea-d795-4e31-9145-53accbbe7bc3, type: teaser }
  - { uid: 4092b07d-31df-4aaa-9cfd-5bbdf814bb04, type: gridBlock }
  - { uid: c86e09b4-faaa-4f71-ba71-c3cf69f2d260, type: teaser }
  - { uid: 92f80d54-c607-4360-8e2f-ca8dc6b792c5, type: teaser }
  - { uid: f5858bf7-5485-479c-b0b2-10eee0dc937c, type: slate }
  - { uid: 11e4610d-dfac-493d-b9be-345949ca3276, type: slate }
  - { uid: b8c4c6dc-47f1-493d-a2ba-d1ca958def4a, type: slate }
  - { uid: 5991123b-bf50-4684-ba6e-6a4f582d4640, type: slate }
  - { uid: bdeb47df-9fb6-48ad-a633-2c7532c8694d, type: slate }
  - { uid: 4a035155-91fc-4371-82e8-b6d56866647f, type: slate }
  - { uid: 0a8e2813-414f-42f7-9aee-7ae6df4c338e, type: slate }
  - { uid: 9f276d9d-f3c9-4529-9a69-9c93f2d6c5ea, type: slate }
  - { uid: 55d58a5e-01a0-469e-b80b-3a5059593833, type: slate }
  - { uid: 96e308ec-74e6-4ddd-bf31-4a9e66e0584e, type: introduction }
  - { uid: 96e308ec-74e6-4ddd-bf31-4a9e66e0584e-split-1, type: slate }
  - { uid: 875e2811-edb6-4842-8cc0-246fa1be6f58, type: listing }
  - { uid: f4104455-1f80-4209-827d-416f2f07dec9, type: image }
  - { uid: dc27e427-babe-4497-a6ae-fdefeaba2d13, type: button }
  - { uid: bde519a7-d6c0-4bf5-b84b-d832f7f4cdd6, type: gridBlock }
  - { uid: 38e1fde4-8886-4673-9316-5e1b96bcc222, type: slate }
  - { uid: af96daae-955d-42f8-a5e7-c7943fb2e321, type: gridBlock }
  - { uid: a7ffd7f2-5dbf-4b5c-b24e-d10db0dff8df, type: slate }
  - { uid: c1163fcc-e2a4-4e81-b6ab-af537c8b4d56, type: slate }
  - { uid: 47cef702-7d66-4313-b3ec-585408735218, type: toc }
  - { uid: caa483f6-bc0f-4a5a-94d2-925897969928, type: slateTable }
  - { uid: e770913c-fb7b-4cf1-94a8-7eb6e24ff66e, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="slateTable">
    <region name="table.rows">
      <block type="row">
        <region name="cells">
          <block type="cell" value="${td/slate}" />
        </region>
      </block>
    </region>
  </block>
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="heading" alignment="left" heading="Heading (H2, 33/42px)" tag="h2" data='{"styles":{}}' />

<block type="gridBlock">

<block type="teaser">

### Teaser Title (H2, 30/36px)

For grid blocks, the font of the headlines are variable, depending on the number of cells in the grid.

<fields data='{"head_title":null,"href":[{"@id":"/docs/examples/content-types","@type":"Document","Description":"This section has a sample of content types available in this site.","Title":"Content Types","getRemoteUrl":null,"hasPreviewImage":null,"head_title":null,"image_field":"image","title":"Content Types"}],"styles":{"align":"left"}}' />

</block>

</block>

<block type="gridBlock">

<block type="teaser" head_title="Teaser Headtitle (DIV, 14/18px)" title="Teaser Title (H3, 24/30px)" data='{"href":[{"@id":"/docs/examples/content-types","@type":"Document","Description":"This section has a sample of content types available in this site.","Title":"Content Types","getRemoteUrl":null,"hasPreviewImage":null,"head_title":null,"image_field":"image","title":"Content Types"}],"styles":{"align":"left"}}' />

<block type="teaser">

### Teaser Title (H3, 24/30px)

Paragraph (p, 18px/24px). This section has a sample of content types available in this site.

<fields head_title="Teaser Headtitle (DIV, 14/18px)" data='{"href":[{"@id":"/docs/examples/content-types","@type":"Document","Description":"This section has a sample of content types available in this site.","Title":"Content Types","getRemoteUrl":null,"hasPreviewImage":null,"head_title":null,"image_field":"image","title":"Content Types"}],"styles":{"align":"left"}}' />

</block>

</block>

## Text Heading H2 (H2, 30/36px)

Paragraph (p, 18px/24px)

- unordered list
- unordered list

1. ordered list
2. ordered list

blockquote

**bold** / italic / ~~strikethrough~~

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

### Text Heading H3 (H3, 24/30px)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

<block type="introduction" data='{"value":[{"children":[{"text":"Text Heading H2 (H2, 36/48px)"}],"type":"h2"}]}' />

Paragraph text (p, 24/33px) -> Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

<block type="listing" block="875e2811-edb6-4842-8cc0-246fa1be6f58" headline="Heading (H2, 33/42px)" headlineTag="h2" variation="default" data='{"query":[],"querystring":{"limit":"5","query":[{"i":"portal_type","o":"plone.app.querystring.operation.selection.any","v":["File","Document"]}],"sort_on":"effective","sort_order":"descending","sort_order_boolean":"descending"},"styles":{}}' />

<block type="image" align="center" image_field="image" size="l" title="Caption Title (14/18px). Image" url="/docs/examples/content-types/image-dark" data='{"allow_image_download":false,"credit":{},"description":"Caption Description (14/18px). The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually."}' />

<block type="button" inneralign="left" title="Button text (button, 18/24px)" data='{"styles":{}}' />

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":"Text Heading (H2, 30/36px)"}],"type":"h2"},{"children":[{"text":"For grid blocks, the font of the headlines are variable, depending on the number of cells in the grid."}],"type":"p"}]}' />

</block>

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":"Text Heading (H3, 24/30px)"}],"type":"h2"},{"children":[{"text":"Paragraph Text (p, 18/24px)"}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Heading (H3, 24/30px)"}],"type":"h2"},{"children":[{"text":"Paragraph Text (p, 18/24px)"}],"type":"p"}]}' />

</block>

<block type="toc" variation="default" data='{"levels":["h2","h3"],"styles":{}}' />

<block type="slateTable" table.celled table.fixed>

| Table Header (THEAD, 18/24) | Table Header (THEAD, 18/24) |
| --- | --- |
| Table cell (td p, 18/24px) | Table cell (td p, 18/24px) |

</block>

<block type="slate" data='{"value":[{"children":[{"text":""}],"type":"p"}]}' />
