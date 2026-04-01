# How Hydra Works

Instead of combining editing and rendering into one framework and codebase, these are separated and during editing a two way communication channel is opened across an iframe so that the editing UI is no longer part of the frontend code. Instead a small JS file called hydra.js is included in your frontend during editing that handles the iframe bridge communication to Hydra which is running in the same browser window.

## Architecture Overview

You could think of it as splitting Volto into two parts, Rendering and CMS UI/Admin UI while keeping the same UI and then making the Rendering part easily replaceable with other implementations.

<!-- codeExample: bash label="Architecture" -->
```bash
                  Browser            RestAPI             Server

              ┌──────────────┐                       ┌─────────────┐
 Anon/Editing │    Volto     │◄─────────────────────►│    Plone    │
              └──────────────┘                       └─────────────┘

──────────────────────────────────────────────────────────────────────────

          │   ┌──────────────┐                       ┌─────────────┐
          │   │   Frontend   │◄──────────────────────┤    Plone    │
          │   └──hydra.js────┘                       └─────────────┘
          │          ▲                                  ▲
 Editing UI          │ iFrame Bridge                    │
          │          ▼                                  │
          │   ┌──────────────┐                          │
          │   │    Hydra     │◄─────────────────────────┘
          │   └──────────────┘

              ┌──────────────┐                       ┌─────────────┐
 Anon         │   Frontend   │◄──────────────────────┤    Plone    │
              └──────────────┘                       └─────────────┘
```

## Building a Frontend for Headless Plone

The steps involved in creating a frontend are roughly the same for all frameworks:

1. Create a route for any path which goes to a single page (e.g., in Nuxt.js create `pages/[..slug].vue`)
2. The page has a template with static parts of your theme like header and footer. Check content type to render each differently.
3. On page setup, take the path and make a REST API call to the contents endpoint to get the JSON for this page.
4. Fill title etc from the content metadata.
5. For navigation, use `@expand` to return navigation data in the same call. Create a nav component using this JSON.
6. For Blocks: create a Block component that takes id and block JSON, check `@type` to determine rendering, call recursively for containers, iterate `blocks_layout` to render.
7. Create helpers: URL generation for links (convert API-relative URLs to frontend URLs), image URL generation (blocks have image data in many formats).
8. Listing Blocks: Use the Listing Helpers (`staticBlocks`/`expandListingBlocks`) or make your own REST API query calls.
9. Redirects: Handle REST API redirects as internal redirects in your framework. For SSG, query all redirects at generate time.
10. Error Pages: Handle REST API errors with appropriate status codes.
11. Search Blocks: Render facets/filters, build queries using the REST API querystring endpoint.
12. Form Blocks: Render field types, produce compatible JSON submissions to the form-block endpoint, handle validation and thank you page.

See the example frontends for reference implementations: [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter), [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs), and [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7).
