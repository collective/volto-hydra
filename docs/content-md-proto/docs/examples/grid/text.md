---
"@type": Document
UID: fb086a3d1d3d4a9ebf9bc864d2172e79
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
id: text
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Grid-Text block
assignments:
  - { uid: 828a7be1-0ab3-4663-9069-4581f5be63c1, type: title }
  - { uid: 0f49cd2b-8040-402c-abca-a16618460f9d, type: gridBlock }
  - { uid: a601e49f-0062-4961-b6e5-2fc8ae69ade0, type: slate }
  - { uid: debb8187-e54f-4cad-8301-2343d65e2024, type: gridBlock }
  - { uid: b6d056e8-0f7f-453e-b8bc-ef97a654b48f, type: slate }
  - { uid: 91cdc344-e34c-4387-b0d2-73962abc2559, type: slate }
  - { uid: 38d06a19-4a1c-44ed-a35f-e9ad0f665924, type: gridBlock }
  - { uid: 7747d6aa-691e-490c-883d-f37309f7bb32, type: slate }
  - { uid: 81fea606-f9d3-45ef-a986-ab049ca31518, type: slate }
  - { uid: ff28017a-468d-49aa-828f-c78660cc7512, type: slate }
  - { uid: bf39075e-2748-42ee-8a3f-bffef3d91bab, type: gridBlock }
  - { uid: 748b88cf-888f-4044-bd0c-11db4dcd4499, type: slate }
  - { uid: 62df1ee5-4d5e-43e3-8698-96dd8a3c907c, type: slate }
  - { uid: 27729b85-84b3-4ee3-9017-270ff221b5d3, type: slate }
  - { uid: f7f64a3c-ed24-4bfd-beac-15feeb1e5c65, type: slate }
  - { uid: c43aa15d-13e2-4112-957a-a5b3477a3cbf, type: gridBlock }
  - { uid: bad9a9d9-da28-4c62-885a-31d2171399ad, type: slate }
  - { uid: 92d23c58-9f96-45e7-8a37-bd7a788c90e7, type: gridBlock }
  - { uid: 509c81dc-d149-47b3-8b7d-f069c22d0b5c, type: slate }
  - { uid: 9d78a363-ad2f-4290-a2a7-be8e22a752be, type: slate }
  - { uid: 044b3c74-9129-4bef-a640-8ce362697184, type: gridBlock }
  - { uid: f7e0fe54-ecd9-4d1b-942c-8980c8d43430, type: slate }
  - { uid: 5a3fd2f9-d6c7-422f-8727-6d569cb25cb5, type: slate }
  - { uid: 57a1cf38-0550-4929-a1d8-d2752b6f70d5, type: slate }
  - { uid: 07692b0f-bef2-41f3-8110-643380f599a1, type: gridBlock }
  - { uid: d5ce3bff-682f-4e98-8aa9-aa9e7617f539, type: slate }
  - { uid: efa522c2-3ec8-46f2-b951-9310028b01ef, type: slate }
  - { uid: 103b3b0e-c54e-4d0a-bf84-6e28898260dd, type: slate }
  - { uid: 019e7dd0-63b9-4421-8824-3544391e9b23, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="gridBlock">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h2/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="gridBlock" headline="Block Title">

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"}]}' />

</block>

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"},{"children":[{"text":""}],"type":"h2"}]}' />

</block>

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit.  "}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit.  "}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit."}],"type":"p"}]}' />

</block>

<block type="gridBlock">

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in. "}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in. "}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in. "}],"type":"p"}]}' />

<block type="slate" data='{"value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in. "}],"type":"p"}]}' />

</block>

<block type="gridBlock" headline="Block Title" data='{"blocks":[{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"}]}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi."}],"type":"p"}]}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit."}],"type":"p"}]}],"styles":{"backgroundColor":"grey"}}' />

<block type="gridBlock" data='{"blocks":[{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in."}],"type":"p"}]},{"@type":"slate","plaintext":"Text Title H2\nLorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in.","value":[{"children":[{"text":"Text Title H2"}],"type":"h2"},{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in."}],"type":"p"}]}],"styles":{"backgroundColor":"grey"}}' />
