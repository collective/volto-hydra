# Building a Frontend for Headless Plone

The actual code you write will depend on the framework you choose. You can look at these examples to help you:

- [Nuxt.js](https://github.com/collective/volto-hydra/tree/main/examples/nuxt-blog-starter)
- [Next.js](https://github.com/collective/volto-hydra/tree/main/examples/hydra-nextjs)
- [F7-Vue](https://github.com/collective/volto-hydra/tree/main/examples/hydra-vue-f7)

The steps involved in creating a frontend are roughly the same for all these frameworks:

## 1. Create a Catch-All Route

Create a route for any path which goes to a single page.

For example, in Nuxt.js you create a file `pages/[..slug].vue`.

## 2. Build the Page Template

The page has a template with the static parts of your theme like header and footer. You might also check the content type to render each differently.

## 3. Fetch Content from Plone REST API

On page setup, take the path and make a [REST API call to the contents endpoint](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/content-types.html) to get the JSON for this page.

- You can use `@plone/client` for this
- In some frameworks (such as Nuxt.js) it's better to use their built-in fetch
- You can also use the [Plone GraphQL API](https://2022.training.plone.org/gatsby/data.html)
  - Note: this is just a wrapper on the REST API rather than a server-side implementation, so it's not more efficient than using the REST API directly

## 4. Render Page Metadata

In your page template, fill title etc. from the content metadata.

## 5. Navigation

1. Adjust the contents API call to use [`@expand`](https://6.docs.plone.org/volto/configuration/expanders.html) and return [navigation data](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) in the same call
2. Create a component for your top-level nav that uses this nav JSON to create a menu

## 6. Blocks

1. Create a `Block` component that takes the id and block JSON as arguments
2. Use if statements to check the block type and determine how to render that block
3. If the block is a container, call the `Block` component recursively
4. In your page, iterate down the `blocks_layout` list and render a `Block` component for each
5. Rendering Slate — split into a separate component as it's used in many blocks and is also recursive

## 7. Helper Functions

Several helper functions get reused in many blocks:

1. **Generating a URL for links** — all REST API URLs are relative to the API URL, so you need to convert these to the right frontend URL
2. **Generating a URL for an image** — blocks have image data in many formats so a helper function is useful
   - You may also decide to use your framework or hosting solution for image resizing

## 8. Listing Blocks

- Use the [Listing Helpers](../listings-templates/index) or make your own [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)
- Create your own pagination scheme (e.g., embed page in URL for static generation)
- Render the items and pagination

## 9. Redirects

1. If your contents call results in a redirect, you will need to do an internal redirect in the framework so the path shown is correct
2. If you are using SSG, you will need special code to [query all the redirects](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/aliases.html#listing-all-available-aliases-via-json) at generate time and add redirect routes

## 10. Error Pages

If your [REST API call returns an error](https://6.docs.plone.org/plone.restapi/docs/source/http-status-codes.html), handle this within the framework to display the error and set the status code.

## 11. Search Blocks

If you choose to allow Volto's built-in Search Block for end-user customisable search:

- Render Facets/Filters (currently not as sub-blocks but this could change)
- Build your query and make a [REST API call to query items](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/querystring.html)

## 12. Form Blocks

Form-block is a plugin that allows a visual form builder:

- Currently not a container with sub-blocks but this could change
- Render each field type component (or limit which are available)
- Produce a compatible JSON submission to the form-block endpoint
- Handle field validation errors
- Handle the thank-you page
