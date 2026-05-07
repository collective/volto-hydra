# Deployment Patterns

Hydra separates your production frontend from the editing experience. Here's how to deploy for different scenarios.

---

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

You can use Plone headless without Hydra — use Volto for editing and your custom frontend for viewing.

To set this up:

1. Deploy the Plone API server
2. Deploy your frontend
3. Deploy a Volto site with a default theme
4. Set up your content types and block types
    - Currently adding new blocks requires a custom Volto theme to be deployed
    - Content types can be added via Volto's Site Setup

### During editing

- You'll use Volto with its out-of-the-box theme, so it won't look like your frontend.
- Any new blocks you create will have a skeleton presentation within the Volto preview.
- Any header/footer CSS etc. won't reflect your frontend.
- Once a page is edited, editors switch to another tab and load the frontend URL to see the result.
    - If the page is private, you'll additionally need a login flow on your frontend.

### If you need a more WYSIWYG editing experience

- Theme Volto to recreate the design (this duplicates effort you already did on the frontend).
- Or just use Hydra.
