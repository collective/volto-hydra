---
"@type": Document
UID: e8178744e30a418b9a5768997bb29a19
allow_discussion: false
contributors: []
creators:
  - admin
description: This section has a sample of content types available in this site.
effective: 2023-09-22T16:09:00
exclude_from_nav: false
expires: null
id: content-types
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Content Types
assignments:
  - { uid: 7f1d39a2-a57c-4b2a-93bd-4dd30ee3f6cc, type: title }
  - { uid: e3bb641a-0252-4fff-a6a0-80ce155d4ee5, type: listing }
  - { uid: fdb1dfd1-6073-4ad0-a147-c0709c39734d, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="slate" value="${*/slate}" />
order:
  - copy_of_event
  - copy_of_news-item
  - copy_of_page
  - event
  - external-link
  - internal-link
  - link
  - news-item
  - page
  - typography
blobs:
  - file: danielle-barnes-kGNaS3lYCso-unsplash.jpg
    uid: 6cca02c5580d4f7c865af74835ceab9d
    id: example-image.jpg
    title: Image
    exclude_from_nav: false
    effective: 2024-03-08T12:40:00
  - file: black-starry-night.jpg
    uid: 970ec24c76784c66a06d8c8d8b6522b2
    id: image-dark
    title: Image
    description: >-
      
      The Image content type can be used to upload an image in various formats
      (JPG, GIF, PNG, SVG). The uploaded image should always have a high
      resolution so that it can be used flexibly, for example as a banner image.
      Plone automatically delivers the images in the best scaling, so there is
      no need to scale images down manually.
    rights: "Credits: ipsum dolor sit amet."
    exclude_from_nav: false
  - file: image-light.jpg
    uid: eec82559bf3242a6be4d43bc2096f399
    title: Image - Light
    description: >-
      
      The Image content type can be used to upload an image in various formats
      (JPG, GIF, PNG, SVG). The uploaded image should always have a high
      resolution so that it can be used flexibly, for example as a banner image.
      Plone automatically delivers the images in the best scaling, so there is
      no need to scale images down manually.
    exclude_from_nav: false
---

# 

<block type="listing" headlineTag="h2" variation="default" data='{"styles":{}}' />

<block type="slate" data='{"styles":{},"value":[{"children":[{"text":""}],"type":"p"}]}' />
