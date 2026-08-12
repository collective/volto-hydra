---
title: Site Footer
description: Footer with social links and copyright
review_state: published
effective: 2025-01-01T00:00:00
id: site-footer
UID: site-footer-uid
"@type": Document
blocks:
  - footer-social: socialLinks
  - footer-copyright: slate
---

:::socialLinks{uid="footer-social" fixed=true readOnly=true templateId="/templates/site-footer" templateInstanceId="site-footer-def-instance" slotId="social"}
```fields
{
 "links": [
  {
   "@id": "link-1",
   "url": "https://github.com/collective/volto-hydra",
   "fixed": true,
   "readOnly": true,
   "templateId": "/templates/site-footer",
   "templateInstanceId": "site-footer-def-instance"
  },
  {
   "@id": "link-2",
   "url": "https://discord.gg/plone",
   "fixed": true,
   "readOnly": true,
   "templateId": "/templates/site-footer",
   "templateInstanceId": "site-footer-def-instance"
  },
  {
   "@id": "link-3",
   "url": "https://plone.org",
   "fixed": true,
   "readOnly": true,
   "templateId": "/templates/site-footer",
   "templateInstanceId": "site-footer-def-instance"
  },
  {
   "@id": "link-4",
   "url": "https://www.youtube.com/@plonecms",
   "fixed": true,
   "readOnly": true,
   "templateId": "/templates/site-footer",
   "templateInstanceId": "site-footer-def-instance"
  }
 ]
}
```
:::

:::slate{uid="footer-copyright" fixed=true readOnly=true templateId="/templates/site-footer" templateInstanceId="site-footer-def-instance" slotId="copyright"}
Inka — design-system-first page building. © 2024-2026 Plone Foundation.
:::
