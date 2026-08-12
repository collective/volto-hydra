---
title: Accordion
description: The accordion contains other blocks in an accordion behavior layout.
review_state: published
exclude_from_nav: false
subjects:
  - blocks
  - containers
language: "##DEFAULT##"
rights: ""
effective: 2023-09-22T16:09:00
expires: null
id: accordion
UID: f8cd4a2d8d7c4703b4e41d2093b21aed
"@type": Document
blocks:
  - fec13476-1231-42fc-84d5-b110e8e3c6e7: title
  - ref-accordion-description: slate
  - editor-screenshot: image
  - 41a82a93-c00c-4a40-bac8-53a3e3420c8e: accordion
  - 8f68209e-220e-4230-9d42-8b0602573bd9: accordion
  - ref-accordion-schema: codeExample
  - ref-accordion-json-data: codeExample
  - ref-accordion-rendering: codeExample
---

:::title{uid="fec13476-1231-42fc-84d5-b110e8e3c6e7"}
:::

A collapsible panel group. Each panel is an object\_list item with a title and a content area that holds child blocks.

:::image{uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}"}
![The accordion example block being edited in Volto Hydra](/docs/images/accordion-edit)
:::

:::accordion{uid="41a82a93-c00c-4a40-bac8-53a3e3420c8e" collapsed=false filtering=false non_exclusive=false right_arrows=true}
```fields
{
 "styles": {}
}
```
::::panels[]
:::panel{uid="bc2c120e-51df-4c47-b4d0-5a11311d020d" title="Accordion with text"}
:::slate{uid="c85ec1d2-f371-4ed4-be65-8fa0a091b833"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
:::
:::
:::panel{uid="d2168440-888d-4081-8409-b59392abc189" title="Accordion with image"}
:::image{uid="6e94c839-855c-43ff-92fa-a2f9dfac2bc9" align="center" image_field="image" size="l" title="Image" url="${src}"}
```fields
{
 "credit": {}
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::separator{uid="1da28f76-9d9c-4a98-af0b-2e8c7abc1c35"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::slate{uid="ee0d02f1-ff2c-4dee-a79f-a1ed105cc84c"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="d754b95e-7fa8-4cbd-9997-f2bb6cde26df" align="left" image_field="image" size="l" title="Image - Light" url="${src}"}
```fields
{
 "credit": {}
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-light)
:::
:::slate{uid="b4536f61-92a1-4b65-aa40-c142d799f0ba"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="725bfc52-49f6-4e70-8d11-48c537cfb5ff"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::separator{uid="773db1b3-7504-40e2-bf09-ce96e31249b2"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::image{uid="c0b3b08e-c350-43e6-84e9-787903d91f8c" align="left" image_field="image" size="m" title="Image" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "medium"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="1eb2924b-8de0-4152-8ae0-50eb27c3fad8"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="c3d2c41a-8e53-45a4-b212-cb54dad6045d"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="1060e842-2b14-43dc-9e43-c25022029a94" align="right" image_field="image" size="m" title="Image - Light" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "medium"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-light)
:::
:::slate{uid="da31d046-9d5f-48db-9368-c5a943c35aa1"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="1becedb6-65f6-4bee-9b36-5c38deaa4141"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::separator{uid="11af3b59-7720-4875-b0b9-90be5807d476"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::image{uid="89d2ea6e-b8fb-4d13-a251-37cc3bbb5961" align="left" image_field="image" size="s" title="Image - Light" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "small"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-light)
:::
:::slate{uid="05ee41f0-e8b8-4181-a773-366ca209dbc8"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="d77557e0-793a-408f-9940-a0ad80d3be8f"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="8f1ad076-32b9-432b-9308-8b0972a8f57e" align="right" image_field="image" size="s" title="Image" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "small"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="c3344b1c-89b9-4119-993e-58ef6bece880"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="76ab99ce-789c-41b2-9df8-4322c8c8c1ad"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::
:::panel{uid="b58c92b4-6604-4408-9039-a147965fa4bd" title="Accordion with teaser"}
:::teaser{uid="eb600a9b-7400-4b4e-bb40-70ddb6911749" title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/page",
   "@type": "Document",
   "Description": "The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.",
   "Title": "Page",
   "getRemoteUrl": null,
   "hasPreviewImage": true,
   "head_title": null,
   "image_field": "preview_image",
   "title": "Page"
  }
 ],
 "styles": {
  "align": "center"
 }
}
```
```field:description
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo
```
:::
:::teaser{uid="1b91cfac-d8a1-4327-9896-e8e3ee7a9c03" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper " title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/image-light",
   "@type": "Image",
   "Description": " The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.",
   "Title": "Image - Light",
   "getRemoteUrl": null,
   "hasPreviewImage": null,
   "head_title": null,
   "image_field": "image",
   "title": "Image - Light"
  }
 ],
 "styles": {
  "align": "left"
 }
}
```
:::
:::teaser{uid="2b7a6783-7323-4fbd-b0a1-3d304b8a526a" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper " title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/page",
   "@type": "Document",
   "Description": "The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.",
   "Title": "Page",
   "getRemoteUrl": null,
   "hasPreviewImage": true,
   "head_title": null,
   "image_field": "preview_image",
   "title": "Page"
  }
 ],
 "styles": {
  "align": "right"
 }
}
```
:::
:::
:::panel{uid="262a2478-3a63-445a-aab7-edf55cceebcf" title="Accordion with listing"}
:::listing{uid="c9580c7a-ab67-44f7-8532-59a4ba9fd846" headlineTag="h2" variation="summary"}
```fields
{
 "querystring": {
  "limit": "3",
  "query": [
   {
    "i": "Description",
    "o": "plone.app.querystring.operation.string.contains",
    "v": "block"
   }
  ],
  "sort_order": "descending",
  "sort_order_boolean": true
 },
 "styles": {}
}
```
:::
:::
:::panel{uid="d80e4d6f-b708-4f45-8c3a-fc8f8ccc07c0" title="Accordion with table"}
:::slateTable{uid="f56375fe-70a1-4ac1-a94c-adc9998db548"}
```fields
{
 "styles": {
  "backgroundColor": "transparent"
 },
 "table": {
  "basic": false,
  "celled": true,
  "compact": false,
  "fixed": true,
  "hideHeaders": false,
  "inverted": false,
  "rows": [
   {
    "cells": [
     {
      "key": "f446n",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "26qcg",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "dhv72",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "dda2b"
   },
   {
    "cells": [
     {
      "key": "52vlv",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "5ko7h",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "878jv",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "3ihrs"
   },
   {
    "cells": [
     {
      "key": "754if",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "1bjdt",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "32g6k",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "au6so"
   },
   {
    "cells": [
     {
      "key": "5fhem",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "e78dh",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "feacr",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "fqhgk"
   }
  ],
  "striped": true
 }
}
```
:::
:::
::::
:::

:::accordion{uid="8f68209e-220e-4230-9d42-8b0602573bd9" collapsed=false filtering=false non_exclusive=false right_arrows=true}
```fields
{
 "styles": {
  "backgroundColor": "grey"
 }
}
```
::::panels[]
:::panel{uid="39f75787-bd7a-42dc-ab40-a6c9dfd2a8f1" title="Accordion with text"}
:::slate{uid="afacd5e4-5914-46b6-b9f9-ebd8bbda9d35"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
:::
:::
:::panel{uid="d2168440-888d-4081-8409-b59392abc189" title="Accordion with image"}
:::image{uid="6e94c839-855c-43ff-92fa-a2f9dfac2bc9" align="center" image_field="image" size="l" title="Image - Light" url="${src}"}
```fields
{
 "credit": {}
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-light)
:::
:::separator{uid="1da28f76-9d9c-4a98-af0b-2e8c7abc1c35"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::slate{uid="ee0d02f1-ff2c-4dee-a79f-a1ed105cc84c"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="d754b95e-7fa8-4cbd-9997-f2bb6cde26df" align="left" image_field="image" size="l" title="Image" url="${src}"}
```fields
{
 "credit": {}
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="b4536f61-92a1-4b65-aa40-c142d799f0ba"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="725bfc52-49f6-4e70-8d11-48c537cfb5ff"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::separator{uid="773db1b3-7504-40e2-bf09-ce96e31249b2"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::image{uid="c0b3b08e-c350-43e6-84e9-787903d91f8c" align="left" image_field="image" size="m" title="Image" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "medium"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="1eb2924b-8de0-4152-8ae0-50eb27c3fad8"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="c3d2c41a-8e53-45a4-b212-cb54dad6045d"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="1060e842-2b14-43dc-9e43-c25022029a94" align="right" image_field="image" size="m" title="Image - Light" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "medium"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-light)
:::
:::slate{uid="da31d046-9d5f-48db-9368-c5a943c35aa1"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="1becedb6-65f6-4bee-9b36-5c38deaa4141"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::separator{uid="11af3b59-7720-4875-b0b9-90be5807d476"}
```fields
{
 "styles": {
  "align": "left"
 }
}
```
:::
:::image{uid="89d2ea6e-b8fb-4d13-a251-37cc3bbb5961" align="left" image_field="image" size="s" title="Image" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "small"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="05ee41f0-e8b8-4181-a773-366ca209dbc8"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="d77557e0-793a-408f-9940-a0ad80d3be8f"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::image{uid="8f1ad076-32b9-432b-9308-8b0972a8f57e" align="right" image_field="image" size="s" title="Image" url="${src}"}
```fields
{
 "credit": {},
 "styles": {
  "size:noprefix": "small"
 }
}
```
```field:description
 The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.
```
![](/docs/examples/content-types/image-dark)
:::
:::slate{uid="c3344b1c-89b9-4119-993e-58ef6bece880"}
```fields
{
 "styles": {}
}
```
## Text Heading H3
:::
:::slate{uid="76ab99ce-789c-41b2-9df8-4322c8c8c1ad"}
```fields
{
 "styles": {}
}
```
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qui Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
:::
:::
:::panel{uid="b58c92b4-6604-4408-9039-a147965fa4bd" title="Accordion with teaser"}
:::teaser{uid="eb600a9b-7400-4b4e-bb40-70ddb6911749" title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/page",
   "@type": "Document",
   "Description": "The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.",
   "Title": "Page",
   "getRemoteUrl": null,
   "hasPreviewImage": true,
   "head_title": null,
   "image_field": "preview_image",
   "title": "Page"
  }
 ],
 "styles": {
  "align": "center"
 }
}
```
```field:description
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo
```
:::
:::teaser{uid="1b91cfac-d8a1-4327-9896-e8e3ee7a9c03" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper " title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/image-light",
   "@type": "Image",
   "Description": " The Image content type can be used to upload an image in various formats (JPG, GIF, PNG, SVG). The uploaded image should always have a high resolution so that it can be used flexibly, for example as a banner image. Plone automatically delivers the images in the best scaling, so there is no need to scale images down manually.",
   "Title": "Image - Light",
   "getRemoteUrl": null,
   "hasPreviewImage": null,
   "head_title": null,
   "image_field": "image",
   "title": "Image - Light"
  }
 ],
 "styles": {
  "align": "left"
 }
}
```
:::
:::teaser{uid="2b7a6783-7323-4fbd-b0a1-3d304b8a526a" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper " title="Teaser Title H2"}
```fields
{
 "head_title": null,
 "href": [
  {
   "@id": "/docs/examples/content-types/page",
   "@type": "Document",
   "Description": "The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.",
   "Title": "Page",
   "getRemoteUrl": null,
   "hasPreviewImage": true,
   "head_title": null,
   "image_field": "preview_image",
   "title": "Page"
  }
 ],
 "styles": {
  "align": "right"
 }
}
```
:::
:::
:::panel{uid="262a2478-3a63-445a-aab7-edf55cceebcf" title="Accordion with listing"}
:::listing{uid="c9580c7a-ab67-44f7-8532-59a4ba9fd846" headlineTag="h2" variation="summary"}
```fields
{
 "querystring": {
  "limit": "3",
  "query": [
   {
    "i": "Description",
    "o": "plone.app.querystring.operation.string.contains",
    "v": "block"
   }
  ],
  "sort_order": "descending",
  "sort_order_boolean": true
 },
 "styles": {}
}
```
:::
:::
:::panel{uid="d80e4d6f-b708-4f45-8c3a-fc8f8ccc07c0" title="Accordion with table"}
:::slateTable{uid="f56375fe-70a1-4ac1-a94c-adc9998db548"}
```fields
{
 "styles": {
  "backgroundColor": "transparent"
 },
 "table": {
  "basic": false,
  "celled": true,
  "compact": false,
  "fixed": true,
  "hideHeaders": false,
  "inverted": false,
  "rows": [
   {
    "cells": [
     {
      "key": "f446n",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "26qcg",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "dhv72",
      "type": "header",
      "value": [
       {
        "children": [
         {
          "text": "Title Tablehead "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "dda2b"
   },
   {
    "cells": [
     {
      "key": "52vlv",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "5ko7h",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "878jv",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "3ihrs"
   },
   {
    "cells": [
     {
      "key": "754if",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "1bjdt",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "32g6k",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "au6so"
   },
   {
    "cells": [
     {
      "key": "5fhem",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "e78dh",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     },
     {
      "key": "feacr",
      "type": "data",
      "value": [
       {
        "children": [
         {
          "text": "Heading H3"
         }
        ],
        "type": "h2"
       },
       {
        "children": [
         {
          "text": "Heading H2"
         }
        ],
        "type": "h3"
       },
       {
        "children": [
         {
          "text": "Text can be "
         },
         {
          "children": [
           {
            "text": "bold"
           }
          ],
          "type": "strong"
         },
         {
          "text": " or "
         },
         {
          "children": [
           {
            "text": "italic"
           }
          ],
          "type": "em"
         },
         {
          "text": " or a "
         },
         {
          "children": [
           {
            "text": "Link"
           }
          ],
          "data": {
           "url": "/"
          },
          "type": "link"
         },
         {
          "text": " "
         }
        ],
        "type": "p"
       }
      ]
     }
    ],
    "key": "fqhgk"
   }
  ],
  "striped": true
 }
}
```
:::
:::
::::
:::

:::codeExample{uid="ref-accordion-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-accordion" slotId="schema" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-accordion-schema-javascript-105cd5"]}
### Schema

```javascript
{
  "accordion": {
    "blockSchema": {
      "properties": {
        "panels": {
          "title": "Panels",
          "widget": "object_list",
          "schema": {
            "properties": {
              "title": {
                "title": "Title"
              },
              "items": {
                "title": "Content",
                "widget": "blocks_layout",
                "allowedBlocks": [
                  "slate",
                  "image"
                ],
                "defaultBlockType": "slate"
              }
            }
          }
        }
      }
    }
  }
}
```
:::

:::codeExample{uid="ref-accordion-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-accordion" slotId="json-data" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-accordion-json-data-json-f4f899"]}
### JSON Block Data

```json
{
  "@type": "accordion",
  "panels": [
    {
      "@id": "panel-1",
      "title": "Frequently Asked Questions",
      "blocks": {
        "content-text-1": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "Here are the answers to common questions."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "content-text-1"
        ]
      }
    }
  ]
}
```
:::

:::codeExample{uid="ref-accordion-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-accordion" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-accordion-rendering-jsx-951c40","ref-accordion-rendering-vue-e897ff","ref-accordion-rendering-svelte-a58cd5"]}
### React

```jsx
function AccordionBlock({ block }) {
  const panels = block.panels || [];

  return (
    <div data-block-uid={block['@uid']} className="accordion-block">
      {panels.map(panel => {
        const panelId = panel['@id'];
        return <AccordionPanel key={panelId} panel={panel} panelId={panelId} />;
      })}
    </div>
  );
}

function AccordionPanel({ panel, panelId }) {
  const [open, setOpen] = useState(!panel.collapsed);
  const contentBlocks = panel.blocks || {};
  const contentLayout = panel.blocks_layout?.items || [];

  return (
    <div data-block-uid={panelId} className="accordion-panel">
      <button onClick={() => setOpen(!open)} className="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-content">
          {contentLayout.map(id => (
            <BlockRenderer key={id} block={{ ...contentBlocks[id], '@uid': id }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="accordion-block">
    <div
      v-for="panel in block.panels || []"
      :key="panel['@id']"
      :data-block-uid="panel['@id']"
      class="accordion-panel"
    >
      <button @click="toggle(panel['@id'])" class="accordion-header">
        <span data-edit-text="title">{{ panel.title }}</span>
        <span>{{ openPanels[panel['@id']] ? '▲' : '▼' }}</span>
      </button>
      <div v-if="openPanels[panel['@id']]" class="accordion-content">
        <BlockRenderer
          v-for="id in panel.blocks_layout?.items || []"
          :key="id"
          :block="{ ...panel.blocks[id], '@uid': id }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
const props = defineProps({ block: Object });
const openPanels = reactive(Object.fromEntries((props.block.panels || []).filter(p => !p.collapsed).map(p => [p['@id'], true])));
function toggle(id) { openPanels[id] = !openPanels[id]; }
</script>
```

### Svelte

```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  let openPanels = Object.fromEntries((block.panels || []).filter(p => !p.collapsed).map(p => [p['@id'], true]));
  function toggle(id) { openPanels[id] = !openPanels[id]; openPanels = openPanels; }
</script>

<div data-block-uid={block['@uid']} class="accordion-block">
  {#each block.panels || [] as panel (panel['@id'])}
    <div data-block-uid={panel['@id']} class="accordion-panel">
      <button on:click={() => toggle(panel['@id'])} class="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{openPanels[panel['@id']] ? '▲' : '▼'}</span>
      </button>
      {#if openPanels[panel['@id']]}
        <div class="accordion-content">
          {#each panel.blocks_layout?.items || [] as id (id)}
            <BlockRenderer block={{ ...panel.blocks[id], '@uid': id }} />
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
```
:::
