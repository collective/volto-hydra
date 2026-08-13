---
"@type": Document
UID: site-footer-uid
id: site-footer
review_state: published
title: Site Footer
description: Footer with social links and copyright
effective: 2025-01-01T00:00:00
blocks:
  - footer-social: socialLinks
  - footer-copyright: slate
---

<block type="socialLinks" uid="footer-social" templateId="/templates/site-footer" templateInstanceId="site-footer-def-instance" slotId="social" data='{"fixed":true,"readOnly":true,"links":[{"@id":"link-1","url":"https://github.com/collective/volto-hydra","fixed":true,"readOnly":true,"templateId":"/templates/site-footer","templateInstanceId":"site-footer-def-instance"},{"@id":"link-2","url":"https://discord.gg/plone","fixed":true,"readOnly":true,"templateId":"/templates/site-footer","templateInstanceId":"site-footer-def-instance"},{"@id":"link-3","url":"https://plone.org","fixed":true,"readOnly":true,"templateId":"/templates/site-footer","templateInstanceId":"site-footer-def-instance"},{"@id":"link-4","url":"https://www.youtube.com/@plonecms","fixed":true,"readOnly":true,"templateId":"/templates/site-footer","templateInstanceId":"site-footer-def-instance"}]}' />

<block type="slate" uid="footer-copyright" templateId="/templates/site-footer" templateInstanceId="site-footer-def-instance" slotId="copyright" data='{"fixed":true,"readOnly":true}'>

Inka — design-system-first page building. © 2024-2026 Plone Foundation.

</block>
