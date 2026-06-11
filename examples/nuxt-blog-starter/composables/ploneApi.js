import { getAccessToken, loadTemplates } from '@hydra-js/hydra.js';

// Shared template cache across all page renders (survives SSG prerendering)
const templateCache = {};

export default async function ploneApi({
  path,
  query = null,
  watch = [],
  _default = {},
  pages = {},
  preloadTemplates = [],  // Specific templates to eagerly pre-load (forced layouts)
}) {
  const runtimeConfig = useRuntimeConfig();
  const route = useRoute();

  var headers = {
    Accept: 'application/json',
  };
  // route.query works in SSR, getAccessToken() works client-side
  const token = route.query.access_token || getAccessToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  var api = path?.join ? path.filter(Boolean).join('/') : path;
  if (!api.startsWith('http')) {
    api = `${runtimeConfig.public.backendBaseUrl}/++api++/${api}`;
  }
  if (!query) {
    api = `${api}?expand=breadcrumbs,navroot,navigation&expand.navigation.depth=2`;
  } else {
    headers['Content-Type'] = 'application/json';
  }
  const key = JSON.stringify({
    path,
    query,
    headers,
  });

  // Fetch a single template by id/path.
  const loadTemplate = async (templateId) => {
    // templateId may be a path or a full URL — normalise to path
    const tplPath = templateId.startsWith('http')
      ? new URL(templateId).pathname
      : `/${templateId.replace(/^\//, '')}`;
    const url = `${runtimeConfig.public.backendBaseUrl}/++api++${tplPath}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${templateId}`);
    }
    return response.json();
  };

  // Preload the forced-layout templates. These come from route-based
  // rules (site-footer, context-navigation-layout, content-type
  // layouts), not the page content — so kick the fetches off NOW, in
  // parallel with the page fetch below, instead of waiting until the
  // page resolves and loading them sequentially inside the transform.
  // The resolved objects are merged into the template cache so
  // loadTemplates only has to fetch what the page content references.
  const preloadPromise = Promise.all(
    [...new Set(preloadTemplates.filter(Boolean))].map(async (id) => {
      try {
        return [id, await loadTemplate(id)];
      } catch (error) {
        console.warn(`[ploneApi] Failed to preload template ${id}:`, error);
        return null;
      }
    }),
  ).then((entries) => Object.fromEntries(entries.filter(Boolean)));

  // plone.app.redirector 302s moved content (/++api++/old -> /++api++/new).
  // ofetch auto-follows to valid JSON, so without this the page would render
  // the new content under the OLD url. Capture the followed-redirect target
  // and surface it so the page setup can navigateTo() a permanent 301 — the
  // redirect can't be issued from the ofetch interceptor (it won't propagate
  // as an SSR redirect).
  let redirectTarget = null;
  const toFrontendPath = (u) => u
    .replace(runtimeConfig.public.backendBaseUrl, '')
    .replace('/++api++', '')
    .replace(/\?.*$/, '');

  const result = await useFetch(api, {
    key,
    method: query ? 'POST' : 'GET',
    headers: headers,
    body: query,
    cache: 'no-cache',
    // When authenticated, don't use cached data - always fetch fresh
    getCachedData: token ? () => undefined : undefined,
    watch: watch,
    default: () => {
      return _default;
    },
    onResponse({ response }) {
      if (response.redirected && response.url) {
        const target = toFrontendPath(response.url);
        if (target && !target.startsWith('http') && target !== toFrontendPath(api)) {
          redirectTarget = target;
        }
      }
    },
    onResponseError({ request, response, options }) {
      const error = response._data;
      showError({
        statusCode: response.status,
        statusMessage: `${error.type}: ${error.message}`,
      });
      return {
        title: response.statusText,
        '@components': { navigation: { items: [] } },
      };
    },
    transform: async (data) => {
      data['_listing_pages'] = pages;
      if (query) {
        return data;
      } else {
        const comp = data['@components'];
        delete data['@components'];

        // Merge the preloaded forced-layout templates (fetched in
        // parallel with this page) into the cache, then loadTemplates
        // only needs to fetch the templates the page content references.
        Object.assign(templateCache, await preloadPromise);
        const { templates, errors } = await loadTemplates(data, loadTemplate, templateCache, []);
        if (errors.length) {
          console.warn('[ploneApi] Failed to load templates:', errors.map(e => `${e.templateId}: ${e.error?.message || e.error}`).join('; '));
        }

        return {
          page: data,
          templates,  // Pre-loaded templates for sync expansion
          _listing_pages: pages,
          navigation: comp.navigation,
          breadcrumbs: comp.breadcrumbs,
        };
      }
    },
  });

  // Moved content: surface the target so the page setup can navigateTo() it.
  // Must be issued from the page's setup context for Nuxt to honor the SSR
  // redirect (not from here, and not from the ofetch interceptor).
  if (redirectTarget) {
    result.redirectTo = redirectTarget;
  }

  return result;
}
