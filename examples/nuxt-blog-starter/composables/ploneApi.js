import { getAccessToken, loadTemplates } from '@hydra-js/hydra.js';

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

  return useFetch(api, {
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

        // Pre-load templates for SSR (avoids Suspense flicker)
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
        const templates = await loadTemplates(data, loadTemplate, {}, preloadTemplates);

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
}
