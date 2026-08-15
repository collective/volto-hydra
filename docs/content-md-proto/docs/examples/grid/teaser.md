---
"@type": Document
UID: c2adb9f7b0824bd5a3e07048d887f48d
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
id: teaser
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Grid-Teaser block
assignments:
  - { uid: 828a7be1-0ab3-4663-9069-4581f5be63c1, type: title }
  - { uid: 54548b1e-b99f-4679-9fc6-567e940c4926, type: gridBlock }
  - { uid: 51483392-532d-45f4-a0b0-eb11426421fc, type: teaser }
  - { uid: a388b571-6679-4cde-b2de-cf0352b69f36, type: gridBlock }
  - { uid: b5740de1-5f55-4829-83f7-eff86f2bda49, type: teaser }
  - { uid: bfcf051a-e2c7-41bd-ad15-995a743d3d15, type: teaser }
  - { uid: 01108cdc-39a3-4164-b29c-5b9680e8a49b, type: gridBlock }
  - { uid: 29dc74f3-100a-4af7-9124-65d087996abb, type: teaser }
  - { uid: 869eb9ca-f6bc-498f-b420-f548b6c37e9c, type: teaser }
  - { uid: bfffb241-cc76-4210-99e7-fbb59901dc65, type: teaser }
  - { uid: 270af4ab-c5b1-4d32-a071-cf6c324a5234, type: gridBlock }
  - { uid: 102491b0-6dcc-4830-9fb7-4d360c71d0be, type: teaser }
  - { uid: d118f0fc-9a2a-4950-9e10-d2d8ca21ea5c, type: teaser }
  - { uid: 35a0cd10-3bfd-40b6-9131-f4111294072c, type: teaser }
  - { uid: e3cbde6c-8e5e-4889-97dc-2d95fa210b7e, type: teaser }
  - { uid: dab51a65-b8bc-41bc-a13a-208bb32062d3, type: gridBlock }
  - { uid: 22f2108c-7496-49ed-a592-115d011f165b, type: teaser }
  - { uid: 0a108490-fce7-487f-a868-810eae46bba8, type: gridBlock }
  - { uid: f2ef0f24-044d-4ce1-a41b-5187db0637b7, type: teaser }
  - { uid: 6a24c82a-7c14-4a83-b456-4583d8d9261a, type: teaser }
  - { uid: 22f4533e-f75a-4b1b-ba3e-6180f9ca396c, type: gridBlock }
  - { uid: d1c658cc-8d3b-40c5-b39b-50eb84e57f1f, type: teaser }
  - { uid: 992a57a4-ae9a-4322-a5b2-32663fa8d45d, type: teaser }
  - { uid: 0be1c75d-9fe3-40a9-842e-800b7a53322f, type: teaser }
  - { uid: d014183d-90b3-4716-9fad-b375d3ef78eb, type: gridBlock }
  - { uid: d55625af-5b41-42e6-93c6-3f7b29f1ec8e, type: teaser }
  - { uid: f5fbd1e2-4887-4bd4-96d0-646321a38e93, type: teaser }
  - { uid: 31c656b3-5315-4460-8dd2-7ea623be0e75, type: teaser }
  - { uid: 9e207ed1-8ea6-48a9-b74e-be16f3750eb7, type: teaser }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="teaser" title="${h/text}" description="${p/text}" href="${a/linkitem}" />
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="gridBlock">

## Block Title

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"preview_image":[],"styles":{"align":"left"}}' />

</block>

</block>

<block type="gridBlock">

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

</block>

<block type="gridBlock">

<block type="teaser" head_title="Head title" title="Teaser Title H2" data='{"description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu. ","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"}}' />

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

</block>

<block type="gridBlock">

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

### Teaser Title H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.

[Page](/docs/examples/content-types/page)

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

</block>

<block type="gridBlock" headline="Block Title" data='{"blocks":[{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu. ","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu. ","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu. ","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"},{"@type":"teaser","description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl.","head_title":"Head title","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"},"title":"Teaser Title H2"}],"styles":{"backgroundColor":"grey"}}' />
