# Inka Documentation

A design-system-first page-builder toolkit. Strike the right balance for your site — make it easy for editors to create engagement while staying compliant.

```{raw} html
<video src="_static/hydra-demo.mp4"
       autoplay loop muted playsinline
       style="width:100%;max-width:960px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.15);margin:1.5em 0;"
       aria-label="Inka editor demo: live edits, formatting, drag-and-drop, container ops, frontend switching">
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

## Why Inka?

- **Compliance and engagement, not a trade-off** — you decide where the dial sits for each site, instead of choosing between locking editors down and letting the design system drift
- **Design-system-first** — components declare what they tolerate, so off-system output can't be produced
- **Multi frontend, multi backend** — Next.js, Nuxt.js, Astro, plus server-only stacks (PHP, Django, Rails, Laravel) via the [server-render pattern](./server-rendered-frontends.md); switch channels mid-edit
- **AI under the same constraints** — everyone's AI can build you a page; ours can't build one that breaks your design system
- **Evidence, not just warnings** — rules a machine can't decide go to the people who can, and the determination is recorded against that version of the content
- **Quick to adopt** — enable visual editing with simple HTML data attributes, no React or Vue required in your frontend
- **A toolkit, not a CMS** — good out of the box with zero configuration, extensible when you need more; open source and self-hostable
- **Enterprise features** — versioning, i18n, workflow, and automated content rules

## Try the online demo

The fastest way to feel what Inka does is to log into the hosted demo and edit a real page against a real frontend.

Open <https://hydra.pretagov.com>, log in, then:

- Open user preferences (bottom-left).
- Pick one of the preset frontends, or paste in your own frontend URL.
- Edit any page — every change updates the live preview.

The default preset is a Nuxt.js frontend deployed as an [SSG](https://hydra-nuxt-flowbrite.netlify.app/) to demonstrate scale-to-zero editing on free hosting. An [Astro example](https://github.com/collective/volto-hydra/tree/main/docs/examples/test-astro) demonstrates the [server-render pattern](./server-rendered-frontends.md) for static-first frameworks. See [Build a frontend › Deployment patterns](./build-a-frontend.md#deployment-patterns).

To run Inka locally against your own frontend, see the **Run Locally** section of the [project README](https://github.com/collective/volto-hydra#run-locally).

```{warning}
Inka is a [Work in Progress](https://github.com/orgs/collective/projects/3/views/4).
It should not be used in production yet.
```
