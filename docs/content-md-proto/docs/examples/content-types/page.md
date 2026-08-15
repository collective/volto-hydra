---
"@type": Document
UID: 7ab9c48ede33415fa2a66a99549c8f70
allow_discussion: false
contributors: []
creators:
  - admin
description: The Page content type can be used to display content on a single
  page of the website. Pages can be structured using text, images and blocks.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: page
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/content-types/page/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - content
title: Page
assignments:
  - { uid: d3f1c443-583f-4e8e-a682-3bf25752a300, type: title }
  - { uid: 7c36a063-bd02-487b-b49a-fcbf1b00fbda, type: image }
  - { uid: 4ee2efb5-8180-41ec-90df-d8b9462bdd2a, type: separator }
  - { uid: 441b2392-e6e4-4ef6-b8c5-f20f2ad236c6, type: introduction }
  - { uid: 441b2392-e6e4-4ef6-b8c5-f20f2ad236c6-split-1, type: slate }
  - { uid: bcfce434-1072-4162-aa44-269f1ef07936, type: separator }
  - { uid: 7624cf59-05d0-4055-8f55-5fd6597d84b0, type: slate }
  - { uid: c053b9ef-3446-4b6c-8de5-05b25b89d658, type: slate }
  - { uid: 7092c5f4-5629-4561-b42f-29e77a5bf8e7, type: slate }
  - { uid: 44c63e98-281f-4f5b-bfac-ea3b39ce4272, type: slate }
  - { uid: 01604376-680c-4081-bf61-96c5f67d15eb, type: slate }
  - { uid: 41c047eb-1206-4a60-99a8-34cac54db6a4, type: slate }
  - { uid: 3f0e80ae-a76c-446f-a5da-0ac61164b723, type: slate }
  - { uid: 8ebd405e-90c4-40ff-81b7-052dd5292098, type: slate }
  - { uid: f773ee3a-ecbe-40de-a214-16dfa19bb8d6, type: slate }
  - { uid: 5fa67d96-bbf6-4a27-a541-f271ea975bbe, type: slate }
  - { uid: ccd431a4-0662-4a4a-8c81-06240f493040, type: slate }
  - { uid: 5e23d159-75ec-4580-a6f1-f10c54877763, type: separator }
  - { uid: 05810541-401a-4a47-901c-ce8a8cef1c31, type: introduction }
  - { uid: 6d2806bb-1a36-48e9-aebf-c3435d2f66f5, type: separator }
  - { uid: 8cc0aca3-82a0-4ba2-b50e-577779cb44a7, type: image }
  - { uid: bd8d53f7-cb1d-40fa-b1a4-1aeb7b15b37f, type: separator }
  - { uid: 208fb81b-5ddc-433e-a0e0-2373adecdf7a, type: image }
  - { uid: 788efa48-5be6-459b-b3c5-37e5071351c1, type: slate }
  - { uid: 2c8e6998-1348-4828-98c5-a0c19eea53a5, type: slate }
  - { uid: abeb0a39-0ca7-43cc-8dc4-326b3514f103, type: image }
  - { uid: 69410f81-dbec-4cb6-b479-e5adc83eb350, type: slate }
  - { uid: d336f37b-5906-4012-a2b2-2513f64ccd6b, type: slate }
  - { uid: 5ca3eebb-e24c-4444-81f9-b5850c57e618, type: separator }
  - { uid: 4fcb1054-e16a-4ca6-9bbf-aee8ad63061d, type: image }
  - { uid: 84de0f6c-9e7b-4f60-b2cd-44aa2e80cf4c, type: slate }
  - { uid: e209ee66-26f0-43bd-a50d-670fe091f769, type: slate }
  - { uid: ec65d7c6-2e7e-4b40-adce-f37ea1245ab2, type: image }
  - { uid: 28a468d0-00d4-4e0b-8724-272e2e613695, type: slate }
  - { uid: 73080708-5b49-499f-8aec-56f5f27c9635, type: slate }
  - { uid: e725c9f6-2a36-4f0a-a0e7-b24186fba26d, type: separator }
  - { uid: 994a57ba-9225-40bb-bf55-288954f979b0, type: image }
  - { uid: 394c0f81-fc48-4ff5-9d11-8caf8decf283, type: slate }
  - { uid: b1ffd738-793d-4c3f-9349-d2880c2fad80, type: slate }
  - { uid: 03cae937-57c6-42e8-9570-a104d11b5fcf, type: image }
  - { uid: ce4b6f34-ca2e-4d3b-a097-53628fa224e7, type: slate }
  - { uid: 9a3d1a33-d559-45af-846b-8a2a37a51e0d, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
---

# 

<block type="image" align="wide" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{}}' />

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.&#x20;

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

## Text Heading H2

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

### Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

### Lists

1. Ordered List Bullett Point One
2. Ordered List Bullett Point Two
3. Ordered List Bullett Point Three
4. Ordered List Bullett Point Four

- Unordered List Bullett Point One
- Unordered List Bullett Point Two
- Unordered List Bullett Point Three
- Unordered List Bullett Point Four

### Inline Styles

<block type="slate">

Text can be **bold** or *Italic*.

</block>

<block type="slate">

[Link internal ](/docs/examples/button)

</block>

<block type="slate">

[Link external](https://www.google.com)

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" data='{"value":[{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. "}],"type":"p"}]}' />

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="image" align="center" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{}}' />

<block type="separator">

---

<fields data='{"styles":{"align":"left"}}' />

</block>

<block type="image" align="right" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"large"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="image" align="left" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"large"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"left"}}' />

</block>

<block type="image" align="left" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="m" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"medium"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="image" align="right" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="m" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"medium"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"left"}}' />

</block>

<block type="image" align="left" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="s" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"small"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="image" align="right" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="s" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"small"}}' />

## Text Heading H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>
