# Deployment

## SPA/Hybrid with Hydra

Hydra requires a SPA or Hybrid frontend if you want full Visual Editing.

1. Deploy your frontend as either a Single Page App (SPA) or Hybrid (server-side rendering with client-side rendering after first load)
2. Deploy Hydra and the Plone API server
3. Login to Hydra and set your frontend URL

## SSG/SSR with Hydra

It is still possible to achieve the speed and cost savings of Server Side Generation (SSG) while still getting the benefits of Visual Editing with Hydra. Or you might require a pure Server Side Rendered (SSR) mode.

To achieve this:

1. Deploy your production frontend in SSG or SSR mode
2. Deploy Hydra and Plone API server
   - Note: this only has to run during editing, so scale-to-zero/serverless is an option
3. Deploy your same frontend in SPA mode to another URL which is only used in Hydra for editing
4. For SSG you will also need [c.webhook](https://github.com/collective/collective.webhook) and configure this to rebuild your SSG on edit
   - For an SSR frontend, c.webhook is not needed

### Example: Nuxt.js Demo

- The production frontend is deployed as a [SSG on Netlify](https://hydra-nuxt-flowbrite.netlify.app/)
  - Images and listings are all statically generated
  - Search can't be SSG but with scale-to-zero and suspend hosting the cold start delay of a search might be an acceptable tradeoff
- The Administration interface (<https://hydra.pretagov.com>) and Plone server is deployed to fly.io using scale-to-zero so the cost is free or minimal
- During editing, a different deployment ([SPA on Netlify](https://hydra-nuxt-flowbrite-edit.netlify.app/)) of the same frontend is used

## Two-Window Editing (Without Hydra)

You can use Plone Headless without Hydra using Volto instead:

1. Deploy the Plone API server
2. Deploy your frontend
3. Deploy a Volto site with a default theme
4. Setup your content types and block types
   - Currently adding new blocks requires a custom Volto theme to be deployed
   - Content types can be added by site setup

### During Editing

- You will use Volto which will come with an out-of-the-box theme so it won't look the same as your frontend
- Any new blocks you create will have a skeleton presentation within the preview
- Any header/footer CSS etc. won't reflect your frontend
- Once done editing a page, you can ask users to switch to another tab and use the frontend URL to see how the changes look
  - If the page is private, you will additionally have to implement a way to login on your frontend

### If You Need a More WYSIWYG Editing Experience

- Use Volto theming to recreate the design inside Volto (this would be a duplicate of any effort you did on the frontend)
- Or just use Hydra
