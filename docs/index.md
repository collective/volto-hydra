# Volto Hydra Documentation

A Visual Headless CMS using Plone as a server, providing true visual editing with drag-and-drop blocks and editable text — with any frontend stack you choose.

```{raw} html
<video src="_static/hydra-demo.mp4"
       autoplay loop muted playsinline
       style="width:100%;max-width:960px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.15);margin:1.5em 0;"
       aria-label="Hydra editor demo: live edits, formatting, drag-and-drop, container ops, frontend switching">
  Your browser doesn't support inline video — see <a href="https://hydra.pretagov.com">the live demo</a>.
</video>
```

```{toctree}
:maxdepth: 2
:caption: Contents

architecture
build-a-frontend
server-rendered-frontends
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
- **Framework agnostic** — Next.js, Nuxt.js, Astro, plus server-only stacks (PHP, Django, Rails, Laravel) via the [server-render pattern](./server-rendered-frontends.md)
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
