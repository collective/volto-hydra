# Volto Hydra Documentation

A Visual Headless CMS using Plone as a server, providing true visual editing with drag-and-drop blocks and editable text — with any frontend stack you choose.

```{toctree}
:maxdepth: 2
:caption: Contents

architecture
build-a-frontend
live-preview
custom-blocks
container-blocks
visual-editing
what-editors-will-experience/index
listings
templates
advanced
examples/README
```

## Why Hydra?

- **Visual + True Headless + Open Source** — a unique combination in the CMS space
- **Framework agnostic** — use Next.js, Nuxt.js, Astro, or any frontend stack
- **Quick visual editing** — enable it with simple HTML data attributes, no React or Vue required in your frontend
- **Omni-channel** — switch between multiple frontends mid-edit
- **Enterprise features** — versioning, i18n, workflow, and automated content rules
- **Customisable** — both the admin interface and block definitions are fully configurable

## Try the online demo

The fastest way to feel what Hydra does is to log into the hosted demo and edit a real page against a real frontend.

Open <https://hydra.pretagov.com>, log in, then:

- Open user preferences (bottom-left).
- Pick one of the preset frontends, or paste in your own frontend URL.
- Edit any page — every change updates the live preview.

The default preset is a Nuxt.js frontend deployed as an [SSG](https://hydra-nuxt-flowbrite.netlify.app/) to demonstrate scale-to-zero editing on free hosting. See [Build a frontend › Deployment patterns](./build-a-frontend.md#deployment-patterns).

To run Hydra locally against your own frontend, see the **Run Locally** section of the [project README](https://github.com/collective/volto-hydra#run-locally).

```{warning}
Volto Hydra is a [Work in Progress](https://github.com/orgs/collective/projects/3/views/4).
It should not be used in production yet.
```
