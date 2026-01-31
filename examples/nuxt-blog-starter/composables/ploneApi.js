import { getAccessToken, loadAndMergeTemplates } from '@hydra-js/hydra.js';

export default async function ploneApi({
  path,
  query = null,
  watch = [],
  _default = {},
  pages = {},
}) {
  const runtimeConfig = useRuntimeConfig();
  var headers = {
    Accept: 'application/json',
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  var api = path?.join ? path.join('/') : path;
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

  // Helper to fetch content by path (for template loading)
  const fetchContent = async (templatePath) => {
    const baseUrl = runtimeConfig.public.backendBaseUrl;
    const url = `${baseUrl}/++api++${templatePath}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${templatePath}`);
    }
    return response.json();
  };

  return useFetch(api, {
    key,
    method: query ? 'POST' : 'GET',
    headers: headers,
    body: query,
    cache: 'no-cache', // we probably don't need it
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
      // if (error!==undefined  ) {
      //     showError(error);
      //        // throw new error;
      //     return {title:"Error"};
      // }

      data['_listing_pages'] = pages;
      if (query) {
        return data;
      } else {
        const comp = data['@components'];
        delete data['@components'];

        // Merge templates into page data (for view mode template support)
        let pageData = data;
        try {
          pageData = await loadAndMergeTemplates(data, fetchContent);
        } catch (error) {
          console.warn('[NUXT] Error loading templates:', error);
        }

        return {
          page: pageData,
          _listing_pages: pages,
          navigation: comp.navigation,
          breadcrumbs: comp.breadcrumbs,
        };
      }
    },
  });
}
