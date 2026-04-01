# Deployment Patterns

Hydra separates your production frontend from the editing experience. Here's how to deploy for different scenarios.

## SPA/Hybrid — Full Visual Editing

The simplest setup — your frontend handles both production and editing:

1. Deploy your frontend as SPA or Hybrid (SSR + client-side hydration)
2. Deploy Hydra and the Plone API server
3. Login to Hydra, go to user preferences, set your frontend URL

This gives you all visual editing features including inline text editing, drag and drop, and realtime preview.

## SSG/SSR — Production Speed + Visual Editing

Get the speed of static generation while keeping visual editing. Deploy two versions of the same frontend:

1. **Production** — Deploy your frontend in SSG or SSR mode (fast, cacheable)
2. **Editing** — Deploy the same frontend in SPA mode to a separate URL (used only in Hydra)
3. **Hydra + Plone** — Only needs to run during editing, so scale-to-zero / serverless works
4. **SSG rebuild** — For SSG, configure [collective.webhook](https://github.com/collective/collective.webhook) to trigger a rebuild on edit. SSR doesn't need this.

## Example: The Nuxt.js Demo

The default Hydra demo uses exactly this pattern:

- **Production** — [SSG on Netlify](https://hydra-nuxt-flowbrite.netlify.app/). All pages statically generated, images optimized, fast globally.
- **Editing** — Same Nuxt codebase deployed as SPA to a different Netlify URL. Only loaded inside Hydra's iframe.
- **Hydra + Plone** — Deployed to [fly.io](https://hydra.pretagov.com) with scale-to-zero. Cost is free or minimal since it only runs during editing.

For most frameworks switching between SSG/SSR and SPA is just a config toggle, so you get the best of both worlds with minimal effort.

## Without Hydra (Two-Window Editing)

You can use Plone headless without Hydra — use Volto for editing and your custom frontend for viewing. But Volto's default theme won't match your frontend, so editors have to switch tabs to see the real result. For WYSIWYG editing, you'd need to recreate your design in Volto (duplicating work), or just use Hydra.
