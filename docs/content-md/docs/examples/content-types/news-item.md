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
language: "##DEFAULT##"
layout: newsitem_view
review_state: published
rights: ""
subjects:
  - news
title: News Item
blocks:
  - ni-date-m3i1uy1k: dateField
  - d3f1c443-583f-4e8e-a682-3bf25752a300: title
  - f16a700c-3b02-47aa-9d08-ade7dea4f683: image
  - b5b151a1-fb13-458a-8232-4a87bb8c2904: separator
  - 4ad62079-8826-4677-9a53-4bce2ebb0caf: introduction
  - 4ad62079-8826-4677-9a53-4bce2ebb0caf-split-1: slate
  - 9c1f17e7-4c01-4f6f-8241-7ee47b7f1ce9: separator
  - 83af2a96-6f44-4c03-9178-bd6b3678d524: slate
  - fa56fc9a-574e-4a7f-b6ef-703bccc54667: slate
  - 6a9f0ce0-6918-439e-9abf-aeba220d9a61: slate
  - ddd8af02-b007-40d2-aec2-4a7f6651f3a7: slate
  - 97070cac-5043-4d42-a782-3fb51f1c4bae: slate
  - 23e7d05e-f9c4-4278-83bb-d691d1dd3606: slate
  - 7f1c54fe-5061-471d-970d-5d4dca0854fc: slate
  - 83b29f62-44cb-4122-baac-cf5c86402757: slate
  - 38243fe2-81f9-4afe-8abf-e90d38f92cdf: slate
  - c9d141e5-c8d2-4255-b288-ce305a51d40e: slate
  - 3961e879-3e3a-4ab2-9b0c-0f4c7786679c: slate
  - 7d8dcf49-e41f-4253-b217-a0df26511977: separator
  - bfab529b-06c6-4931-b907-aa0538bb68ae: introduction
  - e0950549-5612-483d-a16c-a6481b1f4f83: separator
  - 3d76738a-e02c-4f98-84a3-9b0adc1caf69: image
  - a91ef2a4-336d-4d4f-90e5-d1d31befcaa8: separator
  - 6a19b315-8b57-4c4d-8b2c-486fc7df34b8: slate
  - 3642f388-4b3c-4019-ae58-0c56b3487aef: image
  - c5ac2a89-5637-42cb-ac29-4448ca0a54b0: slate
  - 1225bf63-e058-44b2-8834-5cdc29ecbcbd: image
  - c31e4ec0-788b-4988-b193-5ae9ca30c253: slate
  - 7a4c45bc-f969-4d18-8556-bd2cb955fea8: slate
  - 2a61f06a-9960-4c9c-85eb-bac7a3853fdc: slate
  - 0fc24145-c346-4031-adc5-7ad06bd0656a: separator
  - 95a19acf-2d32-4b99-bf3e-d90d3470735c: image
  - 57903d6a-6ed1-4e65-acef-22ccf51c5530: slate
  - 2220580b-204f-4e6d-822d-7e28f37512a9: slate
  - 80177065-93a8-41b9-b45e-e71154294a82: image
  - ca682edf-ea8f-49fc-92ce-c9a2a782a42e: slate
  - 6f2d9fbe-05b4-46db-a6f7-22e57e08eddf: slate
  - e38d6b59-9c34-44a7-a694-36ad6367b617: separator
  - a9807954-cb10-4170-8ebd-e3ba1baa3fde: image
  - 07f0bb3b-a762-4f41-9f02-052921e9fd28: slate
  - dd0ab22f-fe24-45e6-8e0b-ab0573519657: slate
  - a1bf6371-37e8-4054-924d-36c99a5f0f78: slate
  - 4e771550-447e-4112-b998-81d00adb2797: slate
  - 71c6a6c6-6f0b-4cf5-be93-23ad2af9b2c9: image
  - 09891614-7ed6-444c-9925-8589801ca8ea: slate
  - 8fe9052b-d9a4-48dd-ae47-80b256826aca: slate
---

<block type="dateField" uid="ni-date-m3i1uy1k" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data='{"showTime":false,"fixed":true,"readOnly":true}' />

<block type="title" uid="d3f1c443-583f-4e8e-a682-3bf25752a300" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data='{"fixed":true,"readOnly":true}' />

<block type="image" uid="f16a700c-3b02-47aa-9d08-ade7dea4f683" align="wide" image_field="image" size="l" title="Inhaltstyp: Image-1" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-dark)

</block>

<block type="separator" uid="b5b151a1-fb13-458a-8232-4a87bb8c2904" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

<block type="introduction" uid="4ad62079-8826-4677-9a53-4bce2ebb0caf" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

## Highlight Title H2&#x20;

</block>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.&#x20;

<block type="separator" uid="9c1f17e7-4c01-4f6f-8241-7ee47b7f1ce9" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

<block type="slate" uid="83af2a96-6f44-4c03-9178-bd6b3678d524" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

## Headline H2&#x20;

</block>

<block type="slate" uid="fa56fc9a-574e-4a7f-b6ef-703bccc54667" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="slate" uid="6a9f0ce0-6918-439e-9abf-aeba220d9a61" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="slate" uid="ddd8af02-b007-40d2-aec2-4a7f6651f3a7" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="slate" uid="97070cac-5043-4d42-a782-3fb51f1c4bae" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Lists

</block>

<block type="slate" uid="23e7d05e-f9c4-4278-83bb-d691d1dd3606" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

1. Ordered List Bullett Point One
2. Ordered List Bullett Point Two
3. Ordered List Bullett Point Three
4. Ordered List Bullett Point Four

</block>

<block type="slate" uid="7f1c54fe-5061-471d-970d-5d4dca0854fc" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

- Unordered List Bullett Point One
- Unordered List Bullett Point Two
- Unordered List Bullett Point Three
- Unordered List Bullett Point Four

</block>

<block type="slate" uid="83b29f62-44cb-4122-baac-cf5c86402757" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Inline Styles

</block>

<block type="slate" uid="38243fe2-81f9-4afe-8abf-e90d38f92cdf" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

Text can be **bold** or *Italic*.

</block>

<block type="slate" uid="c9d141e5-c8d2-4255-b288-ce305a51d40e" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

[Link internal ](/docs/examples/button)

</block>

<block type="slate" uid="3961e879-3e3a-4ab2-9b0c-0f4c7786679c" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

[Link external](https://www.google.com)

</block>

<block type="separator" uid="7d8dcf49-e41f-4253-b217-a0df26511977" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

<block type="introduction" uid="bfab529b-06c6-4931-b907-aa0538bb68ae" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.&#x20;

</block>

<block type="separator" uid="e0950549-5612-483d-a16c-a6481b1f4f83" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"full"}}' />

<block type="image" uid="3d76738a-e02c-4f98-84a3-9b0adc1caf69" align="center" image_field="image" size="l" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="separator" uid="a91ef2a4-336d-4d4f-90e5-d1d31befcaa8" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

<block type="slate" uid="6a19b315-8b57-4c4d-8b2c-486fc7df34b8" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="image" uid="3642f388-4b3c-4019-ae58-0c56b3487aef" align="right" image_field="image" size="l" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="c5ac2a89-5637-42cb-ac29-4448ca0a54b0" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse&#x20;

</block>

<block type="image" uid="1225bf63-e058-44b2-8834-5cdc29ecbcbd" align="left" image_field="image" size="l" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="c31e4ec0-788b-4988-b193-5ae9ca30c253" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="slate" uid="7a4c45bc-f969-4d18-8556-bd2cb955fea8" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit&#x20;

</block>

<block type="slate" uid="2a61f06a-9960-4c9c-85eb-bac7a3853fdc" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="separator" uid="0fc24145-c346-4031-adc5-7ad06bd0656a" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

<block type="image" uid="95a19acf-2d32-4b99-bf3e-d90d3470735c" align="left" image_field="image" size="m" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{},"styles":{"size:noprefix":"medium"}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="57903d6a-6ed1-4e65-acef-22ccf51c5530" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="slate" uid="2220580b-204f-4e6d-822d-7e28f37512a9" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum&#x20;

</block>

<block type="image" uid="80177065-93a8-41b9-b45e-e71154294a82" align="right" image_field="image" size="m" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{},"styles":{"size:noprefix":"medium"}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="ca682edf-ea8f-49fc-92ce-c9a2a782a42e" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure&#x20;

</block>

<block type="slate" uid="6f2d9fbe-05b4-46db-a6f7-22e57e08eddf" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="separator" uid="e38d6b59-9c34-44a7-a694-36ad6367b617" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{"align":"left"}}' />

<block type="image" uid="a9807954-cb10-4170-8ebd-e3ba1baa3fde" align="left" image_field="image" size="s" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{},"styles":{"size:noprefix":"small"}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="07f0bb3b-a762-4f41-9f02-052921e9fd28" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="slate" uid="dd0ab22f-fe24-45e6-8e0b-ab0573519657" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in&#x20;

</block>

<block type="slate" uid="a1bf6371-37e8-4054-924d-36c99a5f0f78" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue&#x20;

</block>

<block type="slate" uid="4e771550-447e-4112-b998-81d00adb2797" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="image" uid="71c6a6c6-6f0b-4cf5-be93-23ad2af9b2c9" align="right" image_field="image" size="s" title="Image - Light" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" url="${src}" data='{"credit":{},"styles":{"size:noprefix":"small"}}'>

```field:description
Der Inhaltstyp Bild kann verwendet werden um ein Bild in verschiedenen Formate (JPG, GIF, PNG, SVG) hochzuladen. Das hochgeladene Bild sollte dabei immer eine hohe Auflösung haben, damit es flexibel, z.B. auch als Banner-Bild eingesetzt werden kann. Plone liefert die Bilder automatisch in der besten Skalierung aus, so dass es nicht nötig ist Bilder manuell herunter zu skalieren.
```
![](/docs/examples/content-types/image-light)

</block>

<block type="slate" uid="09891614-7ed6-444c-9925-8589801ca8ea" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content">

### Headline H3&#x20;

</block>

<block type="slate" uid="8fe9052b-d9a4-48dd-ae47-80b256826aca" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}'>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo  luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu luptatum zzril delenit auguevel eum iriure dolor in hendrerit in.

</block>
