---
"@type": News Item
UID: 8cc3e9af77c0452aa2278b0bfdcf9c85
allow_discussion: false
changeNote: null
contributors: []
creators:
  - admin
description: The News Item content type can be used to display News content on the website.
effective: 2023-01-01T10:42:00
exclude_from_nav: false
expires: null
id: news-item
image: null
image_caption: null
is_folderish: true
language: "##DEFAULT##"
layout: newsitem_view
review_state: published
rights: ""
subjects:
  - news
title: News Item
assignments:
  - { uid: ni-date-m3i1uy1k, type: dateField }
  - { uid: d3f1c443-583f-4e8e-a682-3bf25752a300, type: title }
  - { uid: f16a700c-3b02-47aa-9d08-ade7dea4f683, type: image }
  - { uid: b5b151a1-fb13-458a-8232-4a87bb8c2904, type: separator }
  - { uid: 4ad62079-8826-4677-9a53-4bce2ebb0caf, type: introduction }
  - { uid: 4ad62079-8826-4677-9a53-4bce2ebb0caf-split-1, type: slate }
  - { uid: 9c1f17e7-4c01-4f6f-8241-7ee47b7f1ce9, type: separator }
  - { uid: 83af2a96-6f44-4c03-9178-bd6b3678d524, type: slate }
  - { uid: fa56fc9a-574e-4a7f-b6ef-703bccc54667, type: slate }
  - { uid: 6a9f0ce0-6918-439e-9abf-aeba220d9a61, type: slate }
  - { uid: ddd8af02-b007-40d2-aec2-4a7f6651f3a7, type: slate }
  - { uid: 97070cac-5043-4d42-a782-3fb51f1c4bae, type: slate }
  - { uid: 23e7d05e-f9c4-4278-83bb-d691d1dd3606, type: slate }
  - { uid: 7f1c54fe-5061-471d-970d-5d4dca0854fc, type: slate }
  - { uid: 83b29f62-44cb-4122-baac-cf5c86402757, type: slate }
  - { uid: 38243fe2-81f9-4afe-8abf-e90d38f92cdf, type: slate }
  - { uid: c9d141e5-c8d2-4255-b288-ce305a51d40e, type: slate }
  - { uid: 3961e879-3e3a-4ab2-9b0c-0f4c7786679c, type: slate }
  - { uid: 7d8dcf49-e41f-4253-b217-a0df26511977, type: separator }
  - { uid: bfab529b-06c6-4931-b907-aa0538bb68ae, type: introduction }
  - { uid: e0950549-5612-483d-a16c-a6481b1f4f83, type: separator }
  - { uid: 3d76738a-e02c-4f98-84a3-9b0adc1caf69, type: image }
  - { uid: a91ef2a4-336d-4d4f-90e5-d1d31befcaa8, type: separator }
  - { uid: 6a19b315-8b57-4c4d-8b2c-486fc7df34b8, type: slate }
  - { uid: 3642f388-4b3c-4019-ae58-0c56b3487aef, type: image }
  - { uid: c5ac2a89-5637-42cb-ac29-4448ca0a54b0, type: slate }
  - { uid: 1225bf63-e058-44b2-8834-5cdc29ecbcbd, type: image }
  - { uid: c31e4ec0-788b-4988-b193-5ae9ca30c253, type: slate }
  - { uid: 7a4c45bc-f969-4d18-8556-bd2cb955fea8, type: slate }
  - { uid: 2a61f06a-9960-4c9c-85eb-bac7a3853fdc, type: slate }
  - { uid: 0fc24145-c346-4031-adc5-7ad06bd0656a, type: separator }
  - { uid: 95a19acf-2d32-4b99-bf3e-d90d3470735c, type: image }
  - { uid: 57903d6a-6ed1-4e65-acef-22ccf51c5530, type: slate }
  - { uid: 2220580b-204f-4e6d-822d-7e28f37512a9, type: slate }
  - { uid: 80177065-93a8-41b9-b45e-e71154294a82, type: image }
  - { uid: ca682edf-ea8f-49fc-92ce-c9a2a782a42e, type: slate }
  - { uid: 6f2d9fbe-05b4-46db-a6f7-22e57e08eddf, type: slate }
  - { uid: e38d6b59-9c34-44a7-a694-36ad6367b617, type: separator }
  - { uid: a9807954-cb10-4170-8ebd-e3ba1baa3fde, type: image }
  - { uid: 07f0bb3b-a762-4f41-9f02-052921e9fd28, type: slate }
  - { uid: dd0ab22f-fe24-45e6-8e0b-ab0573519657, type: slate }
  - { uid: a1bf6371-37e8-4054-924d-36c99a5f0f78, type: slate }
  - { uid: 4e771550-447e-4112-b998-81d00adb2797, type: slate }
  - { uid: 71c6a6c6-6f0b-4cf5-be93-23ad2af9b2c9, type: image }
  - { uid: 09891614-7ed6-444c-9925-8589801ca8ea, type: slate }
  - { uid: 8fe9052b-d9a4-48dd-ae47-80b256826aca, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="slate" value="${*/slate}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
---

<block type="dateField" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data='{"showTime":false,"fixed":true,"readOnly":true}' />

<block type="title">

# 

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="image" align="wide" image_field="image" size="l" title="Inhaltstyp: Image-1" url="/docs/examples/content-types/image-dark" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren."}' />

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.&#x20;

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

</block>

<block type="slate">

## Headline H2&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}' />

</block>

<block type="slate">

### Lists

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

1. Ordered List Bullett Point One
2. Ordered List Bullett Point Two
3. Ordered List Bullett Point Three
4. Ordered List Bullett Point Four

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

- Unordered List Bullett Point One
- Unordered List Bullett Point Two
- Unordered List Bullett Point Three
- Unordered List Bullett Point Four

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

### Inline Styles

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Text can be **bold** or *Italic*.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}' />

</block>

<block type="slate" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{},"value":[{"children":[{"text":""},{"children":[{"text":"Link internal "}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":""}],"type":"p"}]}' />

<block type="slate" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{},"value":[{"children":[{"text":""},{"children":[{"text":"Link external"}],"data":{"url":"https://www.google.com"},"type":"link"},{"text":""}],"type":"p"}]}' />

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"value":[{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. "}],"type":"p"}]}' />

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

</block>

<block type="image" align="center" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren."}' />

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

</block>

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="image" align="right" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren."}' />

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="image" align="left" image_field="image" size="l" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren."}' />

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}' />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

</block>

<block type="image" align="left" image_field="image" size="m" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.","styles":{"size:noprefix":"medium"}}' />

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="image" align="right" image_field="image" size="m" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.","styles":{"size:noprefix":"medium"}}' />

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="separator">

---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

</block>

<block type="image" align="left" image_field="image" size="s" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.","styles":{"size:noprefix":"small"}}' />

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="image" align="right" image_field="image" size="s" title="Image - Light" url="/docs/examples/content-types/image-light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"credit":{},"description":"Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.","styles":{"size:noprefix":"small"}}' />

<block type="slate">

### Headline H3&#x20;

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" />

</block>

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}' />

</block>
