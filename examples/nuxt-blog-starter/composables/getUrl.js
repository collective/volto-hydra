export default function getUrl(href) {
    const runtimeConfig = useRuntimeConfig();
    const backendBaseUrl = runtimeConfig.public.backendBaseUrl;

    if (href === undefined) {
      return "#"
    }
    if (!href) {
      return "#"
    }
    if (Array.isArray(href) && href.length) {
      href = href[0]
    }
    href = href?.value ? href?.value : href;
    if (typeof href === 'string') {
      return href;
    }
    else if ("url" in href) {
      return href.url;
    }
    else if ('@id' in href) {
        // Only strip domain for internal Plone URLs (starting with backend base URL)
        if (href['@id'].startsWith(backendBaseUrl)) {
          return href['@id'].replace(backendBaseUrl, '');
        }
        // Return external URLs as-is
        return href['@id'];
    }
    return href

};